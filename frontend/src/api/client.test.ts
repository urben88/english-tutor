import { ApiError, createApi } from "./client";

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
