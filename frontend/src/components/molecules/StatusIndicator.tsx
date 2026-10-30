import { LevelMeter } from "../atoms/LevelMeter";

export type VoiceStatus = "idle" | "listening" | "hearing" | "thinking" | "speaking" | "muted";

const VIEW: Record<VoiceStatus, { icon: string; label: string }> = {
  idle: { icon: "●", label: "Ready" },
  listening: { icon: "🎙", label: "Listening" },
  hearing: { icon: "🗣", label: "Hearing you…" },
  thinking: { icon: "⏳", label: "Thinking…" },
  speaking: { icon: "🔊", label: "Speaking" },
  muted: { icon: "🔇", label: "Muted" },
};

interface Props {
  status: VoiceStatus;
  level: number;
  showMeter: boolean;
}

/** Always-visible state of the conversation, announced to screen readers. */
export function StatusIndicator({ status, level, showMeter }: Props) {
  const { icon, label } = VIEW[status];
  return (
    <div className={`status status-${status}`} data-status={status}>
      <span role="status" aria-live="polite">
        <span aria-hidden="true" className="status-icon">
          {icon}
        </span>{" "}
        {label}
      </span>
      {showMeter && <LevelMeter level={level} active={status === "listening" || status === "hearing"} />}
    </div>
  );
}
