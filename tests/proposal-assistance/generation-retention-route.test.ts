import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  authorized: vi.fn(),
  environment: vi.fn(),
  enabled: vi.fn(),
  dbImport: vi.fn(),
  sweep: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../../src/server/events/retention-config", () => ({ authorizedCronRequest: mocked.authorized }));
vi.mock("../../src/server/ai/daily-generation-config", () => ({ readDailyGenerationEnvironment: mocked.environment }));
vi.mock("../../src/server/ai/generation-retention-config", () => ({ generationUsageRetentionJobEnabled: mocked.enabled }));
vi.mock("../../src/server/db/client", () => {
  mocked.dbImport();
  return { prisma: { synthetic: true } };
});
vi.mock("../../src/server/ai/generation-retention", () => ({ runGenerationUsageRetentionSweep: mocked.sweep }));

import { GET } from "../../src/app/api/internal/generation-usage-retention/route";

const supportedEnvironment = { status: "supported" as const, environment: "preview" as const };

beforeEach(() => {
  vi.clearAllMocks();
  mocked.authorized.mockReturnValue(true);
  mocked.environment.mockReturnValue(supportedEnvironment);
  mocked.enabled.mockReturnValue(true);
  mocked.sweep.mockResolvedValue({ ok: true, reservations: 2, dailyUsageRows: 1 });
});

describe("generation usage retention operator route", () => {
  it("authenticates and checks the default-off guard before importing the database", async () => {
    mocked.authorized.mockReturnValue(false);
    const response = await GET(new Request("https://turnup.example/api/internal/generation-usage-retention"));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, outcome: "unavailable" });
    expect(mocked.dbImport).not.toHaveBeenCalled();

    mocked.authorized.mockReturnValue(true);
    mocked.enabled.mockReturnValue(false);
    const disabled = await GET(new Request("https://turnup.example/api/internal/generation-usage-retention"));
    expect(disabled.status).toBe(404);
    expect(mocked.dbImport).not.toHaveBeenCalled();
  });

  it("rejects malformed query options before importing the database", async () => {
    const response = await GET(new Request("https://turnup.example/api/internal/generation-usage-retention?dryRun=no"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, outcome: "invalid_request" });
    expect(mocked.dbImport).not.toHaveBeenCalled();
    expect(mocked.sweep).not.toHaveBeenCalled();
  });

  it("defaults to a read-only bounded preview report and exposes aggregate counts only", async () => {
    const response = await GET(new Request("https://turnup.example/api/internal/generation-usage-retention", {
      headers: { authorization: "Bearer synthetic-secret" },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("vary")).toBe("Authorization");
    expect(await response.json()).toEqual({ ok: true, dryRun: true, reservations: 2, dailyUsageRows: 1 });
    expect(mocked.dbImport).toHaveBeenCalledOnce();
    expect(mocked.sweep).toHaveBeenCalledWith({ synthetic: true }, "preview", { dryRun: true });
  });

  it("requires an explicit dryRun=false before requesting deletion", async () => {
    const response = await GET(new Request("https://turnup.example/api/internal/generation-usage-retention?dryRun=false"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, dryRun: false });
    expect(mocked.sweep).toHaveBeenCalledWith({ synthetic: true }, "preview", { dryRun: false });
  });

  it("fails closed if the current deployment environment is unsupported", async () => {
    mocked.environment.mockReturnValue({ status: "invalid" });
    const response = await GET(new Request("https://turnup.example/api/internal/generation-usage-retention"));
    expect(response.status).toBe(404);
    expect(mocked.dbImport).not.toHaveBeenCalled();
    expect(mocked.sweep).not.toHaveBeenCalled();
  });
});
