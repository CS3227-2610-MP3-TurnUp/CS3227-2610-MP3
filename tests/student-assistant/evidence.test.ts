import { describe, expect, it } from "vitest";
import { ASSISTANT_LIMITS, isValidatedAnswer, validateAnswer, validateSource } from "../../src/features/student-assistant/evidence";

const source = () => ({ eventId: "event-a", revision: "r1", title: "Public workshop", sections: [
  { id: "venue", label: "Location", text: "Meet at the garden. Bring a hat. Café 🌱" },
  { id: "fee", label: "Fee", text: "Admission is free." },
] });
const ref = (quote = "Meet at the garden.", sectionId = "venue") => ({ eventId: "event-a", revision: "r1", sectionId, quote });
const answered = () => ({ kind: "answered", eventId: "event-a", revision: "r1", evidence: [ref()] });
const rejected = (candidate: unknown, reason = "invalid_response") => expect(validateAnswer(candidate, source())).toEqual({ ok: false, reason });

describe("public source allowlist and bounded copies", () => {
  it("accepts only a copied immutable public projection", () => {
    const input = source();
    const result = validateSource(input);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected source");
    input.sections[0].text = "changed";
    expect(result.source.sections[0].text).toContain("Meet at the garden.");
    expect(Object.isFrozen(result.source.sections)).toBe(true);
    expect(Object.isFrozen(result.source.sections[0])).toBe(true);
  });
  it.each([null, [], {}, "source", { ...source(), ownerId: "private" }, { ...source(), sections: [] },
    { ...source(), title: " " }, { ...source(), eventId: "" }, { ...source(), revision: "" },
    { ...source(), sections: [{ id: "a", label: "A", text: "x", privateReply: "secret" }] },
    { ...source(), sections: [{ id: "a", label: "A", text: "x" }, { id: "a", label: "B", text: "y" }] },
    { ...source(), sections: [{ id: "a", label: "A", text: " " }] },
    { ...source(), sections: [{ id: "a", label: "A", text: "\ud800" }] },
  ])("rejects malformed, empty, private or duplicate content %#", (value) => {
    expect(validateSource(value)).toEqual({ ok: false, reason: "invalid_source" });
  });
  it("rejects oversized UTF-8 sources and section limits without truncation", () => {
    expect(validateSource({ ...source(), sections: [{ id: "a", label: "A", text: "🌱".repeat(9_000) }] }).ok).toBe(false);
    const sections = Array.from({ length: 32 }, (_, i) => ({ id: `s${i}`, label: "Section", text: "text" }));
    expect(validateSource({ ...source(), sections }).ok).toBe(true);
    expect(validateSource({ ...source(), sections: [...sections, { id: "extra", label: "Extra", text: "x" }] }).ok).toBe(false);
  });
  it("checks exact serialized byte boundaries", () => {
    const input = { ...source(), sections: [{ id: "a", label: "A", text: "x" }] };
    const overhead = new TextEncoder().encode(JSON.stringify(input)).length - 1;
    input.sections[0].text = "x".repeat(ASSISTANT_LIMITS.sourceBytes - overhead);
    expect(validateSource(input).ok).toBe(true);
    input.sections[0].text += "x";
    expect(validateSource(input).ok).toBe(false);
  });
  it("rejects property accessors, non-JSON instances, sparse arrays and symbols", () => {
    const accessor = { ...source(), get title() { throw new Error("never read"); } };
    expect(validateSource(accessor).ok).toBe(false);
    expect(validateSource(new Date()).ok).toBe(false);
    expect(validateSource({ ...source(), [Symbol("private")]: "x" }).ok).toBe(false);
    expect(validateSource({ ...source(), sections: new Array(1) }).ok).toBe(false);
    const cyclic: Record<string, unknown> = source(); cyclic.private = cyclic;
    expect(validateSource(cyclic).ok).toBe(false);
  });
});

