import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../db/generated/client";
import {
  DAILY_GENERATION_ATTEMPT_LIMIT,
  DAILY_GENERATION_MIN_INTERVAL_MS,
  DAILY_GENERATION_TIME_ZONE,
  DAILY_GENERATION_TOKEN_LIMIT,
  DAILY_GENERATION_TOKENS_PER_ATTEMPT,
  type GenerationLimitDetails,
  type GenerationUsageEnvironment,
  type GenerationUsageSnapshot,
} from "../../lib/generation-usage";

type Transaction = Prisma.TransactionClient;
type EnvironmentDb = "PREVIEW" | "PRODUCTION";
type GenerationGate = {
  active_reservation_id: string | null;
  active_status: string | null;
  last_dispatch_at: Date | null;
};
type DatabaseClock = { now: Date; day: string; reset_at: Date };
type UsageRow = { attempt_count: number; reserved_output_tokens: number };
type ReservationRow = {
  id: string;
  owner_id: string;
  sgt_day: string;
  status: string;
};

export type DailyGenerationAdmission =
  | { status: "reserved"; reservationId: string; day: string; resetAt: string }
  | { status: "limited"; details: GenerationLimitDetails }
  | { status: "unavailable" };

export type DailyGenerationExecution<T> =
  | { ok: true; value: T }
  | { ok: false; outcome: "disabled" | "cancelled" | "unavailable" }
  | ({ ok: false; outcome: "rate_or_budget_limited" } & GenerationLimitDetails);

export async function reserveDailyGeneration(
  db: PrismaClient,
  ownerId: string,
  environment: GenerationUsageEnvironment,
): Promise<DailyGenerationAdmission> {
  if (!isUuid(ownerId)) return { status: "unavailable" };
  const dbEnvironment = toDatabaseEnvironment(environment);
  const reservationId = randomUUID();

  try {
    return await db.$transaction(async (tx) => {
      const gate = await lockEnvironmentGate(tx, dbEnvironment);
      const clock = await readDatabaseClock(tx);
      await ensureDailyUsage(tx, dbEnvironment, ownerId, clock.day);
      const usage = await lockDailyUsage(tx, dbEnvironment, ownerId, clock.day);
      assertUsageCounters(usage);
      assertEnvironmentGate(gate);

      const resetAt = clock.reset_at.toISOString();
      if (usage.attempt_count >= DAILY_GENERATION_ATTEMPT_LIMIT) {
        return { status: "limited", details: { limitReason: "daily_attempts", retryAt: null, resetAt } };
      }
      if (usage.reserved_output_tokens + DAILY_GENERATION_TOKENS_PER_ATTEMPT > DAILY_GENERATION_TOKEN_LIMIT) {
        return { status: "limited", details: { limitReason: "daily_tokens", retryAt: null, resetAt } };
      }
      if (gate.active_reservation_id !== null) {
        return { status: "limited", details: { limitReason: "environment_busy", retryAt: null, resetAt } };
      }
      const nextAllowedAt = gate.last_dispatch_at === null
        ? null
        : new Date(gate.last_dispatch_at.getTime() + DAILY_GENERATION_MIN_INTERVAL_MS);
      if (nextAllowedAt !== null && nextAllowedAt.getTime() > clock.now.getTime()) {
        return { status: "limited", details: { limitReason: "spacing", retryAt: nextAllowedAt.toISOString(), resetAt } };
      }

      const incremented = await tx.$executeRaw`
        UPDATE "generation_daily_usage"
        SET "attempt_count" = "attempt_count" + 1,
            "reserved_output_tokens" = "reserved_output_tokens" + ${DAILY_GENERATION_TOKENS_PER_ATTEMPT}
        WHERE "environment" = ${dbEnvironment}::"generation_environment"
          AND "owner_id" = ${ownerId}::uuid
          AND "sgt_day" = ${clock.day}::date
          AND "attempt_count" = ${usage.attempt_count}
          AND "reserved_output_tokens" = ${usage.reserved_output_tokens}
      `;
      if (incremented !== 1) throw new Error("Daily generation counter changed during locked admission.");

      await tx.$executeRaw`
        INSERT INTO "generation_reservation"
          ("id", "environment", "owner_id", "sgt_day", "reserved_output_tokens", "status")
        VALUES (
          ${reservationId}::uuid,
          ${dbEnvironment}::"generation_environment",
          ${ownerId}::uuid,
          ${clock.day}::date,
          ${DAILY_GENERATION_TOKENS_PER_ATTEMPT},
          'RESERVED'::"generation_reservation_status"
        )
      `;
      const activated = await tx.$executeRaw`
        UPDATE "generation_environment_gate"
        SET "active_reservation_id" = ${reservationId}::uuid
        WHERE "environment" = ${dbEnvironment}::"generation_environment"
          AND "active_reservation_id" IS NULL
      `;
      if (activated !== 1) throw new Error("Daily generation environment slot changed during locked admission.");
      return { status: "reserved", reservationId, day: clock.day, resetAt };
    });
  } catch {
    return { status: "unavailable" };
  }
}

