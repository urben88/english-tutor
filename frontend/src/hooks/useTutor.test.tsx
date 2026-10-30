import { act, renderHook, waitFor } from "@testing-library/react";
import type { TutorApi } from "../api/client";
import type { TurnEvent } from "../api/types";
import type { Player } from "../audio/player";
import { useTutor } from "./useTutor";

function api(streamTurn?: TutorApi["streamTurn"]): TutorApi {
  const turn = { user_text: "hi", reply_text: "yo", audio: "QUJD", sample_rate: 16000 };
  return {
    listSessions: vi.fn().mockResolvedValue([{ id: 1 }]),
    createSession: vi.fn(),
    messages: vi.fn().mockResolvedValue([]),
    voiceTurn: vi.fn().mockResolvedValue(turn),
    textTurn: vi.fn().mockResolvedValue(turn),
    streamTurn:
      streamTurn ??
      (async (_id, _body, onEvent) => {
        onEvent({ type: "reply", text: "yo", audio: "QUJD", sample_rate: 16000 });
        onEvent({ type: "done", reply_text: "yo" });
      }),
  } as unknown as TutorApi;
}

describe("useTutor speaking", () => {
  it("is speaking until playback ends, and stopSpeaking cuts it", async () => {
    let end: () => void = () => {};
    const player: Player = {
      play: vi.fn(() => new Promise<void>((r) => (end = r))),
      stop: vi.fn(() => end()),
    };
    const { result } = renderHook(() => useTutor(api(), player));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => result.current.sendVoice(new Blob(["x"])));
    expect(result.current.speaking).toBe(true);
    await act(async () => end());
    expect(result.current.speaking).toBe(false);

    await act(async () => result.current.sendVoice(new Blob(["x"])));
    expect(result.current.speaking).toBe(true);
    act(() => result.current.stopSpeaking());
    await waitFor(() => expect(result.current.speaking).toBe(false));
    expect(player.stop).toHaveBeenCalled();
  });

  it("plays each reply chunk as it arrives, before the stream ends", async () => {
    const ends: Array<() => void> = [];
    const player: Player = {
      play: vi.fn(() => new Promise<void>((r) => ends.push(r))),
      stop: vi.fn(),
    };
    let finishStream: () => void = () => {};
    const streamDone = new Promise<void>((r) => (finishStream = r));
    const streamTurn = vi.fn(async (_id: unknown, _body: unknown, onEvent: (e: TurnEvent) => void) => {
      onEvent({ type: "reply", text: "first", audio: "QQ==", sample_rate: 16000 });
      onEvent({ type: "reply", text: "second", audio: "Qg==", sample_rate: 16000 });
      await streamDone;
      onEvent({ type: "done", reply_text: "first second" });
    }) as unknown as TutorApi["streamTurn"];

    const { result } = renderHook(() => useTutor(api(streamTurn), player));
    await waitFor(() => expect(result.current.ready).toBe(true));

    let sent: Promise<void> = Promise.resolve();
    act(() => {
      sent = result.current.sendVoice(new Blob(["x"]));
    });
    await waitFor(() => expect(player.play).toHaveBeenCalledTimes(2));
    expect(player.play).toHaveBeenNthCalledWith(1, "QQ==", false);
    expect(player.play).toHaveBeenNthCalledWith(2, "Qg==", true);
    expect(result.current.speaking).toBe(true);

    await act(async () => ends[0]());
    expect(result.current.speaking).toBe(true); // the second clip is still queued

    await act(async () => ends[1]());
    expect(result.current.speaking).toBe(false); // the last clip ended, stream still open

    await act(async () => {
      finishStream();
      await sent;
    });
  });
});
