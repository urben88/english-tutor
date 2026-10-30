interface Props {
  /** Raw RMS level (0..1). */
  level: number;
  active: boolean;
}

/** Live microphone level bar. */
export function LevelMeter({ level, active }: Props) {
  const value = active ? Math.min(1, level * 6) : 0;
  return (
    <div
      className="meter"
      role="meter"
      aria-label="Microphone level"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Number(value.toFixed(2))}
    >
      <span style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}
