"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FormValidationError, sameFormContent, validateAnswers, type AnswerMap, type RegistrationFormRevision } from "../../lib/registration-form";
import type { RegistrationActionResult } from "../../lib/registration-types";

export type SubmissionDraft = { name: string; phone: string; answers: AnswerMap; sharingConfirmed: true };
type Props = { form: RegistrationFormRevision; mode?: "join" | "correction";
  initial?: { name: string | null; phone: string | null; answers?: AnswerMap }; onSubmit: (draft: SubmissionDraft) => Promise<RegistrationActionResult> };
export function RegistrationSuccess({ mode = "join" }: { mode?: "join" | "correction" }) {
  const summary = useRef<HTMLElement>(null);
  useEffect(() => { summary.current?.focus(); }, []);
  return <section className="success-panel registration-success" ref={summary} tabIndex={-1} aria-labelledby="registration-result-title">
    <h2 id="registration-result-title">{mode === "join" ? "Registration saved" : "Submission saved"}</h2>
    <p role="status">{mode === "join" ? "Check My Events for your current registration status." : "Your corrected event submission has been saved."}</p>
    <Link className="primary action-link" href="/student/my-events">View My Events</Link>
  </section>;
}
/** Event-specific state only. The caller binds versions/identity and commits; this component never writes the profile. */
export function StudentRegistrationForm({ form: incomingForm, mode = "join", initial, onSubmit }: Props) {
  const [form] = useState(() => structuredClone(incomingForm));
  const stale = incomingForm.formRevisionId !== form.formRevisionId || !sameFormContent(incomingForm, form);
  const [name, setName] = useState(initial?.name ?? ""), [phone, setPhone] = useState(initial?.phone ?? "");
  const [answers, setAnswers] = useState<AnswerMap>(initial?.answers ?? {}), [confirmed, setConfirmed] = useState(false);
  const [issues, setIssues] = useState<Record<string, string>>({}), [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false), [completed, setCompleted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null), lock = useRef(false);
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    if (pending || !pendingFocus.current) return;
    formRef.current?.querySelector<HTMLElement>(`[data-field="${pendingFocus.current}"]`)?.focus();
    pendingFocus.current = null;
  }, [issues, pending]);
  function errors(next: Record<string, string>) {
    const allowed = new Set(["name", "phone", "sharingConfirmed", ...form.questions.map((question) => question.id)]);
    const visible = Object.fromEntries(Object.entries(next).filter(([key]) => allowed.has(key)));
    setIssues(visible); setNotice(Object.keys(visible).length ? "Review the highlighted fields." : "This form changed. Review the current registration before trying again.");
    const first = Object.keys(visible)[0];
    pendingFocus.current = first ?? null;
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (lock.current || completed || stale) return;
    let validated: AnswerMap;
    try { validated = validateAnswers(form, answers); }
    catch (error) { if (error instanceof FormValidationError) { errors(error.issues); return; } throw error; }
    const contactIssues: Record<string, string> = {};
    if (!name.trim()) contactIssues.name = "Enter your name.";
    if (!phone.trim()) contactIssues.phone = "Enter a phone number or Telegram handle.";
    if (!confirmed) contactIssues.sharingConfirmed = "Confirm sharing these details with the organizer.";
    if (Object.keys(contactIssues).length) { errors(contactIssues); return; }
    lock.current = true; setPending(true); setNotice(""); setIssues({});
    try {
      const result = await onSubmit({ name, phone, answers: validated, sharingConfirmed: true });
      if (result.status === "committed") { setCompleted(true); setNotice(mode === "join" ? "Registration saved. Check My Events for your current status." : "Submission saved."); }
      else if (result.status === "invalid") errors(result.issues);
      else setNotice(result.status === "conflict" ? "This registration changed or is no longer available. Your entries are kept; review current information before retrying." : "Registration is unavailable. Your entries are kept. Try again later.");
    } catch { setNotice("Registration is unavailable. Your entries are kept. Try again later."); }
    finally { lock.current = false; setPending(false); }
  }
  function description(id: string, help?: string) { return [help ? `${id}-help` : "", issues[id] ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined; }
  if (completed) return <RegistrationSuccess mode={mode} />;
  return <form ref={formRef} className="student-registration-form" noValidate onSubmit={submit}>
    {stale && <p role="alert" className="error-panel">The published form changed. Your entries remain on the captured form; explicitly reload and review the current form before submitting.</p>}
    <fieldset disabled={pending || completed || stale} className="student-form-fields"><legend>Contact details</legend>
      <p className="field-help">Shared with the organizer for this event only.</p>
      <div className="field"><label htmlFor="registration-name">Name</label><input id="registration-name" data-field="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!issues.name} aria-describedby={issues.name ? "name-error" : undefined} />
        {issues.name && <p className="field-error" id="name-error">{issues.name}</p>}</div>
      <div className="field"><label htmlFor="registration-phone">Phone number or Telegram handle</label><input id="registration-phone" data-field="phone" type="text" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!issues.phone} aria-describedby={issues.phone ? "phone-error" : undefined} />
        {issues.phone && <p className="field-error" id="phone-error">{issues.phone}</p>}</div>
      {form.questions.map((question, index) => <div className="field" key={question.id}>
        {"options" in question ? <p className="student-question-label">{index + 1}. {question.label} ({question.required ? "required" : "optional"})</p> :
          <label htmlFor={`answer-${question.id}`}>{index + 1}. {question.label} ({question.required ? "required" : "optional"})</label>}
        {question.help && <p className="field-help" id={`${question.id}-help`}>{question.help}</p>}
        {(question.type === "short_text" || question.type === "long_text") ? question.type === "long_text" ?
          <textarea id={`answer-${question.id}`} data-field={question.id} rows={4} value={(answers[question.id] as string) ?? ""} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} aria-required={question.required} aria-invalid={!!issues[question.id]} aria-describedby={description(question.id, question.help)} /> :
          <input id={`answer-${question.id}`} data-field={question.id} value={(answers[question.id] as string) ?? ""} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} aria-required={question.required} aria-invalid={!!issues[question.id]} aria-describedby={description(question.id, question.help)} /> :
          <fieldset className="student-choice-group" id={`answer-${question.id}`} data-field={question.id} tabIndex={-1} aria-describedby={description(question.id, question.help)} aria-invalid={!!issues[question.id]}>
            <legend className="sr-only">{question.label} ({question.required ? "required" : "optional"})</legend>
            {question.options.map((option) => <label className="student-choice" key={option.id}><input type={question.type === "single_choice" ? "radio" : "checkbox"} name={question.id} value={option.id}
              checked={question.type === "single_choice" ? answers[question.id] === option.id : Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(option.id)}
              onChange={(e) => setAnswers({ ...answers, [question.id]: question.type === "single_choice" ? option.id : e.target.checked ? [...((answers[question.id] as string[]) ?? []), option.id] : ((answers[question.id] as string[]) ?? []).filter((id) => id !== option.id) })} />{option.label}</label>)}
            {question.type === "single_choice" && !question.required && <button className="secondary" type="button" onClick={() => setAnswers({ ...answers, [question.id]: "" })}>Clear choice</button>}
          </fieldset>}
        {issues[question.id] && <p className="field-error" id={`${question.id}-error`}>{issues[question.id]}</p>}
      </div>)}
      <label className="student-choice"><input type="checkbox" data-field="sharingConfirmed" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} aria-invalid={!!issues.sharingConfirmed} aria-describedby={issues.sharingConfirmed ? "sharingConfirmed-error" : undefined} />I confirm sharing my details and answers with the organizer.</label>
      {issues.sharingConfirmed && <p className="field-error" id="sharingConfirmed-error">{issues.sharingConfirmed}</p>}
      <button className="primary" type="submit">{pending ? "Submitting…" : mode === "join" ? "Confirm and register" : "Save corrected submission"}</button>
    </fieldset>
    {notice && <p className="error-panel" role="alert">{notice}</p>}
  </form>;
}
