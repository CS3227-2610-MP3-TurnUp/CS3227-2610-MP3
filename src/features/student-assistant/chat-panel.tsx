"use client";

import React, { useEffect, useRef } from "react";
import { isValidatedAnswer } from "./evidence";
import type { AssistantState, FailureReason, ValidatedAnswer } from "./types";
import styles from "./chat-panel.module.css";

const errors: Record<FailureReason, string> = {
  live_not_authorized: "Live requests are not authorised yet. Use the simulation while model permission and budget are confirmed.",
  budget_exhausted: "The approved local test budget is used up. No request was sent.",
  invalid_source: "Event information is unavailable. Choose another sample or reset the source.",
  invalid_response: "The response could not be read safely. Try again.",
  invalid_evidence: "The response could not be checked against the event information. Try again.",
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
  suggestions?: readonly string[];
  onSuggestion?: (question: string) => void;
}

function AnswerMessage({ answer }: { answer: ValidatedAnswer }) {
  return <>
    {answer.reply ? <p>{answer.reply}</p> : <h3>{answer.kind === "answered" ? "From the event information" : answer.kind === "partially_answered" ? "Part of your question is covered" : answer.kind === "unanswered" ? "Not covered by the event information" : answer.kind === "needs_clarification" ? "Could you clarify?" : "Please ask about this event"}</h3>}
    {(answer.kind === "answered" || answer.kind === "partially_answered") && <>
      {!answer.reply && answer.evidence.map((item) => <blockquote key={item.sectionId + item.quote} className={styles.quote}>{item.quote}</blockquote>)}
      <details className={styles.citations}><summary>View sources ({answer.evidence.length})</summary>
        <ul>{answer.evidence.map((item) => <li key={item.sectionId + item.quote}>{item.label} · {answer.revision}{answer.reply && <blockquote className={styles.quote}>{item.quote}</blockquote>}</li>)}</ul>
      </details>
    </>}
    {answer.kind === "partially_answered" && <><p>Not answered by these details:</p><ul>{answer.unresolved.map((item) => <li key={item}>{item}</li>)}</ul></>}
    {answer.kind === "unanswered" && !answer.reply && <p>The sample event information does not cover this question.</p>}
    {answer.kind === "needs_clarification" && !answer.reply && <p>{answer.clarification}</p>}
    {answer.kind === "out_of_scope" && !answer.reply && <p>I can help with questions about the selected event information.</p>}
    {(answer.kind === "partially_answered" || answer.kind === "unanswered") && <p className={styles.explanation}>Organiser follow-up is not connected in this preview. No question has been sent.</p>}
  </>;
}

export function ChatPanel({ state, onDraftChange, onSubmit, onClose, liveMode = false, suggestions = [], onSuggestion }: ChatPanelProps) {
  const error = useRef<HTMLParagraphElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (state.error) error.current?.focus(); }, [state.error]);
  useEffect(() => { const element = conversation.current; if (element) element.scrollTop = element.scrollHeight; }, [state.turns.length, state.pending?.requestId, state.notice]);
  const available = state.availability === "available" && state.source !== null;
  const disabled = state.pending !== null || !available;
  const turns = available ? state.turns.filter((turn) => turn.eventId === state.source!.eventId && turn.revision === state.source!.revision) : [];
  const pending = available && state.pending?.eventId === state.source!.eventId && state.pending.revision === state.source!.revision ? state.pending : null;
  useEffect(() => { if (state.answer && !state.pending) composer.current?.focus(); }, [state.answer, state.pending]);
  const inlineError = state.error && (state.error === "invalid_question" || !turns.length);
  function choose(question: string) { (onSuggestion ?? onDraftChange)(question); composer.current?.focus(); }
  return <section className={styles.chat} aria-labelledby="assistant-title">
    <header className={styles.chatHeader}>
      <div><span className={styles.eyebrow}>Event assistant</span><h2 id="assistant-title">{state.source?.title ?? "Event unavailable"}</h2></div>
      {onClose && <button type="button" className={styles.close} aria-label="Close chat" onClick={onClose}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button>}
    </header>
    <div className={styles.conversation} role="log" aria-label="Event conversation" aria-live="polite" aria-relevant="additions text" tabIndex={0} ref={conversation}>
      <div className={styles.assistantRow}><div className={styles.assistantBubble}><span className={styles.speaker}>TurnUp assistant</span>
        <p>Hi! What would you like to know about this event?</p><p className={styles.explanation}>I’ll use the event information and show you the sources. You don’t need to register to ask.</p>
      </div></div>
      {state.notice && <p role="status" className={styles.notice}>{notices[state.notice]}</p>}
      {!turns.length && !pending && available && suggestions.length > 0 && <div className={styles.suggestions} aria-label="Starter questions">{suggestions.map((question) => <button key={question} type="button" onClick={() => choose(question)}>{question}</button>)}</div>}
      {turns.map((turn, index) => {
        const answer = isValidatedAnswer(turn.answer) && turn.answer.eventId === state.source?.eventId && turn.answer.revision === state.source?.revision ? turn.answer : null;
        const latestError = index === turns.length - 1 && state.error === turn.error && turn.error !== null;
        return <React.Fragment key={turn.requestId}>
          <div className={styles.userRow}><div className={styles.userBubble}><span className={styles.speaker}>You</span><p>{turn.question}</p></div></div>
          {(answer || turn.error) && <div className={styles.assistantRow}><div className={styles.assistantBubble}><span className={styles.speaker}>TurnUp assistant</span>
            {answer && <AnswerMessage answer={answer} />}
            {turn.error && <><p id={latestError ? "assistant-error" : undefined} role={latestError ? "alert" : undefined} tabIndex={latestError ? -1 : undefined} ref={latestError ? error : undefined} className={styles.failure}>{errors[turn.error]}</p>
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
      {inlineError && <p id="assistant-error" role="alert" tabIndex={-1} ref={error} className={styles.failure}>{errors[state.error!]}</p>}
      <p id="question-help" className={styles.composerHelp}>{liveMode ? "Live AI · sample event information" : "Simulated responses only"}</p>
    </form>
  </section>;
}
