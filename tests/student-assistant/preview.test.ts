import { afterEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_SOURCE, SCENARIOS, simulateResponse } from "../../src/features/student-assistant/demo/scenarios";
import { validateAnswer } from "../../src/features/student-assistant/evidence";
vi.mock("server-only", () => ({}));
const gate = vi.hoisted(() => ({ notFound: vi.fn(() => { throw new Error("synthetic404"); }) }));
vi.mock("next/navigation", () => ({ notFound: gate.notFound }));
vi.mock("../../src/app/dev/student-assistant/preview", () => ({ StudentAssistantPreview: () => null }));
import PreviewPage from "../../src/app/dev/student-assistant/page";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.useRealTimers(); });
const identity = { eventId: SAMPLE_SOURCE.eventId, revision: SAMPLE_SOURCE.revision };

describe("isolated Student assistant preview", () => {
  it.each(["production", "test"])("returns notFound outside development: %s", async (env) => {
    vi.stubEnv("NODE_ENV", env); await expect(PreviewPage()).rejects.toThrow("synthetic404");
  });
  it("renders only in development", async () => {
    vi.stubEnv("NODE_ENV", "development"); expect(await PreviewPage()).toBeTruthy();
  });
  it.each(SCENARIOS)("simulates the labelled $id case without fetch", async (scenario) => {
    vi.useFakeTimers(); const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network forbidden in simulation"));
    const promise = simulateResponse(scenario.id, { requestId: "sample", ...identity, question: scenario.question }, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(900); const result = await promise;
    if (result.ok) {
      const validation = validateAnswer(result.candidate, SAMPLE_SOURCE);
      expect(validation.ok).toBe(scenario.id !== "bad_evidence");
    } else { expect(["timeout", "unavailable"]).toContain(scenario.id); }
    expect(network).not.toHaveBeenCalled();
  });
  it("never pretends to infer an answer to a freeform unmatched question", async () => {
    const result = await simulateResponse("answered", { requestId: "sample", ...identity, question: "Can you access a private roster?" }, new AbortController().signal, 0);
    expect(result).toEqual({ ok: false, reason: "preview_only" });
  });
  it("cancels pending simulation and clears its scheduled response", async () => {
    vi.useFakeTimers(); const controller = new AbortController();
    const promise = simulateResponse("answered", { requestId: "sample", ...identity, question: SCENARIOS[0].question }, controller.signal);
    controller.abort(); expect(await promise).toEqual({ ok: false, reason: "cancelled" }); expect(vi.getTimerCount()).toBe(0);
  });
});
