import type { Explanation, Id, Message, Persona, SessionSummary, TurnResponse } from "./types";

export interface TutorApi {
  persona(): Promise<Persona>;
  listSessions(): Promise<SessionSummary[]>;
  createSession(): Promise<{ id: Id }>;
  messages(sessionId: Id): Promise<Message[]>;
  voiceTurn(sessionId: Id, wav: Blob): Promise<TurnResponse>;
  textTurn(sessionId: Id, text: string): Promise<TurnResponse>;
  explain(text: string, context: string): Promise<Explanation>;
}

export class ApiError extends Error {}

type Fetch = typeof fetch;

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* keep default message */
    }
    throw new ApiError(detail);
  }
  return (await res.json()) as T;
}

export function createApi(fetchFn: Fetch = (...a) => fetch(...a)): TutorApi {
  const json = (body: unknown): RequestInit => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const sid = (id: Id) => encodeURIComponent(String(id));
  return {
    persona: () => fetchFn("/api/persona").then((r) => parse<Persona>(r)),
    listSessions: () => fetchFn("/api/sessions").then((r) => parse<SessionSummary[]>(r)),
    createSession: () =>
      fetchFn("/api/sessions", { method: "POST" }).then((r) => parse<{ id: Id }>(r)),
    messages: (id) => fetchFn(`/api/sessions/${sid(id)}/messages`).then((r) => parse<Message[]>(r)),
    voiceTurn: (id, wav) =>
      fetchFn(`/api/sessions/${sid(id)}/turn`, {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: wav,
      }).then((r) => parse<TurnResponse>(r)),
    textTurn: (id, text) =>
      fetchFn(`/api/sessions/${sid(id)}/turn/text`, json({ text })).then((r) =>
        parse<TurnResponse>(r),
      ),
    explain: (text, context) =>
      fetchFn("/api/explain", json({ text, context })).then((r) => parse<Explanation>(r)),
  };
}
