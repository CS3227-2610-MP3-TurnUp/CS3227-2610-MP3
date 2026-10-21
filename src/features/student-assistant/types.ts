/** Development component DTOs; production trust must be supplied by a server adapter. */
export interface PublicSourceSnapshot {
  readonly eventId: string;
  readonly revision: string;
  readonly title: string;
  readonly sections: readonly { readonly id: string; readonly label: string; readonly text: string }[];
}

export interface EvidenceReference {
  readonly eventId: string;
  readonly revision: string;
  readonly sectionId: string;
  readonly quote: string;
}

type CandidateIdentity = { readonly eventId: string; readonly revision: string; readonly reply?: string };
export type AnswerCandidate = CandidateIdentity & (
  | { readonly kind: "answered"; readonly evidence: readonly EvidenceReference[] }
  | { readonly kind: "partially_answered"; readonly evidence: readonly EvidenceReference[]; readonly unresolved: readonly string[] }
  | { readonly kind: "unanswered" }
  | { readonly kind: "needs_clarification"; readonly clarification: string }
  | { readonly kind: "out_of_scope" }
);

export interface VerifiedEvidence {
  readonly sectionId: string;
  readonly label: string;
  readonly quote: string;
}

declare const validatedAnswer: unique symbol;
/** Only evidence.ts produces this type. Exact provenance is not semantic relevance. */
export type ValidatedAnswer = CandidateIdentity & { readonly [validatedAnswer]: true } & (
  | { readonly kind: "answered"; readonly evidence: readonly VerifiedEvidence[] }
  | { readonly kind: "partially_answered"; readonly evidence: readonly VerifiedEvidence[]; readonly unresolved: readonly string[] }
  | { readonly kind: "unanswered" }
  | { readonly kind: "needs_clarification"; readonly clarification: string }
  | { readonly kind: "out_of_scope" }
);

export type FailureReason = "invalid_source" | "invalid_response" | "invalid_evidence" | "invalid_question"
  | "live_not_authorized" | "budget_exhausted" | "timeout" | "provider_unavailable" | "rate_limited" | "cancelled" | "preview_only";
export type SourceValidationResult = { readonly ok: true; readonly source: PublicSourceSnapshot }
  | { readonly ok: false; readonly reason: "invalid_source" };
export type AnswerValidationResult = { readonly ok: true; readonly answer: ValidatedAnswer }
  | { readonly ok: false; readonly reason: "invalid_source" | "invalid_response" | "invalid_evidence" };

/** Volatile display history only; never provider context or persistent messaging. */
export interface AssistantTurn {
  readonly requestId: string;
  readonly eventId: string;
  readonly revision: string;
  readonly question: string;
  readonly answer: ValidatedAnswer | null;
  readonly error: FailureReason | null;
}
export interface AssistantState {
  readonly turns: readonly AssistantTurn[];
  readonly draft: string;
  readonly source: PublicSourceSnapshot | null;
  readonly pending: { readonly requestId: string; readonly eventId: string; readonly revision: string; readonly question: string } | null;
  readonly answer: ValidatedAnswer | null;
  readonly error: FailureReason | null;
  readonly notice: "source_changed" | "source_withdrawn" | "source_cancelled" | null;
  readonly availability: "available" | "withdrawn" | "cancelled" | "invalid";
}

export type AssistantEvent =
  | { readonly type: "draft_changed"; readonly value: string }
  | { readonly type: "request_started"; readonly requestId: string }
  | { readonly type: "response_received"; readonly requestId: string; readonly eventId: string; readonly revision: string; readonly candidate: unknown }
  | { readonly type: "request_failed"; readonly requestId: string; readonly eventId: string; readonly revision: string; readonly reason: FailureReason }
  | { readonly type: "source_changed"; readonly source: unknown }
  | { readonly type: "source_unavailable"; readonly eventId: string; readonly reason: "withdrawn" | "cancelled" }
  | { readonly type: "cleared" };
