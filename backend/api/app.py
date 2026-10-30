"""Web API over the existing ports and turn graph (single local user).

``create_app(services)`` takes the ports so tests can inject fakes. The module-level ``app``
(``uvicorn backend.api.app:app``) is built on first access from config.yaml, and the models
are only loaded on the first request that needs them. One lock serializes model and store use.
"""

from __future__ import annotations

import base64
import json
import threading
from collections.abc import Iterator
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.api.wav import decode_wav, encode_wav
from backend.core.analyze import MAX_TEXT_CHARS, AnalyzeError, analyze
from backend.core.context import ContextBudget
from backend.core.explain import ExplainError, explain
from backend.core.models import AudioClip
from backend.core.persona import Persona
from backend.core.settings import Settings
from backend.core.models import SessionInfo, StudyItem
from backend.core.ports import (
    ConversationStore, LanguageModel, SessionAdmin, SettingsStore, SpeechToText, StudyStore,
    TextToSpeech)
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


MAX_ROLE_CHARS = 200


class SessionBody(BaseModel):
    role: str | None = None  # free-text topic / role-play, e.g. "waiter at a restaurant"


class SettingsBody(BaseModel):
    answer_length: str | None = None  # "short" | "medium" | "long"
    context_tokens: int | None = None  # 0 = automatic, else 256..131072


class TextBody(BaseModel):
    text: str


class ExplainBody(BaseModel):
    text: str
    context: str = ""
    simpler: bool = False


