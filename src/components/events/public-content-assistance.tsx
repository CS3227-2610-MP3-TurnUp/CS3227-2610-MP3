"use client";

import { useEffect, useRef, useState } from "react";
import { EVENT_LIMITS, FIELD_LABELS, type EventFields, type TextField } from "../../lib/event-fields";
import {
  MAX_PUBLIC_CANDIDATE_OTHER_LENGTH,
  renderFAQ,
  type PublicCandidates,
  type PublicCandidateReference,
} from "../../features/proposal-assistance/public-candidates";
import type { PublicCandidatesResponse } from "../../features/proposal-assistance/public-candidates";

type CandidateSnapshot = {
  eventVersion: number;
  preparationRevision: number;
  editorRevision: number;
  dirty: boolean;
  unresolvedCount: number;
  editorActionPending: boolean;
  assistancePending: boolean;
  state: string;
  previousPublishedStart?: string;
  fields: EventFields;
};

type CandidateState = {
  eventVersion: number;
  preparationRevision: number;
  editorRevision: number;
  baselineFields: EventFields;
  appliedOther?: string;
  candidates: PublicCandidates;
};

type Props = {
  eventId: string;
  eventVersion: number;
  preparationRevision: number;
  editorActionPending: boolean;
  assistancePending: boolean;
  getCurrentSnapshot: () => CandidateSnapshot;
  onGenerationPending: (delta: 1 | -1) => void;
  onApply: (field: "other", value: string, eventVersion: number, preparationRevision: number, expectedEditorRevision: number, expectedFieldValue: string) => boolean;
};

