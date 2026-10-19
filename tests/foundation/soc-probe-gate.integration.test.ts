import { loadEnvConfig } from "@next/env";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readRuntimeDatabaseConfig } from "../../src/server/config/environment";
import type { SoCProbeAdmission } from "../../src/server/db/soc-probe-gate";

if (
  process.env.RUN_FOUNDATION_DB_INTEGRATION !== "1" ||
  process.env.RUN_SOC_PROBE_GATE_DB_INTEGRATION !== "1"
) {
  throw new Error(
    "Set both database integration opt-in flags to run this destructive test against its dedicated disposable database.",
  );
}

loadEnvConfig(process.cwd(), true);
const runtimeConfig = readRuntimeDatabaseConfig(process.env);
if (
  runtimeConfig.turnupEnvironment !== "development" ||
  runtimeConfig.databaseEnvironment !== "non-production" ||
  process.env.VERCEL_ENV !== undefined
) {
  throw new Error("SoC probe gate integration tests require local development labels and refuse Preview/Production.");
}
const testDatabaseName = "turnup_soc_probe_gate_test";
const markedDatabaseName = process.env.SOC_PROBE_GATE_TEST_DATABASE_NAME;
const configuredDatabaseName = decodeURIComponent(new URL(runtimeConfig.databaseUrl).pathname.slice(1));
if (markedDatabaseName !== testDatabaseName || configuredDatabaseName !== testDatabaseName) {
  throw new Error(
    `SoC probe gate integration tests may reset only the explicitly marked ${testDatabaseName} database.`,
  );
}

const pause = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs));

