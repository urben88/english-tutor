import { ApiError, createApi } from "./client";
import type { TurnEvent } from "./types";

function fakeFetch(body: unknown = {}, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}
const call = (f: ReturnType<typeof fakeFetch>) => {
  const [url, init] = f.mock.calls[0] as [string, RequestInit | undefined];
  return { url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined };
};

describe("api client: sessions, study, settings and analysis", () => {
  it("createSession sends the trimmed role, or no body without one", async () => {
    const f = fakeFetch({ id: 3 });
    await createApi(f).createSession("  job interview ");
    expect(call(f)).toEqual({ url: "/api/sessions", method: "POST", body: { role: "job interview" } });
    const g = fakeFetch({ id: 4 });
    await createApi(g).createSession();
    expect(call(g)).toEqual({ url: "/api/sessions", method: "POST", body: undefined });
  });

  it("deleteSession and deleteStudy use DELETE on their ids", async () => {
    const f = fakeFetch({ deleted: 7 });
    await createApi(f).deleteSession(7);
    expect(call(f)).toEqual({ url: "/api/sessions/7", method: "DELETE", body: undefined });
    const g = fakeFetch({ deleted: 5 });
    await createApi(g).deleteStudy(5);
    expect(call(g)).toEqual({ url: "/api/study/5", method: "DELETE", body: undefined });
  });

  it("getSettings reads and saveSettings PUTs only the given fields", async () => {
    const f = fakeFetch({ answer_length: "short", context_tokens: 0 });
    expect(await createApi(f).getSettings()).toEqual({ answer_length: "short", context_tokens: 0 });
    expect(call(f)).toEqual({ url: "/api/settings", method: "GET", body: undefined });
    const g = fakeFetch({ answer_length: "long", context_tokens: 0 });
    await createApi(g).saveSettings({ answer_length: "long" });
    expect(call(g)).toEqual({ url: "/api/settings", method: "PUT", body: { answer_length: "long" } });
  });

  it("analyze posts the text and the message id when given", async () => {
    const f = fakeFetch({ text: "Hi", message_id: 11, structure: "", tokens: [] });
    await createApi(f).analyze("Hi", 11);
    expect(call(f)).toEqual({ url: "/api/analyze", method: "POST", body: { text: "Hi", message_id: 11 } });
    const g = fakeFetch({ text: "Hi", message_id: null, structure: "", tokens: [] });
    await createApi(g).analyze("Hi");
    expect(call(g).body).toEqual({ text: "Hi" });
  });

  it("surfaces the server's detail when analysis fails (502)", async () => {
    const f = fakeFetch({ detail: "The model returned unusable output" }, 502);
    await expect(createApi(f).analyze("Hi")).rejects.toThrow(new ApiError("The model returned unusable output"));
  });
});

describe("api client: turn streaming", () => {
  const ndjson = (events: TurnEvent[]) => events.map((e) => JSON.stringify(e)).join("\n") + "\n";

  it("streamTurn posts text and yields every NDJSON line in order", async () => {
    const events: TurnEvent[] = [
      { type: "user", text: "hi" },
      { type: "reply", text: "Hello.", audio: "QUJD", sample_rate: 24000 },
      { type: "done", reply_text: "Hello." },
    ];
    const f = vi.fn().mockResolvedValue(new Response(ndjson(events), { status: 200 }));
    const seen: TurnEvent[] = [];
    await createApi(f).streamTurn(1, { text: "hi" }, (e) => seen.push(e));
    expect(seen).toEqual(events);
    expect(call(f)).toEqual({ url: "/api/sessions/1/turn/text/stream", method: "POST", body: { text: "hi" } });
  });

  it("streamTurn posts a WAV to the voice stream endpoint", async () => {
    const f = vi.fn().mockResolvedValue(new Response(ndjson([{ type: "done", reply_text: "x" }]), { status: 200 }));
    const wav = new Blob(["wav"], { type: "audio/wav" });
    await createApi(f).streamTurn(3, { wav }, () => {});
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/sessions/3/turn/stream");
    expect(init.headers).toEqual({ "Content-Type": "audio/wav" });
    expect(init.body).toBe(wav);
  });

  it("streamTurn rejects on a non-2xx response and on an error event", async () => {
    const f = fakeFetch({ detail: "unknown session 99" }, 404);
    await expect(createApi(f).streamTurn(99, { text: "hi" }, () => {})).rejects.toThrow(
      new ApiError("unknown session 99"),
    );
    const g = vi.fn().mockResolvedValue(
      new Response(ndjson([{ type: "error", message: "model died" }]), { status: 200 }),
    );
    await expect(createApi(g).streamTurn(1, { text: "hi" }, () => {})).rejects.toThrow(
      new ApiError("model died"),
    );
  });
});