export function PublicContentAssistance({ eventId, eventVersion, preparationRevision, editorActionPending, assistancePending, getCurrentSnapshot, onGenerationPending, onApply }: Props) {
  const [candidate, setCandidate] = useState<CandidateState | null>(null);
  const [otherText, setOtherText] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestRevision = useRef(0);
  const activeRequest = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    requestRevision.current += 1;
    controllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!editorActionPending) return;
    controllerRef.current?.abort();
  }, [editorActionPending]);

  const snapshot = getCurrentSnapshot();
  const draftComplete = isCompletePublicDraft(snapshot.fields, snapshot.state, snapshot.previousPublishedStart);
  const canGenerate = !pending && !editorActionPending && !assistancePending && !snapshot.editorActionPending && !snapshot.assistancePending &&
    !snapshot.dirty && snapshot.unresolvedCount === 0 && draftComplete;

  async function generate() {
    const current = getCurrentSnapshot();
    if (activeRequest.current || editorActionPending || assistancePending || current.editorActionPending || current.assistancePending ||
      current.dirty || current.unresolvedCount > 0 || !isCompletePublicDraft(current.fields, current.state, current.previousPublishedStart)) return;
    if (current.eventVersion !== eventVersion || current.preparationRevision !== preparationRevision) {
      setError("The saved event changed. Reload it before generating suggestions.");
      return;
    }

    const requestId = requestRevision.current + 1;
    requestRevision.current = requestId;
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    const source = { ...current.fields };
    activeRequest.current = true;
    setPending(true);
    setError("");
    setNotice("");
    setCandidate(null);
    setAnswers({});
    onGenerationPending(1);

    try {
      const response = await fetch("/api/organiser/events/" + eventId + "/public-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: current.eventVersion, expectedPreparationRevision: current.preparationRevision }),
        signal: controller.signal,
      });
      const payload = await response.json() as PublicCandidatesResponse;
      if (!response.ok || !payload.ok) {
        if (requestRevision.current === requestId && !controller.signal.aborted) setError(messageForOutcome(payload && !payload.ok ? payload.outcome : "unavailable"));
        return;
      }

      const latest = getCurrentSnapshot();
      if (requestRevision.current !== requestId || controller.signal.aborted) return;
      if (payload.eventVersion !== current.eventVersion || payload.preparationRevision !== current.preparationRevision ||
        latest.eventVersion !== current.eventVersion || latest.preparationRevision !== current.preparationRevision ||
        latest.editorRevision !== current.editorRevision || latest.dirty || latest.unresolvedCount > 0) {
        setNotice("The saved event or its fields changed while suggestions were being prepared. No suggestions were applied; save or reload the event and try again.");
        return;
      }

      setCandidate({ eventVersion: payload.eventVersion, preparationRevision: payload.preparationRevision, editorRevision: current.editorRevision, baselineFields: source, candidates: payload.candidates });
      setOtherText(payload.candidates.renderedOther);
      const hasSuggestions = payload.candidates.answeredFaqs.length > 0 || payload.candidates.unansweredQuestions.length > 0;
      setNotice(hasSuggestions
        ? "FAQ suggestions are ready to review. They are separate from the event field until you choose to apply them."
        : "FAQ generation finished. Your event fields were not changed.");
    } catch {
      if (requestRevision.current === requestId && !controller.signal.aborted) setError("Public suggestions are unavailable. Your event fields were not changed.");
    } finally {
      activeRequest.current = false;
      onGenerationPending(-1);
      if (requestRevision.current === requestId) {
        controllerRef.current = null;
        setPending(false);
      }
    }
  }

  function applyCandidate() {
    if (!candidate) return;
    const current = getCurrentSnapshot();
    const validated = normalizeCandidate(otherText);
    if (!validated.ok) {
      setError(validated.reason);
      return;
    }
    const expectedEditorRevision = candidate.editorRevision + (candidate.appliedOther === undefined ? 0 : 1);
    if (current.eventVersion !== candidate.eventVersion || current.preparationRevision !== candidate.preparationRevision ||
      current.editorRevision !== expectedEditorRevision || current.editorActionPending || current.assistancePending ||
      !matchesCandidateFields(current.fields, candidate.baselineFields, candidate.appliedOther)) {
      setError("The event or its working fields changed after these suggestions were prepared. Save or reload, then generate new suggestions.");
      return;
    }
    if (candidate.appliedOther !== undefined) {
      setError("This FAQ suggestion was already applied. Save the event before applying another one.");
      return;
    }
    const original = candidate.baselineFields.other;
    const updated = { ...current.fields, other: validated.value };
    const combined = validateCombinedPublicFields(updated);
    if (!combined.ok) {
      setError(combined.reason);
      return;
    }
    if (original.trim() && normalizeText(original) !== validated.value &&
      !window.confirm("Replace the current FAQ / Other text with these suggestions? The other event fields will be preserved.")) return;

    if (!onApply("other", validated.value, candidate.eventVersion, candidate.preparationRevision, expectedEditorRevision, original)) {
      setError("This suggestion is out of date. Save or reload the event before applying it.");
      return;
    }
    setCandidate({ ...candidate, appliedOther: validated.value });
    setError("");
    setNotice("FAQ / Other updated in the working form. Save Draft to keep this change.");
  }

  function appendAnsweredQuestion(index: number, faqQuestion: string) {
    const answer = (answers[index] ?? "").normalize("NFC").trim().replaceAll("\r\n", "\n");
    if (!answer) {
      setError("Enter an answer before adding this question to the FAQ / Other suggestion.");
      return;
    }
    const entry = renderFAQ(faqQuestion, answer);
    const separator = otherText.trim() ? "\n\n" : "";
    const next = otherText + separator + entry;
    const normalized = normalizeCandidate(next);
    if (!normalized.ok) {
      setError(normalized.reason);
      return;
    }
    const latest = getCurrentSnapshot();
    const combined = validateCombinedPublicFields({ ...latest.fields, other: normalized.value });
    if (!combined.ok) {
      setError(combined.reason);
      return;
    }
    setOtherText(next);
    setAnswers((previous) => ({ ...previous, [index]: "" }));
    setError("");
    setNotice("Your answer was added to the editable FAQ / Other suggestion only. Apply it to update the working form.");
  }

  function dismiss() {
    setCandidate(null);
    setOtherText("");
    setAnswers({});
    setError("");
    setNotice("Suggestions dismissed. Event fields were not changed.");
  }

  return <section className="proposal-assistance public-content-assistance" aria-labelledby="public-content-assistance-title">
    <h3 id="public-content-assistance-title">FAQ suggestions</h3>
    <p className="muted">Generate possible attendee questions from the saved event details only. Proposal PDFs, private findings, and clarification notes are not included. Suggestions stay separate until you choose to apply them, and applying them does not save or publish the event.</p>
    <div className="event-actions">
      <button type="button" className="primary" disabled={!canGenerate} onClick={() => void generate()}>{pending ? "Generating FAQ suggestions…" : "Generate FAQ suggestions"}</button>
      {candidate && <button type="button" className="secondary" disabled={pending} onClick={dismiss}>Dismiss suggestions</button>}
    </div>
    {!draftComplete && <p className="field-help" role="status">Complete the required event fields and date, time, and capacity before generating suggestions.</p>}
    {snapshot.dirty && <p className="field-help" role="status">Save your event changes before generating suggestions.</p>}
    {snapshot.unresolvedCount > 0 && <p className="field-help" role="status">Resolve and save the outstanding proposal questions before generating suggestions.</p>}
    {error && <p className="error-panel" role="alert">{error}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}

    {candidate && <section className="public-candidate-card" aria-labelledby="public-other-title">
        <h4 id="public-other-title">FAQ / Other suggestion</h4>
        {candidate.candidates.answeredFaqs.length === 0 && candidate.candidates.unansweredQuestions.length > 0 && <p className="notice" role="status">No supported answers were found in the saved event details. You can answer one of the questions below and add it here, or dismiss these suggestions.</p>}
        {candidate.candidates.answeredFaqs.length === 0 && candidate.candidates.unansweredQuestions.length === 0 && <p className="notice" role="status">No new questions to suggest beyond the details the event page already shows. You can write your own FAQ or dismiss these suggestions.</p>}
        {candidate.candidates.answeredFaqs.length > 0 && <div className="public-candidate-faq-evidence">
          <p className="field-help">Supported answers are derived from saved event details. These references support the original generated answers; review them again if you change the wording.</p>
          <ul>{candidate.candidates.answeredFaqs.map((faq, index) => <li key={faq.question + "-" + index}>
            <p><strong>Q: {faq.question}</strong><br />A: {faq.answer}</p>
            <CandidateReferences references={faq.references} />
          </li>)}</ul>
        </div>}
        <label htmlFor="public-other-candidate">Editable FAQ / Other</label>
        <textarea id="public-other-candidate" rows={5} value={otherText} disabled={candidate.appliedOther !== undefined} onChange={(event) => setOtherText(event.target.value)} aria-describedby="public-other-limit" />
        <p id="public-other-limit" className="field-help">Up to {MAX_PUBLIC_CANDIDATE_OTHER_LENGTH.toLocaleString()} characters. Editing this suggestion changes only the candidate.</p>
        {candidate.candidates.unansweredQuestions.length > 0 && <section className="public-unanswered-faq" aria-labelledby="public-unanswered-title">
          <h5 id="public-unanswered-title">Questions needing your answer</h5>
          <p className="field-help">These questions have no supported answer in the saved event details. They are not added to the suggestion unless you write an answer and choose to add one.</p>
          {candidate.candidates.unansweredQuestions.map((question, index) => <div className="public-unanswered-question" key={question + "-" + index}>
            <p><strong>Q: {question}</strong></p>
            <label htmlFor={"public-faq-answer-" + index}>Your answer</label>
            <textarea id={"public-faq-answer-" + index} rows={3} value={answers[index] ?? ""} disabled={candidate.appliedOther !== undefined} onChange={(event) => setAnswers((previous) => ({ ...previous, [index]: event.target.value }))} />
            <button type="button" className="secondary" disabled={candidate.appliedOther !== undefined || !(answers[index] ?? "").trim()} onClick={() => appendAnsweredQuestion(index, question)}>Add answered question to FAQ / Other suggestion</button>
          </div>)}
        </section>}
        <button type="button" className="secondary" disabled={candidate.appliedOther !== undefined || !otherText.trim()} onClick={applyCandidate}>{candidate.appliedOther !== undefined ? "FAQ / Other applied to working form" : "Apply FAQ / Other to working form"}</button>
      </section>}
  </section>;
}

