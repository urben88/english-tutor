import { createBrowserPlayer } from "./player";

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  paused = true;

  constructor(src?: string) {
    this.src = src ?? "";
    FakeAudio.instances.push(this);
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  finish() {
    this.onended?.();
  }
}

beforeEach(() => {
  FakeAudio.instances = [];
  vi.stubGlobal("Audio", FakeAudio);
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
});

describe("browser player queue", () => {
  it("keeps the current clip and queues an appended one behind it", async () => {
    const heard: HTMLAudioElement[] = [];
    const player = createBrowserPlayer((audio) => heard.push(audio));
    const first = player.play("QQ==");
    const second = player.play("Qg==", true);

    expect(FakeAudio.instances).toHaveLength(2); // the appended clip is preloaded...
    expect(FakeAudio.instances[1].paused).toBe(true); // ...but does not play yet
    expect(heard).toHaveLength(1); // only the playing clip is announced (lip-sync)

    FakeAudio.instances[0].finish();
    await first;
    expect(FakeAudio.instances[1].paused).toBe(false); // the queue starts when the first ends
    expect(heard).toHaveLength(2);

    FakeAudio.instances[1].finish();
    await second;
  });

  it("append=false replaces the current clip", async () => {
    const player = createBrowserPlayer();
    const first = player.play("QQ==");
    const second = player.play("Qg==");
    await first; // resolved because it was replaced
    expect(FakeAudio.instances).toHaveLength(2);
    await Promise.resolve();
    expect(FakeAudio.instances[1].paused).toBe(false);
    FakeAudio.instances[1].finish();
    await second;
  });

  it("stop clears the queue and resolves every pending clip", async () => {
    const player = createBrowserPlayer();
    const first = player.play("QQ==");
    const second = player.play("Qg==", true);
    player.stop();
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
    expect(FakeAudio.instances).toHaveLength(2);
    expect(FakeAudio.instances.every((a) => a.paused)).toBe(true);
  });
});
