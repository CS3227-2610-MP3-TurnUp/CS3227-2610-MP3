import "server-only";
import type { PrismaClient } from "../db/generated/client";
import { requireSelf } from "../accounts/service";
import { EventError } from "../events/policy";

/** Future Student consumers use this projection; no draft/profile/private records escape. */
export async function currentPublication(db: PrismaClient, token: string | undefined, eventId: string) {
  const identity = await requireSelf(db, token);
  if (identity.role !== "STUDENT") throw new EventError(403, "Student access required.");
  const event = await db.event.findFirst({ where: { id: eventId, state: "PUBLISHED" }, select: {
    id: true, version: true, owner: { select: { username: true } }, currentPublication: {
      select: { id: true, revision: true, snapshot: true, digest: true },
    },
  } });
  if (!event?.currentPublication) throw new EventError(404, "Event unavailable.");
  return { eventId: event.id, eventVersion: event.version, organiser: event.owner.username, publication: event.currentPublication };
}
