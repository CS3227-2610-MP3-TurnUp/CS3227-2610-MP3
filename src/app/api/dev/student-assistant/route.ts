import { readStudentSoCConfig } from "../../../../server/student-assistant/provider-config";
import { answerSynthetic } from "../../../../server/student-assistant/answer";
import { localDevelopment, permittedRequest, readBody, readQuestion } from "../../../../server/student-assistant/development-policy";
import { reserveLocal } from "../../../../server/student-assistant/local-admission";
import { syntheticSource } from "../../../../server/student-assistant/synthetic-source";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function reply(body: unknown, status: number) { return Response.json(body, { status, headers: { "cache-control": "no-store" } }); }
export async function POST(request: Request) {
  if (!localDevelopment()) return new Response(null, { status: 404 });
  if (!permittedRequest(request)) return reply({ ok: false, reason: "live_not_authorized" }, 403);
  const input = readQuestion(await readBody(request));
  if (!input) return reply({ ok: false, reason: "invalid_question" }, 400);
  if (!syntheticSource(input.eventId, input.revision)) return reply({ ok: false, reason: "invalid_source" }, 400);
  const config = readStudentSoCConfig(process.env);
  if (!config.ok) return reply({ ok: false, reason: "provider_unavailable" }, 503);
  const admission = await reserveLocal(config.config);
  if (!admission.ok) return reply({ ok: false, reason: admission.reason === "limited" ? "budget_exhausted" : admission.reason === "busy" ? "rate_limited" : "live_not_authorized" }, 429);
  try {
    const result = await answerSynthetic(input, admission.config, request.signal);
    return reply({ ...result, requestId: input.requestId, eventId: input.eventId, revision: input.revision }, result.ok ? 200 : 503);
  } catch { return reply({ ok: false, reason: "provider_unavailable" }, 503); }
  finally { await admission.release().catch(() => undefined); }
}
