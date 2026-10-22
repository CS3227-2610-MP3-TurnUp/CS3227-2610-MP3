import { expect, it, vi } from "vitest";
import { requestPublicationAnswer } from "../../src/features/student-assistant/publication-answer-transport";
const input = { requestId: "one", eventId: "11111111-1111-4111-8111-111111111111", revision: "current", question: "Is lunch provided?" };
const success = { ok: true, requestId: input.requestId, eventId: input.eventId, revision: input.revision, candidate: { kind: "unanswered" } };
it("uses same-origin cookies and only the question/binding body", async () => {
 const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(success));
 expect(await requestPublicationAnswer(input, new AbortController().signal, fetcher)).toEqual({ ok: true, candidate: success.candidate });
 const [url, options] = fetcher.mock.calls[0]; expect(url).toContain(input.eventId + "/answer");
 expect(options).toMatchObject({ method: "POST", credentials: "same-origin", cache: "no-store" });
 expect(JSON.parse(options!.body as string)).toEqual({ requestId: "one", revision: "current", question: input.question });
});
it.each(["login_required", "event_unavailable", "source_changed", "source_unavailable", "timing_policy_pending", "source_too_large"])("preserves source failure %s", async code => {
 expect(await requestPublicationAnswer(input, new AbortController().signal, vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: false, code }, { status: 409 })))).toEqual({ ok: false, code });
});
it.each(["timeout", "rate_limited", "budget_exhausted", "invalid_response"])("preserves provider failure %s", async reason => {
 expect(await requestPublicationAnswer(input, new AbortController().signal, vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: false, reason }, { status: 503 })))).toEqual({ ok: false, reason });
});
it.each([{ ...success, requestId: "old" }, { ...success, eventId: "other" }, { ...success, revision: "old" }, { ...success, private: "secret" }, { ok: false, reason: "unknown" }])("rejects mismatched/unknown envelope %#", async body => {
 expect(await requestPublicationAnswer(input, new AbortController().signal, vi.fn<typeof fetch>().mockResolvedValue(Response.json(body)))).toEqual({ ok: false, reason: "invalid_response" });
});
it("bounds response bytes and handles a lost response/cancellation without retry", async () => {
 const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("x".repeat(40961))).mockRejectedValue(new Error("private-error"));
 expect(await requestPublicationAnswer(input, new AbortController().signal, fetcher)).toEqual({ ok: false, reason: "invalid_response" });
 expect(await requestPublicationAnswer(input, new AbortController().signal, fetcher)).toEqual({ ok: false, reason: "provider_unavailable" });
 const controller = new AbortController(); controller.abort();
 expect(await requestPublicationAnswer(input, controller.signal, fetcher)).toEqual({ ok: false, reason: "cancelled" }); expect(fetcher).toHaveBeenCalledTimes(3);
});
