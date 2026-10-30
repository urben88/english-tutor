import { act, renderHook, waitFor } from "@testing-library/react";
import type { Mic } from "../audio/mic";
import { useHandsFree } from "./useHandsFree";

const RATE = 16000;
const FRAME = 320;
const loud = () => new Float32Array(FRAME).fill(0.3);
const quiet = () => new Float32Array(FRAME);

function fakeMic() {
  let push: (f: Float32Array) => void = () => {};
  const mic: Mic = {
    start: vi.fn(async (cb) => {
      push = cb;
      return RATE;
    }),
    stop: vi.fn(),
  };
  const feed = (n: number, make: () => Float32Array) =>
    act(() => {
      for (let i = 0; i < n; i++) push(make());
    });
  return { mic, feed };
}

interface Props {
  enabled?: boolean;
  muted?: boolean;
  paused?: boolean;
}

function setup(initial: Props = {}) {
  const { mic, feed } = fakeMic();
  const onAudio = vi.fn().mockResolvedValue(undefined);
  const onError = vi.fn();
  const hook = renderHook(
    (p: Props) =>
      useHandsFree({ mic, onAudio, onError, enabled: true, muted: false, paused: false, ...p }),
    { initialProps: initial },
  );
  return { mic, feed, onAudio, onError, ...hook };
}

const speakThenPause = (feed: ReturnType<typeof fakeMic>["feed"]) => {
  feed(25, loud);
  feed(55, quiet);
};

describe("useHandsFree", () => {
  it("opens the mic once and releases it when disabled or unmounted", async () => {
    const { mic, rerender, unmount } = setup();
    await waitFor(() => expect(mic.start).toHaveBeenCalledTimes(1));
    rerender({ enabled: true, muted: true });
    expect(mic.start).toHaveBeenCalledTimes(1); // mute does not reopen the mic
    rerender({ enabled: false });
    expect(mic.stop).toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(mic.start).toHaveBeenCalledTimes(2));
    unmount();
    expect(mic.stop).toHaveBeenCalledTimes(2);
  });

  it("sends a WAV when the user stops talking", async () => {
    const { mic, feed, onAudio } = setup();
    await waitFor(() => expect(mic.start).toHaveBeenCalled());
    feed(25, loud);
    expect(onAudio).not.toHaveBeenCalled();
    speakThenPause(feed);
    await waitFor(() => expect(onAudio).toHaveBeenCalledTimes(1));
    expect(onAudio.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect((onAudio.mock.calls[0][0] as Blob).type).toBe("audio/wav");
  });

  it("reports hearing while speech is detected", async () => {
    const { mic, feed, result } = setup();
    await waitFor(() => expect(mic.start).toHaveBeenCalled());
    feed(10, loud);
    expect(result.current.hearing).toBe(true);
    expect(result.current.level).toBeGreaterThan(0);
  });

  it("ignores audio while paused (thinking or speaking) and resumes after", async () => {
    const { mic, feed, onAudio, rerender } = setup({ paused: true });
    await waitFor(() => expect(mic.start).toHaveBeenCalled());
    speakThenPause(feed);
    expect(onAudio).not.toHaveBeenCalled();
    rerender({ paused: false });
    speakThenPause(feed);
    await waitFor(() => expect(onAudio).toHaveBeenCalledTimes(1));
  });

  it("discards the utterance when muted in the middle of it", async () => {
    const { mic, feed, onAudio, rerender } = setup();
    await waitFor(() => expect(mic.start).toHaveBeenCalled());
    feed(25, loud);
    rerender({ muted: true });
    feed(5, loud);
    feed(80, quiet);
    rerender({ muted: false });
    feed(80, quiet);
    expect(onAudio).not.toHaveBeenCalled();
  });

  it("does not listen to itself while the previous phrase is being processed", async () => {
    const { mic, feed, onAudio } = setup();
    let finish: () => void = () => {};
    onAudio.mockImplementationOnce(() => new Promise<void>((r) => (finish = r)));
    await waitFor(() => expect(mic.start).toHaveBeenCalled());
    speakThenPause(feed);
    await waitFor(() => expect(onAudio).toHaveBeenCalledTimes(1));
    speakThenPause(feed); // heard while processing: ignored
    await act(async () => finish());
    expect(onAudio).toHaveBeenCalledTimes(1);
  });

  it("reports a clear error when the mic is unavailable", async () => {
    const { mic, onError, result } = setup();
    (mic.start as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Permission denied"));
    const again = renderHook(() =>
      useHandsFree({ mic, onAudio: vi.fn(), onError, enabled: true, muted: false, paused: false }),
    );
    await waitFor(() => expect(again.result.current.micError).toMatch(/microphone/i));
    expect(onError).toHaveBeenCalled();
    expect(result.current.micError).toBeNull();
  });
});
