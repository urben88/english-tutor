import type { ExplainState } from "../../hooks/useExplain";
import { Button } from "../atoms/Button";
import { ExplanationView } from "../molecules/ExplanationView";

interface Props {
  state: ExplainState;
  onClose: () => void;
}

export function ExplanationPanel({ state, onClose }: Props) {
  return (
    <section className="explain-card" aria-label="Explanation">
      <div className="panel-head">
        <h3>Explanation</h3>
        {state.status !== "idle" && <Button onClick={onClose}>Close</Button>}
      </div>
      <ExplanationView state={state} />
    </section>
  );
}
