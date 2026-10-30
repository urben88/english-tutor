import type { ExplainState } from "../../hooks/useExplain";
import { Button } from "../atoms/Button";
import { ExplanationView } from "../molecules/ExplanationView";

interface Props {
  state: ExplainState;
  onClose: () => void;
}

export function ExplanationPanel({ state, onClose }: Props) {
  return (
    <aside className="panel" aria-label="Explanation">
      <div className="panel-head">
        <h2>Explanation</h2>
        {state.status !== "idle" && <Button onClick={onClose}>Close</Button>}
      </div>
      <ExplanationView state={state} />
    </aside>
  );
}
