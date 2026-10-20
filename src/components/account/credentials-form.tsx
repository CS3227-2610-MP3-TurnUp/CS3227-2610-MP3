"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Action = "username" | "password";
type Feedback = { action: Action; error?: string; field?: string; status?: string; conflict?: boolean };

export function CredentialsForm({ username: initialUsername, credentialVersion }: { username: string; credentialVersion: number }) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [savedUsername, setSavedUsername] = useState(initialUsername);
  const [latestVersion, setLatestVersion] = useState(credentialVersion);
  const currentVersion = Math.max(credentialVersion, latestVersion);
  const currentSavedUsername = credentialVersion >= latestVersion ? initialUsername : savedUsername;
  const [pending, setPending] = useState<Action | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Action | null>(null);
  const usernameTrigger = useRef<HTMLButtonElement>(null);
  const passwordTrigger = useRef<HTMLButtonElement>(null);
  const usernameInput = useRef<HTMLInputElement>(null);
  const usernamePassword = useRef<HTMLInputElement>(null);
  const passwordPassword = useRef<HTMLInputElement>(null);
  const newPassword = useRef<HTMLInputElement>(null);
  const confirmPassword = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  function clearPasswords() {
    for (const ref of [usernamePassword, passwordPassword, newPassword, confirmPassword]) if (ref.current) ref.current.value = "";
    setVisible({});
  }

  function closeEditor(action: Action) {
    clearPasswords(); setUsername(currentSavedUsername); setEditing(null);
    requestAnimationFrame(() => (action === "username" ? usernameTrigger : passwordTrigger).current?.focus());
  }

  function openEditor(action: Action) {
    clearPasswords(); setUsername(currentSavedUsername); setFeedback(null); setEditing(action);
    requestAnimationFrame(() => (action === "username" ? usernameInput : passwordPassword).current?.focus());
  }

  function passwordField(action: Action, field: "currentPassword" | "newPassword" | "confirmPassword") {
    const id = `${action}-${field}`;
    const ref = field === "confirmPassword" ? confirmPassword : field === "newPassword" ? newPassword : action === "username" ? usernamePassword : passwordPassword;
    const label = field === "confirmPassword" ? "Confirm new password" : field === "newPassword" ? "New password" : "Current password";
    const invalid = feedback?.action === action && feedback.field === field && !!feedback.error;
    return <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-password-control">
        <input id={id} name={field} type={visible[id] ? "text" : "password"} ref={ref} required disabled={pending !== null}
          autoComplete={field === "currentPassword" ? "current-password" : "new-password"} spellCheck={false} autoCapitalize="none" autoCorrect="off"
          aria-invalid={invalid || undefined} aria-describedby={invalid ? `${action}-error` : undefined} />
        <button type="button" className="auth-password-toggle account-eye" aria-controls={id} aria-label={`${visible[id] ? "Hide" : "Show"} ${field === "currentPassword" ? `current password for ${action} change` : label.toLowerCase()}`}
          disabled={pending !== null} onClick={() => setVisible((value) => ({ ...value, [id]: !value[id] }))}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
            {!visible[id] && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
    </div>;
  }

  async function submit(event: FormEvent<HTMLFormElement>, action: Action) {
    event.preventDefault(); if (pending) return;
    const currentPassword = (action === "username" ? usernamePassword : passwordPassword).current?.value ?? "";
    const replacement = newPassword.current?.value ?? "";
    if (action === "password" && replacement.normalize("NFC") !== (confirmPassword.current?.value ?? "").normalize("NFC")) {
      setVisible({}); setFeedback({ action, field: "confirmPassword", error: "New passwords do not match." });
      requestAnimationFrame(() => errorRef.current?.focus()); return;
    }
    clearPasswords(); setPending(action); setFeedback(null);
    try {
      const response = await fetch("/api/account/credentials", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, currentPassword, expectedCredentialVersion: currentVersion,
          ...(action === "username" ? { username } : { newPassword: replacement }) }) });
      const result = await response.json() as { changed?: boolean; error?: string; field?: string; redirect?: string; username?: string; credentialVersion?: number };
      if (!response.ok) {
        setFeedback({ action, error: result.error || "Settings could not be saved.", field: result.field, conflict: response.status === 409 });
        requestAnimationFrame(() => errorRef.current?.focus()); return;
      }
      if (result.changed && result.redirect === "/login") { router.replace("/login"); router.refresh(); return; }
      if (action === "username" && result.changed && typeof result.username === "string" && typeof result.credentialVersion === "number") {
        setUsername(result.username); setSavedUsername(result.username); setLatestVersion(result.credentialVersion);
        setEditing(null); requestAnimationFrame(() => usernameTrigger.current?.focus());
        setFeedback({ action, status: "Username updated." }); router.refresh(); return;
      }
      closeEditor(action);
      setFeedback({ action, status: `${action === "username" ? "Username" : "Password"} unchanged.` });
    } catch { setFeedback({ action, error: "Settings are unavailable. Try again later." }); requestAnimationFrame(() => errorRef.current?.focus()); }
    finally { setPending(null); }
  }

  return <section className="card account-section" aria-labelledby="credentials-title">
    <h2 id="credentials-title">Account credentials</h2>
    {(["username", "password"] as const).map((action) => <div key={action} className="account-credential-row">
      <h3 id={`${action}-title`}>{action === "username" ? "Username" : "Password"}</h3>
      {editing !== action && <div className="account-credential-summary">
        {action === "username" ? <span className="account-username">{currentSavedUsername}</span> : <span aria-label="Password is set">••••••••</span>}
        <button ref={action === "username" ? usernameTrigger : passwordTrigger} type="button" className="secondary account-compact-action"
          aria-label={action === "username" ? "Edit username" : "Change password"}
          disabled={pending !== null} onClick={() => openEditor(action)}>{action === "username" ? "Edit" : "Change"}</button>
      </div>}
      {feedback?.action === action && <div>
        {feedback.error && <p id={`${action}-error`} className="error-panel" role="alert" tabIndex={-1} ref={errorRef}>{feedback.error}</p>}
        {feedback.status && <p role="status">{feedback.status}</p>}
        {feedback.conflict && <button type="button" className="account-text-button" onClick={() => { router.refresh(); setFeedback({ action, status: "Settings reloaded. Review your values before saving again." }); }}>Reload settings</button>}
      </div>}
      {editing === action && <form id={`${action}-editor`} className="account-credential-form" aria-labelledby={`${action}-title`} onSubmit={(event) => submit(event, action)} aria-busy={pending === action}>
      {action === "password" && <p className="muted account-password-notice">You’ll be logged out on all devices after changing your password.</p>}
      {action === "username" && <div className="field"><label htmlFor="replacement-username">New username</label>
        <input id="replacement-username" ref={usernameInput} name="username" value={username} onChange={(event) => setUsername(event.target.value)} required disabled={pending !== null}
          autoComplete="username" autoCapitalize="none" spellCheck={false} aria-invalid={feedback?.action === action && feedback.field === "username" || undefined}
          aria-describedby={feedback?.action === action && feedback.field === "username" ? "username-error" : undefined} /></div>}
      {passwordField(action, "currentPassword")}
      {action === "password" && passwordField(action, "newPassword")}
      {action === "password" && passwordField(action, "confirmPassword")}
      <div className="account-credential-actions">
        <button className="primary account-compact-action" disabled={pending !== null} type="submit">{pending === action ? "Saving…" : "Save"}</button>
        <button className="account-text-button" disabled={pending !== null} type="button" onClick={() => { setFeedback(null); closeEditor(action); }}>Cancel</button>
      </div>
      </form>}
    </div>)}
  </section>;
}
