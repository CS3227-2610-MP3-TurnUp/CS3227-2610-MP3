import "server-only";

import { NextResponse } from "next/server";
import { authorizedCronRequest, draftRetentionJobEnabled } from "../../../../server/events/retention-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  // Fail closed before loading the database client or cleanup module.
  if (!draftRetentionJobEnabled(process.env) || !authorizedCronRequest(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, outcome: "unavailable" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const url = new URL(request.url);
  if ([...url.searchParams.keys()].some((key) => key !== "dryRun") || url.searchParams.getAll("dryRun").length > 1 ||
      (url.searchParams.has("dryRun") && !["true", "false"].includes(url.searchParams.get("dryRun") ?? ""))) {
    return NextResponse.json({ ok: false, outcome: "invalid_request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const [{ prisma }, { runDraftRetentionSweep }] = await Promise.all([
      import("../../../../server/db/client"),
      import("../../../../server/events/retention"),
    ]);
    const result = await runDraftRetentionSweep(prisma, { dryRun: url.searchParams.get("dryRun") === "true" });
    return NextResponse.json({ ok: true, dryRun: url.searchParams.get("dryRun") === "true", ...result }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, outcome: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
