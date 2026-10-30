/** Voice activity detection as a pure unit: audio frames in, utterances out. */

export const SILENCE_MS = 1000; // end of utterance after this much silence (tune here)
export const MIN_SPEECH_MS = 300; // shorter utterances are discarded
export const PRE_ROLL_MS = 300; // audio kept before the first voiced frame
export const START_MS = 60; // voiced audio needed before speech is "detected"
export const THRESHOLD = 0.02; // RMS energy over which a frame counts as voiced

export interface VadOptions {
  sampleRate: number;
  threshold?: number;
  silenceMs?: number;
  minSpeechMs?: number;
  preRollMs?: number;
  startMs?: number;
}

export interface VadResult {
  /** Mono samples of a finished utterance, when one just ended. */
  utterance: Float32Array | null;
  /** True while an utterance is in progress. */
  speaking: boolean;
  /** Frame RMS (0 while muted). */
  level: number;
}

export interface Vad {
  push(frame: Float32Array): VadResult;
  setMuted(muted: boolean): void;
  /** Drop any partial utterance and pre-roll. */
  reset(): void;
}

export function rms(frame: Float32Array): number {
  if (frame.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

function concat(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export function createVad(opts: VadOptions): Vad {
  const threshold = opts.threshold ?? THRESHOLD;
  const silenceMs = opts.silenceMs ?? SILENCE_MS;
  const minSpeechMs = opts.minSpeechMs ?? MIN_SPEECH_MS;
  const preRollMs = opts.preRollMs ?? PRE_ROLL_MS;
  const startMs = opts.startMs ?? START_MS;
  const msOf = (f: Float32Array) => (f.length / opts.sampleRate) * 1000;

  let muted = false;
  let preRoll: Float32Array[] = []; // recent frames while idle (includes the current voiced run)
  let preRollLen = 0;
  let voicedMs = 0; // current run of voiced frames while idle
  let frames: Float32Array[] | null = null; // utterance in progress
  let speechMs = 0;
  let quietMs = 0;

  const reset = () => {
    preRoll = [];
    preRollLen = 0;
    voicedMs = 0;
    frames = null;
    speechMs = 0;
    quietMs = 0;
  };

  return {
    reset,
    setMuted(m) {
      muted = m;
      reset();
    },
    push(frame) {
      if (muted) return { utterance: null, speaking: false, level: 0 };
      const level = rms(frame);
      const voiced = level >= threshold;
      const dur = msOf(frame);

      if (frames === null) {
        preRoll.push(frame);
        preRollLen += dur;
        while (preRoll.length > 1 && preRollLen - msOf(preRoll[0]) >= preRollMs + voicedMs) {
          preRollLen -= msOf(preRoll.shift()!);
        }
        voicedMs = voiced ? voicedMs + dur : 0;
        if (voicedMs >= startMs) {
          frames = preRoll;
          speechMs = voicedMs;
          quietMs = 0;
          preRoll = [];
          preRollLen = 0;
          voicedMs = 0;
        }
        return { utterance: null, speaking: frames !== null, level };
      }

      frames.push(frame);
      if (voiced) {
        speechMs += dur;
        quietMs = 0;
      } else {
        quietMs += dur;
      }
      if (quietMs < silenceMs) return { utterance: null, speaking: true, level };

      const done = speechMs >= minSpeechMs ? concat(frames) : null;
      reset();
      return { utterance: done, speaking: false, level };
    },
  };
}
