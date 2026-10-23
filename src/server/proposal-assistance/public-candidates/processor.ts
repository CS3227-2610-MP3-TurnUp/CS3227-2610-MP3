import "server-only";

import {
  MAX_PUBLIC_CANDIDATE_OTHER_LENGTH,
  MAX_PUBLIC_CANDIDATE_QUESTIONS,
  MAX_PUBLIC_CANDIDATE_QUESTION_LENGTH,
  MAX_PUBLIC_CANDIDATE_REFERENCES,
  MAX_PUBLIC_CANDIDATE_QUOTE_LENGTH,
  PUBLIC_CANDIDATE_SOURCE_FIELDS,
  renderAnsweredFaqs,
  type AnsweredPublicFaq,
  type PublicCandidateReference,
  type PublicCandidateSource,
  type PublicCandidates,
} from "../../../features/proposal-assistance/public-candidates";
import { EVENT_LIMITS } from "../../../lib/event-fields";
import type { ProposalCompletionResult } from "../transport";
import { buildPublicCandidateInput } from "./prompt";

export type PublicCandidateCompletion = (input: { system: string; user: string; signal?: AbortSignal }) => Promise<ProposalCompletionResult>;
export const PUBLIC_CANDIDATE_REJECTION_CODES = [
  "PROVIDER_INVALID_RESPONSE",
  "OUTPUT_TOKEN_LIMIT",
  "JSON_SYNTAX",
  "ROOT_SHAPE",
  "FAQ_LIST_BOUND",
  "FAQ_ITEM_SHAPE",
  "FAQ_QUESTION_BOUND",
  "FAQ_REFERENCE_INVALID",
  "OTHER_BOUND",
  "TOTAL_PUBLIC_BOUND",
] as const;
export type PublicCandidateRejectionCode = (typeof PUBLIC_CANDIDATE_REJECTION_CODES)[number];
export type PublicCandidateProcessingResult<T> =
  | { ok: true; value: T }
  | { ok: false; outcome: string; rejectionCode?: PublicCandidateRejectionCode };

type CandidateValueResult<T> = { ok: true; value: T } | { ok: false; rejectionCode: PublicCandidateRejectionCode };

const MAX_INPUT_BYTES = 65_536;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

export async function processPublicCandidates(
  source: PublicCandidateSource,
  complete: PublicCandidateCompletion,
  signal?: AbortSignal,
): Promise<PublicCandidateProcessingResult<PublicCandidates>> {
  const input = buildPublicCandidateInput(source);
  const encoder = new TextEncoder();
  if (encoder.encode(input.system).byteLength + encoder.encode(input.user).byteLength > MAX_INPUT_BYTES) {
    return { ok: false, outcome: "input_too_large" };
  }
  const completion = await complete({ ...input, ...(signal ? { signal } : {}) });
  if (!completion.ok) return {
    ok: false,
    outcome: completion.outcome,
    ...(completion.outcome === "invalid_response" ? { rejectionCode: "PROVIDER_INVALID_RESPONSE" as const } : {}),
  };
  if (completion.finishReason === "length") return { ok: false, outcome: "invalid_response", rejectionCode: "OUTPUT_TOKEN_LIMIT" };
  const parsed = parsePublicCandidateResponse(completion.text, source);
  return parsed;
}

export function parsePublicCandidateResponse(
  text: string,
  source: PublicCandidateSource,
): PublicCandidateProcessingResult<PublicCandidates> {
  let value: unknown;
  try { value = JSON.parse(text) as unknown; }
  catch { return invalid("JSON_SYNTAX"); }

  const root = record(value);
  if (!root || !exactKeys(root, ["faqs"]) || !Array.isArray(root.faqs)) return invalid("ROOT_SHAPE");
  if (root.faqs.length < 1 || root.faqs.length > MAX_PUBLIC_CANDIDATE_QUESTIONS) return invalid("FAQ_LIST_BOUND");

  const answeredFaqs: AnsweredPublicFaq[] = [];
  const unansweredQuestions: string[] = [];
  for (const item of root.faqs) {
    const parsed = parseFaq(item, source);
    if (!parsed.ok) return invalid(parsed.rejectionCode);
    if (parsed.value.references.length === 0) unansweredQuestions.push(parsed.value.question);
    else answeredFaqs.push({
      question: parsed.value.question,
      answer: parsed.value.references.map((reference) => reference.quote).join(" "),
      references: parsed.value.references,
    });
  }

  const renderedOther = renderAnsweredFaqs(answeredFaqs);
  if ([...renderedOther].length > MAX_PUBLIC_CANDIDATE_OTHER_LENGTH || [...renderedOther].length > EVENT_LIMITS.other || CONTROL_CHARACTERS.test(renderedOther)) return invalid("OTHER_BOUND");

  const combined = [
    renderedOther,
    ...PUBLIC_CANDIDATE_SOURCE_FIELDS.filter((field) => field !== "other").map((field) => source[field]),
  ].join("");
  if ([...combined].length > 20_000 || encoderByteLength(combined) > 48_000) return invalid("TOTAL_PUBLIC_BOUND");

  return {
    ok: true,
    value: {
      answeredFaqs,
      unansweredQuestions,
      renderedOther,
    },
  };
}

function parseFaq(value: unknown, source: PublicCandidateSource): CandidateValueResult<{ question: string; references: PublicCandidateReference[] }> {
  const input = record(value);
  // Model-generated answer keys are forbidden, even when an answer looks plausible.
  if (!input || !exactKeys(input, ["question", "references"])) return { ok: false, rejectionCode: "FAQ_ITEM_SHAPE" };
  const question = boundedText(input.question, MAX_PUBLIC_CANDIDATE_QUESTION_LENGTH);
  const references = parseReferences(input.references, source, { min: 0 });
  if (question === null || !question) return { ok: false, rejectionCode: "FAQ_QUESTION_BOUND" };
  if (!references) return { ok: false, rejectionCode: "FAQ_REFERENCE_INVALID" };
  return { ok: true, value: { question, references } };
}

function parseReferences(
  value: unknown,
  source: PublicCandidateSource,
  bounds: { min: number },
): PublicCandidateReference[] | null {
  if (!Array.isArray(value) || value.length < bounds.min || value.length > MAX_PUBLIC_CANDIDATE_REFERENCES) return null;
  const references: PublicCandidateReference[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const reference = record(item);
    if (!reference || !exactKeys(reference, ["field", "quote"]) ||
      typeof reference.field !== "string" || !(PUBLIC_CANDIDATE_SOURCE_FIELDS as readonly string[]).includes(reference.field)) return null;
    const field = reference.field as PublicCandidateReference["field"];
    const quote = reference.quote;
    if (typeof quote !== "string" || !quote.trim() || [...quote].length > MAX_PUBLIC_CANDIDATE_QUOTE_LENGTH || !source[field].includes(quote)) return null;
    const key = `${field}\u0000${quote}`;
    if (seen.has(key)) return null;
    seen.add(key);
    references.push({ field, quote });
  }
  return references;
}

function boundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFC").trim();
  if (!normalized || [...normalized].length > maxLength || CONTROL_CHARACTERS.test(normalized)) return null;
  return normalized;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  return Object.keys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function encoderByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function invalid(rejectionCode: PublicCandidateRejectionCode): PublicCandidateProcessingResult<never> {
  return { ok: false, outcome: "invalid_response", rejectionCode };
}
