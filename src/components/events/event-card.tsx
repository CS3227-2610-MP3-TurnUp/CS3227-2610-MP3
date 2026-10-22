import Link from "next/link";
import { displayTime, type EventSummary } from "../../lib/event-fields";

export function EventCard({ event }: { event: EventSummary }) {
  return <Link className="card event-card" href={`/organiser/events/${event.id}`}>
    <div className="event-badges"><span className="event-state" data-state={event.state}>{event.state.toLowerCase()}</span>
      {event.hasSavedChanges && <span className="event-changes">Saved changes</span>}</div>
    <h2>{event.fields.title || "Untitled draft"}</h2>
    <p>{displayTime(event.fields.start)}<br />{displayTime(event.fields.end)}</p>
    <p>{event.fields.location || "Location not set"}</p>
    <p className="muted event-excerpt">{[...event.fields.description].slice(0, 180).join("") || "Description not set"}</p>
  </Link>;
}
