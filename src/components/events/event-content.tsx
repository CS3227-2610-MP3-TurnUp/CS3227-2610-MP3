import { displayTime, FIELD_LABELS, type EventFields, type TextField } from "../../lib/event-fields";

/** Only allowlisted public fields render; arbitrary snapshot properties stay excluded. */
export function EventContent({ fields }: { fields: EventFields }) {
  return <article className="event-content"><h2>{fields.title || "Untitled event"}</h2>
    <dl><div><dt>Start</dt><dd>{displayTime(fields.start)}</dd></div><div><dt>End</dt><dd>{displayTime(fields.end)}</dd></div>
      <div><dt>Capacity</dt><dd>{fields.capacity ?? "Not set"}</dd></div>
      {(Object.keys(FIELD_LABELS) as TextField[]).filter((key) => key !== "title" && (key !== "other" || fields.other)).map((key) =>
        <div key={key}><dt>{FIELD_LABELS[key]}</dt><dd>{fields[key] || "Not set"}</dd></div>)}</dl></article>;
}

export function PublicFormContent({ form }: { form: import("../../lib/registration-form").RegistrationFormRevision }) {
  return <section className="event-content"><h3>Registration form</h3>{form.questions.length === 0 ? <p>No questions.</p> : <ol>{form.questions.map((question) => <li key={question.id}>
    <p><strong>{question.label}</strong> ({question.required ? "Required" : "Optional"})</p>{question.help && <p>{question.help}</p>}
    <p>{question.type === "short_text" ? "Short text, up to 250 characters" : question.type === "long_text" ? "Long text, up to 2,000 characters" : question.type === "single_choice" ? "Choose one" : "Choose any that apply"}</p>
    {"options" in question && <ul>{question.options.map((option) => <li key={option.id}>{option.label}</li>)}</ul>}
  </li>)}</ol>}</section>;
}
