import { digest } from "../../src/server/events/policy";
import { EMPTY_EVENT, type EventFields } from "../../src/lib/event-fields";
export const eventId = "11111111-1111-4111-8111-111111111111";
export const publicationId = "22222222-2222-4222-8222-222222222222";
export function publicationFixture(overrides: Partial<EventFields> = {}) {
  const fields = { ...EMPTY_EVENT, title: "Approved garden event", description: "Public workshop description.", location: "Campus Garden", fee: "Free", openTo: "All Students", preparation: "Bring a water bottle.", other: "", start: "2099-11-01T02:00:00.000Z", end: "2099-11-01T04:00:00.000Z", capacity: 10, ...overrides };
  const snapshot = { fields, form: { formRevisionId: "33333333-3333-4333-8333-333333333333", questions: [] as unknown[] } };
  return { eventId, eventVersion: 2, organiser: "private-organiser-canary", publication: { id: publicationId, revision: 2, snapshot, digest: digest(snapshot) } };
}
