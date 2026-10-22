import "server-only";

import { isLocalDevelopmentEnvironment } from "../ai/soclaas-config";
import { EventError } from "../events/policy";
import type { EventFields } from "../../lib/event-fields";
import {
  CLARIFICATION_REASONS,
  PROPOSAL_TO_EVENT_FIELD,
  type ClarificationIssue,
  type ClarificationReason,
  type ClarificationResolution,
  type ClarificationResolutionIntent,
  type ClarificationValue,
  type EventPreparation,
} from "../../features/proposal-assistance/clarification";
import { prepareEventAlternative } from "../../features/proposal-assistance/event-prefill";
import { PROPOSAL_FIELDS, type PageEvidence, type PrivateExtraction, type ProposalField } from "../../features/proposal-assistance/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ALTERNATIVES = 3;

export function clarificationPersistenceEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return isLocalDevelopmentEnvironment(env) && isLocalDevelopmentEnvironment(process.env);
}

/** Read private JSONB defensively; corrupt preparation fails closed for preview/publication. */
export function readPreparation(value: unknown, revision: number): EventPreparation | null {
  if (!Number.isSafeInteger(revision) || revision < 0) throw unavailable();
  if (value === null) {
    if (revision !== 0) throw unavailable();
    return null;
  }
  const root = record(value);
  exactKeys(root, ["issues"], ["issues"]);
  if (!Array.isArray(root.issues) || root.issues.length > PROPOSAL_FIELDS.length) throw unavailable();
  const fields = new Set<ProposalField>();
  const issues = root.issues.map((item) => {
    const issue = parseIssue(item);
    if (fields.has(issue.field)) throw unavailable();
    fields.add(issue.field);
    return issue;
  });
  return { revision, issues };
}

export function preparationJson(preparation: EventPreparation) {
  return { issues: preparation.issues };
}

export function parseResolutionIntents(value: unknown): ClarificationResolutionIntent[] {
  if (!Array.isArray(value) || value.length > PROPOSAL_FIELDS.length) throw new EventError(400, "Send valid proposal clarifications.");
  const seen = new Set<ProposalField>();
  return value.map((candidate) => {
    const input = recordRequest(candidate);
    if (Object.keys(input).some((key) => !["field", "method", "value"].includes(key)) ||
        !isProposalField(input.field) || (input.method !== "suggestion" && input.method !== "organiser") || seen.has(input.field)) {
      throw new EventError(400, "Send valid proposal clarifications.");
    }
    seen.add(input.field);
    return {
      field: input.field,
      method: input.method,
      value: parseRequestFieldValue(input.field, input.value),
    } as ClarificationResolutionIntent;
  });
}

