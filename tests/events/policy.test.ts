import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { EMPTY_EVENT, EVENT_LIMITS, singaporeInput, singaporeInstant } from "../../src/lib/event-fields";
import { parseFields, validatePublication, publicationSnapshot, digest } from "../../src/server/events/policy";
const fields = { ...EMPTY_EVENT, title: "Campus workshop", description: "Learn together", location: "Room 1", fee: "Free", openTo: "Anyone", preparation: "None", capacity: 10, start: "2026-11-01T02:00:00.000Z", end: "2026-11-01T04:00:00.000Z" };
const now = new Date("2026-10-21T00:00:00Z");
it("saves blank/incomplete drafts and normalises Unicode without silently truncating", () => {
  expect(parseFields(EMPTY_EVENT)).toEqual(EMPTY_EVENT);
  expect(parseFields({ ...fields, title: "  Cafe\u0301 🎉  " }).title).toBe("Café 🎉");
  expect(() => validatePublication(EMPTY_EVENT, "DRAFT", undefined, now)).toThrow("required");
});
for (const [key, bound] of Object.entries(EVENT_LIMITS)) it(`${key} accepts the exact code-point limit and rejects the next character`, () => {
  const valid = { ...EMPTY_EVENT, [key]: "🎉".repeat(bound) };
  expect(parseFields(valid)[key as keyof typeof EVENT_LIMITS]).toBe(valid[key as keyof typeof EVENT_LIMITS]);
  expect(() => parseFields({ ...valid, [key]: "🎉".repeat(bound + 1) })).toThrow("at most");
});
it("enforces aggregate UTF-8 bytes independently of character limits", () => {
  // All individual fields remain valid; emoji consumes four bytes per code point.
  const input = { ...fields, description: "🎉".repeat(4000), preparation: "🎉".repeat(2000), other: "🎉".repeat(4000), location: "🎉".repeat(1000), openTo: "🎉".repeat(1000) };
  expect(() => parseFields(input)).toThrow("combined");
  expect(parseFields({ ...input, other: "" })).toMatchObject({ other: "" });
});
it("rejects unknown identity/form fields, invalid dates and numeric capacity", () => {
  for (const extra of [{ ownerId: "foreign" }, { form: { questions: [] } }, { state: "PUBLISHED" }]) expect(() => parseFields({ ...fields, ...extra })).toThrow("unsupported");
  for (const capacity of [0, -1, 1.2, 10001, "10", undefined]) expect(() => parseFields({ ...fields, capacity })).toThrow("Capacity");
  expect(parseFields({ ...fields, capacity: 10000 }).capacity).toBe(10000);
  for (const start of ["2026-02-30T02:00:00.000Z", "yesterday", "2026-11-01T02:00:00+08:00"]) expect(() => parseFields({ ...fields, start })).toThrow("valid date");
});
it("applies first-publication/republication timing at the exact server boundary", () => {
  const atStart = new Date(fields.start);
  for (const state of ["DRAFT", "WITHDRAWN"]) {
    expect(() => validatePublication(fields, state, undefined, atStart)).toThrow("future");
    expect(() => validatePublication(fields, state, undefined, new Date(atStart.getTime() - 1))).not.toThrow();
  }
  expect(() => validatePublication(fields, "PUBLISHED", fields.start, new Date(fields.end))).not.toThrow();
  expect(() => validatePublication(fields, "PUBLISHED", "2026-11-02T02:00:00.000Z", now)).not.toThrow();
  expect(() => validatePublication({ ...fields, end: fields.start }, "DRAFT", undefined, now)).toThrow("after start");
});
it("round trips Singapore entry to a UTC instant without the machine's local timezone", () => {
  expect(singaporeInstant("2026-11-01T10:00")).toBe(fields.start);
  expect(singaporeInput(fields.start)).toBe("2026-11-01T10:00");
  expect(singaporeInstant("")).toBe("");
});
it("binds every public field and the empty form revision in the digest", () => {
  const snapshot = publicationSnapshot(fields, "form-1");
  expect(snapshot.form.questions).toEqual([]);
  expect(digest(snapshot)).not.toBe(digest(publicationSnapshot({ ...fields, fee: "$2" }, "form-1")));
  expect(digest(snapshot)).not.toBe(digest(publicationSnapshot(fields, "form-2")));
});
it("keeps publication digests stable across recursive JSONB object-key reordering", () => {
  const snapshot = publicationSnapshot(fields, "form-1");
  const reordered = { form: { questions: [], formRevisionId: "form-1" }, fields: Object.fromEntries(Object.entries(fields).reverse()) };
  expect(JSON.stringify(snapshot)).not.toBe(JSON.stringify(reordered));
  expect(digest(reordered)).toBe(digest(snapshot));
  expect(digest({ questions: [{ id: "q1" }, { id: "q2" }] })).not.toBe(digest({ questions: [{ id: "q2" }, { id: "q1" }] }));
});

it("allows any future changed start, including after the prior event began, but rejects past/exact-now changes", () => {
  const current = new Date("2026-11-01T01:00:00.000Z");
  expect(() => validatePublication(fields, "PUBLISHED", "2026-11-01T03:00:00.000Z", current)).not.toThrow();
  expect(() => validatePublication(fields, "PUBLISHED", "2026-10-31T03:00:00.000Z", current)).not.toThrow();
  for (const start of ["2026-11-01T01:00:00.000Z", "2026-11-01T00:00:00.000Z"]) {
    expect(() => validatePublication({ ...fields, start }, "PUBLISHED", fields.start, current)).toThrow("changed start must be in the future");
  }
  const begun = new Date("2026-11-01T03:00:00.000Z");
  expect(() => validatePublication(fields, "PUBLISHED", fields.start, begun)).not.toThrow();
  expect(() => validatePublication(fields, "WITHDRAWN", fields.start, begun)).toThrow("future");
});
