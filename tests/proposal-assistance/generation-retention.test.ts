import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../src/server/db/generated/client";

vi.mock("server-only", () => ({}));

import { generationUsageRetentionJobEnabled } from "../../src/server/ai/generation-retention-config";
import { runGenerationUsageRetentionSweep } from "../../src/server/ai/generation-retention";

const preview = {
  TURNUP_ENVIRONMENT: "preview",
  DATABASE_ENVIRONMENT: "non-production",
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "preview",
  DATABASE_URL: "postgresql://synthetic:synthetic@ep-preview-pooler.us-east-1.aws.neon.tech/synthetic?sslmode=require",
};

type QueryCall = { sql: string; values: unknown[] };

function database(options: {
  gateRows?: Array<{ active_reservation_id: string | null; active_environment: string | null; active_status: string | null }>;
  counts?: number[];
} = {}) {
  const calls: QueryCall[] = [];
  let countIndex = 0;
  const transaction = {
    $queryRaw: async <T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T> => {
      const sql = strings.join("?");
      calls.push({ sql, values });
      if (sql.includes("FOR UPDATE OF gate")) {
        return (options.gateRows ?? [{ active_reservation_id: null, active_environment: null, active_status: null }]) as T;
      }
      return [{ count: options.counts?.[countIndex++] ?? 0 }] as T;
    },
  };
  const db = {
    $transaction: async <T>(work: (tx: typeof transaction) => Promise<T>): Promise<T> => work(transaction),
  } as unknown as PrismaClient;
  return { db, calls };
}

beforeEach(() => vi.stubEnv("NODE_ENV", "production"));
afterEach(() => vi.unstubAllEnvs());

describe("hosted generation accounting retention", () => {
  it("runs only after an exact opt-in and a validated hosted environment/database pair", () => {
    expect(generationUsageRetentionJobEnabled({ ...preview })).toBe(false);
    expect(generationUsageRetentionJobEnabled({ ...preview, GENERATION_USAGE_RETENTION_ENABLED: "True" })).toBe(false);
    expect(generationUsageRetentionJobEnabled({ ...preview, GENERATION_USAGE_RETENTION_ENABLED: "true" })).toBe(true);
    expect(generationUsageRetentionJobEnabled({
      ...preview,
      GENERATION_USAGE_RETENTION_ENABLED: "true",
      VERCEL_ENV: "production",
    })).toBe(false);
    expect(generationUsageRetentionJobEnabled({
      TURNUP_ENVIRONMENT: "development",
      DATABASE_ENVIRONMENT: "non-production",
      NODE_ENV: "development",
      GENERATION_USAGE_RETENTION_ENABLED: "true",
    })).toBe(false);
  });

  it("counts one bounded dry-run batch using database SGT dates for only the selected environment", async () => {
    const { db, calls } = database({ counts: [2, 1] });
    await expect(runGenerationUsageRetentionSweep(db, "preview", { dryRun: true })).resolves.toEqual({
      ok: true,
      reservations: 2,
      dailyUsageRows: 1,
    });
    expect(calls).toHaveLength(3);
    expect(calls[0]?.values).toContain("PREVIEW");
    for (const call of calls.slice(1)) {
      expect(call.values).toContain("PREVIEW");
      expect(call.values).toContain(100);
      expect(call.sql).toContain("clock_timestamp() AT TIME ZONE 'Asia/Singapore'");
      expect(call.sql).toContain("SKIP LOCKED");
    }
    expect(calls[1]?.sql).toContain("'COMPLETED'::\"generation_reservation_status\"");
    expect(calls[1]?.sql).toContain("'RECOVERED'::\"generation_reservation_status\"");
    expect(calls[1]?.sql).toContain("NOT EXISTS (");
    expect(calls[2]?.sql).toContain("NOT EXISTS (");
  });

  it("deletes only settled old reservations and counters with no reservations in the selected environment", async () => {
    const { db, calls } = database({ counts: [4, 3] });
    await expect(runGenerationUsageRetentionSweep(db, "production")).resolves.toEqual({
      ok: true,
      reservations: 4,
      dailyUsageRows: 3,
    });
    expect(calls).toHaveLength(3);
    expect(calls[0]?.values).toContain("PRODUCTION");
    expect(calls[1]?.values).toContain("PRODUCTION");
    expect(calls[2]?.values).toContain("PRODUCTION");
    expect(calls[1]?.sql).toContain("DELETE FROM \"generation_reservation\"");
    expect(calls[1]?.sql).toContain("NOT EXISTS (");
    expect(calls[2]?.sql).toContain("DELETE FROM \"generation_daily_usage\"");
    expect(calls[2]?.sql).toContain("NOT EXISTS (");
  });

  it.each([
    { active_reservation_id: "reservation", active_environment: null, active_status: null },
    { active_reservation_id: "reservation", active_environment: "PRODUCTION", active_status: "UNCERTAIN" },
    { active_reservation_id: "reservation", active_environment: "PREVIEW", active_status: "COMPLETED" },
  ])("fails closed without deleting when the selected environment gate has a corrupt active pointer", async (gate) => {
    const { db, calls } = database({ gateRows: [gate] });
    await expect(runGenerationUsageRetentionSweep(db, "preview")).resolves.toEqual({ ok: false, outcome: "unavailable" });
    expect(calls).toHaveLength(1);
  });

  it("does not touch storage for an invalid runtime environment name", async () => {
    const { db, calls } = database();
    await expect(runGenerationUsageRetentionSweep(db, "staging" as never)).resolves.toEqual({ ok: false, outcome: "unavailable" });
    expect(calls).toHaveLength(0);
  });
});
