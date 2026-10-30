import { useEffect, useRef, type MutableRefObject } from "react";
import type { VoiceMode } from "../../hooks/useVoiceMode";
import { Icon } from "../atoms/Icon";
import type { VoiceStatus } from "./StatusIndicator";

type OrbState = "idle" | "listening" | "thinking" | "speaking" | "muted";

const toOrbState = (s: VoiceStatus): OrbState => (s === "hearing" || s === "listening" ? "listening" : s);

interface Props {
  mode: VoiceMode;
  status: VoiceStatus;
  muted: boolean;
  /** Hold-to-talk mode: the orb is the talk button and is inert while the tutor works or the mic is muted. */
  disabled?: boolean;
  /** Live mic level (raw RMS 0..1), written by the audio hook every frame without re-rendering. */
  levelRef: MutableRefObject<number>;
  onToggleMute: () => void;
  onPress: () => void;
  onRelease: () => void;
}

const HOLD_NAME: Record<OrbState, string> = {
  idle: "Hold to talk (or hold Space)",
  listening: "Listening… release to send",
  thinking: "Thinking…",
  speaking: "Hold to talk (or hold Space)",
  muted: "Hold to talk (or hold Space)",
};

/**
 * The voice ball. Hands-free: tap (or M) mutes the microphone. Hold-to-talk: hold (or Space) to speak.
 * It animates per state in CSS (breathing, level-reactive halo, swirl, pulse, dimmed + slash); the mic level
 * reaches it as the `--orb-level` CSS variable, updated from a ref in an animation frame loop.
 */
export function VoiceOrb({ mode, status, muted, disabled, levelRef, onToggleMute, onPress, onRelease }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const state = toOrbState(status);
  const hold = mode === "hold";

  useEffect(() => {
    const el = ref.current;
    if (!el || state !== "listening") {
      ref.current?.style.setProperty("--orb-level", "0");
      return;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let shown = 0;
    const tick = () => {
      const target = Math.min(1, levelRef.current * 6);
      shown += (target - shown) * 0.35; // ease so the halo breathes instead of flickering
      el.style.setProperty("--orb-level", shown < 0.01 ? "0" : shown.toFixed(2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, levelRef]);

  const common = {
    ref,
    type: "button" as const,
    className: "voice-orb",
    "data-testid": "voice-orb",
    "data-state": state,
    "data-muted": muted ? "true" : "false",
  };
  const face = (
    <>
      <span className="orb-halo" aria-hidden="true" />
      <span className="orb-swirl" aria-hidden="true" />
      <span className="orb-face" aria-hidden="true">
        <Icon name="mic" size={30} />
        {muted && <Icon name="slash" size={44} />}
      </span>
    </>
  );

  if (hold) {
    const name = HOLD_NAME[state];
    return (
      <button
        {...common}
        aria-label={name}
        title={name}
        disabled={disabled}
        onPointerDown={(e) => {
          e.preventDefault();
          onPress();
        }}
        onPointerUp={onRelease}
        onPointerLeave={onRelease}
        onPointerCancel={onRelease}
        onKeyDown={(e) => {
          if (e.code === "Space") e.preventDefault(); // Space is handled globally
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {face}
      </button>
    );
  }
  const name = muted ? "Unmute (M)" : "Mute (M)";
  return (
    <button {...common} aria-label={name} title={name} aria-pressed={muted} onClick={onToggleMute}>
      {face}
    </button>
  );
}
