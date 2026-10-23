"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EVENT_LIMITS, FIELD_LABELS, sameEventFields, singaporeInput, singaporeInstant, type EventFields, type TextField } from "../../lib/event-fields";
import type { DraftRetentionStatus } from "../../lib/event-retention";
import { formatEventAlternative, prepareEventAlternative, type ProposalFeedbackMap, type ProposalFieldFeedback } from "../../features/proposal-assistance/event-prefill";
import { CLARIFICATION_COPY, PROPOSAL_TO_EVENT_FIELD, type ClarificationIssue, type ClarificationResolutionIntent, type EventPreparationResponse } from "../../features/proposal-assistance/clarification";
import type { PageEvidence, ProposalField } from "../../features/proposal-assistance/types";
import { EventContent } from "./event-content";
import { ProposalAssistance } from "./proposal-assistance";
import { PublicContentAssistance } from "./public-content-assistance";
import { DraftRetentionNotice } from "./draft-retention-notice";

type Snapshot = { fields: EventFields; form: { formRevisionId: string; questions: unknown[] } };
type View = { id: string; version: number; state: string; fields: EventFields; published: Snapshot | null; preparation: EventPreparationResponse; retention?: DraftRetentionStatus | null };
type Preview = { approvalId: string; version: number; snapshot: Snapshot; digest: string };
type Mode = "publication" | "editor" | "preview";
type LocalResolutionIntent = { method: "suggestion"; alternative: { value: string; evidence: PageEvidence[] } } | { method: "organiser" };
type LocalResolutionMap = Partial<Record<ProposalField, LocalResolutionIntent>>;
function defaultMode(view: View): Mode { return view.published ? "publication" : "editor"; }