export function mergeGeneratedPreparation(
  previous: EventPreparation | null,
  extraction: PrivateExtraction,
  fields: EventFields,
  revision: number,
): EventPreparation {
  const previousByField = new Map(previous?.issues.map((issue) => {
    const confirmedValue = issue.resolution?.value ?? issue.confirmedValue;
    if (confirmedValue !== undefined && !sameValue(issue.field, fields[PROPOSAL_TO_EVENT_FIELD[issue.field]], confirmedValue)) {
      return [issue.field, {
        ...issue,
        reason: "answer_changed" as const,
        confirmedValue,
        resolution: null,
      } as ClarificationIssue] as const;
    }
    return [issue.field, issue] as const;
  }) ?? []);
  const issues: ClarificationIssue[] = [];

  for (const field of PROPOSAL_FIELDS) {
    const prior = previousByField.get(field);
    const finding = extraction.facts[field];
    if (!finding || finding.status === "missing") {
      // Missing or unprocessed source information never removes an older issue,
      // and cannot contradict an answer the Organiser already confirmed.
      if (prior) issues.push(prior);
      else if (finding?.status === "missing") {
        issues.push({ field, reason: "source_missing", alternatives: [], resolution: null } as ClarificationIssue);
      }
      continue;
    }

    if (finding.status === "conflicting") {
      const confirmedValue = prior?.resolution?.value ?? prior?.confirmedValue;
      issues.push({
        field,
        reason: confirmedValue === undefined ? "source_conflict" : "source_disagrees_with_confirmed",
        alternatives: finding.alternatives,
        ...(confirmedValue !== undefined ? { confirmedValue } : {}),
        resolution: null,
      } as ClarificationIssue);
      continue;
    }

    const mapped = PROPOSAL_TO_EVENT_FIELD[field];
    const converted = prepareEventAlternative(mapped, finding.value);
    if (!converted.ok) {
      // The extraction validator accepts schema-shaped values; editor bounds can
      // be stricter (notably capacity). Preserve an existing issue and never
      // replace its value with an unusable suggestion.
      if (prior) issues.push(prior);
      continue;
    }

    const priorConfirmed = prior?.resolution?.value ?? prior?.confirmedValue;
    if (!prior) continue;
    if (priorConfirmed !== undefined) {
      if (sameValue(field, converted.value, priorConfirmed)) {
        // A matching known value supports a prior answer but does not resolve a
        // previously reopened issue without a fresh owner action.
        issues.push(prior.resolution ? prior : {
          ...prior,
          reason: "source_candidate",
          alternatives: [{ value: finding.value, evidence: finding.evidence }],
          resolution: null,
        });
      } else {
        issues.push({
          field,
          reason: "source_disagrees_with_confirmed",
          alternatives: [{ value: finding.value, evidence: finding.evidence }],
          confirmedValue: priorConfirmed,
          resolution: null,
        } as ClarificationIssue);
      }
      continue;
    }

    // A newer known fact can add a supported choice to an old unresolved issue,
    // but model output cannot silently resolve that issue.
    issues.push({
      ...prior,
      reason: "source_candidate",
      alternatives: [{ value: finding.value, evidence: finding.evidence }],
      resolution: null,
    });
  }

  return { revision, issues };
}

export function applyPreparationResolutions(
  previous: EventPreparation | null,
  oldFields: EventFields,
  nextFields: EventFields,
  intents: readonly ClarificationResolutionIntent[],
  actor: string,
  at: Date,
  revision: number,
): EventPreparation | null {
  if (!previous) {
    if (intents.length) throw new EventError(409, "Reload the proposal clarification state.");
    return null;
  }

  const intentByField = new Map(intents.map((intent) => [intent.field, intent]));
  const issueFields = new Set(previous.issues.map((issue) => issue.field));
  if (intents.some((intent) => !issueFields.has(intent.field))) throw new EventError(409, "Reload the proposal clarification state.");

  const issues = previous.issues.map((issue) => {
    const field = issue.field;
    const eventField = PROPOSAL_TO_EVENT_FIELD[field];
    const nextValue = nextFields[eventField] as ClarificationValue<typeof field>;
    const oldValue = oldFields[eventField] as ClarificationValue<typeof field>;
    let nextIssue: ClarificationIssue = issue;

    if (issue.resolution && !sameValue(field, oldValue, issue.resolution.value)) {
      nextIssue = { ...issue, reason: "answer_changed", confirmedValue: issue.resolution.value, resolution: null } as ClarificationIssue;
    } else if (issue.resolution && !sameValue(field, nextValue, issue.resolution.value)) {
      nextIssue = { ...issue, reason: "answer_changed", confirmedValue: issue.resolution.value, resolution: null } as ClarificationIssue;
    } else if (!issue.resolution && issue.confirmedValue !== undefined && !sameValue(field, nextValue, issue.confirmedValue)) {
      nextIssue = { ...issue, reason: "answer_changed" } as ClarificationIssue;
    }

    const intent = intentByField.get(field);
    if (!intent) return nextIssue;
    if (!sameValue(field, intent.value, nextValue) || !hasConfirmableValue(field, nextValue)) {
      throw new EventError(400, "Confirm the current value in the matching event field.", eventField);
    }

    let evidence: PageEvidence[] = [];
    if (intent.method === "suggestion") {
      const alternative = issue.alternatives.find((candidate) => {
        const prepared = prepareEventAlternative(eventField, candidate.value);
        return prepared.ok && sameValue(field, prepared.value, intent.value);
      });
      if (!alternative) throw new EventError(409, "That suggestion is no longer available. Choose a current option.", eventField);
      evidence = alternative.evidence;
    }

    const resolution: ClarificationResolution<typeof field> = {
      method: intent.method,
      value: nextValue,
      resolvedBy: actor,
      resolvedAt: at.toISOString(),
      evidence,
    };
    return { ...nextIssue, confirmedValue: nextValue, resolution } as ClarificationIssue;
  });

  return { revision, issues };
}

