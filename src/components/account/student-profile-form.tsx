"use client";

import { useRef, useState, type FormEvent } from "react";

export type ProfileValues = { name: string | null; phone: string | null; profileVersion: number };
export function StudentProfileForm({ profile }: { profile: ProfileValues }) {
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [version, setVersion] = useState(profile.profileVersion);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<{ message: string; field?: string; stale?: boolean } | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  async function reload() {
    setPending(true);
    try {
      const response = await fetch("/api/student/profile", { cache: "no-store", credentials: "same-origin" });
      const value = await response.json() as ProfileValues;
      if (!response.ok) throw new Error();
      // Explicit reload preserves unsaved input; user reviews it against current values.
      setVersion(value.profileVersion); setError(null);
      setMessage(`Current saved name: ${value.name || "none"}. Current saved phone: ${value.phone || "none"}. Review your entries before saving.`);
    } catch { setError({ message: "Profile could not be reloaded. Try again." }); }
    finally { setPending(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return; setPending(true); setError(null); setMessage("");
    try {
      const response = await fetch("/api/student/profile", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, expectedProfileVersion: version }) });
      const value = await response.json() as ProfileValues & { changed?: boolean; error?: string; field?: string };
      if (!response.ok) { setError({ message: value.error || "Profile could not be saved.", field: value.field, stale: response.status === 409 }); requestAnimationFrame(() => errorRef.current?.focus()); return; }
      setVersion(value.profileVersion); setName(value.name ?? ""); setPhone(value.phone ?? ""); setMessage(value.changed ? "Profile saved." : "Profile unchanged.");
    } catch { setError({ message: "Profile is unavailable. Try again later." }); requestAnimationFrame(() => errorRef.current?.focus()); }
    finally { setPending(false); }
  }
  return <section className="card account-section" aria-labelledby="profile-title"><h2 id="profile-title">Student profile</h2>
    <p className="muted">Optional details for future forms. Leave a field blank to remove it. Earlier submissions stay unchanged.</p>
    <form onSubmit={submit} aria-busy={pending}>
      {error && <p id="profile-error" className="error-panel" ref={errorRef} tabIndex={-1} role="alert">{error.message}</p>}
      {message && <p role="status" className="account-status">{message}</p>}
      {error?.stale && <button className="account-text-button" type="button" onClick={reload} disabled={pending}>Reload saved values for review</button>}
      <div className="field"><label htmlFor="student-name">Name <span className="muted">(optional)</span></label>
        <input id="student-name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} disabled={pending}
          aria-invalid={error?.field === "name" || undefined} aria-describedby={error?.field === "name" ? "profile-error" : undefined} /></div>
      <div className="field"><label htmlFor="student-phone">Phone number <span className="muted">(optional)</span></label>
        <input id="student-phone" name="phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={pending}
          aria-invalid={error?.field === "phone" || undefined} aria-describedby={error?.field === "phone" ? "profile-error" : undefined} /></div>
      <button className="primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    </form></section>;
}
