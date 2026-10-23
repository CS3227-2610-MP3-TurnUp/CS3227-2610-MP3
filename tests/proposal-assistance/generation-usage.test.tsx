import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GenerationUsageResponse } from "../../src/lib/generation-usage";
import { GenerationUsageIndicator, generationLimitMessage, useGenerationUsage } from "../../src/components/events/generation-usage";

const hookRuntime = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as Array<{ current: unknown }>,
  effects: [] as Array<() => unknown>,
  stateIndex: 0,
  refIndex: 0,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useCallback: <T,>(callback: T) => callback,
    useState: <T,>(initial: T | (() => T)) => {
      const index = hookRuntime.stateIndex++;
      if (!(index in hookRuntime.states)) hookRuntime.states[index] = typeof initial === "function" ? (initial as () => T)() : initial;
      const setState = (next: T | ((previous: T) => T)) => {
        const previous = hookRuntime.states[index] as T;
        hookRuntime.states[index] = typeof next === "function" ? (next as (value: T) => T)(previous) : next;
      };
      return [hookRuntime.states[index] as T, setState] as const;
    },
    useRef: <T,>(initial: T) => {
      const index = hookRuntime.refIndex++;
      if (!hookRuntime.refs[index]) hookRuntime.refs[index] = { current: initial };
      return hookRuntime.refs[index] as { current: T };
    },
    useEffect: (effect: () => unknown) => { hookRuntime.effects.push(effect); },
  };
});

const activeUsage: GenerationUsageResponse = {
  ok: true,
  status: "active",
  usage: {
    environment: "preview",
    timeZone: "Asia/Singapore",
    day: "2026-10-24",
    resetAt: "2026-10-24T16:00:00.000Z",
    attempts: { limit: 10, used: 3, remaining: 7 },
    outputTokens: { perRequest: 4_096, limit: 40_960, reserved: 12_288, remaining: 28_672 },
    inFlight: false,
    nextAllowedAt: null,
  },
};

beforeEach(() => {
  hookRuntime.states = [];
  hookRuntime.refs = [];
  hookRuntime.effects = [];
  hookRuntime.stateIndex = 0;
  hookRuntime.refIndex = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("generation usage presentation", () => {
  it("shows the shared per-organiser daily allowance and Singapore reset time", () => {
    const markup = renderToStaticMarkup(GenerationUsageIndicator({ state: { loading: false, response: activeUsage } }));
    expect(markup).toContain("7 of 10 generation attempts");
    expect(markup).toContain("28,672 of 40,960 reserved output tokens");
    expect(markup).toContain("shared by PDF extraction and FAQ suggestions");
    expect(markup).toContain("25 Oct 2026");
    expect(markup).toContain("SGT");
  });

  it("loads current usage without caching and does not fetch while disabled", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(activeUsage), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const state = useGenerationUsage(true);
    expect(state.loading).toBe(true);
    hookRuntime.effects[0]?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(fetchMock).toHaveBeenCalledWith("/api/organiser/ai-usage", { cache: "no-store", signal: expect.any(AbortSignal) });
    expect(hookRuntime.states[0]).toEqual(activeUsage);
    expect(hookRuntime.states[1]).toBe(false);

    hookRuntime.effects = [];
    hookRuntime.stateIndex = 0;
    hookRuntime.refIndex = 0;
    fetchMock.mockClear();
    const disabled = useGenerationUsage(false);
    hookRuntime.effects[0]?.();
    expect(disabled.loading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bounds a stalled advisory usage request and stops showing a pending check", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    useGenerationUsage(true);
    hookRuntime.effects[0]?.();

    await vi.advanceTimersByTimeAsync(5_000);

    const signal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal;
    expect(signal.aborted).toBe(true);
    expect(hookRuntime.states[0]).toBeNull();
    expect(hookRuntime.states[1]).toBe(false);
  });

  it("keeps local synthetic limits separate and explains the hosted hard guard", () => {
    const local = renderToStaticMarkup(GenerationUsageIndicator({
      state: { loading: false, response: { ok: true, status: "disabled", reason: "unsupported_environment", usage: null } },
    }));
    expect(local).toContain("Local synthetic generation uses separate limits");
    expect(local).not.toContain("10 generation attempts");
    expect(local).not.toContain("40,960");

    const hosted = renderToStaticMarkup(GenerationUsageIndicator({
      state: { loading: false, response: { ok: true, status: "disabled", reason: "hosted_generation_disabled", usage: null } },
    }));
    expect(hosted).toContain("Hosted AI generation is currently disabled");
    expect(hosted).not.toContain("10 generation attempts");
  });

  it("uses distinct wording for daily caps, environment admission and provider throttling", () => {
    const resetAt = "2026-10-24T16:00:00.000Z";
    expect(generationLimitMessage("daily_attempts", null, resetAt, activeUsage)).toContain("used today's 10 generation attempts");
    expect(generationLimitMessage("daily_tokens", null, resetAt, activeUsage)).toContain("reserved output-token allowance");
    expect(generationLimitMessage("environment_busy", null, null, activeUsage)).toContain("already in progress for this environment");
    expect(generationLimitMessage("spacing", "2026-10-23T16:00:00.000Z", null, activeUsage)).toContain("Try again at 24 Oct 2026");
    expect(generationLimitMessage("provider", null, null, activeUsage)).toContain("provider is rate limiting");
    expect(generationLimitMessage(undefined, null, null, null)).toContain("temporarily limited");
  });
});
