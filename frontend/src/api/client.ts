import type {
  Analysis,
  Explanation,
  Id,
  Message,
  Persona,
  SessionSummary,
  Settings,
  SpeechResponse,
  StudyDraft,
  StudyItem,
  TurnResponse,
} from "./types";

export interface TutorApi {
  persona(): Promise<Persona>;
  listSessions(): Promise<SessionSummary[]>;
  /** `role`: optional free-text topic (at most 200 characters) stored with the session. */
  createSession(role?: string): Promise<{ id: Id }>;
  deleteSession(id: Id): Promise<void>;
  messages(sessionId: Id): Promise<Message[]>;
  voiceTurn(sessionId: Id, wav: Blob): Promise<TurnResponse>;
  textTurn(sessionId: Id, text: string): Promise<TurnResponse>;
  explain(text: string, context: string, simpler?: boolean): Promise<Explanation>;
  /** Speech for a word, phrase or message. `speed` < 1 is slower (0.25 to 2). */
  tts(text: string, speed?: number): Promise<SpeechResponse>;
  listStudy(): Promise<StudyItem[]>;
  /** Adds the item, or counts another listen; given explanation fields replace the saved ones. */
  saveStudy(draft: StudyDraft): Promise<StudyItem>;
  updateStudy(id: Id, explanation: Pick<StudyItem, "translation" | "explanation" | "examples">): Promise<StudyItem>;
  deleteStudy(id: Id): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
  /** Sentence structure with a translation and explanation per word (502 when the model fails). */
  analyze(text: string, messageId?: Id): Promise<Analysis>;
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
    createSession: (role) =>
      fetchFn("/api/sessions", role?.trim() ? json({ role: role.trim() }) : { method: "POST" }).then((r) =>
        parse<{ id: Id }>(r),
      ),
    deleteSession: (id) =>
      fetchFn(`/api/sessions/${sid(id)}`, { method: "DELETE" }).then((r) => parse<unknown>(r).then(() => undefined)),
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
    explain: (text, context, simpler = false) =>
      fetchFn("/api/explain", json(simpler ? { text, context, simpler } : { text, context })).then((r) =>
        parse<Explanation>(r),
      ),
    tts: (text, speed = 1) =>
      fetchFn("/api/tts", json({ text, speed })).then((r) => parse<SpeechResponse>(r)),
    listStudy: () => fetchFn("/api/study").then((r) => parse<StudyItem[]>(r)),
    saveStudy: (draft) => fetchFn("/api/study", json(draft)).then((r) => parse<StudyItem>(r)),
    updateStudy: (id, explanation) =>
      fetchFn(`/api/study/${sid(id)}`, { ...json(explanation), method: "PATCH" }).then((r) =>
        parse<StudyItem>(r),
      ),
    deleteStudy: (id) =>
      fetchFn(`/api/study/${sid(id)}`, { method: "DELETE" }).then((r) => parse<unknown>(r).then(() => undefined)),
    getSettings: () => fetchFn("/api/settings").then((r) => parse<Settings>(r)),
    saveSettings: (patch) => fetchFn("/api/settings", { ...json(patch), method: "PUT" }).then((r) => parse<Settings>(r)),
    analyze: (text, messageId) =>
      fetchFn("/api/analyze", json(messageId === undefined ? { text } : { text, message_id: messageId })).then((r) =>
        parse<Analysis>(r),
      ),
  };
}
