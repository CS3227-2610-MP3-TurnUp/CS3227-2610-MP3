import { describe, expect, it, vi } from "vitest";
import { requestLocalAnswer } from "../../src/features/student-assistant/dev-transport";
const request = { requestId: "one", eventId: "sample-garden", revision: "sample-r1", question: "What should I bring?" };
describe("local client bridge", () => {
  it("sends only question identity, without cookies/keys, and returns candidate for revalidation", async () => {
    const candidate = { eventId: request.eventId, revision: request.revision, kind: "unanswered" }, fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true, ...request, candidate }));
    expect(await requestLocalAnswer(request, new AbortController().signal, fetcher)).toEqual({ ok: true, candidate }); const [url, init] = fetcher.mock.calls[0]; expect(url).toBe("/api/dev/student-assistant"); expect(JSON.parse(init!.body as string)).toEqual(request); expect(init!.credentials).toBe("omit");
  });
  it.each([{ ok: true, ...request, requestId: "old", candidate: {} }, { ok: false, reason: "private_error" }, {}])("rejects malformed/stale response", async (body) => { const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body)); expect(await requestLocalAnswer(request, new AbortController().signal, fetcher)).toEqual({ ok: false, reason: "invalid_response" }); });
  it("preserves denied allowance and bounds response bytes", async () => { const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ ok: false, reason: "live_not_authorized" }, { status: 429 })).mockResolvedValueOnce(new Response("x".repeat(40961))); expect(await requestLocalAnswer(request, new AbortController().signal, fetcher)).toEqual({ ok: false, reason: "live_not_authorized" }); expect(await requestLocalAnswer(request, new AbortController().signal, fetcher)).toEqual({ ok: false, reason: "invalid_response" }); });
  it("maps cancellation without retry", async () => { const controller = new AbortController(); controller.abort(); const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("private diagnostic")); expect(await requestLocalAnswer(request, controller.signal, fetcher)).toEqual({ ok: false, reason: "cancelled" }); expect(fetcher).toHaveBeenCalledOnce(); });
});
