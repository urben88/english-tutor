"""Web API over the existing ports and turn graph (single local user).

``create_app(services)`` takes the ports so tests can inject fakes. The module-level ``app``
(``uvicorn backend.api.app:app``) is built on first access from config.yaml, and the models
are only loaded on the first request that needs them. One lock serializes model and store use.
"""

from __future__ import annotations

import base64
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.api.wav import decode_wav, encode_wav
from backend.core.context import ContextBudget
from backend.core.explain import ExplainError, explain
from backend.core.models import AudioClip
from backend.core.persona import Persona
from backend.core.models import StudyItem
from backend.core.ports import (
    ConversationStore, LanguageModel, SpeechToText, StudyStore, TextToSpeech)
from backend.graph.turn import TurnRunner

DEFAULT_STATIC = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@dataclass
class Services:
    stt: SpeechToText | None
    llm: LanguageModel
    tts: TextToSpeech
    store: ConversationStore
    persona: Persona
    budget: ContextBudget


def build_services(config_path: str = "config.yaml") -> Services:
    from backend.adapters import registry
    from backend.core.config import load_config
    from backend.core.persona import load_persona

    config = load_config(config_path)
    try:
        stt = registry.build_stt(config)
    except Exception:  # noqa: BLE001 - STT may be unavailable; text turns and explain still work
        stt = None
    llm = registry.build_llm(config)
    return Services(stt, llm, registry.build_tts(config),
                    registry.build_store(config), load_persona(config.persona),
                    ContextBudget.for_llm(llm, config.llm.params, config.context_margin))


class TextBody(BaseModel):
    text: str


class ExplainBody(BaseModel):
    text: str
    context: str = ""
    simpler: bool = False


class TtsBody(BaseModel):
    text: str
    speed: float = 1.0


class StudyAddBody(BaseModel):
    text: str
    source_text: str = ""
    session_id: int | None = None
    message_id: int | None = None
    translation: str | None = None
    explanation: str | None = None
    examples: list[str] | None = None


class StudyUpdateBody(BaseModel):
    translation: str
    explanation: str
    examples: list[str]


def study_json(i: StudyItem) -> dict[str, Any]:
    return {"id": i.id, "text": i.text, "source_text": i.source_text, "session_id": i.session_id,
            "message_id": i.message_id, "translation": i.translation,
            "explanation": i.explanation, "examples": i.examples,
            "listen_count": i.listen_count, "created_at": i.created_at,
            "updated_at": i.updated_at}


