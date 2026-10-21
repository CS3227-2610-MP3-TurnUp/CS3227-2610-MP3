import "server-only";
import { createHash } from "node:crypto";
import { AuthError } from "../auth/policy";
import { EMPTY_EVENT, EVENT_LIMITS, FIELD_LABELS, type EventFields, type TextField } from "../../lib/event-fields";

export class EventError extends AuthError {
  constructor(status: number, message: string, public field?: string) { super(status, message); }
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new EventError(400, "Send valid event fields.");
  return value as Record<string, unknown>;
}
export function exactKeys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new EventError(400, "The request contains unsupported fields.");
}
export function uuid(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new EventError(400, "Invalid event reference.");
  return value;
}
export function version(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new EventError(400, "Reload the event version.");
  return value as number;
}
export function parseFields(value: unknown): EventFields {
  const input = object(value);
  exactKeys(input, Object.keys(EMPTY_EVENT));
  const fields = { ...EMPTY_EVENT };
  let total = "";
  for (const key of Object.keys(EVENT_LIMITS) as TextField[]) {
    if (typeof input[key] !== "string") throw new EventError(400, `Enter ${FIELD_LABELS[key].toLowerCase()}.`, key);
    const text = (input[key] as string).normalize("NFC").trim().replaceAll("\r\n", "\n");
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text) || [...text].length > EVENT_LIMITS[key]) throw new EventError(400, `${FIELD_LABELS[key]} must be at most ${EVENT_LIMITS[key]} characters and contain no control characters.`, key);
    fields[key] = text; total += text;
  }
  if ([...total].length > 20000 || Buffer.byteLength(total, "utf8") > 48000) throw new EventError(400, "Public content exceeds the combined 20,000-character / 48,000-byte limit.");
  for (const key of ["start", "end"] as const) {
    const value = input[key];
    if (value !== "" && (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value)) throw new EventError(400, "Enter a valid date and time.", key);
    fields[key] = value as string;
  }
  if (input.capacity !== null && (!Number.isInteger(input.capacity) || (input.capacity as number) < 1 || (input.capacity as number) > 10000)) throw new EventError(400, "Capacity must be a whole number from 1 to 10,000.", "capacity");
  fields.capacity = input.capacity as number | null;
  return fields;
}
export function validatePublication(fields: EventFields, state: string, previousStart: string | undefined, now: Date) {
  for (const key of Object.keys(EVENT_LIMITS) as TextField[]) if (key !== "other" && !fields[key]) throw new EventError(400, `${FIELD_LABELS[key]} is required to publish.`, key);
  if (!fields.start || !fields.end) throw new EventError(400, "Start and end are required to publish.", !fields.start ? "start" : "end");
  if (fields.capacity === null) throw new EventError(400, "Capacity is required to publish.", "capacity");
  if (Date.parse(fields.end) <= Date.parse(fields.start)) throw new EventError(400, "End must be after start.", "end");
  if (state !== "PUBLISHED" && Date.parse(fields.start) <= now.getTime()) throw new EventError(400, "First publication and republication require a future start.", "start");
  if (state === "PUBLISHED" && fields.start !== previousStart && Date.parse(fields.start) <= now.getTime()) throw new EventError(400, "A changed start must be in the future.", "start");
}
export function publicationSnapshot(fields: EventFields, formRevisionId: string) {
  return { fields, form: { formRevisionId, questions: [] } };
}
// JSONB does not preserve object-key order. Arrays remain ordered public content.
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new EventError(400, "Invalid publication content.");
  return encoded;
}
export function digest(value: unknown): string { return createHash("sha256").update(canonicalJson(value)).digest("hex"); }
