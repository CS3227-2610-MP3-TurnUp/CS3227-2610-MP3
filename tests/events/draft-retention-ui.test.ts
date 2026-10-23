import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", async () => {
  const react = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ href, children, ...props }: { href: string; children: unknown; [key: string]: unknown }) =>
      react.createElement("a", { href, ...props }, children as never),
  };
});

import type { DraftRetentionStatus } from "../../src/lib/event-retention";
import { EMPTY_EVENT, type EventSummary } from "../../src/lib/event-fields";
import { DraftRetentionNotice } from "../../src/components/events/draft-retention-notice";
import { EventCard } from "../../src/components/events/event-card";

const warning: DraftRetentionStatus = {
  expiresAt: "2026-10-30T04:00:00.000Z",
  warningAt: "2026-10-23T04:00:00.000Z",
  warning: true,
  expired: false,
  disposition: "delete_draft",
};

const event: EventSummary = {
  id: "event-1",
  state: "DRAFT",
  version: 2,
  fields: { ...EMPTY_EVENT, title: "Campus Arts Night", description: "A saved description" },
  editedAt: "2026-10-23T04:00:00.000Z",
  hasSavedChanges: false,
  retention: warning,
};

describe("draft retention notices", () => {
  it("shows no warning before the server marks the window, or when no private state is retained", () => {
    expect(renderToStaticMarkup(createElement(DraftRetentionNotice, { retention: { ...warning, warning: false } }))).toBe("");
    expect(renderToStaticMarkup(createElement(DraftRetentionNotice, { retention: null }))).toBe("");
  });

  it("shows the Singapore deadline and a clear extension/removal outcome for a never-published draft", () => {
    const markup = renderToStaticMarkup(createElement(DraftRetentionNotice, { retention: warning }));
    expect(markup).toContain("Private draft expires soon");
    expect(markup).toContain("30 Oct 2026, 12:00 pm SGT");
    expect(markup).toContain("Save Draft");
    expect(markup).toContain("successful proposal extraction");
    expect(markup).toContain("never-published draft");
    expect(markup).toContain("will be deleted");
  });

  it("explains expired published-draft handling without implying the live publication or registrations are removed", () => {
    const expired: DraftRetentionStatus = {
      ...warning,
      warning: false,
      expired: true,
      disposition: "restore_publication",
    };
    const markup = renderToStaticMarkup(createElement(DraftRetentionNotice, { retention: expired }));
    expect(markup).toContain("Private draft deadline passed");
    expect(markup).toContain("Private changes reached their deadline on 30 Oct 2026, 12:00 pm SGT");
    expect(markup).toContain("working draft restored from the latest publication");
    expect(markup).toContain("private changes and preparation will be cleared");
    expect(markup).toContain("current publication, event state, history, and registrations remain");
  });

  it("does not suggest impossible extension actions for a cancelled event", () => {
    const cancelled = { ...warning, warning: true, expired: true, disposition: "restore_publication" as const };
    const markup = renderToStaticMarkup(createElement(DraftRetentionNotice, { retention: cancelled, canExtend: false }));
    expect(markup).toContain("cancelled event&#x27;s private changes");
    expect(markup).toContain("publication history, and registrations remain");
    expect(markup).not.toContain("Save Draft");
    expect(markup).not.toContain("proposal extraction");
  });

  it("puts owner-only retention guidance on the event card as non-interactive content", () => {
    const markup = renderToStaticMarkup(createElement(EventCard, { event }));
    expect(markup).toContain("Private draft expires soon");
    expect(markup).toContain("30 Oct 2026, 12:00 pm SGT");
    expect(markup.match(/<a\b/g)).toHaveLength(1);
    expect(markup).not.toContain("<button");
  });
});
