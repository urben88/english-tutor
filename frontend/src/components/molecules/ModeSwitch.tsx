import type { VoiceMode } from "../../hooks/useVoiceMode";

interface Props {
  mode: VoiceMode;
  onChange: (mode: VoiceMode) => void;
}

const OPTIONS: { value: VoiceMode; label: string }[] = [
  { value: "hands-free", label: "Hands-free" },
  { value: "hold", label: "Hold to talk" },
];

export function ModeSwitch({ mode, onChange }: Props) {
  return (
    <div className="mode-switch" role="radiogroup" aria-label="Voice mode">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={mode === o.value}
          className={`btn ${mode === o.value ? "btn-on" : ""}`.trim()}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
