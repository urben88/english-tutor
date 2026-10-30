import type { TalkState } from "../../hooks/useHoldToTalk";

interface Props {
  state: TalkState;
  disabled?: boolean;
  onPress: () => void;
  onRelease: () => void;
}

const LABEL: Record<TalkState, string> = {
  idle: "Hold to talk (or hold Space)",
  listening: "Listening… release to send",
  thinking: "Thinking…",
};

export function TalkButton({ state, disabled, onPress, onRelease }: Props) {
  return (
    <button
      type="button"
      className={`talk talk-${state}`}
      data-state={state}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
      onPointerCancel={onRelease}
      onKeyDown={(e) => {
        if (e.code === "Space") e.preventDefault(); // Space is handled globally
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {LABEL[state]}
    </button>
  );
}
