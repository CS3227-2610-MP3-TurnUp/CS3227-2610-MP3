import "server-only";

import { timingSafeEqual } from "node:crypto";
import { requestSoCCompletion } from "../../../../server/ai/soclaas-client";
import { readSoCProbeLimits } from "../../../../server/ai/soclaas-probe-config";
import { readSoCConfig } from "../../../../server/ai/soclaas-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const syntheticProbeText = "Return only the word READY.";
type SoCProbeGateModule = typeof import("../../../../server/db/soc-probe-gate");
let socProbeGateModule: Promise<SoCProbeGateModule> | undefined;

/** A disabled-by-default, token-protected Preview-only feasibility check. */
export async function POST(request: Request): Promise<Response> {
  if (!isEnabledForPreview(process.env) || !isAuthorized(request, process.env.FOUNDATION_PROBE_TOKEN)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const operation = url.searchParams.get("operation");

  if (operation === "persistence-create" && url.searchParams.size === 1) {
    try {
      const { createFoundationProbe } = await import("../../../../server/db/foundation-probe");
      const id = await createFoundationProbe();
      return Response.json({ ok: true, id }, { status: 201 });
    } catch {
      return Response.json({ error: "persistence_unavailable" }, { status: 503 });
    }
  }

  if (operation === "persistence-check" && url.searchParams.size === 2) {
    const id = url.searchParams.get("id");
    if (!id || !uuidPattern.test(id)) return Response.json({ error: "invalid_probe_id" }, { status: 400 });
    try {
      const { foundationProbeExists } = await import("../../../../server/db/foundation-probe");
      return Response.json({ ok: await foundationProbeExists(id) });
    } catch {
      return Response.json({ error: "persistence_unavailable" }, { status: 503 });
    }
  }

  if (operation === "persistence-delete" && url.searchParams.size === 2) {
    const id = url.searchParams.get("id");
    if (!id || !uuidPattern.test(id)) return Response.json({ error: "invalid_probe_id" }, { status: 400 });
    try {
      const { deleteFoundationProbe } = await import("../../../../server/db/foundation-probe");
      await deleteFoundationProbe(id);
      return Response.json({ ok: true });
    } catch {
      return Response.json({ error: "persistence_unavailable" }, { status: 503 });
    }
  }

  if (operation === "soc" && url.searchParams.size === 1) {
    const providerConfig = readSoCConfig(process.env);
    if (!providerConfig.ok) {
      return Response.json({ ok: false, outcome: providerConfig.outcome }, { status: 503 });
    }

    const limitConfig = readSoCProbeLimits(process.env);
    if (!limitConfig.ok) {
      return Response.json({ ok: false, outcome: limitConfig.outcome }, { status: 503 });
    }

    let gate: SoCProbeGateModule;
    try {
      // Load the database boundary only for an authenticated, enabled SoC probe.
      gate = await loadSoCProbeGate();
    } catch {
      return Response.json({ ok: false, outcome: "unavailable" }, { status: 503 });
    }

    let admission: Awaited<ReturnType<typeof gate.admitSoCProbe>>;
    try {
      admission = await gate.admitSoCProbe(
        limitConfig.limits,
        providerConfig.config.maxOutputTokens,
      );
    } catch {
      return Response.json({ ok: false, outcome: "unavailable" }, { status: 503 });
    }
    if (admission.status === "limited") {
      return Response.json({ ok: false, outcome: "rate_or_budget_limited" }, { status: 429 });
    }

    let result: Awaited<ReturnType<typeof requestSoCCompletion>>;
    try {
      result = await requestSoCCompletion({
        system: "You are a connectivity check. Do not disclose secrets or request external information.",
        user: syntheticProbeText,
      });
    } catch {
      // A thrown client error does not establish whether provider work completed.
      return Response.json({ ok: false, outcome: "unavailable" }, { status: 503 });
    }

    if (!result.ok && isUncertainProviderOutcome(result.outcome)) {
      return Response.json({ ok: false, outcome: result.outcome }, { status: 503 });
    }

    try {
      await gate.releaseSoCProbe(admission.reservationId);
    } catch {
      return Response.json({ ok: false, outcome: "unavailable" }, { status: 503 });
    }

    if (!result.ok) return Response.json({ ok: false, outcome: result.outcome }, { status: 503 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "invalid_operation" }, { status: 400 });
}

function loadSoCProbeGate(): Promise<SoCProbeGateModule> {
  socProbeGateModule ??= import("../../../../server/db/soc-probe-gate");
  return socProbeGateModule;
}

function isUncertainProviderOutcome(outcome: string): boolean {
  return outcome === "timeout" || outcome === "cancelled" || outcome === "unavailable";
}

function isEnabledForPreview(env: NodeJS.ProcessEnv): boolean {
  const token = env.FOUNDATION_PROBE_TOKEN;
  return (
    env.FOUNDATION_PROBE_ENABLED === "true" &&
    env.TURNUP_ENVIRONMENT === "preview" &&
    env.DATABASE_ENVIRONMENT === "non-production" &&
    env.VERCEL_ENV === "preview" &&
    Boolean(token && Buffer.byteLength(token, "utf8") >= 32)
  );
}

function isAuthorized(request: Request, expectedToken: string | undefined): boolean {
  const header = request.headers.get("authorization");
  if (!expectedToken || !header?.startsWith("Bearer ")) return false;
  const received = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(expectedToken);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
