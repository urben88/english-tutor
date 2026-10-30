import { useState } from "react";
import { MAX_ROLE_LENGTH } from "../../api/types";
import { Button } from "../atoms/Button";
import { Dialog } from "../atoms/Dialog";

interface Props {
  onStart: (role: string) => void;
  onCancel: () => void;
}

/** New session with an optional free-text role/topic ("waiter at a restaurant", "job interview"). */
export function NewSessionDialog({ onStart, onCancel }: Props) {
  const [role, setRole] = useState("");
  return (
    <Dialog title="New session" onClose={onCancel}>
      <form
        className="dialog-form"
        onSubmit={(e) => {
          e.preventDefault();
          onStart(role.trim());
        }}
      >
        <label className="field">
          <span>Role or topic (optional)</span>
          <input
            type="text"
            value={role}
            maxLength={MAX_ROLE_LENGTH}
            placeholder="e.g. waiter at a restaurant, job interview"
            onChange={(e) => setRole(e.target.value)}
          />
          <small className="muted">
            {role.length}/{MAX_ROLE_LENGTH} · the tutor plays or teaches this for the whole session
          </small>
        </label>
        <div className="dialog-actions">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="btn-on">
            Start
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
