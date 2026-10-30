import { Button } from "../atoms/Button";
import { Dialog } from "../atoms/Dialog";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Destructive-action confirmation. Focus starts on Cancel, the safe choice. */
export function ConfirmDialog({ title, message, confirmLabel = "Delete", onConfirm, onCancel }: Props) {
  return (
    <Dialog title={title} role="alertdialog" onClose={onCancel}>
      <p className="dialog-text">{message}</p>
      <div className="dialog-actions">
        <Button data-autofocus onClick={onCancel}>
          Cancel
        </Button>
        <Button className="btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
