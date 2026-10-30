import { useState, type ReactNode } from "react";
import type { StudyItem } from "../../api/types";
import { SLOW } from "../../hooks/useStudy";
import { Button } from "../atoms/Button";
import { IconButton } from "../atoms/IconButton";
import { ExplanationTabs } from "../molecules/ExplanationTabs";

interface Props {
  items: StudyItem[];
  onPlay: (item: StudyItem, speed: number) => void;
  onExplain: (item: StudyItem) => void;
  onJump: (item: StudyItem) => void;
  onDelete: (item: StudyItem) => void;
  /** Current word and explanation, shown above the list. */
  children?: ReactNode;
}

/** Right panel: current word/explanation + the words studied so far. */
export function StudyPanel({ items, onPlay, onExplain, onJump, onDelete, children }: Props) {
  return (
    <aside className="panel study" aria-label="Study">
      <h2>Study</h2>
      {children}
      <h3 className="study-title">Studied words</h3>
      {items.length === 0 ? (
        <p className="muted">Words you study will appear here.</p>
      ) : (
        <ul className="study-list">
          {items.map((it) => (
            <li key={it.id} className="study-item">
              <div className="study-head">
                <strong>{it.text}</strong>
                {it.translation && <span className="muted"> {it.translation}</span>}
              </div>
              <div className="actions">
                <Button aria-label={`Play ${it.text}`} onClick={() => onPlay(it, 1)}>
                  Play
                </Button>
                <Button aria-label={`Play ${it.text} slowly`} onClick={() => onPlay(it, SLOW)}>
                  Slow
                </Button>
                <Button aria-label={`Explain ${it.text} again`} onClick={() => onExplain(it)}>
                  Explain
                </Button>
                <IconButton icon="trash" label={`Delete ${it.text}`} onClick={() => onDelete(it)} />
                {it.message_id != null && (
                  <Button aria-label={`Go to message of ${it.text}`} onClick={() => onJump(it)}>
                    Go to message
                  </Button>
                )}
              </div>
              {it.explanation && <SavedExplanation item={it} />}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

/** The explanation saved with an item, hidden until asked for. */
function SavedExplanation({ item }: { item: StudyItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="saved">
      <Button aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} explanation of ${item.text}`} onClick={() => setOpen(!open)}>
        {open ? "Hide explanation" : "Show explanation"}
      </Button>
      {open && <ExplanationTabs translation={item.translation} explanation={item.explanation} examples={item.examples} />}
    </div>
  );
}
