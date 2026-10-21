"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { EventSummary } from "../../lib/event-fields";
import { EventCard } from "./event-card";

export function EventDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [search, setSearch] = useState(""); const [sort, setSort] = useState("modified"); const [direction, setDirection] = useState("desc");
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [pending, setPending] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ search, sort, direction });
    fetch(`/api/organiser/events?${query}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Events are unavailable. Try again.");
      if (!controller.signal.aborted) setEvents(body.events);
    }).catch((error) => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Events are unavailable. Try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, sort, direction, retry]);
  async function create() {
    if (pending) return; setPending(true); setError("");
    try {
      const response = await fetch("/api/organiser/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The event could not be created.");
      router.push(`/organiser/events/${result.id}`);
    } catch { setError("The event could not be created. Refresh the list before trying again; your request may have completed."); setPending(false); }
  }
  return <><div className="event-heading"><div><p className="eyebrow">Organiser workspace</p><h1>Your events</h1><p className="muted">Prepare a private draft, preview it, then publish.</p></div>
    <button className="primary" disabled={pending} onClick={create}>{pending ? "Creating…" : "Create event"}</button></div>
    <section className="card event-filters" aria-label="Search and sort your events"><div className="field"><label htmlFor="event-search">Search by title</label><input id="event-search" maxLength={150} value={search} onChange={(e) => { setLoading(true); setError(""); setSearch(e.target.value); }} /></div>
      <div className="field"><label htmlFor="event-sort">Sort by</label><select id="event-sort" value={sort} onChange={(e) => { setLoading(true); setError(""); setSort(e.target.value); }}><option value="title">Title</option><option value="modified">Last edited</option><option value="start">Start time</option></select></div>
      <div className="field"><label htmlFor="event-direction">Direction</label><select id="event-direction" value={direction} onChange={(e) => { setLoading(true); setError(""); setDirection(e.target.value); }}><option value="asc">Ascending</option><option value="desc">Descending</option></select></div></section>
    {error && <div role="alert" className="error-panel">{error} <button className="secondary" onClick={() => { setLoading(true); setError(""); setRetry(retry + 1); }}>Refresh list</button></div>}
    {loading ? <p role="status">Loading your events…</p> : !error && !events.length ? <section className="card"><h2>{search ? "No matching events" : "No events yet"}</h2><p>{search ? "Try another title." : "Create an event to start your first private draft."}</p></section> :
      !error && <div className="event-grid">{events.map((event) => <EventCard event={event} key={event.id} />)}</div>}
  </>;
}
