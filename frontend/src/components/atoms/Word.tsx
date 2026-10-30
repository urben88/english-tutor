interface Props {
  text: string;
  onSelect: (word: string) => void;
}

/** A clickable word. A span (not a <button>) so mouse text selection still works across words. */
export function Word({ text, onSelect }: Props) {
  return (
    <span
      className="word"
      role="button"
      tabIndex={0}
      onClick={() => {
        // Ignore the click that ends a drag-selection.
        if (window.getSelection()?.isCollapsed === false) return;
        onSelect(text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect(text);
      }}
    >
      {text}
    </span>
  );
}
