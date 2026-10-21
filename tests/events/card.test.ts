import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { EventCard } from "../../src/components/events/event-card";
import { EMPTY_EVENT, type EventSummary } from "../../src/lib/event-fields";
it("renders one semantic full-card link containing metadata and saved-change badge", () => {
  const event: EventSummary = { id: "event-id", state: "PUBLISHED", version: 2, editedAt: "2026-10-21T00:00:00Z", hasSavedChanges: true,
    fields: { ...EMPTY_EVENT, title: "Campus workshop", location: "Hall 1", description: "Public details" } };
  const html = renderToStaticMarkup(createElement(EventCard, { event }));
  expect(html.match(/<a\b/g)).toHaveLength(1);
  expect(html).toContain('href="/organiser/events/event-id"');
  expect(html).toMatch(/<a[^>]*>[\s\S]*Hall 1[\s\S]*Public details[\s\S]*<\/a>/);
  expect(html).toContain("Saved changes");
  const unchanged = renderToStaticMarkup(createElement(EventCard, { event: { ...event, hasSavedChanges: false } }));
  expect(unchanged).not.toContain("Saved changes");
});
