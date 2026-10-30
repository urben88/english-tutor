"""Start a shared local server as a detached process and wait until it answers.

Used by the whisper-server STT adapter and the Supertonic TTS adapter. The started process is
never stopped by english-tutor: other tools may be using it too.
"""

from __future__ import annotations

import subprocess
import sys
import time
from collections.abc import Callable, Sequence
from pathlib import Path

Launcher = Callable[..., None]  # launcher(argv, cwd=None)

REPO_ROOT = Path(__file__).resolve().parents[2]  # so ``python -m backend...`` resolves


def spawn_detached(argv: Sequence[str], cwd: str | Path | None = None) -> None:
    """Start ``argv`` in the background, detached from this process and its console."""
    kwargs: dict = {"stdin": subprocess.DEVNULL, "stdout": subprocess.DEVNULL,
                    "stderr": subprocess.DEVNULL, "cwd": cwd, "close_fds": True}
    if sys.platform == "win32":
        kwargs["creationflags"] = (subprocess.DETACHED_PROCESS
                                   | subprocess.CREATE_NEW_PROCESS_GROUP)
    else:
        kwargs["start_new_session"] = True
    subprocess.Popen(list(argv), **kwargs)  # noqa: S603 - argv built by the adapters


def ensure_running(is_up: Callable[[], bool], argv: Sequence[str], *,
                   launcher: Launcher = spawn_detached, cwd: str | Path | None = None,
                   timeout: float = 60.0, interval: float = 0.5,
                   sleep: Callable[[float], None] = time.sleep,
                   clock: Callable[[], float] = time.monotonic) -> bool:
    """True when the server answers: already up, or started now and ready within ``timeout``.

    Starts it at most once. False when it cannot be launched or does not answer in time.
    """
    if is_up():
        return True
    try:
        launcher(list(argv), cwd)
    except OSError:
        return False
    deadline = clock() + timeout
    while clock() < deadline:
        sleep(interval)
        if is_up():
            return True
    return False
