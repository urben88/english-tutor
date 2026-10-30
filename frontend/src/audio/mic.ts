/** Continuous microphone source. Small interface so hooks can be tested with fakes. */
export interface Mic {
  /** Open the mic once and stream mono frames; resolves with the sample rate. */
  start(onFrame: (frame: Float32Array) => void): Promise<number>;
  /** Release the mic (tracks and audio context). Safe to call twice. */
  stop(): void;
}

export function createBrowserMic(): Mic {
  let ctx: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let node: ScriptProcessorNode | null = null;

  const stop = () => {
    if (node) node.onaudioprocess = null;
    node?.disconnect();
    stream?.getTracks().forEach((t) => t.stop());
    const c = ctx;
    node = null;
    stream = null;
    ctx = null;
    if (c && c.state !== "closed") void c.close();
  };

  return {
    async start(onFrame) {
      stop();
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser cannot access the microphone.");
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      node = ctx.createScriptProcessor(2048, 1, 1);
      node.onaudioprocess = (e) => onFrame(new Float32Array(e.inputBuffer.getChannelData(0)));
      source.connect(node);
      node.connect(ctx.destination); // required for onaudioprocess to fire
      return ctx.sampleRate;
    },
    stop,
  };
}
