import { memo, type RefObject } from "react";
import { ConversationalAssistantView } from "../../../../3d/conversational-assistant/src/react";
import type { ConversationalAssistant, ElementConfig } from "../../../../3d/conversational-assistant/src/types";
import assistantConfig from "../../../../3d/conversational-assistant/config/element.config.json";
import assistantModelUrl from "../../../../3d/conversational-assistant/assets/models/conversational-assistant.glb?url";
import type { CharacterState } from "./CharacterStage";

const avatarConfig = assistantConfig as unknown as ElementConfig; // module scope: stable reference, no remounts

interface Props {
  state: CharacterState;
  avatarRef: RefObject<ConversationalAssistant | null>;
  onError: () => void;
}

/** The 3D tutor. Loaded lazily (App) so `three` stays out of the initial bundle. */
function Avatar3D({ state, avatarRef, onError }: Props) {
  return (
    <ConversationalAssistantView
      ref={avatarRef}
      config={avatarConfig}
      modelUrl={assistantModelUrl}
      state={state}
      onError={onError}
    />
  );
}

export default memo(Avatar3D);
