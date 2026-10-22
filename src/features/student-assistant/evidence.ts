import type { AnswerValidationResult, PublicSourceSnapshot, SourceValidationResult, ValidatedAnswer, VerifiedEvidence } from "./types";

const validatedAnswers = new WeakSet<object>();
/** Rejects structurally similar objects and type casts at the rendering boundary. */
export function isValidatedAnswer(value: unknown): value is ValidatedAnswer {
  return typeof value === "object" && value !== null && validatedAnswers.has(value);
}

/** Preview-only ceilings; these do not establish production/provider budgets. */
export const ASSISTANT_LIMITS = Object.freeze({
  questionCodePoints: 1_000, sourceBytes: 32 * 1_024, candidateBytes: 32 * 1_024,
  sections: 32, evidence: 8, quoteCodePoints: 500, guidanceCodePoints: 500,
  replyCodePoints: 700, guidanceFragments: 8, identityCodePoints: 128, titleCodePoints: 200, labelCodePoints: 200,
});

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
    && Reflect.ownKeys(value).every((key) => typeof key === "string"
      && Object.getOwnPropertyDescriptor(value, key)?.enumerable === true
      && Object.getOwnPropertyDescriptor(value, key)?.get === undefined);
}
function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function list(value: unknown): value is unknown[] {
  return Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype
    && Reflect.ownKeys(value).length === value.length + 1
    && Array.from({ length: value.length }, (_, index) => Object.getOwnPropertyDescriptor(value, String(index)))
      .every((descriptor) => descriptor !== undefined && Object.hasOwn(descriptor, "value"));
}
function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.isWellFormed() && value.trim().length > 0 && Array.from(value).length <= max;
}
function bounded(value: unknown, bytes: number): boolean {
  const json = JSON.stringify(value);
  return typeof json === "string" && new TextEncoder().encode(json).length <= bytes;
}
function identity(value: Record<string, unknown>): boolean {
  return text(value.eventId, ASSISTANT_LIMITS.identityCodePoints) && text(value.revision, ASSISTANT_LIMITS.identityCodePoints);
}

export function validateSource(value: unknown): SourceValidationResult {
  try {
    if (!record(value) || !exact(value, ["eventId", "revision", "title", "sections"]) || !identity(value)
      || !text(value.title, ASSISTANT_LIMITS.titleCodePoints) || !list(value.sections)
      || value.sections.length === 0 || value.sections.length > ASSISTANT_LIMITS.sections) return { ok: false, reason: "invalid_source" };
    const ids = new Set<string>();
    const sections: PublicSourceSnapshot["sections"][number][] = [];
    for (const section of value.sections) {
      if (!record(section) || !exact(section, ["id", "label", "text"])
        || !text(section.id, ASSISTANT_LIMITS.identityCodePoints) || ids.has(section.id)
        || !text(section.label, ASSISTANT_LIMITS.labelCodePoints) || !text(section.text, ASSISTANT_LIMITS.sourceBytes)) return { ok: false, reason: "invalid_source" };
      ids.add(section.id);
      sections.push(Object.freeze({ id: section.id, label: section.label, text: section.text }));
    }
    if (!bounded(value, ASSISTANT_LIMITS.sourceBytes)) return { ok: false, reason: "invalid_source" };
    return { ok: true, source: Object.freeze({ eventId: value.eventId as string, revision: value.revision as string,
      title: value.title, sections: Object.freeze(sections) }) };
  } catch { return { ok: false, reason: "invalid_source" }; }
}

