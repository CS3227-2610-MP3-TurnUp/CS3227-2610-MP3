import type { FailureReason } from "./types";
import type { SimulationRequest } from "./demo/scenarios";
const reasons: readonly FailureReason[] = ["invalid_source", "invalid_response", "invalid_evidence", "invalid_question", "timeout", "provider_unavailable", "rate_limited", "cancelled", "preview_only", "live_not_authorized", "budget_exhausted"];
export async function requestLocalAnswer(request: SimulationRequest, signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<{ ok: true; candidate: unknown } | { ok: false; reason: FailureReason }> {
  try {
    const response = await fetchImpl("/api/dev/student-assistant", { method: "POST", credentials: "omit", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: request.requestId, eventId: request.eventId, revision: request.revision, question: request.question }), cache: "no-store", signal });
    const reader = response.body?.getReader(); if (!reader) return { ok: false, reason: "invalid_response" };
    let size = 0; const chunks: Uint8Array[] = [];
    try { while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > 40 * 1024) { await reader.cancel(); return { ok: false, reason: "invalid_response" }; } chunks.push(next.value); } }
    finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const result = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (result?.ok === false && reasons.includes(result.reason)) return { ok: false, reason: result.reason };
    if (!response.ok || result?.ok !== true || result.requestId !== request.requestId || result.eventId !== request.eventId || result.revision !== request.revision) return { ok: false, reason: "invalid_response" };
    // Runtime evidence validation happens in the existing reducer, never via a network type cast.
    return { ok: true, candidate: result.candidate };
  } catch { return { ok: false, reason: signal.aborted ? "cancelled" : "provider_unavailable" }; }
}
