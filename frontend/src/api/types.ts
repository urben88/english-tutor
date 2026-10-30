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

/** A studied word or phrase listed in the study panel (filled from the API in a later task). */
export interface StudyItem {
  id: Id;
  text: string;
  translation?: string;
}
