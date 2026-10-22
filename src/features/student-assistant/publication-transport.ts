import { validateSource } from "./evidence";
import type { PublicSourceSnapshot } from "./types";
export const publicationCodes = ["invalid_request", "login_required", "student_required", "event_unavailable", "source_changed", "source_too_large", "timing_policy_pending", "source_unavailable"] as const;
export type PublicationCode = typeof publicationCodes[number];
export type PublicationLoad = { ok: true; source: PublicSourceSnapshot } | { ok: false; code: PublicationCode };
export async function requestPublicationSource(eventId: string, signal: AbortSignal, expectedRevision?: string, fetchImpl: typeof fetch = fetch): Promise<PublicationLoad> {
  try {
    eventId = eventId.toLowerCase();
    const query = expectedRevision ? "?expectedRevision=" + encodeURIComponent(expectedRevision) : "";
    const response = await fetchImpl("/api/dev/student-assistant/publication/" + encodeURIComponent(eventId) + query, { method: "GET", credentials: "same-origin", cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]) });
    const reader = response.body?.getReader(); if (!reader) return { ok: false, code: "source_unavailable" };
    const chunks: Uint8Array[] = []; let bytes = 0;
    try { while (true) { const next = await reader.read(); if (next.done) break; bytes += next.value.byteLength; if (bytes > 40 * 1024) { await reader.cancel(); return { ok: false, code: "source_unavailable" }; } chunks.push(next.value); } } finally { reader.releaseLock(); }
    const joined = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(joined));
    if (body && Object.keys(body).length === 2 && body.ok === false && publicationCodes.includes(body.code)) return { ok: false, code: body.code };
    if (!response.ok || !body || Object.keys(body).length !== 2 || body.ok !== true) return { ok: false, code: "source_unavailable" };
    const checked = validateSource(body.source);
    if (!checked.ok || checked.source.eventId !== eventId || !/^[0-9a-f-]{36}:[1-9][0-9]*:[a-f0-9]{64}$/.test(checked.source.revision) || (expectedRevision && checked.source.revision !== expectedRevision)) return { ok: false, code: "source_unavailable" };
    return { ok: true, source: checked.source };
  } catch { return { ok: false, code: "source_unavailable" }; }
}

/** One explicit request per refresh; invalidates old content before dispatch and discards stale loads. */
export function createPublicationLoader(eventId: string, publish: (result: PublicationLoad | { checking: true }) => void, requestImpl = requestPublicationSource) {
  let generation = 0, active = true, revision: string | undefined;
  let controller: AbortController | undefined;
  return {
    async refresh() {
      if (!active) return;
      const ticket = ++generation; controller?.abort(); controller = new AbortController();
      const current = controller; publish({ checking: true });
      const result = await requestImpl(eventId, current.signal, revision);
      if (!active || current.signal.aborted || ticket !== generation) return;
      revision = result.ok ? result.source.revision : undefined;
      publish(result);
    },
    stop() { active = false; ++generation; controller?.abort(); },
  };
}
