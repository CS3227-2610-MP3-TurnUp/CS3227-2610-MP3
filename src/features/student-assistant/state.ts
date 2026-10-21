import { ASSISTANT_LIMITS, validateAnswer, validateSource } from "./evidence";
import type { AssistantEvent, AssistantState } from "./types";

export function createAssistantState(sourceInput: unknown): AssistantState {
  const result = validateSource(sourceInput);
  return { turns: [], draft: "", source: result.ok ? result.source : null, pending: null, answer: null,
    error: result.ok ? null : result.reason, notice: null, availability: result.ok ? "available" : "invalid" };
}

function currentRequest(state: AssistantState, event: { requestId: string; eventId: string; revision: string }): boolean {
  return state.availability === "available" && state.pending !== null && state.source !== null
    && event.requestId === state.pending.requestId && event.eventId === state.pending.eventId
    && event.revision === state.pending.revision && event.eventId === state.source.eventId && event.revision === state.source.revision;
}

export function assistantReducer(state: AssistantState, event: AssistantEvent): AssistantState {
  switch (event.type) {
    case "draft_changed":
      return event.value === state.draft ? state : { ...state, draft: event.value, pending: null, answer: null, error: null };
    case "request_started": {
      if (state.pending || state.availability !== "available" || !state.source) return state;
      if (!state.draft.trim() || Array.from(state.draft).length > ASSISTANT_LIMITS.questionCodePoints) return { ...state, error: "invalid_question" };
      if (!event.requestId.trim()) return { ...state, error: "invalid_response" };
      const last = state.turns.at(-1);
      const turns = last?.error && last.question === state.draft ? state.turns.slice(0, -1) : state.turns;
      return { ...state, turns: turns.slice(-19), pending: { requestId: event.requestId, eventId: state.source.eventId, revision: state.source.revision, question: state.draft }, answer: null, error: null, notice: null };
    }
    case "response_received": {
      if (!currentRequest(state, event)) return state;
      const result = validateAnswer(event.candidate, state.source);
      const turn = { ...state.pending!, answer: result.ok ? result.answer : null, error: result.ok ? null : result.reason };
      return { ...state, turns: [...state.turns.slice(-19), turn], draft: result.ok ? "" : state.draft,
        pending: null, answer: turn.answer, error: turn.error };
    }
    case "request_failed":
      if (!currentRequest(state, event)) return state;
      return { ...state, turns: [...state.turns.slice(-19), { ...state.pending!, answer: null, error: event.reason }], pending: null, answer: null, error: event.reason };
    case "source_changed": {
      const next = createAssistantState(event.source);
      return { ...next, draft: state.draft, notice: state.source ? "source_changed" : null };
    }
    case "source_unavailable":
      if (state.source?.eventId !== event.eventId) return state;
      return { ...state, turns: [], source: null, pending: null, answer: null, error: null,
        availability: event.reason, notice: event.reason === "withdrawn" ? "source_withdrawn" : "source_cancelled" };
    case "cleared": return { ...state, turns: [], draft: "", pending: null, answer: null, error: null };
  }
}