export function EventEditor({ id }: { id: string }) {
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [fields, setFields] = useState<EventFields | null>(null);
  const [mode, setMode] = useState<Mode>("editor");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [proposalFeedback, setProposalFeedback] = useState<ProposalFeedbackMap>({});
  const [resolutionIntents, setResolutionIntents] = useState<LocalResolutionMap>({});
  const [assistancePendingCount, setAssistancePendingCount] = useState(0);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const feedback = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);
  const editorRevision = useRef(0);
  const proposalFeedbackRevision = useRef(0);
  const assistancePendingRef = useRef(0);
  const viewRef = useRef<View | null>(null);
  const workingRef = useRef<{ fields: EventFields | null; intents: LocalResolutionMap }>({ fields, intents: resolutionIntents });
  viewRef.current = view;
  workingRef.current = { fields, intents: resolutionIntents };
  const renderedEditorRevision = editorRevision.current;
  const dirty = !!view && !!fields && (!sameEventFields(fields, view.fields) || Object.keys(resolutionIntents).length > 0);

  async function load(signal?: AbortSignal, preferredMode?: Mode) {
    const response = await fetch(`/api/organiser/events/${id}`, { cache: "no-store", signal });
    const result = await response.json() as View & { error?: string };
    if (!response.ok) throw new Error(result.error || "Event unavailable.");
    if (!signal?.aborted) {
      const loaded = { ...result, retention: result.retention ?? null };
      proposalFeedbackRevision.current += 1;
      viewRef.current = loaded;
      workingRef.current = { fields: loaded.fields, intents: {} };
      setView(loaded); setFields(loaded.fields); setPreview(null); setApproved(false);
      setResolutionIntents({});
      setMode(loaded.state === "CANCELLED" ? "publication" : preferredMode ?? defaultMode(loaded));
      setEditorEpoch((epoch) => epoch + 1);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch(() => {
      if (!controller.signal.aborted) setError("Event unavailable. Your saved work has been preserved.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // The event identity is fixed for this mounted route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function showEditor() {
    setPreview(null); setApproved(false); setMode("editor"); setError(""); setFieldError(""); setNotice("");
    setTimeout(() => heading.current?.focus(), 0);
  }
  function cancelEditing() {
    if (!view) return;
    editorRevision.current += 1;
    proposalFeedbackRevision.current += 1;
    setEditorEpoch((epoch) => epoch + 1);
    workingRef.current = { fields: view.fields, intents: {} };
    setFields(view.fields); setPreview(null); setApproved(false); setMode(defaultMode(view)); setError(""); setFieldError(""); setProposalFeedback({}); setResolutionIntents({});
    setNotice("Unsaved edits discarded. Saved draft and publication are unchanged.");
    setTimeout(() => heading.current?.focus(), 0);
  }
  function change(key: keyof EventFields, value: string | number | null) {
    editorRevision.current += 1;
    proposalFeedbackRevision.current += 1;
    const nextFields = workingRef.current.fields ? { ...workingRef.current.fields, [key]: value } : null;
    workingRef.current = { ...workingRef.current, fields: nextFields };
    setFields(nextFields);
    setProposalFeedback((old) => {
      if (!old[key]) return old;
      const next = { ...old };
      delete next[key];
      return next;
    });
    const proposalField = proposalFieldForEventField(key);
    if (proposalField && workingRef.current.intents[proposalField]) {
      const next = { ...workingRef.current.intents };
      delete next[proposalField];
      workingRef.current = { ...workingRef.current, intents: next };
      setResolutionIntents(next);
    }
    setPreview(null); setApproved(false); setNotice("");
  }
  function applyProposalPrefill(values: Partial<EventFields>, feedback: ProposalFeedbackMap) {
    if (inFlight.current || pending || !fields) return;
    proposalFeedbackRevision.current += 1;
    if (Object.keys(values).length > 0) {
      editorRevision.current += 1;
      const nextFields = workingRef.current.fields ? { ...workingRef.current.fields, ...values } : null;
      workingRef.current = { ...workingRef.current, fields: nextFields };
      setFields(nextFields);
      setPreview(null); setApproved(false);
      setNotice("Supported proposal findings were prefilled. Review each value and its source evidence before saving.");
    } else {
      setNotice("No safe values could be prefilled. Existing event fields were kept; review the status under each field.");
    }
    setProposalFeedback(feedback);
  }
  function clearProposalFeedback() {
    proposalFeedbackRevision.current += 1;
    setProposalFeedback({});
  }
  function adjustAssistancePending(delta: 1 | -1) {
    const count = Math.max(0, assistancePendingRef.current + delta);
    assistancePendingRef.current = count;
    setAssistancePendingCount(count);
  }
  function acceptServerPreparation(eventVersion: number, preparation: EventPreparationResponse, retention?: DraftRetentionStatus | null) {
    const current = viewRef.current;
    if (!current || eventVersion < current.version || (preparation?.revision ?? 0) < (current.preparation?.revision ?? 0)) return;
    proposalFeedbackRevision.current += 1;
    const next = { ...current, version: eventVersion, preparation, ...(retention === undefined ? {} : { retention }) };
    viewRef.current = next;
    setView(next);
    // A local confirmation was made against the previous source revision. It
    // must be repeated against this authoritative preparation, even when the
    // newly extracted answer happens to match the old local choice.
    workingRef.current = { ...workingRef.current, intents: {} };
    setResolutionIntents({});
  }
  function chooseClarificationAlternative(field: ProposalField, alternative: { value: string; evidence: PageEvidence[] }, expectedRevision: number, expectedEditorRevision: number) {
    if (!view || expectedRevision !== (view.preparation?.revision ?? 0) || expectedEditorRevision !== editorRevision.current || assistancePendingRef.current > 0 || inFlight.current || pending || !fields) return;
    const issue = view.preparation?.issues.find((candidate) => candidate.field === field);
    if (!issue || isIssueResolved(issue, fields, resolutionIntents) || !issue.alternatives.some((candidate) => sameEvidence(candidate, alternative))) return;
    const eventField = PROPOSAL_TO_EVENT_FIELD[field];
    const converted = prepareEventAlternative(eventField, alternative.value);
    if (!converted.ok) return;
    change(eventField, converted.value);
    const nextIntents = { ...workingRef.current.intents, [field]: { method: "suggestion" as const, alternative } };
    workingRef.current = { ...workingRef.current, intents: nextIntents };
    setResolutionIntents(nextIntents);
    setNotice("The selected proposal value is ready to save with its evidence.");
  }
  function confirmClarification(field: ProposalField, expectedRevision: number, expectedEditorRevision: number) {
    if (!view || expectedRevision !== (view.preparation?.revision ?? 0) || expectedEditorRevision !== editorRevision.current || assistancePendingRef.current > 0 || inFlight.current || pending || !fields) return;
    const issue = view.preparation?.issues.find((candidate) => candidate.field === field);
    if (!issue || isIssueResolved(issue, fields, resolutionIntents) || !isConfirmationReady(field, fields)) return;
    editorRevision.current += 1;
    proposalFeedbackRevision.current += 1;
    const nextIntents = { ...workingRef.current.intents, [field]: { method: "organiser" as const } };
    workingRef.current = { ...workingRef.current, intents: nextIntents };
    setResolutionIntents(nextIntents);
    setPreview(null); setApproved(false);
    setNotice("Your confirmation is ready to save with the draft.");
  }
  async function action(action: string) {
    if (inFlight.current || !view) return;
    if (assistancePendingRef.current > 0 && ["save", "preview", "publish"].includes(action)) {
      setError("Wait for proposal findings to finish before saving or previewing the draft.");
      return;
    }
    if ((action === "preview" || action === "publish") && fields && unresolvedClarifications(view.preparation, fields, resolutionIntents).length > 0) {
      setError("Resolve the outstanding proposal clarifications and save the draft before previewing or publishing.");
      return;
    }
    const confirmations: Record<string, string> = {
      delete: "Delete this never-published draft permanently?",
      cancel: "Cancel this event permanently? It cannot be republished.",
      withdraw: "Withdraw this event? Its public content will become unavailable until you review and republish it.",
      discard: "Discard saved private changes and any unsaved edits, then restore the working draft from the last publication? The event and publication will not be deleted.",
    };
    const title = mode === "publication" ? view.published?.fields.title : fields?.title;
    if (confirmations[action] && !window.confirm(`${title || "Untitled event"}\n\n${confirmations[action]}`)) return;
    inFlight.current = true;
    setPending(true); setError(""); setFieldError(""); setNotice("");
    try {
      const response = await fetch(`/api/organiser/events/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, expectedVersion: view.version,
        ...(action === "save" ? { fields, expectedPreparationRevision: view.preparation?.revision ?? 0, resolutions: buildResolutionIntents(resolutionIntents, fields!, view.preparation) } : action === "publish" ? { approvalId: preview?.approvalId } : {}) }) });
      const result = await response.json();
      if (!response.ok) {
        setFieldError(result.field || "");
        setError(result.error || "The event could not be updated.");
        return;
      }
      if (action === "delete") { router.push("/organiser"); return; }
      if (action === "preview") {
        setPreview(result); setApproved(false); setMode("preview");
        setNotice("Review the exact public content below before publishing.");
      } else {
        await load(undefined, action === "save" ? "editor" : undefined);
        setNotice(action === "save" ? "Draft saved privately." : action === "publish" ? "Event published." : action === "discard" ? "Saved private changes discarded. The publication is unchanged." : action === "withdraw" ? "Event withdrawn." : "Event cancelled.");
      }
    } catch {
      setError("Event service unavailable. Keep your input and reload saved values before retrying; the request may have completed.");
    } finally {
      inFlight.current = false; setPending(false);
      setTimeout(() => feedback.current?.focus(), 0);
    }
  }
  async function reload() {
    if (inFlight.current || (dirty && !window.confirm("Reload saved values and discard unsaved edits?"))) return;
    inFlight.current = true; setPending(true); setError(""); setFieldError("");
    try { await load(); setProposalFeedback({}); setResolutionIntents({}); setNotice("Saved values reloaded. Review before making further changes."); }
    catch { setError("Event unavailable. Your current input has been preserved."); }
    finally { inFlight.current = false; setPending(false); setTimeout(() => feedback.current?.focus(), 0); }
  }

  if (loading) return <p role="status">Loading event…</p>;
  if (!view || !fields) return <section className="card"><h1>Event unavailable</h1><p role="alert">{error}</p><Link href="/organiser">Back to your events</Link></section>;
  const cancelled = view.state === "CANCELLED";
  const published = view.published;
  const hasSavedChanges = !!published && !cancelled && !sameEventFields(view.fields, published.fields);
  const displayedFields = mode === "publication" && published ? published.fields : mode === "preview" && preview ? preview.snapshot.fields : fields;
  const preparationRevision = view.preparation?.revision ?? 0;
  const unresolved = unresolvedClarifications(view.preparation, fields, resolutionIntents);
  function getCurrentCandidateSnapshot() {
    const currentView = viewRef.current;
    const currentFields = workingRef.current.fields;
    const currentIntents = workingRef.current.intents;
    return {
      eventVersion: currentView?.version ?? -1,
      preparationRevision: currentView?.preparation?.revision ?? 0,
      editorRevision: editorRevision.current,
      dirty: !!currentView && !!currentFields && (!sameEventFields(currentFields, currentView.fields) || Object.keys(currentIntents).length > 0),
      unresolvedCount: currentView && currentFields ? unresolvedClarifications(currentView.preparation, currentFields, currentIntents).length : 0,
      editorActionPending: inFlight.current,
      assistancePending: assistancePendingRef.current > 0,
      state: currentView?.state ?? "DRAFT",
      previousPublishedStart: currentView?.published?.fields.start,
      fields: currentFields ?? fields!,
    };
  }
  function applyPublicCandidate(field: "other", value: string, expectedVersion: number, expectedPreparationRevision: number, expectedEditorRevision: number, expectedFieldValue: string): boolean {
    const current = getCurrentCandidateSnapshot();
    if (current.editorActionPending || current.assistancePending || current.eventVersion !== expectedVersion ||
      current.preparationRevision !== expectedPreparationRevision || current.editorRevision !== expectedEditorRevision ||
      current.fields[field] !== expectedFieldValue) return false;
    change(field, value);
    return true;
  }
  const describedBy = (key: string) => [
    key in EVENT_LIMITS ? `help-${key}` : "",
    fieldError === key ? "event-error" : "",
    proposalFeedback[key as keyof EventFields] || view.preparation?.issues.some((issue) => PROPOSAL_TO_EVENT_FIELD[issue.field] === key) ? `proposal-feedback-${key}` : "",
  ].filter(Boolean).join(" ") || undefined;

  return <>
    <Link href="/organiser" onClick={(event) => { if (dirty && !window.confirm("Leave and discard unsaved edits?")) event.preventDefault(); }}>Back to your events</Link>
    <div className="event-heading"><div><p className="eyebrow">{view.state.toLowerCase()}</p>
      <h1 ref={heading} tabIndex={-1}>{displayedFields.title || "Untitled draft"}</h1>
      <p className="muted">Times are entered and displayed in Singapore time (SGT).</p></div></div>
    <div ref={feedback} tabIndex={-1} className="event-feedback" aria-live="polite">
      {error && <div role="alert" className="error-panel"><p id="event-error">{error}</p>
        <button className="secondary" disabled={pending} onClick={() => void reload()}>Reload saved values</button></div>}
      {notice && <p role="status" className="notice">{notice}</p>}
    </div>

    {mode !== "preview" && <DraftRetentionNotice retention={view.retention} canExtend={!cancelled} />}

    {mode === "publication" && published && <section className="card event-publication">
      <h2>{view.state === "PUBLISHED" ? "Current Live Publication" : "Last Publication"}</h2>
      {view.state === "WITHDRAWN" && <p className="notice">Withdrawn: this publication is unavailable publicly. Edit and review a safe revision before republication.</p>}
      {cancelled && <p className="notice">This event is permanently cancelled. Its retained information is available to you only.</p>}
      {hasSavedChanges && <p className="notice">You have saved private changes. They are not part of this publication.</p>}
      <EventContent fields={published.fields} />
      {!cancelled && <div className="event-actions event-footer">
        <button className="primary" disabled={pending} onClick={showEditor}>{view.state === "WITHDRAWN" ? "Edit for republication" : "Edit Live Publication"}</button>
        {view.state === "PUBLISHED" && <button className="secondary" disabled={pending} onClick={() => void action("withdraw")}>Withdraw</button>}
        <button className="secondary event-danger" disabled={pending} onClick={() => void action("cancel")}>Cancel Event</button>
      </div>}
    </section>}

    {mode === "editor" && !cancelled && <form className="card event-editor" onSubmit={(event) => { event.preventDefault(); void action("save"); }}>
      <h2>Private Working Draft</h2><p className="muted">Incomplete drafts can be saved. Published content changes only after fresh preview and approval.</p>
      <ProposalAssistance key={`${id}-${editorEpoch}`} eventId={id} eventVersion={view.version} preparationRevision={preparationRevision} eventBusy={pending} generationBusy={assistancePendingCount > 0}
        preserveFields={new Set(Object.keys(resolutionIntents) as ProposalField[])}
        currentEditorRevision={() => editorRevision.current} onPrefill={applyProposalPrefill} onServerPreparation={acceptServerPreparation}
        onGenerationPending={adjustAssistancePending} onClearFeedback={clearProposalFeedback} />
      <PublicContentAssistance key={id + "-" + editorEpoch + "-" + view.version + "-" + preparationRevision}
        eventId={id} eventVersion={view.version} preparationRevision={preparationRevision}
        editorActionPending={pending} assistancePending={assistancePendingCount > 0}
        getCurrentSnapshot={getCurrentCandidateSnapshot} onGenerationPending={adjustAssistancePending} onApply={applyPublicCandidate} />
      <ClarificationSummary preparation={view.preparation} fields={fields} intents={resolutionIntents} />
      <fieldset disabled={pending} className="event-fields">
        {(Object.keys(EVENT_LIMITS) as TextField[]).map((key) => <div className="field" key={key}>
          <label htmlFor={`event-${key}`}>{FIELD_LABELS[key]}{key !== "other" && " (required to publish)"}</label>
          {key === "title" ? <input id={`event-${key}`} value={fields[key]} aria-invalid={fieldError === key} aria-describedby={describedBy(key)} onChange={(e) => change(key, e.target.value)} /> :
            <textarea id={`event-${key}`} value={fields[key]} rows={key === "description" || key === "other" ? 5 : 3} aria-invalid={fieldError === key} aria-describedby={describedBy(key)} onChange={(e) => change(key, e.target.value)} />}
          <p id={`help-${key}`} className="field-help">{[...fields[key].normalize("NFC").trim()].length.toLocaleString()} / {EVENT_LIMITS[key].toLocaleString()} characters</p>
          <ProposalFieldFeedback feedback={proposalFeedback[key]} issue={issueForEventField(view.preparation, key)} intent={issueIntent(view.preparation, key, resolutionIntents)}
            currentValue={fields[key]} field={key} disabled={pending || assistancePendingCount > 0}
            onChooseAlternative={(field, alternative) => chooseClarificationAlternative(field, alternative, preparationRevision, renderedEditorRevision)}
            onConfirm={(field) => confirmClarification(field, preparationRevision, renderedEditorRevision)} />
        </div>)}
        <div className="event-date-grid">{(["start", "end"] as const).map((key) => <div className="field" key={key}>
          <label htmlFor={`event-${key}`}>{key === "start" ? "Start" : "End"} (SGT; required to publish)</label>
          <input id={`event-${key}`} type="datetime-local" value={singaporeInput(fields[key])} aria-invalid={fieldError === key} aria-describedby={describedBy(key)} onChange={(e) => {
            try { change(key, singaporeInstant(e.target.value)); } catch { setFieldError(key); setError("Enter a complete valid Singapore date and time."); }
          }} />
          <ProposalFieldFeedback feedback={proposalFeedback[key]} issue={issueForEventField(view.preparation, key)} intent={issueIntent(view.preparation, key, resolutionIntents)}
            currentValue={fields[key]} field={key} disabled={pending || assistancePendingCount > 0}
            onChooseAlternative={(field, alternative) => chooseClarificationAlternative(field, alternative, preparationRevision, renderedEditorRevision)}
            onConfirm={(field) => confirmClarification(field, preparationRevision, renderedEditorRevision)} />
        </div>)}</div>
        <p className="field-help" role="note">When the source gives a complete date and time without a timezone, it is interpreted as Singapore Time (SGT). Review the converted value against the source evidence.</p>
        <div className="field"><label htmlFor="event-capacity">Capacity (required to publish)</label>
          <input id="event-capacity" type="number" min="1" max="10000" step="1" value={fields.capacity ?? ""} aria-invalid={fieldError === "capacity"} aria-describedby={describedBy("capacity")} onChange={(e) => change("capacity", e.target.value === "" ? null : Number(e.target.value))} />
          <ProposalFieldFeedback feedback={proposalFeedback.capacity} issue={issueForEventField(view.preparation, "capacity")} intent={issueIntent(view.preparation, "capacity", resolutionIntents)}
            currentValue={fields.capacity} field="capacity" disabled={pending || assistancePendingCount > 0}
            onChooseAlternative={(field, alternative) => chooseClarificationAlternative(field, alternative, preparationRevision, renderedEditorRevision)}
            onConfirm={(field) => confirmClarification(field, preparationRevision, renderedEditorRevision)} />
        </div>
      </fieldset>
      {dirty && <p className="notice">You have unsaved edits. Save before previewing.</p>}
      {unresolved.length > 0 && <p className="notice">Resolve the proposal clarifications below before previewing or publishing. You can save this draft while questions remain.</p>}
      <div className="event-actions">
        <button className="primary" disabled={pending || assistancePendingCount > 0} type="submit">{pending ? "Working…" : "Save Draft"}</button>
        <button className="secondary" type="button" disabled={pending || assistancePendingCount > 0 || (!dirty && !published)} onClick={cancelEditing}>Cancel Editing</button>
        <button className="secondary" type="button" disabled={pending || assistancePendingCount > 0 || dirty || unresolved.length > 0} onClick={() => void action("preview")}>Preview saved draft</button>
        {!published && <button className="secondary event-danger" type="button" disabled={pending} onClick={() => void action("delete")}>Delete draft</button>}
        {hasSavedChanges && <button className="secondary event-danger" type="button" disabled={pending} onClick={() => void action("discard")}>Discard saved changes</button>}
      </div>
    </form>}

    {mode === "preview" && preview && !cancelled && <section className="card event-preview" aria-label="Exact public preview">
      <h2>Public Preview</h2><EventContent fields={preview.snapshot.fields} /><p>Registration form: no questions.</p>
      <div className="event-footer">
        <label className="event-approval"><input type="checkbox" checked={approved} disabled={pending} onChange={(e) => setApproved(e.target.checked)} />I reviewed and approve this exact public content.</label>
        <div className="event-actions">
          <button className="primary" disabled={!approved || pending || dirty} onClick={() => void action("publish")}>{view.state === "WITHDRAWN" ? "Republish approved event" : "Publish approved event"}</button>
          <button className="secondary" disabled={pending} onClick={showEditor}>Edit saved draft</button>
          <button className="secondary event-danger" disabled={pending} onClick={() => void action(published ? "discard" : "delete")}>{published ? "Discard saved changes" : "Delete draft"}</button>
        </div>
      </div>
    </section>}
  </>;
}

function ClarificationSummary({ preparation, fields, intents }: {
  preparation: EventPreparationResponse;
  fields: EventFields;
  intents: LocalResolutionMap;
}) {
  const unresolved = unresolvedClarifications(preparation, fields, intents);
  if (unresolved.length === 0) return null;
  return <section className="proposal-clarification-summary" aria-labelledby="proposal-clarification-title" aria-live="polite">
    <h4 id="proposal-clarification-title">Clarification needed ({unresolved.length})</h4>
    <p className="field-help">Resolve each issue before previewing or publishing. Save Draft keeps your progress.</p>
    <ul>{unresolved.map((issue) => {
      const eventField = PROPOSAL_TO_EVENT_FIELD[issue.field];
      return <li key={issue.field}><a href={`#event-${eventField}`}>{CLARIFICATION_COPY[issue.field].question}</a></li>;
    })}</ul>
  </section>;
}

function ProposalFieldFeedback({ feedback: fieldFeedback, issue, intent, currentValue, field, disabled, onChooseAlternative, onConfirm }: {
  feedback?: ProposalFieldFeedback;
  issue?: ClarificationIssue;
  intent?: LocalResolutionIntent;
  currentValue: string | number | null;
  field: keyof EventFields;
  disabled: boolean;
  onChooseAlternative: (field: ProposalField, alternative: { value: string; evidence: PageEvidence[] }) => void;
  onConfirm: (field: ProposalField) => void;
}) {
  if (issue) {
    const resolved = !!intent || (issue.resolution !== null && sameClarificationValue(issue.field, currentValue, issue.resolution.value));
    const method = intent?.method ?? (resolved ? issue.resolution?.method : undefined);
    const selectedEvidence = intent?.method === "suggestion" ? intent.alternative.evidence :
      resolved && method === "suggestion" ? issue.resolution?.evidence ?? [] : [];
    const isChanged = issue.resolution !== null && !sameClarificationValue(issue.field, currentValue, issue.resolution.value) && !intent;
    const reason = isChanged ? "answer_changed" : issue.reason;
    const eventField = PROPOSAL_TO_EVENT_FIELD[issue.field];
    return <div id={`proposal-feedback-${field}`} className="proposal-field-feedback" aria-live="polite">
      <p className="proposal-clarification-question">{CLARIFICATION_COPY[issue.field].question}</p>
      <p className="field-help">{CLARIFICATION_COPY[issue.field].reasons[reason]}</p>
      {!resolved && issue.confirmedValue !== undefined && <p className="field-help">Previously confirmed value: <strong>{String(issue.confirmedValue)}</strong></p>}
      {resolved ? <>
        <p className="field-help">{intent?.method === "organiser" ? "Your confirmation is ready to save with the draft." : intent ? "This suggestion is ready to save with the draft." : method === "suggestion" ? "Resolved from the proposal." : "Confirmed by you."}</p>
        {selectedEvidence.length > 0 && <ProposalEvidence evidence={selectedEvidence} />}
      </> : <>
        {issue.alternatives.length > 0 && <>
          <p className="field-help">Choose one supported suggestion, or enter your answer and confirm it.</p>
          <ul className="proposal-alternatives">{issue.alternatives.map((alternative, index) => <li key={`${alternative.value}-${index}`}>
            <button type="button" className="secondary proposal-alternative-choice" disabled={disabled}
              aria-describedby={`proposal-alternative-evidence-${field}-${index}`}
              onClick={() => onChooseAlternative(issue.field, alternative)}>Use {formatEventAlternative(eventField, alternative.value)}</button>
            <ProposalEvidence evidence={alternative.evidence} id={`proposal-alternative-evidence-${field}-${index}`} />
          </li>)}</ul>
        </>}
        {isChanged && issue.resolution?.evidence.length ? <div className="proposal-prior-evidence">
          <p className="field-help">Evidence for the previously confirmed value:</p>
          <ProposalEvidence evidence={issue.resolution.evidence} />
        </div> : null}
        <button type="button" className="secondary proposal-confirm-value" disabled={disabled || !isConfirmationReady(issue.field, currentValue)}
          onClick={() => onConfirm(issue.field)}>Confirm this value</button>
      </>}
    </div>;
  }
  if (!fieldFeedback) return null;
  if (fieldFeedback.status === "prefilled") {
    if (fieldFeedback.generatedValue !== currentValue) {
      return <p id={`proposal-feedback-${field}`} className="field-help">The field changed after generation, so its source evidence is no longer shown.</p>;
    }
    return <div id={`proposal-feedback-${field}`} className="proposal-field-feedback" aria-live="polite">
      <p className="field-help">Prefilled from the proposal. Editing this field removes its source evidence.</p>
      <ProposalEvidence evidence={fieldFeedback.evidence} />
    </div>;
  }
  if (fieldFeedback.status === "missing") return <p id={`proposal-feedback-${field}`} className="field-help" role="status">No supported value was found. The existing field was kept.</p>;
  if (fieldFeedback.status === "unprocessed") return <p id={`proposal-feedback-${field}`} className="field-help" role="status">No safe value was returned for this field. The existing field was kept.</p>;
  if (fieldFeedback.status === "invalid") return <div id={`proposal-feedback-${field}`} className="proposal-field-feedback" role="status">
    <p className="field-help">Not prefilled: {fieldFeedback.reason} The existing field was kept.</p>
    <ProposalEvidence evidence={fieldFeedback.evidence} />
  </div>;
  return <div id={`proposal-feedback-${field}`} className="proposal-field-feedback" role="status">
    <p className="field-help">The proposal gives conflicting values. Choose a source-supported value or edit the field manually.</p>
    <ul className="proposal-alternatives">{fieldFeedback.alternatives.map((alternative, index) => <li key={`${alternative.value}-${index}`}>
      <button type="button" className="secondary proposal-alternative-choice" aria-describedby={`proposal-alternative-evidence-${field}-${index}`}
        onClick={() => { const proposalField = proposalFieldForEventField(field); if (proposalField) onChooseAlternative(proposalField, alternative); }}>Use {formatEventAlternative(field, alternative.value)}</button>
      <ProposalEvidence evidence={alternative.evidence} id={`proposal-alternative-evidence-${field}-${index}`} />
    </li>)}</ul>
  </div>;
}

function issueForEventField(preparation: EventPreparationResponse, field: keyof EventFields): ClarificationIssue | undefined {
  return preparation?.issues.find((issue) => PROPOSAL_TO_EVENT_FIELD[issue.field] === field);
}

function issueIntent(preparation: EventPreparationResponse, field: keyof EventFields, intents: LocalResolutionMap): LocalResolutionIntent | undefined {
  const issue = issueForEventField(preparation, field);
  return issue ? intents[issue.field] : undefined;
}

function unresolvedClarifications(preparation: EventPreparationResponse, fields: EventFields, intents: LocalResolutionMap): ClarificationIssue[] {
  return preparation?.issues.filter((issue) => !isIssueResolved(issue, fields, intents)) ?? [];
}

function isIssueResolved(issue: ClarificationIssue, fields: EventFields, intents: LocalResolutionMap): boolean {
  if (intents[issue.field]) return true;
  return issue.resolution !== null && sameClarificationValue(issue.field, fields[PROPOSAL_TO_EVENT_FIELD[issue.field]], issue.resolution.value);
}

function sameClarificationValue(field: ProposalField, current: string | number | null, confirmed: string | number): boolean {
  if (field === "capacity") return typeof current === "number" && typeof confirmed === "number" && current === confirmed;
  if (typeof current !== "string" || typeof confirmed !== "string") return false;
  const prepared = prepareEventAlternative(PROPOSAL_TO_EVENT_FIELD[field], current);
  return prepared.ok && typeof prepared.value === "string" && prepared.value === confirmed;
}

function isConfirmationReady(field: ProposalField, fieldsOrValue: EventFields | string | number | null): boolean {
  const value = typeof fieldsOrValue === "object" && fieldsOrValue !== null
    ? fieldsOrValue[PROPOSAL_TO_EVENT_FIELD[field]]
    : fieldsOrValue;
  if (field === "capacity" ? typeof value !== "number" : typeof value !== "string") return false;
  return prepareEventAlternative(PROPOSAL_TO_EVENT_FIELD[field], String(value)).ok;
}

function buildResolutionIntents(intents: LocalResolutionMap, fields: EventFields, preparation: EventPreparationResponse): ClarificationResolutionIntent[] {
  const currentIssues = new Set(preparation?.issues.map((issue) => issue.field) ?? []);
  return Object.entries(intents).flatMap(([rawField, intent]) => {
    if (!intent) return [];
    const field = rawField as ProposalField;
    if (!currentIssues.has(field)) return [];
    const value = fields[PROPOSAL_TO_EVENT_FIELD[field]];
    if (field === "capacity" ? typeof value !== "number" : typeof value !== "string") return [];
    const canonical = prepareEventAlternative(PROPOSAL_TO_EVENT_FIELD[field], String(value));
    if (!canonical.ok || (field === "capacity" ? typeof canonical.value !== "number" : typeof canonical.value !== "string")) return [];
    return [{ field, method: intent.method, value: canonical.value } as ClarificationResolutionIntent];
  });
}

function sameEvidence(left: { value: string; evidence: PageEvidence[] }, right: { value: string; evidence: PageEvidence[] }): boolean {
  return left.value === right.value && left.evidence.length === right.evidence.length &&
    left.evidence.every((item, index) => item.quote === right.evidence[index]?.quote && item.page === right.evidence[index]?.page);
}

function proposalFieldForEventField(field: keyof EventFields): ProposalField | undefined {
  return (Object.entries(PROPOSAL_TO_EVENT_FIELD) as Array<[ProposalField, keyof EventFields]>).find(([, eventField]) => eventField === field)?.[0];
}

function ProposalEvidence({ evidence, id }: { evidence: PageEvidence[]; id?: string }) {
  return <ul id={id} className="proposal-evidence" aria-label="Source evidence">{evidence.map((item, index) =>
    <li key={`${item.page}-${index}`}><q>{item.quote}</q> <span className="field-help">Page {item.page}</span></li>)}</ul>;
}
