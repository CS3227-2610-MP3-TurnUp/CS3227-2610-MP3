"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EVENT_LIMITS, FIELD_LABELS, sameEventFields, singaporeInput, singaporeInstant, type EventFields, type TextField } from "../../lib/event-fields";
import { EventContent, PublicFormContent } from "./event-content";

type Snapshot = import("../../lib/registration-form").PublicationContent;
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
  const feedback = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);
  const dirty = !!view && !!fields && !sameEventFields(fields, view.fields);

  async function load(signal?: AbortSignal, preferredMode?: Mode) {
    const response = await fetch(`/api/organiser/events/${id}`, { cache: "no-store", signal });
    const result = await response.json() as View & { error?: string };
    if (!response.ok) throw new Error(result.error || "Event unavailable.");
    if (!signal?.aborted) {
      setView(result); setFields(result.fields); setPreview(null); setApproved(false);
      setMode(result.state === "CANCELLED" ? "publication" : preferredMode ?? defaultMode(result));
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
    // Cover shared client-side navigation as well as tab closure without changing routes.
    const leave = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target && anchor.target !== "_self" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href);
      if (destination.href === window.location.href || destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (!window.confirm("Leave and discard unsaved edits?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", leave, true); };
  }, [dirty]);

  function showEditor() {
    setPreview(null); setApproved(false); setMode("editor"); setError(""); setFieldError(""); setNotice("");
    setTimeout(() => heading.current?.focus(), 0);
  }
  function cancelEditing() {
    if (!view) return;
    setFields(view.fields); setPreview(null); setApproved(false); setMode(defaultMode(view)); setError(""); setFieldError("");
    setNotice("Unsaved edits discarded. Saved draft and publication are unchanged.");
    setTimeout(() => heading.current?.focus(), 0);
  }
  function change(key: keyof EventFields, value: string | number | null) {
    setFields((old) => old ? { ...old, [key]: value } : null);
    setPreview(null); setApproved(false); setNotice("");
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
    try { await load(); setNotice("Saved values reloaded. Review before making further changes."); }
    catch { setError("Event unavailable. Your current input has been preserved."); }
    finally { inFlight.current = false; setPending(false); setTimeout(() => feedback.current?.focus(), 0); }
  }

  if (loading) return <p role="status">Loading event…</p>;
  if (!view || !fields) return <section className="card"><h1>Event unavailable</h1><p role="alert">{error}</p><Link href="/organiser">Back to your events</Link></section>;
  const cancelled = view.state === "CANCELLED";
  const published = view.published;
  const hasSavedChanges = !!published && !cancelled && !sameEventFields(view.fields, published.fields);
  const displayedFields = mode === "publication" && published ? published.fields : mode === "preview" && preview ? preview.snapshot.fields : fields;
  const describedBy = (key: string) => `${key in EVENT_LIMITS ? `help-${key}` : ""} ${fieldError === key ? "event-error" : ""}`.trim() || undefined;

  const renderTextField = (key: TextField) => <div className="field" key={key}>
          <label htmlFor={`event-${key}`}>{FIELD_LABELS[key]}{key !== "other" && " (required to publish)"}</label>
          {key === "title" ? <input id={`event-${key}`} value={fields[key]} aria-invalid={fieldError === key} aria-describedby={describedBy(key)} onChange={(e) => change(key, e.target.value)} /> :
            <textarea id={`event-${key}`} value={fields[key]} rows={key === "description" || key === "other" ? 5 : 3} aria-invalid={fieldError === key} aria-describedby={describedBy(key)} onChange={(e) => change(key, e.target.value)} />}
          <p id={`help-${key}`} className="field-help">{[...fields[key].normalize("NFC").trim()].length.toLocaleString()} / {EVENT_LIMITS[key].toLocaleString()} characters</p>
        </div>;

  return <>
    <Link href="/organiser">Back to your events</Link>
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
      <fieldset disabled={pending} className="event-fields">
        <section className="editor-section" aria-labelledby="event-basics"><h3 id="event-basics">Event details</h3>
          {(["title", "description", "location"] as TextField[]).map(renderTextField)}
        <div className="event-date-grid">{(["start", "end"] as const).map((key) => <div className="field" key={key}>
          <label htmlFor={`event-${key}`}>{key === "start" ? "Start" : "End"} (SGT; required to publish)</label>
          <input id={`event-${key}`} type="datetime-local" value={singaporeInput(fields[key])} aria-invalid={fieldError === key} aria-describedby={describedBy(key)} onChange={(e) => {
            try { change(key, singaporeInstant(e.target.value)); } catch { setFieldError(key); setError("Enter a complete valid Singapore date and time."); }
          }} />
        </div>)}</div>
        </section>
        <section className="editor-section" aria-labelledby="event-participation"><h3 id="event-participation">Participation</h3>
          {(["fee", "openTo", "preparation"] as TextField[]).map(renderTextField)}
        <div className="field"><label htmlFor="event-capacity">Capacity (required to publish)</label>
          <input id="event-capacity" type="number" min="1" max="10000" step="1" value={fields.capacity ?? ""} aria-invalid={fieldError === "capacity"} aria-describedby={describedBy("capacity")} onChange={(e) => change("capacity", e.target.value === "" ? null : Number(e.target.value))} />
        </div>
        </section>
        <section className="editor-section" aria-labelledby="event-extra"><h3 id="event-extra">Additional information</h3>
          {renderTextField("other")}
        </section>
      </fieldset>
      {dirty && <p className="notice">You have unsaved edits. Save before previewing.</p>}
      <div className="event-actions">
        <button className="primary" disabled={pending} type="submit">{pending ? "Working…" : "Save Draft"}</button>
        <button className="secondary" type="button" disabled={pending || (!dirty && !published)} onClick={cancelEditing}>Cancel Editing</button>
        <button className="secondary" type="button" disabled={pending || dirty} onClick={() => void action("preview")}>Preview saved draft</button>
      </div>
      {(!published || hasSavedChanges) && <div className="event-actions event-danger-actions"><p>Draft management</p>
        {!published && <button className="secondary event-danger" type="button" disabled={pending} onClick={() => void action("delete")}>Delete draft</button>}
        {hasSavedChanges && <button className="secondary event-danger" type="button" disabled={pending} onClick={() => void action("discard")}>Discard saved changes</button>}
      </div>}
    </form>}

    {mode === "preview" && preview && !cancelled && <section className="card event-preview" aria-label="Exact public preview">
      <h2>Public Preview</h2><EventContent fields={preview.snapshot.fields} /><PublicFormContent form={preview.snapshot.form} />
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
