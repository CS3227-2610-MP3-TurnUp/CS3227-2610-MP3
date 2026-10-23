import type { PageEvidence, ProposalField, ProposalFinding } from "./types";
import { PROPOSAL_FIELD_VALUE_LIMITS } from "./extraction-schema";
import { MAX_CONFLICT_ALTERNATIVES } from "./limits";

export const MAX_FIELD_CHARS = 4_000;
export const MAX_PRIVATE_FINDING_CHARS = 2_000;
export const MAX_EVIDENCE_QUOTE_CHARS = 300;
export const MAX_EVIDENCE_PER_FACT = 5;
export const MAX_PRIVATE_FINDINGS = 10;

// Model-written values and notes may only repeat links, email addresses and phone numbers found in their
// supporting source text. A contact that appears in cited injected text is still accepted, so instruction-like
// sentences are also excluded from evidence below. Quantifiers are bounded: page text is attacker-controlled.
const CONTACT_PATTERN = new RegExp([
  String.raw`[\p{L}\p{N}._%+-]{1,64}@(?:[\p{L}\p{N}-]{1,63}\.){1,8}\p{L}{2,24}`,
  String.raw`(?:https?:\/\/|www\.)[^\s<>"']{1,300}`,
  String.raw`(?<![\p{L}\p{N}-])(?<![\p{L}\p{N}]\.)(?:[\p{L}\p{N}-]{1,63}\.){1,8}\p{L}{2,24}(?![\p{L}\p{N}-])(?:\/[^\s<>"']{0,300})?`,
  String.raw`\+?\d(?:[\s.()-]{0,2}\d){7,19}`,
].join("|"), "giu");
const DATE_LIKE = /^(?:\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}[-./ ]\d{1,2}[-./ ]\d{4})/u;
const CONTACT_CHECKED_FIELDS: ReadonlySet<ProposalField> = new Set(["title", "purpose", "location", "feeStatus", "openTo", "preparation"]);

/** Zero-width, bidirectional-control, soft-hyphen and Unicode tag characters, shared with PDF text cleaning. */
export const INVISIBLE_CHARACTERS = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]|[\u{E0000}-\u{E007F}]/gu;

// Dot look-alikes, bracketed dots and a space before a dot, used to disguise a domain. "word. word" is left
// alone because it is indistinguishable from an ordinary sentence ending.
const DISGUISED_DOT =
  /\s{0,3}[\u3002\uFF0E\uFF61\u2024\u2027\uFE52\u00B7]\s{0,3}|\s{0,3}[[({<]\s{0,3}(?:\.|dot)\s{0,3}[\])}>]\s{0,3}|(?<=[\p{L}\p{N}])\s{1,3}\.(?=[\p{L}\p{N}])|(?<=[\p{L}\p{N}])\s{1,3}\.\s{1,3}(?=[\p{L}\p{N}])/giu;

// Markers of text written to steer an automated assistant. Each needs an AI target or an
// instruction-override phrase, so topics such as "AI club" or "system prompt design" alone do not match.
// Ordinary-looking false facts and split-sentence injections still rely on Organiser review.
const INSTRUCTION_PATTERNS = [
  /\b(?:ignore|disregard|override|forget)\s+(?:all\s+|any\s+|the\s+|your\s+)?(?:(?:previous|prior|above|earlier|preceding|system|these|those|other)\s+)?(?:instructions|prompts?)\b/iu,
  /\b(?:ignore|disregard)\s+(?:all|any|your|the)\s+(?:(?:previous|prior|above|earlier|system)\s+)?rules\b/iu,
  /\b(?:note|message|instructions?|command|reminder)\s+(?:to|for)\s+(?:the\s+|any\s+)?(?:ai|llm|chatbot|language\s+model)\b(?!\s+(?:club|society|group|team|members?|workshop|course|module|interest))/iu,
  /\b(?:you\s+are|act\s+as|pretend\s+to\s+be)\s+(?:now\s+)?(?:an?|the)\s+(?:ai|llm|language\s+model|chatbot)\b/iu,
  /\b(?:reveal|print|show|repeat|output)\s+(?:your\s+(?:system\s+)?|the\s+system\s+)(?:prompt|instructions)\b/iu,
];
const GLOBAL_INSTRUCTION_PATTERNS = INSTRUCTION_PATTERNS.map((pattern) => new RegExp(pattern.source, `${pattern.flags}g`));
const SENTENCE_SEARCH_LIMIT = 500;
const pageInstructionSpans = new WeakMap<readonly string[], Array<Array<[number, number]>>>();
const MAX_QUOTE_OCCURRENCES_CHECKED = 200;

