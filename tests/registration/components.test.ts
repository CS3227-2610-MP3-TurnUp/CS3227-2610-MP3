import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { StudentEventCard, StudentEventList } from "../../src/features/student/event-list";
import { StudentEventContent } from "../../src/features/student/event-details";
import { studentFixture } from "./fixtures";
it("renders one semantic details link using approved fields and Singapore time", () => {
  const html = renderToStaticMarkup(createElement(StudentEventCard, { event: studentFixture }));
  expect(html.match(/<a\b/g)).toHaveLength(1); expect(html).toContain(`/student/events/${studentFixture.eventId}`);
  expect(html).toContain("Campus workshop"); expect(html).toContain("SGT"); expect(html).toContain("campus_owner");
  expect(html).not.toMatch(/Not registered|10 places left|Attend|Saved changes/);
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
