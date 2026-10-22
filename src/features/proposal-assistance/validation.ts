import type { PageEvidence, ProposalField, ProposalFinding } from "./types";
import { PROPOSAL_FIELD_VALUE_LIMITS } from "./extraction-schema";
import { MAX_CONFLICT_ALTERNATIVES } from "./limits";

export const MAX_FIELD_CHARS = 4_000;
export const MAX_PRIVATE_FINDING_CHARS = 2_000;
export const MAX_EVIDENCE_QUOTE_CHARS = 300;
export const MAX_EVIDENCE_PER_FACT = 5;
export const MAX_PRIVATE_FINDINGS = 10;

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
      if (!evidence.value.length) return { ok: false, outcome: "unsupported_evidence" };
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
    if (!pageTexts[Number(item.page) - 1]?.includes(item.quote)) return { ok: false, outcome: "unsupported_evidence" };
    evidence.push({ quote: item.quote, page: Number(item.page) });
  }
  return { ok: true, value: evidence };
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
