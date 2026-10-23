import "server-only";

import { NextResponse } from "next/server";
import { authorizedCronRequest } from "../../../../server/events/retention-config";
import { readDailyGenerationEnvironment } from "../../../../server/ai/daily-generation-config";
import { generationUsageRetentionJobEnabled } from "../../../../server/ai/generation-retention-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!generationUsageRetentionJobEnabled(process.env) || !authorizedCronRequest(request, secret)) {
    return response({ ok: false, outcome: "unavailable" }, 404);
  }

  const environment = readDailyGenerationEnvironment(process.env);
  if (environment.status !== "supported") {
    return response({ ok: false, outcome: "unavailable" }, 404);
  }

  const url = new URL(request.url);
  if ([...url.searchParams.keys()].some((key) => key !== "dryRun") || url.searchParams.getAll("dryRun").length > 1 ||
      (url.searchParams.has("dryRun") && !["true", "false"].includes(url.searchParams.get("dryRun") ?? ""))) {
    return response({ ok: false, outcome: "invalid_request" }, 400);
  }

  // GET is read-only by default. An operator must explicitly request the
  // bounded deletion pass with `dryRun=false`.
  const dryRun = url.searchParams.get("dryRun") !== "false";
  try {
    const [{ prisma }, { runGenerationUsageRetentionSweep }] = await Promise.all([
      import("../../../../server/db/client"),
      import("../../../../server/ai/generation-retention"),
    ]);
    const result = await runGenerationUsageRetentionSweep(prisma, environment.environment, { dryRun });
    if (!result.ok) return response({ ok: false, outcome: "unavailable" }, 503);
    return response({ ok: true, dryRun, reservations: result.reservations, dailyUsageRows: result.dailyUsageRows });
  } catch {
    return response({ ok: false, outcome: "unavailable" }, 503);
  }
}

function response(body: Record<string, unknown>, status = 200): Response {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", Vary: "Authorization" } });
}
