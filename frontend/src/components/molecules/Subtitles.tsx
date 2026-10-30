import type { Message } from "../../api/types";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
  onExplain: (text: string, context: string) => void;
}

/** Latest exchange as large captions: what you said (plain text) and the reply (clickable words). */
export function Subtitles({ messages, onExplain }: Props) {
  let at = messages.length - 1;
  while (at >= 0 && messages[at].role === "user") at--;
  const reply = at >= 0 ? messages[at] : undefined;
  const lastIsUser = messages.length > 0 && messages[messages.length - 1].role === "user";
  const prev = messages[at - 1];
  const you = lastIsUser ? messages[messages.length - 1] : prev?.role === "user" ? prev : undefined;
  return (
    <section className="subtitles" aria-label="Subtitles" aria-live="polite">
      {you && <p className="you">{you.content}</p>}
      {reply ? (
        <MessageBubble message={reply} onExplain={onExplain} variant="caption" />
      ) : (
        <p className="muted">Say hello to start the conversation.</p>
      )}
    </section>
  );
}
