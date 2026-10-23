export const PRIVATE_DRAFT_RETENTION_DAYS = 30;
export const PRIVATE_DRAFT_WARNING_DAYS = 7;
export const PRIVATE_DRAFT_RETENTION_MS = PRIVATE_DRAFT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const PRIVATE_DRAFT_WARNING_MS = PRIVATE_DRAFT_WARNING_DAYS * 24 * 60 * 60 * 1000;

export type DraftRetentionDisposition = "delete_draft" | "restore_publication";
export type DraftRetentionStatus = {
  expiresAt: string;
  warningAt: string;
  warning: boolean;
  expired: boolean;
  disposition: DraftRetentionDisposition;
};

/** Convert an authoritative persisted activity timestamp and DB clock into owner-only metadata. */
export function draftRetentionStatus(
  activityAt: Date | null,
  now: Date,
  disposition: DraftRetentionDisposition,
): DraftRetentionStatus | null {
  if (!activityAt || !Number.isFinite(activityAt.getTime()) || !Number.isFinite(now.getTime())) return null;
  const expiresAtMs = activityAt.getTime() + PRIVATE_DRAFT_RETENTION_MS;
  const warningAtMs = expiresAtMs - PRIVATE_DRAFT_WARNING_MS;
  return {
    expiresAt: new Date(expiresAtMs).toISOString(),
    warningAt: new Date(warningAtMs).toISOString(),
    warning: now.getTime() >= warningAtMs,
    expired: now.getTime() >= expiresAtMs,
    disposition,
  };
}
