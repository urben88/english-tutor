import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

interface Props {
  /** Visible title; also the accessible name. */
  title: string;
  /** `alertdialog` for confirmations. */
  role?: "dialog" | "alertdialog";
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog: focus moves in (to `[data-autofocus]` or the first control), Tab wraps inside,
 * Escape and the scrim close it, focus returns to what opened it. Keys do not leak to the global shortcuts.
 */
export function Dialog({ title, role = "dialog", onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = ref.current;
    const first = root?.querySelector<HTMLElement>("[data-autofocus]") ?? root?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? root)?.focus();
    return () => opener?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation(); // M, T, Space and Escape belong to the dialog while it is open
    if (e.key === "Escape") {
      e.preventDefault();
      closeRef.current();
      return;
    }
    if (e.key !== "Tab") return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (items.length === 0) return e.preventDefault();
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : at === items.length - 1 ? 0 : at + 1;
    e.preventDefault();
    items[next].focus();
  };

  return (
    <>
      <div className="scrim dialog-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        className="dialog"
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>
        {children}
      </div>
    </>
  );
}
