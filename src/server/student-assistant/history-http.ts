import "server-only";
import { privateHeaders, requireSelf } from "../accounts/service";
import { authConfig } from "../auth/request-security";
import { presentedToken } from "../auth/session";
import { hostedResource } from "./hosted-http";
import { publicationResource } from "./publication-http";
import { readHistory } from "./history";
import { PublicationSourceError } from "./publication-source";
import { AuthError } from "../auth/policy";
/** Reuse exact source endpoint configuration, method, origin, role and publication guards. */
export async function historyResource(request: Request, eventId: string, mode: "local" | "hosted") {
  const guarded = await (mode === "hosted" ? hostedResource(request, eventId, "source") : publicationResource(request, eventId));
  if (!guarded.ok) return guarded;
  try {
    const { source } = await guarded.json();
    const { prisma } = await import("../db/client");
    const token = presentedToken(request.headers, authConfig());
    const turns = await readHistory(prisma, token, eventId.toLowerCase(), source.revision);
    const actor = await requireSelf(prisma, token);
    return Response.json({ ok: true, eventId: source.eventId, revision: source.revision, accountScope: actor.id, turns }, { headers: privateHeaders });
  } catch (error) {
    const status = error instanceof PublicationSourceError || error instanceof AuthError ? error.status : 503;
    const code = error instanceof PublicationSourceError ? error.code : status === 401 ? "login_required" : status === 403 ? "student_required" : "source_unavailable";
    return Response.json({ ok: false, code }, { status, headers: privateHeaders });
  }
}
