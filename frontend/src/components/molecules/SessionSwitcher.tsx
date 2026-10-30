import type { Id, SessionSummary } from "../../api/types";
import { Button } from "../atoms/Button";

interface Props {
  sessions: SessionSummary[];
  current: Id | null;
  onSelect: (id: Id) => void;
  onNew: () => void;
}

const label = (s: SessionSummary) => {
  const d = new Date(s.updated_at);
  const when = Number.isNaN(d.getTime()) ? `#${s.id}` : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  return `${when} · ${s.message_count} msgs`;
};

export function SessionSwitcher({ sessions, current, onSelect, onNew }: Props) {
  return (
    <div className="sessions">
      {sessions.length > 0 && (
        <select
          aria-label="Session"
          value={current === null ? "" : String(current)}
          onChange={(e) => {
            const found = sessions.find((s) => String(s.id) === e.target.value);
            if (found) onSelect(found.id);
          }}
        >
          {sessions.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {label(s)}
            </option>
          ))}
        </select>
      )}
      <Button onClick={onNew}>New session</Button>
    </div>
  );
}
