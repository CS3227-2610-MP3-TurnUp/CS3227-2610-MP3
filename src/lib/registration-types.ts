import type { EventFields } from "./event-fields";

export type DiscoveryPeriod = "upcoming" | "past";
export type DiscoveryOptions = { search: string; period: DiscoveryPeriod };
/** Public event facts only. Null is unavailable, never an inferred empty roster. */
export type StudentEvent = {
  eventId: string;
  eventVersion: number;
  publicationId: string;
  publicationRevision: number;
  organiser: string;
  fields: EventFields;
  hasStarted: boolean;
  remainingPlaces: number | null;
  registrationStatus: "unavailable" | "none" | "ACTIVE" | "CANCELLED";
};

/** Count normalised code points consistently in browser search and server validation. */
export function discoverySearchError(search: string): string | undefined {
  const normalised = search.normalize("NFC").trim();
  return [...normalised].length > 150 || /[\u0000-\u001f\u007f]/u.test(normalised)
    ? "Use at most 150 characters without line breaks or control characters." : undefined;
}

export type RegistrationActionResult = { status: "committed" } | { status: "invalid"; issues: Record<string, string> } | { status: "conflict" | "unavailable" };

export type MyRegistration = { registrationId: string; eventId: string; state: "ACTIVE" | "CANCELLED"; eventState: "PUBLISHED" | "WITHDRAWN" | "CANCELLED";
  generation: number; version: number; current: EventFields | null; changes: string[]; canCancel: boolean; canCorrect: boolean; canRejoin: boolean };
export type RegistrationScreen = { eventId: string; registrationId: string | null; generation: number; version: number;
  organiser: string; eventTitle: string; form: import("./registration-form").RegistrationFormRevision; publicationId: string;
  canSubmit: boolean; submissionVersion: number; initial: { name: string | null; phone: string | null; answers: import("./registration-form").AnswerMap } };
