import type { ReactNode } from "react";
import type { StudyItem } from "../../api/types";

interface Props {
  items: StudyItem[];
  /** Current explanation, shown above the list. */
  children?: ReactNode;
}

/** Right panel: current explanation + studied words. The list is filled in a later task. */
export function StudyPanel({ items, children }: Props) {
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
            <li key={it.id}>
              <strong>{it.text}</strong>
              {it.translation && <span className="muted"> {it.translation}</span>}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
