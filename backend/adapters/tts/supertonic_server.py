"""Text-to-speech adapter for the shared Supertonic server (``backend.services.tts_server``).

If the server answers at host:port it is used. Otherwise, with ``autostart`` (default), it is
started detached with the current Python and left running for other tools. If it still cannot
be reached, the model is loaded in-process (the ``supertonic`` adapter) and a warning is logged.
"""

from __future__ import annotations

import logging
import sys
import time
from collections.abc import Callable
from typing import Any

import httpx

from backend.adapters.process import REPO_ROOT, Launcher, ensure_running, spawn_detached
from backend.api.wav import decode_wav
from backend.core.models import AudioClip

log = logging.getLogger(__name__)


def _supertonic(**kwargs: Any):
    from backend.adapters.tts.supertonic import SupertonicTTS
    return SupertonicTTS(**kwargs)


class SupertonicServerTTS:
    def __init__(self, model_dir: str, host: str = "127.0.0.1", port: int = 8179,
                 voice: str = "M1", steps: int = 8, autostart: bool = True,
                 timeout: float = 60.0, start_timeout: float = 60.0,
                 client: httpx.Client | None = None, launcher: Launcher = spawn_detached,
                 sleep=time.sleep, clock=time.monotonic,
                 local_factory: Callable[..., Any] | None = None) -> None:
        self._base = f"http://{host}:{port}"
        self._client = client or httpx.Client(timeout=timeout)
        self._local = None
        up = self._is_up()
        if not up and autostart:
            argv = [sys.executable, "-m", "backend.services.tts_server",
                    "--model-dir", str(model_dir), "--host", host, "--port", str(port),
                    "--voice", voice, "--steps", str(steps)]
            up = ensure_running(self._is_up, argv, launcher=launcher, cwd=REPO_ROOT,
                                timeout=start_timeout, sleep=sleep, clock=clock)
        if not up:
            log.warning("TTS server not reachable at %s; loading Supertonic in-process", self._base)
            self._local = (local_factory or _supertonic)(model_dir=model_dir, voice=voice,
                                                         steps=steps)

    def _is_up(self) -> bool:
        try:
            return self._client.get(self._base + "/health").status_code == 200
        except httpx.TransportError:
            return False

    def synthesize(self, text: str, *, voice: str | None = None, speed: float = 1.0) -> AudioClip:
        if self._local is not None:
            return self._local.synthesize(text, voice=voice, speed=speed)
        body: dict[str, Any] = {"text": text, "speed": speed}
        if voice is not None:
            body["voice"] = voice
        resp = self._client.post(self._base + "/synthesize", json=body)
        resp.raise_for_status()
        return decode_wav(resp.content)
