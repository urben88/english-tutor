import type { MutableRefObject } from "react";
import type { VoiceMode } from "../../hooks/useVoiceMode";
import { MuteButton } from "../molecules/MuteButton";
import { StatusIndicator, type VoiceStatus } from "../molecules/StatusIndicator";
import { StopButton } from "../molecules/StopButton";
import { TextComposer } from "../molecules/TextComposer";
import { VoiceOrb } from "../molecules/VoiceOrb";
import type { TalkState } from "../../hooks/useHoldToTalk";

interface Props {
  mode: VoiceMode;
  status: VoiceStatus;
  level: number;
  levelRef: MutableRefObject<number>;
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
          {!handsFree && <MuteButton muted={p.muted} onToggle={p.onToggleMute} />}
          <StopButton disabled={!p.canStop} onStop={p.onStop} />
        </div>
      </div>
      {p.micError && (
        <p className="error banner" role="alert">
          {p.micError}
        </p>
      )}
      <div className="orb-row">
        <VoiceOrb
          mode={p.mode}
          status={p.status}
          muted={p.muted}
          disabled={p.disabled || p.muted}
          levelRef={p.levelRef}
          onToggleMute={p.onToggleMute}
          onPress={p.onPress}
          onRelease={p.onRelease}
        />
        <p className="orb-hint muted" aria-hidden="true">
          {handsFree ? (p.muted ? "Tap to unmute" : "Tap to mute") : "Hold to talk"}
        </p>
      </div>
      <TextComposer disabled={p.disabled || p.talkState !== "idle"} onSend={p.onSendText} />
    </div>
  );
}
