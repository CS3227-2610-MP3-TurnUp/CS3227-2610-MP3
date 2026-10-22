import "server-only";

import type { PrismaClient } from "../db/generated/client";
import { AuthError } from "../auth/policy";
import { requireSelf } from "../accounts/service";
import { EventError } from "../events/policy";

/** Recheck session, fixed role, ownership, editable state and version around temporary processing. */
export async function assertProposalEventAccess(
  db: PrismaClient,
  token: string | undefined,
  eventId: string,
  expectedVersion?: number,
  expectedPreparationRevision?: number,
): Promise<{ ownerId: string; eventVersion: number; preparationRevision: number }> {
  const identity = await requireSelf(db, token);
  if (identity.role !== "ORGANISER") throw new AuthError(403, "Organiser access required.");
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { ownerId: true, state: true, version: true, preparationVersion: true },
  });
  if (!event || event.ownerId !== identity.id) throw new EventError(404, "Event unavailable.");
  if (event.state === "CANCELLED") throw new EventError(409, "Cancelled events cannot use proposal assistance.");
  if (expectedVersion !== undefined && event.version !== expectedVersion) throw new EventError(409, "This event changed. Reload and review before using proposal assistance.");
  if (expectedPreparationRevision !== undefined && event.preparationVersion !== expectedPreparationRevision) {
    throw new EventError(409, "Proposal clarifications changed. Reload and review before using proposal assistance.");
  }
  return { ownerId: identity.id, eventVersion: event.version, preparationRevision: event.preparationVersion };
}