/** Validates quotation provenance only. Live relevance/completeness require separate evaluation. */
export function validateAnswer(candidate: unknown, sourceInput: unknown): AnswerValidationResult {
  const sourceResult = validateSource(sourceInput);
  if (!sourceResult.ok) return sourceResult;
  const source = sourceResult.source;
  try {
    if (!record(candidate) || !identity(candidate)) return { ok: false, reason: "invalid_response" };
    if (candidate.eventId !== source.eventId || candidate.revision !== source.revision) return { ok: false, reason: "invalid_evidence" };
    const replyKeys = Object.hasOwn(candidate, "reply") ? ["reply"] : [];
    if (replyKeys.length && !text(candidate.reply, ASSISTANT_LIMITS.replyCodePoints)) return { ok: false, reason: "invalid_response" };
    // Provenance is verified below; arbitrary paraphrase entailment is not proven by schema validation.
    const common = { eventId: source.eventId, revision: source.revision, ...(replyKeys.length ? { reply: candidate.reply as string } : {}) };
    let output: object;
    switch (candidate.kind) {
      case "answered":
      case "partially_answered": {
        const keys = [...replyKeys, "kind", "eventId", "revision", "evidence", ...(candidate.kind === "partially_answered" ? ["unresolved"] : [])];
        if (!exact(candidate, keys)) return { ok: false, reason: "invalid_response" };
        if (!list(candidate.evidence) || candidate.evidence.length === 0 || candidate.evidence.length > ASSISTANT_LIMITS.evidence) return { ok: false, reason: "invalid_evidence" };
        const seen = new Set<string>();
        const evidence: VerifiedEvidence[] = [];
        for (const ref of candidate.evidence) {
          if (!record(ref) || !exact(ref, ["eventId", "revision", "sectionId", "quote"]) || !identity(ref)
            || ref.eventId !== source.eventId || ref.revision !== source.revision
            || !text(ref.sectionId, ASSISTANT_LIMITS.identityCodePoints) || !text(ref.quote, ASSISTANT_LIMITS.quoteCodePoints)) return { ok: false, reason: "invalid_evidence" };
          const section = source.sections.find((entry) => entry.id === ref.sectionId);
          const key = JSON.stringify([ref.sectionId, ref.quote]);
          if (!section || !section.text.includes(ref.quote) || seen.has(key)) return { ok: false, reason: "invalid_evidence" };
          seen.add(key);
          // Take the rendered text from the validated source, never model factual prose.
          const start = section.text.indexOf(ref.quote);
          evidence.push(Object.freeze({ sectionId: section.id, label: section.label, quote: section.text.slice(start, start + ref.quote.length) }));
        }
        if (candidate.kind === "partially_answered") {
          if (!list(candidate.unresolved) || candidate.unresolved.length === 0 || candidate.unresolved.length > ASSISTANT_LIMITS.guidanceFragments
            || !candidate.unresolved.every((part) => text(part, ASSISTANT_LIMITS.guidanceCodePoints))
            || new Set(candidate.unresolved).size !== candidate.unresolved.length) return { ok: false, reason: "invalid_response" };
          output = { ...common, kind: candidate.kind, evidence: Object.freeze(evidence), unresolved: Object.freeze([...candidate.unresolved]) };
        } else output = { ...common, kind: candidate.kind, evidence: Object.freeze(evidence) };
        break;
      }
      case "needs_clarification":
        if (!exact(candidate, [...replyKeys, "kind", "eventId", "revision", "clarification"]) || !text(candidate.clarification, ASSISTANT_LIMITS.guidanceCodePoints)) return { ok: false, reason: "invalid_response" };
        output = { ...common, kind: candidate.kind, clarification: candidate.clarification };
        break;
      case "unanswered":
      case "out_of_scope":
        if (!exact(candidate, [...replyKeys, "kind", "eventId", "revision"])) return { ok: false, reason: "invalid_response" };
        output = { ...common, kind: candidate.kind };
        break;
      default: return { ok: false, reason: "invalid_response" };
    }
    if (!bounded(candidate, ASSISTANT_LIMITS.candidateBytes)) return { ok: false, reason: "invalid_response" };
    const answer = Object.freeze(output) as ValidatedAnswer;
    validatedAnswers.add(answer);
    return { ok: true, answer };
  } catch { return { ok: false, reason: "invalid_response" }; }
}
