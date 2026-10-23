import "server-only";
import type { PrismaClient } from "../db/generated/client";
import { requireSelf } from "../accounts/service";
import { AuthError } from "../auth/policy";
import { revalidateSession } from "../auth/session";
import { loadPublicationSource, recheckPublication } from "./publication-lifecycle";
import { PublicationSourceError } from "./publication-source";
import type { PublicationQuestion } from "./publication-answer";
import type { AnswerResult } from "./answer";
import { restoreHistory, type SavedTurn } from "../../features/student-assistant/history";
async function context(db: PrismaClient, token: string | undefined, eventId: string, revision: string) {
  const actor = await requireSelf(db, token);
  if (actor.role !== "STUDENT") throw new AuthError(403, "Student access required.");
  const current = await loadPublicationSource(db, token, eventId);
  if (current.binding.revision !== revision) throw new PublicationSourceError(409, "source_changed");
  return { actor, current };
}
/** Only server-produced results enter storage; no browser write endpoint or supplied actor. */
export async function saveHistory(db: PrismaClient, token: string | undefined, eventId: string, input: PublicationQuestion, result: AnswerResult) {
  const { actor, current } = await context(db, token, eventId, input.revision);
  const turn: SavedTurn = { requestId: input.requestId, question: input.question, result };
  if (!restoreHistory(current.source, [turn])) throw new PublicationSourceError(503, "invalid_answer");
  await db.$transaction(async tx => {
    // Serialise this account's appends/pruning; logout does not delete history.
    await tx.$queryRaw`SELECT id FROM app_user WHERE id=${actor.id}::uuid FOR UPDATE`;
    await revalidateSession(tx, actor.id, token);
    await tx.$executeRaw`DELETE FROM student_ai_history WHERE expires_at <= clock_timestamp()`;
    await tx.$executeRaw`INSERT INTO student_ai_history(user_id,event_id,request_id,revision,payload,expires_at)
      VALUES(${actor.id}::uuid,${eventId}::uuid,${input.requestId},${input.revision},${JSON.stringify(turn)}::jsonb,${current.historyExpiresAt})
      ON CONFLICT(user_id,event_id,request_id) DO NOTHING`;
    await tx.$executeRaw`DELETE FROM student_ai_history WHERE user_id=${actor.id}::uuid AND event_id=${eventId}::uuid
      AND (revision <> ${input.revision} OR request_id NOT IN (
        SELECT request_id FROM student_ai_history WHERE user_id=${actor.id}::uuid AND event_id=${eventId}::uuid
          AND revision=${input.revision} ORDER BY created_at DESC,request_id DESC LIMIT 20))`;
  });
  await recheckPublication(db, token, current.binding);
}
export async function readHistory(db: PrismaClient, token: string | undefined, eventId: string, revision: string) {
  const { actor, current } = await context(db, token, eventId, revision);
  const rows = await db.$queryRaw<{ payload: SavedTurn }[]>`SELECT payload FROM (
    SELECT payload,created_at,request_id FROM student_ai_history
      WHERE user_id=${actor.id}::uuid AND event_id=${eventId}::uuid AND revision=${revision}
        AND expires_at > clock_timestamp() ORDER BY created_at DESC,request_id DESC LIMIT 20
    ) recent ORDER BY created_at,request_id`;
  const turns = rows.map(row => row.payload);
  if (!restoreHistory(current.source, turns)) throw new PublicationSourceError(503, "invalid_answer");
  await recheckPublication(db, token, current.binding);
  return turns;
}
