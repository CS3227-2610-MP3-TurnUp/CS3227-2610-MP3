import "server-only";

import { NextResponse } from "next/server";
import { AuthError } from "../auth/policy";
import { authConfig, requireOrigin } from "../auth/request-security";
import { presentedToken } from "../auth/session";
import { privateHeaders } from "../accounts/service";
import { EventError, exactKeys, object, uuid, version } from "../events/policy";
import { assertProposalEventAccess } from "./access";
import { admitProposalExtraction } from "./admission";
import { extractPdfPageText, MAX_PROPOSAL_PDF_BYTES } from "./pdf-text";
import { processProposalExtraction } from "./processor";
import { proposalCompletionAvailability, requestProposalCompletion } from "./transport";
import type { ProposalRevisions } from "../../features/proposal-assistance/types";

const maxMultipartBytes = MAX_PROPOSAL_PDF_BYTES + 128_000;
const multipartReadTimeoutMs = 15_000;

export function proposalAssistanceFailure(error: unknown): NextResponse {
  const status = error instanceof AuthError ? error.status : 503;
  return NextResponse.json({ ok: false, outcome: status === 409 ? "stale_event" : status === 404 ? "unavailable" : "unavailable" },
    { status, headers: privateHeaders });
}

function outcomeResponse(outcome: string): NextResponse {
  const status = outcome === "unauthenticated" ? 401
    : outcome === "forbidden" ? 403
      : outcome === "rate_or_budget_limited" ? 429
        : outcome === "stale_event" ? 409
        : outcome === "unsupported_file" ? 415
          : outcome === "file_too_large" || outcome === "too_many_pages" || outcome === "text_too_large" ? 413
            : outcome === "parser_timeout" || outcome === "timeout" || outcome === "cancelled" ? 504
              : outcome === "invalid_pdf" || outcome === "encrypted_pdf" || outcome === "empty_or_unreadable" ? 422
                : outcome === "invalid_request" ? 400
                  : outcome === "invalid_response" || outcome === "unsupported_evidence" || outcome === "input_too_large" ? 502
                    : 503;
  return NextResponse.json({ ok: false, outcome }, { status, headers: privateHeaders });
}

async function readBoundedMultipart(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.split(";", 1)[0]?.trim().toLowerCase() !== "multipart/form-data" || !/boundary=/i.test(contentType)) {
    throw new EventError(415, "Choose a PDF proposal.");
  }
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxMultipartBytes)) {
    throw new EventError(413, "The PDF request is too large.");
  }
  if (!request.body) throw new EventError(400, "Choose a PDF proposal.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;
  const cancelOnAbort = () => { cancelled = true; void reader.cancel().catch(() => {}); };
  request.signal.addEventListener("abort", cancelOnAbort, { once: true });
  try {
    const read = async () => {
      while (true) {
        if (cancelled || request.signal.aborted) throw new AuthError(408, "The request was cancelled.");
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxMultipartBytes) throw new EventError(413, "The PDF request is too large.");
        chunks.push(value);
      }
      const body = Buffer.concat(chunks);
      chunks.forEach((chunk) => chunk.fill(0));
      const boundedRequest = new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body,
      });
      try { return await boundedRequest.formData(); }
      finally { body.fill(0); }
    };
    return await Promise.race([read(), new Promise<FormData>((_, reject) => {
      timer = setTimeout(() => {
        cancelled = true;
        void reader.cancel().catch(() => {});
        reject(new AuthError(408, "The PDF upload took too long."));
      }, multipartReadTimeoutMs);
    })]);
  } catch (error) {
    if (error instanceof AuthError || error instanceof EventError) throw error;
    throw new EventError(400, "Send a valid PDF request.");
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", cancelOnAbort);
    void reader.cancel().catch(() => {});
    chunks.forEach((chunk) => chunk.fill(0));
  }
}

function parseMultipartVersion(value: FormDataEntryValue | null): number {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value)) throw new EventError(400, "Reload the event version.");
  const parsed = Number(value);
  return version(parsed);
}

function readRevisions(value: FormDataEntryValue | null): ProposalRevisions {
  if (typeof value !== "string" || value.length > 256) throw new EventError(400, "Reload the editor and try again.");
  let parsed: unknown;
  try { parsed = JSON.parse(value) as unknown; } catch { throw new EventError(400, "Reload the editor and try again."); }
  const input = object(parsed);
  exactKeys(input, ["source", "facts", "editor"]);
  const revisions: ProposalRevisions = {
    source: version(input.source),
    facts: version(input.facts),
    editor: version(input.editor),
  };
  return revisions;
}

export async function proposalExtraction(request: Request, rawId: string): Promise<NextResponse> {
  try {
    const id = uuid(rawId);
    const config = authConfig();
    requireOrigin(request, config);
    const token = presentedToken(request.headers, config);
    const { prisma } = await import("../db/client");

    // Check authority before accepting even a byte of the proposal body.
    const ownerId = await assertProposalEventAccess(prisma, token, id);
    const availability = proposalCompletionAvailability();
    if (!availability.available) return outcomeResponse(availability.outcome);
    await admitProposalExtraction(prisma, ownerId, config.secret);

    const form = await readBoundedMultipart(request);
    if ([...form.keys()].some((key) => !["file", "expectedVersion", "revisions"].includes(key)) ||
      form.getAll("file").length !== 1 || form.getAll("expectedVersion").length !== 1 || form.getAll("revisions").length !== 1) {
      throw new EventError(400, "Send one PDF and the current editor version.");
    }
    const expected = parseMultipartVersion(form.get("expectedVersion"));
    const revisions = readRevisions(form.get("revisions"));
    const file = form.get("file");
    if (!(file instanceof File)) throw new EventError(400, "Choose a PDF proposal.");

    await assertProposalEventAccess(prisma, token, id, expected);
    const textResult = await extractPdfPageText(file, request.signal);
    if (!textResult.ok) return outcomeResponse(textResult.outcome);

    // Revalidate immediately before model inference; no transaction spans parsing or provider work.
    const currentOwner = await assertProposalEventAccess(prisma, token, id, expected);
    if (currentOwner !== ownerId) throw new EventError(409, "The event owner changed. Reload and try again.");
    const result = await processProposalExtraction(
      textResult.pageTexts,
      (input) => requestProposalCompletion(input),
      request.signal,
    );
    if (!result.ok) return outcomeResponse(result.outcome);

    // A revoked session or changed/cancelled event discards this temporary result.
    await assertProposalEventAccess(prisma, token, id, expected);
    return NextResponse.json({ ok: true, revisions, extraction: result.value }, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof AuthError || error instanceof EventError) {
      const status = error.status;
      return NextResponse.json({ ok: false, outcome: status === 409 ? "stale_event" : status === 429 ? "rate_or_budget_limited" : status === 415 ? "unsupported_file" : status === 413 ? "file_too_large" : status === 403 ? "forbidden" : status === 401 ? "unauthenticated" : status === 408 ? "timeout" : "invalid_request" },
        { status, headers: privateHeaders });
    }
    return proposalAssistanceFailure(error);
  }
}
