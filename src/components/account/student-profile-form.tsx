"use client";

import { useRef, useState, type FormEvent } from "react";

export type ProfileValues = { name: string | null; phone: string | null; profileVersion: number };
type Field = "name" | "phone";
const labels = { name: "Name", phone: "Phone number" };
export function StudentProfileForm({ profile }: { profile: ProfileValues }) {
  const [saved, setSaved] = useState(profile);
  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<{ message: string; field?: string; stale?: boolean } | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameTrigger = useRef<HTMLButtonElement>(null);
  const phoneTrigger = useRef<HTMLButtonElement>(null);
  const [feedbackField, setFeedbackField] = useState<Field | null>(null);
  function closeEditor(field: Field) {
    setDraft(""); setEditing(null);
    requestAnimationFrame(() => (field === "name" ? nameTrigger : phoneTrigger).current?.focus());
  }
  function openEditor(field: Field) {
    setDraft(saved[field] ?? ""); setError(null); setMessage(""); setFeedbackField(null); setEditing(field);
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  async function reload() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/student/profile", { cache: "no-store", credentials: "same-origin" });
      const value = await response.json() as ProfileValues;
      if (!response.ok) throw new Error();
      // Preserve the active draft, but refresh the other field and concurrency version.
      setSaved(value); setError(null);
      setMessage("Saved profile reloaded. Review your edit before saving again.");
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch { setError({ message: "Profile could not be reloaded. Try again.", stale: true }); requestAnimationFrame(() => errorRef.current?.focus()); }
    finally { setPending(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>, field: Field) {
    event.preventDefault(); if (pending) return; setPending(true); setError(null); setMessage(""); setFeedbackField(field);
    try {
      const response = await fetch("/api/student/profile", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saved.name, phone: saved.phone, [field]: draft, expectedProfileVersion: saved.profileVersion }) });
      const value = await response.json() as ProfileValues & { changed?: boolean; error?: string; field?: string };
      if (!response.ok) { setError({ message: value.error || "Profile could not be saved.", field: value.field, stale: response.status === 409 }); requestAnimationFrame(() => errorRef.current?.focus()); return; }
      setSaved(value); closeEditor(field); setMessage(`${labels[field]} ${value.changed ? "updated" : "unchanged"}.`);
    } catch { setError({ message: "Profile is unavailable. Try again later." }); requestAnimationFrame(() => errorRef.current?.focus()); }
    finally { setPending(false); }
  }
  return <section className="card account-section" aria-labelledby="profile-title"><h2 id="profile-title">Student profile</h2>
    {(["name", "phone"] as const).map((field) => <div key={field} className="account-credential-row">
      <h3 id={`profile-${field}-title`}>{labels[field]} <span className="muted">(optional)</span></h3>
      {editing !== field && <div className="account-credential-summary">
        <span className={`account-username${saved[field] ? "" : " muted"}`}>{saved[field] || "Not set"}</span>
        <button ref={field === "name" ? nameTrigger : phoneTrigger} type="button" className="secondary account-compact-action"
          aria-label={`Edit ${labels[field].toLowerCase()}`} disabled={pending} onClick={() => openEditor(field)}>Edit</button>
      </div>}
      {feedbackField === field && <div>
        {error && <p id="profile-error" className="error-panel" ref={errorRef} tabIndex={-1} role="alert">{error.message}</p>}
        {message && <p role="status" className="success-panel account-status">{message}</p>}
        {error?.stale && <button className="account-text-button" type="button" onClick={reload} disabled={pending}>Reload saved values for review</button>}
      </div>}
      {editing === field && <form className="account-credential-form" aria-labelledby={`profile-${field}-title`} onSubmit={(event) => submit(event, field)} aria-busy={pending}>
        <div className="field"><label htmlFor={`student-${field}`}>{labels[field]} <span className="muted">(optional)</span></label>
          <input id={`student-${field}`} ref={inputRef} name={field} type={field === "phone" ? "tel" : "text"} autoComplete={field === "phone" ? "tel" : "name"}
            value={draft} onChange={(event) => setDraft(event.target.value)} disabled={pending}
            aria-invalid={error?.field === field || undefined} aria-describedby={`profile-${field}-help${error ? " profile-error" : ""}`} />
          <p id={`profile-${field}-help`} className="field-help">Leave blank to remove.</p>
        </div>
        <div className="account-credential-actions">
          <button className="primary account-compact-action" type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          <button className="account-text-button" type="button" disabled={pending} onClick={() => { setError(null); setMessage(""); setFeedbackField(null); closeEditor(field); }}>Cancel</button>
        </div>
      </form>}
    </div>)}
    </section>;
}
