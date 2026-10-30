import { useCallback, useRef, useState } from "react";
import type { TutorApi } from "../api/client";
import type { Explanation } from "../api/types";

export type ExplainState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "error"; query: string; message: string }
  | { status: "done"; query: string; result: Explanation };

export function useExplain(api: TutorApi) {
  const [state, setState] = useState<ExplainState>({ status: "idle" });
  const latest = useRef(0);

  const explain = useCallback(
    async (text: string, context: string) => {
      const call = ++latest.current;
      setState({ status: "loading", query: text });
      try {
        const result = await api.explain(text, context);
        if (call === latest.current) setState({ status: "done", query: text, result });
      } catch (e) {
        if (call === latest.current)
          setState({
            status: "error",
            query: text,
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
