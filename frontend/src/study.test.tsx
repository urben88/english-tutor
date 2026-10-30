import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "./App";
import type { TutorApi } from "./api/client";
import type { StudyItem } from "./api/types";
import type { Mic } from "./audio/mic";
import type { Player } from "./audio/player";
import type { Recorder } from "./audio/recorder";
import { ExplanationTabs } from "./components/molecules/ExplanationTabs";
import { StudyPanel } from "./components/organisms/StudyPanel";

const SENTENCE = "Hello, world!";
const EXPLANATION = { text: "world", translation: "mundo", explanation: "Sustantivo contable.", examples: ["The world is big."] };

const item = (over: Partial<StudyItem> = {}): StudyItem => ({
  id: 1,
  text: "world",
  source_text: SENTENCE,
  session_id: 1,
  message_id: 11,
  translation: "mundo",
  explanation: "Sustantivo contable.",
  examples: ["The world is big."],
  listen_count: 2,
  created_at: 1,
  updated_at: 2,
  ...over,
});

function fakeApi(over: Partial<TutorApi> = {}): TutorApi {
  const turn = { user_text: "hi", reply_text: "yo", audio: "", sample_rate: 16000 };
  return {
    persona: vi.fn().mockResolvedValue({ name: "Tutor", stem: "tutor" }),
    listSessions: vi.fn().mockResolvedValue([
      { id: 1, persona: "tutor", created_at: "", updated_at: "", message_count: 2 },
      { id: 0, persona: "tutor", created_at: "", updated_at: "", message_count: 1 },
    ]),
    createSession: vi.fn().mockResolvedValue({ id: 2 }),
    messages: vi.fn().mockImplementation(async (id: number) =>
      id === 0
        ? [{ id: 5, role: "assistant", content: "An old message." }]
        : [
            { id: 10, role: "user", content: "My question" },
            { id: 11, role: "assistant", content: SENTENCE },
          ],
    ),
    voiceTurn: vi.fn().mockResolvedValue(turn),
    textTurn: vi.fn().mockResolvedValue(turn),
    explain: vi.fn().mockResolvedValue(EXPLANATION),
    tts: vi.fn().mockResolvedValue({ audio: "QUJD", sample_rate: 24000 }),
    listStudy: vi.fn().mockResolvedValue([]),
    saveStudy: vi.fn().mockImplementation(async (d) => item({ ...d, id: d.text === "old" ? 2 : d.text === "world" ? 1 : 7 })),
    updateStudy: vi.fn(),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    deleteStudy: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ answer_length: "medium", context_tokens: 0 }),
    saveSettings: vi.fn().mockImplementation(async (p) => ({ answer_length: "medium", context_tokens: 0, ...p })),
    analyze: vi.fn().mockResolvedValue({ text: "", message_id: null, structure: "", tokens: [] }),
    ...over,
  };
}

const recorder: Recorder = { start: vi.fn(), stop: vi.fn(), cancel: vi.fn() };
const mic: Mic = { start: vi.fn().mockResolvedValue(16000), stop: vi.fn() };
let player: Player;
const mount = (api: TutorApi) => render(<App api={api} recorder={recorder} mic={mic} player={player} />);
const subtitles = async () => within(await screen.findByRole("region", { name: "Subtitles" }));
const studyPanel = () => within(screen.getByRole("complementary", { name: "Study" }));

