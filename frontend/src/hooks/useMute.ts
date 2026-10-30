import { useCallback, useEffect, useState } from "react";
import { isTyping } from "./isTyping";

/** Mute toggle, also bound to the `M` key when focus is not in a text field. */
export function useMute() {
  const [muted, setMuted] = useState(false);
  const toggle = useCallback(() => setMuted((m) => !m), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "KeyM" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(e.target)) return;
      toggle();
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [toggle]);

  return { muted, toggle };
}
