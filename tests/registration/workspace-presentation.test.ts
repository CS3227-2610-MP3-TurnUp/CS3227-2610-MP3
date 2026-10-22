import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { WorkspaceHeader } from "../../src/components/workspace-header";
import { StudentEventContent } from "../../src/features/student/event-details";
import { RegistrationSuccess, StudentRegistrationForm } from "../../src/features/student/registration-form";
import { studentFixture, fourQuestionForm } from "./fixtures";

vi.stubGlobal("React", React);
const location = vi.hoisted(() => ({ pathname: "/student/my-events" as string | null }));
vi.mock("next/navigation", () => ({ usePathname: () => location.pathname, useRouter: () => ({ replace() {}, refresh() {} }) }));

it("exposes frequent Student destinations once with an active navigation state", () => {
  const html = renderToStaticMarkup(createElement(WorkspaceHeader, { role: "STUDENT", username: "<script>untrusted</script>" }));
  expect(html).toContain('aria-label="Student navigation"');
  expect(html.match(/href="\/student\/my-events"/g)).toHaveLength(1);
  expect(html).toMatch(/<a(?=[^>]*aria-current="page")(?=[^>]*href="\/student\/my-events")[^>]*>/);
  expect(html).not.toContain('href="/organiser"');
  expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>");
});

it("keeps Organiser navigation role-specific and tolerates an unavailable pathname", () => {
  location.pathname = null;
  const html = renderToStaticMarkup(createElement(WorkspaceHeader, { role: "ORGANISER", username: "owner" }));
  expect(html).toContain('aria-label="Organiser navigation"');
  expect(html).toContain("Your events"); expect(html).not.toContain('href="/student');
  location.pathname = "/student/my-events";
});

it("directs a registered Student to management even when the event is full", () => {
  const html = renderToStaticMarkup(createElement(StudentEventContent, { event: { ...studentFixture, remainingPlaces: 0, registrationStatus: "ACTIVE" } }));
  expect(html).toContain("Manage your registration"); expect(html).toContain('href="/student/my-events"');
  expect(html).not.toContain("Continue to registration"); expect(html).not.toContain("This event is full");
});

it("explains full registration without offering a join action or guessing unavailable counts", () => {
  const full = renderToStaticMarkup(createElement(StudentEventContent, { event: { ...studentFixture, remainingPlaces: 0, registrationStatus: "none" } }));
  expect(full).toContain("This event is full"); expect(full).not.toContain("Continue to registration");
  const unknown = renderToStaticMarkup(createElement(StudentEventContent, { event: studentFixture }));
  expect(unknown).not.toContain("This event is full");
});

it("allows a text keyboard for both phone numbers and Telegram handles", () => {
  const html = renderToStaticMarkup(createElement(StudentRegistrationForm, { form: fourQuestionForm, onSubmit: async () => ({ status: "committed" as const }) }));
  expect(html).toContain('id="registration-phone"'); expect(html).not.toContain('inputMode="tel"');
  expect(html).not.toContain("View My Events"); // A next step cannot imply an uncommitted success.
});

it("offers a focusable committed summary and a real next step without a disabled submission form", () => {
  for (const mode of ["join", "correction"] as const) {
    const html = renderToStaticMarkup(createElement(RegistrationSuccess, { mode }));
    expect(html).toContain('tabindex="-1"'); expect(html).toContain('role="status"');
    expect(html).toContain('href="/student/my-events"'); expect(html).not.toContain("<form");
    expect(html).toContain(mode === "join" ? "Registration saved" : "Submission saved");
  }
});