describe("durable SoC probe admission gate", () => {
  let prisma: typeof import("../../src/server/db/client").prisma | undefined;
  let admitSoCProbe: typeof import("../../src/server/db/soc-probe-gate").admitSoCProbe;
  let releaseSoCProbe: typeof import("../../src/server/db/soc-probe-gate").releaseSoCProbe;

  beforeAll(async () => {
    prisma = (await import("../../src/server/db/client")).prisma;
    ({ admitSoCProbe, releaseSoCProbe } = await import("../../src/server/db/soc-probe-gate"));
  });

  beforeEach(async () => resetGate());
  afterAll(async () => {
    try {
      await resetGate();
    } finally {
      await prisma?.$disconnect();
    }
  });

  it("admits a burst within the shared in-flight cap and releases only the named lease", async () => {
    const limits = {
      maxAttempts: 20,
      maxInFlight: 3,
      minIntervalMs: 1,
      outputTokenBudget: 1_000,
    };
    const results = await Promise.all(
      Array.from({ length: 16 }, () => admitSoCProbe(limits, 25)),
    );
    const reservations = results.filter(
      (result): result is Extract<SoCProbeAdmission, { status: "admitted" }> =>
        result.status === "admitted",
    );

    expect(reservations.length).toBeGreaterThan(0);
    expect(reservations.length).toBeLessThanOrEqual(limits.maxInFlight);
    expect(new Set(reservations.map(({ reservationId }) => reservationId)).size).toBe(
      reservations.length,
    );
    expect(await readGateState()).toEqual({
      attempt_count: BigInt(reservations.length),
      in_flight_count: BigInt(reservations.length),
      reserved_output_tokens: BigInt(reservations.length * 25),
      reservation_count: BigInt(reservations.length),
    });

    if (reservations.length >= 2) {
      const [first, second] = reservations;
      await releaseSoCProbe(first!.reservationId);
      await releaseSoCProbe(first!.reservationId);
      expect(await readGateState()).toEqual({
        attempt_count: BigInt(reservations.length),
        in_flight_count: BigInt(reservations.length - 1),
        reserved_output_tokens: BigInt(reservations.length * 25),
        reservation_count: BigInt(reservations.length - 1),
      });
      expect(await reservationExists(second!.reservationId)).toBe(true);
    }

    await Promise.all(reservations.map(({ reservationId }) => releaseSoCProbe(reservationId)));
    expect((await readGateState()).in_flight_count).toBe(0n);
  });

  it("enforces the attempt and cumulative output-token budgets after release", async () => {
    const limits = {
      maxAttempts: 1,
      maxInFlight: 1,
      minIntervalMs: 1,
      outputTokenBudget: 20,
    };
    const first = await admitSoCProbe(limits, 20);
    expect(first.status).toBe("admitted");
    if (first.status !== "admitted") return;
    await releaseSoCProbe(first.reservationId);
    await pause(10);

    await expect(admitSoCProbe(limits, 20)).resolves.toEqual({ status: "limited" });
    expect(await readGateState()).toEqual({
      attempt_count: 1n,
      in_flight_count: 0n,
      reserved_output_tokens: 20n,
      reservation_count: 0n,
    });
  });

  it("does not let a duplicate release decrement a different active lease", async () => {
    const limits = {
      maxAttempts: 4,
      maxInFlight: 2,
      minIntervalMs: 1,
      outputTokenBudget: 200,
    };
    const first = await admitSoCProbe(limits, 20);
    expect(first.status).toBe("admitted");
    if (first.status !== "admitted") return;
    await pause(10);
    const second = await admitSoCProbe(limits, 20);
    expect(second.status).toBe("admitted");
    if (second.status !== "admitted") return;

    await releaseSoCProbe(first.reservationId);
    await releaseSoCProbe(first.reservationId);
    expect(await readGateState()).toEqual({
      attempt_count: 2n,
      in_flight_count: 1n,
      reserved_output_tokens: 40n,
      reservation_count: 1n,
    });
    expect(await reservationExists(second.reservationId)).toBe(true);
  });

  it("enforces the minimum interval using database time", async () => {
    const limits = {
      maxAttempts: 4,
      maxInFlight: 2,
      minIntervalMs: 60_000,
      outputTokenBudget: 200,
    };
    const first = await admitSoCProbe(limits, 20);
    expect(first.status).toBe("admitted");

    await expect(admitSoCProbe(limits, 20)).resolves.toEqual({ status: "limited" });
    expect((await readGateState()).attempt_count).toBe(1n);
  });

  it("enforces the in-flight limit and admits again after the exact lease is released", async () => {
    const limits = {
      maxAttempts: 4,
      maxInFlight: 1,
      minIntervalMs: 1,
      outputTokenBudget: 200,
    };
    const first = await admitSoCProbe(limits, 20);
    expect(first.status).toBe("admitted");
    if (first.status !== "admitted") return;

    await pause(10);
    await expect(admitSoCProbe(limits, 20)).resolves.toEqual({ status: "limited" });
    await releaseSoCProbe(first.reservationId);
    await pause(10);
    const second = await admitSoCProbe(limits, 20);
    expect(second.status).toBe("admitted");
    if (second.status === "admitted") await releaseSoCProbe(second.reservationId);
  });

  it("enforces aggregate reserved output tokens even after a completed attempt", async () => {
    const limits = {
      maxAttempts: 4,
      maxInFlight: 2,
      minIntervalMs: 1,
      outputTokenBudget: 25,
    };
    const first = await admitSoCProbe(limits, 20);
    expect(first.status).toBe("admitted");
    if (first.status !== "admitted") return;
    await releaseSoCProbe(first.reservationId);
    await pause(10);

    await expect(admitSoCProbe(limits, 20)).resolves.toEqual({ status: "limited" });
    expect((await readGateState()).reserved_output_tokens).toBe(20n);
  });

  it("latches tighter policy from a limited request and never lets later values loosen it", async () => {
    const higher = {
      maxAttempts: 10,
      maxInFlight: 4,
      minIntervalMs: 1,
      outputTokenBudget: 500,
    };
    const first = await admitSoCProbe(higher, 100);
    expect(first.status).toBe("admitted");
    if (first.status !== "admitted") return;
    await releaseSoCProbe(first.reservationId);
    await pause(10);

    const tighter = {
      maxAttempts: 1,
      maxInFlight: 1,
      minIntervalMs: 60_000,
      outputTokenBudget: 50,
    };
    // The full per-request reservation cannot fit. This denied request still
    // latches all four stricter policy values in the shared singleton row.
    await expect(admitSoCProbe(tighter, 100)).resolves.toEqual({ status: "limited" });
    expect(await readGatePolicy()).toEqual({
      max_attempts_limit: 1n,
      max_in_flight_limit: 1n,
      min_interval_ms: 60_000n,
      output_token_budget: 50n,
    });

    await expect(admitSoCProbe(higher, 25)).resolves.toEqual({ status: "limited" });
    expect(await readGatePolicy()).toEqual({
      max_attempts_limit: 1n,
      max_in_flight_limit: 1n,
      min_interval_ms: 60_000n,
      output_token_budget: 50n,
    });
    expect((await readGateState()).attempt_count).toBe(1n);
  });

  async function resetGate(): Promise<void> {
    if (!prisma) return;
    await prisma.$executeRaw`
      WITH removed AS (
        DELETE FROM "soc_probe_reservation" WHERE "gate_id" = 1 RETURNING "id"
      )
      UPDATE "soc_probe_gate"
      SET
        "attempt_count" = 0,
        "in_flight_count" = 0,
        "reserved_output_tokens" = 0,
        "last_admission_at" = NULL,
        "max_attempts_limit" = NULL,
        "max_in_flight_limit" = NULL,
        "min_interval_ms" = NULL,
        "output_token_budget" = NULL
      WHERE "id" = 1
    `;
  }

  async function readGateState(): Promise<{
    attempt_count: bigint;
    in_flight_count: bigint;
    reserved_output_tokens: bigint;
    reservation_count: bigint;
  }> {
    if (!prisma) throw new Error("Integration database is not initialized.");
    const rows = await prisma.$queryRaw<{
      attempt_count: bigint;
      in_flight_count: bigint;
      reserved_output_tokens: bigint;
      reservation_count: bigint;
    }[]>`
      SELECT
        gate."attempt_count",
        gate."in_flight_count",
        gate."reserved_output_tokens",
        (SELECT count(*) FROM "soc_probe_reservation" WHERE "gate_id" = 1) AS "reservation_count"
      FROM "soc_probe_gate" AS gate
      WHERE gate."id" = 1
    `;
    if (rows.length !== 1 || rows[0] === undefined) {
      throw new Error("Synthetic SoC probe gate singleton row is missing.");
    }
    return rows[0];
  }

  async function reservationExists(reservationId: string): Promise<boolean> {
    if (!prisma) throw new Error("Integration database is not initialized.");
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM "soc_probe_reservation" WHERE "id" = ${reservationId}::uuid
      ) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }

  async function readGatePolicy(): Promise<{
    max_attempts_limit: bigint | null;
    max_in_flight_limit: bigint | null;
    min_interval_ms: bigint | null;
    output_token_budget: bigint | null;
  }> {
    if (!prisma) throw new Error("Integration database is not initialized.");
    const rows = await prisma.$queryRaw<{
      max_attempts_limit: bigint | null;
      max_in_flight_limit: bigint | null;
      min_interval_ms: bigint | null;
      output_token_budget: bigint | null;
    }[]>`
      SELECT
        "max_attempts_limit",
        "max_in_flight_limit",
        "min_interval_ms",
        "output_token_budget"
      FROM "soc_probe_gate"
      WHERE "id" = 1
    `;
    if (rows.length !== 1 || rows[0] === undefined) {
      throw new Error("Synthetic SoC probe gate singleton row is missing.");
    }
    return rows[0];
  }
});
