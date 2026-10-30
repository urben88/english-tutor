"""LangGraph turn graph over the ports (no LangChain model wrappers).

Flow: transcribe -> build_context -> generate -> speak -> persist -> [summarize].
Summarization runs last, only when the context policy marked turns to fold, so the reply
audio is already produced and normal turns pay no extra latency.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from backend.core.context import ContextBudget, build_context
from backend.core.models import AudioClip, ChatMessage, StoredMessage
from backend.core.persona import Persona
from backend.core.prompt import compose_system_prompt
from backend.core.ports import ConversationStore, LanguageModel, SpeechToText, TextToSpeech
from backend.core.usecases import VoiceTurn

SUMMARIZER_PROMPT = (
    "You maintain a short running summary of a spoken English practice conversation. "
    "Merge the previous summary with the new turns into one concise summary (under 120 words) "
    "that keeps the learner's topics, level, recurring mistakes and any facts to remember. "
    "Reply with the summary text only.")

# Called as soon as the reply audio exists (user_text, reply_text, reply_audio), before
# persisting and summarizing, so the caller can start playback without waiting.
OnReply = Callable[[str, str, AudioClip], None]


class TurnState(TypedDict, total=False):
    audio: AudioClip | None
    user_text: str
    messages: list[ChatMessage]
    fold: list[StoredMessage]
    reply_text: str
    reply_audio: AudioClip
    on_reply: OnReply | None


class TurnRunner:
    def __init__(self, stt: SpeechToText, llm: LanguageModel, tts: TextToSpeech,
                 store: ConversationStore, persona: Persona, budget: ContextBudget,
                 session_id: int, *, role: str | None = None) -> None:
        self._stt, self._llm, self._tts, self._store = stt, llm, tts, store
        self._persona, self._budget, self.session_id = persona, budget, session_id
        self._system_prompt = compose_system_prompt(persona.system_prompt, role)
        self._graph = self._compile()

    # --- nodes -------------------------------------------------------------------------
    def _transcribe(self, s: TurnState) -> dict[str, Any]:
        return {"user_text": self._stt.transcribe(s["audio"]).text}

    def _build_context(self, s: TurnState) -> dict[str, Any]:
        summary = self._store.get_summary(self.session_id)
        history = self._store.load_messages(self.session_id, after_id=summary.summarized_upto)
        plan = build_context(self._system_prompt, summary, history, s["user_text"],
                             self._llm.count_tokens, self._budget)
        return {"messages": plan.messages, "fold": plan.fold}

    def _generate(self, s: TurnState) -> dict[str, Any]:
        return {"reply_text": self._llm.generate(s["messages"])}

    def _speak(self, s: TurnState) -> dict[str, Any]:
        audio = self._tts.synthesize(s["reply_text"], voice=self._persona.voice)
        if s.get("on_reply"):
            s["on_reply"](s["user_text"], s["reply_text"], audio)
        return {"reply_audio": audio}

    def _persist(self, s: TurnState) -> dict[str, Any]:
        self._store.append_message(self.session_id, "user", s["user_text"])
        self._store.append_message(self.session_id, "assistant", s["reply_text"])
        return {}

    def _summarize(self, s: TurnState) -> dict[str, Any]:
        fold = s["fold"]
        previous = self._store.get_summary(self.session_id).text or "(none)"
        turns = "\n".join(f"{m.role}: {m.content}" for m in fold)
        text = self._llm.generate([
            ChatMessage("system", SUMMARIZER_PROMPT),
            ChatMessage("user", f"Previous summary:\n{previous}\n\nNew turns:\n{turns}"),
        ])
        self._store.set_summary(self.session_id, text.strip(), fold[-1].id)
        return {}

    # --- graph -------------------------------------------------------------------------
    def _compile(self):
        g = StateGraph(TurnState)
        for name, fn in (("transcribe", self._transcribe), ("build_context", self._build_context),
                         ("generate", self._generate), ("speak", self._speak),
                         ("persist", self._persist), ("summarize", self._summarize)):
            g.add_node(name, fn)
        g.add_conditional_edges(START, lambda s: "build_context" if s.get("user_text") else "transcribe",
                                ["transcribe", "build_context"])
        g.add_edge("transcribe", "build_context")
        g.add_edge("build_context", "generate")
        g.add_edge("generate", "speak")
        g.add_edge("speak", "persist")
        g.add_conditional_edges("persist", lambda s: "summarize" if s.get("fold") else END,
                                ["summarize", END])
        g.add_edge("summarize", END)
        return g.compile()

    def _run(self, state: TurnState) -> VoiceTurn:
        out = self._graph.invoke(state)
        return VoiceTurn(out["user_text"], out["reply_text"], out["reply_audio"])

    def run(self, audio: AudioClip, on_reply: OnReply | None = None) -> VoiceTurn:
        """One spoken turn: audio in, spoken reply out."""
        return self._run({"audio": audio, "on_reply": on_reply})

    def run_text(self, text: str, on_reply: OnReply | None = None) -> VoiceTurn:
        """Same turn from text (skips STT); for tests and debugging."""
        return self._run({"user_text": text, "on_reply": on_reply})
