import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";
import type { TutorApi } from "./api/client";
import type { Player } from "./audio/player";
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

const player: Player = { play: vi.fn().mockResolvedValue(undefined), stop: vi.fn() };

describe("click to explain", () => {
  it("clicking a word calls explain with the word and the message as context", async () => {
    const api = fakeApi();
    render(<App api={api} recorder={fakeRecorder()} player={player} />);
    fireEvent.click(await screen.findByRole("button", { name: "world" }));
    await waitFor(() => expect(api.explain).toHaveBeenCalledWith("world", CONTEXT));
    expect(await screen.findByText("mundo")).toBeInTheDocument();
  });

  it("shows an error state when explain fails", async () => {
    const api = fakeApi({ explain: vi.fn().mockRejectedValue(new Error("boom")) });
    render(<App api={api} recorder={fakeRecorder()} player={player} />);
    fireEvent.click(await screen.findByRole("button", { name: "world" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("boom");
  });

  it("selecting a phrase inside a message shows Explain, which sends the phrase", async () => {
    const api = fakeApi();
    render(<App api={api} recorder={fakeRecorder()} player={player} />);
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
    nowMs = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => nowMs);
  });
  afterEach(() => vi.restoreAllMocks());

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
