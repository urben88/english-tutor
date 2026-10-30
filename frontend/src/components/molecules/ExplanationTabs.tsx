import { useState, type KeyboardEvent } from "react";

const TABS = ["Translation", "Grammar", "Examples"] as const;
type Tab = (typeof TABS)[number];

interface Props {
  translation: string;
  /** Grammar and use, in Spanish. */
  explanation: string;
  /** English example sentences. */
  examples: string[];
}

/** One explanation split in three tabs, so the user reads only the part they want. */
export function ExplanationTabs({ translation, explanation, examples }: Props) {
  const [tab, setTab] = useState<Tab>("Translation");

  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = TABS[(i + step + TABS.length) % TABS.length];
    setTab(next);
    (e.currentTarget.parentElement?.querySelector(`[data-tab="${next}"]`) as HTMLElement | null)?.focus();
  };

  return (
    <div className="etabs">
      <div role="tablist" aria-label="Explanation parts" className="etabs-list">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            data-tab={t}
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            className="etab"
            onClick={() => setTab(t)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="etab-panel">
        {tab === "Translation" && <p className="translation">{translation}</p>}
        {tab === "Grammar" && <p>{explanation}</p>}
        {tab === "Examples" &&
          (examples.length > 0 ? (
            <ul>
              {examples.map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No examples.</p>
          ))}
      </div>
    </div>
  );
}
