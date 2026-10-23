export const PUBLIC_CANDIDATE_PROMPT_VERSION = "CHG-K-017-faq-gap-questions-v5";

export const PUBLIC_CANDIDATE_SOURCE_FIELDS = [
  "title",
  "description",
  "start",
  "end",
  "location",
  "capacity",
  "fee",
  "openTo",
  "preparation",
  "other",
] as const;

export const MAX_PUBLIC_CANDIDATE_QUESTIONS = 6;
export const MAX_PUBLIC_CANDIDATE_QUESTION_LENGTH = 200;
export const MAX_PUBLIC_CANDIDATE_REFERENCES = 3;
export const MAX_PUBLIC_CANDIDATE_QUOTE_LENGTH = 300;
export const MAX_PUBLIC_CANDIDATE_OTHER_LENGTH = 4_000;

export type PublicCandidateSourceField = (typeof PUBLIC_CANDIDATE_SOURCE_FIELDS)[number];
export type PublicCandidateSource = Record<PublicCandidateSourceField, string>;

export type PublicCandidateReference = {
  field: PublicCandidateSourceField;
  quote: string;
};

export type AnsweredPublicFaq = {
  question: string;
  /** Derived by the server from the exact references; the model does not provide an answer. */
  answer: string;
  references: PublicCandidateReference[];
};

export type PublicCandidates = {
  answeredFaqs: AnsweredPublicFaq[];
  unansweredQuestions: string[];
  renderedOther: string;
};

export type PublicCandidatesSuccess = {
  ok: true;
  eventVersion: number;
  preparationRevision: number;
  candidates: PublicCandidates;
};

export type PublicCandidatesOutcome =
  | "disabled"
  | "not_configured"
  | "invalid_configuration"
  | "input_too_large"
  | "unauthenticated"
  | "forbidden"
  | "rate_or_budget_limited"
  | "unavailable"
  | "timeout"
  | "cancelled"
  | "invalid_response"
  | "invalid_request"
  | "stale_event"
  | "not_ready";

export type PublicCandidatesFailure = {
  ok: false;
  outcome: PublicCandidatesOutcome;
};

export type PublicCandidatesResponse = PublicCandidatesSuccess | PublicCandidatesFailure;

/** Render inert plain-text FAQ content; callers remain responsible for explicit application. */
export function renderFAQ(question: string, answer: string): string {
  return `Q: ${question}\nA: ${answer}`;
}

export function renderAnsweredFaqs(faqs: readonly Pick<AnsweredPublicFaq, "question" | "answer">[]): string {
  return faqs.map(({ question, answer }) => renderFAQ(question, answer)).join("\n\n");
}