export function unresolvedClarificationFields(preparation: EventPreparation | null, fields: EventFields): ProposalField[] {
  if (!preparation) return [];
  return preparation.issues.filter((issue) => {
    const current = fields[PROPOSAL_TO_EVENT_FIELD[issue.field]];
    return !issue.resolution || !sameValue(issue.field, current, issue.resolution.value);
  }).map((issue) => issue.field);
}

function parseIssue(value: unknown): ClarificationIssue {
  const input = record(value);
  exactKeys(input, ["field", "reason", "alternatives", "confirmedValue", "resolution"], ["field", "reason", "alternatives", "resolution"]);
  if (!isProposalField(input.field) || !isReason(input.reason) || !Array.isArray(input.alternatives) || input.alternatives.length > MAX_ALTERNATIVES) throw unavailable();
  const field = input.field;
  const alternatives = input.alternatives.map((alternative) => parseAlternative(field, alternative));
  if (alternatives.some((alternative, index) => alternatives.slice(0, index).some((prior) => sameAlternativeValue(field, prior.value, alternative.value)))) throw unavailable();
  if ((input.reason === "source_missing" && alternatives.length !== 0) ||
      (input.reason === "source_conflict" && alternatives.length < 2) ||
      ((input.reason === "source_candidate" || input.reason === "source_disagrees_with_confirmed") && alternatives.length === 0)) throw unavailable();
  const confirmedValue = input.confirmedValue === undefined ? undefined : parseFieldValue(field, input.confirmedValue);
  const resolution = input.resolution === null ? null : parseResolution(field, input.resolution);
  if (resolution && confirmedValue !== undefined && !sameValue(field, confirmedValue, resolution.value)) throw unavailable();
  if (resolution?.method === "suggestion" && !alternatives.some((alternative) =>
    sameAlternativeValue(field, alternative.value, resolution.value) && sameEvidence(alternative.evidence, resolution.evidence))) throw unavailable();
  return {
    field,
    reason: input.reason,
    alternatives,
    ...(confirmedValue !== undefined ? { confirmedValue } : {}),
    resolution,
  } as ClarificationIssue;
}

function parseAlternative(field: ProposalField, value: unknown): { value: string; evidence: PageEvidence[] } {
  const input = record(value);
  exactKeys(input, ["value", "evidence"], ["value", "evidence"]);
  if (typeof input.value !== "string" || !Array.isArray(input.evidence) || input.evidence.length < 1 || input.evidence.length > 5) throw unavailable();
  const prepared = prepareEventAlternative(PROPOSAL_TO_EVENT_FIELD[field], input.value);
  if (!prepared.ok) throw unavailable();
  return { value: input.value, evidence: input.evidence.map(parseEvidence) };
}

function parseResolution(field: ProposalField, value: unknown): ClarificationResolution {
  const input = record(value);
  exactKeys(input, ["method", "value", "resolvedBy", "resolvedAt", "evidence"], ["method", "value", "resolvedBy", "resolvedAt", "evidence"]);
  if ((input.method !== "suggestion" && input.method !== "organiser") || typeof input.resolvedBy !== "string" ||
      !UUID_PATTERN.test(input.resolvedBy) || typeof input.resolvedAt !== "string" || !Number.isFinite(Date.parse(input.resolvedAt)) ||
      !Array.isArray(input.evidence) || input.evidence.length > 5) throw unavailable();
  const resolvedAt = new Date(input.resolvedAt).toISOString();
  if (resolvedAt !== input.resolvedAt) throw unavailable();
  const evidence = input.evidence.map(parseEvidence);
  if ((input.method === "organiser" && evidence.length !== 0) || (input.method === "suggestion" && evidence.length === 0)) throw unavailable();
  return {
    method: input.method,
    value: parseFieldValue(field, input.value),
    resolvedBy: input.resolvedBy,
    resolvedAt,
    evidence,
  } as ClarificationResolution;
}

