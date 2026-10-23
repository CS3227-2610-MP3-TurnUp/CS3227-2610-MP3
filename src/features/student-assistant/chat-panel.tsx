"use client";

import React, { useEffect, useRef } from "react";
import { isValidatedAnswer } from "./evidence";
import type { AssistantState, FailureReason, ValidatedAnswer } from "./types";
import styles from "./chat-panel.module.css";

const errors: Record<FailureReason, string> = {
  live_not_authorized: "Live requests are not authorised yet. Use the simulation while model permission and budget are confirmed.",
  budget_exhausted: "The approved local test budget is used up. No request was sent.",
  invalid_source: "Event information is unavailable. Choose another sample or reset the source.",
  invalid_response: "I couldn't finish that reply. Please try again.",
  invalid_evidence: "I couldn't confirm that answer. Please try again, or check with the organiser.",
  invalid_question: "Enter a question of up to 1,000 characters.",
  timeout: "The assistant took too long to respond. Try again.",
  provider_unavailable: "The assistant is temporarily unavailable. Try again.",
  rate_limited: "The assistant is busy. Wait a moment before trying again.",
  cancelled: "The request was cancelled. You can try again.",
  preview_only: "This preview supports the sample questions only. Choose a scenario or a starter question to try it.",
};
const notices = {
  source_changed: "Event information changed. The previous conversation was cleared. Ask again using the updated information.",
  source_withdrawn: "This event has been withdrawn. New questions are unavailable.",
  source_cancelled: "This event has been cancelled. New questions are unavailable.",
};
export interface ChatPanelProps {
  state: AssistantState;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onClose?: () => void;
  liveMode?: boolean;
  canAsk?: boolean;
  suggestions?: readonly string[];
  onSuggestion?: (question: string) => void;
  publicationMode?: boolean;
  statusMessage?: string;
  onRefreshSource?: () => void;
}

function AnswerMessage({ answer }: { answer: ValidatedAnswer }) {
  // Evidence/revisions/unresolved fragments stay internal; never substitute a quote dump for a reply.
  const uncertain = answer.kind === "unanswered" || answer.kind === "partially_answered";
  const reply = answer.reply ?? (answer.kind === "needs_clarification" ? answer.clarification
    : answer.kind === "out_of_scope" ? "I'm here to help with questions about this event. What would you like to know?"
    : "I'm not sure enough to answer that.");
  const needsContact = (uncertain || !answer.reply && answer.kind === "answered")
    && !["Please check with the organiser to confirm.", "Please contact the organiser to confirm."].some(suggestion => reply.trimEnd().endsWith(suggestion));
  return <p>{reply}{needsContact ? " Please check with the organiser to confirm." : ""}</p>;
}