/** Call once immediately before fetch. A stored marker makes a crash conservative. */
export async function markDailyGenerationDispatched(
  db: PrismaClient,
  environment: GenerationUsageEnvironment,
  reservationId: string,
): Promise<void> {
  if (!isUuid(reservationId)) throw new Error("Invalid daily generation reservation.");
  const dbEnvironment = toDatabaseEnvironment(environment);
  await db.$transaction(async (tx) => {
    const gate = await lockEnvironmentGate(tx, dbEnvironment);
    const reservation = await lockReservation(tx, dbEnvironment, reservationId);
    assertEnvironmentGate(gate);
    if (gate.active_reservation_id !== reservationId || reservation.status !== "RESERVED") {
      throw new Error("Daily generation reservation is not awaiting dispatch.");
    }
    const clock = await readDatabaseClock(tx);
    const changed = await tx.$executeRaw`
      UPDATE "generation_reservation"
      SET "status" = 'DISPATCHED'::"generation_reservation_status",
          "dispatched_at" = ${clock.now}
      WHERE "id" = ${reservationId}::uuid
        AND "environment" = ${dbEnvironment}::"generation_environment"
        AND "status" = 'RESERVED'::"generation_reservation_status"
    `;
    if (changed !== 1) throw new Error("Daily generation dispatch marker was not recorded.");
    const gated = await tx.$executeRaw`
      UPDATE "generation_environment_gate"
      SET "last_dispatch_at" = ${clock.now}
      WHERE "environment" = ${dbEnvironment}::"generation_environment"
        AND "active_reservation_id" = ${reservationId}::uuid
    `;
    if (gated !== 1) throw new Error("Daily generation dispatch slot changed.");
  });
}

/** Idempotent refund is possible only while the durable row still says RESERVED. */
export async function refundUndispatchedDailyGeneration(
  db: PrismaClient,
  environment: GenerationUsageEnvironment,
  reservationId: string,
): Promise<boolean> {
  if (!isUuid(reservationId)) return false;
  const dbEnvironment = toDatabaseEnvironment(environment);
  return db.$transaction(async (tx) => {
    const gate = await lockEnvironmentGate(tx, dbEnvironment);
    const reservation = await findAndLockReservation(tx, dbEnvironment, reservationId);
    if (!reservation) return false;
    if (reservation.status === "REFUNDED") return true;
    if (reservation.status !== "RESERVED") return false;
    assertEnvironmentGate(gate);
    if (gate.active_reservation_id !== reservationId) throw new Error("Reserved generation slot is inconsistent.");
    const usage = await lockDailyUsage(tx, dbEnvironment, reservation.owner_id, reservation.sgt_day);
    assertUsageCounters(usage);
    if (usage.attempt_count < 1 || usage.reserved_output_tokens < DAILY_GENERATION_TOKENS_PER_ATTEMPT) {
      throw new Error("Daily generation counters cannot refund this reservation.");
    }
    const clock = await readDatabaseClock(tx);
    const counter = await tx.$executeRaw`
      UPDATE "generation_daily_usage"
      SET "attempt_count" = "attempt_count" - 1,
          "reserved_output_tokens" = "reserved_output_tokens" - ${DAILY_GENERATION_TOKENS_PER_ATTEMPT}
      WHERE "environment" = ${dbEnvironment}::"generation_environment"
        AND "owner_id" = ${reservation.owner_id}::uuid
        AND "sgt_day" = ${reservation.sgt_day}::date
        AND "attempt_count" > 0
        AND "reserved_output_tokens" >= ${DAILY_GENERATION_TOKENS_PER_ATTEMPT}
    `;
    if (counter !== 1) throw new Error("Daily generation refund counter update failed.");
    const refunded = await tx.$executeRaw`
      UPDATE "generation_reservation"
      SET "status" = 'REFUNDED'::"generation_reservation_status", "finished_at" = ${clock.now}
      WHERE "id" = ${reservationId}::uuid AND "status" = 'RESERVED'::"generation_reservation_status"
    `;
    if (refunded !== 1) throw new Error("Daily generation reservation refund failed.");
    const released = await tx.$executeRaw`
      UPDATE "generation_environment_gate"
      SET "active_reservation_id" = NULL
      WHERE "environment" = ${dbEnvironment}::"generation_environment"
        AND "active_reservation_id" = ${reservationId}::uuid
    `;
    if (released !== 1) throw new Error("Daily generation environment slot refund failed.");
    return true;
  });
}

