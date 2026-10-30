export interface Player {
  /** Play a base64-encoded WAV. Resolves when playback ends, is stopped or replaced. */
  play(base64Wav: string): Promise<void>;
  /** Cut the current playback. */
  stop(): void;
}

export function base64ToBlob(b64: string, type = "audio/wav"): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export function createBrowserPlayer(): Player {
  let current: HTMLAudioElement | null = null;
  let url: string | null = null;
  let settle: (() => void) | null = null;

  const stop = () => {
    current?.pause();
    current = null;
    if (url) URL.revokeObjectURL(url);
    url = null;
    const s = settle;
    settle = null;
    s?.();
  };

  return {
    stop,
    play(b64) {
      stop();
      return new Promise<void>((resolve) => {
        settle = resolve;
        url = URL.createObjectURL(base64ToBlob(b64));
        const audio = new Audio(url);
        current = audio;
        audio.onended = stop;
        audio.onerror = stop;
        void audio.play().catch(stop); // autoplay may be blocked; the text reply is still shown
      });
    },
  };
}
