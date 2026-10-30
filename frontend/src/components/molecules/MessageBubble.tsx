import { useRef, useState } from "react";
import type { Message } from "../../api/types";
import { cleanWord, tokenize } from "../../text/tokenize";
import { Button } from "../atoms/Button";
import { IconButton } from "../atoms/IconButton";
import { Word } from "../atoms/Word";

export interface MessageActions {
  /** Say a word or phrase of the message out loud (clicking a word does this). */
  onListen: (text: string, message: Message) => void;
  /** Explain a word, a phrase or (tutor messages) the whole message. */
  onExplain: (text: string, message: Message, simpler?: boolean) => void;
  /** Replay the speech of a whole message. */
  onReadAgain: (message: Message) => void;
  /** Open the sentence structure popup for a whole message. */
  onAnalyze: (message: Message) => void;
}

interface Props extends MessageActions {
  message: Message;
  /** `caption` = large subtitle style without the role label. */
  variant?: "bubble" | "caption";
  /** The study list jumped here: show it. */
  highlighted?: boolean;
}

export function MessageBubble({ message, variant = "bubble", highlighted, onListen, onExplain, onReadAgain, onAnalyze }: Props) {
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

  const withPhrase = (act: (text: string) => void) => () => {
    if (!phrase) return;
    act(phrase);
    setPhrase(null);
    window.getSelection()?.removeAllRanges();
  };
  const keepSelection = (e: { preventDefault: () => void }) => e.preventDefault();

  const base = variant === "caption" ? "caption" : `bubble bubble-${message.role}`;
  return (
    <div
      className={highlighted ? `${base} highlight` : base}
      ref={ref}
      onMouseUp={readSelection}
      data-message-id={variant === "bubble" ? String(message.id) : undefined}
    >
      {variant === "bubble" && <div className="bubble-role">{message.role === "user" ? "You" : "Tutor"}</div>}
      <p className="bubble-text">
        {tokenize(message.content).map((t, i) =>
          t.isWord ? (
            <Word key={i} text={t.text} onSelect={(w) => onListen(cleanWord(w), message)} />
          ) : (
            <span key={i}>{t.text}</span>
          ),
        )}
      </p>
      {phrase && (
        <div className="phrase-actions">
          <Button
            className="explain-btn"
            onMouseDown={keepSelection} // keep the selection
            onClick={withPhrase((p) => onListen(p, message))}
          >
            Listen
          </Button>
          <Button
            className="explain-btn"
            onMouseDown={keepSelection}
            onClick={withPhrase((p) => onExplain(p, message))}
          >
            Explain
          </Button>
        </div>
      )}
      {message.role === "assistant" && (
        <div className="message-actions">
          <IconButton className="explain-btn" icon="speaker" label="Read again" onClick={() => onReadAgain(message)} />
          <IconButton className="explain-btn" icon="bulb" label="Explain again" onClick={() => onExplain(message.content, message)} />
          <IconButton
            className="explain-btn"
            icon="simpler"
            label="Explain simpler"
            onClick={() => onExplain(message.content, message, true)}
          />
          <IconButton className="explain-btn" icon="analyze" label="Analyze" onClick={() => onAnalyze(message)} />
        </div>
      )}
    </div>
  );
}