export async function completeDailyGeneration(
  db: PrismaClient,
  environment: GenerationUsageEnvironment,
  reservationId: string,
): Promise<boolean> {
  return settleDispatched(db, environment, reservationId, "COMPLETED");
}

export async function markDailyGenerationUncertain(
  db: PrismaClient,
  environment: GenerationUsageEnvironment,
  reservationId: string,
): Promise<boolean> {
  if (!isUuid(reservationId)) return false;
  const dbEnvironment = toDatabaseEnvironment(environment);
  return db.$transaction(async (tx) => {
    const gate = await lockEnvironmentGate(tx, dbEnvironment);
    const reservation = await findAndLockReservation(tx, dbEnvironment, reservationId);
    if (!reservation) return false;
    if (reservation.status === "UNCERTAIN") return gate.active_reservation_id === reservationId;
    if (reservation.status !== "DISPATCHED") return false;
    assertEnvironmentGate(gate);
    if (gate.active_reservation_id !== reservationId) throw new Error("Dispatched generation slot is inconsistent.");
    const changed = await tx.$executeRaw`
      UPDATE "generation_reservation"
      SET "status" = 'UNCERTAIN'::"generation_reservation_status"
      WHERE "id" = ${reservationId}::uuid
        AND "status" = 'DISPATCHED'::"generation_reservation_status"
    `;
    return changed === 1;
  });
}

/**
 * Operator-only recovery primitive. Callers must separately establish that the
 * exact provider request can no longer still be running. Dispatched work never
 * refunds its daily counters; only RESERVED work is refunded.
 */
export async function recoverDailyGenerationReservation(
  db: PrismaClient,
  environment: GenerationUsageEnvironment,
  reservationId: string,
  confirmationId: string,
): Promise<boolean> {
  if (!isUuid(reservationId) || confirmationId !== reservationId) return false;
  const dbEnvironment = toDatabaseEnvironment(environment);
  const gate = await db.$transaction(async (tx) => {
    const currentGate = await lockEnvironmentGate(tx, dbEnvironment);
    const reservation = await findAndLockReservation(tx, dbEnvironment, reservationId);
    if (!reservation) return false;
    if (reservation.status === "RECOVERED" || reservation.status === "REFUNDED") return true;
    assertEnvironmentGate(currentGate);
    if (currentGate.active_reservation_id !== reservationId) return false;
    if (reservation.status === "RESERVED") return "refund" as const;
    if (reservation.status !== "DISPATCHED" && reservation.status !== "UNCERTAIN") return false;
    const clock = await readDatabaseClock(tx);
    const recovered = await tx.$executeRaw`
      UPDATE "generation_reservation"
      SET "status" = 'RECOVERED'::"generation_reservation_status", "finished_at" = ${clock.now}
      WHERE "id" = ${reservationId}::uuid
        AND "status" IN ('DISPATCHED'::"generation_reservation_status", 'UNCERTAIN'::"generation_reservation_status")
    `;
    if (recovered !== 1) throw new Error("Daily generation reservation recovery failed.");
    const released = await tx.$executeRaw`
      UPDATE "generation_environment_gate"
      SET "active_reservation_id" = NULL
      WHERE "environment" = ${dbEnvironment}::"generation_environment"
        AND "active_reservation_id" = ${reservationId}::uuid
    `;
    if (released !== 1) throw new Error("Daily generation recovery slot update failed.");
    return true;
  });
  if (gate !== "refund") return gate;
  return refundUndispatchedDailyGeneration(db, environment, reservationId);
}

