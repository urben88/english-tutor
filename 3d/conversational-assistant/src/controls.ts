import * as THREE from "three";
import type { LoadedModel } from "./loader.js";
import type { ElementConfig, Euler3, GestureDef, LipSyncConfig, Oscillation, PoseMap } from "./types.js";

const DEG = Math.PI / 180;

/** Frame-rate independent exponential approach. */
function approach(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

const DEFAULT_LIP_SYNC: LipSyncConfig = { gain: 1.7, audioGain: 6.5, floor: 0.55, emphasis: 1 };

const swapSide = (bone: string): string =>
  bone.endsWith("_R") ? `${bone.slice(0, -2)}_L` : bone.endsWith("_L") ? `${bone.slice(0, -2)}_R` : bone;

/** Mirrors a pose across the body's centre plane: rotations about Y and Z flip, X stays. */
function mirrorPose(pose: PoseMap): PoseMap {
  const out: PoseMap = {};
  for (const [bone, d] of Object.entries(pose)) out[swapSide(bone)] = [d[0], -d[1], -d[2]];
  return out;
}

function mirrorOscillations(list: Oscillation[]): Oscillation[] {
  return list.map((o) => ({ ...o, bone: swapSide(o.bone), amplitude: o.axis === "x" ? o.amplitude : -o.amplitude }));
}

/** Expands `like` and `mirror` so every gesture ends up with an explicit pose. */
export function resolveGestures(src: Record<string, GestureDef>): Record<string, GestureDef> {
  const out: Record<string, GestureDef> = {};
  for (const [name, def] of Object.entries(src)) {
    const base = def.like ? src[def.like] : undefined;
    let pose: PoseMap = { ...(def.pose ?? base?.pose ?? {}) };
    let oscillate = def.oscillate ?? base?.oscillate ?? [];
    if (def.mirror) {
      const mp = mirrorPose(pose);
      const mo = mirrorOscillations(oscillate);
      pose = def.mirror === "left" ? mp : { ...pose, ...mp };
      oscillate = def.mirror === "left" ? mo : [...oscillate, ...mo];
    }
    out[name] = { ...base, ...def, pose, oscillate };
  }
  return out;
}

/** Smooth value noise built from incommensurate sines: cheap, deterministic, no allocations. */
function wobble(t: number, seed: number): number {
  return Math.sin(t * 0.61 + seed) * 0.5 + Math.sin(t * 1.37 + seed * 2.3) * 0.3 + Math.sin(t * 2.71 + seed * 4.1) * 0.2;
}

/**
 * Drives bones with rotations expressed in rest-pose world axes, so poses do not depend on how the
 * exporter oriented each bone's local axes. Rotations compose down the chain (child after parent).
 */
class BoneDriver {
  private readonly rest = new Map<string, THREE.Quaternion>();
  private readonly parentRest = new Map<string, THREE.Quaternion>();
  private readonly parentRestInv = new Map<string, THREE.Quaternion>();
  private readonly current = new Map<string, THREE.Vector3>();
  private readonly target = new Map<string, THREE.Vector3>();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();

  constructor(private readonly bones: Map<string, THREE.Bone>, root: THREE.Object3D) {
    root.updateMatrixWorld(true);
    const rootInv = root.getWorldQuaternion(new THREE.Quaternion()).invert();
    for (const [name, bone] of bones) {
      this.rest.set(name, bone.quaternion.clone());
      const pw = bone.parent ? bone.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
      const parentInRoot = rootInv.clone().multiply(pw);
      this.parentRest.set(name, parentInRoot);
      this.parentRestInv.set(name, parentInRoot.clone().invert());
      this.current.set(name, new THREE.Vector3());
      this.target.set(name, new THREE.Vector3());
    }
  }

  has(name: string): boolean {
    return this.bones.has(name);
  }

  clearTargets(): void {
    for (const t of this.target.values()) t.set(0, 0, 0);
  }

  addTarget(name: string, deg: Euler3, weight = 1): void {
    const t = this.target.get(name);
    if (!t) return;
    t.x += deg[0] * weight;
    t.y += deg[1] * weight;
    t.z += deg[2] * weight;
  }

  /** Adds an offset that bypasses smoothing (for oscillations and noise, already smooth). */
  update(dt: number, rate: number, offsets: Map<string, THREE.Vector3>): void {
    for (const [name, bone] of this.bones) {
      const cur = this.current.get(name)!;
      const tgt = this.target.get(name)!;
      cur.set(approach(cur.x, tgt.x, rate, dt), approach(cur.y, tgt.y, rate, dt), approach(cur.z, tgt.z, rate, dt));
      const off = offsets.get(name);
      const x = cur.x + (off?.x ?? 0);
      const y = cur.y + (off?.y ?? 0);
      const z = cur.z + (off?.z ?? 0);
      this.e.set(x * DEG, y * DEG, z * DEG, "XYZ");
      this.q.setFromEuler(this.e);
      // local = parentRest^-1 * delta * parentRest * rest
      bone.quaternion
        .copy(this.parentRestInv.get(name)!)
        .multiply(this.q)
        .multiply(this.parentRest.get(name)!)
        .multiply(this.rest.get(name)!);
    }
  }
}

/** Smoothed morph weights addressed by name across every mesh that has them. */
class MorphDriver {
  private readonly current = new Map<string, number>();
  private readonly target = new Map<string, number>();
  private readonly rate = new Map<string, number>();
  private readonly slots: { mesh: THREE.Mesh; index: number; name: string }[] = [];

  constructor(model: LoadedModel, private readonly aliases: Record<string, string>) {
    for (const mesh of model.morphMeshes) {
      for (const [name, index] of Object.entries(mesh.morphTargetDictionary!)) {
        this.slots.push({ mesh, index, name });
        this.current.set(name, 0);
      }
    }
  }

  resolve(name: string): string {
    return this.aliases[name] ?? name;
  }

  clearTargets(): void {
    for (const k of this.target.keys()) this.target.set(k, 0);
  }

  add(name: string, weight: number, rate: number): void {
    const n = this.resolve(name);
    if (!this.current.has(n)) return;
    this.target.set(n, Math.min(1, (this.target.get(n) ?? 0) + weight));
    this.rate.set(n, Math.max(this.rate.get(n) ?? 0, rate));
  }

  update(dt: number, defaultRate: number): void {
    for (const [name, cur] of this.current) {
      const rate = this.rate.get(name) ?? defaultRate;
      this.current.set(name, approach(cur, this.target.get(name) ?? 0, rate, dt));
    }
    this.rate.clear();
    for (const s of this.slots) s.mesh.morphTargetInfluences![s.index] = this.current.get(s.name) ?? 0;
  }
}

interface ActiveGesture {
  def: GestureDef;
  elapsed: number;
  resolve: () => void;
}

/** Picks a viseme from loudness and brightness of the audio frame. */
function visemeFor(level: number, brightness: number, visemes: string[], rnd: number): string {
  const has = (v: string) => visemes.includes(v);
  if (level < 0.08 && has("viseme_PP")) return "viseme_PP";
  if (brightness > 0.55 && has("viseme_SS")) return rnd < 0.5 ? "viseme_SS" : "viseme_I";
  if (brightness > 0.38) return rnd < 0.5 ? "viseme_E" : "viseme_I";
  if (brightness < 0.18) return rnd < 0.5 ? "viseme_O" : "viseme_U";
  return rnd < 0.7 ? "viseme_aa" : "viseme_E";
}

/**
 * All animation layers of the assistant: idle motion, expressions, gestures, blinking, gaze and
 * lip-sync. Every layer writes targets each frame; the drivers smooth them, so any change, including
 * the end of a gesture, eases back to idle instead of snapping.
 */
export class AssistantControls {
  private readonly bones: BoneDriver;
  private readonly morphs: MorphDriver;
  private readonly offsets = new Map<string, THREE.Vector3>();
  private time = 0;
  private expression: string;
  private gestureActive: ActiveGesture | null = null;
  private gestureWeight = 0;
  private readonly gestures: Record<string, GestureDef>;
  private readonly exprWeight = new Map<string, number>();
  private gestureBones = new Set<string>();
  private nextAuto = 0.8;
  private lastAuto = "";
  private readonly lip: LipSyncConfig;
  private lastGesture: GestureDef | null = null;
  private nextBlink = 1.5;
  private blinkTimer = -1;
  private saccade: [number, number] = [0, 0];
  private nextSaccade = 1;
  // speech
  private speaking = false;
  private externalLevel = 0;
  private level = 0;
  private viseme = "";
  private nextSyllable = 0;
  private analyser: AnalyserNode | null = null;
  private readonly timeData = new Uint8Array(1024);
  private readonly freqData = new Uint8Array(512);
  // pointer follow: target in -1..1 screen space (null = no pointer), smoothed value
  private lookTarget: [number, number] | null = null;
  private readonly look: [number, number] = [0, 0];
  private lookWeight = 0;
  private lastReaction = "";

  constructor(model: LoadedModel, private readonly config: ElementConfig, private readonly reducedMotion: boolean) {
    this.bones = new BoneDriver(model.bones, model.root);
    this.morphs = new MorphDriver(model, config.morphAliases);
    this.expression = config.idleExpression;
    this.exprWeight.set(this.expression, 1);
    this.gestures = resolveGestures(config.gestures);
    this.lip = { ...DEFAULT_LIP_SYNC, ...config.lipSync };
  }

  setExpression(name: string): void {
    if (!this.config.expressions[name] || name === this.expression) return;
    this.expression = name;
    this.nextAuto = 0.7;
  }

  gesture(name: string): Promise<void> {
    const def = this.gestures[name];
    if (!def) return Promise.resolve();
    this.gestureActive?.resolve();
    return new Promise((resolve) => {
      this.gestureActive = { def, elapsed: 0, resolve };
      this.lastGesture = def;
    });
  }

  setSpeaking(on: boolean): void {
    this.speaking = on;
    if (!on) this.analyser = null;
  }

  setAnalyser(analyser: AnalyserNode | null): void {
    this.analyser = analyser;
  }

  /** Pointer position relative to the character, -1..1 on each axis (+x = viewer's right, +y = up). */
  setLookTarget(target: [number, number] | null): void {
    this.lookTarget = target;
  }

  /** Plays a random reaction gesture (never the same twice in a row). */
  react(): Promise<void> {
    const list = (this.config.pointer?.clickGestures ?? []).filter((g) => this.gestures[g] && g !== this.lastReaction);
    const pick = list[Math.floor(Math.random() * list.length)];
    if (!pick) return Promise.resolve();
    this.lastReaction = pick;
    this.nextAuto = Math.max(this.nextAuto, 1.5); // let the reaction play before any automatic gesture
    return this.gesture(pick);
  }

  setSpeechLevel(level: number): void {
    this.externalLevel = Math.max(0, Math.min(1, level));
  }

  update(dt: number): void {
    dt = Math.min(dt, 0.1); // a hidden tab must not cause a jump
    this.time += dt;
    const cfg = this.config;
    const motion = this.reducedMotion ? 0.35 : 1;
    this.bones.clearTargets();
    this.morphs.clearTargets();
    for (const o of this.offsets.values()) o.set(0, 0, 0);

    // Expression layer.
    const expr = cfg.expressions[this.expression] ?? cfg.expressions[cfg.idleExpression];
    for (const [m, w] of Object.entries(expr?.morphs ?? {})) this.morphs.add(m, w, cfg.smoothing.expression);
    if (expr?.head) this.bones.addTarget(cfg.bones.head, expr.head);

    // Gesture layer, then the expression's own body pose (which yields to a gesture on shared bones).
    this.updateGesture(dt);
    this.updateExpressionBody(dt);

    // Idle life: breathing, head drift and an occasional glance.
    const t = this.time;
    this.offset(cfg.bones.chest).x += Math.sin(t * 1.5) * 1.2 * motion;
    const speakBoost = this.speaking ? 1.6 : 1;
    const head = this.offset(cfg.bones.head);
    head.x += wobble(t, 1) * 2.4 * motion * speakBoost + this.level * 3.5 * motion; // nod on stress
    head.y += wobble(t, 7) * 3.5 * motion;
    head.z += wobble(t, 3) * 1.6 * motion;
    const neck = this.offset(cfg.bones.neck);
    neck.y += wobble(t * 0.7, 11) * 2 * motion;
    this.updateLook(dt, motion);

    this.updateGaze(dt, expr?.gaze);
    this.updateBlink(dt);
    this.updateSpeech(dt);

    this.bones.update(dt, cfg.smoothing.pose, this.offsets);
    this.morphs.update(dt, cfg.smoothing.expression);
  }

  private offset(bone: string): THREE.Vector3 {
    let v = this.offsets.get(bone);
    if (!v) {
      v = new THREE.Vector3();
      this.offsets.set(bone, v);
    }
    return v;
  }

  private updateGesture(dt: number): void {
    const g = this.gestureActive;
    const cfg = this.config;
    if (g) {
      g.elapsed += dt;
      const blendIn = 3 / cfg.smoothing.pose; // ~95 % of the way to the pose
      if (g.elapsed > blendIn + g.def.hold) {
        this.gestureActive = null;
        // Resolve once the pose has eased back, so callers can chain gestures cleanly.
        setTimeout(g.resolve, (blendIn * 1000) | 0);
      }
    }
    const active = this.gestureActive;
    if (active) this.gestureBones = new Set(Object.keys(active.def.pose ?? {}).concat((active.def.oscillate ?? []).map((o) => o.bone)));
    this.gestureWeight = approach(this.gestureWeight, active ? 1 : 0, cfg.smoothing.pose, dt);
    if (active) {
      for (const [bone, deg] of Object.entries(active.def.pose ?? {})) this.bones.addTarget(bone, deg);
      for (const [m, w] of Object.entries(active.def.morphs ?? {})) this.morphs.add(m, w, cfg.smoothing.expression);
    }
    // Oscillations fade with the gesture weight so waving slows down instead of stopping dead.
    const osc = (active ?? (this.gestureWeight > 0.01 ? { def: this.lastGesture } : null))?.def?.oscillate ?? [];
    const motion = this.reducedMotion ? 0.4 : 1;
    for (const o of osc) {
      const v = this.offset(o.bone);
      v[o.axis] += Math.sin(this.time * o.frequency * 2 * Math.PI) * o.amplitude * this.gestureWeight * motion;
    }
  }

  private updateExpressionBody(dt: number): void {
    const cfg = this.config;
    const motion = this.reducedMotion ? 0.4 : 1;
    const gw = this.gestureWeight;
    this.exprWeight.set(this.expression, this.exprWeight.get(this.expression) ?? 0);
    for (const [name, w0] of this.exprWeight) {
      const w = approach(w0, name === this.expression ? 1 : 0, 3.5, dt);
      if (w < 0.004 && name !== this.expression) {
        this.exprWeight.delete(name);
        continue;
      }
      this.exprWeight.set(name, w);
      const def = cfg.expressions[name];
      for (const [bone, deg] of Object.entries(def?.pose ?? {})) {
        this.bones.addTarget(bone, deg, w * (this.gestureBones.has(bone) ? 1 - gw : 1));
      }
      for (const o of def?.oscillate ?? []) {
        const k = w * motion * (this.gestureBones.has(o.bone) ? 1 - gw : 1);
        this.offset(o.bone)[o.axis] += Math.sin(this.time * o.frequency * 2 * Math.PI) * o.amplitude * k;
      }
    }
    // Conversational gestures: pick one at random whenever the arms are free.
    const expr = cfg.expressions[this.expression];
    if (expr?.gestures?.length && !this.gestureActive && !this.reducedMotion) {
      this.nextAuto -= dt;
      if (this.nextAuto <= 0) {
        const [lo, hi] = expr.gestureEvery ?? [0.4, 1.4];
        this.nextAuto = lo + Math.random() * (hi - lo);
        const options = expr.gestures.filter((g) => g !== this.lastAuto && this.gestures[g]);
        const pick = options[Math.floor(Math.random() * options.length)];
        if (pick) {
          this.lastAuto = pick;
          void this.gesture(pick);
        }
      }
    }
  }

  private updateGaze(dt: number, gaze?: [number, number]): void {
    this.nextSaccade -= dt;
    if (this.nextSaccade <= 0) {
      this.nextSaccade = 0.8 + Math.random() * 2.4;
      this.saccade = this.speaking || Math.random() < 0.6 ? [0, 0] : [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6];
    }
    // Looking at the pointer replaces the expression's gaze and the random glances.
    const lw = this.lookWeight;
    const eyes = this.config.pointer?.eyes ?? [18, 12];
    const yaw = ((gaze?.[0] ?? 0) + this.saccade[0]) * (1 - lw) + this.look[0] * eyes[0] * lw;
    const pitch = ((gaze?.[1] ?? 0) + this.saccade[1]) * (1 - lw) + this.look[1] * eyes[1] * lw;
    // In three's axes a positive X rotation looks down and a positive Y rotation turns to +X (character's left).
    for (const eye of this.config.bones.eyes) this.bones.addTarget(eye, [-pitch, yaw, 0]);
  }

  private updateLook(dt: number, motion: number): void {
    const p = this.config.pointer;
    const on = !!this.lookTarget && p?.enabled !== false;
    this.lookWeight = approach(this.lookWeight, on ? 1 : 0, 3, dt);
    const [tx, ty] = on ? this.lookTarget! : [0, 0];
    this.look[0] = approach(this.look[0], Math.max(-1, Math.min(1, tx)), 6, dt);
    this.look[1] = approach(this.look[1], Math.max(-1, Math.min(1, ty)), 6, dt);
    const [hy, hp] = p?.head ?? [16, 9];
    const head = this.offset(this.config.bones.head);
    // +Y turns to the character's left (viewer's right); -X looks up.
    head.y += this.look[0] * hy * this.lookWeight * motion;
    head.x -= this.look[1] * hp * this.lookWeight * motion;
  }

  private updateBlink(dt: number): void {
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.blinkTimer = 0;
      this.nextBlink = Math.random() < 0.15 ? 0.25 : 2 + Math.random() * 4; // sometimes a double blink
    }
    if (this.blinkTimer >= 0) {
      this.blinkTimer += dt;
      const closing = this.blinkTimer < 0.09;
      if (closing) {
        this.morphs.add("blink_L", 1, this.config.smoothing.blink);
        this.morphs.add("blink_R", 1, this.config.smoothing.blink);
      }
      if (this.blinkTimer > 0.09) this.blinkTimer = -1;
    }
    // Blinks use their own fast rate on the way back too.
    this.morphs.add("blink_L", 0, this.config.smoothing.blink);
    this.morphs.add("blink_R", 0, this.config.smoothing.blink);
  }

  private updateSpeech(dt: number): void {
    const cfg = this.config;
    let level = 0;
    let brightness = 0.3;
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(this.timeData);
      let sum = 0;
      for (let i = 0; i < this.timeData.length; i++) {
        const s = (this.timeData[i] - 128) / 128;
        sum += s * s;
      }
      level = Math.min(1, Math.sqrt(sum / this.timeData.length) * this.lip.audioGain);
      this.analyser.getByteFrequencyData(this.freqData);
      let num = 0;
      let den = 0;
      for (let i = 0; i < this.freqData.length; i++) {
        num += i * this.freqData[i];
        den += this.freqData[i];
      }
      brightness = den > 0 ? num / den / this.freqData.length : 0;
    } else if (this.externalLevel > 0) {
      level = this.externalLevel;
    } else if (this.speaking) {
      // Procedural syllables: no audio to follow, so open and close at a speech-like rate.
      level = this.lip.floor + (1 - this.lip.floor) * Math.abs(Math.sin(this.time * 9.5)) * (0.7 + 0.3 * Math.sin(this.time * 2.3));
      brightness = 0.15 + 0.5 * (0.5 + 0.5 * Math.sin(this.time * 5.3 + 1.7));
    }
    const talking = this.speaking || this.externalLevel > 0;
    this.level = approach(this.level, talking ? level : 0, 20, dt);

    this.nextSyllable -= dt;
    if (talking && this.nextSyllable <= 0) {
      this.nextSyllable = 0.07 + Math.random() * 0.08;
      this.viseme = visemeFor(level, brightness, cfg.visemes, Math.random());
    }
    if (!talking) this.viseme = "";
    for (const v of cfg.visemes) {
      const w = v === this.viseme ? Math.min(1, this.level * this.lip.gain) : 0;
      this.morphs.add(v, w, cfg.smoothing.viseme);
    }
    if (talking) {
      // Brows, eyes and head follow emphasis, which reads as engaged speech.
      const e = this.lip.emphasis;
      this.morphs.add("browInnerUp", this.level * 0.45 * e, cfg.smoothing.viseme);
      this.morphs.add("browUp_L", Math.max(0, this.level - 0.6) * 0.8 * e, cfg.smoothing.viseme);
      this.morphs.add("browUp_R", Math.max(0, this.level - 0.6) * 0.8 * e, cfg.smoothing.viseme);
      this.morphs.add("eyeWide", Math.max(0, this.level - 0.75) * 0.9 * e, cfg.smoothing.viseme);
      const motion = this.reducedMotion ? 0.35 : 1;
      this.offset(cfg.bones.head).x += this.level * 4 * e * motion; // chin dips on each stressed syllable
    }
  }
}

/** Exposed for tests and tooling. */
export const _internal = { approach, visemeFor };
