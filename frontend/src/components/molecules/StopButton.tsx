import { Button } from "../atoms/Button";

interface Props {
  disabled: boolean;
  onStop: () => void;
}

/** Cuts the tutor reply playback. */
export function StopButton({ disabled, onStop }: Props) {
  return (
    <Button disabled={disabled} onClick={onStop}>
      <span aria-hidden="true">■</span> Stop
    </Button>
  );
}
