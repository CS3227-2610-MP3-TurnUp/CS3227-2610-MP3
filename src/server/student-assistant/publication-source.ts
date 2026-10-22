import "server-only";
import { digest, parseFields, validatePublication, uuid } from "../events/policy";
import { sameEventFields, displayTime } from "../../lib/event-fields";
import { parseRegistrationForm, assertPublicFormBudget } from "../../lib/registration-form";
import { ASSISTANT_LIMITS, validateSource } from "../../features/student-assistant/evidence";
import type { PublicSourceSnapshot } from "../../features/student-assistant/types";
export type PublicationFailureCode = "invalid_request" | "login_required" | "student_required" | "event_unavailable" | "source_changed" | "source_too_large" | "timing_policy_pending" | "source_unavailable" | "invalid_answer";
export class PublicationSourceError extends Error {
  constructor(public readonly status: number, public readonly code: PublicationFailureCode) { super(code); }
}
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function exact(value: Record<string, unknown>, keys: string[]) { return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)); }
export interface PublicationBinding { readonly eventId: string; readonly revision: string }
export interface PublicationSource { readonly binding: PublicationBinding; readonly source: PublicSourceSnapshot }
export function projectPublication(value: unknown, eventId: string, now = Date.now()): PublicationSource {
  try {
    if (!object(value) || value.eventId !== eventId || !object(value.publication)) throw new Error();
    uuid(eventId); const publication = value.publication, id = uuid(publication.id);
    if (!Number.isSafeInteger(publication.revision) || (publication.revision as number) < 1 || typeof publication.digest !== "string" || !/^[a-f0-9]{64}$/.test(publication.digest)) throw new Error();
    const snapshot = publication.snapshot;
    if (!object(snapshot) || !exact(snapshot, ["fields", "form"])) throw new Error();
    const form = parseRegistrationForm(snapshot.form);
    if (digest(form) !== digest(snapshot.form)) throw new Error();
    const fields = parseFields(snapshot.fields);
    if (!object(snapshot.fields) || !sameEventFields(fields, snapshot.fields as typeof fields) || digest(snapshot) !== publication.digest) throw new Error();
    assertPublicFormBudget(fields, form);
    validatePublication(fields, "PUBLISHED", fields.start, new Date(now));
    if (Date.parse(fields.start) <= now) throw new PublicationSourceError(409, "timing_policy_pending");
    const revision = `${id}:${publication.revision}:${publication.digest}`;
    const sections = [
      { id: "title", label: "Event title", text: fields.title },
      { id: "description", label: "Purpose / description", text: fields.description },
      { id: "schedule", label: "Schedule (Singapore time)", text: `Start (Singapore time): ${displayTime(fields.start)}\nEnd (Singapore time): ${displayTime(fields.end)}\nStart (UTC): ${fields.start}\nEnd (UTC): ${fields.end}` },
      { id: "location", label: "Location / participation instructions", text: fields.location },
      { id: "fee", label: "Fee status", text: fields.fee },
      { id: "openTo", label: "Open to", text: fields.openTo },
      { id: "preparation", label: "Prerequisites / preparation", text: fields.preparation },
      ...(fields.other ? [{ id: "other", label: "FAQ / Other", text: fields.other }] : []),
      { id: "capacity", label: "Published capacity (not remaining places)", text: `Published capacity: ${fields.capacity}` },
      ...form.questions.map((question, index) => ({ id: `form-${question.id}`, label: `Registration question ${index + 1}`,
        text: [`Question: ${question.label}`, `Type: ${question.type}`, `Required: ${question.required ? "Yes" : "No"}`,
          ...(question.help ? [`Help: ${question.help}`] : []),
          ...("options" in question ? question.options.map((option) => `Option: ${option.label}`) : [])].join("\n") })),
    ];
    const projection = { eventId, revision, title: fields.title, sections };
    if (Buffer.byteLength(JSON.stringify(projection), "utf8") > ASSISTANT_LIMITS.sourceBytes) throw new PublicationSourceError(413, "source_too_large");
    const checked = validateSource(projection); if (!checked.ok) throw new Error();
    return Object.freeze({ source: checked.source, binding: Object.freeze({ eventId, revision }) });
  } catch (error) { if (error instanceof PublicationSourceError) throw error; throw new PublicationSourceError(503, "source_unavailable"); }
}
