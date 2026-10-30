import { useCallback, useEffect, useState } from "react";
import { isTyping } from "./isTyping";

/** Open/close state of the transcript drawer. `T` toggles it (not while typing), `Esc` closes it. */
export function useDrawer() {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const close = useCallback(() => setOpen(false), []);
  const show = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape") return close();
      if (e.code !== "KeyT" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(e.target)) return;
      toggle();
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [toggle, close]);

  return { open, toggle, close, show };
}
