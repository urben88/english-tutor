import { useState } from "react";
import { Button } from "../atoms/Button";

interface Props {
  disabled?: boolean;
  onSend: (text: string) => void;
}

export function TextComposer({ disabled, onSend }: Props) {
  const [text, setText] = useState("");
  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend(text);
        setText("");
      }}
    >
      <input
        type="text"
        value={text}
        placeholder="Or type a message…"
        aria-label="Message"
        onChange={(e) => setText(e.target.value)}
      />
      <Button type="submit" disabled={disabled || !text.trim()}>
        Send
      </Button>
    </form>
  );
}
