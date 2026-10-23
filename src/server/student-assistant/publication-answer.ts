import "server-only";
import type { PrismaClient } from "../db/generated/client";
import type { SoCConfig } from "../ai/soclaas-config";
import type { FetchLike } from "../ai/soclaas-client";
import { answerFromSource, type AnswerResult } from "./answer";
import { reserveLocal } from "./local-admission";
import { loadPublicationSource, recheckPublication, deliverPublicationAnswer } from "./publication-lifecycle";
import { PublicationSourceError } from "./publication-source";

export interface PublicationQuestion { requestId: string; revision: string; question: string }
export function readPublicationQuestion(value: unknown): PublicationQuestion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 3 || !["requestId", "revision", "question"].every(key => Object.hasOwn(input, key))) return null;
  if (typeof input.requestId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(input.requestId)
    || typeof input.revision !== "string" || input.revision.length > 128 || !/^[0-9a-f-]{36}:[1-9][0-9]*:[a-f0-9]{64}$/.test(input.revision)
    || typeof input.question !== "string" || !input.question.isWellFormed() || !input.question.trim() || Array.from(input.question).length > 1000) return null;
  return { requestId: input.requestId, revision: input.revision, question: input.question };
}
/** Test seams supply fake provider/temporary admission only; HTTP callers cannot select them. */
export async function answerPublication(db: PrismaClient, token: string | undefined, eventId: string, input: PublicationQuestion, config: SoCConfig,
  options: { signal?: AbortSignal; fetchImpl?: FetchLike; reserve?: typeof reserveLocal } = {}): Promise<AnswerResult> {
  if (!readPublicationQuestion(input)) throw new PublicationSourceError(400, "invalid_request");
  const initial = await loadPublicationSource(db, token, eventId);
  if (input.revision !== initial.binding.revision) throw new PublicationSourceError(409, "source_changed");
  if (options.signal?.aborted) return { ok: false, reason: "cancelled" };
  const admission = await (options.reserve ?? reserveLocal)(config);
  if (!admission.ok) return { ok: false, reason: admission.reason === "limited" ? "budget_exhausted" : admission.reason === "busy" ? "rate_limited" : "live_not_authorized" };
  try {
    let result: AnswerResult;
    try { result = await answerFromSource(initial.source, input.question, admission.config, options.signal, options.fetchImpl); }
    catch { result = { ok: false, reason: "provider_unavailable" }; }
    if (result.ok) await deliverPublicationAnswer(db, token, initial.binding, result.candidate);
    else await recheckPublication(db, token, initial.binding);
    return options.signal?.aborted ? { ok: false, reason: "cancelled" } : result;
  } finally { await admission.release().catch(() => undefined); }
}
