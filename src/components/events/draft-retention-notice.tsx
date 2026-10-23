import type { DraftRetentionStatus } from "../../lib/event-retention";

type Props = {
  retention: DraftRetentionStatus | null | undefined;
  variant?: "card" | "detail";
  canExtend?: boolean;
};

export function DraftRetentionNotice({ retention, variant = "detail", canExtend = true }: Props) {
  if (!retention || (!retention.warning && !retention.expired)) return null;

  const deadline = displaySingaporeDate(retention.expiresAt);
  const overdue = retention.expired;
  const isNeverPublished = retention.disposition === "delete_draft";
  const title = overdue ? "Private draft deadline passed" : "Private draft expires soon";
  const message = !canExtend
    ? overdue
      ? `The private retention deadline passed on ${deadline}. This cancelled event's private changes and proposal preparation are due to be cleared; its cancelled state, publication history, and registrations remain.`
      : `This cancelled event's private changes expire on ${deadline}. They will be cleared with proposal preparation; the cancelled state, publication history, and registrations remain.`
    : isNeverPublished
      ? overdue
        ? `This never-published draft reached its deadline on ${deadline}. Save Draft or a successful proposal extraction resets the 30-day period. Otherwise, this draft and its private proposal preparation will be deleted.`
        : `This never-published draft expires on ${deadline}. Save Draft or a successful proposal extraction resets the 30-day period. After expiry, this draft and its private proposal preparation will be deleted.`
      : overdue
        ? `Private changes reached their deadline on ${deadline}. Save Draft or a successful proposal extraction resets the 30-day period. Otherwise, private changes and preparation will be cleared and the working draft restored from the latest publication; the current publication, event state, history, and registrations remain.`
        : `Private changes expire on ${deadline}. Save Draft or a successful proposal extraction resets the 30-day period. After expiry, private changes and preparation will be cleared and the working draft restored from the latest publication; the current publication, event state, history, and registrations remain.`;

  return <aside className={`draft-retention-notice draft-retention-notice-${variant}`} role="status" aria-live="polite">
    <p><strong>{title}</strong></p>
    <p>{message}</p>
  </aside>;
}

function displaySingaporeDate(instant: string): string {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) return "the displayed deadline";
  const formatted = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
  return `${formatted} SGT`;
}
