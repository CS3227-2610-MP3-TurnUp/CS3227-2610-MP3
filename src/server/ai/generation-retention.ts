import "server-only";

import type { Prisma, PrismaClient } from "../db/generated/client";
import type { GenerationUsageEnvironment } from "../../lib/generation-usage";

const BATCH_SIZE = 100;
const dbEnvironments: Record<GenerationUsageEnvironment, "PREVIEW" | "PRODUCTION"> = {
  preview: "PREVIEW",
  production: "PRODUCTION",
};
const activeStatuses = new Set(["RESERVED", "DISPATCHED", "UNCERTAIN"]);

type RetentionTransaction = Prisma.TransactionClient;
type GateState = {
  active_reservation_id: string | null;
  active_environment: string | null;
  active_status: string | null;
};

export type GenerationUsageRetentionResult =
  | { ok: true; reservations: number; dailyUsageRows: number }
  | { ok: false; outcome: "unavailable" };

/**
 * Delete one bounded batch of settled hosted-generation accounting rows for
 * the currently validated deployment environment. The caller supplies only
 * the server-resolved environment, never a request value.
 */
export async function runGenerationUsageRetentionSweep(
  db: PrismaClient,
  environment: GenerationUsageEnvironment,
  options: { dryRun?: boolean } = {},
): Promise<GenerationUsageRetentionResult> {
  const dbEnvironment = dbEnvironments[environment];
  if (!dbEnvironment) return { ok: false, outcome: "unavailable" };

  try {
    return await db.$transaction(async (tx) => {
      const gateRows = await tx.$queryRaw<GateState[]>`
        SELECT gate.active_reservation_id,
               active.environment::text AS active_environment,
               active.status::text AS active_status
        FROM "generation_environment_gate" AS gate
        LEFT JOIN "generation_reservation" AS active
          ON active.id = gate.active_reservation_id
        WHERE gate.environment = ${dbEnvironment}::"generation_environment"
        FOR UPDATE OF gate
      `;
      if (gateRows.length !== 1) return { ok: false, outcome: "unavailable" } as const;

      const active = gateRows[0]!;
      if (active.active_reservation_id !== null &&
          (active.active_environment !== dbEnvironment || !activeStatuses.has(active.active_status ?? ""))) {
        // A dangling, cross-environment, or terminal active pointer is corrupt
        // gate state. Do no cleanup and let the operator inspect it safely.
        return { ok: false, outcome: "unavailable" } as const;
      }

      const reservations = options.dryRun
        ? await countExpiredReservations(tx, dbEnvironment)
        : await deleteExpiredReservations(tx, dbEnvironment);
      const dailyUsageRows = options.dryRun
        ? await countExpiredDailyUsageRows(tx, dbEnvironment, true)
        : await deleteExpiredDailyUsageRows(tx, dbEnvironment);

      return { ok: true, reservations, dailyUsageRows } as const;
    });
  } catch {
    return { ok: false, outcome: "unavailable" };
  }
}

async function countExpiredReservations(tx: RetentionTransaction, environment: "PREVIEW" | "PRODUCTION"): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ count: number }>>`
    WITH batch AS MATERIALIZED (
      SELECT reservation.id
      FROM "generation_reservation" AS reservation
      JOIN "generation_daily_usage" AS usage
        ON usage.environment = reservation.environment
        AND usage.owner_id = reservation.owner_id
        AND usage.sgt_day = reservation.sgt_day
      WHERE reservation.environment = ${environment}::"generation_environment"
        AND reservation.status IN (
          'COMPLETED'::"generation_reservation_status",
          'REFUNDED'::"generation_reservation_status",
          'RECOVERED'::"generation_reservation_status"
        )
        AND usage.sgt_day < ((clock_timestamp() AT TIME ZONE 'Asia/Singapore')::date - 90)
        AND NOT EXISTS (
          SELECT 1 FROM "generation_environment_gate" AS gate
          WHERE gate.active_reservation_id = reservation.id
        )
      ORDER BY usage.sgt_day ASC, reservation.finished_at ASC NULLS FIRST, reservation.created_at ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE OF reservation SKIP LOCKED
    )
    SELECT count(*)::int AS count FROM batch
  `;
  return safeCount(rows);
}

async function deleteExpiredReservations(tx: RetentionTransaction, environment: "PREVIEW" | "PRODUCTION"): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ count: number }>>`
    WITH batch AS MATERIALIZED (
      SELECT reservation.id
      FROM "generation_reservation" AS reservation
      JOIN "generation_daily_usage" AS usage
        ON usage.environment = reservation.environment
        AND usage.owner_id = reservation.owner_id
        AND usage.sgt_day = reservation.sgt_day
      WHERE reservation.environment = ${environment}::"generation_environment"
        AND reservation.status IN (
          'COMPLETED'::"generation_reservation_status",
          'REFUNDED'::"generation_reservation_status",
          'RECOVERED'::"generation_reservation_status"
        )
        AND usage.sgt_day < ((clock_timestamp() AT TIME ZONE 'Asia/Singapore')::date - 90)
        AND NOT EXISTS (
          SELECT 1 FROM "generation_environment_gate" AS gate
          WHERE gate.active_reservation_id = reservation.id
        )
      ORDER BY usage.sgt_day ASC, reservation.finished_at ASC NULLS FIRST, reservation.created_at ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE OF reservation SKIP LOCKED
    ), deleted AS (
      DELETE FROM "generation_reservation" AS reservation
      USING batch
      WHERE reservation.id = batch.id
      RETURNING 1
    )
    SELECT count(*)::int AS count FROM deleted
  `;
  return safeCount(rows);
}

