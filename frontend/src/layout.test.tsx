import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "./App";
import type { TutorApi } from "./api/client";
import type { Mic } from "./audio/mic";
import type { Player } from "./audio/player";
import type { Recorder } from "./audio/recorder";
import { CharacterStage, toCharacterState } from "./components/organisms/CharacterStage";
import { StudyPanel } from "./components/organisms/StudyPanel";

const turn = { user_text: "hi", reply_text: "yo", audio: "", sample_rate: 16000 };

function fakeApi(): TutorApi {
  return {
    persona: vi.fn().mockResolvedValue({ name: "Tutor", stem: "tutor" }),
    listSessions: vi.fn().mockResolvedValue([
      { id: 1, persona: "tutor", created_at: "2026-10-30T10:00:00", updated_at: "2026-10-30T10:05:00", message_count: 2 },
      { id: 0, persona: "tutor", created_at: "2026-10-29T10:00:00", updated_at: "2026-10-29T10:05:00", message_count: 4 },
    ]),
    createSession: vi.fn().mockResolvedValue({ id: 2 }),
    messages: vi.fn().mockImplementation(async (id: number) =>
      id === 0
        ? [{ id: 5, role: "assistant", content: "Old chat." }]
        : [
            { id: 10, role: "user", content: "My question" },
            { id: 11, role: "assistant", content: "Hello, world!" },
          ],
    ),
    voiceTurn: vi.fn().mockResolvedValue(turn),
    textTurn: vi.fn().mockResolvedValue(turn),
    explain: vi.fn(),
    tts: vi.fn().mockResolvedValue({ audio: "", sample_rate: 24000 }),
    listStudy: vi.fn().mockResolvedValue([]),
    saveStudy: vi.fn().mockResolvedValue({}),
    updateStudy: vi.fn(),
  };
}
const recorder: Recorder = { start: vi.fn(), stop: vi.fn(), cancel: vi.fn() };
const mic: Mic = { start: vi.fn().mockResolvedValue(16000), stop: vi.fn() };
const player: Player = { play: vi.fn().mockResolvedValue(undefined), stop: vi.fn() };
const mount = () => render(<App api={fakeApi()} recorder={recorder} mic={mic} player={player} />);

describe("CharacterStage", () => {
  it("exposes the state and a mount point for the future 3D model", () => {
    const { rerender } = render(<CharacterStage state="idle" />);
    const stage = screen.getByTestId("character-stage");
    expect(stage).toHaveAttribute("data-state", "idle");
    expect(screen.getByTestId("character-mount")).toBeInTheDocument();
    rerender(<CharacterStage state="speaking" />);
    expect(stage).toHaveAttribute("data-state", "speaking");
  });

  it("renders children instead of the placeholder", () => {
    render(
      <CharacterStage state="thinking">
        <canvas data-testid="model" />
      </CharacterStage>,
    );
    expect(within(screen.getByTestId("character-mount")).getByTestId("model")).toBeInTheDocument();
    expect(screen.queryByTestId("character-placeholder")).not.toBeInTheDocument();
  });

  it("maps voice statuses to character states", () => {
    expect(toCharacterState("hearing")).toBe("listening");
    expect(toCharacterState("listening")).toBe("listening");
    expect(toCharacterState("muted")).toBe("idle");
    expect(toCharacterState("thinking")).toBe("thinking");
    expect(toCharacterState("speaking")).toBe("speaking");
  });
});

describe("StudyPanel", () => {
  it("shows an empty state and a slot for the explanation", () => {
    render(
      <StudyPanel items={[]} onPlay={vi.fn()} onExplain={vi.fn()} onJump={vi.fn()}>
        <p>current explanation</p>
      </StudyPanel>,
    );
    expect(screen.getByRole("complementary", { name: "Study" })).toBeInTheDocument();
    expect(screen.getByText(/words you study will appear here/i)).toBeInTheDocument();
    expect(screen.getByText("current explanation")).toBeInTheDocument();
  });

  it("lists items given by the caller", () => {
    const it = { id: 1, text: "world", source_text: "Hello, world!", session_id: 1, message_id: 2, translation: "mundo", explanation: "", examples: [], listen_count: 1, created_at: 0, updated_at: 0 };
    render(<StudyPanel items={[it]} onPlay={vi.fn()} onExplain={vi.fn()} onJump={vi.fn()} />);
    expect(screen.getByText("world")).toBeInTheDocument();
    expect(screen.queryByText(/words you study will appear here/i)).not.toBeInTheDocument();
  });
});

describe("app layout", () => {
  beforeEach(() => localStorage.clear());

  it("shows the latest exchange as clickable subtitles", async () => {
    mount();
    const subs = await screen.findByRole("region", { name: "Subtitles" });
    expect(within(subs).getByText(/my question/i)).toBeInTheDocument();
    expect(within(subs).getByRole("button", { name: "world" })).toBeInTheDocument();
  });

  it("the transcript drawer opens with the button and closes with Escape", async () => {
    mount();
    await screen.findByRole("region", { name: "Subtitles" });
    expect(screen.queryByRole("complementary", { name: "Transcript" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /transcript/i }));
    const drawer = screen.getByRole("complementary", { name: "Transcript" });
    expect(within(drawer).getByRole("button", { name: "question" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    expect(screen.queryByRole("complementary", { name: "Transcript" })).not.toBeInTheDocument();
  });

  it("the T key toggles the drawer, but not while typing", async () => {
    mount();
    await screen.findByRole("region", { name: "Subtitles" });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "t", code: "KeyT" });
    expect(screen.queryByRole("complementary", { name: "Transcript" })).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "t", code: "KeyT" });
    expect(screen.getByRole("complementary", { name: "Transcript" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "t", code: "KeyT" });
    expect(screen.queryByRole("complementary", { name: "Transcript" })).not.toBeInTheDocument();
  });

  it("the stage follows the voice state", async () => {
    mount();
    await screen.findByRole("region", { name: "Subtitles" });
    await waitFor(() => expect(screen.getByTestId("character-stage")).toHaveAttribute("data-state", "listening"));
    fireEvent.keyDown(window, { code: "KeyM", key: "m" });
    expect(screen.getByTestId("character-stage")).toHaveAttribute("data-state", "idle");
  });

  it("the mobile tab bar switches the visible area and keeps the controls", async () => {
    mount();
    await screen.findByRole("region", { name: "Subtitles" });
    const app = document.querySelector(".app")!;
    expect(app).toHaveAttribute("data-area", "tutor");
    expect(screen.getByRole("tab", { name: "Tutor" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Study" }));
    expect(app).toHaveAttribute("data-area", "study");
    expect(screen.getByRole("tab", { name: "Study" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Talk" }));
    expect(app).toHaveAttribute("data-area", "talk");
    expect(screen.getByRole("complementary", { name: "Transcript" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mute/i })).toBeInTheDocument();
  });

  it("switches between sessions", async () => {
    mount();
    await screen.findByRole("region", { name: "Subtitles" });
    const select = screen.getByRole("combobox", { name: "Session" });
    fireEvent.change(select, { target: { value: "0" } });
    expect(await screen.findByRole("button", { name: "Old" })).toBeInTheDocument();
  });
});
