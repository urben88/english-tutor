import { createVad, rms } from "./vad";

const RATE = 16000;
const FRAME = 320; // 20 ms
const frame = (v: number) => new Float32Array(FRAME).fill(v);
const loud = () => frame(0.3);
const quiet = () => frame(0);

function feed(vad: ReturnType<typeof createVad>, n: number, make: () => Float32Array) {
  const out: Float32Array[] = [];
  for (let i = 0; i < n; i++) {
    const r = vad.push(make());
    if (r.utterance) out.push(r.utterance);
  }
  return out;
}

describe("rms", () => {
  it("is 0 for silence and the amplitude for a constant signal", () => {
    expect(rms(quiet())).toBe(0);
    expect(rms(loud())).toBeCloseTo(0.3);
  });
});

describe("vad", () => {
  it("emits one utterance after speech followed by >= 1 s of silence", () => {
    const vad = createVad({ sampleRate: RATE });
    expect(feed(vad, 25, loud)).toHaveLength(0); // 500 ms of speech
    expect(feed(vad, 49, quiet)).toHaveLength(0); // 980 ms: not yet
    const out = feed(vad, 2, quiet);
    expect(out).toHaveLength(1);
    expect(out[0].length).toBeGreaterThanOrEqual(25 * FRAME);
    expect(feed(vad, 100, quiet)).toHaveLength(0); // nothing more
  });

  it("discards a blip shorter than 0.3 s", () => {
    const vad = createVad({ sampleRate: RATE });
    feed(vad, 8, loud); // 160 ms
    expect(feed(vad, 100, quiet)).toHaveLength(0);
  });

  it("includes ~300 ms of pre-roll before the first voiced frame", () => {
    const vad = createVad({ sampleRate: RATE });
    feed(vad, 50, quiet);
    feed(vad, 25, loud);
    const [u] = feed(vad, 60, quiet);
    const lead = u.findIndex((s) => s !== 0);
    expect(lead).toBeGreaterThanOrEqual(0.25 * RATE);
    expect(lead).toBeLessThanOrEqual(0.3 * RATE);
  });

  it("keeps a short pause inside one utterance", () => {
    const vad = createVad({ sampleRate: RATE });
    feed(vad, 20, loud);
    feed(vad, 20, quiet); // 400 ms pause
    feed(vad, 20, loud);
    expect(feed(vad, 60, quiet)).toHaveLength(1);
  });

  it("reports speaking and level", () => {
    const vad = createVad({ sampleRate: RATE });
    expect(vad.push(quiet()).speaking).toBe(false);
    let r = vad.push(loud());
    r = vad.push(loud());
    r = vad.push(loud()); // 60 ms of voice
    expect(r.speaking).toBe(true);
    expect(r.level).toBeGreaterThan(0);
  });

  it("emits nothing while muted and discards a half-heard utterance", () => {
    const vad = createVad({ sampleRate: RATE });
    feed(vad, 25, loud);
    vad.setMuted(true);
    expect(feed(vad, 100, loud)).toHaveLength(0);
    expect(feed(vad, 100, quiet)).toHaveLength(0);
    vad.setMuted(false);
    expect(feed(vad, 100, quiet)).toHaveLength(0); // old speech is gone
    feed(vad, 25, loud);
    expect(feed(vad, 60, quiet)).toHaveLength(1);
  });
});
