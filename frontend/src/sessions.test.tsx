import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "./App";
import type { TutorApi } from "./api/client";
import type { Analysis, SessionSummary, StudyItem } from "./api/types";
import type { Mic } from "./audio/mic";
import type { Player } from "./audio/player";
import type { Recorder } from "./audio/recorder";

/** The stylesheet text (vitest blanks CSS imports, so read the file directly). */
type NodeFs = { readFileSync(path: string, enc: string): string };
const fs = (globalThis as unknown as { process: { getBuiltinModule(id: string): NodeFs } }).process.getBuiltinModule("node:fs");
const css = fs.readFileSync("src/styles.css", "utf8").replace(/\r\n/g, "\n");

const SENTENCE = "She has been living here.";
const ANALYSIS: Analysis = {
  text: SENTENCE,
  message_id: 11,
  structure: "Sujeto + present perfect continuous + lugar.",
  tokens: [
    { text: "She", translation: "ella", explanation: "Pronombre sujeto.", part_of_speech: "pronoun", tense: null, notes: "" },
    {
      text: "has been living",
      translation: "ha estado viviendo",
      explanation: "Acción que sigue ahora.",
      part_of_speech: "verb",
      tense: "present perfect continuous",
      notes: "have/has + been + -ing",
    },
  ],
};

const session = (id: number, role: string | null = null): SessionSummary => ({
  id,
  persona: "tutor",
  role,
  created_at: "",
  updated_at: "",
  message_count: 2,
});

const word: StudyItem = {
  id: 5,
  text: "living",
  source_text: SENTENCE,
  session_id: 1,
  message_id: 11,
  translation: "viviendo",
  explanation: "",
  examples: [],
  listen_count: 1,
  created_at: 1,
  updated_at: 1,
};

function fakeApi(over: Partial<TutorApi> = {}): TutorApi {
  const turn = { user_text: "hi", reply_text: "yo", audio: "", sample_rate: 16000 };
  return {
    persona: vi.fn().mockResolvedValue({ name: "Tutor", stem: "tutor" }),
    listSessions: vi.fn().mockResolvedValue([session(1, "job interview"), session(0)]),
    createSession: vi.fn().mockResolvedValue({ id: 2 }),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    messages: vi.fn().mockResolvedValue([
      { id: 10, role: "user", content: "My question" },
      { id: 11, role: "assistant", content: SENTENCE },
    ]),
    voiceTurn: vi.fn().mockResolvedValue(turn),
    textTurn: vi.fn().mockResolvedValue(turn),
    explain: vi.fn().mockResolvedValue({ text: "x", translation: "x", explanation: "x", examples: [] }),
    tts: vi.fn().mockResolvedValue({ audio: "", sample_rate: 24000 }),
    listStudy: vi.fn().mockResolvedValue([word]),
    saveStudy: vi.fn().mockResolvedValue(word),
    updateStudy: vi.fn(),
    deleteStudy: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ answer_length: "medium", context_tokens: 0 }),
    saveSettings: vi.fn().mockImplementation(async (p) => ({ answer_length: "medium", context_tokens: 0, ...p })),
    analyze: vi.fn().mockResolvedValue(ANALYSIS),
    ...over,
  };
}

