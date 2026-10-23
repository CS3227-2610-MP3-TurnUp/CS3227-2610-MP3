import { EVENT_LIMITS, FIELD_LABELS, type EventFields, type TextField } from "../../lib/event-fields";
import { PROPOSAL_TO_EVENT_FIELD } from "./clarification";
import type { PageEvidence, PrivateExtraction, ProposalField } from "./types";
import { normalizeProposalDateTime } from "./validation";

export type EventFieldKey = keyof EventFields;

export type ProposalFieldFeedback =
  | { status: "prefilled"; generatedValue: string | number; evidence: PageEvidence[] }
  | { status: "missing" }
  | { status: "unprocessed" }
  | { status: "invalid"; reason: string; evidence: PageEvidence[] }
  | { status: "conflicting"; alternatives: Array<{ value: string; evidence: PageEvidence[] }> };

export type ProposalFeedbackMap = Partial<Record<EventFieldKey, ProposalFieldFeedback>>;

export interface EventPrefill {
  values: Partial<EventFields>;
  feedback: ProposalFeedbackMap;
}

export function prepareEventAlternative(field: EventFieldKey, value: string): { ok: true; value: string | number } | { ok: false; reason: string } {
  const proposalField = (Object.entries(PROPOSAL_TO_EVENT_FIELD) as Array<[ProposalField, EventFieldKey]>).find(([, target]) => target === field)?.[0];
  if (!proposalField) return { ok: false, reason: "This field cannot use a proposal alternative." };
  return convertKnownValue(proposalField, value);
}

export function formatEventAlternative(field: EventFieldKey, value: string): string {
  if (field !== "start" && field !== "end") return value;
  const canonical = normalizeProposalDateTime(value);
  if (!canonical) return value;
  const parts = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h12",
  }).formatToParts(new Date(canonical));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")}, ${part("hour")}:${part("minute")} ${part("dayPeriod").toUpperCase()} SGT`;
}

export function prepareEventPrefill(extraction: PrivateExtraction, preserveFields: ReadonlySet<ProposalField> = new Set()): EventPrefill {
  const values: Partial<EventFields> = {};
  const feedback: ProposalFeedbackMap = {};

  for (const [proposalField, target] of Object.entries(PROPOSAL_TO_EVENT_FIELD) as Array<[ProposalField, EventFieldKey]>) {
    // Previously confirmed private answers remain authoritative during later extraction.
    // A newly persisted clarification issue is rendered from server preparation state.
    if (preserveFields.has(proposalField)) continue;
    const finding = extraction.facts[proposalField];
    if (!finding) {
      feedback[target] = { status: "unprocessed" };
      continue;
    }
    if (finding.status === "missing") {
      feedback[target] = { status: "missing" };
      continue;
    }
    if (finding.status === "conflicting") {
      feedback[target] = { status: "conflicting", alternatives: finding.alternatives };
      continue;
    }

    const converted = convertKnownValue(proposalField, finding.value);
    if (!converted.ok) {
      feedback[target] = { status: "invalid", reason: converted.reason, evidence: finding.evidence };
      continue;
    }
    Object.assign(values, { [target]: converted.value });
    feedback[target] = { status: "prefilled", generatedValue: converted.value, evidence: finding.evidence };
  }

  return { values, feedback };
}

function convertKnownValue(field: ProposalField, value: string): { ok: true; value: string | number } | { ok: false; reason: string } {
  if (field === "start" || field === "end") {
    const dateTime = normalizeProposalDateTime(value);
    return dateTime
      ? { ok: true, value: dateTime }
      : { ok: false, reason: "A complete valid date and time was not available." };
  }
  if (field === "capacity") {
    if (!/^[1-9]\d*$/.test(value) || Number(value) > 10_000) {
      return { ok: false, reason: "Capacity must be a whole number from 1 through 10,000." };
    }
    return { ok: true, value: Number(value) };
  }

  const target = PROPOSAL_TO_EVENT_FIELD[field] as TextField;
  const normalized = value.normalize("NFC").trim().replaceAll("\r\n", "\n");
  if (normalized.length === 0 || [...normalized].length > EVENT_LIMITS[target] ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(normalized)) {
    return { ok: false, reason: `${targetLabel(target)} is outside the event field's allowed text limits.` };
  }
  return { ok: true, value: normalized };
}

function targetLabel(field: TextField): string {
  return FIELD_LABELS[field];
}
