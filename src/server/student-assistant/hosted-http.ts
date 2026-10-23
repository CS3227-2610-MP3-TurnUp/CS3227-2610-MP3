import { saveHistory } from "./history";
import "server-only";
import { privateHeaders } from "../accounts/service";
import { authConfig } from "../auth/request-security";
import { presentedToken } from "../auth/session";
import { AuthError } from "../auth/policy";
import { uuid } from "../events/policy";
import { hostedPolicy } from "./hosted-policy";
import { loadPublicationSource, recheckPublication } from "./publication-lifecycle";
import { PublicationSourceError } from "./publication-source";
import { answerPublication, readPublicationQuestion } from "./publication-answer";
import { reserveHosted } from "./hosted-admission";

const reply = (body: unknown, status: number) => Response.json(body, { status, headers: privateHeaders });
async function body(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new PublicationSourceError(400, "invalid_request");
  const reader = request.body?.getReader(); if (!reader) throw new PublicationSourceError(400, "invalid_request");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([ (async () => {
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength;
        if (size > 8192) throw new PublicationSourceError(400, "invalid_request"); chunks.push(next.value); }
      try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new PublicationSourceError(400, "invalid_request"); }
    })(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new PublicationSourceError(400, "invalid_request")), 5000); }) ]);
  } finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
}

/** Fixed product endpoint. Requires the explicitly enabled, matching hosted environment. */
export async function hostedResource(request: Request, eventId: string, operation: "source" | "answer") {
  const policy = hostedPolicy();
  if (!policy) return new Response(null, { status: 404, headers: privateHeaders });
  try {
    const url = new URL(request.url), origin = request.headers.get("origin"), site = request.headers.get("sec-fetch-site");
    if (request.method !== (operation === "source" ? "GET" : "POST") || url.origin !== policy.origin
      || request.headers.get("host") !== url.host || (origin && origin !== policy.origin)
      || (operation === "answer" && origin !== policy.origin) || (site && !["same-origin", "none"].includes(site))) throw new PublicationSourceError(403, "invalid_request");
    try { eventId = uuid(eventId).toLowerCase(); } catch { throw new PublicationSourceError(400, "invalid_request"); }
    const expected = url.searchParams.get("expectedRevision");
    if (operation === "answer" ? !!url.search : [...url.searchParams.keys()].some(k => k !== "expectedRevision")
      || url.searchParams.getAll("expectedRevision").length > 1
      || (expected !== null && !/^[0-9a-f-]{36}:[1-9][0-9]*:[a-f0-9]{64}$/.test(expected))) throw new PublicationSourceError(400, "invalid_request");
    const token = presentedToken(request.headers, authConfig());
    if (!token) throw new PublicationSourceError(401, "login_required");
    const input = operation === "answer" ? readPublicationQuestion(await body(request)) : null;
    if (operation === "answer" && !input) throw new PublicationSourceError(400, "invalid_request");
    const { prisma } = await import("../db/client");
    if (input) {
      const result = await answerPublication(prisma, token, eventId, input, policy.config, {
        signal: request.signal, reserve: config => reserveHosted(prisma, token, input.requestId, config, policy.environment),
      });
      await saveHistory(prisma, token, eventId, input, result);
      if (!result.ok) return reply(result, ["budget_exhausted", "rate_limited", "live_not_authorized"].includes(result.reason) ? 429 : 503);
      return reply({ ...result, requestId: input.requestId, eventId, revision: input.revision }, 200);
    }
    const initial = await loadPublicationSource(prisma, token, eventId);
    if (expected !== null && expected !== initial.binding.revision) throw new PublicationSourceError(409, "source_changed");
    const current = await recheckPublication(prisma, token, initial.binding);
    return reply({ ok: true, source: current.source }, 200);
  } catch (error) {
    if (error instanceof PublicationSourceError) return reply({ ok: false, code: error.code }, error.status);
    if (error instanceof AuthError && [401, 403].includes(error.status)) return reply({ ok: false, code: error.status === 401 ? "login_required" : "student_required" }, error.status);
    return reply({ ok: false, code: "source_unavailable" }, 503);
  }
}