function CandidateReferences({ references, id }: { references: PublicCandidateReference[]; id?: string }) {
  if (references.length === 0) return <p id={id} className="field-help">No source reference was returned for this wording.</p>;
  return <ul id={id} className="public-candidate-references" aria-label="Source references">{references.map((reference, index) => <li key={reference.field + "-" + index}>
    <span className="field-help">{sourceFieldLabel(reference.field)}:</span> <q>{reference.quote}</q>
  </li>)}</ul>;
}

function normalizeCandidate(value: string): { ok: true; value: string } | { ok: false; reason: string } {
  const normalized = normalizeText(value);
  const limit = MAX_PUBLIC_CANDIDATE_OTHER_LENGTH;
  const label = "FAQ / Other";
  if (!normalized) return { ok: false, reason: "Enter some " + label.toLowerCase() + " text before applying this suggestion." };
  if ([...normalized].length > limit) return { ok: false, reason: label + " must be no more than " + limit.toLocaleString() + " characters." };
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(normalized)) return { ok: false, reason: label + " contains characters that cannot be saved." };
  return { ok: true, value: normalized };
}

function normalizeText(value: string): string {
  return value.normalize("NFC").trim().replaceAll("\r\n", "\n");
}

function validateCombinedPublicFields(fields: EventFields): { ok: true } | { ok: false; reason: string } {
  const text = (Object.keys(EVENT_LIMITS) as TextField[]).map((key) => fields[key]).join("");
  if ([...text].length > 20_000 || new TextEncoder().encode(text).length > 48_000) {
    return { ok: false, reason: "The combined public event text would exceed the allowed size. Shorten the suggestion before applying it." };
  }
  return { ok: true };
}

