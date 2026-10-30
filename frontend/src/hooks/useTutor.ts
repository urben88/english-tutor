import { useCallback, useEffect, useRef, useState } from "react";
import type { TutorApi } from "../api/client";
import type { Id, Message, SessionSummary, TurnEvent } from "../api/types";
import type { Player } from "../audio/player";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

/** Session + conversation state. Loads the latest session (or creates one). */
export function useTutor(api: TutorApi, player: Player) {
  const [sessionId, setSessionId] = useState<Id | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const booted = useRef(false);
  const playToken = useRef(0);
  const streamToken = useRef(0);
  const stoppedTurn = useRef(0);

  const open = useCallback(
    async (id: Id) => {
      setSessionId(id);
      setMessages(await api.messages(id));
    },
    [api],
  );

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (async () => {
      try {
        const list = await api.listSessions();
        setSessions(list);
        const id = list.length > 0 ? list[0].id : (await api.createSession()).id;
        await open(id);
      } catch (e) {
        setError(errMsg(e));
      }
    })();
  }, [api, open]);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await api.listSessions());
    } catch {
      /* the switcher keeps its previous list */
    }
  }, [api]);

  const newSession = useCallback(async (role?: string) => {
    try {
      setError(null);
      await open((await api.createSession(role?.trim() || undefined)).id);
      void refreshSessions();
    } catch (e) {
      setError(errMsg(e));
    }
  }, [api, open, refreshSessions]);

  /** Deletes a session; when it is the open one, moves to the next session (or a new one). */
  const removeSession = useCallback(
    async (id: Id) => {
      try {
        setError(null);
        await api.deleteSession(id);
        const list = await api.listSessions();
        setSessions(list);
        if (String(id) !== String(sessionId)) return;
        if (list.length > 0) await open(list[0].id);
        else {
          await open((await api.createSession()).id);
          void refreshSessions();
        }
      } catch (e) {
        setError(errMsg(e));
      }
    },
    [api, sessionId, open, refreshSessions],
  );

  const openSession = useCallback(
    async (id: Id) => {
      try {
        setError(null);
        await open(id);
      } catch (e) {
        setError(errMsg(e));
      }
    },
    [open],
  );

  /** `append` queues the clip behind the previous one; `speaking` clears after the last. */
  const playAudio = useCallback(
    (audio: string, append = false) => {
      const token = ++playToken.current;
      setSpeaking(true);
      void Promise.resolve(player.play(audio, append)).finally(() => {
        if (token === playToken.current) setSpeaking(false);
      });
    },
    [player],
  );

  /** Streams one turn: every reply clip is played as soon as it arrives. */
  const runTurnStream = useCallback(
    async (id: Id, body: { wav: Blob } | { text: string }, turn: number) => {
      let append = false;
      await api.streamTurn(id, body, (event: TurnEvent) => {
        if (turn !== streamToken.current) return;
        if (event.type === "reply") {
          // a Stop silences this turn: later clips are dropped instead of restarting audio
          if (turn === stoppedTurn.current) return;
          playAudio(event.audio, append);
          append = true;
        } else if (event.type === "done") {
          void api.messages(id).then(setMessages).catch(() => {});
          void refreshSessions();
        }
      });
    },
    [api, playAudio, refreshSessions],
  );

  /** Say any text out loud (a word, a phrase or a whole message). `speed` < 1 is slower. */
  const speak = useCallback(
    async (text: string, speed = 1) => {
      try {
        const res = await api.tts(text, speed);
        if (res.audio) playAudio(res.audio);
      } catch (e) {
        setError(errMsg(e));
      }
    },
    [api, playAudio],
  );

  const sendText = useCallback(
    async (text: string) => {
      if (sessionId === null || !text.trim()) return;
      const turn = ++streamToken.current;
      setBusy(true);
      setError(null);
      try {
        await runTurnStream(sessionId, { text: text.trim() }, turn);
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setBusy(false);
      }
    },
    [sessionId, runTurnStream],
  );

  const stopSpeaking = useCallback(() => {
    stoppedTurn.current = streamToken.current;
    player.stop();
    playToken.current++;
    setSpeaking(false);
  }, [player]);

  /** Throws on failure so the hold-to-talk hook can report it. */
  const sendVoice = useCallback(
    async (wav: Blob) => {
      if (sessionId === null) throw new Error("No session yet.");
      const turn = ++streamToken.current;
      setError(null);
      await runTurnStream(sessionId, { wav }, turn);
    },
    [sessionId, runTurnStream],
  );

  return { messages, sessions, sessionId, openSession, removeSession, busy, error, setError, newSession, sendText, sendVoice, speak, speaking, stopSpeaking, ready: sessionId !== null };
}
