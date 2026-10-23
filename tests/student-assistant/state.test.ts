import { describe, expect, it } from "vitest";
import { assistantReducer, createAssistantState } from "../../src/features/student-assistant/state";
import type { AssistantState, FailureReason } from "../../src/features/student-assistant/types";

const source = { eventId: "sample-event", revision: "r1", title: "Workshop", sections: [{ id: "fee", label: "Fee", text: "Admission is free." }] };
const answer = { eventId: source.eventId, revision: source.revision, kind: "answered", evidence: [{ eventId: source.eventId, revision: source.revision, sectionId: "fee", quote: "Admission is free." }] };
const completion = (requestId = "one", candidate: unknown = answer) => ({ type: "response_received" as const, requestId, eventId: source.eventId, revision: source.revision, candidate });
const drafting = (value = "What is the fee?") => assistantReducer(createAssistantState(source), { type: "draft_changed", value });
const pending = () => assistantReducer(drafting(), { type: "request_started", requestId: "one" });
const done = () => assistantReducer(pending(), completion());

describe("assistant request admission and truthful outcomes", () => {
  it("accepts one request bound to the current source and exact question", () => {
    const state = pending();
    expect(state.pending).toEqual({ requestId: "one", eventId: source.eventId, revision: source.revision, question: "What is the fee?" });
    expect(assistantReducer(state, { type: "request_started", requestId: "two" })).toBe(state);
    const finished = assistantReducer(state, completion());
    expect(finished.pending).toBeNull();
    expect(finished.answer?.kind).toBe("answered");
    expect(finished.error).toBeNull();
    expect(finished.draft).toBe("");
    expect(finished.turns[0].question).toBe(state.draft);
  });
  it.each(["", "   ", "\n\t", "🌱".repeat(1_001)])("rejects invalid questions without losing draft", (value) => {
    const state = assistantReducer(drafting(value), { type: "request_started", requestId: "one" });
    expect(state.pending).toBeNull();
    expect(state.error).toBe("invalid_question");
    expect(state.draft).toBe(value);
  });
  it("accepts exactly 1000 Unicode code points and rejects blank request ids", () => {
    const state = drafting("🌱".repeat(1_000));
    expect(assistantReducer(state, { type: "request_started", requestId: "one" }).pending).not.toBeNull();
    expect(assistantReducer(state, { type: "request_started", requestId: " " }).error).toBe("invalid_response");
  });
  it.each<FailureReason>(["timeout", "provider_unavailable", "rate_limited", "cancelled", "preview_only"]) ("preserves question on %s and requires explicit retry", (reason) => {
    const state = pending();
    const failed = assistantReducer(state, { type: "request_failed", requestId: "one", eventId: source.eventId, revision: source.revision, reason });
    expect(failed.pending).toBeNull();
    expect(failed.answer).toBeNull();
    expect(failed.error).toBe(reason);
    expect(failed.draft).toBe(state.draft);
    expect(assistantReducer(failed, { type: "request_started", requestId: "two" }).pending?.requestId).toBe("two");
  });
  it("maps bad evidence/schema to technical failure, never unanswered or sent", () => {
    const badEvidence = assistantReducer(pending(), completion("one", { ...answer, evidence: [] }));
    expect(badEvidence.error).toBe("invalid_evidence");
    expect(badEvidence.answer).toBeNull();
    expect(badEvidence.draft).toBe("What is the fee?");
    const badSchema = assistantReducer(pending(), completion("one", { ...answer, extra: "raw private body" }));
    expect(badSchema.error).toBe("invalid_response");
    expect(badSchema.answer).toBeNull();
  });
  it("allows distinct legitimate outcomes without inventing delivery status", () => {
    for (const kind of ["unanswered", "out_of_scope"] as const) {
      const state = assistantReducer(pending(), completion("one", { kind, eventId: source.eventId, revision: source.revision }));
      expect(state.answer?.kind).toBe(kind);
      expect(state.error).toBeNull();
      expect(state).not.toHaveProperty("sent");
    }
  });
});

