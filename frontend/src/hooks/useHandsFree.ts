import { useEffect, useRef, useState } from "react";
import type { Mic } from "../audio/mic";
import { createVad, type Vad } from "../audio/vad";
import { encodeWav } from "../audio/wav";

interface Options {
  mic: Mic;
  /** Mic is open only while enabled (hands-free mode on). */
  enabled: boolean;
  muted: boolean;
  /** True while the tutor is thinking or speaking: the mic ignores everything. */
  paused: boolean;
  /** Called with each finished utterance as a WAV. */
  onAudio: (wav: Blob) => Promise<void>;
  onError: (message: string) => void;
}

const MIC_ERROR = "Could not access the microphone. You can still type your message.";

/** Hands-free listening: one open mic stream, VAD splits it into utterances. */
export function useHandsFree({ mic, enabled, muted, paused, onAudio, onError }: Options) {
  const [hearing, setHearing] = useState(false);
  const [level, setLevel] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  /** Raw mic level, updated on every audio frame without re-rendering (the orb animates from it). */
  const levelRef = useRef(0);

  const vad = useRef<Vad | null>(null);
  const deaf = useRef(false); // muted, paused or processing
  const busy = useRef(false);
  const rateRef = useRef(16000);
  const mutedRef = useRef(muted);
  const pausedRef = useRef(paused);
  const latest = useRef({ onAudio, onError });
  latest.current = { onAudio, onError };

  const applyDeaf = () => {
    deaf.current = mutedRef.current || pausedRef.current || busy.current;
    vad.current?.setMuted(deaf.current);
    if (deaf.current) {
      setHearing(false);
      setLevel(0);
      levelRef.current = 0;
    }
  };

  useEffect(() => {
    mutedRef.current = muted;
    pausedRef.current = paused;
    applyDeaf();
  }, [muted, paused]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setMicError(null);

    mic
      .start((frame) => {
        const v = vad.current;
        if (!v || deaf.current) return;
        const r = v.push(frame);
        levelRef.current = r.level;
        setLevel(Math.round(r.level * 120) / 120); // coarse steps: no re-render per audio frame
        setHearing(r.speaking);
        if (!r.utterance) return;
        const samples = r.utterance;
        const sampleRate = rateRef.current;
        busy.current = true;
        setProcessing(true);
        applyDeaf();
        void (async () => {
          try {
            const wav = new Blob([encodeWav(samples, sampleRate)], { type: "audio/wav" });
            await latest.current.onAudio(wav);
          } catch (e) {
            latest.current.onError(e instanceof Error ? e.message : "Something went wrong.");
          } finally {
            busy.current = false;
            setProcessing(false);
            applyDeaf();
          }
        })();
      })
      .then((sampleRate) => {
        if (cancelled) {
          mic.stop();
          return;
        }
        rateRef.current = sampleRate;
        vad.current = createVad({ sampleRate });
        applyDeaf();
      })
      .catch(() => {
        if (cancelled) return;
        setMicError(MIC_ERROR);
        latest.current.onError(MIC_ERROR);
      });

    // Release the mic when the page unloads.
    const unload = () => mic.stop();
    window.addEventListener("pagehide", unload);
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", unload);
      vad.current = null;
      busy.current = false;
      mic.stop();
      setHearing(false);
      setLevel(0);
      levelRef.current = 0;
      setProcessing(false);
    };
  }, [mic, enabled]);

  return { hearing, level, levelRef, processing, micError };
}
