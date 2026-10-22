import "server-only";

import { parseExtractionJsonResponse } from "../../features/proposal-assistance/json-extraction-validation";
import type { PrivateExtraction } from "../../features/proposal-assistance/types";
import { buildExtractionInput } from "./prompts";
import type { ProposalCompletionResult } from "./transport";

export type ProposalCompletion = (input: { system: string; user: string; signal?: AbortSignal }) => Promise<ProposalCompletionResult>;
export type ProcessingResult<T> = { ok: true; value: T } | { ok: false; outcome: string };

export async function processProposalExtraction(
  pageTexts: readonly string[],
  complete: ProposalCompletion,
  signal?: AbortSignal,
  maxInputBytes = 65_536,
): Promise<ProcessingResult<PrivateExtraction>> {
  if (pageTexts.length < 1 || pageTexts.length > 20) return { ok: false, outcome: "invalid_request" };
  const input = buildExtractionInput(pageTexts);
  const encoder = new TextEncoder();
  if (encoder.encode(input.system).byteLength + encoder.encode(input.user).byteLength > maxInputBytes) {
    return { ok: false, outcome: "input_too_large" };
  }
  const completion = await complete({ ...input, ...(signal ? { signal } : {}) });
  if (!completion.ok) return { ok: false, outcome: completion.outcome };
  const parsed = parseExtractionJsonResponse(completion.text, pageTexts, completion.finishReason);
  return parsed.ok ? parsed : { ok: false, outcome: parsed.outcome };
}
