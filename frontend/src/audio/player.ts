export interface Player {
  /** Play a base64-encoded WAV. */
  play(base64Wav: string): void;
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
  return {
    play(b64) {
      current?.pause();
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(base64ToBlob(b64));
      current = new Audio(url);
      void current.play().catch(() => {
        /* autoplay may be blocked; the text reply is still shown */
      });
    },
  };
}