export async function readDailyGenerationUsage(
  db: PrismaClient,
  ownerId: string,
  environment: GenerationUsageEnvironment,
): Promise<GenerationUsageSnapshot> {
  if (!isUuid(ownerId)) throw new Error("Daily generation owner is invalid.");
  const dbEnvironment = toDatabaseEnvironment(environment);
  const rows = await db.$queryRaw<Array<{
    now: Date;
    day: string;
    reset_at: Date;
    attempt_count: number | null;
    reserved_output_tokens: number | null;
    active_reservation_id: string | null;
    active_status: string | null;
    last_dispatch_at: Date | null;
  }>>`
    WITH instant AS MATERIALIZED (SELECT clock_timestamp() AS now)
    SELECT
      instant.now AS now,
      to_char((instant.now AT TIME ZONE 'Asia/Singapore')::date, 'YYYY-MM-DD') AS day,
      ((date_trunc('day', instant.now AT TIME ZONE 'Asia/Singapore') + interval '1 day') AT TIME ZONE 'Asia/Singapore') AS reset_at,
      usage.attempt_count AS attempt_count,
      usage.reserved_output_tokens AS reserved_output_tokens,
      gate.active_reservation_id AS active_reservation_id,
      active.status::text AS active_status,
      gate.last_dispatch_at AS last_dispatch_at
    FROM instant
    JOIN "generation_environment_gate" AS gate
      ON gate.environment = ${dbEnvironment}::"generation_environment"
    LEFT JOIN "generation_daily_usage" AS usage
      ON usage.environment = gate.environment
      AND usage.owner_id = ${ownerId}::uuid
      AND usage.sgt_day = (instant.now AT TIME ZONE 'Asia/Singapore')::date
    LEFT JOIN "generation_reservation" AS active
      ON active.id = gate.active_reservation_id
  `;
  if (rows.length !== 1) throw new Error("Daily generation usage is unavailable.");
  const row = rows[0]!;
  const usage = {
    attempt_count: row.attempt_count ?? 0,
    reserved_output_tokens: row.reserved_output_tokens ?? 0,
  };
  assertUsageCounters(usage);
  const gate = {
    active_reservation_id: row.active_reservation_id,
    active_status: row.active_status,
    last_dispatch_at: row.last_dispatch_at,
  };
  assertEnvironmentGate(gate);
  const nextAllowed = row.last_dispatch_at === null
    ? null
    : new Date(row.last_dispatch_at.getTime() + DAILY_GENERATION_MIN_INTERVAL_MS);
  return {
    environment,
    timeZone: DAILY_GENERATION_TIME_ZONE,
    day: row.day,
    resetAt: row.reset_at.toISOString(),
    attempts: {
      limit: DAILY_GENERATION_ATTEMPT_LIMIT,
      used: usage.attempt_count,
      remaining: DAILY_GENERATION_ATTEMPT_LIMIT - usage.attempt_count,
    },
    outputTokens: {
      perRequest: DAILY_GENERATION_TOKENS_PER_ATTEMPT,
      limit: DAILY_GENERATION_TOKEN_LIMIT,
      reserved: usage.reserved_output_tokens,
      remaining: DAILY_GENERATION_TOKEN_LIMIT - usage.reserved_output_tokens,
    },
    inFlight: row.active_reservation_id !== null,
    nextAllowedAt: nextAllowed?.toISOString() ?? null,
  };
}