describe("extractive evidence provenance, separately from relevance", () => {
  it("uses validated section labels and exact source quotations", () => {
    const candidate = answered();
    const result = validateAnswer(candidate, source());
    expect(result.ok).toBe(true);
    if (!result.ok || result.answer.kind !== "answered") throw new Error("expected answer");
    expect(result.answer.evidence).toEqual([{ sectionId: "venue", label: "Location", quote: "Meet at the garden." }]);
    candidate.evidence[0].quote = "forged later";
    expect(result.answer.evidence[0].quote).toBe("Meet at the garden.");
    expect(Object.isFrozen(result.answer)).toBe(true);
    expect(Object.isFrozen(result.answer.evidence[0])).toBe(true);
  });
  it("runtime membership accepts validator results and rejects forged casts/copies", () => {
    const result = validateAnswer(answered(), source());
    if (!result.ok) throw new Error("expected answer");
    expect(isValidatedAnswer(result.answer)).toBe(true);
    expect(isValidatedAnswer({ ...result.answer })).toBe(false);
    expect(isValidatedAnswer(JSON.parse(JSON.stringify(result.answer)))).toBe(false);
    expect(isValidatedAnswer(Object.freeze(answered()))).toBe(false);
    expect(isValidatedAnswer(null)).toBe(false);
    expect(isValidatedAnswer("answer")).toBe(false);
    expect(isValidatedAnswer(source())).toBe(false);
  });
  it("provenance accepts a literal but irrelevant quote; this is NOT semantic quality verification", () => {
    // For the labelled question "What is the fee?", the venue quote is authentic but irrelevant.
    expect(validateAnswer(answered(), source()).ok).toBe(true);
  });
  it.each([
    { ...answered(), evidence: [] }, { ...answered(), evidence: [ref("fabricated")] },
    { ...answered(), evidence: [ref("Admission is free.", "venue")] },
    { ...answered(), evidence: [ref("Meet at the garden.", "unknown")] },
    { ...answered(), evidence: [ref(" ")] }, { ...answered(), evidence: [ref(), ref()] },
    { ...answered(), eventId: "foreign" }, { ...answered(), revision: "old" },
    { ...answered(), evidence: [{ ...ref(), eventId: "foreign" }] },
    { ...answered(), evidence: [{ ...ref(), revision: "old" }] },
    { ...answered(), evidence: [{ ...ref(), privateReply: "secret" }] },
    { ...answered(), evidence: [ref("Cafe\u0301")] },
    { ...answered(), evidence: [ref("\ud83c")] },
    { ...answered(), evidence: new Array(1) },
  ])("withholds mismatched, malformed, missing or forged evidence %#", (value) => rejected(value, "invalid_evidence"));
  it("accepts Unicode code point quote boundary and rejects one over", () => {
    const quote = "🌱".repeat(500);
    const input = { ...source(), sections: [{ id: "venue", label: "Location", text: quote + "🌱" }] };
    expect(validateAnswer({ ...answered(), evidence: [ref(quote)] }, input).ok).toBe(true);
    expect(validateAnswer({ ...answered(), evidence: [ref(quote + "🌱")] }, input)).toEqual({ ok: false, reason: "invalid_evidence" });
  });
  it("accepts eight unique references and rejects nine", () => {
    const refs = Array.from({ length: 9 }, (_, i) => ref(`quote${i}`));
    const input = { ...source(), sections: [{ id: "venue", label: "Location", text: refs.map((entry) => entry.quote).join(" ") }] };
    expect(validateAnswer({ ...answered(), evidence: refs.slice(0, 8) }, input).ok).toBe(true);
    expect(validateAnswer({ ...answered(), evidence: refs }, input).ok).toBe(false);
  });
  it.each([null, {}, [], { ...answered(), answer: "unverified factual prose" }, { ...answered(), recipient: "owner" },
    { kind: "unknown", eventId: "event-a", revision: "r1" },
    { kind: "unanswered", eventId: "event-a", revision: "r1", evidence: [ref()] },
    { kind: "out_of_scope", eventId: "event-a", revision: "r1", answer: "forged" },
    { kind: "needs_clarification", eventId: "event-a", revision: "r1", clarification: " " },
    { kind: "partially_answered", eventId: "event-a", revision: "r1", evidence: [ref()], unresolved: [] },
    { kind: "partially_answered", eventId: "event-a", revision: "r1", evidence: [ref()], unresolved: new Array(1) },
  ])("rejects incompatible/unknown answer data %#", (value) => rejected(value));
  it("supports each bounded nonfactual outcome", () => {
    for (const candidate of [
      { kind: "unanswered", eventId: "event-a", revision: "r1" },
      { kind: "out_of_scope", eventId: "event-a", revision: "r1" },
      { kind: "needs_clarification", eventId: "event-a", revision: "r1", clarification: "Which session?" },
      { ...answered(), kind: "partially_answered", unresolved: ["Is equipment included?"] },
    ]) expect(validateAnswer(candidate, source()).ok).toBe(true);
  });
  it("enforces clarification/unresolved lengths, counts and duplicates", () => {
    const clarify = { kind: "needs_clarification", eventId: "event-a", revision: "r1", clarification: "🌱".repeat(500) };
    expect(validateAnswer(clarify, source()).ok).toBe(true);
    rejected({ ...clarify, clarification: clarify.clarification + "x" });
    rejected({ ...answered(), kind: "partially_answered", unresolved: ["x", "x"] });
    rejected({ ...answered(), kind: "partially_answered", unresolved: Array.from({ length: 9 }, (_, i) => `${i}`) });
    rejected({ ...answered(), kind: "partially_answered", unresolved: ["x".repeat(501)] });
  });
  it("rejects aggregate candidate bytes even when every individual field fits", () => {
    const fragments = Array.from({ length: 8 }, (_, i) => "🌱".repeat(499) + i);
    const identity = { eventId: "e".repeat(128), revision: "r".repeat(128) };
    const input = { ...source(), ...identity, sections: [{ id: "venue", label: "Location", text: fragments.join(" ") }] };
    const candidate = { ...answered(), ...identity, kind: "partially_answered", evidence: fragments.map((fragment) => ({ ...ref(fragment), ...identity })), unresolved: fragments };
    expect(new TextEncoder().encode(JSON.stringify(candidate)).length).toBeGreaterThan(ASSISTANT_LIMITS.candidateBytes);
    expect(validateSource(input).ok).toBe(true);
    expect(validateAnswer(candidate, input)).toEqual({ ok: false, reason: "invalid_response" });
  });
  it("rejects huge/cyclic candidates and never exposes their body", () => {
    rejected({ ...answered(), private: "secret".repeat(40_000) });
    const candidate: Record<string, unknown> = answered(); candidate.private = candidate;
    rejected(candidate);
    expect(validateAnswer(answered(), { ...source(), private: "secret" })).toEqual({ ok: false, reason: "invalid_source" });
  });
  it("rejects unexpected executable object properties without invoking serialization hooks", () => {
    let invoked = false;
    rejected({ ...answered(), toJSON() { invoked = true; return {}; } });
    rejected({ ...answered(), private: { get body() { invoked = true; return "secret"; } } });
    expect(invoked).toBe(false);
  });
  it("retains malicious-looking source text only as inert data with no tools", () => {
    const quote = '<script>publish();fetch("https://example.invalid")</script>';
    const result = validateAnswer({ ...answered(), evidence: [ref(quote)] }, { ...source(), sections: [{ id: "venue", label: "Location", text: quote }] });
    expect(result.ok).toBe(true);
    if (result.ok && result.answer.kind === "answered") expect(result.answer.evidence[0].quote).toBe(quote);
  });
});





it("preserves bounded conversational replies without weakening evidence/field checks", () => {
  const value = { ...answered(), reply: "Meet at the garden, and bring a hat." };
  const result = validateAnswer(value, source());
  expect(result.ok).toBe(true);
  if (result.ok) { expect(result.answer.reply).toBe(value.reply); expect(isValidatedAnswer(result.answer)).toBe(true); }
  rejected({ ...value, reply: " " });
  rejected({ ...value, reply: "x".repeat(701) });
  rejected({ ...value, reply: "\ud800" });
  rejected({ ...value, evidence: [] }, "invalid_evidence");
  rejected({ ...value, evidence: [ref("Lunch is provided.")] }, "invalid_evidence");
  rejected({ ...value, ownerId: "private" });
});
it("accepts uncertainty without fabricating supporting evidence and distinguishes semantics from provenance", () => {
  expect(validateAnswer({ eventId: "event-a", revision: "r1", kind: "unanswered", reply: "That depends on what you enjoy! What activities do you like?" }, source()).ok).toBe(true);
  // Schema/quotes cannot prove entailment: a separate semantic evaluation must catch this unsupported prose.
  expect(validateAnswer({ ...answered(), reply: "Lunch is provided." }, source()).ok).toBe(true);
});
