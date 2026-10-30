import type { ExplainState } from "../../hooks/useExplain";

export function ExplanationView({ state }: { state: ExplainState }) {
  switch (state.status) {
    case "idle":
      return <p className="muted">Click a word, or select a phrase and press “Explain”.</p>;
    case "loading":
      return (
        <p role="status" className="muted">
          Explaining “{state.query}”…
        </p>
      );
    case "error":
      return (
        <p role="alert" className="error">
          Could not explain “{state.query}”: {state.message}
        </p>
      );
    case "done":
      return (
        <div className="explanation">
          <h3>{state.result.text}</h3>
          <p className="translation">{state.result.translation}</p>
          <p>{state.result.explanation}</p>
          {state.result.examples.length > 0 && (
            <ul>
              {state.result.examples.map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ul>
          )}
        </div>
      );
  }
}
