import { useCallback, useEffect, useRef, useState } from "react";
import { encodeWav } from "../audio/wav";
import type { Recorder } from "../audio/recorder";
import { isTyping } from "./isTyping";

export type TalkState = "idle" | "listening" | "thinking";

export const MIN_PRESS_MS = 300;

interface Options {
  recorder: Recorder;
  /** Called with the encoded WAV; the state stays "thinking" until it settles. */
  onAudio: (wav: Blob) => Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
  /** Muting while recording drops the recording: nothing is sent. */
  muted?: boolean;
}

export function useHoldToTalk({ recorder, onAudio, onError, disabled = false, muted = false }: Options) {
  const [state, setState] = useState<TalkState>("idle");
  const phase = useRef<TalkState>("idle");
  const startedAt = useRef(0);
  const starting = useRef<Promise<void> | null>(null);
  const latest = useRef({ onAudio, onError });
  latest.current = { onAudio, onError };

  const set = (s: TalkState) => {
    phase.current = s;
    setState(s);
  };

  const press = useCallback(() => {
    if (disabled || phase.current !== "idle") return;
    startedAt.current = performance.now();
    set("listening");
    starting.current = recorder.start().catch((e: unknown) => {
      set("idle");
      latest.current.onError(e instanceof Error ? e.message : "Could not access the microphone.");
      throw e;
    });
  }, [recorder, disabled]);

  const release = useCallback(async () => {
    if (phase.current !== "listening") return;
    const held = performance.now() - startedAt.current;
    try {
      await starting.current;
    } catch {
      return; // start failed; error already reported
    }
    if (held < MIN_PRESS_MS) {
      set("idle");
      await recorder.cancel();
      return;
    }
    set("thinking");
    try {
      const { samples, sampleRate } = await recorder.stop();
      const wav = new Blob([encodeWav(samples, sampleRate)], { type: "audio/wav" });
      await latest.current.onAudio(wav);
    } catch (e) {
      latest.current.onError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      set("idle");
    }
  }, [recorder]);

  useEffect(() => {
    if (!muted || phase.current !== "listening") return;
    set("idle");
    void starting.current?.then(() => recorder.cancel()).catch(() => {});
  }, [muted, recorder]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTyping(e.target)) return;
      e.preventDefault();
      if (!e.repeat) press();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTyping(e.target)) return;
      e.preventDefault();
      void release();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [press, release]);

  return { state, press, release };
}
