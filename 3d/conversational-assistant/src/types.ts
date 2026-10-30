/** Euler angles in degrees, applied X then Y then Z in the bone's rest-pose world axes (Y up, model faces +Z). */
export type Euler3 = [number, number, number];

/** Bone name -> rotation relative to the parent's current pose. Missing bones stay at rest. */
export type PoseMap = Record<string, Euler3>;

export interface Oscillation {
  bone: string;
  axis: "x" | "y" | "z";
  /** Degrees. */
  amplitude: number;
  /** Hertz. */
  frequency: number;
}

export interface GestureDef {
  /** Right-arm poses are authored; use `mirror` to derive the left arm. Optional when `like` is set. */
  pose?: PoseMap;
  /** Reuse another gesture's pose, hold and oscillations (combine with `mirror`). */
  like?: string;
  /** Derive the pose for the left arm (`"left"`) or add it to the authored one (`"both"`). */
  mirror?: "left" | "both";
  /** Seconds the pose is held before returning to idle (after the blend-in). */
  hold: number;
  oscillate?: Oscillation[];
  /** Morph weights layered on top of the current expression while the gesture runs. */
  morphs?: Record<string, number>;
}

export interface ExpressionDef {
  /** Morph target name -> weight 0..1. */
  morphs: Record<string, number>;
  /** Extra head rotation (degrees) while the expression is active. */
  head?: Euler3;
  /** Eye direction: [yaw, pitch] in degrees, positive = character's left / up. */
  gaze?: [number, number];
  /** Body pose held while this expression is active (arms, chest...). Eases in and out. */
  pose?: PoseMap;
  /** Continuous motion while this expression is active (sway, small nods). */
  oscillate?: Oscillation[];
  /** Gestures picked at random (never the same twice in a row) while this expression is active. */
  gestures?: string[];
  /** Pause between automatic gestures, [min, max] seconds. */
  gestureEvery?: [number, number];
}

export interface LipSyncConfig {
  /** Multiplier on the mouth shape weight (viseme weight = level * gain, capped at 1). */
  gain: number;
  /** Multiplier on the measured audio loudness. */
  audioGain: number;
  /** Mouth opening floor while speaking without audio, 0..1. */
  floor: number;
}

export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface RenderingConfig {
  transparentBackground: boolean;
  antialias: boolean;
  /** Cap for devicePixelRatio, keeps fill-rate reasonable on HiDPI screens. */
  maxPixelRatio: number;
  exposure: number;
}

export interface SmoothingConfig {
  /** Higher = faster. Exponential approach rate per second. */
  pose: number;
  expression: number;
  viseme: number;
  blink: number;
}

export interface ElementConfig {
  name: string;
  type: "character";
  model: string;
  label: string;
  scale: number;
  position: [number, number, number];
  rotation: [number, number, number];
  camera: CameraConfig;
  rendering: RenderingConfig;
  smoothing: SmoothingConfig;
  /** Default expression while idle. */
  idleExpression: string;
  expressions: Record<string, ExpressionDef>;
  gestures: Record<string, GestureDef>;
  visemes: string[];
  /** Mouth movement strength. Defaults are used when omitted. */
  lipSync?: Partial<LipSyncConfig>;
  /** Logical name -> morph target name in the model (for swapping in a VRM/VRoid-style model). */
  morphAliases: Record<string, string>;
  bones: {
    head: string;
    neck: string;
    chest: string;
    eyes: [string, string];
  };
  /** Assistant state -> expression and optional gesture. */
  states: Record<AssistantState, { expression: string; gesture?: string }>;
}

export type AssistantState = "idle" | "listening" | "thinking" | "speaking";

export interface SpeakOptions {
  /** Audio to lip-sync with (analysed via Web Audio). Playback stays under the caller's control. */
  audio?: HTMLAudioElement;
  /** Text without audio: mouth moves procedurally for an estimated duration. */
  text?: string;
  /** Explicit duration for procedural speech, in milliseconds. */
  durationMs?: number;
}

export interface CreateOptions {
  container: HTMLElement;
  /** Overrides `config.model`. Resolved against the page URL. */
  modelUrl?: string;
  config: ElementConfig;
  onError?: (error: unknown) => void;
}

export interface ConversationalAssistant {
  /** Resolves once the model is loaded and visible; rejects if loading fails. */
  readonly ready: Promise<void>;
  setExpression(name: string): void;
  /** Plays a gesture and resolves when it has returned to idle. Unknown names resolve immediately. */
  gesture(name: string): Promise<void>;
  /** Alias of `gesture`, matching the generic 3D element API. */
  playAnimation(name: string): Promise<void>;
  setState(state: AssistantState): void;
  speak(options?: SpeakOptions): Promise<void>;
  stopSpeaking(): void;
  /** Feed an external speech level 0..1 (e.g. from your own analyser). Implies speaking while > 0. */
  setSpeechLevel(level: number): void;
  show(): void;
  hide(): void;
  dispose(): void;
}