export async function executeDailyGeneration<T>(
  db: PrismaClient | undefined,
  input: {
    enabled: boolean;
    ownerId: string;
    environment: GenerationUsageEnvironment;
    signal?: AbortSignal;
  },
  dispatch: (markDispatched: () => Promise<void>) => Promise<T>,
  isAmbiguous: (result: T) => boolean,
): Promise<DailyGenerationExecution<T>> {
  if (!input.enabled) return { ok: false, outcome: "disabled" };
  if (!db || !isUuid(input.ownerId)) return { ok: false, outcome: "unavailable" };
  if (input.signal?.aborted) return { ok: false, outcome: "cancelled" };

  const admission = await reserveDailyGeneration(db, input.ownerId, input.environment);
  if (admission.status === "unavailable") return { ok: false, outcome: "unavailable" };
  if (admission.status === "limited") {
    return { ok: false, outcome: "rate_or_budget_limited", ...admission.details };
  }
  const { reservationId } = admission;
  if (input.signal?.aborted) {
    return await refundUndispatchedDailyGeneration(db, input.environment, reservationId)
      ? { ok: false, outcome: "cancelled" }
      : { ok: false, outcome: "unavailable" };
  }

  let dispatched = false;
  const markDispatched = async () => {
    if (dispatched) throw new Error("Daily generation dispatch marker may be written once.");
    await markDailyGenerationDispatched(db, input.environment, reservationId);
    dispatched = true;
  };

  try {
    const value = await dispatch(markDispatched);
    if (!dispatched) {
      await refundUndispatchedDailyGeneration(db, input.environment, reservationId);
      // A provider adapter that returns without crossing the durable dispatch
      // boundary cannot deliver a generated result to the caller.
      return { ok: false, outcome: "unavailable" };
    }
    if (isAmbiguous(value)) {
      return await markDailyGenerationUncertain(db, input.environment, reservationId)
        ? { ok: true, value }
        : { ok: false, outcome: "unavailable" };
    }
    return await completeDailyGeneration(db, input.environment, reservationId)
      ? { ok: true, value }
      : { ok: false, outcome: "unavailable" };
  } catch {
    if (!dispatched) {
      return await refundUndispatchedDailyGeneration(db, input.environment, reservationId)
        ? { ok: false, outcome: input.signal?.aborted ? "cancelled" : "unavailable" }
        : { ok: false, outcome: "unavailable" };
    }
    try { await markDailyGenerationUncertain(db, input.environment, reservationId); }
    catch { /* DISPATCHED remains a recoverable, charged lease. */ }
    return { ok: false, outcome: input.signal?.aborted ? "cancelled" : "unavailable" };
  }
}

async function settleDispatched(
  db: PrismaClient,
  environment: GenerationUsageEnvironment,
  reservationId: string,
  terminal: "COMPLETED",
): Promise<boolean> {
  if (!isUuid(reservationId)) return false;
  const dbEnvironment = toDatabaseEnvironment(environment);
  return db.$transaction(async (tx) => {
    const gate = await lockEnvironmentGate(tx, dbEnvironment);
    const reservation = await findAndLockReservation(tx, dbEnvironment, reservationId);
    if (!reservation) return false;
    if (reservation.status === terminal) return gate.active_reservation_id === null;
    if (reservation.status !== "DISPATCHED") return false;
    assertEnvironmentGate(gate);
    if (gate.active_reservation_id !== reservationId) throw new Error("Dispatched generation slot is inconsistent.");
    const clock = await readDatabaseClock(tx);
    const completed = await tx.$executeRaw`
      UPDATE "generation_reservation"
      SET "status" = 'COMPLETED'::"generation_reservation_status", "finished_at" = ${clock.now}
      WHERE "id" = ${reservationId}::uuid
        AND "status" = 'DISPATCHED'::"generation_reservation_status"
    `;
    if (completed !== 1) throw new Error("Daily generation completion update failed.");
    const released = await tx.$executeRaw`
      UPDATE "generation_environment_gate"
      SET "active_reservation_id" = NULL
      WHERE "environment" = ${dbEnvironment}::"generation_environment"
        AND "active_reservation_id" = ${reservationId}::uuid
    `;
    return released === 1;
  });
}

async function lockEnvironmentGate(tx: Transaction, environment: EnvironmentDb): Promise<GenerationGate> {
  const rows = await tx.$queryRaw<GenerationGate[]>`
    SELECT gate.active_reservation_id,
           active.status::text AS active_status,
           gate.last_dispatch_at
    FROM "generation_environment_gate" AS gate
    LEFT JOIN "generation_reservation" AS active ON active.id = gate.active_reservation_id
    WHERE gate.environment = ${environment}::"generation_environment"
    FOR UPDATE OF gate
  `;
  if (rows.length !== 1) throw new Error("Daily generation environment gate is unavailable.");
  return rows[0]!;
}

