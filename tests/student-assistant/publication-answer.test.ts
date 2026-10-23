import { beforeEach, afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ self: vi.fn() }));
vi.mock("../../src/server/accounts/service", () => ({ requireSelf: auth.self }));
import type { PrismaClient } from "../../src/server/db/generated/client";
import { AuthError } from "../../src/server/auth/policy";
import { answerPublication, readPublicationQuestion } from "../../src/server/student-assistant/publication-answer";
import { projectPublication } from "../../src/server/student-assistant/publication-source";
import { eventId, publicationFixture } from "./publication-fixture";

let record = publicationFixture(), published = true;
const config = { apiKey: "fake-test-key", model: "fake-model", maxInputBytes: 65536, maxOutputTokens: 1000, timeoutMs: 20000 };
const db = { event: { findFirst: vi.fn(async () => published ? { id: eventId, version: record.eventVersion, owner: { username: record.organiser }, currentPublication: record.publication } : null) } } as unknown as PrismaClient;
const release = vi.fn(async () => {});
const reserve = vi.fn(async () => ({ ok: true as const, config, release }));
const input = () => ({ requestId: "one", revision: projectPublication(record, eventId).binding.revision, question: "What should I bring?" });
const candidate = () => {
 const source = projectPublication(record, eventId).source;
 return { kind: "answered", eventId, revision: source.revision, reply: "Bring a water bottle.", evidence: [{ eventId, revision: source.revision, sectionId: "preparation", quote: "Bring a water bottle." }] };
};
const completion = (value: unknown) => Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });
beforeEach(() => { record = publicationFixture(); published = true; auth.self.mockReset().mockResolvedValue({ id: "student", role: "STUDENT" }); release.mockClear(); reserve.mockReset().mockResolvedValue({ ok: true, config, release }); });
afterEach(() => vi.restoreAllMocks());
it("denies delivery when the event starts during generation", async () => {
 const now = Date.parse("2026-10-22T00:00:00Z"), clock = vi.spyOn(Date, "now").mockReturnValue(now);
 record = publicationFixture({ start: new Date(now + 1000).toISOString(), end: new Date(now + 2000).toISOString() });
 const question = input(), value = candidate();
 const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => { clock.mockReturnValue(now + 1000); return completion(value); });
 await expect(answerPublication(db, "cookie", eventId, question, config, { reserve, fetchImpl: fetcher })).rejects.toMatchObject({ code: "timing_policy_pending" });
 expect(release).toHaveBeenCalledOnce();
});
it("loads a real publication, uses effective caps, returns verified current evidence and releases admission", async () => {
 const expected = candidate(), fetcher = vi.fn<typeof fetch>().mockResolvedValue(completion(expected));
 expect(await answerPublication(db, "cookie", eventId, input(), config, { reserve, fetchImpl: fetcher })).toEqual({ ok: true, candidate: expected });
 const envelope = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
 expect(envelope.max_tokens).toBe(1000); expect(envelope.messages).toHaveLength(2);
 expect(JSON.stringify(envelope)).not.toMatch(/fake-test-key|private-organiser-canary|cookie|passwordHash/);
 expect(fetcher).toHaveBeenCalledOnce(); expect(auth.self).toHaveBeenCalledTimes(2); expect(release).toHaveBeenCalledOnce();
});
it.each(["stale", "unavailable", "anonymous", "organiser", "invalid"])("denies %s before admission or inference", async which => {
 const question = input();
 if (which === "stale") question.revision = question.revision.replace(":2:", ":3:");
 if (which === "unavailable") published = false;
 if (which === "anonymous") auth.self.mockRejectedValueOnce(new AuthError(401, "Login required"));
 if (which === "organiser") auth.self.mockResolvedValueOnce({ id: "owner", role: "ORGANISER" });
 if (which === "invalid") question.question = "";
 const fetcher = vi.fn<typeof fetch>();
 await expect(answerPublication(db, "cookie", eventId, question, config, { reserve, fetchImpl: fetcher })).rejects.toHaveProperty("status");
 expect(reserve).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
});
it.each(["replace", "withdraw", "revoke", "expire", "draft"])("rechecks %s while completion is in flight", async which => {
 const question = input(), expected = candidate();
 const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
   if (which === "replace") record = publicationFixture({ location: "Replacement location" });
   if (which === "withdraw") published = false;
   if (which === "revoke" || which === "expire") auth.self.mockRejectedValueOnce(new AuthError(401, "Session unavailable"));
   if (which === "draft") record.eventVersion++;
   return completion(expected);
 });
 const request = answerPublication(db, "cookie", eventId, question, config, { reserve, fetchImpl: fetcher });
 if (which === "draft") expect(await request).toEqual({ ok: true, candidate: expected });
 else await expect(request).rejects.toMatchObject({ code: which === "replace" ? "source_changed" : which === "withdraw" ? "event_unavailable" : "login_required" });
 expect(release).toHaveBeenCalledOnce(); expect(fetcher).toHaveBeenCalledOnce();
});
it("prioritises an unavailable publication over a provider failure", async () => {
 const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => { published = false; return new Response("secret", { status: 500 }); });
 await expect(answerPublication(db, "cookie", eventId, input(), config, { reserve, fetchImpl: fetcher })).rejects.toMatchObject({ code: "event_unavailable" });
 expect(release).toHaveBeenCalledOnce();
});
it.each([["blocked", "live_not_authorized"], ["limited", "budget_exhausted"], ["busy", "rate_limited"]] as const)("honours %s admission without inference", async (reason, expected) => {
 const denied = vi.fn().mockResolvedValue({ ok: false, reason }), fetcher = vi.fn<typeof fetch>();
 expect(await answerPublication(db, "cookie", eventId, input(), config, { reserve: denied, fetchImpl: fetcher })).toEqual({ ok: false, reason: expected });
 expect(fetcher).not.toHaveBeenCalled();
});
it("withholds invalid output, rechecks source, cleans up and never retries", async () => {
 const fetcher = vi.fn<typeof fetch>().mockResolvedValue(completion({ ...candidate(), evidence: [] }));
 const result = await answerPublication(db, "cookie", eventId, input(), config, { reserve, fetchImpl: fetcher });
 expect(result.ok).toBe(false); expect(auth.self).toHaveBeenCalledTimes(2); expect(release).toHaveBeenCalledOnce(); expect(fetcher).toHaveBeenCalledOnce();
});
it("times out one fake request and still releases admission after final recheck", async () => {
 const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => { init!.signal!.addEventListener("abort", () => reject(new Error("fake timeout"))); }));
 const shortReserve = vi.fn().mockResolvedValue({ ok: true, config: { ...config, timeoutMs: 5 }, release });
 expect(await answerPublication(db, "cookie", eventId, input(), config, { reserve: shortReserve, fetchImpl: fetcher })).toEqual({ ok: false, reason: "timeout" });
 expect(fetcher).toHaveBeenCalledOnce(); expect(release).toHaveBeenCalledOnce();
});
it("rejects all client-owned source and identity overrides", () => {
 expect(readPublicationQuestion({ ...input(), source: "private" })).toBeNull();
 expect(readPublicationQuestion({ ...input(), ownerId: "foreign" })).toBeNull();
 expect(readPublicationQuestion({ ...input(), question: "x".repeat(1001) })).toBeNull();
 expect(readPublicationQuestion(input())).toEqual(input());
});
