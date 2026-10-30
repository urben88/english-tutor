import type { Message } from "../../api/types";
import { Button } from "../atoms/Button";
import { MessageList } from "./MessageList";

interface Props {
  messages: Message[];
  onExplain: (text: string, context: string) => void;
  onClose: () => void;
}

/** Left slide-in with the full conversation. Mounted only while open. */
export function TranscriptDrawer({ messages, onExplain, onClose }: Props) {
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
        <MessageList messages={messages} onExplain={onExplain} />
      </aside>
    </>
  );
}
