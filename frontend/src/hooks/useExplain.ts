import { useCallback, useRef, useState } from "react";
import type { TutorApi } from "../api/client";
import type { Explanation, StudyTarget } from "../api/types";

export type ExplainState =
  | { status: "idle" }
  | { status: "loading"; target: StudyTarget }
  | { status: "error"; target: StudyTarget; message: string }
  | { status: "done"; target: StudyTarget; result: Explanation };

/** Explains a word or phrase. `onDone` runs for each successful explanation (to save it). */
export function useExplain(api: TutorApi, onDone?: (target: StudyTarget, result: Explanation) => void) {
  const [state, setState] = useState<ExplainState>({ status: "idle" });
  const latest = useRef(0);
  const done = useRef(onDone);
  done.current = onDone;

  const explain = useCallback(
    async (target: StudyTarget, simpler = false) => {
      const call = ++latest.current;
      setState({ status: "loading", target });
      try {
        const result = simpler
          ? await api.explain(target.text, target.context, true)
          : await api.explain(target.text, target.context);
        if (call !== latest.current) return;
        setState({ status: "done", target, result });
        done.current?.(target, result);
      } catch (e) {
        if (call === latest.current)
          setState({
            status: "error",
            target,
            message: e instanceof Error ? e.message : "Could not get an explanation.",
          });
      }
    },
    [api],
  );

  const close = useCallback(() => {
    latest.current++;
    setState({ status: "idle" });
  }, []);

  return { state, explain, close };
}
