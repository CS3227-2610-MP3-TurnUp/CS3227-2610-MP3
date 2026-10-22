import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ role: vi.fn() }));
vi.mock("../../src/server/auth/guards", () => ({ requireRole: auth.role }));
vi.mock("../../src/features/student/event-details", () => ({ StudentEventDetails: () => createElement("article", null, "Event details") }));
vi.mock("../../src/components/account/account-menu", () => ({ AccountMenu: () => null }));
import Page from "../../src/app/student/events/[eventId]/page";
import { createPublicationChat } from "../../src/features/student-assistant/publication-chat";
import { projectPublication } from "../../src/server/student-assistant/publication-source";
import { eventId, publicationFixture } from "./publication-fixture";
import type { PublicationAnswerResult } from "../../src/features/student-assistant/publication-answer-transport";
const source = projectPublication(publicationFixture(), eventId).source;
const candidate = { kind: "answered", eventId, revision: source.revision, reply: "Bring a water bottle.", evidence: [{ eventId, revision: source.revision, sectionId: "preparation", quote: "Bring a water bottle." }] };
function fixture() {
 const load = vi.fn().mockResolvedValue({ ok: true, source });
 const answer = vi.fn().mockResolvedValue({ ok: true, candidate });
 return { load, answer, chat: createPublicationChat(eventId, { load, answer }) };
}
afterEach(() => vi.unstubAllEnvs());
it("does not infer on mount/open/refocus and retains conversation on unchanged refresh", async () => {
 const { chat, load, answer } = fixture(); await chat.refocus(); expect(load).not.toHaveBeenCalled();
 await chat.open(); expect(answer).not.toHaveBeenCalled(); chat.edit("What should I bring?"); await chat.submit();
 expect(chat.snapshot().assistant.turns).toHaveLength(1); expect(chat.snapshot().assistant.draft).toBe("");
 const refresh = chat.refocus(); expect(chat.snapshot().status).toBe("checking"); expect(chat.snapshot().assistant.source).toBeNull();
 await refresh; expect(chat.snapshot().assistant.turns).toHaveLength(1); expect(answer).toHaveBeenCalledOnce(); expect(load.mock.calls[1][2]).toBe(source.revision);
});
it("keeps failed questions and rechecks only source, never automatically retrying inference", async () => {
 const { chat, answer, load } = fixture(); answer.mockResolvedValueOnce({ ok: false, reason: "timeout" });
 await chat.open(); chat.edit("Is it fun?"); await chat.submit();
 expect(chat.snapshot().assistant.draft).toBe("Is it fun?"); expect(chat.snapshot().assistant.error).toBe("timeout"); expect(answer).toHaveBeenCalledOnce(); expect(load).toHaveBeenCalledTimes(2);
});
it("retains unchanged conversation through overlapping refreshes without showing stale excerpts", async () => {
 const { chat, load } = fixture(); await chat.open(); chat.edit("Bring what?"); await chat.submit();
 let resolveFirst!: (value: unknown) => void;
 load.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
 const first = chat.refresh(); const second = chat.refresh();
 expect(chat.snapshot().assistant.source).toBeNull(); await second;
 expect(chat.snapshot().assistant.turns).toHaveLength(1);
 resolveFirst({ ok: true, source }); await first; expect(chat.snapshot().assistant.turns).toHaveLength(1);
});
it("clears old conversation if the public projection format changes under the same publication binding", async () => {
 const { chat, load } = fixture(); await chat.open(); chat.edit("Bring what?"); await chat.submit();
 load.mockResolvedValueOnce({ ok: true, source: { ...source, sections: source.sections.map(section => section.id === "schedule" ? { ...section, text: "Updated deterministic schedule display" } : section) } });
 await chat.refresh(); expect(chat.snapshot().assistant.turns).toEqual([]);
});
it.each(["source_changed", "event_unavailable", "login_required", "source_unavailable"])("clears all source evidence and retains draft on %s", async code => {
 const { chat, answer } = fixture(); await chat.open(); chat.edit("Bring what?"); await chat.submit();
 chat.edit("What time?"); answer.mockResolvedValueOnce({ ok: false, code }); await chat.submit();
 expect(chat.snapshot().status).toBe(code); expect(chat.snapshot().assistant).toMatchObject({ source: null, turns: [], draft: "What time?", pending: null });
});
it("ignores stale completion after source refresh/navigation and blocks duplicate clicks", async () => {
 const { chat, answer, load } = fixture(); let finish!: (result: PublicationAnswerResult) => void;
 answer.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })); await chat.open(); chat.edit("Bring what?");
 const sending = chat.submit(); await chat.submit(); expect(answer).toHaveBeenCalledOnce();
 load.mockResolvedValueOnce({ ok: false, code: "event_unavailable" }); await chat.refocus(); finish({ ok: true, candidate }); await sending;
 expect(chat.snapshot().assistant.turns).toEqual([]); expect(chat.snapshot().status).toBe("event_unavailable");
 chat.stop(); await chat.open(); expect(load).toHaveBeenCalledTimes(2);
});
it("requires explicit refresh after replacement and never sends a draft automatically", async () => {
 const { chat, load, answer } = fixture(); await chat.open(); chat.edit("Bring what?");
 load.mockResolvedValueOnce({ ok: false, code: "source_changed" }); await chat.refresh();
 expect(chat.snapshot().assistant.draft).toBe("Bring what?"); expect(chat.snapshot().assistant.source).toBeNull();
 await chat.refresh(); expect(load.mock.calls[2][2]).toBeUndefined(); expect(answer).not.toHaveBeenCalled();
});
it("revalidates candidate evidence on the client instead of trusting HTTP success", async () => {
 const { chat, answer } = fixture(); answer.mockResolvedValueOnce({ ok: true, candidate: { ...candidate, evidence: [{ ...candidate.evidence[0], quote: "Fabricated lunch" }] } });
 await chat.open(); chat.edit("Lunch?"); await chat.submit(); expect(chat.snapshot().assistant.error).toBe("invalid_evidence"); expect(chat.snapshot().assistant.answer).toBeNull();
});
it("mounts the widget only for the granted Student on the pinned local development page", async () => {
 auth.role.mockResolvedValue({ status: "granted", user: { username: "student" } });
 vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL", ""); vi.stubEnv("__NEXT_PRIVATE_ORIGIN", "http://127.0.0.1:3001");
 expect(renderToStaticMarkup(await Page({ params: Promise.resolve({ eventId }) }))).toContain("Ask about this event");
 vi.stubEnv("NODE_ENV", "production"); expect(renderToStaticMarkup(await Page({ params: Promise.resolve({ eventId }) }))).not.toContain("event-chat-widget");
 vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL", "1"); expect(renderToStaticMarkup(await Page({ params: Promise.resolve({ eventId }) }))).not.toContain("event-chat-widget");
 auth.role.mockResolvedValueOnce({ status: "denied" }); expect(renderToStaticMarkup(await Page({ params: Promise.resolve({ eventId }) }))).not.toContain("event-chat-widget");
});
