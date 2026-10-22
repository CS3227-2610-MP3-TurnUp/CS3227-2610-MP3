import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { PrismaClient } from "../db/generated/client";
import type { SoCConfig } from "../ai/soclaas-config";
import type { Admission } from "./local-admission";
import { resolveSession } from "../auth/session";
import { AuthError } from "../auth/policy";
import { HOSTED_LIMITS as limits, hostedApproval, type HostedEnvironment } from "./hosted-policy";

/** Serialise all instances on one durable row. Failures never refund the reserved attempt. */
export async function reserveHosted(db: PrismaClient, token: string | undefined, requestId: string, config: SoCConfig, environment: HostedEnvironment = "preview"): Promise<Admission> {
  const actor = await resolveSession(db, token);
  if (!actor) throw new AuthError(401, "Log in again to continue.");
  if (actor.role !== "STUDENT") throw new AuthError(403, "Student access required.");
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const actorKey = hash(actor.id), requestKey = hash(`${actor.id}:${requestId}`), reservationId = randomUUID();
  const capped = { ...config, maxOutputTokens: Math.min(config.maxOutputTokens, limits.outputTokens),
    maxInputBytes: Math.min(config.maxInputBytes, limits.inputBytes), timeoutMs: Math.min(config.timeoutMs, limits.timeoutMs) };
  const decision = await db.$transaction(async tx => {
    const [budget] = await tx.$queryRaw<{ approval_id: string; model: string; enabled: boolean; attempts: number;
      reserved_output_tokens: number; active: boolean; spaced: boolean }[]>`
      SELECT approval_id, model, enabled, attempts, reserved_output_tokens,
        expires_at > clock_timestamp() AS active,
        (last_admission_at IS NULL OR last_admission_at <= clock_timestamp() - interval '10 seconds') AS spaced
      FROM student_ai_budget WHERE id = 1 AND environment = ${environment} FOR UPDATE`;
    if (!budget || !budget.enabled || !budget.active || budget.approval_id !== hostedApproval(environment) || budget.model !== capped.model) return "blocked" as const;
    const [counts] = await tx.$queryRaw<{ duplicate: boolean; inflight: boolean; user_count: number }[]>`
      SELECT EXISTS(SELECT 1 FROM student_ai_reservation WHERE request_key = ${requestKey}) AS duplicate,
        EXISTS(SELECT 1 FROM student_ai_reservation WHERE NOT released AND lease_until > clock_timestamp()) AS inflight,
        (SELECT count(*)::int FROM student_ai_reservation WHERE actor_key = ${actorKey}
          AND created_at > clock_timestamp() - interval '15 minutes') AS user_count`;
    if (!counts) return "blocked" as const;
    if (counts.duplicate || counts.inflight || !budget.spaced || counts.user_count >= limits.perUser) return "busy" as const;
    if (budget.attempts >= limits.attempts || budget.reserved_output_tokens + capped.maxOutputTokens > limits.outputBudget) return "limited" as const;
    await tx.$executeRaw`INSERT INTO student_ai_reservation (id,budget_id,request_key,actor_key,lease_until)
      VALUES (${reservationId}::uuid,1,${requestKey},${actorKey},clock_timestamp() + interval '60 seconds')`;
    await tx.$executeRaw`UPDATE student_ai_budget SET attempts = attempts + 1,
      reserved_output_tokens = reserved_output_tokens + ${capped.maxOutputTokens},last_admission_at = clock_timestamp() WHERE id = 1`;
    return "admitted" as const;
  });
  if (decision !== "admitted") return { ok: false, reason: decision };
  return { ok: true, config: capped, release: async () => {
    // Named release cannot free another lease; expiry handles abandoned invocations without resetting spend.
    await db.$executeRaw`UPDATE student_ai_reservation SET released = true WHERE id = ${reservationId}::uuid AND NOT released`;
  } };
}
