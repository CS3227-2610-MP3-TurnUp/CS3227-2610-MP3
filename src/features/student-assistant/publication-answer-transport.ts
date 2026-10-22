import type { FailureReason } from "./types";
import { publicationCodes, type PublicationCode } from "./publication-transport";

export interface PublicationAnswerRequest { requestId: string; eventId: string; revision: string; question: string }
export type PublicationAnswerResult = { ok: true; candidate: unknown } | { ok: false; code: PublicationCode } | { ok: false; reason: FailureReason };
const reasons: readonly FailureReason[] = ["invalid_source", "invalid_response", "invalid_evidence", "invalid_question", "live_not_authorized", "budget_exhausted", "timeout", "provider_unavailable", "rate_limited", "cancelled"];
export async function requestPublicationAnswer(input: PublicationAnswerRequest, signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<PublicationAnswerResult> {
  let deadline: AbortSignal | undefined;
  try {
    deadline = AbortSignal.timeout(35_000);
    const response = await fetchImpl(`/api/dev/student-assistant/publication/${encodeURIComponent(input.eventId)}/answer`, {
      method: "POST", credentials: "same-origin", cache: "no-store", headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: input.requestId, revision: input.revision, question: input.question }), signal: AbortSignal.any([signal, deadline]),
    });
    const reader = response.body?.getReader();
    if (!reader) return { ok: false, reason: "invalid_response" };
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        size += part.value.byteLength;
        if (size > 40 * 1024) { await reader.cancel(); return { ok: false, reason: "invalid_response" }; }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
    const joined = new Uint8Array(size); let offset = 0;
    for (const part of chunks) { joined.set(part, offset); offset += part.byteLength; }
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(joined));
    if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, reason: "invalid_response" };
    if (body.ok === false && Object.keys(body).length === 2) {
      if (publicationCodes.includes(body.code)) return { ok: false, code: body.code };
      if (body.code === "invalid_answer") return { ok: false, reason: "invalid_evidence" };
      if (reasons.includes(body.reason)) return { ok: false, reason: body.reason };
    }
    if (!response.ok || body.ok !== true || Object.keys(body).length !== 5 || body.requestId !== input.requestId || body.eventId !== input.eventId || body.revision !== input.revision || !Object.hasOwn(body, "candidate")) return { ok: false, reason: "invalid_response" };
    return { ok: true, candidate: body.candidate }; // The reducer independently validates source/evidence.
  } catch { return { ok: false, reason: signal.aborted ? "cancelled" : deadline?.aborted ? "timeout" : "provider_unavailable" }; }
}
