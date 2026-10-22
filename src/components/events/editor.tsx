"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EVENT_LIMITS, FIELD_LABELS, sameEventFields, singaporeInput, singaporeInstant, type EventFields, type TextField } from "../../lib/event-fields";
import { formatEventAlternative, prepareEventAlternative, type ProposalFeedbackMap, type ProposalFieldFeedback } from "../../features/proposal-assistance/event-prefill";
import type { PageEvidence } from "../../features/proposal-assistance/types";
import { EventContent } from "./event-content";
import { ProposalAssistance } from "./proposal-assistance";

type Snapshot = { fields: EventFields; form: { formRevisionId: string; questions: unknown[] } };
type View = { id: string; version: number; state: string; fields: EventFields; published: Snapshot | null };
type Preview = { approvalId: string; version: number; snapshot: Snapshot; digest: string };
type Mode = "publication" | "editor" | "preview";
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
  const [editorEpoch, setEditorEpoch] = useState(0);
  const feedback = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);
  const editorRevision = useRef(0);
  const proposalFeedbackRevision = useRef(0);
  const dirty = !!view && !!fields && !sameEventFields(fields, view.fields);

  async function load(signal?: AbortSignal, preferredMode?: Mode) {
    const response = await fetch(`/api/organiser/events/${id}`, { cache: "no-store", signal });
    const result = await response.json() as View & { error?: string };
    if (!response.ok) throw new Error(result.error || "Event unavailable.");
    if (!signal?.aborted) {
      proposalFeedbackRevision.current += 1;
      setView(result); setFields(result.fields); setPreview(null); setApproved(false);
      setMode(result.state === "CANCELLED" ? "publication" : preferredMode ?? defaultMode(result));
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
    setFields(view.fields); setPreview(null); setApproved(false); setMode(defaultMode(view)); setError(""); setFieldError(""); setProposalFeedback({});
    setNotice("Unsaved edits discarded. Saved draft and publication are unchanged.");
    setTimeout(() => heading.current?.focus(), 0);
  }
  function change(key: keyof EventFields, value: string | number | null) {
    editorRevision.current += 1;
    proposalFeedbackRevision.current += 1;
    setFields((old) => old ? { ...old, [key]: value } : null);
    setProposalFeedback((old) => {
      if (!old[key]) return old;
      const next = { ...old };
      delete next[key];
      return next;
    });
    setPreview(null); setApproved(false); setNotice("");
  }
  function applyProposalPrefill(values: Partial<EventFields>, feedback: ProposalFeedbackMap) {
    if (inFlight.current || pending || !fields) return;
    proposalFeedbackRevision.current += 1;
    if (Object.keys(values).length > 0) {
      editorRevision.current += 1;
      setFields((old) => old ? { ...old, ...values } : null);
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
  function chooseProposalAlternative(field: keyof EventFields, alternative: { value: string; evidence: PageEvidence[] }, expectedRevision: number) {
    if (expectedRevision !== proposalFeedbackRevision.current || inFlight.current || pending || !fields) return;
    const currentFeedback = proposalFeedback[field];
    if (currentFeedback?.status !== "conflicting" || !currentFeedback.alternatives.some((candidate) =>
      candidate.value === alternative.value && candidate.evidence.length === alternative.evidence.length &&
      candidate.evidence.every((item, index) => item.quote === alternative.evidence[index]?.quote && item.page === alternative.evidence[index]?.page))) return;
    const converted = prepareEventAlternative(field, alternative.value);
    if (!converted.ok) return;
    change(field, converted.value);
    setProposalFeedback((old) => ({
      ...old,
      [field]: { status: "prefilled", generatedValue: converted.value, evidence: alternative.evidence },
    }));
    setNotice("The selected proposal value was added. Review it and its source evidence before saving.");
  }
  async function action(action: string) {
    if (inFlight.current || !view) return;
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
        ...(action === "save" ? { fields } : action === "publish" ? { approvalId: preview?.approvalId } : {}) }) });
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
    try { await load(); setProposalFeedback({}); setNotice("Saved values reloaded. Review before making further changes."); }
    catch { setError("Event unavailable. Your current input has been preserved."); }
    finally { inFlight.current = false; setPending(false); setTimeout(() => feedback.current?.focus(), 0); }
  }

  if (loading) return <p role="status">Loading event…</p>;
  if (!view || !fields) return <section className="card"><h1>Event unavailable</h1><p role="alert">{error}</p><Link href="/organiser">Back to your events</Link></section>;
  const cancelled = view.state === "CANCELLED";
  const published = view.published;
  const hasSavedChanges = !!published && !cancelled && !sameEventFields(view.fields, published.fields);
  const displayedFields = mode === "publication" && published ? published.fields : mode === "preview" && preview ? preview.snapshot.fields : fields;
  const renderedProposalFeedbackRevision = proposalFeedbackRevision.current;
  const describedBy = (key: string) => [
    key in EVENT_LIMITS ? `help-${key}` : "",
    fieldError === key ? "event-error" : "",
    proposalFeedback[key as keyof EventFields] ? `proposal-feedback-${key}` : "",
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
      <ProposalAssistance key={`${id}-${view.version}-${editorEpoch}`} eventId={id} eventVersion={view.version} eventBusy={pending}
        currentEditorRevision={() => editorRevision.current} onPrefill={applyProposalPrefill} onClearFeedback={clearProposalFeedback} />
      <fieldset disabled={pending} className="event-fields">
        {(Object.keys(EVENT_LIMITS) as TextField[]).map((key) => <div className="field" key={key}>
          <label htmlFor={`event-${key}`}>{FIELD_LABELS[key]}{key !== "other" && " (required to publish)"}</label>
          {key === "title" ? <input id={`event-${key}`} value={fields[key]} aria-invalid={fieldError === key} aria-describedby={describedBy(key)} onChange={(e) => change(key, e.target.value)} /> :
            <textarea id={`event-${key}`} value={fields[key]} rows={key === "description" || key === "other" ? 5 : 3} aria-invalid={fieldError === key} aria-describedby={describedBy(key)} onChange={(e) => change(key, e.target.value)} />}
          <p id={`help-${key}`} className="field-help">{[...fields[key].normalize("NFC").trim()].length.toLocaleString()} / {EVENT_LIMITS[key].toLocaleString()} characters</p>
          <ProposalFieldFeedback feedback={proposalFeedback[key]} currentValue={fields[key]} field={key}
            onChooseAlternative={(alternative) => chooseProposalAlternative(key, alternative, renderedProposalFeedbackRevision)} />
        </div>)}
        <div className="event-date-grid">{(["start", "end"] as const).map((key) => <div className="field" key={key}>
          <label htmlFor={`event-${key}`}>{key === "start" ? "Start" : "End"} (SGT; required to publish)</label>
          <input id={`event-${key}`} type="datetime-local" value={singaporeInput(fields[key])} aria-invalid={fieldError === key} aria-describedby={describedBy(key)} onChange={(e) => {
            try { change(key, singaporeInstant(e.target.value)); } catch { setFieldError(key); setError("Enter a complete valid Singapore date and time."); }
          }} />
          <ProposalFieldFeedback feedback={proposalFeedback[key]} currentValue={fields[key]} field={key}
            onChooseAlternative={(alternative) => chooseProposalAlternative(key, alternative, renderedProposalFeedbackRevision)} />
        </div>)}</div>
        <p className="field-help" role="note">When the source gives a complete date and time without a timezone, it is interpreted as Singapore Time (SGT). Review the converted value against the source evidence.</p>
        <div className="field"><label htmlFor="event-capacity">Capacity (required to publish)</label>
          <input id="event-capacity" type="number" min="1" max="10000" step="1" value={fields.capacity ?? ""} aria-invalid={fieldError === "capacity"} aria-describedby={describedBy("capacity")} onChange={(e) => change("capacity", e.target.value === "" ? null : Number(e.target.value))} />
          <ProposalFieldFeedback feedback={proposalFeedback.capacity} currentValue={fields.capacity} field="capacity"
            onChooseAlternative={(alternative) => chooseProposalAlternative("capacity", alternative, renderedProposalFeedbackRevision)} />
        </div>
      </fieldset>
      {dirty && <p className="notice">You have unsaved edits. Save before previewing.</p>}
      <div className="event-actions">
        <button className="primary" disabled={pending} type="submit">{pending ? "Working…" : "Save Draft"}</button>
        <button className="secondary" type="button" disabled={pending || (!dirty && !published)} onClick={cancelEditing}>Cancel Editing</button>
        <button className="secondary" type="button" disabled={pending || dirty} onClick={() => void action("preview")}>Preview saved draft</button>
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

function ProposalFieldFeedback({ feedback: fieldFeedback, currentValue, field, onChooseAlternative }: {
  feedback?: ProposalFieldFeedback;
  currentValue: string | number | null;
  field: keyof EventFields;
  onChooseAlternative: (alternative: { value: string; evidence: PageEvidence[] }) => void;
}) {
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
        onClick={() => onChooseAlternative(alternative)}>Use {formatEventAlternative(field, alternative.value)}</button>
      <ProposalEvidence evidence={alternative.evidence} id={`proposal-alternative-evidence-${field}-${index}`} />
    </li>)}</ul>
  </div>;
}

function ProposalEvidence({ evidence, id }: { evidence: PageEvidence[]; id?: string }) {
  return <ul id={id} className="proposal-evidence" aria-label="Source evidence">{evidence.map((item, index) =>
    <li key={`${item.page}-${index}`}><q>{item.quote}</q> <span className="field-help">Page {item.page}</span></li>)}</ul>;
}