def create_app(services: Services | None = None, static_dir: Path | str | None = DEFAULT_STATIC,
               config_path: str = "config.yaml") -> FastAPI:
    app = FastAPI(title="English Tutor")
    lock = threading.RLock()  # serializes model and store access (single local user)
    holder: dict[str, Services] = {}
    if services is not None:
        holder["s"] = services

    def svc() -> Services:
        with lock:
            if "s" not in holder:
                holder["s"] = build_services(config_path)
            return holder["s"]

    def require_session(s: Services, sid: int) -> None:
        if sid not in {x.id for x in s.store.list_sessions()}:
            raise HTTPException(404, f"unknown session {sid}")

    def reply_json(turn) -> dict[str, Any]:
        return {"user_text": turn.user_text, "reply_text": turn.reply_text,
                "audio": base64.b64encode(encode_wav(turn.reply_audio)).decode("ascii"),
                "sample_rate": turn.reply_audio.sample_rate}

    def run_turn(sid: int, clip: AudioClip | None, text: str | None) -> dict[str, Any]:
        s = svc()
        with lock:
            require_session(s, sid)
            runner = TurnRunner(s.stt, s.llm, s.tts, s.store, s.persona, s.budget, sid)
            return reply_json(runner.run(clip) if clip is not None else runner.run_text(text or ""))

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/persona")
    def persona() -> dict[str, str]:
        p = svc().persona
        return {"name": p.name, "stem": p.stem}

    @app.get("/api/sessions")
    def sessions() -> list[dict[str, Any]]:
        s = svc()
        with lock:
            rows = s.store.list_sessions()
        return [{"id": r.id, "persona": r.persona, "created_at": r.created_at,
                 "updated_at": r.updated_at, "message_count": r.message_count} for r in rows]

    @app.post("/api/sessions")
    def create_session() -> dict[str, int]:
        s = svc()
        with lock:
            return {"id": s.store.create_session(s.persona.stem)}

    @app.get("/api/sessions/{sid}/messages")
    def messages(sid: int) -> list[dict[str, Any]]:
        s = svc()
        with lock:
            require_session(s, sid)
            msgs = s.store.load_messages(sid)
        return [{"id": m.id, "role": m.role, "content": m.content} for m in msgs]

    @app.post("/api/sessions/{sid}/turn")
    async def voice_turn(sid: int, request: Request) -> dict[str, Any]:
        try:
            clip = decode_wav(await request.body())
        except ValueError as e:
            raise HTTPException(400, str(e)) from e
        s = await run_in_threadpool(svc)
        if s.stt is None:
            raise HTTPException(503, "speech-to-text is unavailable (is whisper-server running?); "
                                     "use /turn/text")
        return await run_in_threadpool(run_turn, sid, clip, None)

    @app.post("/api/sessions/{sid}/turn/text")
    def text_turn(sid: int, body: TextBody) -> dict[str, Any]:
        if not body.text.strip():
            raise HTTPException(400, "text is empty")
        return run_turn(sid, None, body.text.strip())

    @app.post("/api/explain")
    def explain_endpoint(body: ExplainBody) -> dict[str, Any]:
        if not body.text.strip():
            raise HTTPException(400, "text is empty")
        s = svc()
        with lock:
            try:
                out = explain(s.llm, body.text, body.context, simpler=body.simpler)
            except ExplainError as e:
                raise HTTPException(502, str(e)) from e
        return {"text": out.text, "translation": out.translation,
                "explanation": out.explanation, "examples": out.examples}

    @app.post("/api/tts")
    def tts_endpoint(body: TtsBody) -> dict[str, Any]:
        if not body.text.strip():
            raise HTTPException(400, "text is empty")
        if not 0.25 <= body.speed <= 2.0:
            raise HTTPException(400, "speed must be between 0.25 and 2")
        s = svc()
        with lock:
            clip = s.tts.synthesize(body.text.strip(), speed=body.speed)
        return {"audio": base64.b64encode(encode_wav(clip)).decode("ascii"),
                "sample_rate": clip.sample_rate}

    def study_store() -> StudyStore:
        s = svc()
        if not isinstance(s.store, StudyStore):
            raise HTTPException(501, "the configured store does not support the study list")
        return s.store

    @app.get("/api/study")
    def study_list() -> list[dict[str, Any]]:
        store = study_store()
        with lock:
            return [study_json(i) for i in store.list_study_items()]

    @app.post("/api/study")
    def study_add(body: StudyAddBody) -> dict[str, Any]:
        if not body.text.strip():
            raise HTTPException(400, "text is empty")
        store = study_store()
        with lock:
            item = store.save_study_item(
                body.text, body.source_text, body.session_id, body.message_id,
                translation=body.translation, explanation=body.explanation,
                examples=body.examples)
        return study_json(item)

    @app.patch("/api/study/{item_id}")
    def study_update(item_id: int, body: StudyUpdateBody) -> dict[str, Any]:
        store = study_store()
        with lock:
            try:
                item = store.update_study_item(
                    item_id, body.translation, body.explanation, body.examples)
            except ValueError as e:
                raise HTTPException(404, str(e)) from e
        return study_json(item)

    if static_dir is not None and (Path(static_dir) / "index.html").is_file():
        root = Path(static_dir).resolve()
        if (root / "assets").is_dir():
            app.mount("/assets", StaticFiles(directory=root / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        def spa(path: str) -> FileResponse:
            if path.startswith("api/"):
                raise HTTPException(404, "not found")
            target = (root / path).resolve()
            if path and target.is_file() and root in target.parents:
                return FileResponse(target)
            return FileResponse(root / "index.html")

    return app


_app: FastAPI | None = None


def __getattr__(name: str):
    # Lazy module attribute: importing this module (tests, tooling) builds nothing.
    global _app
    if name == "app":
        if _app is None:
            _app = create_app()
        return _app
    raise AttributeError(name)
