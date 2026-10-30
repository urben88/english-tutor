import { act, renderHook, waitFor } from "@testing-library/react";
import type { TutorApi } from "../api/client";
import type { Player } from "../audio/player";
import { useTutor } from "./useTutor";

function api(): TutorApi {
  const turn = { user_text: "hi", reply_text: "yo", audio: "QUJD", sample_rate: 16000 };
  return {
    listSessions: vi.fn().mockResolvedValue([{ id: 1 }]),
    createSession: vi.fn(),
    messages: vi.fn().mockResolvedValue([]),
    voiceTurn: vi.fn().mockResolvedValue(turn),
    textTurn: vi.fn().mockResolvedValue(turn),
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
});
