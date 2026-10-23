import { publicationCodes, type PublicationCode } from "./publication-transport";
import { restoreHistory, type SavedTurn } from "./history";
import type { PublicSourceSnapshot } from "./types";
export type HistoryLoad = { ok: true; turns: SavedTurn[]; accountScope: string } | { ok: false; code: PublicationCode };
export async function requestHistory(source: PublicSourceSnapshot, signal: AbortSignal, mode: "local" | "hosted", fetchImpl: typeof fetch = fetch): Promise<HistoryLoad> {
  try {
    const base = mode === "hosted" ? `/api/student/events/${encodeURIComponent(source.eventId)}/assistant/history` : `/api/dev/student-assistant/publication/${encodeURIComponent(source.eventId)}/history`;
    const response = await fetchImpl(base + "?expectedRevision=" + encodeURIComponent(source.revision), { credentials: "same-origin", cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) });
    const reader = response.body?.getReader(); if (!reader) return { ok: false, code: "source_unavailable" };
    const chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 1024 * 1024) { await reader.cancel(); return { ok: false, code: "source_unavailable" }; } chunks.push(next.value); } } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (body?.ok === false && publicationCodes.includes(body.code)) return { ok: false, code: body.code };
    if (!response.ok || !body || Object.keys(body).sort().join() !== "accountScope,eventId,ok,revision,turns" || body.ok !== true || body.eventId !== source.eventId || body.revision !== source.revision || typeof body.accountScope !== "string" || !/^[0-9a-f-]{36}$/.test(body.accountScope) || !restoreHistory(source, body.turns)) return { ok: false, code: "source_unavailable" };
    return { ok: true, turns: body.turns, accountScope: body.accountScope };
  } catch { return { ok: false, code: "source_unavailable" }; }
}
