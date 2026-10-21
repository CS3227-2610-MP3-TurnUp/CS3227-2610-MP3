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
  remainingPlaces: null;
  registrationStatus: "unavailable";
};

/** Count normalised code points consistently in browser search and server validation. */
export function discoverySearchError(search: string): string | undefined {
  const normalised = search.normalize("NFC").trim();
  return [...normalised].length > 150 || /[\u0000-\u001f\u007f]/u.test(normalised)
    ? "Use at most 150 characters without line breaks or control characters." : undefined;
}
