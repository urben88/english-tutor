import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createConversationalAssistant } from "./index.js";
import type { AssistantState, ConversationalAssistant, ElementConfig } from "./types.js";

export interface ConversationalAssistantViewProps {
  config: ElementConfig;
  /** Overrides `config.model`. */
  modelUrl?: string;
  /** Mirrors the tutor state; the assistant changes expression when it changes. */
  state?: AssistantState;
  className?: string;
  onError?: (error: unknown) => void;
}

/**
 * React wrapper: mounts the assistant once and exposes its imperative API through a ref.
 * The host renders normally if WebGL or the model fails: the container just stays empty.
 */
export const ConversationalAssistantView = forwardRef<ConversationalAssistant | null, ConversationalAssistantViewProps>(
  function ConversationalAssistantView({ config, modelUrl, state, className, onError }, ref) {
    const container = useRef<HTMLDivElement>(null);
    const api = useRef<ConversationalAssistant | null>(null);
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    // A stable facade: the real instance is created in an effect (after the ref is attached)
    // and replaced on remount, so every call is forwarded to whatever instance is current.
    const facade = useRef<ConversationalAssistant | null>(null);
    facade.current ??= {
      get ready() {
        return api.current?.ready ?? Promise.reject(new Error("Assistant not mounted"));
      },
      setExpression: (n) => api.current?.setExpression(n),
      gesture: (n) => api.current?.gesture(n) ?? Promise.resolve(),
      playAnimation: (n) => api.current?.playAnimation(n) ?? Promise.resolve(),
      setState: (s) => api.current?.setState(s),
      speak: (o) => api.current?.speak(o) ?? Promise.resolve(),
      stopSpeaking: () => api.current?.stopSpeaking(),
      setSpeechLevel: (l) => api.current?.setSpeechLevel(l),
      lookAt: (t) => api.current?.lookAt(t),
      react: () => api.current?.react() ?? Promise.resolve(),
      show: () => api.current?.show(),
      hide: () => api.current?.hide(),
      dispose: () => api.current?.dispose(),
    };
    useImperativeHandle(ref, () => facade.current!, []);

    useEffect(() => {
      if (!container.current) return;
      try {
        api.current = createConversationalAssistant({
          container: container.current,
          config,
          modelUrl,
          onError: (e) => onErrorRef.current?.(e),
        });
      } catch (e) {
        onErrorRef.current?.(e); // e.g. WebGL unavailable
      }
      return () => {
        api.current?.dispose();
        api.current = null;
      };
    }, [config, modelUrl]);

    useEffect(() => {
      if (state) api.current?.setState(state);
    }, [state]);

    return <div ref={container} className={className} style={{ width: "100%", height: "100%" }} />;
  },
);

/** True when the browser exposes WebGL. Checked without creating a context (jsdom has none). */
export function supportsWebGL(): boolean {
  if (typeof window === "undefined" || typeof WebGLRenderingContext === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
