import type { StudyTarget } from "../../api/types";
import type { ExplainState } from "../../hooks/useExplain";
import { SLOW } from "../../hooks/useStudy";
import { Button } from "../atoms/Button";
import { ExplanationTabs } from "../molecules/ExplanationTabs";

interface Props {
  state: ExplainState;
  /** The word the user just listened to (shown while there is no explanation). */
  focus: StudyTarget | null;
  onPlay: (target: StudyTarget, speed: number) => void;
  onExplain: (target: StudyTarget, simpler?: boolean) => void;
  onClose: () => void;
}

export function ExplanationPanel({ state, focus, onPlay, onExplain, onClose }: Props) {
  const target = state.status !== "idle" ? state.target : focus;
  return (
    <section className="explain-card" aria-label="Explanation">
      <div className="panel-head">
        <h3>Explanation</h3>
        {target && <Button onClick={onClose}>Close</Button>}
      </div>
      {!target ? (
        <p className="muted">Click a word to hear it, or select a phrase and press “Listen”.</p>
      ) : (
        <div className="explanation">
          <h3>{target.text}</h3>
          <div className="actions">
            <Button aria-label="Play pronunciation" onClick={() => onPlay(target, 1)}>
              Play
            </Button>
            <Button aria-label="Play slowly" onClick={() => onPlay(target, SLOW)}>
              Slow
            </Button>
            {state.status === "idle" && <Button onClick={() => onExplain(target)}>Explain this</Button>}
          </div>
          {state.status === "loading" && (
            <p role="status" className="muted">
              Explaining “{target.text}”…
            </p>
          )}
          {state.status === "error" && (
            <p role="alert" className="error">
              Could not explain “{target.text}”: {state.message}
            </p>
          )}
          {state.status === "done" && (
            <ExplanationTabs
              key={`${state.target.text}|${state.result.translation}|${state.result.explanation}`}
              translation={state.result.translation}
              explanation={state.result.explanation}
              examples={state.result.examples}
            />
          )}
          {(state.status === "done" || state.status === "error") && (
            <div className="actions">
              <Button onClick={() => onExplain(target)}>Explain again</Button>
              <Button onClick={() => onExplain(target, true)}>Explain simpler</Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
