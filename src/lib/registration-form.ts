import { EVENT_LIMITS, type EventFields } from "./event-fields";

export const FORM_LIMITS = { questions: 10, label: 200, help: 500, short: 250, long: 2000, options: 10, optionLabel: 100 } as const;
export type FormOption = { id: string; label: string };
type BaseQuestion = { id: string; label: string; help?: string; required: boolean };
export type FormQuestion = BaseQuestion & ({ type: "short_text" } | { type: "long_text" } | { type: "single_choice"; options: FormOption[] } | { type: "multiple_choice"; options: FormOption[] });
export type RegistrationFormRevision = { formRevisionId: string; questions: FormQuestion[] };
export type AnswerValue = string | string[];
export type AnswerMap = Record<string, AnswerValue>;
export class FormValidationError extends Error {
  constructor(public readonly issues: Record<string, string>) { super("Review the highlighted fields."); }
}
const invalid = (key: string, message: string): never => { throw new FormValidationError({ [key]: message }); };
export function formObject(value: unknown, key = "form"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid(key, "Use a valid form object.");
  return value as Record<string, unknown>;
}
export function formKeys(value: Record<string, unknown>, allowed: string[], required: string[], key = "form") {
  if (Object.keys(value).some((name) => !allowed.includes(name)) || required.some((name) => !Object.hasOwn(value, name))) invalid(key, "Unsupported or missing fields.");
}
export function formId(value: unknown, key = "form"): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return invalid(key, "Use a valid version reference.");
  return value.toLowerCase();
}
function text(value: unknown, limit: number, key: string, multiline = false, blank = false) {
  if (typeof value !== "string") return invalid(key, "Enter text.");
  const normalised = value.normalize("NFC").replaceAll("\r\n", "\n").trim();
  const controls = multiline ? normalised.replace(/[\n\t]/g, "") : normalised;
  if ((!blank && !normalised) || [...normalised].length > limit || /[\p{Cc}\p{Zl}\p{Zp}]/u.test(controls)) return invalid(key, `Use ${blank ? "up to" : "1–"}${limit} characters without unsupported controls.`);
  return normalised;
}
/** Producer-supplied IDs only; neither a Student browser nor a submitted answer creates question identity. */
export function parseRegistrationForm(value: unknown): RegistrationFormRevision {
  const input = formObject(value);
  formKeys(input, ["formRevisionId", "questions"], ["formRevisionId", "questions"]);
  const formRevisionId = formId(input.formRevisionId);
  if (!Array.isArray(input.questions) || input.questions.length > FORM_LIMITS.questions) return invalid("form", "Use zero to ten questions.");
  const used = new Set<string>();
  function unique(value: unknown) { const id = formId(value); if (used.has(id)) invalid("form", "Question and option IDs must be unique."); used.add(id); return id; }
  const questions = input.questions.map((value): FormQuestion => {
    const item = formObject(value);
    const choice = item.type === "single_choice" || item.type === "multiple_choice";
    if (!["short_text", "long_text", "single_choice", "multiple_choice"].includes(item.type as string)) return invalid("form", "Unsupported question type.");
    formKeys(item, ["id", "type", "label", "help", "required", ...(choice ? ["options"] : [])], ["id", "type", "label", "required", ...(choice ? ["options"] : [])]);
    if (typeof item.required !== "boolean") return invalid("form", "Required must be true or false.");
    const base = { id: unique(item.id), label: text(item.label, FORM_LIMITS.label, "form"), required: item.required,
      ...(item.help !== undefined ? { help: text(item.help, FORM_LIMITS.help, "form", true, true) } : {}) };
    if (!choice) return { ...base, type: item.type as "short_text" | "long_text" };
    if (!Array.isArray(item.options) || item.options.length < 2 || item.options.length > FORM_LIMITS.options) return invalid("form", "Use two to ten options.");
    const options = item.options.map((value) => {
      const option = formObject(value); formKeys(option, ["id", "label"], ["id", "label"]);
      return { id: unique(option.id), label: text(option.label, FORM_LIMITS.optionLabel, "form") };
    });
    return { ...base, type: item.type as "single_choice" | "multiple_choice", options };
  });
  return { formRevisionId, questions };
}
export function validateAnswers(form: RegistrationFormRevision, value: unknown): AnswerMap {
  const input = formObject(value, "answers");
  const known = new Set(form.questions.map((question) => question.id));
  if (Object.keys(input).some((id) => !known.has(id))) return invalid("answers", "An answer refers to an unknown question.");
  const output: AnswerMap = {};
  const issues: Record<string, string> = {};
  for (const question of form.questions) {
    try {
      const answer = Object.hasOwn(input, question.id) ? input[question.id] : undefined;
      if (answer === undefined) { if (question.required) invalid(question.id, "Answer this required question."); continue; }
      if (question.type === "short_text" || question.type === "long_text") {
        const result = text(answer, question.type === "short_text" ? FORM_LIMITS.short : FORM_LIMITS.long, question.id, question.type === "long_text", !question.required);
        if (result) output[question.id] = result;
      } else if (question.type === "single_choice") {
        if (answer === "" && !question.required) continue;
        if (typeof answer !== "string" || !question.options.some((option) => option.id === answer)) invalid(question.id, "Choose one of the listed options.");
        output[question.id] = answer as string;
      } else {
        if (!Array.isArray(answer) || answer.some((id) => typeof id !== "string" || !question.options.some((option) => option.id === id)) || new Set(answer).size !== answer.length) invalid(question.id, "Choose only listed options, without duplicates.");
        const selected = answer as string[];
        if (!selected.length && question.required) invalid(question.id, "Choose at least one option.");
        if (selected.length) output[question.id] = question.options.filter((option) => selected.includes(option.id)).map((option) => option.id);
      }
    } catch (error) { if (!(error instanceof FormValidationError)) throw error; Object.assign(issues, error.issues); }
  }
  if (Object.keys(issues).length) throw new FormValidationError(issues);
  return output;
}
export function assertPublicFormBudget(fields: EventFields, form: RegistrationFormRevision) {
  const publicText = [...Object.keys(EVENT_LIMITS).map((key) => fields[key as keyof typeof EVENT_LIMITS]),
    ...form.questions.flatMap((question) => [question.label, question.help ?? "", ...("options" in question ? question.options.map((option) => option.label) : [])])].join("");
  if ([...publicText].length > 20000 || new TextEncoder().encode(publicText).byteLength > 48000) invalid("form", "Combined public content exceeds its character or byte limit.");
}
export function sameFormContent(a: RegistrationFormRevision, b: RegistrationFormRevision) {
  const content = (form: RegistrationFormRevision) => form.questions.map((question) => ({ id: question.id, type: question.type, label: question.label,
    help: question.help ?? "", required: question.required, options: "options" in question ? question.options.map(({ id, label }) => ({ id, label })) : [] }));
  return JSON.stringify(content(a)) === JSON.stringify(content(b));
}
export type PublicationContent = { fields: EventFields; form: RegistrationFormRevision };
export function publicationChanges(joined: PublicationContent, current: PublicationContent) {
  const changes: string[] = [];
  if (joined.fields.start !== current.fields.start || joined.fields.end !== current.fields.end) changes.push("Schedule");
  for (const [key, label] of [["location", "Location"], ["fee", "Fee"], ["openTo", "Open to"]] as const) if (joined.fields[key] !== current.fields[key]) changes.push(label);
  if (!sameFormContent(joined.form, current.form)) changes.push("Registration form");
  return changes;
}
