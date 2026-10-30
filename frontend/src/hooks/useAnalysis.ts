import { useCallback, useRef, useState } from "react";
import type { TutorApi } from "../api/client";
import type { Analysis, Id } from "../api/types";

export type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; text: string }
  | { status: "error"; text: string; message: string }
  | { status: "done"; text: string; result: Analysis };

/** Sentence structure analysis for the popup. A newer request or `close` discards a pending answer. */
export function useAnalysis(api: TutorApi) {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const latest = useRef(0);

  const analyze = useCallback(
    async (text: string, messageId?: Id) => {
      const call = ++latest.current;
      setState({ status: "loading", text });
      try {
        const result = await api.analyze(text, messageId);
        if (call === latest.current) setState({ status: "done", text, result });
      } catch (e) {
        if (call === latest.current)
          setState({ status: "error", text, message: e instanceof Error ? e.message : "Could not analyze the sentence." });
      }
    },
    [api],
  );

  const close = useCallback(() => {
    latest.current++;
    setState({ status: "idle" });
  }, []);

  return { state, analyze, close };
}
