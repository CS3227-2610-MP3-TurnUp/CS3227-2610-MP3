import { privateHeaders } from "../../../../../../../server/accounts/service";
import { authConfig } from "../../../../../../../server/auth/request-security";
import { presentedToken } from "../../../../../../../server/auth/session";
import { readStudentSoCConfig } from "../../../../../../../server/student-assistant/provider-config";
import { localDevelopment, permittedRequest, readBody } from "../../../../../../../server/student-assistant/development-policy";
import { PublicationSourceError } from "../../../../../../../server/student-assistant/publication-source";
import { answerPublication, readPublicationQuestion } from "../../../../../../../server/student-assistant/publication-answer";
import { uuid } from "../../../../../../../server/events/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status: number) => Response.json(body, { status, headers: privateHeaders });
export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  if (!localDevelopment()) return new Response(null, { status: 404, headers: privateHeaders });
  if (!permittedRequest(request)) return reply({ ok: false, code: "invalid_request" }, 403);
  try {
    const url = new URL(request.url);
    if (url.search) throw new PublicationSourceError(400, "invalid_request");
    let eventId: string;
    try { eventId = uuid((await context.params).eventId).toLowerCase(); }
    catch { throw new PublicationSourceError(400, "invalid_request"); }
    const authentication = authConfig();
    if (authentication.origin !== url.origin || request.headers.get("origin") !== url.origin) throw new PublicationSourceError(403, "invalid_request");
    const token = presentedToken(request.headers, authentication);
    if (!token) throw new PublicationSourceError(401, "login_required");
    const input = readPublicationQuestion(await readBody(request));
    if (!input) throw new PublicationSourceError(400, "invalid_request");
    const config = readStudentSoCConfig(process.env);
    if (!config.ok) return reply({ ok: false, reason: "provider_unavailable" }, 503);
    const { prisma } = await import("../../../../../../../server/db/client");
    const result = await answerPublication(prisma, token, eventId, input, config.config, { signal: request.signal });
    if (!result.ok) return reply(result, ["budget_exhausted", "rate_limited", "live_not_authorized"].includes(result.reason) ? 429 : 503);
    return reply({ ...result, requestId: input.requestId, eventId, revision: input.revision }, 200);
  } catch (error) {
    if (error instanceof PublicationSourceError) return reply({ ok: false, code: error.code }, error.status);
    return reply({ ok: false, code: "source_unavailable" }, 503);
  }
}