function isCompletePublicDraft(fields: EventFields, state: string, previousPublishedStart?: string): boolean {
  const required: TextField[] = ["title", "description", "location", "fee", "openTo", "preparation"];
  if (required.some((field) => !fields[field].trim())) return false;
  if (!isCanonicalInstant(fields.start) || !isCanonicalInstant(fields.end) || Date.parse(fields.end) <= Date.parse(fields.start)) return false;
  if (typeof fields.capacity !== "number" || !Number.isInteger(fields.capacity) || fields.capacity < 1 || fields.capacity > 10_000) return false;
  if (state !== "PUBLISHED" && Date.parse(fields.start) <= Date.now()) return false;
  return state !== "PUBLISHED" || fields.start === previousPublishedStart || Date.parse(fields.start) > Date.now();
}

function isCanonicalInstant(value: string): boolean {
  return /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function matchesCandidateFields(
  current: EventFields,
  baseline: EventFields,
  appliedOther?: string,
): boolean {
  return (Object.keys(baseline) as Array<keyof EventFields>).every((field) => {
    const appliedValue = field === "other" ? appliedOther : undefined;
    return current[field] === (appliedValue ?? baseline[field]);
  });
}

function sourceFieldLabel(field: PublicCandidateReference["field"]): string {
  if (field === "start") return "Start time";
  if (field === "end") return "End time";
  if (field === "openTo") return "Open to";
  if (field === "other") return "FAQ / Other";
  const key = field as TextField;
  return FIELD_LABELS[key] ?? field;
}

function messageForOutcome(outcome: string): string {
  const messages: Record<string, string> = {
    disabled: "Public suggestions are not enabled in this environment.",
    not_configured: "Public suggestions are not configured. Your event fields are unchanged.",
    invalid_configuration: "Public suggestions are unavailable in this environment.",
    input_too_large: "The saved event details are too large to process safely.",
    unauthenticated: "Sign in again before generating suggestions.",
    forbidden: "You do not have access to this event.",
    rate_or_budget_limited: "Public suggestions are temporarily limited. Try again after the current limit expires.",
    timeout: "Preparing suggestions took too long. Your event fields are unchanged.",
    cancelled: "Suggestion preparation was cancelled. Your event fields are unchanged.",
    invalid_response: "The response could not be safely checked. Your event fields are unchanged.",
    invalid_request: "The request could not be checked. Reload the event before trying again.",
    stale_event: "The saved event changed. Reload it before generating suggestions.",
    not_ready: "Save a complete draft and resolve its proposal questions before generating suggestions.",
    unavailable: "Public suggestions are unavailable. Your event fields are unchanged.",
  };
  return messages[outcome] ?? "Public suggestions are unavailable. Your event fields are unchanged.";
}
