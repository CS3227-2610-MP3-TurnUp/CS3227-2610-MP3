import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { StudentEventCard, StudentEventList } from "../../src/features/student/event-list";
import { StudentEventContent } from "../../src/features/student/event-details";
import { studentFixture, fourQuestionForm, publicFields } from "./fixtures";
import { StudentRegistrationForm } from "../../src/features/student/registration-form";
import { SubmissionEditor } from "../../src/features/student/submission-editor";
import { MyEventsList } from "../../src/features/student/my-events-list";
it("renders one semantic details link using approved fields and Singapore time", () => {
  const html = renderToStaticMarkup(createElement(StudentEventCard, { event: studentFixture }));
  expect(html.match(/<a\b/g)).toHaveLength(1); expect(html).toContain(`/student/events/${studentFixture.eventId}`);
  expect(html).toContain("Campus workshop"); expect(html).toContain("SGT"); expect(html).toContain("campus_owner");
  expect(html).not.toMatch(/View event details|Not registered|10 places left|Attend|Saved changes/);
});
it("uses a clear next-step action instead of claiming that opening registration signs the Student up", () => {
  const html = renderToStaticMarkup(createElement(StudentEventContent, { event: { ...studentFixture, hasStarted: false, remainingPlaces: 1, registrationStatus: "none" } }));
  expect(html).toContain("Continue to registration"); expect(html).toContain("confirm your registration on the next screen");
  expect(html).toContain(`/student/events/${studentFixture.eventId}/register`); expect(html).not.toContain(">Register<");
});
it("keeps all required facts and optional FAQ, with unavailable rather than guessed participation state", () => {
  const html = renderToStaticMarkup(createElement(StudentEventContent, { event: { ...studentFixture, hasStarted: true } }));
  for (const text of ["Purpose / description", "Open to", "Fee status", "Prerequisites / preparation", "Bring your questions", "Registration is closed", "Remaining places and your registration status are unavailable."]) expect(html).toContain(text);
  expect(html).not.toMatch(/<button|type="submit"|type="checkbox"/);
});
it("renders hostile titles/labels/answers as inert text with no application effects", () => {
  const event = { ...studentFixture, organiser: '<script>forged()</script>', fields: { ...studentFixture.fields, title: '<img src=x onerror=forged()>', other: '<script>publishAsOwner()</script>' } };
  const html = renderToStaticMarkup(createElement(StudentEventContent, { event }));
  expect(html).toContain("&lt;script&gt;publishAsOwner()"); expect(html).toContain("&lt;img");
  expect(html).not.toContain("<script>"); expect(html).not.toContain("<img");
});
it("starts with labelled search, explicit upcoming/past options and honest loading feedback", () => {
  const html = renderToStaticMarkup(createElement(StudentEventList));
  expect(html).toContain('for="student-search"'); expect(html).toContain('value="past"'); expect(html).toContain('value="upcoming" selected');
  expect(html).toContain("Loading published events"); expect(html).not.toContain("No upcoming events");
});

it("renders all four question types, required contact details and explicit organizer confirmation", () => {
  const html = renderToStaticMarkup(createElement(StudentRegistrationForm, { form: fourQuestionForm, onSubmit: async () => ({ status: "committed" as const }) }));
  for (const text of ['type="radio"', 'type="checkbox"', '<textarea', '>Name<', 'Phone number or Telegram handle', 'with the organizer', 'Confirm and register']) expect(html).toContain(text);
  expect(html).toContain('id="registration-name"'); expect(html).toContain('required=""');
  expect(html).not.toContain('checked=""'); expect(html).not.toContain("Your place is confirmed");
});
it("correction shows captured values/wording and does not substitute a current profile", () => {
  const html = renderToStaticMarkup(createElement(SubmissionEditor, { submission: { id: "submission", version: 1, form: fourQuestionForm, name: "Captured name", phone: "+6512345678", answers: {} }, onSubmit: async () => ({ status: "committed" as const }) }));
  expect(html).toContain("Captured name"); expect(html).toContain("Preferred workshop"); expect(html).toContain("Save corrected submission"); expect(html).not.toContain("Submission saved.");
});
it("My Events hides unavailable public excerpts and does not claim a cancelled registration still holds a place", () => {
  const base = { registrationId: "registration", eventId: studentFixture.eventId, state: "CANCELLED" as const, eventState: "PUBLISHED" as const, current: publicFields, changes: ["Fee"], canCancel: false, canCorrect: false, canRejoin: true };
  const cancelled = renderToStaticMarkup(createElement(MyEventsList, { items: [base] }));
  expect(cancelled).toContain("Register again"); expect(cancelled).not.toContain("Your place is preserved");
  const withdrawn = renderToStaticMarkup(createElement(MyEventsList, { items: [{ ...base, eventState: "WITHDRAWN" }] }));
  expect(withdrawn).toContain("withdrawn"); expect(withdrawn).not.toContain(publicFields.title); expect(withdrawn).not.toContain("Register again");
  expect(renderToStaticMarkup(createElement(MyEventsList, { items: [], error: "private driver detail" }))).not.toContain("private driver detail");
});
