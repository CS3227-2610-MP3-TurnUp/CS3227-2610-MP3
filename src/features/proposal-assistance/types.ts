export const PROPOSAL_FIELDS = [
  "title",
  "purpose",
  "start",
  "end",
  "location",
  "capacity",
  "feeStatus",
  "openTo",
  "preparation",
] as const;

export type ProposalField = (typeof PROPOSAL_FIELDS)[number];

export const PROPOSAL_FIELD_LABELS: Record<ProposalField, string> = {
  title: "Event title",
  purpose: "Purpose and description",
  start: "Start date and time",
  end: "End date and time",
  location: "Location or participation instructions",
  capacity: "Capacity",
  feeStatus: "Fee status",
  openTo: "Open to",
  preparation: "Prerequisites and preparation",
};

export interface PageEvidence {
  quote: string;
  page: number;
}

export type ProposalFinding =
  | { status: "known"; value: string; evidence: PageEvidence[] }
  | { status: "missing"; evidence: [] }
  | { status: "conflicting"; alternatives: Array<{ value: string; evidence: PageEvidence[] }> };

export interface PrivateExtraction {
  /** Only independently validated records are present; absent keys are unprocessed. */
  facts: Partial<Record<ProposalField, ProposalFinding>>;
  privateFindings: string[];
  completeness: "complete" | "incomplete";
  finishReason?: "stop" | "length" | "other";
  incompleteReasons: Array<"token_limit" | "invalid_records" | "missing_end" | "unprocessed_fields">;
  unprocessedFields: ProposalField[];
  technicalIssues: number;
}

export interface ProposalRevisions {
  source: number;
  facts: number;
  editor: number;
}
