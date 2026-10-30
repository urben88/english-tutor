import * as THREE from "three";
import { AssistantControls } from "./controls.js";
import { disposeObject, loadModel, type LoadedModel } from "./loader.js";
import type { AssistantState, ConversationalAssistant, CreateOptions, SpeakOptions } from "./types.js";

export type * from "./types.js";

/** One MediaElementSource per element is all Web Audio allows, so they are cached. */
const audioSources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
let sharedAudioContext: AudioContext | null = null;

function analyserFor(audio: HTMLAudioElement): { analyser: AnalyserNode; release: () => void } | null {
  try {
    sharedAudioContext ??= new AudioContext();
    const ctx = sharedAudioContext;
    void ctx.resume();
    let source = audioSources.get(audio);
    if (!source) {
      source = ctx.createMediaElementSource(audio);
      source.connect(ctx.destination); // keep the audio audible once routed through Web Audio
      audioSources.set(audio, source);
    }
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.5;
    source.connect(analyser);
    const src = source;
    return { analyser, release: () => src.disconnect(analyser) };
  } catch {
    return null; // e.g. cross-origin audio without CORS: fall back to procedural mouth movement
  }
}

/**
 * Mounts the 3D conversational assistant inside `container`. The host keeps working if anything
 * fails: errors go to `onError` and `ready` rejects, every other method becomes a no-op.
 */
export function createConversationalAssistant(options: CreateOptions): ConversationalAssistant {
  const { container, config } = options;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  const renderer = new THREE.WebGLRenderer({
    antialias: config.rendering.antialias,
    alpha: config.rendering.transparentBackground,
    powerPreference: "low-power",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = config.rendering.exposure;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.rendering.maxPixelRatio));
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", config.label);
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(config.camera.fov, 1, 0.05, 20);
  camera.position.fromArray(config.camera.position);
  camera.lookAt(new THREE.Vector3().fromArray(config.camera.target));

  // Soft, frontal cartoon lighting; self-contained so it never fights a host scene.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c4d4, 1.7));
  const key = new THREE.DirectionalLight(0xfff4ea, 2.0);
  key.position.set(0.8, 2.4, 2.2);
  const fill = new THREE.DirectionalLight(0xdbe8ff, 0.7);
  fill.position.set(-1.6, 1.6, 1.2);
  const rim = new THREE.DirectionalLight(0xffffff, 1.1);
  rim.position.set(0, 2.2, -2);
  scene.add(key, fill, rim);

  let model: LoadedModel | null = null;
  let controls: AssistantControls | null = null;
  let frame = 0;
  let disposed = false;
  let speechDone: (() => void) | null = null;
  let speechTimer: ReturnType<typeof setTimeout> | null = null;
  let detachAudio: (() => void) | null = null;
  const clock = new THREE.Clock();

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const loop = () => {
    frame = requestAnimationFrame(loop);
    controls?.update(clock.getDelta());
    renderer.render(scene, camera);
  };

  const ready = loadModel(new URL(options.modelUrl ?? config.model, document.baseURI).href).then((m) => {
    if (disposed) {
      disposeObject(m.root);
      return;
    }
    m.root.scale.setScalar(config.scale);
    m.root.position.fromArray(config.position);
    m.root.rotation.set(...(config.rotation.map((d) => d * (Math.PI / 180)) as [number, number, number]));
    scene.add(m.root);
    model = m;
    controls = new AssistantControls(m, config, reducedMotion);
    if (config.pointer?.enabled !== false) attachPointer(m);
    clock.getDelta();
    loop();
  });

  // Pointer: eyes and head follow the mouse anywhere on the page; a click on the character reacts.
  let detachPointer: (() => void) | null = null;
  const headPos = new THREE.Vector3();
  function attachPointer(m: LoadedModel) {
    const head = m.bones.get(config.bones.head);
    const onMove = (e: PointerEvent) => {
      if (!controls || e.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // Aim from the head's position on screen, not the canvas centre.
      if (head) head.getWorldPosition(headPos).project(camera);
      else headPos.set(0, 0, 0);
      const hx = rect.left + ((headPos.x + 1) / 2) * rect.width;
      const hy = rect.top + ((1 - headPos.y) / 2) * rect.height;
      controls.setLookTarget([(e.clientX - hx) / (rect.width / 2), (hy - e.clientY) / (rect.height / 2)]);
    };
    const onLeave = () => controls?.setLookTarget(null);
    const onClick = () => void controls?.react();
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    canvas.addEventListener("click", onClick);
    if (config.pointer?.clickGestures?.length) canvas.style.cursor = "pointer";
    detachPointer = () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      canvas.removeEventListener("click", onClick);
    };
  }
  ready.catch((err) => {
    observer.disconnect();
    renderer.dispose();
    canvas.remove();
    options.onError?.(err);
  });

  const finishSpeech = () => {
    if (speechTimer) clearTimeout(speechTimer);
    speechTimer = null;
    detachAudio?.();
    detachAudio = null;
    controls?.setSpeaking(false);
    const done = speechDone;
    speechDone = null;
    done?.();
  };

  const api: ConversationalAssistant = {
    ready,
    setExpression: (name) => controls?.setExpression(name),
    gesture: (name) => controls?.gesture(name) ?? Promise.resolve(),
    playAnimation: (name) => api.gesture(name),
    setState(state: AssistantState) {
      const s = config.states[state];
      if (!s) return;
      api.setExpression(s.expression);
      if (s.gesture) void api.gesture(s.gesture);
      // Entering "speaking" moves the mouth on its own, unless speak() (e.g. with audio) already runs.
      if (state === "speaking" && !speechDone) void api.speak();
      if (state !== "speaking" && speechDone) finishSpeech();
    },
    speak(opts: SpeakOptions = {}) {
      if (!controls) return Promise.resolve();
      finishSpeech();
      return new Promise<void>((resolve) => {
        speechDone = resolve;
        controls!.setSpeaking(true);
        if (opts.audio) {
          const audio = opts.audio;
          const tap = analyserFor(audio);
          controls!.setAnalyser(tap?.analyser ?? null);
          const end = () => finishSpeech();
          audio.addEventListener("ended", end);
          audio.addEventListener("pause", end);
          detachAudio = () => {
            audio.removeEventListener("ended", end);
            audio.removeEventListener("pause", end);
            tap?.release();
          };
          return;
        }
        const words = opts.text?.trim().split(/\s+/).filter(Boolean).length ?? 0;
        const ms = opts.durationMs ?? (words ? words * 330 + 300 : 0);
        if (ms > 0) speechTimer = setTimeout(finishSpeech, ms);
        // With neither audio, text nor duration, speech lasts until stopSpeaking().
      });
    },
    stopSpeaking: finishSpeech,
    setSpeechLevel: (level) => controls?.setSpeechLevel(level),
    lookAt: (target) => controls?.setLookTarget(target),
    react: () => controls?.react() ?? Promise.resolve(),
    show() {
      canvas.style.visibility = "visible";
    },
    hide() {
      canvas.style.visibility = "hidden";
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      finishSpeech();
      cancelAnimationFrame(frame);
      observer.disconnect();
      detachPointer?.();
      if (model) {
        scene.remove(model.root);
        disposeObject(model.root);
      }
      model = null;
      controls = null;
      renderer.dispose();
      canvas.remove();
    },
  };
  return api;
}