beforeEach(() => {
  localStorage.setItem("voiceMode", "hold");
  player = { play: vi.fn().mockResolvedValue(undefined), stop: vi.fn() };
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => localStorage.clear());

describe("word click: listen first", () => {
  it("plays the word and saves it, without explaining", async () => {
    const api = fakeApi();
    mount(api);
    fireEvent.click((await subtitles()).getByRole("button", { name: "world" }));
    await waitFor(() => expect(api.tts).toHaveBeenCalledWith("world", 1));
    await waitFor(() => expect(player.play).toHaveBeenCalledWith("QUJD"));
    expect(api.saveStudy).toHaveBeenCalledWith({
      text: "world",
      source_text: SENTENCE,
      session_id: 1,
      message_id: 11,
    });
    expect(api.explain).not.toHaveBeenCalled();
    expect(await studyPanel().findByRole("button", { name: "Explain this" })).toBeInTheDocument();
  });

  it("the saved word shows up in the study list", async () => {
    mount(fakeApi());
    fireEvent.click((await subtitles()).getByRole("button", { name: "world" }));
    expect(await studyPanel().findByRole("button", { name: "Play world" })).toBeInTheDocument();
  });

  it("a selected phrase has Listen, which plays the phrase", async () => {
    const api = fakeApi();
    mount(api);
    const subs = await subtitles();
    const first = subs.getByRole("button", { name: "Hello" }).firstChild!;
    const second = subs.getByRole("button", { name: "world" }).firstChild!;
    window.getSelection()!.setBaseAndExtent(first, 0, second, 5);
    fireEvent.mouseUp(first.parentElement!);
    fireEvent.click(await subs.findByRole("button", { name: "Listen" }));
    await waitFor(() => expect(api.tts).toHaveBeenCalledWith("Hello, world", 1));
    expect(api.explain).not.toHaveBeenCalled();
  });

  it("the panel replays the word slowly", async () => {
    const api = fakeApi();
    mount(api);
    fireEvent.click((await subtitles()).getByRole("button", { name: "world" }));
    fireEvent.click(await studyPanel().findByRole("button", { name: "Play slowly" }));
    await waitFor(() => expect(api.tts).toHaveBeenCalledWith("world", 0.7));
  });

  it("shows an error when the speech request fails", async () => {
    mount(fakeApi({ tts: vi.fn().mockRejectedValue(new Error("tts down")) }));
    fireEvent.click((await subtitles()).getByRole("button", { name: "world" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("tts down");
  });
});

describe("explain in tabs", () => {
  async function explained(api = fakeApi()) {
    mount(api);
    fireEvent.click((await subtitles()).getByRole("button", { name: "world" }));
    fireEvent.click(await studyPanel().findByRole("button", { name: "Explain this" }));
    await studyPanel().findByRole("tab", { name: "Translation" });
    return api;
  }

  it("explains once and splits it in Translation / Grammar / Examples", async () => {
    const api = await explained();
    expect(api.explain).toHaveBeenCalledTimes(1);
    expect(api.explain).toHaveBeenCalledWith("world", SENTENCE);
    const panel = studyPanel();
    expect(panel.getByRole("tab", { name: "Translation" })).toHaveAttribute("aria-selected", "true");
    expect(panel.getByRole("tabpanel")).toHaveTextContent("mundo");
    fireEvent.click(panel.getByRole("tab", { name: "Grammar" }));
    expect(panel.getByRole("tabpanel")).toHaveTextContent("Sustantivo contable.");
    fireEvent.click(panel.getByRole("tab", { name: "Examples" }));
    expect(panel.getByRole("tabpanel")).toHaveTextContent("The world is big.");
    expect(api.explain).toHaveBeenCalledTimes(1); // switching tabs does not call the model
  });

  it("saves the explanation with the word", async () => {
    const api = await explained();
    await waitFor(() =>
      expect(api.saveStudy).toHaveBeenCalledWith({
        text: "world",
        source_text: SENTENCE,
        session_id: 1,
        message_id: 11,
        translation: "mundo",
        explanation: "Sustantivo contable.",
        examples: ["The world is big."],
      }),
    );
  });

  it("Explain again asks for a new explanation, Explain simpler for an easier one", async () => {
    const api = await explained();
    fireEvent.click(studyPanel().getByRole("button", { name: "Explain again" }));
    await waitFor(() => expect(api.explain).toHaveBeenCalledTimes(2));
    expect(api.explain).toHaveBeenLastCalledWith("world", SENTENCE);
    fireEvent.click(await studyPanel().findByRole("button", { name: "Explain simpler" }));
    await waitFor(() => expect(api.explain).toHaveBeenCalledTimes(3));
    expect(api.explain).toHaveBeenLastCalledWith("world", SENTENCE, true);
  });

  it("shows the error and lets you retry", async () => {
    const api = fakeApi({ explain: vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(EXPLANATION) });
    mount(api);
    fireEvent.click((await subtitles()).getByRole("button", { name: "world" }));
    fireEvent.click(await studyPanel().findByRole("button", { name: "Explain this" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("boom");
    fireEvent.click(studyPanel().getByRole("button", { name: "Explain again" }));
    expect(await studyPanel().findByRole("tab", { name: "Translation" })).toBeInTheDocument();
  });
});

describe("tutor message actions", () => {
  it("Read again replays the whole message", async () => {
    const api = fakeApi();
    mount(api);
    fireEvent.click((await subtitles()).getByRole("button", { name: "Read again" }));
    await waitFor(() => expect(api.tts).toHaveBeenCalledWith(SENTENCE, 1));
    await waitFor(() => expect(player.play).toHaveBeenCalledWith("QUJD"));
    expect(api.saveStudy).not.toHaveBeenCalled(); // not a study item
  });

  it("Explain again / Explain simpler explain the message", async () => {
    const api = fakeApi();
    mount(api);
    const subs = await subtitles();
    fireEvent.click(subs.getByRole("button", { name: "Explain again" }));
    await waitFor(() => expect(api.explain).toHaveBeenCalledWith(SENTENCE, SENTENCE));
    expect(await studyPanel().findByRole("tab", { name: "Grammar" })).toBeInTheDocument();
    fireEvent.click(subs.getByRole("button", { name: "Explain simpler" }));
    await waitFor(() => expect(api.explain).toHaveBeenLastCalledWith(SENTENCE, SENTENCE, true));
  });

  it("only tutor messages have them", async () => {
    mount(fakeApi());
    fireEvent.click(await screen.findByRole("button", { name: /transcript/i }));
    const drawer = within(screen.getByRole("complementary", { name: "Transcript" }));
    expect(drawer.getAllByRole("button", { name: "Read again" })).toHaveLength(1);
  });
});

describe("study panel", () => {
  it("lists saved items with their translation", async () => {
    mount(fakeApi({ listStudy: vi.fn().mockResolvedValue([item()]) }));
    expect(await studyPanel().findByRole("button", { name: "Play world" })).toBeInTheDocument();
    expect(studyPanel().getByText("mundo")).toBeInTheDocument();
  });

  it("shows the saved explanation in tabs only when asked", async () => {
    mount(fakeApi({ listStudy: vi.fn().mockResolvedValue([item()]) }));
    expect(studyPanel().queryByRole("tab")).not.toBeInTheDocument();
    fireEvent.click(await studyPanel().findByRole("button", { name: "Show explanation of world" }));
    fireEvent.click(studyPanel().getByRole("tab", { name: "Grammar" }));
    expect(studyPanel().getByRole("tabpanel")).toHaveTextContent("Sustantivo contable.");
  });

  it("replays an item normal and slow", async () => {
    const api = fakeApi({ listStudy: vi.fn().mockResolvedValue([item()]) });
    mount(api);
    fireEvent.click(await studyPanel().findByRole("button", { name: "Play world" }));
    await waitFor(() => expect(api.tts).toHaveBeenLastCalledWith("world", 1));
    fireEvent.click(studyPanel().getByRole("button", { name: "Play world slowly" }));
    await waitFor(() => expect(api.tts).toHaveBeenLastCalledWith("world", 0.7));
  });

  it("re-explains an item from its source sentence", async () => {
    const api = fakeApi({ listStudy: vi.fn().mockResolvedValue([item({ translation: "", explanation: "", examples: [] })]) });
    mount(api);
    fireEvent.click(await studyPanel().findByRole("button", { name: "Explain world again" }));
    await waitFor(() => expect(api.explain).toHaveBeenCalledWith("world", SENTENCE));
    expect(await studyPanel().findByRole("tab", { name: "Examples" })).toBeInTheDocument();
  });

  it("jumps to the original message in the transcript and highlights it", async () => {
    mount(fakeApi({ listStudy: vi.fn().mockResolvedValue([item()]) }));
    fireEvent.click(await studyPanel().findByRole("button", { name: "Go to message of world" }));
    const drawer = await screen.findByRole("complementary", { name: "Transcript" });
    await waitFor(() => expect(drawer.querySelector('[data-message-id="11"]')).toHaveClass("highlight"));
    expect(drawer.querySelector('[data-message-id="10"]')).not.toHaveClass("highlight");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("opens the other session first when the message belongs to it", async () => {
    const api = fakeApi({
      listStudy: vi.fn().mockResolvedValue([item({ id: 2, text: "old", session_id: 0, message_id: 5, source_text: "An old message." })]),
    });
    mount(api);
    await studyPanel().findByRole("button", { name: "Play old" });
    fireEvent.click(studyPanel().getByRole("button", { name: "Go to message of old" }));
    await waitFor(() => expect(api.messages).toHaveBeenCalledWith(0));
    const drawer = await screen.findByRole("complementary", { name: "Transcript" });
    await waitFor(() => expect(drawer.querySelector('[data-message-id="5"]')).toHaveClass("highlight"));
  });
});

describe("StudyPanel (presentational)", () => {
  const handlers = { onPlay: vi.fn(), onExplain: vi.fn(), onJump: vi.fn(), onDelete: vi.fn() };

  it("shows the empty state", () => {
    render(<StudyPanel items={[]} {...handlers} />);
    expect(screen.getByText(/words you study will appear here/i)).toBeInTheDocument();
  });

  it("calls the handlers with the item", () => {
    const it = item();
    render(<StudyPanel items={[it]} {...handlers} />);
    fireEvent.click(screen.getByRole("button", { name: "Play world slowly" }));
    expect(handlers.onPlay).toHaveBeenCalledWith(it, 0.7);
    fireEvent.click(screen.getByRole("button", { name: "Explain world again" }));
    expect(handlers.onExplain).toHaveBeenCalledWith(it);
    fireEvent.click(screen.getByRole("button", { name: "Go to message of world" }));
    expect(handlers.onJump).toHaveBeenCalledWith(it);
  });

  it("hides the jump button when the message is unknown", () => {
    render(<StudyPanel items={[item({ message_id: null })]} {...handlers} />);
    expect(screen.queryByRole("button", { name: /go to message/i })).not.toBeInTheDocument();
  });
});

describe("ExplanationTabs", () => {
  it("moves between tabs with the arrow keys", () => {
    render(<ExplanationTabs translation="mundo" explanation="Gramática." examples={["One.", "Two."]} />);
    const first = screen.getByRole("tab", { name: "Translation" });
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Grammar" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Gramática.");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Grammar" }), { key: "ArrowRight" });
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    act(() => {});
  });
});
