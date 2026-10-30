import type { ReactNode } from "react";
import type { VoiceStatus } from "../molecules/StatusIndicator";

export type CharacterState = "idle" | "listening" | "thinking" | "speaking";

/** Maps the voice status to what the character should be doing. */
export function toCharacterState(status: VoiceStatus): CharacterState {
  switch (status) {
    case "listening":
    case "hearing":
      return "listening";
    case "thinking":
    case "speaking":
      return status;
    default:
      return "idle";
  }
}

/** CSS orb shown while the 3D tutor loads, or when WebGL is missing. */
export function StagePlaceholder() {
  return (
    <div className="orb" data-testid="character-placeholder" aria-hidden="true">
      <span className="orb-core" />
    </div>
  );
}

interface Props {
  state: CharacterState;
  /** Mount point for the 3D model: children replace the placeholder. */
  children?: ReactNode;
}

/** Center stage. `data-state` mirrors `state` so any renderer (CSS, canvas, 3D) can react to it. */
export function CharacterStage({ state, children }: Props) {
  return (
    <div className="stage stage-classroom" data-testid="character-stage" data-state={state}>
      <div className="stage-mount" id="character-mount" data-testid="character-mount">
        {children ?? <StagePlaceholder />}
      </div>
    </div>
  );
}
