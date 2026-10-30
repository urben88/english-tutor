import { useRef, useState } from "react";
import type { Message } from "../../api/types";
import { cleanWord, tokenize } from "../../text/tokenize";
import { Button } from "../atoms/Button";
import { Word } from "../atoms/Word";

interface Props {
  message: Message;
  /** `text` is the word or phrase; the message content is the context. */
  onExplain: (text: string, context: string) => void;
  /** `caption` = large subtitle style without the role label. */
  variant?: "bubble" | "caption";
}

export function MessageBubble({ message, onExplain, variant = "bubble" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [phrase, setPhrase] = useState<string | null>(null);

  const readSelection = () => {
    const sel = window.getSelection();
    const root = ref.current;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !root) return setPhrase(null);
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return setPhrase(null);
    const text = cleanWord(sel.toString().replace(/\s+/g, " ").trim());
    setPhrase(text || null);
  };

  return (
    <div
      className={variant === "caption" ? "caption" : `bubble bubble-${message.role}`}
      ref={ref}
      onMouseUp={readSelection}
    >
      {variant === "bubble" && <div className="bubble-role">{message.role === "user" ? "You" : "Tutor"}</div>}
      <p className="bubble-text">
        {tokenize(message.content).map((t, i) =>
          t.isWord ? (
            <Word key={i} text={t.text} onSelect={(w) => onExplain(cleanWord(w), message.content)} />
          ) : (
            <span key={i}>{t.text}</span>
          ),
        )}
      </p>
      {phrase && (
        <Button
          className="explain-btn"
          onMouseDown={(e) => e.preventDefault()} // keep the selection
          onClick={() => {
            onExplain(phrase, message.content);
            setPhrase(null);
            window.getSelection()?.removeAllRanges();
          }}
        >
          Explain
        </Button>
      )}
    </div>
  );
}
