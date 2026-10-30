// Shapes of the backend API (spec S1).
export type Id = string | number;

export interface Persona {
  name: string;
  stem: string;
}

export interface SessionSummary {
  id: Id;
  persona: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Message {
  id: Id;
  role: string; // "user" | "assistant"
  content: string;
}

export interface TurnResponse {
  user_text: string;
  reply_text: string;
  audio: string; // base64 WAV 16-bit PCM
  sample_rate: number;
}

export interface Explanation {
  text: string;
  translation: string;
  explanation: string;
  examples: string[];
}

export interface SpeechResponse {
  audio: string; // base64 WAV 16-bit PCM
  sample_rate: number;
}

/** What a studied word came from: lets the study list jump back to the message. */
export interface Source {
  messageId: Id | null;
  sessionId: Id | null;
}

/** A word or phrase to listen to or explain, with the sentence it appeared in. */
export interface StudyTarget {
  text: string;
  context: string;
  source: Source;
}

/** Body of POST /api/study. The explanation fields are optional. */
export interface StudyDraft {
  text: string;
  source_text: string;
  session_id: Id | null;
  message_id: Id | null;
  translation?: string;
  explanation?: string;
  examples?: string[];
}

/** A studied word or phrase saved by the backend. */
export interface StudyItem {
  id: Id;
  text: string;
  source_text: string;
  session_id: Id | null;
  message_id: Id | null;
  translation: string;
  explanation: string; // grammar and use, in Spanish
  examples: string[];
  listen_count: number;
  created_at: number;
  updated_at: number;
}
