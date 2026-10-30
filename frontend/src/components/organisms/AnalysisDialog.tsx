import type { AnalysisState } from "../../hooks/useAnalysis";
import { Button } from "../atoms/Button";
import { Dialog } from "../atoms/Dialog";

interface Props {
  state: Exclude<AnalysisState, { status: "idle" }>;
  onClose: () => void;
}

/** Popup with the structure of a sentence: each word or chunk with translation, explanation, part of speech and tense. */
export default function AnalysisDialog({ state, onClose }: Props) {
  return (
    <Dialog title="Sentence analysis" onClose={onClose}>
      <p className="analysis-sentence">{state.text}</p>
      {state.status === "loading" && (
        <p role="status" className="muted">
          Analyzing…
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="error">
          {state.message}
        </p>
      )}
      {state.status === "done" && (
        <div className="analysis">
          <p className="analysis-structure">{state.result.structure}</p>
          <ul className="analysis-tokens">
            {state.result.tokens.map((t, i) => (
              <li key={i} className="analysis-token">
                <div className="analysis-head">
                  <strong className="analysis-word">{t.text}</strong>
                  <span className="analysis-translation">{t.translation}</span>
                  <span className="chip">{t.part_of_speech}</span>
                  {t.tense && (
                    <span className="chip chip-tense">
                      <span className="chip-label">Tense</span> <span>{t.tense}</span>
                    </span>
                  )}
                </div>
                <p className="analysis-explanation">{t.explanation}</p>
                {t.notes && <p className="analysis-notes muted">{t.notes}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="dialog-actions">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Dialog>
  );
}