class AnalyzeBody(BaseModel):
    text: str
    message_id: int | None = None  # echoed back so the UI can match the answer to a message


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
    # Serializes model and store access (single local user). A plain Lock, not an RLock:
    # the NDJSON generator acquires it in one worker thread and is closed in another, and
    # only a plain lock may be released by a different thread than the one that took it.
    lock = threading.Lock()
    holder: dict[str, Services] = {}
    if services is not None:
        holder["s"] = services

    def svc() -> Services:
        with lock:
            if "s" not in holder:
                holder["s"] = build_services(config_path)
            return holder["s"]

    def require_session(s: Services, sid: int) -> SessionInfo:
        for x in s.store.list_sessions():
            if x.id == sid:
                return x
        raise HTTPException(404, f"unknown session {sid}")

    def current_settings(s: Services) -> Settings:
        if isinstance(s.store, SettingsStore):
            return Settings.from_stored(s.store.load_settings())
        return Settings()

    def reply_json(turn) -> dict[str, Any]:
        return {"user_text": turn.user_text, "reply_text": turn.reply_text,
                "audio": base64.b64encode(encode_wav(turn.reply_audio)).decode("ascii"),
                "sample_rate": turn.reply_audio.sample_rate}

    def run_turn(sid: int, clip: AudioClip | None, text: str | None) -> dict[str, Any]:
        s = svc()
        with lock:
            info = require_session(s, sid)
            runner = TurnRunner(s.stt, s.llm, s.tts, s.store, s.persona, s.budget, sid,
                                role=info.role, settings=current_settings(s))
            return reply_json(runner.run(clip) if clip is not None else runner.run_text(text or ""))

    def ndjson(event: dict[str, Any]) -> str:
        return json.dumps(event, ensure_ascii=False) + "\n"

    def require_known_session(s: Services, sid: int) -> None:
        with lock:
            require_session(s, sid)

    def stream_lines(s: Services, sid: int, clip: AudioClip | None,
                     text: str | None) -> Iterator[str]:
        """NDJSON lines for one turn. The lock is held for the whole stream and released
        when the generator finishes, fails or is closed (client disconnect)."""
        with lock:
            try:
                info = require_session(s, sid)
                runner = TurnRunner(s.stt, s.llm, s.tts, s.store, s.persona, s.budget, sid,
                                    role=info.role, settings=current_settings(s))
                for event in runner.stream(audio=clip, text=text):
                    if event["type"] == "sentence":
                        audio = event["audio"]
                        yield ndjson({
                            "type": "reply", "text": event["text"],
                            "audio": base64.b64encode(encode_wav(audio)).decode("ascii"),
                            "sample_rate": audio.sample_rate})
                    elif event["type"] == "done":
                        yield ndjson({"type": "done", "reply_text": event["reply_text"]})
                    else:
                        yield ndjson(event)
            except Exception as e:  # noqa: BLE001 - the HTTP status is already 200 here
                yield ndjson({"type": "error", "message": str(e)})

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/persona")
    def persona() -> dict[str, str]:
        p = svc().persona
        return {"name": p.name, "stem": p.stem}

    @app.get("/api/settings")
    def get_settings() -> dict[str, Any]:
        s = svc()
        with lock:
            cur = current_settings(s)
        return {"answer_length": cur.answer_length, "context_tokens": cur.context_tokens}

    @app.put("/api/settings")
    def put_settings(body: SettingsBody) -> dict[str, Any]:
        s = svc()
        if not isinstance(s.store, SettingsStore):
            raise HTTPException(501, "the configured store cannot save settings")
        with lock:
            cur = current_settings(s)
            new = Settings(
                cur.answer_length if body.answer_length is None else body.answer_length,
                cur.context_tokens if body.context_tokens is None else body.context_tokens)
            try:
                new.validated()
            except ValueError as e:
                raise HTTPException(400, str(e)) from e
            s.store.save_settings(new.to_stored())
        return {"answer_length": new.answer_length, "context_tokens": new.context_tokens}

    @app.get("/api/sessions")
    def sessions() -> list[dict[str, Any]]:
        s = svc()
        with lock:
            rows = s.store.list_sessions()
        return [{"id": r.id, "persona": r.persona, "role": r.role, "created_at": r.created_at,
                 "updated_at": r.updated_at, "message_count": r.message_count} for r in rows]

    @app.post("/api/sessions")
    def create_session(body: SessionBody | None = None) -> dict[str, int]:
        role = ((body.role if body else None) or "").strip()
        if len(role) > MAX_ROLE_CHARS:
            raise HTTPException(400, f"role is longer than {MAX_ROLE_CHARS} characters")
        s = svc()
        with lock:
            return {"id": s.store.create_session(s.persona.stem, role or None)}

    @app.delete("/api/sessions/{sid}")
    def delete_session(sid: int) -> dict[str, int]:
        s = svc()
        if not isinstance(s.store, SessionAdmin):
            raise HTTPException(501, "the configured store cannot delete sessions")
        with lock:
            require_session(s, sid)
            s.store.delete_session(sid)
        return {"deleted": sid}

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

    @app.post("/api/sessions/{sid}/turn/stream")
    async def voice_turn_stream(sid: int, request: Request) -> StreamingResponse:
        try:
            clip = decode_wav(await request.body())
        except ValueError as e:
            raise HTTPException(400, str(e)) from e
        s = await run_in_threadpool(svc)
        if s.stt is None:
            raise HTTPException(503, "speech-to-text is unavailable (is whisper-server running?); "
                                     "use /turn/text/stream")
        await run_in_threadpool(require_known_session, s, sid)
        return StreamingResponse(stream_lines(s, sid, clip, None),
                                 media_type="application/x-ndjson")

    @app.post("/api/sessions/{sid}/turn/text/stream")
    async def text_turn_stream(sid: int, body: TextBody) -> StreamingResponse:
        text = body.text.strip()
        if not text:
            raise HTTPException(400, "text is empty")
        s = await run_in_threadpool(svc)
        await run_in_threadpool(require_known_session, s, sid)
        return StreamingResponse(stream_lines(s, sid, None, text),
                                 media_type="application/x-ndjson")

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

    @app.post("/api/analyze")
    def analyze_endpoint(body: AnalyzeBody) -> dict[str, Any]:
        text = body.text.strip()
        if not text:
            raise HTTPException(400, "text is empty")
        if len(text) > MAX_TEXT_CHARS:
            raise HTTPException(400, f"text is longer than {MAX_TEXT_CHARS} characters")
        s = svc()
        with lock:
            try:
                out = analyze(s.llm, text)
            except AnalyzeError as e:
                raise HTTPException(502, str(e)) from e
        return {"text": out.text, "message_id": body.message_id, "structure": out.structure,
                "tokens": [asdict(t) for t in out.tokens]}

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

    @app.delete("/api/study/{item_id}")
    def study_delete(item_id: int) -> dict[str, int]:
        store = study_store()
        with lock:
            try:
                store.delete_study_item(item_id)
            except ValueError as e:
                raise HTTPException(404, str(e)) from e
        return {"deleted": item_id}

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
