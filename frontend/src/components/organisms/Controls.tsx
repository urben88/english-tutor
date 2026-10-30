import type { TalkState } from "../../hooks/useHoldToTalk";
import type { VoiceMode } from "../../hooks/useVoiceMode";
import { MuteButton } from "../molecules/MuteButton";
import { StatusIndicator, type VoiceStatus } from "../molecules/StatusIndicator";
import { StopButton } from "../molecules/StopButton";
import { TalkButton } from "../molecules/TalkButton";
import { TextComposer } from "../molecules/TextComposer";

interface Props {
  mode: VoiceMode;
  status: VoiceStatus;
  level: number;
  muted: boolean;
  canStop: boolean;
  micError: string | null;
  talkState: TalkState;
  disabled: boolean;
  onToggleMute: () => void;
  onStop: () => void;
  onPress: () => void;
  onRelease: () => void;
  onSendText: (text: string) => void;
}

export function Controls(p: Props) {
  const handsFree = p.mode === "hands-free";
  return (
    <div className="controls">
      <div className="controls-bar">
        <StatusIndicator status={p.status} level={p.level} showMeter={handsFree && !p.micError} />
        <div className="controls-actions">
          <MuteButton muted={p.muted} onToggle={p.onToggleMute} />
          <StopButton disabled={!p.canStop} onStop={p.onStop} />
        </div>
      </div>
      {p.micError && (
        <p className="error banner" role="alert">
          {p.micError}
        </p>
      )}
      {!handsFree && (
        <TalkButton
          state={p.talkState}
          disabled={p.disabled || p.muted}
          onPress={p.onPress}
          onRelease={p.onRelease}
        />
      )}
      <TextComposer disabled={p.disabled || p.talkState !== "idle"} onSend={p.onSendText} />
    </div>
  );
}
