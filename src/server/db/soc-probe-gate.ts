import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "./client";

export interface SoCProbeGateLimits {
  maxAttempts: number;
  maxInFlight: number;
  minIntervalMs: number;
  outputTokenBudget: number;
}

export type SoCProbeAdmission =
  | { status: "admitted"; reservationId: string }
  | { status: "limited" };

interface GateRow {
  attempt_count: bigint;
  in_flight_count: bigint;
  reserved_output_tokens: bigint;
  max_attempts_limit: bigint | null;
  max_in_flight_limit: bigint | null;
  min_interval_ms: bigint | null;
  output_token_budget: bigint | null;
}

interface DurableLimits {
  maxAttempts: number;
  maxInFlight: number;
  minIntervalMs: number;
  outputTokenBudget: number;
}

/**
 * Merge strictest configured limits and atomically reserve one shared attempt,
 * in-flight slot, minimum admission interval, and full per-request output-token
 * cap in Neon. Lower limits persist across deployments until operator reset.
 *
 * Attempt and token reservations are cumulative until operator recovery. A
 * database error is intentionally allowed to throw so callers fail closed.
 */
export async function admitSoCProbe(
  limits: SoCProbeGateLimits,
  outputTokens: number,
): Promise<SoCProbeAdmission> {
  assertNonProductionDatabase();
  assertLimits(limits, outputTokens);

  const reservationId = randomUUID();
  return prisma.$transaction(async (tx) => {
    // Serialize every instance on the singleton row. The effective policy and
    // counters are read under this lock, and committed together below.
    const rows = await tx.$queryRaw<GateRow[]>`
      SELECT
        "attempt_count",
        "in_flight_count",
        "reserved_output_tokens",
        "max_attempts_limit",
        "max_in_flight_limit",
        "min_interval_ms",
        "output_token_budget"
      FROM "soc_probe_gate"
      WHERE "id" = 1
      FOR UPDATE
    `;
    const row = rows[0];
    if (rows.length !== 1 || row === undefined) {
      throw new Error("SoC probe admission gate row is missing; apply the database migration.");
    }

    assertGateCounters(row);
    const effective = mergeDurableLimits(row, limits);
    const intervalRows = await tx.$queryRaw<{ interval_elapsed: boolean }[]>`
      SELECT (
        "last_admission_at" IS NULL
        OR "last_admission_at" + make_interval(
          secs => ${effective.minIntervalMs}::double precision / 1000.0
        ) <= clock_timestamp()
      ) AS "interval_elapsed"
      FROM "soc_probe_gate"
      WHERE "id" = 1
    `;
    if (intervalRows.length !== 1 || intervalRows[0] === undefined) {
      throw new Error("SoC probe admission interval check returned an invalid result.");
    }

    const admitted =
      row.attempt_count < BigInt(effective.maxAttempts) &&
      row.in_flight_count < BigInt(effective.maxInFlight) &&
      row.reserved_output_tokens + BigInt(outputTokens) <= BigInt(effective.outputTokenBudget) &&
      intervalRows[0].interval_elapsed;

    // This is the only UPDATE of the singleton row in this transaction. Policy
    // ratchets even when this request is rejected, while counters change only
    // for an admitted request.
    const updated = await tx.$executeRaw`
      UPDATE "soc_probe_gate"
      SET
        "attempt_count" = "attempt_count" + CASE WHEN ${admitted} THEN 1 ELSE 0 END,
        "in_flight_count" = "in_flight_count" + CASE WHEN ${admitted} THEN 1 ELSE 0 END,
        "reserved_output_tokens" = "reserved_output_tokens" + CASE
          WHEN ${admitted} THEN ${BigInt(outputTokens)} ELSE 0 END,
        "last_admission_at" = CASE
          WHEN ${admitted} THEN clock_timestamp() ELSE "last_admission_at" END,
        "max_attempts_limit" = ${BigInt(effective.maxAttempts)},
        "max_in_flight_limit" = ${BigInt(effective.maxInFlight)},
        "min_interval_ms" = ${BigInt(effective.minIntervalMs)},
        "output_token_budget" = ${BigInt(effective.outputTokenBudget)}
      WHERE "id" = 1
    `;
    if (updated !== 1) {
      throw new Error("SoC probe admission gate update did not affect its singleton row.");
    }

    if (!admitted) return { status: "limited" };

    await tx.$executeRaw`
      INSERT INTO "soc_probe_reservation" ("id", "gate_id")
      VALUES (${reservationId}::uuid, 1)
    `;
    return { status: "admitted", reservationId };
  });
}

