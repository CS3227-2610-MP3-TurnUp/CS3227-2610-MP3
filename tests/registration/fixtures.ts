import { EMPTY_EVENT } from "../../src/lib/event-fields";
import type { StudentEvent } from "../../src/lib/registration-types";
export const eventId = "8aa3c13d-d179-46bc-aec9-d24873953e32";
export const publicationId = "9aa3c13d-d179-46bc-aec9-d24873953e32";
export const publicFields = { ...EMPTY_EVENT, title: "Campus workshop", description: "Approved description", location: "Hall 1",
  fee: "Free", openTo: "Students", preparation: "None", other: "Bring your questions", capacity: 10,
  start: "2099-11-01T02:00:00.000Z", end: "2099-11-01T04:00:00.000Z" };
export const studentFixture: StudentEvent = { eventId, eventVersion: 2, publicationId, publicationRevision: 2, organiser: "campus_owner",
  fields: publicFields, hasStarted: false, remainingPlaces: null, registrationStatus: "unavailable" };

export const formTestId = (n: number) => `10000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
export const fourQuestionForm = { formRevisionId: formTestId(1), questions: [
  { id: formTestId(2), type: "short_text" as const, label: "Preferred workshop", required: true, help: "Use a short answer." },
  { id: formTestId(3), type: "long_text" as const, label: "Anything else?", required: false },
  { id: formTestId(4), type: "single_choice" as const, label: "Session", required: true, options: [{ id: formTestId(5), label: "Morning" }, { id: formTestId(6), label: "Afternoon" }] },
  { id: formTestId(7), type: "multiple_choice" as const, label: "Interests", required: false, options: [{ id: formTestId(8), label: "Design" }, { id: formTestId(9), label: "Code" }] },
] };