async function ensureDailyUsage(tx: Transaction, environment: EnvironmentDb, ownerId: string, day: string): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO "generation_daily_usage" ("environment", "owner_id", "sgt_day")
    VALUES (${environment}::"generation_environment", ${ownerId}::uuid, ${day}::date)
    ON CONFLICT ("environment", "owner_id", "sgt_day") DO NOTHING
  `;
}

async function lockDailyUsage(tx: Transaction, environment: EnvironmentDb, ownerId: string, day: string): Promise<UsageRow> {
  const rows = await tx.$queryRaw<UsageRow[]>`
    SELECT "attempt_count", "reserved_output_tokens"
    FROM "generation_daily_usage"
    WHERE "environment" = ${environment}::"generation_environment"
      AND "owner_id" = ${ownerId}::uuid
      AND "sgt_day" = ${day}::date
    FOR UPDATE
  `;
  if (rows.length !== 1) throw new Error("Daily generation usage row is unavailable.");
  return rows[0]!;
}

async function lockReservation(tx: Transaction, environment: EnvironmentDb, reservationId: string): Promise<ReservationRow> {
  const reservation = await findAndLockReservation(tx, environment, reservationId);
  if (!reservation) throw new Error("Daily generation reservation is unavailable.");
  return reservation;
}

async function findAndLockReservation(tx: Transaction, environment: EnvironmentDb, reservationId: string): Promise<ReservationRow | null> {
  const rows = await tx.$queryRaw<ReservationRow[]>`
    SELECT "id", "owner_id", to_char("sgt_day", 'YYYY-MM-DD') AS "sgt_day", "status"::text AS "status"
    FROM "generation_reservation"
    WHERE "id" = ${reservationId}::uuid
      AND "environment" = ${environment}::"generation_environment"
    FOR UPDATE
  `;
  if (rows.length > 1) throw new Error("Daily generation reservation identity is invalid.");
  return rows[0] ?? null;
}

async function readDatabaseClock(tx: Transaction): Promise<DatabaseClock> {
  const rows = await tx.$queryRaw<DatabaseClock[]>`
    WITH instant AS MATERIALIZED (SELECT clock_timestamp() AS now)
    SELECT instant.now AS now,
      to_char((instant.now AT TIME ZONE 'Asia/Singapore')::date, 'YYYY-MM-DD') AS day,
      ((date_trunc('day', instant.now AT TIME ZONE 'Asia/Singapore') + interval '1 day') AT TIME ZONE 'Asia/Singapore') AS reset_at
    FROM instant
  `;
  if (rows.length !== 1 || !(rows[0]?.now instanceof Date) || !(rows[0]?.reset_at instanceof Date) || !/^\d{4}-\d{2}-\d{2}$/.test(rows[0].day)) {
    throw new Error("Daily generation database clock is invalid.");
  }
  return rows[0]!;
}

function assertUsageCounters(usage: UsageRow): void {
  if (!Number.isInteger(usage.attempt_count) || usage.attempt_count < 0 || usage.attempt_count > DAILY_GENERATION_ATTEMPT_LIMIT ||
      !Number.isInteger(usage.reserved_output_tokens) || usage.reserved_output_tokens < 0 || usage.reserved_output_tokens > DAILY_GENERATION_TOKEN_LIMIT ||
      usage.reserved_output_tokens !== usage.attempt_count * DAILY_GENERATION_TOKENS_PER_ATTEMPT) {
    throw new Error("Daily generation counters are invalid; fail closed for operator review.");
  }
}

function assertEnvironmentGate(gate: GenerationGate): void {
  if (gate.active_reservation_id === null) {
    if (gate.active_status !== null) throw new Error("Daily generation gate has an unexpected active status.");
  } else if (!isUuid(gate.active_reservation_id) ||
      !["RESERVED", "DISPATCHED", "UNCERTAIN"].includes(gate.active_status ?? "")) {
    throw new Error("Daily generation gate is inconsistent; fail closed for operator review.");
  }
  if (gate.last_dispatch_at !== null && !(gate.last_dispatch_at instanceof Date)) {
    throw new Error("Daily generation dispatch clock is invalid.");
  }
}

function toDatabaseEnvironment(environment: GenerationUsageEnvironment): EnvironmentDb {
  if (environment === "preview") return "PREVIEW";
  if (environment === "production") return "PRODUCTION";
  throw new Error("Daily generation environment is invalid.");
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
