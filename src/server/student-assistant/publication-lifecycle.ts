import "server-only";
import type { PrismaClient } from "../db/generated/client";
import { AuthError } from "../auth/policy";
import { currentPublication } from "../publication/reader";
import { uuid } from "../events/policy";
import { validateAnswer } from "../../features/student-assistant/evidence";
import { projectPublication, PublicationSourceError, type PublicationBinding } from "./publication-source";
export async function loadPublicationSource(db: PrismaClient, token: string | undefined, eventId: string, now = Date.now()) {
  try { eventId = uuid(eventId).toLowerCase(); } catch { throw new PublicationSourceError(400, "invalid_request"); }
  try { return projectPublication(await currentPublication(db, token, eventId), eventId, now); }
  catch (error) {
    if (error instanceof PublicationSourceError) throw error;
    if (error instanceof AuthError) {
      if (error.status === 401) throw new PublicationSourceError(401, "login_required");
      if (error.status === 403) throw new PublicationSourceError(403, "student_required");
      if (error.status === 404) throw new PublicationSourceError(404, "event_unavailable");
    }
    throw new PublicationSourceError(503, "source_unavailable");
  }
}
/** Fresh authenticated read is the delivery linearisation point, not a browser lifetime lock. */
export async function recheckPublication(db: PrismaClient, token: string | undefined, binding: PublicationBinding, now = Date.now()) {
  const current = await loadPublicationSource(db, token, binding.eventId, now);
  if (current.binding.revision !== binding.revision) throw new PublicationSourceError(409, "source_changed");
  return current;
}
/** Final authenticated publication/evidence check; never holds a transaction across inference. */
export async function deliverPublicationAnswer(db: PrismaClient, token: string | undefined, binding: PublicationBinding, candidate: unknown, now = Date.now()) {
  const current = await recheckPublication(db, token, binding, now), checked = validateAnswer(candidate, current.source);
  if (!checked.ok) throw new PublicationSourceError(503, "invalid_answer");
  return checked.answer;
}