export const INJECTION_FINDING_TEXT = "contains text addressed to an automated assistant; check values cited from this page.";

/** The private review note recorded for a page that contains assistant-directed instructions. */
export function injectionFinding(page: number): string {
  return `Page ${page} ${INJECTION_FINDING_TEXT}`;
}

/** True when text matches an assistant-directed instruction marker. */
export function looksLikeInstruction(text: string): boolean {
  return INSTRUCTION_PATTERNS.some((pattern) => pattern.test(text));
}

/** Sentence-level spans of text that contain an instruction marker. */
export function instructionSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (const pattern of GLOBAL_INSTRUCTION_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      spans.push([sentenceStart(text, match.index), sentenceEnd(text, match.index + match[0].length)]);
    }
  }
  return spans;
}

export type ContactSupport = { keys: ReadonlySet<string>; phones: readonly string[] };

/** Contacts available in supporting text; build once and reuse across checks. */
export function contactSupport(text: string): ContactSupport {
  const keys = new Set<string>();
  const phones: string[] = [];
  for (const token of contactTokens(text)) {
    keys.add(token.key);
    if (token.host) keys.add(`host:${token.host}`);
    if (token.key.startsWith("tel:")) phones.push(token.key.slice(4));
  }
  return { keys, phones };
}

/** True when every contact in text is supported. Private notes skip phone checks so reformatted dates are kept. */
export function hasOnlySupportedContacts(text: string, support: ContactSupport, options: { phones?: boolean } = {}): boolean {
  return contactTokens(text).every(({ key }) => {
    if (key.startsWith("tel:")) {
      if (options.phones === false) return true;
      const digits = key.slice(4);
      return support.phones.some((phone) => phone.endsWith(digits));
    }
    return support.keys.has(key);
  });
}

