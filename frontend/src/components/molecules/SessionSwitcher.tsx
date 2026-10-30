import { useState } from "react";
import type { Id, SessionSummary } from "../../api/types";
import { Button } from "../atoms/Button";
import { IconButton } from "../atoms/IconButton";
import { NewSessionDialog } from "./NewSessionDialog";

interface Props {
  sessions: SessionSummary[];
  current: Id | null;
  onSelect: (id: Id) => void;
  onNew: (role: string) => void;
  onDelete: (session: SessionSummary) => void;
}

const label = (s: SessionSummary) => {
  const d = new Date(s.updated_at);
  const when = Number.isNaN(d.getTime()) ? `#${s.id}` : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  return `${s.role ? `${s.role} · ` : ""}${when} · ${s.message_count} msgs`;
};

export function SessionSwitcher({ sessions, current, onSelect, onNew, onDelete }: Props) {
  const [creating, setCreating] = useState(false);
  const active = sessions.find((s) => String(s.id) === String(current));
  return (
    <div className="sessions">
      {active?.role && (
        <span className="session-role" data-testid="session-role" title="Role of this session">
          {active.role}
        </span>
      )}
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
      <IconButton icon="trash" label="Delete session" disabled={!active} onClick={() => active && onDelete(active)} />
      <Button onClick={() => setCreating(true)}>New session</Button>
      {creating && (
        <NewSessionDialog
          onCancel={() => setCreating(false)}
          onStart={(role) => {
            setCreating(false);
            onNew(role);
          }}
        />
      )}
    </div>
  );
}
