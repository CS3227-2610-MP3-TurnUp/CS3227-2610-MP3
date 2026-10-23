import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { assertPublicFormBudget, FormValidationError, parseRegistrationForm, publicationChanges, sameFormContent, validateAnswers } from "../../src/lib/registration-form";
import { confirmedSubmission, parseJoinRequest } from "../../src/server/registration/contracts";
import { eventId, fourQuestionForm, formTestId as id, publicFields } from "./fixtures";
const fresh = () => structuredClone(fourQuestionForm);
const form = parseRegistrationForm(fourQuestionForm);
const valid = () => ({ [id(2)]: "  Cafe\u0301  ", [id(4)]: id(5), [id(7)]: [id(9), id(8)] });
function badForm(change: (value: Record<string, unknown>) => void) { const value = fresh() as unknown as Record<string, unknown>; change(value); expect(() => parseRegistrationForm(value)).toThrow(FormValidationError); }
it("supports zero and varying question counts and all four types with stable IDs", () => {
  expect(parseRegistrationForm({ formRevisionId: id(1), questions: [] }).questions).toEqual([]);
  expect(form.questions.map((question) => question.type)).toEqual(["short_text", "long_text", "single_choice", "multiple_choice"]);
  expect(validateAnswers(parseRegistrationForm({ formRevisionId: id(1), questions: [] }), {})).toEqual({});
});
it.each([null, [], {}, { formRevisionId: id(1), questions: "text" }, { formRevisionId: "client-created", questions: [] }])("rejects malformed form %#", (value) => { expect(() => parseRegistrationForm(value)).toThrow(FormValidationError); });
it("rejects protected/unknown fields, unsupported types and executable schemas", () => {
  badForm((value) => { value.ownerId = "foreign"; });
  for (const extra of [{ type: "file" }, { script: "execute()" }, { validation: ".*" }, { role: "ORGANISER" }, { options: [] }]) {
    badForm((value) => { Object.assign((value.questions as object[])[0], extra); });
  }
});
it("rejects duplicate question/option IDs and malformed boolean/choice definitions", () => {
  badForm((value) => { (value.questions as { id: string }[])[1].id = id(2); });
  const choice = fresh().questions[2];
  for (const options of [[], [choice.options![0]], [...choice.options!, ...Array.from({ length: 9 }, (_, n) => ({ id: id(20 + n), label: "Extra" }))], [choice.options![0], choice.options![0]]]) {
    const candidate = fresh(); candidate.questions[2].options = options;
    expect(() => parseRegistrationForm(candidate)).toThrow(FormValidationError);
  }
  badForm((value) => { (value.questions as Record<string, unknown>[])[0].required = "yes"; });
});
it("enforces question/label/help/option limits without truncating Unicode", () => {
  badForm((value) => { value.questions = Array.from({ length: 11 }, (_, n) => ({ id: id(100 + n), type: "short_text", label: "Question", required: false })); });
  const candidate = fresh(); candidate.questions[0].label = "🌱".repeat(200);
  expect(parseRegistrationForm(candidate).questions[0].label).toHaveLength(400);
  for (const extra of [{ label: "x".repeat(201) }, { help: "x".repeat(501) }, { label: "a\nb" }, { label: "a\u0000b" }]) badForm((value) => { Object.assign((value.questions as object[])[0], extra); });
  candidate.questions[2].options![0].label = "x".repeat(101);
  expect(() => parseRegistrationForm(candidate)).toThrow(FormValidationError);
});
it("canonicalises text and schema-ordered multiple choices without changing captured wording", () => {
  const output = validateAnswers(form, valid());
  expect(output[id(2)]).toBe("Café"); expect(output[id(7)]).toEqual([id(8), id(9)]);
  expect(form.questions[0].label).toBe("Preferred workshop");
});
it("collects multiple required errors and rejects missing/wrong types/unknown IDs", () => {
  try { validateAnswers(form, {}); throw new Error("Expected validation error"); } catch (error) {
    expect(error).toBeInstanceOf(FormValidationError); expect(Object.keys((error as FormValidationError).issues)).toEqual([id(2), id(4)]);
  }
  for (const value of [{ ...valid(), [id(2)]: [] }, { ...valid(), [id(4)]: [id(5)] }, { ...valid(), [id(7)]: id(8) }, { ...valid(), [id(99)]: "forged" }, { ...valid(), role: "ORGANISER" }]) expect(() => validateAnswers(form, value)).toThrow(FormValidationError);
});
it("rejects repeated/unknown options and required empty choice; optional blanks are absent", () => {
  for (const value of [{ ...valid(), [id(7)]: [id(8), id(8)] }, { ...valid(), [id(7)]: [id(99)] }, { ...valid(), [id(4)]: "" }]) expect(() => validateAnswers(form, value)).toThrow(FormValidationError);
  expect(validateAnswers(form, { ...valid(), [id(3)]: "   ", [id(7)]: [] })).toEqual({ [id(2)]: "Café", [id(4)]: id(5) });
});
it("enforces text answer limits, line endings and controls", () => {
  expect(validateAnswers(form, { ...valid(), [id(2)]: "🌱".repeat(250), [id(3)]: "a\r\nb\tc" })[id(3)]).toBe("a\nb\tc");
  for (const value of [{ ...valid(), [id(2)]: "🌱".repeat(251) }, { ...valid(), [id(3)]: "a".repeat(2001) }, { ...valid(), [id(2)]: "a\nb" }, { ...valid(), [id(3)]: "a\u0000b" }]) expect(() => validateAnswers(form, value)).toThrow(FormValidationError);
});
it("validates historical answers against captured form without forcing new requirements", () => {
  const newer = fresh(); newer.questions[2].options![0].id = id(30);
  expect(validateAnswers(form, valid())[id(4)]).toBe(id(5));
  expect(() => validateAnswers(parseRegistrationForm(newer), valid())).toThrow(FormValidationError);
});
it("requires event contact details and accepts a phone number or Telegram handle", () => {
  expect(confirmedSubmission(form, { name: "  Cafe\u0301  ", phone: "+65 (1234)-5678", answers: valid(), sharingConfirmed: true })).toMatchObject({ name: "Café", phone: "+6512345678" });
  expect(confirmedSubmission(form, { name: "Student", phone: "@turnup_student", answers: valid(), sharingConfirmed: true })).toMatchObject({ phone: "@turnup_student" });
  for (const extra of [{ sharingConfirmed: false }, { name: "" }, { name: "x".repeat(101) }, { phone: "" }, { phone: "abc" }, { role: "ORGANISER" }]) expect(() => confirmedSubmission(form, { name: "Student", phone: "+6512345678", answers: valid(), sharingConfirmed: true, ...extra })).toThrow(FormValidationError);
});
it("requires exact version/key/request shape and rejects forged actor/profile/owner overrides", () => {
  const payload = { expectedPublicationId: eventId, expectedFormRevisionId: form.formRevisionId, idempotencyKey: id(40), name: "Student", phone: "+6512345678", answers: valid(), sharingConfirmed: true };
  expect(parseJoinRequest(form, payload)).toMatchObject({ expectedPublicationId: eventId, sharingConfirmed: true });
  for (const extra of [{ expectedFormRevisionId: id(99) }, { idempotencyKey: "bad" }, { studentId: "foreign" }, { profileVersion: 5 }, { ownerId: "forged" }]) expect(() => parseJoinRequest(form, { ...payload, ...extra })).toThrow(FormValidationError);
});
it("counts all public form text in the combined publication budget, independently from answers", () => {
  expect(() => assertPublicFormBudget(publicFields, form)).not.toThrow();
  const unicode = { ...publicFields, title: "🌱".repeat(150), description: "🌱".repeat(4000), location: "🌱".repeat(1000), fee: "🌱".repeat(500), openTo: "🌱".repeat(1000), preparation: "🌱".repeat(2000), other: "🌱".repeat(4000) };
  expect(() => assertPublicFormBudget(unicode, form)).toThrow(FormValidationError);
  const many = parseRegistrationForm({ formRevisionId: id(1), questions: Array.from({ length: 10 }, (_, n) => ({ id: id(100 + n * 20), type: "multiple_choice", label: "a".repeat(200), help: "h".repeat(500), required: false, options: Array.from({ length: 10 }, (_, m) => ({ id: id(101 + n * 20 + m), label: "o".repeat(100) })) })) });
  expect(() => assertPublicFormBudget({ ...unicode, ...Object.fromEntries(Object.entries(unicode).filter(([, v]) => typeof v === "string").map(([k, v]) => [k, (v as string).replaceAll("🌱", "a")])) }, many)).toThrow(FormValidationError);
});
it("flags semantic content changes and reversals, ignoring new empty-form revision IDs", () => {
  const empty = { formRevisionId: id(1), questions: [] };
  expect(sameFormContent(empty, { ...empty, formRevisionId: id(99) })).toBe(true);
  const baseline = { fields: publicFields, form };
  expect(publicationChanges(baseline, { fields: { ...publicFields }, form: { ...form, formRevisionId: id(99) } })).toEqual([]);
  const changed = { fields: { ...publicFields, location: "New hall", fee: "$2" }, form: parseRegistrationForm({ ...fresh(), questions: [...fresh().questions].reverse() }) };
  expect(publicationChanges(baseline, changed)).toEqual(["Location", "Fee", "Registration form"]);
  expect(publicationChanges(baseline, baseline)).toEqual([]);
});
