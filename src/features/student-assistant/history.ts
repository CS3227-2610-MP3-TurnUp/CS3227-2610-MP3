import { assistantReducer, createAssistantState } from "./state";
import type { AssistantState, PublicSourceSnapshot } from "./types";
import type { PublicationAnswerResult } from "./publication-answer-transport";
export interface SavedTurn { requestId: string; question: string; result: PublicationAnswerResult }
const reasons = ["invalid_source", "invalid_response", "invalid_evidence", "invalid_question", "live_not_authorized", "budget_exhausted", "timeout", "provider_unavailable", "rate_limited", "cancelled", "preview_only"];
/** Stored JSON is untrusted: rebuild branded answers against a fresh public source. */
export function restoreHistory(source: PublicSourceSnapshot, value: unknown, draft = ""): AssistantState | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  let state = createAssistantState(source);
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).sort().join() !== "question,requestId,result"
      || typeof raw.requestId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(raw.requestId)
      || typeof raw.question !== "string" || !raw.question.trim() || !raw.question.isWellFormed() || Array.from(raw.question).length > 1000) return null;
    const result = raw.result;
    if (!result || typeof result !== "object" || Array.isArray(result)) return null;
    state = assistantReducer(state, { type: "draft_changed", value: raw.question });
    state = assistantReducer(state, { type: "request_started", requestId: raw.requestId });
    const identity = { requestId: raw.requestId, eventId: source.eventId, revision: source.revision };
    if (result.ok === true && Object.keys(result).sort().join() === "candidate,ok") {
      state = assistantReducer(state, { type: "response_received", ...identity, candidate: result.candidate });
      if (state.error) return null;
    } else if (result.ok === false && Object.keys(result).sort().join() === "ok,reason" && reasons.includes(result.reason)) {
      state = assistantReducer(state, { type: "request_failed", ...identity, reason: result.reason });
    } else return null;
  }
  return { ...state, draft, notice: null };
}
