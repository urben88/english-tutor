"""Standalone local TTS server: loads Supertonic once and serves it over HTTP.

    python -m backend.services.tts_server --model-dir <dir> --host 127.0.0.1 --port 8179

``GET /health`` -> ``{"status": "ok"}``; ``POST /synthesize`` with JSON
``{"text": "...", "voice": "M1"?, "speed": 1.0?}`` -> ``audio/wav`` (16-bit PCM mono, the sample
rate is in the header). Any local tool can call it, so the model is loaded once per machine.
"""

from __future__ import annotations

import argparse
import threading

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel

from backend.api.wav import encode_wav
from backend.core.ports import TextToSpeech


class SynthesizeBody(BaseModel):
    text: str
    voice: str | None = None
    speed: float = 1.0


def create_app(tts: TextToSpeech) -> FastAPI:
    app = FastAPI(title="Supertonic TTS server")
    lock = threading.Lock()  # one synthesis at a time: the ONNX sessions share state

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    @app.post("/synthesize")
    def synthesize(body: SynthesizeBody) -> Response:
        if not body.text.strip():
            raise HTTPException(400, "text is empty")
        try:
            with lock:
                clip = tts.synthesize(body.text, voice=body.voice, speed=body.speed)
        except ValueError as e:
            raise HTTPException(400, str(e)) from e
        return Response(content=encode_wav(clip), media_type="audio/wav")

    return app


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description="Shared Supertonic TTS server")
    ap.add_argument("--model-dir", required=True)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8179)
    ap.add_argument("--voice", default="M1")
    ap.add_argument("--steps", type=int, default=8)
    args = ap.parse_args(argv)

    import uvicorn

    from backend.adapters.tts.supertonic import SupertonicTTS

    tts = SupertonicTTS(args.model_dir, voice=args.voice, steps=args.steps)
    uvicorn.run(create_app(tts), host=args.host, port=args.port)


if __name__ == "__main__":
    main()
