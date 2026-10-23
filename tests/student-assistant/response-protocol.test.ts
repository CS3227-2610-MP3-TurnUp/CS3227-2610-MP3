import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { answerFromSource } from "../../src/server/student-assistant/answer";
import { SAMPLE_SOURCE } from "../../src/features/student-assistant/demo/scenarios";
const config = { apiKey: "private-test-key", model: "synthetic-model", maxInputBytes: 65536, maxOutputTokens: 1000, timeoutMs: 20000 };
const identity = { eventId: SAMPLE_SOURCE.eventId, revision: SAMPLE_SOURCE.revision };
function completion(value: unknown, finishReason = "stop") {
  return vi.fn<typeof fetch>().mockResolvedValue(Response.json({ choices: [{ message: { content: typeof value === "string" ? value : JSON.stringify(value) }, finish_reason: finishReason }] }));
}
afterEach(() => vi.restoreAllMocks());
it.each(["yoo can i join", "hey can i come?", "Can I attend?"])("accepts casual joining intent: %s", async question => {
  const value = { kind: "unanswered", reply: "I'd be happy to help! I can't confirm the joining requirements from the event details." };
  const fetcher = completion(value);
  expect(await answerFromSource(SAMPLE_SOURCE, question, config, undefined, fetcher)).toEqual({ ok: true, candidate: { ...identity, ...value } });
  const sent = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
  expect(JSON.parse(sent.messages[1].content).question).toBe(question);
  expect(sent.messages[0].content).toContain("Understand casual language");
  expect(sent.messages[0].content).toContain("never claim to register");
  expect(sent.max_tokens).toBe(1000);
  expect(fetcher).toHaveBeenCalledOnce();
});
it("binds evidence to the current event without changing the generated prose", async () => {
  const value = { kind: "answered", reply: "Tools are provided!", evidence: [{ sectionId: "preparation", quote: "Gardening tools are provided." }] };
  expect(await answerFromSource(SAMPLE_SOURCE, "Tools?", config, undefined, completion(value))).toEqual({ ok: true, candidate: { ...identity, ...value, evidence: [{ ...identity, ...value.evidence[0] }] } });
});
it("uses joining instructions only from the selected public source", async () => {
  const source = { ...SAMPLE_SOURCE, sections: [{ id: "joining", label: "Joining", text: "Register using the event registration button." }] };
  const value = { kind: "answered", reply: "Use the event registration button to sign up!", evidence: [{ sectionId: "joining", quote: source.sections[0].text }] };
  expect((await answerFromSource(source, "yoo can i join", config, undefined, completion(value))).ok).toBe(true);
});
it.each(["asdfgh zxcv", "yooo ??", "cna i jion?", "???"])("lets the model clarify unclear text without a keyword filter: %s", async question => {
  const value = { kind: "needs_clarification", reply: "Happy to help! What would you like to know about the event?" };
  const fetcher = completion(value);
  expect(await answerFromSource(SAMPLE_SOURCE, question, config, undefined, fetcher)).toEqual({ ok: true, candidate: { ...identity, ...value, clarification: value.reply } });
  expect(fetcher).toHaveBeenCalledOnce();
});
it("accepts only a single complete JSON fence", async () => {
  const value = { kind: "unanswered", reply: "I'm not sure whether lunch is included." };
  expect((await answerFromSource(SAMPLE_SOURCE, "Lunch?", config, undefined, completion("\x60\x60\x60json\n" + JSON.stringify(value) + "\n\x60\x60\x60"))).ok).toBe(true);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  for (const text of ["Here's your answer: " + JSON.stringify(value), JSON.stringify(value) + JSON.stringify(value), '{"kind":"unanswered",']) {
    expect(await answerFromSource(SAMPLE_SOURCE, "Lunch?", config, undefined, completion(text))).toEqual({ ok: false, reason: "invalid_response" });
  }
});
it.each([
  { kind: "answered", reply: "Lunch is free!", evidence: [{ sectionId: "preparation", quote: "Lunch is free." }] },
  { kind: "answered", reply: "Tools are provided.", evidence: [{ eventId: "foreign", revision: "old", sectionId: "preparation", quote: "Gardening tools are provided." }] },
  { kind: "unanswered", reply: "Unknown.", eventId: "foreign", revision: "old" },
  { kind: "unanswered", reply: "Unknown.", eventId: identity.eventId },
  { kind: "unanswered", reply: "Unknown.", secret: "private-test-key" },
])("rejects false evidence, foreign or partial identity and unknown fields", async value => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  expect((await answerFromSource(SAMPLE_SOURCE, "Lunch?", config, undefined, completion(value))).ok).toBe(false);
});
it("rejects parseable capped output without retry and logs only a bounded stage", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const fetcher = completion({ kind: "unanswered", reply: "private-output-canary" }, "length");
  expect(await answerFromSource(SAMPLE_SOURCE, "private-question-canary", config, undefined, fetcher)).toEqual({ ok: false, reason: "invalid_response" });
  expect(fetcher).toHaveBeenCalledOnce();
  expect(JSON.parse(warn.mock.calls[0][0])).toEqual({ event: "student_ai_response_rejected", promptRevision: "student-conversational-v5", stage: "truncated", reason: "invalid_response" });
  expect(JSON.stringify(warn.mock.calls)).not.toMatch(/private-output-canary|private-question-canary|private-test-key/);
});
it.each([["not JSON", "json"], [{ kind: "unanswered", reply: "Unknown.", extra: "private-canary" }, "schema"]])("keeps failure diagnostics free of raw text", async (value, stage) => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  await answerFromSource(SAMPLE_SOURCE, "private-question-canary", config, undefined, completion(value));
  expect(JSON.parse(warn.mock.calls[0][0]).stage).toBe(stage);
  expect(JSON.stringify(warn.mock.calls)).not.toMatch(/private-canary|private-question-canary|private-test-key/);
});
