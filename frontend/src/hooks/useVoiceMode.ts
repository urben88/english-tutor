import { useCallback, useState } from "react";

export type VoiceMode = "hands-free" | "hold";

const KEY = "voiceMode";

function load(): VoiceMode {
  try {
    return localStorage.getItem(KEY) === "hold" ? "hold" : "hands-free";
  } catch {
    return "hands-free";
  }
}

/** Voice mode, remembered in localStorage (hands-free by default). */
export function useVoiceMode() {
  const [mode, setModeState] = useState<VoiceMode>(load);
  const setMode = useCallback((m: VoiceMode) => {
    setModeState(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* storage unavailable: the choice just is not remembered */
    }
  }, []);
  return { mode, setMode };
}
