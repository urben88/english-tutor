import type { TalkState } from "../../hooks/useHoldToTalk";
import { TalkButton } from "../molecules/TalkButton";
import { TextComposer } from "../molecules/TextComposer";

interface Props {
  talkState: TalkState;
  disabled: boolean;
  onPress: () => void;
  onRelease: () => void;
  onSendText: (text: string) => void;
}

export function Controls({ talkState, disabled, onPress, onRelease, onSendText }: Props) {
  return (
    <div className="controls">
      <TalkButton state={talkState} disabled={disabled} onPress={onPress} onRelease={onRelease} />
      <TextComposer disabled={disabled || talkState !== "idle"} onSend={onSendText} />
    </div>
  );
}
