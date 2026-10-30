"""Supertonic 3 TTS adapter (ONNX Runtime, CPU only).

Ported from the official ``py/helper.py`` example of supertone-inc/supertonic. Model:
Hugging Face ``supertone-oss-archive/supertonic-3`` (pinned revision, OpenRAIL-M license).
Expected layout: ``<model_dir>/onnx/*`` and ``<model_dir>/voice_styles/*.json``.

Download: ``uv run python -m backend.adapters.tts.supertonic --download <model_dir>``
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.request
from pathlib import Path
from unicodedata import normalize

import numpy as np

from backend.core.models import AudioClip

REPO = "supertone-oss-archive/supertonic-3"
REVISION = "aafc6e32416a594460b32413efc49d7fe4ce6d46"
BASE_URL = f"https://huggingface.co/{REPO}/resolve/{REVISION}/"

LANGUAGES = ["en", "ko", "ja", "ar", "bg", "cs", "da", "de", "el", "es", "et", "fi", "fr",
             "hi", "hr", "hu", "id", "it", "lt", "lv", "nl", "pl", "pt", "ro", "ru", "sk",
             "sl", "sv", "tr", "uk", "vi", "na"]

VOICES = ["M1", "M2", "M3", "M4", "M5", "F1", "F2", "F3", "F4", "F5"]

# (relative path, size in bytes, sha256 or None). The big ONNX models are sha256-verified.
FILES = [
    ("onnx/duration_predictor.onnx", 3700147,
     "c3eb91414d5ff8a7a239b7fe9e34e7e2bf8a8140d8375ffb14718b1c639325db"),
    ("onnx/text_encoder.onnx", 36416150,
     "c7befd5ea8c3119769e8a6c1486c4edc6a3bc8365c67621c881bbb774b9902ff"),
    ("onnx/vector_estimator.onnx", 256534781,
     "883ac868ea0275ef0e991524dc64f16b3c0376efd7c320af6b53f5b780d7c61c"),
    ("onnx/vocoder.onnx", 101424195,
     "085de76dd8e8d5836d6ca66826601f615939218f90e519f70ee8a36ed2a4c4ba"),
    ("onnx/tts.json", 8253, None),
    ("onnx/unicode_indexer.json", 277676, None),
    ("voice_styles/F1.json", 292046, None),
    ("voice_styles/F2.json", 292423, None),
    ("voice_styles/F3.json", 290794, None),
    ("voice_styles/F4.json", 291808, None),
    ("voice_styles/F5.json", 291479, None),
    ("voice_styles/M1.json", 291748, None),
    ("voice_styles/M2.json", 292055, None),
    ("voice_styles/M3.json", 290198, None),
    ("voice_styles/M4.json", 291522, None),
    ("voice_styles/M5.json", 291469, None),
]

_EMOJIS = re.compile(
    "[\U0001f600-\U0001f64f\U0001f300-\U0001f5ff\U0001f680-\U0001f6ff\U0001f700-\U0001f77f"
    "\U0001f780-\U0001f7ff\U0001f800-\U0001f8ff\U0001f900-\U0001f9ff\U0001fa00-\U0001fa6f"
    "\U0001fa70-\U0001faff☀-⛿✀-➿\U0001f1e6-\U0001f1ff]+", flags=re.UNICODE)

_REPLACEMENTS = {
    "–": "-", "‑": "-", "—": "-", "_": " ", "“": '"', "”": '"',
    "‘": "'", "’": "'", "´": "'", "`": "'", "[": " ", "]": " ", "|": " ",
    "/": " ", "#": " ", "→": " ", "←": " ",
}


def prepare_text(text: str, language: str) -> str:
    """Normalize text like the official example and wrap it in ``<lang>...</lang>``."""
    if language not in LANGUAGES:
        raise ValueError(f"Language not supported by Supertonic: {language}")
    text = normalize("NFKD", text)
    text = _EMOJIS.sub("", text)
    for old, new in _REPLACEMENTS.items():
        text = text.replace(old, new)
    text = re.sub(r"[♥☆♡©\\]", "", text)
    for old, new in ((" ,", ","), (" .", "."), (" !", "!"), (" ?", "?"), (" ;", ";"),
                     (" :", ":"), (" '", "'")):
        text = text.replace(old, new)
    for quotes in ('""', "''", "``"):
        while quotes in text:
            text = text.replace(quotes, quotes[0])
    text = re.sub(r"\s+", " ", text).strip()
    if not re.search(r"[.!?;:,'\"')\]}…。」』】〉》›»]$", text):
        text += "."
    return f"<{language}>{text}</{language}>"


def _mask(lengths: np.ndarray, maximum: int | None = None) -> np.ndarray:
    maximum = maximum or int(lengths.max())
    ids = np.arange(0, maximum)
    mask = (ids < np.expand_dims(lengths, axis=1)).astype(np.float32)
    return mask.reshape(-1, 1, maximum)


def _latent_mask(wav_lengths: np.ndarray, base: int, compress: int) -> np.ndarray:
    size = base * compress
    return _mask((wav_lengths + size - 1) // size)


def split_text(text: str, maximum: int = 300) -> list[str]:
    """Split text into chunks of up to ``maximum`` characters, by paragraph and sentence."""
    chunks: list[str] = []
    for paragraph in (p.strip() for p in re.split(r"\n\s*\n+", text.strip())):
        if not paragraph:
            continue
        current = ""
        for sentence in re.split(r"(?<=[.!?])\s+", paragraph):
            if len(current) + len(sentence) + 1 <= maximum:
                current += (" " if current else "") + sentence
            else:
                if current:
                    chunks.append(current.strip())
                current = sentence
        if current:
            chunks.append(current.strip())
    return chunks


def is_installed(model_dir: str | Path, voice: str = "M1") -> bool:
    """True when the ONNX models and the requested voice are complete in ``model_dir``."""
    model_dir = Path(model_dir)
    for rel, size, _sha in FILES:
        if rel.startswith("onnx/") or rel == f"voice_styles/{voice}.json":
            path = model_dir / rel
            if not path.is_file() or path.stat().st_size != size:
                return False
    return True


class SupertonicTTS:
    """Four ONNX sessions on CPU plus one voice style loaded from JSON."""

    def __init__(self, model_dir: str, voice: str = "M1", steps: int = 8,
                 language: str = "en", threads: int = 0, chunk_pause: float = 0.3) -> None:
        if not is_installed(model_dir, voice):
            raise FileNotFoundError(
                f"Supertonic model incomplete in {model_dir}. Download it with: "
                f"python -m backend.adapters.tts.supertonic --download {model_dir}")
        import onnxruntime as ort

        root = Path(model_dir)
        onnx = root / "onnx"
        options = ort.SessionOptions()
        if threads:
            options.intra_op_num_threads = int(threads)
        providers = ["CPUExecutionProvider"]  # never CUDA: keep the GPU free for the LLM

        def load(name: str):
            return ort.InferenceSession(str(onnx / name), sess_options=options,
                                        providers=providers)

        with open(onnx / "tts.json", "r", encoding="utf-8") as f:
            cfg = json.load(f)
        with open(onnx / "unicode_indexer.json", "r", encoding="utf-8") as f:
            self._indexer = json.load(f)
        self._dp = load("duration_predictor.onnx")
        self._enc = load("text_encoder.onnx")
        self._vec = load("vector_estimator.onnx")
        self._voc = load("vocoder.onnx")
        self.sample_rate = int(cfg["ae"]["sample_rate"])
        self._base = cfg["ae"]["base_chunk_size"]
        self._compress = cfg["ttl"]["chunk_compress_factor"]
        self._latent_dim = cfg["ttl"]["latent_dim"]
        self._model_dir = root
        self._voice = voice
        self._styles = {voice: self._load_style(root / "voice_styles" / f"{voice}.json")}
        self._steps = steps
        self._language = language
        self._chunk_pause = chunk_pause

    @staticmethod
    def _load_style(path: Path) -> tuple[np.ndarray, np.ndarray]:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        ttl, dp = data["style_ttl"], data["style_dp"]
        a = np.array(ttl["data"], dtype=np.float32).reshape(1, ttl["dims"][1], ttl["dims"][2])
        b = np.array(dp["data"], dtype=np.float32).reshape(1, dp["dims"][1], dp["dims"][2])
        return a, b

    def _style(self, voice: str) -> tuple[np.ndarray, np.ndarray]:
        if voice not in VOICES:
            raise ValueError(f"Unknown Supertonic voice '{voice}'. Valid: {', '.join(VOICES)}")
        if voice not in self._styles:
            self._styles[voice] = self._load_style(self._model_dir / "voice_styles" / f"{voice}.json")
        return self._styles[voice]

    def _ids(self, text: str) -> tuple[np.ndarray, np.ndarray]:
        values = [self._indexer[ord(c)] for c in text]
        ids = np.array([values], dtype=np.int64)
        return ids, _mask(np.array([len(values)], dtype=np.int64))

    def _infer(self, text: str, style, speed: float) -> np.ndarray:
        style_ttl, style_dp = style
        ids, mask = self._ids(prepare_text(text, self._language))
        dur, *_ = self._dp.run(None, {"text_ids": ids, "style_dp": style_dp, "text_mask": mask})
        dur = dur / speed
        emb, *_ = self._enc.run(None, {"text_ids": ids, "style_ttl": style_ttl, "text_mask": mask})
        wav_len = (dur * self.sample_rate).astype(np.int64)
        size = self._base * self._compress
        length = int((dur.max() * self.sample_rate + size - 1) / size)
        latent_mask = _latent_mask(wav_len, self._base, self._compress)
        xt = np.random.randn(1, self._latent_dim * self._compress, length).astype(np.float32)
        xt = xt * latent_mask
        total = np.array([self._steps], dtype=np.float32)
        for step in range(self._steps):
            xt, *_ = self._vec.run(None, {
                "noisy_latent": xt, "text_emb": emb, "style_ttl": style_ttl,
                "text_mask": mask, "latent_mask": latent_mask,
                "current_step": np.array([step], dtype=np.float32), "total_step": total})
        wav, *_ = self._voc.run(None, {"latent": xt})
        return np.asarray(wav, dtype=np.float32).reshape(-1)

    def synthesize(self, text: str, *, voice: str | None = None, speed: float = 1.0) -> AudioClip:
        style = self._style(voice or self._voice)
        maximum = 120 if self._language in ("ko", "ja") else 300
        parts: list[np.ndarray] = []
        for i, chunk in enumerate(split_text(text, maximum)):
            if i:
                parts.append(np.zeros(int(self._chunk_pause * self.sample_rate), dtype=np.float32))
            parts.append(self._infer(chunk, style, speed))
        samples = np.concatenate(parts) if parts else np.zeros(0, dtype=np.float32)
        return AudioClip(samples, self.sample_rate)


# --- Model download ---

def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def _is_valid(path: Path, size: int, sha: str | None) -> bool:
    if not path.is_file() or path.stat().st_size != size:
        return False
    return sha is None or _sha256(path) == sha


def download(model_dir: str | Path, notify=print) -> None:
    """Download and verify the model (about 400 MB). Raises OSError/ValueError on failure."""
    model_dir = Path(model_dir)
    for rel, size, sha in FILES:
        target = model_dir / rel
        if _is_valid(target, size, sha):
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        notify(f"Downloading {rel} ({size / 1e6:.1f} MB)...")
        partial = target.with_name(target.name + ".part")
        req = urllib.request.Request(BASE_URL + rel, headers={"User-Agent": "english-tutor"})
        with urllib.request.urlopen(req, timeout=60) as resp, open(partial, "wb") as f:
            while block := resp.read(1 << 20):
                f.write(block)
        if not _is_valid(partial, size, sha):
            partial.unlink(missing_ok=True)
            raise ValueError(f"Corrupt download: {rel}")
        os.replace(partial, target)
    notify("Supertonic ready")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Download the Supertonic 3 model")
    ap.add_argument("--download", metavar="MODEL_DIR", required=True)
    args = ap.parse_args()
    try:
        download(args.download)
    except (OSError, ValueError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
