import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const dbMock = vi.hoisted(() => ({ loaded: vi.fn() }));
vi.mock("../../src/server/db/client", () => { dbMock.loaded(); return { prisma: {} }; });
import { GET } from "../../src/app/api/internal/draft-retention/route";
import { authorizedCronRequest, draftRetentionJobEnabled } from "../../src/server/events/retention-config";

afterEach(() => { vi.unstubAllEnvs(); dbMock.loaded.mockClear(); });

it("fails closed before database import when disabled, unauthorized, or malformed", async () => {
  vi.stubEnv("DRAFT_RETENTION_ENABLED", "false");
  vi.stubEnv("CRON_SECRET", "a".repeat(40));
  vi.stubEnv("TURNUP_ENVIRONMENT", "development"); vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("DATABASE_ENVIRONMENT", "non-production"); vi.stubEnv("VERCEL_ENV", "development");
  const disabled = await GET(new Request("https://turnup.invalid/api/internal/draft-retention"));
  expect(disabled.status).toBe(404);
  vi.stubEnv("DRAFT_RETENTION_ENABLED", "true");
  const unauthorized = await GET(new Request("https://turnup.invalid/api/internal/draft-retention"));
  expect(unauthorized.status).toBe(404);
  const malformed = await GET(new Request("https://turnup.invalid/api/internal/draft-retention?dryRun=true&dryRun=false", {
    headers: { authorization: `Bearer ${"a".repeat(40)}` },
  }));
  expect(malformed.status).toBe(400);
  expect(dbMock.loaded).not.toHaveBeenCalled();
});

it("requires exact environment pairing and a constant-time bearer secret match", () => {
  const secret = "s".repeat(40);
  expect(draftRetentionJobEnabled({ DRAFT_RETENTION_ENABLED: "true", TURNUP_ENVIRONMENT: "development", NODE_ENV: "development", DATABASE_ENVIRONMENT: "non-production" })).toBe(true);
  expect(draftRetentionJobEnabled({ DRAFT_RETENTION_ENABLED: "true", TURNUP_ENVIRONMENT: "production", NODE_ENV: "production", DATABASE_ENVIRONMENT: "non-production", VERCEL_ENV: "production" })).toBe(false);
  expect(draftRetentionJobEnabled({ DRAFT_RETENTION_ENABLED: "true", TURNUP_ENVIRONMENT: "preview", NODE_ENV: "production", DATABASE_ENVIRONMENT: "non-production", VERCEL_ENV: "preview" })).toBe(true);
  expect(draftRetentionJobEnabled({ DRAFT_RETENTION_ENABLED: "true", TURNUP_ENVIRONMENT: "production", NODE_ENV: "production", DATABASE_ENVIRONMENT: "production", VERCEL_ENV: "production" })).toBe(true);
  expect(authorizedCronRequest(new Request("https://turnup.invalid", { headers: { authorization: `Bearer ${secret}` } }), secret)).toBe(true);
  expect(authorizedCronRequest(new Request("https://turnup.invalid", { headers: { authorization: `Bearer ${secret}` } }), "short")).toBe(false);
  expect(authorizedCronRequest(new Request("https://turnup.invalid", { headers: { authorization: `bearer ${secret}` } }), secret)).toBe(false);
});
