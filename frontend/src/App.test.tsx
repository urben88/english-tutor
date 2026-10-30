import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";
import type { TutorApi } from "./api/client";
import type { Player } from "./audio/player";
import type { Mic } from "./audio/mic";
import type { Recorder } from "./audio/recorder";

const CONTEXT = "Hello, world! It's nice.";

function fakeApi(overrides: Partial<TutorApi> = {}): TutorApi {
  const turn = { user_text: "hi", reply_text: "yo", audio: "", sample_rate: 16000 };
  return {
    persona: vi.fn().mockResolvedValue({ name: "Tutor", stem: "tutor" }),
    listSessions: vi
      .fn()
      .mockResolvedValue([
        { id: 1, persona: "tutor", created_at: "", updated_at: "", message_count: 1 },
      ]),
    createSession: vi.fn().mockResolvedValue({ id: 2 }),
    messages: vi.fn().mockResolvedValue([{ id: 10, role: "assistant", content: CONTEXT }]),
    voiceTurn: vi.fn().mockResolvedValue(turn),
    textTurn: vi.fn().mockResolvedValue(turn),
    explain: vi.fn().mockResolvedValue({
      text: "world",
      translation: "mundo",
      explanation: "Significa planeta.",
      examples: ["Hello, world."],
    }),
    ...overrides,
  };
}

function fakeRecorder(): Recorder {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue({ samples: new Float32Array(1600), sampleRate: 16000 }),
    cancel: vi.fn().mockResolvedValue(undefined),
  };
}

function fakeMic() {
  let push: (f: Float32Array) => void = () => {};
  const mic: Mic = {
    start: vi.fn(async (cb) => {
      push = cb;
      return 16000;
    }),
    stop: vi.fn(),
  };
  const frames = (n: number, v: number) =>
    act(() => {
      for (let i = 0; i < n; i++) push(new Float32Array(1600).fill(v)); // 100 ms each
    });
  /** 500 ms of speech followed by 1.1 s of silence. */
  const say = async () => {
    await frames(5, 0.3);
    await frames(11, 0);
  };
  return { mic, frames, say };
}

const player: Player = { play: vi.fn().mockResolvedValue(undefined), stop: vi.fn() };

