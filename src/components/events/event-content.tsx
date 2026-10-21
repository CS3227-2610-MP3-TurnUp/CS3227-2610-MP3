import { displayTime, FIELD_LABELS, type EventFields, type TextField } from "../../lib/event-fields";

/** Only allowlisted public fields render; arbitrary snapshot properties stay excluded. */
export function EventContent({ fields }: { fields: EventFields }) {
  return <article className="event-content"><h2>{fields.title || "Untitled event"}</h2>
    <dl><div><dt>Start</dt><dd>{displayTime(fields.start)}</dd></div><div><dt>End</dt><dd>{displayTime(fields.end)}</dd></div>
      <div><dt>Capacity</dt><dd>{fields.capacity ?? "Not set"}</dd></div>
      {(Object.keys(FIELD_LABELS) as TextField[]).filter((key) => key !== "title" && (key !== "other" || fields.other)).map((key) =>
        <div key={key}><dt>{FIELD_LABELS[key]}</dt><dd>{fields[key] || "Not set"}</dd></div>)}</dl></article>;
}