describe("source and question changes cannot retain obsolete answers", () => {
  it("invalidates displayed evidence on a changed question but preserves it for an identical value", () => {
    const state = done();
    expect(assistantReducer(state, { type: "draft_changed", value: state.draft })).toBe(state);
    const changed = assistantReducer(state, { type: "draft_changed", value: "Where is it?" });
    expect(changed.answer).toBeNull();
    expect(changed.draft).toBe("Where is it?");
    expect(changed.error).toBeNull();
  });
  it("invalidates in-flight completion on changed draft even if a caller bypasses the disabled UI", () => {
    const state = assistantReducer(pending(), { type: "draft_changed", value: "New question" });
    expect(state.pending).toBeNull();
    expect(assistantReducer(state, completion())).toBe(state);
  });
  it.each([
    { ...source, revision: "r2" },
    { ...source, eventId: "other-event" },
  ])("clears current and pending evidence after source replacement %#", (replacement) => {
    for (const initial of [pending(), done()]) {
      const state = assistantReducer(initial, { type: "source_changed", source: replacement });
      expect(state.notice).toBe("source_changed");
      expect(state.answer).toBeNull();
      expect(state.pending).toBeNull();
      expect(state.source?.eventId).toBe(replacement.eventId);
      expect(state.draft).toBe(initial.draft);
      expect(assistantReducer(state, completion())).toBe(state);
    }
  });
  it.each(["withdrawn", "cancelled"] as const)("removes active source on %s and denies new requests", (reason) => {
    const state = assistantReducer(pending(), { type: "source_unavailable", eventId: source.eventId, reason });
    expect(state.source).toBeNull();
    expect(state.answer).toBeNull();
    expect(state.pending).toBeNull();
    expect(state.availability).toBe(reason);
    expect(state.notice).toBe(reason === "withdrawn" ? "source_withdrawn" : "source_cancelled");
    expect(state.draft).toBe("What is the fee?");
    expect(assistantReducer(state, completion())).toBe(state);
    expect(assistantReducer(state, { type: "request_started", requestId: "two" })).toBe(state);
  });
  it("ignores foreign source withdrawal", () => {
    const state = pending();
    expect(assistantReducer(state, { type: "source_unavailable", eventId: "foreign", reason: "withdrawn" })).toBe(state);
  });
  it("invalid source replacement denies use without preserving source-derived answer", () => {
    const state = assistantReducer(done(), { type: "source_changed", source: { ...source, private: "secret" } });
    expect(state.availability).toBe("invalid");
    expect(state.error).toBe("invalid_source");
    expect(state.source).toBeNull();
    expect(state.answer).toBeNull();
    expect(state.draft).toBe("");
    expect(assistantReducer(state, { type: "request_started", requestId: "two" })).toBe(state);
  });
  it("ignores late completions/failures with wrong request/event/revision", () => {
    const state = pending();
    for (const overrides of [{ requestId: "old" }, { eventId: "other" }, { revision: "old" }]) {
      expect(assistantReducer(state, { ...completion(), ...overrides })).toBe(state);
      expect(assistantReducer(state, { type: "request_failed", requestId: "one", eventId: source.eventId, revision: source.revision, reason: "timeout", ...overrides })).toBe(state);
    }
    const second = assistantReducer(assistantReducer(state, { type: "request_failed", requestId: "one", eventId: source.eventId, revision: source.revision, reason: "timeout" }), { type: "request_started", requestId: "two" });
    expect(assistantReducer(second, completion())).toBe(second);
    expect(assistantReducer(second, completion("two")).answer?.kind).toBe("answered");
  });
  it("clear removes draft, answer, pending and failure without reopening unavailable source", () => {
    for (const before of [pending(), done(), assistantReducer(done(), { type: "source_unavailable", eventId: source.eventId, reason: "withdrawn" })]) {
      const cleared = assistantReducer(before, { type: "cleared" });
      expect(cleared).toMatchObject({ draft: "", answer: null, pending: null, error: null, availability: before.availability });
      expect(assistantReducer(cleared, completion())).toBe(cleared);
    }
    const invalid: AssistantState = createAssistantState(null);
    expect(invalid.availability).toBe("invalid");
  });
});


describe("bounded volatile chat transcript", () => {
  it("keeps earlier source-bound exchanges while composing and completing follow-up questions", () => {
    let state = done();
    state = assistantReducer(state, { type: "draft_changed", value: "Is admission free?" });
    expect(state.turns).toHaveLength(1); expect(state.answer).toBeNull();
    state = assistantReducer(state, { type: "request_started", requestId: "two" });
    state = assistantReducer(state, completion("two"));
    expect(state.turns.map((turn) => turn.question)).toEqual(["What is the fee?", "Is admission free?"]);
    expect(state.draft).toBe("");
  });
  it("retries a failed exchange without duplicating its question and preserves failure drafts", () => {
    const failed = assistantReducer(pending(), { type: "request_failed", requestId: "one", eventId: source.eventId, revision: source.revision, reason: "timeout" });
    expect(failed.turns).toHaveLength(1); expect(failed.draft).toBe("What is the fee?");
    const retry = assistantReducer(failed, { type: "request_started", requestId: "two" });
    expect(retry.turns).toHaveLength(0);
    expect(assistantReducer(retry, completion("two")).turns).toHaveLength(1);
  });
  it("limits conversation memory and invalidates it on replacement, withdrawal, cancellation or clear", () => {
    let state = createAssistantState(source);
    for (let i = 0; i < 25; i++) {
      state = assistantReducer(state, { type: "draft_changed", value: "Question " + i });
      state = assistantReducer(state, { type: "request_started", requestId: String(i) });
      expect(state.turns.length).toBeLessThanOrEqual(19);
      state = assistantReducer(state, completion(String(i)));
    }
    expect(state.turns).toHaveLength(20); expect(state.turns[0].question).toBe("Question 5");
    for (const reason of ["withdrawn", "cancelled"] as const) expect(assistantReducer(state, { type: "source_unavailable", eventId: source.eventId, reason }).turns).toEqual([]);
    expect(assistantReducer(state, { type: "source_changed", source: { ...source, revision: "r2" } }).turns).toEqual([]);
    expect(assistantReducer(state, { type: "source_changed", source: null }).turns).toEqual([]);
    expect(assistantReducer(state, { type: "cleared" }).turns).toEqual([]);
  });
});
