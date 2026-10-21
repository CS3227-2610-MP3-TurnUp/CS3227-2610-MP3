export const EVENT_LIMITS = { title: 150, description: 4000, location: 1000, fee: 500, openTo: 1000, preparation: 2000, other: 4000 } as const;
export type TextField = keyof typeof EVENT_LIMITS;
export type EventFields = Record<TextField, string> & { start: string; end: string; capacity: number | null };
export const EMPTY_EVENT: EventFields = { title: "", description: "", location: "", fee: "", openTo: "", preparation: "", other: "", start: "", end: "", capacity: null };
export const FIELD_LABELS: Record<TextField, string> = { title: "Title", description: "Purpose / description", location: "Location / participation instructions", fee: "Fee status", openTo: "Open to", preparation: "Prerequisites / preparation", other: "FAQ / Other (optional)" };
export type EventSummary = { id: string; state: string; version: number; fields: EventFields; editedAt: string; hasSavedChanges: boolean };

export function sameEventFields(left: EventFields, right: EventFields): boolean {
  return (Object.keys(EMPTY_EVENT) as (keyof EventFields)[]).every((key) => left[key] === right[key]);
}

export function singaporeInput(instant: string): string {
  return instant ? new Date(new Date(instant).getTime() + 8 * 3600000).toISOString().slice(0, 16) : "";
}
export function singaporeInstant(local: string): string {
  return local ? new Date(`${local}:00+08:00`).toISOString() : "";
}
export function displayTime(instant: string): string {
  return instant ? new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", dateStyle: "medium", timeStyle: "short" }).format(new Date(instant)) + " SGT" : "Not set";
}
