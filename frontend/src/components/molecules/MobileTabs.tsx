export type Area = "talk" | "tutor" | "study";

const TABS: { value: Area; label: string }[] = [
  { value: "talk", label: "Talk" },
  { value: "tutor", label: "Tutor" },
  { value: "study", label: "Study" },
];

interface Props {
  area: Area;
  onChange: (area: Area) => void;
}

/** Bottom tab bar, shown on small screens only (CSS). */
export function MobileTabs({ area, onChange }: Props) {
  return (
    <div className="tabbar" role="tablist" aria-label="Areas">
      {TABS.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={area === t.value}
          className="tab"
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