export function ChatPanel({ state, onDraftChange, onSubmit, onClose, liveMode = false, canAsk = true, suggestions = [], onSuggestion, publicationMode = false, statusMessage, onRefreshSource }: ChatPanelProps) {
  const error = useRef<HTMLParagraphElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (state.error) error.current?.focus(); }, [state.error]);
  useEffect(() => { const element = conversation.current; if (element) element.scrollTop = element.scrollHeight; }, [state.turns.length, state.pending?.requestId, state.notice]);
  const available = state.availability === "available" && state.source !== null;
  const disabled = state.pending !== null || !available || !canAsk;
  const turns = available ? state.turns.filter((turn) => turn.eventId === state.source!.eventId && turn.revision === state.source!.revision) : [];
  const pending = available && state.pending?.eventId === state.source!.eventId && state.pending.revision === state.source!.revision ? state.pending : null;
  useEffect(() => { if (state.answer && !state.pending) composer.current?.focus(); }, [state.answer, state.pending]);
  const inlineError = state.error && (state.error === "invalid_question" || !turns.length);
  const message = (reason: FailureReason) => publicationMode && reason === "invalid_source" ? "The published event information is unavailable. Refresh it before trying again."
    : publicationMode && reason === "live_not_authorized" ? "AI questions are currently unavailable. Please try again later." : errors[reason];
  function choose(question: string) { (onSuggestion ?? onDraftChange)(question); composer.current?.focus(); }
  return <section className={styles.chat} aria-labelledby="assistant-title">
    <header className={styles.chatHeader}>
      <div><span className={styles.eyebrow}>Event assistant</span><h2 id="assistant-title">{state.source?.title ?? "Ask about this event"}</h2></div>
      <div className={styles.headerActions}>
      {publicationMode && onRefreshSource && (!available || !!statusMessage || state.error === "invalid_source") && <button type="button" className={styles.retry} onClick={onRefreshSource}>Refresh event information</button>}
      {onClose && <button type="button" className={styles.close} aria-label="Close chat" onClick={onClose}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button>}
      </div>
    </header>
    <div className={styles.conversation} role="log" aria-label="Event conversation" aria-live="polite" aria-relevant="additions text" tabIndex={0} ref={conversation}>
      <div className={styles.assistantRow}><div className={styles.assistantBubble}><span className={styles.speaker}>TurnUp assistant</span>
        <p>{canAsk ? "Hi! What would you like to know about this event?" : "This view checks the current publication source."}</p>{!canAsk && <p className={styles.explanation}>AI answers are not connected here. Refresh to check whether the publication changed.</p>}
      </div></div>
      {statusMessage && <p role="status" className={styles.notice}>{statusMessage}</p>}
      {state.notice && <p role="status" className={styles.notice}>{notices[state.notice]}</p>}
      {!turns.length && !pending && available && suggestions.length > 0 && <div className={styles.suggestions} aria-label="Starter questions">{suggestions.map((question) => <button key={question} type="button" onClick={() => choose(question)}>{question}</button>)}</div>}
      {turns.map((turn, index) => {
        const answer = isValidatedAnswer(turn.answer) && turn.answer.eventId === state.source?.eventId && turn.answer.revision === state.source?.revision ? turn.answer : null;
        const latestError = !inlineError && index === turns.length - 1 && state.error === turn.error && turn.error !== null;
        return <React.Fragment key={turn.requestId}>
          <div className={styles.userRow}><div className={styles.userBubble}><span className={styles.speaker}>You</span><p>{turn.question}</p></div></div>
          {(answer || turn.error) && <div className={styles.assistantRow}><div className={styles.assistantBubble}><span className={styles.speaker}>TurnUp assistant</span>
            {answer && <AnswerMessage answer={answer} />}
            {turn.error && <><p id={latestError ? "assistant-error" : undefined} role={latestError ? "alert" : undefined} tabIndex={latestError ? -1 : undefined} ref={latestError ? error : undefined} className={styles.failure}>{message(turn.error)}</p>
              {latestError && !disabled && state.draft === turn.question && <button type="button" className={styles.retry} onClick={onSubmit}>Try again</button>}
            </>}
          </div></div>}
        </React.Fragment>;
      })}
      {pending && <><div className={styles.userRow}><div className={styles.userBubble}><span className={styles.speaker}>You</span><p>{pending.question}</p></div></div><div className={styles.assistantRow}><div className={styles.assistantBubble}><span className={styles.speaker}>TurnUp assistant</span><p role="status" className={styles.thinking}>Checking the event information…</p></div></div></>}
    </div>
    <form className={styles.composer} onSubmit={(event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit(); }} aria-busy={pending !== null}>
      <label htmlFor="event-question">Your question</label>
      <div className={styles.inputRow}><textarea ref={composer} id="event-question" placeholder="Ask about this event…" rows={2} value={state.draft} onChange={(event) => onDraftChange(event.target.value)} disabled={disabled}
        aria-invalid={state.error === "invalid_question" || undefined} aria-describedby={"question-help" + (state.error ? " assistant-error" : "")}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!disabled) onSubmit(); } }} />
        <button type="submit" className={styles.send} disabled={disabled} aria-label={pending ? "Checking response" : "Send question"}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
        </button>
      </div>
      {inlineError && <p id="assistant-error" role="alert" tabIndex={-1} ref={error} className={styles.failure}>{message(state.error!)}</p>}
      <p id="question-help" className={styles.composerHelp}>{publicationMode ? "Live AI · published event information" : !canAsk ? "Source inspection only. AI answers are not connected here." : liveMode ? "Live AI · sample event information" : "Simulated responses only"}</p>
    </form>
  </section>;
}
