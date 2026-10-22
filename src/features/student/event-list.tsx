"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { displayTime } from "../../lib/event-fields";
import { discoverySearchError, type DiscoveryPeriod, type StudentEvent } from "../../lib/registration-types";

export function StudentEventCard({ event }: { event: StudentEvent }) {
  return <Link className="card event-card student-event-card" href={`/student/events/${event.eventId}`}>
    <span className="event-state">{event.hasStarted ? "Started / past" : "Upcoming"}</span>
    <h2>{event.fields.title}</h2><p>{displayTime(event.fields.start)}</p>
    <p className="student-event-location">{event.fields.location}</p><p><strong>Fee:</strong> {event.fields.fee}</p>
    <p className="muted">By {event.organiser}</p>{event.remainingPlaces !== null && <p>{event.remainingPlaces} places remaining{event.registrationStatus === "ACTIVE" ? " · Registered" : ""}</p>}
  </Link>;
}
export function StudentEventList() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<DiscoveryPeriod>("upcoming");
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ key: string; events?: StudentEvent[]; error?: string; loginRequired?: boolean } | null>(null);
  const key = new URLSearchParams({ search, period }).toString();
  const searchError = discoverySearchError(search);
  useEffect(() => {
    if (searchError) return;
    const controller = new AbortController();
    fetch(`/api/student/events?${key}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) {
        if (!controller.signal.aborted) setResult({ key, loginRequired: response.status === 401, error: response.status === 401 ? "Log in again to browse events." :
          response.status === 409 ? "Published events changed. Refresh the list." : "Published events are unavailable. Try again later." });
        return;
      }
      const body = await response.json();
      if (!Array.isArray(body.events)) throw new Error("Invalid event response");
      if (!controller.signal.aborted) setResult({ key, events: body.events });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key, error: "Published events are unavailable. Try again later." });
    });
    return () => controller.abort();
  }, [key, reload, searchError]);
  const current = result?.key === key ? result : null;
  return <><div className="event-heading"><div><p className="eyebrow">Student events</p><h1>Discover events</h1>
    <p className="muted">Find a published event and see what’s happening on campus.</p></div></div>
    <section className="card student-discovery-filters" aria-label="Find published events">
      <div className="field"><label htmlFor="student-search">Search by title</label><input id="student-search" type="search" value={search} aria-invalid={searchError ? true : undefined} aria-describedby={searchError ? "student-search-error" : undefined} onChange={(e) => setSearch(e.target.value)} />
        {searchError && <p className="field-error" id="student-search-error">{searchError}</p>}</div>
      <div className="field"><label htmlFor="student-period">Show events</label><select id="student-period" value={period} onChange={(e) => setPeriod(e.target.value as DiscoveryPeriod)}>
        <option value="upcoming">Upcoming</option><option value="past">Started / past</option></select></div>
      <button className="secondary" onClick={() => { setResult(null); setReload((value) => value + 1); }}>Refresh list</button>
      <p className="field-help">Ordered by start time, earliest first. Times are shown in Singapore time.</p>
    </section>
    <section aria-label="Published event results" aria-busy={!searchError && !current}>
      {searchError ? <p role="status">Update your search to see events.</p> : !current ? <p role="status">Loading published events…</p> : current.error ? <div role="alert" className="error-panel">{current.error} {current.loginRequired && <Link href="/login">Go to login</Link>}</div> :
        !current.events?.length ? <div className="card empty-state"><h2>{search.trim() ? "No matching events" : period === "upcoming" ? "No upcoming events" : "No started or past events"}</h2>
          <p>{search.trim() ? "Try another title or change the event filter." : "Try the other event filter or check back later."}</p>{search && <button className="secondary" onClick={() => setSearch("")}>Clear search</button>}</div> :
          <><p className="muted" role="status">{current.events.length} {current.events.length === 1 ? "event" : "events"}</p>
            <div className="event-grid">{current.events.map((event) => <StudentEventCard key={event.eventId} event={event} />)}</div></>}
    </section></>;
}
