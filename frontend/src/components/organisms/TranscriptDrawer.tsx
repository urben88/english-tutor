import type { Id, Message } from "../../api/types";
import { Button } from "../atoms/Button";
import type { MessageActions } from "../molecules/MessageBubble";
import { MessageList } from "./MessageList";

interface Props extends MessageActions {
  messages: Message[];
  highlightId?: Id | null;
  onClose: () => void;
}

/** Left slide-in with the full conversation. Mounted only while open. */
export function TranscriptDrawer({ messages, highlightId, onClose, ...actions }: Props) {
  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" aria-label="Transcript">
        <div className="panel-head">
          <h2>Transcript</h2>
          <Button onClick={onClose} aria-label="Close transcript">
            Close
          </Button>
        </div>
        <MessageList messages={messages} highlightId={highlightId} {...actions} />
      </aside>
    </>
  );
}
