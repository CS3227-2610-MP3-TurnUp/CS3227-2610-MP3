"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { StudentRegistrationForm, type SubmissionDraft } from "./registration-form";
import type { RegistrationScreen, RegistrationActionResult, MyRegistration } from "../../lib/registration-types";
import { MyEventsList } from "./my-events-list";

async function send(url: string, body: unknown): Promise<RegistrationActionResult> {
  try {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    const result = await response.json();
    if (response.ok && result.registration?.registrationId) return { status: "committed" };
    if (response.status === 400 && result.issues) return { status: "invalid", issues: result.issues };
    return { status: response.status === 409 || response.status === 404 ? "conflict" : "unavailable" };
  } catch { return { status: "unavailable" }; }
}
/** Keep the same key for a lost-response retry of the same payload; changing values creates a new operation. */
function useOperation() {
  const current = useRef<{ signature: string; key: string } | null>(null);
  return (body: object) => {
    const signature = JSON.stringify(body);
    if (current.current?.signature !== signature) current.current = { signature, key: crypto.randomUUID() };
    return { ...body, idempotencyKey: current.current!.key };
  };
}
export function StudentRegistrationScreen({ reference, correction = false }: { reference: string; correction?: boolean }) {
  const [result, setResult] = useState<{ screen?: RegistrationScreen; error?: string } | null>(null);
  const url = correction ? `/api/student/registrations/${reference}` : `/api/student/events/${reference}/registrations`;
  const operation = useOperation();
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const body = await response.json();
      if (!controller.signal.aborted) setResult(response.ok && body.screen ? { screen: body.screen } : { error: "Registration unavailable. Return to the event and review its current status." });
    }).catch(() => { if (!controller.signal.aborted) setResult({ error: "Registration unavailable. Try again later." }); });
    return () => controller.abort();
  }, [url]);
  async function submit(draft: SubmissionDraft) {
    const screen = result?.screen;
    if (!screen) return { status: "unavailable" } as const;
    return send(url, operation(correction ? { ...draft, registrationId: screen.registrationId, expectedGeneration: screen.generation,
      expectedVersion: screen.version, expectedSubmissionVersion: screen.submissionVersion } :
      { ...draft, expectedPublicationId: screen.publicationId, expectedFormRevisionId: screen.form.formRevisionId }));
  }
  return <><nav className="student-event-toolbar" aria-label="Back navigation"><Link href={correction ? "/student/my-events" : `/student/events/${reference}`}>{correction ? "Back to My Events" : "Back to event"}</Link></nav>
    <section className="card student-submission-editor"><h1>{correction ? "Correct your submission" : "Register for this event"}</h1>
      {!result ? <p role="status">Loading registration…</p> : result.error ? <p role="alert" className="error-panel">{result.error}</p> : result.screen && <>
        <h2>{result.screen.eventTitle}</h2>{correction && <p className="field-help">Update this event submission only.</p>}
        {result.screen.canSubmit ? <StudentRegistrationForm key={result.screen.form.formRevisionId} form={result.screen.form}
          mode={correction ? "correction" : "join"} initial={result.screen.initial} onSubmit={submit} /> : <div className="notice"><p role="status">Registration is closed, full, or you already hold a place. Check My Events for your status.</p><Link href="/student/my-events">View My Events</Link></div>}
      </>}
    </section></>;
}
export function StudentMyEvents() {
  const [items, setItems] = useState<MyRegistration[] | null>(null), [error, setError] = useState(false), [reload, setReload] = useState(0);
  // A distinct retry key per captured version, retained for uncertain responses.
  const operations = useRef(new Map<string, string>());
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/student/registrations", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const body = await response.json();
      if (!controller.signal.aborted) { if (response.ok && Array.isArray(body.registrations)) setItems(body.registrations); else setError(true); }
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [reload]);
  async function cancel(id: string): Promise<RegistrationActionResult> {
    const item = items?.find((entry) => entry.registrationId === id);
    if (!item) return { status: "conflict" };
    const identity = `${id}:${item.generation}:${item.version}`;
    if (!operations.current.has(identity)) operations.current.set(identity, crypto.randomUUID());
    return send(`/api/student/registrations/${id}/cancel`, { registrationId: id, expectedGeneration: item.generation, expectedVersion: item.version, idempotencyKey: operations.current.get(identity) });
  }
  function refresh() { setItems(null); setError(false); setReload((value) => value + 1); }
  return <><div className="event-heading"><div><p className="eyebrow">Your registrations</p><h1>My Events</h1><p className="muted">Review your places, update submissions and check event changes.</p></div><button className="secondary" onClick={refresh}>Refresh My Events</button></div>
    <MyEventsList items={items ?? []} loading={!items && !error} error={error ? "unavailable" : undefined} onCancel={cancel} onCommitted={refresh} /></>;
}