function parseEvidence(value: unknown): PageEvidence {
  const input = record(value);
  exactKeys(input, ["quote", "page"], ["quote", "page"]);
  if (typeof input.quote !== "string" || input.quote.trim().length === 0 || [...input.quote].length > 300 ||
      !Number.isInteger(input.page) || (input.page as number) < 1 || (input.page as number) > 20) throw unavailable();
  return { quote: input.quote, page: input.page as number };
}

function parseFieldValue(field: ProposalField, value: unknown): ClarificationValue {
  if (field === "capacity") {
    if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 10_000) throw unavailable();
    return value as number;
  }
  if (typeof value !== "string") throw unavailable();
  const prepared = prepareEventAlternative(PROPOSAL_TO_EVENT_FIELD[field], value);
  if (!prepared.ok || typeof prepared.value !== "string" || prepared.value !== value) throw unavailable();
  return value;
}

function parseRequestFieldValue(field: ProposalField, value: unknown): ClarificationValue {
  if (field === "capacity") {
    if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 10_000) throw new EventError(400, "Confirm a valid capacity.", "capacity");
    return value as number;
  }
  if (typeof value !== "string") throw new EventError(400, "Confirm a valid event field value.", PROPOSAL_TO_EVENT_FIELD[field]);
  const prepared = prepareEventAlternative(PROPOSAL_TO_EVENT_FIELD[field], value);
  if (!prepared.ok || typeof prepared.value !== "string" || prepared.value !== value) {
    throw new EventError(400, "Confirm a valid event field value.", PROPOSAL_TO_EVENT_FIELD[field]);
  }
  return value;
}

function hasConfirmableValue(field: ProposalField, value: ClarificationValue): boolean {
  return field === "capacity" ? typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 10_000
    : typeof value === "string" && value.trim().length > 0;
}

function sameValue(field: ProposalField, left: unknown, right: unknown): boolean {
  if (field === "capacity") return left === right;
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = prepareEventAlternative(PROPOSAL_TO_EVENT_FIELD[field], left);
  const b = prepareEventAlternative(PROPOSAL_TO_EVENT_FIELD[field], right);
  return a.ok && b.ok && a.value === b.value;
}

function sameAlternativeValue(field: ProposalField, alternative: string, value: unknown): boolean {
  const prepared = prepareEventAlternative(PROPOSAL_TO_EVENT_FIELD[field], alternative);
  return prepared.ok && sameValue(field, prepared.value, value);
}

function sameEvidence(left: readonly PageEvidence[], right: readonly PageEvidence[]): boolean {
  return left.length === right.length && left.every((item, index) => item.quote === right[index]?.quote && item.page === right[index]?.page);
}

function isProposalField(value: unknown): value is ProposalField {
  return typeof value === "string" && (PROPOSAL_FIELDS as readonly string[]).includes(value);
}

function isReason(value: unknown): value is ClarificationReason {
  return typeof value === "string" && (CLARIFICATION_REASONS as readonly string[]).includes(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw unavailable();
  return value as Record<string, unknown>;
}

function recordRequest(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new EventError(400, "Send valid proposal clarifications.");
  return value as Record<string, unknown>;
}

function exactKeys(input: Record<string, unknown>, allowed: readonly string[], required: readonly string[] = allowed) {
  if (Object.keys(input).some((key) => !allowed.includes(key)) || required.some((key) => !Object.hasOwn(input, key))) throw unavailable();
}

function unavailable(): EventError {
  return new EventError(503, "Saved proposal clarification is unavailable.");
}
