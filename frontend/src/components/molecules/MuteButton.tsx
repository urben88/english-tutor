import { Button } from "../atoms/Button";

interface Props {
  muted: boolean;
  onToggle: () => void;
}

export function MuteButton({ muted, onToggle }: Props) {
  return (
    <Button className={muted ? "btn-on" : ""} aria-pressed={muted} onClick={onToggle}>
      <span aria-hidden="true">{muted ? "🔇" : "🎙"}</span> {muted ? "Unmute (M)" : "Mute (M)"}
    </Button>
  );
}