async function countExpiredDailyUsageRows(
  tx: RetentionTransaction,
  environment: "PREVIEW" | "PRODUCTION",
  includeReservationBatch = false,
): Promise<number> {
  if (includeReservationBatch) {
    const rows = await tx.$queryRaw<Array<{ count: number }>>`
      WITH expired_reservations AS MATERIALIZED (
        SELECT reservation.id
        FROM "generation_reservation" AS reservation
        JOIN "generation_daily_usage" AS usage
          ON usage.environment = reservation.environment
          AND usage.owner_id = reservation.owner_id
          AND usage.sgt_day = reservation.sgt_day
        WHERE reservation.environment = ${environment}::"generation_environment"
          AND reservation.status IN (
            'COMPLETED'::"generation_reservation_status",
            'REFUNDED'::"generation_reservation_status",
            'RECOVERED'::"generation_reservation_status"
          )
          AND usage.sgt_day < ((clock_timestamp() AT TIME ZONE 'Asia/Singapore')::date - 90)
          AND NOT EXISTS (
            SELECT 1 FROM "generation_environment_gate" AS gate
            WHERE gate.active_reservation_id = reservation.id
          )
        ORDER BY usage.sgt_day ASC, reservation.finished_at ASC NULLS FIRST, reservation.created_at ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE OF reservation SKIP LOCKED
      ), batch AS MATERIALIZED (
        SELECT usage.owner_id, usage.sgt_day
        FROM "generation_daily_usage" AS usage
        WHERE usage.environment = ${environment}::"generation_environment"
          AND usage.sgt_day < ((clock_timestamp() AT TIME ZONE 'Asia/Singapore')::date - 90)
          AND NOT EXISTS (
            SELECT 1 FROM "generation_reservation" AS reservation
            WHERE reservation.environment = usage.environment
              AND reservation.owner_id = usage.owner_id
              AND reservation.sgt_day = usage.sgt_day
              AND NOT EXISTS (
                SELECT 1 FROM expired_reservations AS expired
                WHERE expired.id = reservation.id
              )
          )
        ORDER BY usage.sgt_day ASC, usage.owner_id ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE OF usage SKIP LOCKED
      )
      SELECT count(*)::int AS count FROM batch
    `;
    return safeCount(rows);
  }

  const rows = await tx.$queryRaw<Array<{ count: number }>>`
    WITH batch AS MATERIALIZED (
      SELECT usage.owner_id, usage.sgt_day
      FROM "generation_daily_usage" AS usage
      WHERE usage.environment = ${environment}::"generation_environment"
        AND usage.sgt_day < ((clock_timestamp() AT TIME ZONE 'Asia/Singapore')::date - 90)
        AND NOT EXISTS (
          SELECT 1 FROM "generation_reservation" AS reservation
          WHERE reservation.environment = usage.environment
            AND reservation.owner_id = usage.owner_id
            AND reservation.sgt_day = usage.sgt_day
        )
      ORDER BY usage.sgt_day ASC, usage.owner_id ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE OF usage SKIP LOCKED
    )
    SELECT count(*)::int AS count FROM batch
  `;
  return safeCount(rows);
}

async function deleteExpiredDailyUsageRows(tx: RetentionTransaction, environment: "PREVIEW" | "PRODUCTION"): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ count: number }>>`
    WITH batch AS MATERIALIZED (
      SELECT usage.owner_id, usage.sgt_day
      FROM "generation_daily_usage" AS usage
      WHERE usage.environment = ${environment}::"generation_environment"
        AND usage.sgt_day < ((clock_timestamp() AT TIME ZONE 'Asia/Singapore')::date - 90)
        AND NOT EXISTS (
          SELECT 1 FROM "generation_reservation" AS reservation
          WHERE reservation.environment = usage.environment
            AND reservation.owner_id = usage.owner_id
            AND reservation.sgt_day = usage.sgt_day
        )
      ORDER BY usage.sgt_day ASC, usage.owner_id ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE OF usage SKIP LOCKED
    ), deleted AS (
      DELETE FROM "generation_daily_usage" AS usage
      USING batch
      WHERE usage.environment = ${environment}::"generation_environment"
        AND usage.owner_id = batch.owner_id
        AND usage.sgt_day = batch.sgt_day
      RETURNING 1
    )
    SELECT count(*)::int AS count FROM deleted
  `;
  return safeCount(rows);
}

function safeCount(rows: Array<{ count: number }>): number {
  if (rows.length !== 1 || !Number.isSafeInteger(rows[0]?.count) || rows[0]!.count < 0 || rows[0]!.count > BATCH_SIZE) {
    throw new Error("Generation retention batch count is invalid.");
  }
  return rows[0]!.count;
}
