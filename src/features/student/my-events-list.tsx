"use client";
import Link from "next/link";
import { displayTime, type EventFields } from "../../lib/event-fields";
import { RegistrationAction } from "./registration-action";
import type { RegistrationActionResult } from "../../lib/registration-types";
export type MyEventItem = { registrationId: string; eventId: string; state: "ACTIVE" | "CANCELLED"; eventState: "PUBLISHED" | "WITHDRAWN" | "CANCELLED";
  current: EventFields | null; changes: string[]; canCancel: boolean; canCorrect: boolean; canRejoin: boolean };
export function MyEventsList({ items, loading = false, error, onCancel, onCommitted }: { items: MyEventItem[]; loading?: boolean; error?: string;
  onCancel?: (registrationId: string) => Promise<RegistrationActionResult>; onCommitted?: () => void }) {
  if (loading) return <p role="status">Loading your registrations…</p>;
  if (error) return <p role="alert" className="error-panel">Your registrations are unavailable. Try again later.</p>;
  if (!items.length) return <section className="card"><h2>No registrations yet</h2><Link href="/student">Discover events</Link></section>;
  return <div className="student-my-events">{items.map((item) => {
    const visible = item.eventState === "PUBLISHED" ? item.current : null;
    return <article className="card" key={item.registrationId}><span className="event-state">{item.state === "ACTIVE" ? "Registered" : "Registration cancelled"}</span>
      {visible ? <><h2>{visible.title}</h2><p>{displayTime(visible.start)}</p>{item.changes.length > 0 && <p className="notice">Changed since you joined: {item.changes.join(", ")}.{item.state === "ACTIVE" && " Your place is preserved."}</p>}<Link href={`/student/events/${item.eventId}`}>View current event</Link></> :
        <><h2>Event unavailable</h2><p>{item.eventState === "WITHDRAWN" ? "The Organiser has withdrawn this event." : "The Organiser has cancelled this event."}</p><p className="muted">Registration reference: {item.registrationId}</p></>}
      <div className="event-actions">
        {item.canCancel && onCancel && <RegistrationAction label="Cancel registration" onAction={() => onCancel(item.registrationId)} onCommitted={onCommitted} />}
        {visible && item.canCorrect && <Link href={`/student/registrations/${item.registrationId}`}>Correct submission</Link>}
        {visible && item.canRejoin && <Link href={`/student/events/${item.eventId}/register`}>Register again</Link>}
      </div></article>;
  })}</div>;
}
