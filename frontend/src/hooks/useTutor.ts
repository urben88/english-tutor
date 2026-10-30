import { useCallback, useEffect, useRef, useState } from "react";
import type { TutorApi } from "../api/client";
import type { Id, Message, TurnResponse } from "../api/types";
import type { Player } from "../audio/player";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

/** Session + conversation state. Loads the latest session (or creates one). */
export function useTutor(api: TutorApi, player: Player) {
  const [sessionId, setSessionId] = useState<Id | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const booted = useRef(false);

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
        const sessions = await api.listSessions();
        const id = sessions.length > 0 ? sessions[0].id : (await api.createSession()).id;
        await open(id);
      } catch (e) {
        setError(errMsg(e));
      }
    })();
  }, [api, open]);

  const newSession = useCallback(async () => {
    try {
      setError(null);
      await open((await api.createSession()).id);
    } catch (e) {
      setError(errMsg(e));
    }
  }, [api, open]);

  const finishTurn = useCallback(
    async (id: Id, res: TurnResponse) => {
      if (res.audio) player.play(res.audio);
      setMessages(await api.messages(id));
    },
    [api, player],
  );

  const sendText = useCallback(
    async (text: string) => {
      if (sessionId === null || !text.trim()) return;
      setBusy(true);
      setError(null);
      try {
        await finishTurn(sessionId, await api.textTurn(sessionId, text.trim()));
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setBusy(false);
      }
    },
    [api, sessionId, finishTurn],
  );

  /** Throws on failure so the hold-to-talk hook can report it. */
  const sendVoice = useCallback(
    async (wav: Blob) => {
      if (sessionId === null) throw new Error("No session yet.");
      setError(null);
      await finishTurn(sessionId, await api.voiceTurn(sessionId, wav));
    },
    [api, sessionId, finishTurn],
  );

  return { messages, busy, error, setError, newSession, sendText, sendVoice, ready: sessionId !== null };
}