let frames: (v: number) => void = () => {};
const mic: Mic = {
  start: vi.fn(async (cb) => {
    frames = (v) => cb(new Float32Array(1600).fill(v));
    return 16000;
  }),
  stop: vi.fn(),
};
const recorder: Recorder = { start: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), cancel: vi.fn() };
const player: Player = { play: vi.fn().mockResolvedValue(undefined), stop: vi.fn() };
const mount = (api: TutorApi) => render(<App api={api} recorder={recorder} mic={mic} player={player} />);
const subtitles = async () => within(await screen.findByRole("region", { name: "Subtitles" }));

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("S1 voice orb", () => {
  it("is a round button that mutes the mic and reflects the state", async () => {
    mount(fakeApi());
    const orb = await screen.findByTestId("voice-orb");
    await waitFor(() => expect(orb).toHaveAttribute("data-state", "listening"));
    expect(orb).toHaveAccessibleName(/mute/i);
    expect(orb).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(orb);
    expect(orb).toHaveAttribute("aria-pressed", "true");
    expect(orb).toHaveAttribute("data-state", "muted");
    expect(orb).toHaveAccessibleName(/unmute/i);
    expect(screen.getByRole("status")).toHaveTextContent("Muted");
  });

  it("shows thinking while the tutor answers, keeping mute as mic-only", async () => {
    let finish: (v: unknown) => void = () => {};
    const api = fakeApi({ textTurn: vi.fn(() => new Promise((r) => (finish = r))) as unknown as TutorApi["textTurn"] });
    mount(api);
    const orb = await screen.findByTestId("voice-orb");
    await screen.findByRole("button", { name: "She" });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    await waitFor(() => expect(orb).toHaveAttribute("data-state", "thinking"));
    fireEvent.click(orb);
    expect(orb).toHaveAttribute("data-state", "thinking");
    expect(orb).toHaveAttribute("data-muted", "true");
    await act(async () => finish({ user_text: "hello", reply_text: "yo", audio: "", sample_rate: 16000 }));
  });

  it("in hold-to-talk mode the orb is the hold button", async () => {
    localStorage.setItem("voiceMode", "hold");
    mount(fakeApi());
    const orb = await screen.findByRole("button", { name: /hold to talk/i });
    expect(orb).toHaveAttribute("data-testid", "voice-orb");
    await waitFor(() => expect(orb).toBeEnabled());
    fireEvent.pointerDown(orb);
    await waitFor(() => expect(orb).toHaveAttribute("data-state", "listening"));
    expect(screen.getByRole("button", { name: /^mute/i })).toBeInTheDocument();
  });

  it("follows the mic level through a CSS variable", async () => {
    mount(fakeApi());
    const orb = await screen.findByTestId("voice-orb");
    await waitFor(() => expect(orb).toHaveAttribute("data-state", "listening"));
    act(() => frames(0.3));
    await waitFor(() => expect(Number(orb.style.getPropertyValue("--orb-level"))).toBeGreaterThan(0));
  });

  it("has static states when the user prefers reduced motion", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[^@]*\.voice-orb[^}]*animation: none/);
  });
});