function contactTokens(text: string): Array<{ key: string; host?: string }> {
  const normalized = text.normalize("NFKC").replace(INVISIBLE_CHARACTERS, "").replace(DISGUISED_DOT, ".");
  const tokens: Array<{ key: string; host?: string }> = [];
  for (const [raw] of normalized.matchAll(CONTACT_PATTERN)) {
    const token = raw.toLowerCase().replace(/[.,;:!?)\]'"]+$/u, "");
    if (token.includes("@")) {
      tokens.push({ key: `email:${token}`, host: token.slice(token.lastIndexOf("@") + 1) });
    } else if (/^\+?\d/u.test(token) && !/[a-z]/u.test(token)) {
      if (!DATE_LIKE.test(token)) tokens.push({ key: `tel:${token.replace(/\D/gu, "")}` });
    } else {
      const address = token.replace(/^https?:\/\//u, "").replace(/^www\./u, "");
      const slash = address.indexOf("/");
      tokens.push(slash === -1 || slash === address.length - 1
        ? { key: `host:${address.replace(/\/$/u, "")}` }
        : { key: `url:${address}`, host: address.slice(0, slash) });
    }
  }
  return tokens;
}

function sentenceStart(text: string, from: number): number {
  for (let index = from - 1; index >= Math.max(0, from - SENTENCE_SEARCH_LIMIT); index -= 1) {
    if (".!?".includes(text[index] ?? "") && /\s/u.test(text[index + 1] ?? "")) return index + 2;
  }
  return Math.max(0, from - SENTENCE_SEARCH_LIMIT);
}

function sentenceEnd(text: string, from: number): number {
  for (let index = from; index < Math.min(text.length, from + SENTENCE_SEARCH_LIMIT); index += 1) {
    if (".!?".includes(text[index] ?? "") && (index + 1 === text.length || /\s/u.test(text[index + 1] ?? ""))) return index + 1;
  }
  return Math.min(text.length, from + SENTENCE_SEARCH_LIMIT);
}

/** True when the quote occurs on the page at least once outside every instruction-marker sentence. */
function hasUnflaggedOccurrence(pageTexts: readonly string[], pageIndex: number, quote: string): boolean {
  let spansByPage = pageInstructionSpans.get(pageTexts);
  if (!spansByPage) {
    spansByPage = pageTexts.map((text) => mergeSpans(instructionSpans(text)));
    pageInstructionSpans.set(pageTexts, spansByPage);
  }
  const page = pageTexts[pageIndex] ?? "";
  const spans = spansByPage[pageIndex] ?? [];
  let checked = 0;
  for (let index = page.indexOf(quote); index !== -1 && checked < MAX_QUOTE_OCCURRENCES_CHECKED; index = page.indexOf(quote, index + 1)) {
    checked += 1;
    if (!overlapsSpan(spans, index, index + quote.length)) return true;
  }
  return false;
}

function mergeSpans(spans: Array<[number, number]>): Array<[number, number]> {
  const merged: Array<[number, number]> = [];
  for (const [start, end] of [...spans].sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/** Binary search over sorted, non-overlapping spans. */
function overlapsSpan(spans: ReadonlyArray<[number, number]>, start: number, end: number): boolean {
  let low = 0;
  let high = spans.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const [spanStart, spanEnd] = spans[middle]!;
    if (end <= spanStart) high = middle - 1;
    else if (start >= spanEnd) low = middle + 1;
    else return true;
  }
  return false;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; outcome: "invalid_response" | "unsupported_evidence" };

export function parseProposalFinding(
  value: unknown,
  pageTexts: readonly string[],
  field: ProposalField,
): ValidationResult<ProposalFinding> {
  if (!isRecord(value) || typeof value.status !== "string") return { ok: false, outcome: "invalid_response" };

  if (value.status === "known") {
    if (!hasExactlyKeys(value, ["status", "value", "evidence"]) || !isBoundedText(value.value, PROPOSAL_FIELD_VALUE_LIMITS[field]) ||
      (field === "capacity" && !isPositiveInteger(value.value))) return { ok: false, outcome: "invalid_response" };
    const normalized = field === "start" || field === "end" ? normalizeProposalDateTime(value.value) : value.value;
    if ((field === "start" || field === "end") && normalized === undefined) return { ok: false, outcome: "invalid_response" };
    const evidence = parseEvidence(value.evidence, pageTexts);
    if (!evidence.ok) return evidence;
    if (!hasSupportedContacts(field, value.value, evidence.value)) return { ok: false, outcome: "unsupported_evidence" };
    return evidence.value.length ? { ok: true, value: { status: "known", value: normalized ?? value.value, evidence: evidence.value } }
      : { ok: false, outcome: "unsupported_evidence" };
  }

  if (value.status === "missing") {
    if (!hasExactlyKeys(value, ["status", "evidence"]) || !Array.isArray(value.evidence) || value.evidence.length !== 0) {
      return { ok: false, outcome: "invalid_response" };
    }
    return { ok: true, value: { status: "missing", evidence: [] } };
  }

  if (value.status === "conflicting") {
    if (!hasExactlyKeys(value, ["status", "alternatives"]) || !Array.isArray(value.alternatives) ||
      value.alternatives.length < 2 || value.alternatives.length > MAX_CONFLICT_ALTERNATIVES) return { ok: false, outcome: "invalid_response" };
    const alternatives: Array<{ value: string; evidence: PageEvidence[] }> = [];
    for (const alternative of value.alternatives) {
      if (!isRecord(alternative) || !hasExactlyKeys(alternative, ["value", "evidence"]) ||
        !isBoundedText(alternative.value, PROPOSAL_FIELD_VALUE_LIMITS[field]) || (field === "capacity" && !isPositiveInteger(alternative.value))) {
        return { ok: false, outcome: "invalid_response" };
      }
      const normalized = field === "start" || field === "end" ? normalizeProposalDateTime(alternative.value) : alternative.value;
      if ((field === "start" || field === "end") && normalized === undefined) return { ok: false, outcome: "invalid_response" };
      const evidence = parseEvidence(alternative.evidence, pageTexts);
      if (!evidence.ok) return evidence;
      if (!evidence.value.length || !hasSupportedContacts(field, alternative.value, evidence.value)) {
        return { ok: false, outcome: "unsupported_evidence" };
      }
      alternatives.push({ value: normalized ?? alternative.value, evidence: evidence.value });
    }
    if (new Set(alternatives.map(({ value: item }) => item.trim().toLocaleLowerCase())).size !== alternatives.length) {
      return { ok: false, outcome: "invalid_response" };
    }
    return { ok: true, value: { status: "conflicting", alternatives } };
  }
  return { ok: false, outcome: "invalid_response" };
}

/** Validate a strict ISO date-time with an explicit offset and return canonical UTC. */
export function normalizeProposalDateTime(value: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})(Z|([+-])(\d{2}):(\d{2}))$/u.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const millisecond = Number(match[7]);
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month) ||
    hour > 23 || minute > 59 || second > 59) return undefined;

  let offsetMinutes = 0;
  if (match[8] !== "Z") {
    const offsetHour = Number(match[10]);
    const offsetMinute = Number(match[11]);
    if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) return undefined;
    if (match[9] === "-") {
      // RFC 3339's -00:00 means the local offset is unknown, so it cannot be normalized safely.
      if (offsetHour === 0 && offsetMinute === 0) return undefined;
      offsetMinutes = -(offsetHour * 60 + offsetMinute);
    } else {
      offsetMinutes = offsetHour * 60 + offsetMinute;
    }
  }

  const local = new Date(0);
  local.setUTCFullYear(year, month - 1, day);
  local.setUTCHours(hour, minute, second, millisecond);
  const utcMilliseconds = local.getTime() - offsetMinutes * 60_000;
  if (!Number.isFinite(utcMilliseconds)) return undefined;
  try {
    const canonical = new Date(utcMilliseconds).toISOString();
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(canonical) && Number(canonical.slice(0, 4)) >= 1
      ? canonical
      : undefined;
  } catch {
    return undefined;
  }
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function parseEvidence(value: unknown, pageTexts: readonly string[]): ValidationResult<PageEvidence[]> {
  if (!Array.isArray(value) || value.length > MAX_EVIDENCE_PER_FACT) return { ok: false, outcome: "invalid_response" };
  const evidence: PageEvidence[] = [];
  for (const item of value) {
    if (!isRecord(item) || !hasExactlyKeys(item, ["quote", "page"]) || !isBoundedText(item.quote, MAX_EVIDENCE_QUOTE_CHARS) ||
      !Number.isSafeInteger(item.page) || Number(item.page) < 1 || Number(item.page) > pageTexts.length) {
      return { ok: false, outcome: "invalid_response" };
    }
    if (!pageTexts[Number(item.page) - 1]?.includes(item.quote) || !hasUnflaggedOccurrence(pageTexts, Number(item.page) - 1, item.quote)) {
      return { ok: false, outcome: "unsupported_evidence" };
    }
    evidence.push({ quote: item.quote, page: Number(item.page) });
  }
  return { ok: true, value: evidence };
}

function hasSupportedContacts(field: ProposalField, value: string, evidence: readonly PageEvidence[]): boolean {
  return !CONTACT_CHECKED_FIELDS.has(field) ||
    hasOnlySupportedContacts(value, contactSupport(evidence.map(({ quote }) => quote).join("\n")));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isBoundedText(value: unknown, maxChars: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && [...value].length <= maxChars;
}

function isPositiveInteger(value: string): boolean {
  return /^[1-9]\d*$/.test(value);
}
