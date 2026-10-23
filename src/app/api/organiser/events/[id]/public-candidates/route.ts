import { NextResponse } from "next/server";
import { AuthError } from "../../../../../../server/auth/policy";
import { authConfig, requireOrigin } from "../../../../../../server/auth/request-security";
import { presentedToken } from "../../../../../../server/auth/session";
import { privateHeaders } from "../../../../../../server/accounts/service";
import { EventError, exactKeys, object, uuid, version } from "../../../../../../server/events/policy";
import { assertProposalEventAccess } from "../../../../../../server/proposal-assistance/access";
import { admitProposalExtraction } from "../../../../../../server/proposal-assistance/admission";
import { processPublicCandidates } from "../../../../../../server/proposal-assistance/public-candidates/processor";
import { proposalCompletionAvailability, requestProposalCompletion } from "../../../../../../server/proposal-assistance/transport";
import { PublicCandidateNotReadyError, readSavedPublicCandidateSnapshot } from "../../../../../../server/events/service";
import type { GenerationLimitDetails } from "../../../../../../lib/generation-usage";

const maxBodyBytes = 1_024;
const bodyReadTimeoutMs = 5_000;

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const id = uuid((await context.params).id);
    const config = authConfig();
    requireOrigin(request, config);
    const token = presentedToken(request.headers, config);
    const { prisma } = await import("../../../../../../server/db/client");

    // Establish the owner/session before any request parsing or provider admission.
    const initialAccess = await assertProposalEventAccess(prisma, token, id);
    const availability = proposalCompletionAvailability();
    if (!availability.available) return outcomeResponse(availability.outcome);
    await admitProposalExtraction(prisma, initialAccess.ownerId, config.secret);

    const body = await readBoundedJson(request);
    exactKeys(body, ["expectedVersion", "expectedPreparationRevision"]);
    const expectedVersion = version(body.expectedVersion);
    const expectedPreparationRevision = version(body.expectedPreparationRevision);
    if (expectedVersion !== initialAccess.eventVersion || expectedPreparationRevision !== initialAccess.preparationRevision) {
      return outcomeResponse("stale_event");
    }

    const before = await readSavedPublicCandidateSnapshot(prisma, token, id, expectedVersion, expectedPreparationRevision);
    if (before.ownerId !== initialAccess.ownerId) return outcomeResponse("stale_event");

    let limitDetails: GenerationLimitDetails | undefined;
    const processed = await processPublicCandidates(
      before.source,
      async (input) => {
        const completion = await requestProposalCompletion({ ...input, ownerId: before.ownerId });
        if (!completion.ok && completion.limitDetails) limitDetails = completion.limitDetails;
        return completion;
      },
      request.signal,
    );
    if (!processed.ok) {
      if (processed.outcome === "invalid_response" && processed.rejectionCode) {
        // Keep diagnostics finite and server-only: never include source text,
        // model output, account/event identifiers, or provider error details.
        console.warn(JSON.stringify({ event: "proposal_candidate_generation_rejected", code: processed.rejectionCode }));
      }
      return outcomeResponse(processed.outcome, limitDetails);
    }

    // Re-read under the same ownership/session/event locks; deliver only if the
    // authoritative public source and all revisions stayed identical.
    const after = await readSavedPublicCandidateSnapshot(prisma, token, id, expectedVersion, expectedPreparationRevision);
    if (!sameSnapshot(before, after)) return outcomeResponse("stale_event");

    return NextResponse.json({
      ok: true,
      eventVersion: after.eventVersion,
      preparationRevision: after.preparationRevision,
      candidates: processed.value,
    }, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof PublicCandidateNotReadyError) return outcomeResponse("not_ready");
    if (error instanceof AuthError || error instanceof EventError) {
      const status = error.status;
      return NextResponse.json({
        ok: false,
        outcome: status === 409 ? "stale_event"
          : status === 429 ? "rate_or_budget_limited"
            : status === 415 || status === 413 || status === 400 ? "invalid_request"
              : status === 403 ? "forbidden"
                : status === 401 ? "unauthenticated"
                  : status === 408 ? "timeout"
                    : "unavailable",
      }, { status, headers: privateHeaders });
    }
    return NextResponse.json({ ok: false, outcome: "unavailable" }, { status: 503, headers: privateHeaders });
  }
}

function sameSnapshot(left: Awaited<ReturnType<typeof readSavedPublicCandidateSnapshot>>, right: Awaited<ReturnType<typeof readSavedPublicCandidateSnapshot>>): boolean {
  return left.ownerId === right.ownerId &&
    left.eventVersion === right.eventVersion &&
    left.preparationRevision === right.preparationRevision &&
    left.state === right.state &&
    JSON.stringify(left.source) === JSON.stringify(right.source);
}

async function readBoundedJson(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new EventError(415, "Send the current event and preparation revisions.");
  }
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBodyBytes)) {
    throw new EventError(413, "The request is too large.");
  }
  if (!request.body) throw new EventError(400, "Send the current event and preparation revisions.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let aborted = false;
  const cancel = () => { aborted = true; void reader.cancel().catch(() => {}); };
  request.signal.addEventListener("abort", cancel, { once: true });
  try {
    const read = async () => {
      while (true) {
        if (aborted || request.signal.aborted) throw new AuthError(408, "The request was cancelled.");
        const { value, done } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBodyBytes) throw new EventError(413, "The request is too large.");
        chunks.push(value);
      }
      const bytes = Buffer.concat(chunks);
      chunks.forEach((chunk) => chunk.fill(0));
      try {
        return object(JSON.parse(bytes.toString("utf8")) as unknown);
      } catch (error) {
        if (error instanceof EventError) throw error;
        throw new EventError(400, "Send the current event and preparation revisions.");
      } finally { bytes.fill(0); }
    };
    return await Promise.race([read(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        aborted = true;
        void reader.cancel().catch(() => {});
        reject(new AuthError(408, "The request took too long."));
      }, bodyReadTimeoutMs);
    })]);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", cancel);
    void reader.cancel().catch(() => {});
    chunks.forEach((chunk) => chunk.fill(0));
  }
}

function outcomeResponse(outcome: string, limitDetails?: GenerationLimitDetails): NextResponse {
  const status = outcome === "unauthenticated" ? 401
    : outcome === "forbidden" ? 403
      : outcome === "rate_or_budget_limited" ? 429
        : outcome === "stale_event" || outcome === "not_ready" ? 409
          : outcome === "invalid_request" ? 400
            : outcome === "invalid_response" || outcome === "input_too_large" ? 502
              : outcome === "timeout" || outcome === "cancelled" ? 504
                : 503;
  return NextResponse.json({ ok: false, outcome,
    ...(status === 429 && limitDetails ? limitDetails : {}) }, { status, headers: privateHeaders });
}