describe("click to explain", () => {
  it("clicking a word calls explain with the word and the message as context", async () => {
    const api = fakeApi();
    render(<App api={api} recorder={fakeRecorder()} mic={fakeMic().mic} player={player} />);
    fireEvent.click(await screen.findByRole("button", { name: "world" }));
    await waitFor(() => expect(api.explain).toHaveBeenCalledWith("world", CONTEXT));
    expect(await screen.findByText("mundo")).toBeInTheDocument();
  });

  it("shows an error state when explain fails", async () => {
    const api = fakeApi({ explain: vi.fn().mockRejectedValue(new Error("boom")) });
    render(<App api={api} recorder={fakeRecorder()} mic={fakeMic().mic} player={player} />);
    fireEvent.click(await screen.findByRole("button", { name: "world" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("boom");
  });

  it("selecting a phrase inside a message shows Explain, which sends the phrase", async () => {
    const api = fakeApi();
    render(<App api={api} recorder={fakeRecorder()} mic={fakeMic().mic} player={player} />);
    const first = (await screen.findByRole("button", { name: "Hello" })).firstChild!;
    const second = screen.getByRole("button", { name: "world" }).firstChild!;
    window.getSelection()!.setBaseAndExtent(first, 0, second, 5);
    fireEvent.mouseUp(first.parentElement!);
    fireEvent.click(await screen.findByRole("button", { name: "Explain" }));
    await waitFor(() => expect(api.explain).toHaveBeenCalledWith("Hello, world", CONTEXT));
  });
});

describe("hold to talk", () => {
  let nowMs = 0;
  beforeEach(() => {
    localStorage.setItem("voiceMode", "hold");
    nowMs = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => nowMs);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("ignores presses shorter than 0.3 s", async () => {
    const api = fakeApi();
    const recorder = fakeRecorder();
    render(<App api={api} recorder={recorder} player={player} />);
    const talk = await screen.findByRole("button", { name: /hold to talk/i });
    await waitFor(() => expect(talk).toBeEnabled());
    fireEvent.pointerDown(talk);
    await waitFor(() => expect(recorder.start).toHaveBeenCalled());
    nowMs += 100;
    fireEvent.pointerUp(talk);
    await waitFor(() => expect(recorder.cancel).toHaveBeenCalled());
    expect(recorder.stop).not.toHaveBeenCalled();
    expect(api.voiceTurn).not.toHaveBeenCalled();
  });

  it("sends a WAV for longer presses (Space key) and shows listening state", async () => {
    const api = fakeApi();
    const recorder = fakeRecorder();
    render(<App api={api} recorder={recorder} player={player} />);
    const talk = await screen.findByRole("button", { name: /hold to talk/i });
    await waitFor(() => expect(talk).toBeEnabled());
    fireEvent.keyDown(window, { code: "Space", key: " " });
    await waitFor(() => expect(talk).toHaveAttribute("data-state", "listening"));
    nowMs += 800;
    await act(async () => {
      fireEvent.keyUp(window, { code: "Space", key: " " });
    });
    await waitFor(() => expect(api.voiceTurn).toHaveBeenCalledTimes(1));
    expect(api.voiceTurn).toHaveBeenCalledWith(1, expect.any(Blob));
  });

  it("ignores Space while typing in the text input", async () => {
    const recorder = fakeRecorder();
    render(<App api={fakeApi()} recorder={recorder} player={player} />);
    const input = await screen.findByRole("textbox");
    fireEvent.keyDown(input, { code: "Space", key: " " });
    expect(recorder.start).not.toHaveBeenCalled();
  });
});

describe("hands-free", () => {
  beforeEach(() => localStorage.clear());
  const status = () => screen.getByRole("status");

  it("starts listening by default, with no hold button", async () => {
    const { mic } = fakeMic();
    render(<App api={fakeApi()} recorder={fakeRecorder()} mic={mic} player={player} />);
    await waitFor(() => expect(status()).toHaveTextContent("Listening"));
    expect(mic.start).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /hold to talk/i })).not.toBeInTheDocument();
  });

  it("sends the phrase on silence, pauses while the tutor speaks and resumes after", async () => {
    let endPlayback: () => void = () => {};
    const slowPlayer: Player = {
      play: vi.fn(() => new Promise<void>((r) => (endPlayback = r))),
      stop: vi.fn(() => endPlayback()),
    };
    const api = fakeApi({
      voiceTurn: vi.fn().mockResolvedValue({ user_text: "a", reply_text: "b", audio: "QUJD", sample_rate: 16000 }),
    });
    const { mic, say } = fakeMic();
    render(<App api={api} recorder={fakeRecorder()} mic={mic} player={slowPlayer} />);
    await screen.findByRole("button", { name: "world" }); // session loaded
    await waitFor(() => expect(status()).toHaveTextContent("Listening"));
    await say();
    await waitFor(() => expect(api.voiceTurn).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(status()).toHaveTextContent("Speaking"));
    await say(); // the tutor is talking: ignored
    expect(api.voiceTurn).toHaveBeenCalledTimes(1);
    await act(async () => endPlayback());
    await waitFor(() => expect(status()).toHaveTextContent("Listening"));
    await say();
    await waitFor(() => expect(api.voiceTurn).toHaveBeenCalledTimes(2));
  });

  it("Stop cuts the reply and listening resumes", async () => {
    let endPlayback: () => void = () => {};
    const slowPlayer: Player = {
      play: vi.fn(() => new Promise<void>((r) => (endPlayback = r))),
      stop: vi.fn(() => endPlayback()),
    };
    const api = fakeApi({
      voiceTurn: vi.fn().mockResolvedValue({ user_text: "a", reply_text: "b", audio: "QUJD", sample_rate: 16000 }),
    });
    const { mic, say } = fakeMic();
    render(<App api={api} recorder={fakeRecorder()} mic={mic} player={slowPlayer} />);
    await screen.findByRole("button", { name: "world" }); // session loaded
    await waitFor(() => expect(status()).toHaveTextContent("Listening"));
    expect(screen.getByRole("button", { name: /stop/i })).toBeDisabled();
    await say();
    await waitFor(() => expect(status()).toHaveTextContent("Speaking"));
    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    await waitFor(() => expect(status()).toHaveTextContent("Listening"));
    expect(slowPlayer.stop).toHaveBeenCalled();
  });

  it("mute (button and M key) stops sending and shows Muted", async () => {
    const api = fakeApi();
    const { mic, say } = fakeMic();
    render(<App api={api} recorder={fakeRecorder()} mic={mic} player={player} />);
    await screen.findByRole("button", { name: "world" }); // session loaded
    await waitFor(() => expect(status()).toHaveTextContent("Listening"));
    const mute = screen.getByRole("button", { name: /mute/i });
    expect(mute).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(mute);
    expect(status()).toHaveTextContent("Muted");
    expect(mute).toHaveAttribute("aria-pressed", "true");
    await say();
    expect(api.voiceTurn).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { code: "KeyM", key: "m" });
    expect(status()).toHaveTextContent("Listening");
    fireEvent.keyDown(screen.getByRole("textbox"), { code: "KeyM", key: "m" });
    expect(status()).toHaveTextContent("Listening"); // typing an m does not mute
    fireEvent.keyDown(window, { code: "KeyM", key: "m" });
    expect(status()).toHaveTextContent("Muted");
  });

  it("the mode switch persists in localStorage and releases the mic", async () => {
    const { mic } = fakeMic();
    const { unmount } = render(<App api={fakeApi()} recorder={fakeRecorder()} mic={mic} player={player} />);
    await waitFor(() => expect(status()).toHaveTextContent("Listening"));
    fireEvent.click(screen.getByRole("radio", { name: "Hold to talk" }));
    expect(localStorage.getItem("voiceMode")).toBe("hold");
    expect(await screen.findByRole("button", { name: /hold to talk/i })).toBeInTheDocument();
    expect(mic.stop).toHaveBeenCalled();
    unmount();
    render(<App api={fakeApi()} recorder={fakeRecorder()} mic={fakeMic().mic} player={player} />);
    expect(await screen.findByRole("button", { name: /hold to talk/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Hold to talk" })).toBeChecked();
  });

  it("shows a clear message when the mic is denied and typing still works", async () => {
    const { mic } = fakeMic();
    (mic.start as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("denied"));
    const api = fakeApi();
    render(<App api={api} recorder={fakeRecorder()} mic={mic} player={player} />);
    expect((await screen.findAllByText(/could not access the microphone/i)).length).toBeGreaterThan(0);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(api.textTurn).toHaveBeenCalledWith(1, "hello"));
  });
});
