import type { EventFields } from "../../lib/event-fields";
import type { PageEvidence, ProposalField } from "./types";

export const PROPOSAL_TO_EVENT_FIELD = {
  title: "title",
  purpose: "description",
  start: "start",
  end: "end",
  location: "location",
  capacity: "capacity",
  feeStatus: "fee",
  openTo: "openTo",
  preparation: "preparation",
} as const satisfies Record<ProposalField, keyof EventFields>;

export const CLARIFICATION_REASONS = [
  "source_missing",
  "source_conflict",
  "source_candidate",
  "source_disagrees_with_confirmed",
  "answer_changed",
] as const;

export type ClarificationReason = (typeof CLARIFICATION_REASONS)[number];
export type ClarificationValue<Field extends ProposalField = ProposalField> =
  Field extends "capacity" ? number : string;

export const CLARIFICATION_COPY: Record<ProposalField, {
  question: string;
  reasons: Record<ClarificationReason, string>;
}> = {
  title: {
    question: "What should the event title be?",
    reasons: {
      source_missing: "The proposal does not provide an event title.",
      source_conflict: "The proposal gives conflicting event titles.",
      source_candidate: "The proposal suggests an answer that needs your confirmation.",
      source_disagrees_with_confirmed: "The proposal differs from your confirmed event title.",
      answer_changed: "This changed title needs your confirmation.",
    },
  },
  purpose: {
    question: "How should the event be described?",
    reasons: {
      source_missing: "The proposal does not provide an event description.",
      source_conflict: "The proposal gives conflicting event descriptions.",
      source_candidate: "The proposal suggests an answer that needs your confirmation.",
      source_disagrees_with_confirmed: "The proposal differs from your confirmed event description.",
      answer_changed: "This changed description needs your confirmation.",
    },
  },
  start: {
    question: "When does the event start?",
    reasons: {
      source_missing: "The proposal does not provide a complete start date and time.",
      source_conflict: "The proposal gives conflicting start dates or times.",
      source_candidate: "The proposal suggests an answer that needs your confirmation.",
      source_disagrees_with_confirmed: "The proposal differs from your confirmed start date or time.",
      answer_changed: "This changed start date or time needs your confirmation.",
    },
  },
  end: {
    question: "When does the event end?",
    reasons: {
      source_missing: "The proposal does not provide a complete end date and time.",
      source_conflict: "The proposal gives conflicting end dates or times.",
      source_candidate: "The proposal suggests an answer that needs your confirmation.",
      source_disagrees_with_confirmed: "The proposal differs from your confirmed end date or time.",
      answer_changed: "This changed end date or time needs your confirmation.",
    },
  },
  location: {
    question: "Where will the event take place, or how can attendees join remotely?",
    reasons: {
      source_missing: "The proposal does not provide a venue or remote joining details.",
      source_conflict: "The proposal gives conflicting venue or joining details.",
      source_candidate: "The proposal suggests an answer that needs your confirmation.",
      source_disagrees_with_confirmed: "The proposal differs from your confirmed location or joining details.",
      answer_changed: "These changed location or joining details need your confirmation.",
    },
  },
  capacity: {
    question: "How many attendees can the event accommodate?",
    reasons: {
      source_missing: "The proposal does not provide an event capacity.",
      source_conflict: "The proposal gives conflicting event capacities.",
      source_candidate: "The proposal suggests an answer that needs your confirmation.",
      source_disagrees_with_confirmed: "The proposal differs from your confirmed event capacity.",
      answer_changed: "This changed capacity needs your confirmation.",
    },
  },
  feeStatus: {
    question: "What fee or admission cost should attendees expect?",
    reasons: {
      source_missing: "The proposal does not provide fee or admission details.",
      source_conflict: "The proposal gives conflicting fee or admission details.",
      source_candidate: "The proposal suggests an answer that needs your confirmation.",
      source_disagrees_with_confirmed: "The proposal differs from your confirmed fee or admission details.",
      answer_changed: "These changed fee or admission details need your confirmation.",
    },
  },
  openTo: {
    question: "Who is the event intended for, and are there eligibility requirements?",
    reasons: {
      source_missing: "The proposal does not state the intended participants or eligibility.",
      source_conflict: "The proposal gives conflicting participant or eligibility details.",
      source_candidate: "The proposal suggests an answer that needs your confirmation.",
      source_disagrees_with_confirmed: "The proposal differs from your confirmed audience or eligibility.",
      answer_changed: "These changed audience or eligibility details need your confirmation.",
    },
  },
  preparation: {
    question: "What should attendees know, prepare, or bring before the event?",
    reasons: {
      source_missing: "The proposal does not state attendee prerequisites or preparation.",
      source_conflict: "The proposal gives conflicting attendee preparation details.",
      source_candidate: "The proposal suggests an answer that needs your confirmation.",
      source_disagrees_with_confirmed: "The proposal differs from your confirmed preparation details.",
      answer_changed: "These changed preparation details need your confirmation.",
    },
  },
};

export type ClarificationResolution<Field extends ProposalField = ProposalField> = {
  method: "suggestion" | "organiser";
  value: ClarificationValue<Field>;
  resolvedBy: string;
  resolvedAt: string;
  /** Exact source evidence for a selected suggestion; empty for manual confirmation. */
  evidence: PageEvidence[];
};

export type ClarificationIssueFor<Field extends ProposalField> = {
  field: Field;
  reason: ClarificationReason;
  alternatives: Array<{ value: string; evidence: PageEvidence[] }>;
  /** Last explicitly confirmed answer remains available if later reopened. */
  confirmedValue?: ClarificationValue<Field>;
  resolution: ClarificationResolution<Field> | null;
};

export type ClarificationIssue = {
  [Field in ProposalField]: ClarificationIssueFor<Field>;
}[ProposalField];

export type EventPreparation = {
  revision: number;
  issues: ClarificationIssue[];
};

export type ClarificationResolutionIntent = {
  [Field in ProposalField]: {
    field: Field;
    method: "suggestion" | "organiser";
    value: ClarificationValue<Field>;
  };
}[ProposalField];

export type EventPreparationResponse = EventPreparation | null;
