import { useEffect, useRef } from "react";
import type { Id, Message } from "../../api/types";
import { MessageBubble, type MessageActions } from "../molecules/MessageBubble";

interface Props extends MessageActions {
  messages: Message[];
  /** A message to scroll to and mark (jump from the study list). */
  highlightId?: Id | null;
}

export function MessageList({ messages, highlightId = null, ...actions }: Props) {
  const list = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target =
      highlightId === null ? null : list.current?.querySelector(`[data-message-id="${String(highlightId)}"]`);
    (target ?? end.current)?.scrollIntoView?.({ block: target ? "center" : "end" });
  }, [messages, highlightId]);
  return (
    <div className="messages" aria-live="polite" ref={list}>
      {messages.length === 0 && <p className="muted">Say hello to start the conversation.</p>}
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} highlighted={highlightId !== null && String(m.id) === String(highlightId)} {...actions} />
      ))}
      <div ref={end} />
    </div>
  );
}
