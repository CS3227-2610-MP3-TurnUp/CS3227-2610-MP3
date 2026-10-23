import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../src/server/db/generated/client";
import {
  hostedGenerationAvailability,
  requestHostedDailyCompletion,
  runHostedDailyCompletion,
  type HostedGenerationAdapter,
  type HostedProviderResult,
} from "../../src/server/ai/daily-generation-coordinator";

vi.mock("server-only", () => ({}));

const ownerId = "8f8a6b85-0f7e-4bf5-b468-90c8a249a2a0";
const input = { ownerId, system: "synthetic system", user: "synthetic user" };
const db = {} as PrismaClient;

function adapter(
  complete: HostedGenerationAdapter["complete"],
  availability: HostedGenerationAdapter["availability"] = () => ({
    available: true,
    maxInputBytes: 65_536,
    outputTokens: 4_096,
  }),
): HostedGenerationAdapter {
  return { availability, complete };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("hosted daily-generation coordinator", () => {
  it("keeps runtime availability and requests hard-disabled without an activation setting", async () => {
    vi.stubEnv("HOSTED_DAILY_GENERATION_ENABLED", "true");
    expect(hostedGenerationAvailability()).toEqual({ available: false, outcome: "disabled" });
    await expect(requestHostedDailyCompletion(input)).resolves.toEqual({ ok: false, outcome: "disabled" });
  });

  it("fails provider preflight before reservation when configuration is absent", async () => {
    const executor = vi.fn();
    const provider = adapter(vi.fn(), () => ({ available: false, outcome: "not_configured" }));
    const result = await runHostedDailyCompletion(db, "preview", input, provider, executor as never);
    expect(result).toEqual({ ok: false, outcome: "not_configured" });
    expect(executor).not.toHaveBeenCalled();
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("fails closed on an incompatible provider profile before reservation", async () => {
    const executor = vi.fn();
    const provider = adapter(vi.fn(), () => ({
      available: true,
      maxInputBytes: 65_537,
      outputTokens: 4_096,
    }));
    const result = await runHostedDailyCompletion(db, "production", input, provider, executor as never);
    expect(result).toEqual({ ok: false, outcome: "invalid_configuration" });
    expect(executor).not.toHaveBeenCalled();
  });

  it("passes only server-supplied owner/environment to the gate and marks immediately before provider send", async () => {
    const order: string[] = [];
    const providerResult: HostedProviderResult = { ok: true, text: "synthetic result", finishReason: "stop" };
    const provider = adapter(async (_input, dispatch) => dispatch(async () => {
      order.push("provider-send");
      return providerResult;
    }));
    const execute = vi.fn(async (
      _db: PrismaClient | undefined,
      admission: { enabled: boolean; ownerId: string; environment: "preview" | "production" },
      dispatch: (mark: () => Promise<void>) => Promise<HostedProviderResult>,
      isAmbiguous: (result: HostedProviderResult) => boolean,
    ) => {
      order.push("reserve");
      expect(admission).toEqual({ enabled: true, ownerId, environment: "preview" });
      const value = await dispatch(async () => { order.push("dispatch-marker"); });
      expect(isAmbiguous(value)).toBe(false);
      return { ok: true as const, value };
    });

    await expect(runHostedDailyCompletion(db, "preview", input, provider, execute)).resolves.toEqual({
      ok: true,
      text: "synthetic result",
      finishReason: "stop",
    });
    expect(order).toEqual(["reserve", "dispatch-marker", "provider-send"]);
  });

  it("propagates daily limit metadata without converting it to a provider limit", async () => {
    const provider = adapter(vi.fn());
    const execute = vi.fn(async () => ({
      ok: false as const,
      outcome: "rate_or_budget_limited" as const,
      limitReason: "daily_tokens" as const,
      retryAt: null,
      resetAt: "2026-10-24T16:00:00.000Z",
    }));
    await expect(runHostedDailyCompletion(db, "preview", input, provider, execute as never)).resolves.toEqual({
      ok: false,
      outcome: "rate_or_budget_limited",
      limitDetails: {
        limitReason: "daily_tokens",
        retryAt: null,
        resetAt: "2026-10-24T16:00:00.000Z",
      },
    });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it.each(["timeout", "cancelled"] as const)("treats %s as ambiguous after dispatch even without an optional hint", async (outcome) => {
    const provider = adapter(async (_input, dispatch) => dispatch(async () => ({ ok: false as const, outcome })));
    const execute = vi.fn(async (
      _db: PrismaClient | undefined,
      _admission: unknown,
      dispatch: (mark: () => Promise<void>) => Promise<HostedProviderResult>,
      isAmbiguous: (result: HostedProviderResult) => boolean,
    ) => {
      const value = await dispatch(async () => {});
      expect(isAmbiguous(value)).toBe(true);
      return { ok: true as const, value };
    });
    await expect(runHostedDailyCompletion(db, "preview", input, provider, execute)).resolves.toEqual({
      ok: false,
      outcome,
    });
  });

  it("treats unavailable transport failures as uncertain but bounded HTTP failures as definitive", async () => {
    const provider = adapter(vi.fn());
    const execute = vi.fn(async (
      _db: PrismaClient | undefined,
      _admission: unknown,
      _dispatch: (mark: () => Promise<void>) => Promise<HostedProviderResult>,
      isAmbiguous: (result: HostedProviderResult) => boolean,
    ) => {
      expect(isAmbiguous({ ok: false, outcome: "unavailable" })).toBe(true);
      expect(isAmbiguous({ ok: false, outcome: "unavailable", failureSource: "transport" })).toBe(true);
      expect(isAmbiguous({ ok: false, outcome: "unavailable", failureSource: "http_response" })).toBe(false);
      return { ok: false as const, outcome: "unavailable" as const };
    });
    await expect(runHostedDailyCompletion(db, "preview", input, provider, execute)).resolves.toEqual({
      ok: false,
      outcome: "unavailable",
    });
  });
});
