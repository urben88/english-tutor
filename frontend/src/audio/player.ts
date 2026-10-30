export interface Player {
  /**
   * Play a base64-encoded WAV. Resolves when playback ends, is stopped or replaced.
   * With `append` the clip is queued behind the current one (and any queued clips) and
   * starts when the previous ends; the promise resolves when that clip ends.
   */
  play(base64Wav: string, append?: boolean): Promise<void>;
  /** Cut the current playback and clear the queue. */
  stop(): void;
}

export function base64ToBlob(b64: string, type = "audio/wav"): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

interface Clip {
  audio: HTMLAudioElement;
  url: string;
  resolve: () => void;
}

/** The element is created and preloaded as soon as the clip is queued, so switching
 *  between streamed sentences does not pay a decode delay. */
function makeClip(b64: string, resolve: () => void): Clip {
  const url = URL.createObjectURL(base64ToBlob(b64));
  const audio = new Audio(url);
  audio.preload = "auto";
  return { audio, url, resolve };
}

/** `onAudio` receives each element before it plays (the 3D assistant uses it for lip-sync). */
export function createBrowserPlayer(onAudio?: (audio: HTMLAudioElement) => void): Player {
  let current: Clip | null = null;
  const queue: Clip[] = [];

  const dispose = (clip: Clip) => {
    clip.audio.onended = null;
    clip.audio.onerror = null;
    URL.revokeObjectURL(clip.url);
  };

  const start = (clip: Clip) => {
    current = clip;
    onAudio?.(clip.audio);
    const finish = () => {
      if (current !== clip) return; // already stopped or replaced
      current = null;
      dispose(clip);
      clip.resolve();
      startNext();
    };
    clip.audio.onended = finish;
    clip.audio.onerror = finish;
    void clip.audio.play().catch(finish); // autoplay may be blocked; the text reply is still shown
  };

  const startNext = () => {
    const next = queue.shift();
    if (next && current === null) start(next);
  };

  const stop = () => {
    const clip = current;
    if (clip) {
      current = null;
      clip.audio.pause();
      dispose(clip);
      clip.resolve();
    }
    while (queue.length) {
      const queued = queue.shift()!;
      dispose(queued);
      queued.resolve();
    }
  };

  return {
    stop,
    play(b64, append = false) {
      if (!append) stop();
      return new Promise<void>((resolve) => {
        const clip = makeClip(b64, resolve);
        if (current === null) start(clip);
        else queue.push(clip);
      });
    },
  };
}
