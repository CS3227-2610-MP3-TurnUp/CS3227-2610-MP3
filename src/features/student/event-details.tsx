"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { displayTime, FIELD_LABELS, type TextField } from "../../lib/event-fields";
import type { StudentEvent } from "../../lib/registration-types";

export function StudentEventContent({ event }: { event: StudentEvent }) {
  return <div className="student-event-details"><article className="card event-content"><p className="eyebrow">Published event</p>
    <h1>{event.fields.title}</h1><p className="muted">Organised by {event.organiser}</p>
    <dl><div><dt>Start</dt><dd>{displayTime(event.fields.start)}</dd></div><div><dt>End</dt><dd>{displayTime(event.fields.end)}</dd></div>
      {(Object.keys(FIELD_LABELS) as TextField[]).filter((key) => key !== "title" && (key !== "other" || event.fields.other)).map((key) =>
        <div key={key}><dt>{FIELD_LABELS[key]}</dt><dd>{event.fields[key]}</dd></div>)}</dl></article>
    <aside className="card student-registration-notice" aria-label="Registration"><h2>Registration</h2>
      {event.hasStarted && <p className="notice">This event has started. Registration is closed for its current schedule.</p>}
      <p>Event capacity: {event.fields.capacity}</p>
      {event.remainingPlaces === null ? <p className="muted">Remaining places and your registration status are unavailable.</p> : <>
      <p>{event.remainingPlaces} places remaining</p><p>{event.registrationStatus === "ACTIVE" ? "You are registered. Your place is confirmed." : event.registrationStatus === "CANCELLED" ? "You cancelled your registration." : "You are not registered."}</p>
        {!event.hasStarted && event.remainingPlaces > 0 && event.registrationStatus !== "ACTIVE" && <div className="student-registration-action"><Link className="primary action-link" href={`/student/events/${event.eventId}/register`}>{event.registrationStatus === "CANCELLED" ? "Continue to re-registration" : "Continue to registration"}</Link><p className="field-help">Review your details and confirm your registration on the next screen.</p></div>}</> }
    </aside></div>;
}
export function StudentEventDetails({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<{ event?: StudentEvent; error?: string } | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/student/events/${encodeURIComponent(eventId)}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) {
        if (!controller.signal.aborted) setResult({ error: response.status === 404 ? "This event is unavailable." : response.status === 401 ? "Log in again to view this event." :
          response.status === 409 ? "This event changed. Refresh to see current information." : "Event details are unavailable. Try again later." });
        return;
      }
      const body = await response.json();
      if (!body.event || typeof body.event !== "object") throw new Error("Invalid event response");
      if (!controller.signal.aborted) setResult({ event: body.event });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ error: "Event details are unavailable. Try again later." });
    });
    return () => controller.abort();
  }, [eventId, reload]);
  return <><div className="student-event-toolbar"><Link href="/student">Back to events</Link>
    <button className="secondary" onClick={() => { setResult(null); setReload((value) => value + 1); }}>Refresh event</button></div>
    {!result ? <p role="status">Loading event details…</p> : result.error ? <div role="alert" className="error-panel">{result.error} <Link href="/student">Browse published events</Link></div> :
      result.event && <StudentEventContent event={result.event} />}</>;
}
