import { NextResponse } from "next/server";
import { AuthError } from "../../../../server/auth/policy";
import { authConfig } from "../../../../server/auth/request-security";
import { presentedToken } from "../../../../server/auth/session";
import { privateHeaders, requireSelf } from "../../../../server/accounts/service";
import { readDailyGenerationEnvironment } from "../../../../server/ai/daily-generation-config";
import type { GenerationUsageResponse } from "../../../../lib/generation-usage";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // The usage endpoint is self-only. Resolve the authenticated role before
    // evaluating environment state or reading any generation accounting rows.
    const config = authConfig();
    const token = presentedToken(request.headers, config);
    const { prisma } = await import("../../../../server/db/client");
    const identity = await requireSelf(prisma, token);
    if (identity.role !== "ORGANISER") {
      return response({ ok: false, outcome: "forbidden" }, 403);
    }

    const environment = readDailyGenerationEnvironment(process.env);
    if (environment.status === "unsupported_local") {
      return response({ ok: true, status: "disabled", reason: "unsupported_environment", usage: null });
    }
    if (environment.status === "invalid") {
      return response({ ok: false, outcome: "unavailable" }, 503);
    }
    const { hostedGenerationAvailability } = await import("../../../../server/ai/daily-generation-coordinator");
    const hosted = hostedGenerationAvailability();
    if (!hosted.available) {
      if (hosted.outcome === "disabled") {
        return response({ ok: true, status: "disabled", reason: "hosted_generation_disabled", usage: null });
      }
      return response({ ok: false, outcome: "unavailable" }, 503);
    }

    const { readDailyGenerationUsage } = await import("../../../../server/ai/daily-generation");
    const usage = await readDailyGenerationUsage(prisma, identity.id, environment.environment);
    return response({ ok: true, status: "active", usage });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 503;
    return response({ ok: false, outcome: status === 401 ? "unauthenticated" : status === 403 ? "forbidden" : "unavailable" }, status);
  }
}

function response(body: GenerationUsageResponse, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: privateHeaders });
}
