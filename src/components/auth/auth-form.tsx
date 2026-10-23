"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { authInputErrors, type AuthInputErrors } from "../../lib/auth-input";

export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthInputErrors>({});
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const signup = mode === "signup";
  const unavailable = "Account access is unavailable. Please try again.";

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setShowPassword(false);
    const password = passwordRef.current?.value ?? "";
    const invalid = authInputErrors(username, password);
    setFieldErrors(invalid);
    if (invalid.username || invalid.password) {
      requestAnimationFrame(() => (invalid.username ? usernameRef : passwordRef).current?.focus());
      return;
    }
    setPending(true);
    if (passwordRef.current) passwordRef.current.value = "";
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, ...(signup ? { role } : {}) }),
      });
      let data: { error?: unknown; redirect?: unknown };
      try { data = await response.json(); } catch { showError(unavailable); return; }
      if (!response.ok) {
        showError(typeof data.error === "string" && data.error ? data.error : unavailable);
        return;
      }
      if (data.redirect !== "/student" && data.redirect !== "/organiser") { showError(unavailable); return; }
      window.location.assign(data.redirect);
    } catch { showError(unavailable); } finally { setPending(false); }
  }

  return <main className="auth-shell">
    <Link className="brand" href="/">TurnUp</Link>
    <section className="auth-card" aria-labelledby="account-title">
      <h1 id="account-title" className="auth-title">{signup ? "Create your account" : "Log in"}</h1>
      <p className="auth-switch">{signup ? "Already have an account? " : "New to TurnUp? "}<Link href={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Create an account"}</Link></p>
      <form onSubmit={submit} aria-busy={pending} noValidate>
        {error && <div className="error-panel" role="alert" ref={errorRef} tabIndex={-1}>{error}</div>}
        {signup && <fieldset className="auth-role" disabled={pending}>
          <legend>Account role</legend>
          <div className="auth-role-options">
            <label className="auth-role-option">
              <input type="radio" name="role" value="STUDENT" checked={role === "STUDENT"} onChange={() => setRole("STUDENT")} required />
              <span>Student</span>
            </label>
            <label className="auth-role-option">
              <input type="radio" name="role" value="ORGANISER" checked={role === "ORGANISER"} onChange={() => setRole("ORGANISER")} required />
              <span>Organiser</span>
            </label>
          </div>
        </fieldset>}
        <div className="field">
          <label htmlFor="username">Username</label>
          <input id="username" ref={usernameRef} name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
            required value={username} onChange={(event) => setUsername(event.target.value)} disabled={pending}
            aria-invalid={!!fieldErrors.username || undefined} aria-describedby={fieldErrors.username ? "username-error" : undefined} />
          {fieldErrors.username && <p id="username-error" className="field-error">{fieldErrors.username}</p>}
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="auth-password-control">
            <input id="password" name="password" type={showPassword ? "text" : "password"} ref={passwordRef} autoComplete={signup ? "new-password" : "current-password"}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} required disabled={pending}
              aria-invalid={!!fieldErrors.password || undefined} aria-describedby={fieldErrors.password ? "password-error" : undefined} />
            <button className="auth-password-toggle" type="button" aria-controls="password" aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((visible) => !visible)} disabled={pending}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                {showPassword ? <>
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </> : <>
                  <path d="m3 3 18 18M10.6 5.1A12 12 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.1 3.9M6.2 6.2A19 19 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.8-1.8M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                </>}
              </svg>
            </button>
          </div>
          {fieldErrors.password && <p id="password-error" className="field-error">{fieldErrors.password}</p>}
        </div>
        <button className="primary" disabled={pending} type="submit">{pending ? "Please wait…" : signup ? "Create account" : "Log in"}</button>
        <span className="sr-only" role="status">{pending ? "Your account request is in progress." : ""}</span>
      </form>
    </section>
  </main>;
}
