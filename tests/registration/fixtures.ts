import { EMPTY_EVENT } from "../../src/lib/event-fields";
import type { StudentEvent } from "../../src/lib/registration-types";
export const eventId = "8aa3c13d-d179-46bc-aec9-d24873953e32";
export const publicationId = "9aa3c13d-d179-46bc-aec9-d24873953e32";
export const publicFields = { ...EMPTY_EVENT, title: "Campus workshop", description: "Approved description", location: "Hall 1",
  fee: "Free", openTo: "Students", preparation: "None", other: "Bring your questions", capacity: 10,
  start: "2099-11-01T02:00:00.000Z", end: "2099-11-01T04:00:00.000Z" };
export const studentFixture: StudentEvent = { eventId, eventVersion: 2, publicationId, publicationRevision: 2, organiser: "campus_owner",
  fields: publicFields, hasStarted: false, remainingPlaces: null, registrationStatus: "unavailable" };
