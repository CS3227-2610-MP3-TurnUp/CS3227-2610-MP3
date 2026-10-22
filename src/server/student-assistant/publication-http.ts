import "server-only";
import { authConfig } from "../auth/request-security";
import { presentedToken } from "../auth/session";
import { AuthError } from "../auth/policy";
import { privateHeaders } from "../accounts/service";
import { uuid } from "../events/policy";
import { localDevelopment, localOrigins } from "./development-policy";
import { loadPublicationSource, recheckPublication } from "./publication-lifecycle";
import { PublicationSourceError } from "./publication-source";
export async function publicationResource(request: Request, eventId: string) {
  const reply = (body: unknown, status: number) => Response.json(body, { status, headers: privateHeaders });
  if (!localDevelopment()) return new Response(null, { status: 404, headers: privateHeaders });
  try {
    const url = new URL(request.url), host = request.headers.get("host"), origin = request.headers.get("origin"), site = request.headers.get("sec-fetch-site");
    if (request.method !== "GET") return reply({ ok: false, code: "invalid_request" }, 405);
    if (!localOrigins.includes(url.origin as typeof localOrigins[number]) || host !== url.host || (origin && origin !== url.origin) || (site && !["same-origin", "none"].includes(site))) throw new PublicationSourceError(403, "invalid_request");
    try { uuid(eventId); } catch { throw new PublicationSourceError(400, "invalid_request"); }
    const expected = url.searchParams.get("expectedRevision");
    if ([...url.searchParams.keys()].some((key) => key !== "expectedRevision") || url.searchParams.getAll("expectedRevision").length > 1 || (expected !== null && (expected.length > 128 || !/^[0-9a-f-]{36}:[1-9][0-9]*:[a-f0-9]{64}$/.test(expected)))) throw new PublicationSourceError(400, "invalid_request");
    const config = authConfig();
    if (config.origin !== url.origin) throw new PublicationSourceError(503, "source_unavailable");
    const token = presentedToken(request.headers, config);
    if (!token) throw new PublicationSourceError(401, "login_required");
    const { prisma } = await import("../db/client");
    const initial = await loadPublicationSource(prisma, token, eventId);
    if (expected !== null && expected !== initial.binding.revision) throw new PublicationSourceError(409, "source_changed");
    const current = await recheckPublication(prisma, token, initial.binding);
    return reply({ ok: true, source: current.source }, 200);
  } catch (error) {
    if (error instanceof PublicationSourceError) return reply({ ok: false, code: error.code }, error.status);
    if (error instanceof AuthError && error.status === 401) return reply({ ok: false, code: "login_required" }, 401);
    return reply({ ok: false, code: "source_unavailable" }, 503);
  }
}
