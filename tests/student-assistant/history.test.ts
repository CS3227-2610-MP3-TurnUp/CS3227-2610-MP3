import { afterEach, expect, it, vi } from "vitest";
import { restoreHistory } from "../../src/features/student-assistant/history";
import { createPublicationChat } from "../../src/features/student-assistant/publication-chat";
import { requestHistory } from "../../src/features/student-assistant/history-transport";
import { SAMPLE_SOURCE as source } from "../../src/features/student-assistant/demo/scenarios";
const candidate = { kind: "answered", eventId: source.eventId, revision: source.revision, reply: "Tools are provided!", evidence: [{ eventId: source.eventId, revision: source.revision, sectionId: "preparation", quote: "Gardening tools are provided." }] };
const turns = [{ requestId: "saved-1", question: "Tools?", result: { ok: true, candidate } }];
afterEach(() => vi.restoreAllMocks());
it("revalidates saved replies rather than trusting serialized brands or stale evidence", () => {
 expect(restoreHistory(source, turns)?.turns[0].answer?.reply).toBe(candidate.reply);
 expect(restoreHistory({ ...source, revision: "replacement" }, turns)).toBeNull();
 expect(restoreHistory(source, [{ ...turns[0], result: { ok: true, candidate: { ...candidate, evidence: [] } } }])).toBeNull();
 expect(restoreHistory(source, Array(21).fill(turns[0]))).toBeNull();
 expect(restoreHistory(source, [{ ...turns[0], question: "x".repeat(1001) }])).toBeNull();
});
it("restores friendly technical failures without treating them as event answers", () => {
 const state = restoreHistory(source, [{ requestId: "failed", question: "Hi", result: { ok: false, reason: "timeout" } }]);
 expect(state?.turns[0].error).toBe("timeout");
 expect(state?.turns[0].answer).toBeNull();
});
it("restores on a fresh event page/controller, retains history on reopening, and never replays inference", async () => {
 const load = vi.fn().mockResolvedValue({ ok: true, source });
 const answer = vi.fn();
 const history = vi.fn().mockResolvedValue({ ok: true, turns });
 const first = createPublicationChat(source.eventId, { load, answer, history });
 await first.open(); expect(first.snapshot().assistant.turns).toHaveLength(1);
 await first.open(); expect(first.snapshot().assistant.turns).toHaveLength(1);
 expect(history).toHaveBeenCalledTimes(2); first.stop();
 const second = createPublicationChat(source.eventId, { load, answer, history });
 await second.open(); expect(second.snapshot().assistant.turns[0].question).toBe("Tools?");
 expect(answer).not.toHaveBeenCalled();
});
it("withholds saved history when the authenticated history read is denied", async () => {
 const chat = createPublicationChat(source.eventId, { load: vi.fn().mockResolvedValue({ ok: true, source }), answer: vi.fn(), history: vi.fn().mockResolvedValue({ ok: false, code: "login_required" }) });
 await chat.open(); expect(chat.snapshot().assistant.turns).toEqual([]);
 expect(chat.snapshot().status).toBe("login_required");
});
it("ignores late history after leaving the page and never replaces a newer controller", async () => {
 let finish!: (value: { ok: true; turns: typeof turns }) => void;
 const history = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; }));
 const chat = createPublicationChat(source.eventId, { load: vi.fn().mockResolvedValue({ ok: true, source }), answer: vi.fn(), history });
 const opening = chat.open(); await vi.waitFor(() => expect(history).toHaveBeenCalledOnce());
 chat.stop(); finish({ ok: true, turns }); await opening;
 expect(chat.snapshot().assistant.turns).toEqual([]);
});
it.each(["local", "hosted"] as const)("bounds and validates %s history transport with cookie auth and no browser actor selection", async mode => {
 const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true, eventId: source.eventId, revision: source.revision, accountScope: "11111111-1111-4111-8111-111111111111", turns }));
 expect(await requestHistory(source, new AbortController().signal, mode, fetcher)).toEqual({ ok: true, turns, accountScope: "11111111-1111-4111-8111-111111111111" });
 const [url, init] = fetcher.mock.calls[0]; expect(String(url)).toContain("/history?expectedRevision=");
 expect(init).toMatchObject({ credentials: "same-origin", cache: "no-store" });
 expect(init?.body).toBeUndefined();
 fetcher.mockResolvedValueOnce(Response.json({ ok: true, eventId: source.eventId, revision: "old", turns }));
 expect(await requestHistory(source, new AbortController().signal, mode, fetcher)).toEqual({ ok: false, code: "source_unavailable" });
});

it("rechecks account history on focus and clears another account's turns/draft without inference", async () => {
 const history = vi.fn().mockResolvedValue({ ok: true, accountScope: "account-a", turns });
 const answer = vi.fn();
 const chat = createPublicationChat(source.eventId, { load: vi.fn().mockResolvedValue({ ok: true, source }), answer, history });
 await chat.open(); chat.edit("Private draft from account A");
 history.mockResolvedValueOnce({ ok: true, accountScope: "account-b", turns: [] });
 await chat.refocus();
 expect(chat.snapshot().assistant.turns).toEqual([]);
 expect(chat.snapshot().assistant.draft).toBe("");
 expect(answer).not.toHaveBeenCalled();
});

it("quiet unchanged history checks preserve transcript/draft references and never show buffering or a failure notice", async () => {
 const history = vi.fn().mockResolvedValue({ ok: true, accountScope: "account-a", turns });
 const chat = createPublicationChat(source.eventId, { load: vi.fn().mockResolvedValue({ ok: true, source }), answer: vi.fn(), history });
 await chat.open(); chat.edit("New draft"); const before = chat.snapshot().assistant;
 await chat.refocus();
 expect(chat.snapshot().assistant).toBe(before);
 expect(chat.snapshot().historyUnavailable).toBe(false);
 expect(chat.snapshot().status).toBe("ready");
 history.mockResolvedValueOnce({ ok: false, code: "source_unavailable" });
 await chat.refocus();
 expect(chat.snapshot().assistant.turns).toEqual([]);
 expect(chat.snapshot().assistant.draft).toBe("");
 expect(chat.snapshot().historyUnavailable).toBe(true);
});
