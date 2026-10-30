import { useEffect, useRef } from "react";
import type { Message } from "../../api/types";
import { MessageBubble } from "../molecules/MessageBubble";

interface Props {
  messages: Message[];
  onExplain: (text: string, context: string) => void;
}

export function MessageList({ messages, onExplain }: Props) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "end" });
  }, [messages]);
  return (
    <div className="messages" aria-live="polite">
      {messages.length === 0 && <p className="muted">Say hello to start the conversation.</p>}
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} onExplain={onExplain} />
      ))}
      <div ref={end} />
    </div>
  );
}