/**
 * Release only the named reservation. Deleting the lease and decrementing
 * the shared counter happen in one statement; duplicate/late releases no-op.
 */
export async function releaseSoCProbe(reservationId: string): Promise<void> {
  assertNonProductionDatabase();
  if (!uuidPattern.test(reservationId)) {
    throw new TypeError("SoC probe reservation ID must be a UUID.");
  }

  await prisma.$executeRaw`
    WITH released AS (
      DELETE FROM "soc_probe_reservation"
      WHERE "id" = ${reservationId}::uuid
      RETURNING "gate_id"
    )
    UPDATE "soc_probe_gate"
    SET "in_flight_count" = "in_flight_count" - 1
    FROM released
    WHERE "soc_probe_gate"."id" = released."gate_id"
      AND "soc_probe_gate"."in_flight_count" > 0
  `;
}

function assertNonProductionDatabase(): void {
  if (process.env.DATABASE_ENVIRONMENT !== "non-production") {
    throw new Error("SoC probe admission requires a non-production database label.");
  }
}

function assertLimits(limits: SoCProbeGateLimits, outputTokens: number): void {
  assertPositiveSafeInteger("maxAttempts", limits.maxAttempts);
  assertPositiveSafeInteger("maxInFlight", limits.maxInFlight);
  assertPositiveSafeInteger("minIntervalMs", limits.minIntervalMs);
  assertPositiveSafeInteger("outputTokenBudget", limits.outputTokenBudget);
  assertPositiveSafeInteger("outputTokens", outputTokens);
}

function assertGateCounters(row: GateRow): void {
  assertNonnegativeBigInt("attempt_count", row.attempt_count);
  assertNonnegativeBigInt("in_flight_count", row.in_flight_count);
  assertNonnegativeBigInt("reserved_output_tokens", row.reserved_output_tokens);

  const policyValues = [
    row.max_attempts_limit,
    row.max_in_flight_limit,
    row.min_interval_ms,
    row.output_token_budget,
  ];
  const nullPolicyValues = policyValues.filter((value) => value === null).length;
  if (nullPolicyValues !== 0 && nullPolicyValues !== policyValues.length) {
    throw new Error("SoC probe durable policy is incomplete; fail closed until operator recovery.");
  }
  for (const value of policyValues) {
    if (value !== null) assertPositiveBigInt("durable policy", value);
  }
}

function mergeDurableLimits(row: GateRow, incoming: SoCProbeGateLimits): DurableLimits {
  if (row.max_attempts_limit === null) return { ...incoming };

  return {
    maxAttempts: Math.min(incoming.maxAttempts, toSafeLimit("max_attempts_limit", row.max_attempts_limit)),
    maxInFlight: Math.min(incoming.maxInFlight, toSafeLimit("max_in_flight_limit", row.max_in_flight_limit!)),
    minIntervalMs: Math.max(incoming.minIntervalMs, toSafeLimit("min_interval_ms", row.min_interval_ms!)),
    outputTokenBudget: Math.min(
      incoming.outputTokenBudget,
      toSafeLimit("output_token_budget", row.output_token_budget!),
    ),
  };
}

function assertNonnegativeBigInt(name: string, value: bigint): void {
  if (typeof value !== "bigint" || value < 0n) {
    throw new Error(`SoC probe ${name} is invalid; fail closed until operator recovery.`);
  }
}

function assertPositiveBigInt(name: string, value: bigint): void {
  if (typeof value !== "bigint" || value <= 0n) {
    throw new Error(`SoC probe ${name} is invalid; fail closed until operator recovery.`);
  }
}

function toSafeLimit(name: string, value: bigint): number {
  const converted = Number(value);
  if (!Number.isSafeInteger(converted) || converted <= 0) {
    throw new Error(`SoC probe ${name} is outside the supported integer range; fail closed.`);
  }
  return converted;
}

function assertPositiveSafeInteger(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`SoC probe ${name} must be a positive safe integer.`);
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
