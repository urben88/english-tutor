"""Use cases. They receive ports by injection and never import adapters."""

from __future__ import annotations

from dataclasses import dataclass

from backend.core.models import AudioClip, ChatMessage
from backend.core.ports import LanguageModel, SpeechToText, TextToSpeech


@dataclass
class VoiceTurn:
    user_text: str
    reply_text: str
    reply_audio: AudioClip


class ConversationTurn:
    """One spoken turn: user audio -> transcript -> LLM reply -> spoken reply."""

    def __init__(self, stt: SpeechToText, llm: LanguageModel, tts: TextToSpeech,
                 system_prompt: str = "") -> None:
        self._stt = stt
        self._llm = llm
        self._tts = tts
        self._system_prompt = system_prompt

    def run(self, audio: AudioClip, history: list[ChatMessage] | None = None) -> VoiceTurn:
        transcript = self._stt.transcribe(audio)
        messages: list[ChatMessage] = []
        if self._system_prompt:
            messages.append(ChatMessage("system", self._system_prompt))
        messages.extend(history or [])
        messages.append(ChatMessage("user", transcript.text))
        reply = self._llm.generate(messages)
        return VoiceTurn(transcript.text, reply, self._tts.synthesize(reply))
