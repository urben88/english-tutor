export interface RecordedAudio {
  samples: Float32Array; // mono
  sampleRate: number;
}

/** Small interface so components can be tested with fakes. */
export interface Recorder {
  start(): Promise<void>;
  /** Stop and return what was captured. */
  stop(): Promise<RecordedAudio>;
  /** Stop and discard. */
  cancel(): Promise<void>;
}

/** Microphone recorder using Web Audio (ScriptProcessor keeps it dependency-free). */
export function createBrowserRecorder(): Recorder {
  let ctx: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let node: ScriptProcessorNode | null = null;
  let chunks: Float32Array[] = [];

  const release = async () => {
    node?.disconnect();
    stream?.getTracks().forEach((t) => t.stop());
    const c = ctx;
    node = null;
    stream = null;
    ctx = null;
    if (c && c.state !== "closed") await c.close();
  };

  return {
    async start() {
      chunks = [];
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      source.connect(node);
      node.connect(ctx.destination); // required for onaudioprocess to fire
    },
    async stop() {
      const sampleRate = ctx?.sampleRate ?? 16000;
      await release();
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const samples = new Float32Array(total);
      let off = 0;
      for (const c of chunks) {
        samples.set(c, off);
        off += c.length;
      }
      chunks = [];
      return { samples, sampleRate };
    },
    async cancel() {
      chunks = [];
      await release();
    },
  };
}