describe("S2 role sessions", () => {
  it("creates a session with the role the user writes", async () => {
    const api = fakeApi();
    mount(api);
    fireEvent.click(await screen.findByRole("button", { name: "New session" }));
    const dialog = await screen.findByRole("dialog", { name: "New session" });
    const input = within(dialog).getByRole("textbox", { name: /role or topic/i });
    expect(input).toHaveAttribute("maxlength", "200");
    fireEvent.change(input, { target: { value: "waiter at a restaurant" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Start" }));
    await waitFor(() => expect(api.createSession).toHaveBeenCalledWith("waiter at a restaurant"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("the role is optional", async () => {
    const api = fakeApi();
    mount(api);
    fireEvent.click(await screen.findByRole("button", { name: "New session" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Start" }));
    await waitFor(() => expect(api.createSession).toHaveBeenCalledTimes(1));
    expect((api.createSession as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBeUndefined();
  });

  it("shows the role in the session list and for the current session", async () => {
    mount(fakeApi());
    expect(await screen.findByRole("option", { name: /job interview/ })).toBeInTheDocument();
    expect(screen.getByTestId("session-role")).toHaveTextContent("job interview");
  });
});

describe("dialog focus trap", () => {
  it("Tab and Shift+Tab wrap inside an open dialog", async () => {
    mount(fakeApi());
    fireEvent.click(await screen.findByRole("button", { name: "New session" }));
    const dialog = await screen.findByRole("dialog", { name: "New session" });
    const input = within(dialog).getByRole("textbox");
    const start = within(dialog).getByRole("button", { name: "Start" });
    expect(input).toHaveFocus();
    start.focus();
    fireEvent.keyDown(start, { key: "Tab" });
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expect(start).toHaveFocus();
  });
});

describe("S3 message icon buttons", () => {
  it("Read again, Explain again, Explain simpler and Analyze are distinct icon buttons with tooltips", async () => {
    mount(fakeApi());
    const subs = await subtitles();
    const names = ["Read again", "Explain again", "Explain simpler", "Analyze"];
    const icons = names.map((name) => {
      const b = subs.getByRole("button", { name });
      expect(b).toHaveAttribute("title", name);
      const svg = b.querySelector("svg");
      expect(svg).not.toBeNull();
      return svg!.innerHTML;
    });
    expect(new Set(icons).size).toBe(4);
  });
});

describe("S4 delete history and words", () => {
  it("asks before deleting a session; cancel keeps it", async () => {
    const api = fakeApi();
    mount(api);
    fireEvent.click(await screen.findByRole("button", { name: "Delete session" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/job interview/);
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(api.deleteSession).not.toHaveBeenCalled();
  });

  it("deleting the current session removes it and opens another", async () => {
    const api = fakeApi({
      listSessions: vi.fn().mockResolvedValueOnce([session(1, "job interview"), session(0)]).mockResolvedValue([session(0)]),
    });
    mount(api);
    fireEvent.click(await screen.findByRole("button", { name: "Delete session" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(api.deleteSession).toHaveBeenCalledWith(1));
    await waitFor(() => expect(api.messages).toHaveBeenLastCalledWith(0));
    expect(screen.queryByRole("option", { name: /job interview/ })).not.toBeInTheDocument();
  });

  it("deletes one study word after confirming", async () => {
    const api = fakeApi();
    mount(api);
    const panel = within(screen.getByRole("complementary", { name: "Study" }));
    fireEvent.click(await panel.findByRole("button", { name: "Delete living" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(api.deleteStudy).toHaveBeenCalledWith(5));
    await waitFor(() => expect(panel.queryByText("living")).not.toBeInTheDocument());
  });

  it("keeps the word when the delete fails", async () => {
    const api = fakeApi({ deleteStudy: vi.fn().mockRejectedValue(new Error("nope")) });
    mount(api);
    const panel = within(screen.getByRole("complementary", { name: "Study" }));
    fireEvent.click(await panel.findByRole("button", { name: "Delete living" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("nope")).toBeInTheDocument();
    expect(panel.getByText("living")).toBeInTheDocument();
  });
});

describe("S5 sentence analysis popup", () => {
  it("Analyze opens a dialog with the structure and every token", async () => {
    const api = fakeApi();
    mount(api);
    fireEvent.click((await subtitles()).getByRole("button", { name: "Analyze" }));
    const dialog = await screen.findByRole("dialog", { name: "Sentence analysis" });
    await waitFor(() => expect(api.analyze).toHaveBeenCalledWith(SENTENCE, 11));
    expect(await within(dialog).findByText(ANALYSIS.structure)).toBeInTheDocument();
    expect(within(dialog).getByText("ha estado viviendo")).toBeInTheDocument();
    expect(within(dialog).getByText("Acción que sigue ahora.")).toBeInTheDocument();
    expect(within(dialog).getByText("verb")).toBeInTheDocument();
    expect(within(dialog).getByText("present perfect continuous")).toBeInTheDocument();
    expect(within(dialog).getByText("have/has + been + -ing")).toBeInTheDocument();
    expect(within(dialog).getAllByText(/tense/i)).toHaveLength(1); // only the token that has one
  });

  it("shows loading, then an error when the analysis fails", async () => {
    let fail: (e: Error) => void = () => {};
    const api = fakeApi({ analyze: vi.fn(() => new Promise((_, rej) => (fail = rej))) as unknown as TutorApi["analyze"] });
    mount(api);
    fireEvent.click((await subtitles()).getByRole("button", { name: "Analyze" }));
    const dialog = await screen.findByRole("dialog", { name: "Sentence analysis" });
    expect(await within(dialog).findByText(/analyzing/i)).toBeInTheDocument();
    await act(async () => fail(new Error("The model returned unusable output (502)")));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/unusable output/);
  });

  it("Escape closes it and focus stays inside while open", async () => {
    mount(fakeApi());
    const analyze = (await subtitles()).getByRole("button", { name: "Analyze" });
    analyze.focus();
    fireEvent.click(analyze);
    const dialog = await screen.findByRole("dialog", { name: "Sentence analysis" });
    await within(dialog).findByText(ANALYSIS.structure);
    within(dialog).getByRole("button", { name: "Close" }).focus();
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.activeElement).toBe(analyze);
  });
});

describe("S6 settings", () => {
  it("loads the saved settings and saves the new ones", async () => {
    const api = fakeApi({ getSettings: vi.fn().mockResolvedValue({ answer_length: "short", context_tokens: 2048 }) });
    mount(api);
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    await waitFor(() => expect(within(dialog).getByRole("radio", { name: "Short" })).toBeChecked());
    expect(within(dialog).getByRole("spinbutton", { name: /context/i })).toHaveValue(2048);
    fireEvent.click(within(dialog).getByRole("radio", { name: "Long" }));
    fireEvent.click(within(dialog).getByRole("radio", { name: "Automatic" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.saveSettings).toHaveBeenCalledWith({ answer_length: "long", context_tokens: 0 }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("rejects a context budget outside 256-131072 without calling the API", async () => {
    const api = fakeApi();
    mount(api);
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    await waitFor(() => expect(within(dialog).getByRole("radio", { name: "Medium" })).toBeChecked());
    fireEvent.click(within(dialog).getByRole("radio", { name: "Custom" }));
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /context/i }), { target: { value: "100" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/256.*131072/);
    expect(api.saveSettings).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /context/i }), { target: { value: "4096" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.saveSettings).toHaveBeenCalledWith({ answer_length: "medium", context_tokens: 4096 }));
  });
});
