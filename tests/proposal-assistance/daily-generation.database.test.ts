import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Client, Pool, PoolClient } from "pg";
import type { PrismaClient } from "../../src/server/db/generated/client";

const enabled = process.env.RUN_DAILY_GENERATION_DB_INTEGRATION === "1";
const databaseTests = describe.skipIf(!enabled);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

type SqlConnection = Pick<Client | PoolClient, "query">;
type RawSqlClient = {
  $queryRaw<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number>;
};

databaseTests("daily generation isolated SQL integration", () => {
  let admin: Client;
  let pool: Pool;
  let db: PrismaClient;
  let schema: string;
  let schemaCreated = false;
  let owners: { first: string; second: string };
  let gate: typeof import("../../src/server/ai/daily-generation");

  beforeAll(async () => {
    if (process.env.DAILY_GENERATION_DB_TARGET_ACK !== "development-non-production-only") {
      throw new Error("Daily generation DB integration requires explicit development/non-production target acknowledgement.");
    }
    // This opt-in test reads only the worktree's explicitly selected local
    // config. It refuses hosted labels and verifies direct/pooled URL identity.
    const { loadEnvConfig } = await import("@next/env");
    loadEnvConfig(process.cwd(), true);
    const { readRuntimeDatabaseConfig, readMigrationDatabaseConfig } = await import("../../src/server/config/environment");
    const runtime = readRuntimeDatabaseConfig(process.env);
    const migrationConfig = readMigrationDatabaseConfig(process.env, "status");
    if (runtime.turnupEnvironment !== "development" ||
        runtime.databaseEnvironment !== "non-production" ||
        process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined) {
      throw new Error("Daily generation DB integration refuses Preview/Production configuration.");
    }
    const pooledUrl = new URL(runtime.databaseUrl);
    const directUrl = new URL(migrationConfig.migrationDatabaseUrl);
    if (directUrl.hostname !== pooledUrl.hostname.replace("-pooler.", ".") ||
        directUrl.pathname !== pooledUrl.pathname || directUrl.username !== pooledUrl.username ||
        !directUrl.hostname.endsWith(".neon.tech")) {
      throw new Error("Daily generation DB integration requires matching non-production direct/pooled Neon URLs.");
    }

    const { Client: PgClient, Pool: PgPool } = await import("pg");
    admin = new PgClient({ connectionString: migrationConfig.migrationDatabaseUrl, connectionTimeoutMillis: 10_000, statement_timeout: 15_000 });
    pool = new PgPool({ connectionString: migrationConfig.migrationDatabaseUrl, max: 8, connectionTimeoutMillis: 15_000, statement_timeout: 15_000 });
    schema = `qa_daily_generation_${randomBytes(8).toString("hex")}`;
    if (!/^qa_daily_generation_[a-f0-9]{16}$/.test(schema)) throw new Error("Daily generation schema name is invalid.");
    owners = { first: randomUUID(), second: randomUUID() };
    await admin.connect();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    await admin.query(`SET search_path TO "${schema}"`);
    await admin.query("CREATE TABLE app_user(id UUID PRIMARY KEY)");
    await admin.query("INSERT INTO app_user(id) VALUES($1),($2)", [owners.first, owners.second]);
    await admin.query(readFileSync(resolve(repoRoot, "prisma/migrations/20261023020000_daily_generation/migration.sql"), "utf8"));
    gate = await import("../../src/server/ai/daily-generation");
    db = makeDatabaseAdapter(pool, schema) as unknown as PrismaClient;
  }, 120_000);

  afterAll(async () => {
    if (pool!) await pool.end();
    if (admin!) {
      try {
        if (schemaCreated && /^qa_daily_generation_[a-f0-9]{16}$/.test(schema!)) {
          await admin.query("SET search_path TO pg_catalog");
          await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
          const remaining = await admin.query("SELECT count(*)::int AS count FROM pg_namespace WHERE nspname = $1", [schema]);
          expect(remaining.rows[0]?.count).toBe(0);
        }
      } finally {
        await admin.end();
      }
    }
  });

  it("serializes owner quotas and preserves refunds, dispatch charges, recovery, and day-boundary leases", async () => {
    const initial = await gate.readDailyGenerationUsage(db, owners.first, "preview");
    expect(initial.attempts.remaining).toBe(10);
    expect(initial.outputTokens.remaining).toBe(40_960);

    const first = await reserve(owners.first, "preview");
    expect(await gate.refundUndispatchedDailyGeneration(db, "production", first.reservationId)).toBe(false);
    expect(await gate.refundUndispatchedDailyGeneration(db, "preview", first.reservationId)).toBe(true);
    expect(await gate.refundUndispatchedDailyGeneration(db, "preview", first.reservationId)).toBe(true);
    expect((await gate.readDailyGenerationUsage(db, owners.first, "preview")).attempts.used).toBe(0);

    await raw(pool, schema, "UPDATE generation_daily_usage SET attempt_count = 9, reserved_output_tokens = 36864 WHERE owner_id = $1", [owners.first]);
    const burst = await Promise.all(Array.from({ length: 8 }, () => gate.reserveDailyGeneration(db, owners.first, "preview")));
    const admitted = burst.filter((entry): entry is Extract<typeof entry, { status: "reserved" }> => entry.status === "reserved");
    expect(admitted).toHaveLength(1);
    const final = admitted[0]!;
    await gate.markDailyGenerationDispatched(db, "preview", final.reservationId);
    expect(await gate.refundUndispatchedDailyGeneration(db, "preview", final.reservationId)).toBe(false);
    expect(await gate.completeDailyGeneration(db, "preview", final.reservationId)).toBe(true);
    expect(await gate.completeDailyGeneration(db, "preview", final.reservationId)).toBe(true);
    expect(await gate.reserveDailyGeneration(db, owners.first, "preview")).toMatchObject({ status: "limited", details: { limitReason: "daily_attempts" } });
    expect(await gate.readDailyGenerationUsage(db, owners.first, "preview")).toMatchObject({ attempts: { used: 10, remaining: 0 }, outputTokens: { reserved: 40_960, remaining: 0 } });

    await backdateDispatch(pool, schema);
    const otherOwner = await reserve(owners.second, "preview");
    const otherEnvironment = await reserve(owners.first, "production");
    expect((await gate.readDailyGenerationUsage(db, owners.second, "preview")).attempts.used).toBe(1);
    expect((await gate.readDailyGenerationUsage(db, owners.first, "production")).attempts.used).toBe(1);
    expect(await gate.refundUndispatchedDailyGeneration(db, "production", otherEnvironment.reservationId)).toBe(true);
    await gate.markDailyGenerationDispatched(db, "preview", otherOwner.reservationId);
    await gate.completeDailyGeneration(db, "preview", otherOwner.reservationId);

    expect(await gate.reserveDailyGeneration(db, owners.second, "preview")).toMatchObject({ status: "limited", details: { limitReason: "spacing" } });
    await backdateDispatch(pool, schema);
    const uncertain = await reserve(owners.second, "preview");
    await gate.markDailyGenerationDispatched(db, "preview", uncertain.reservationId);
    expect(await gate.markDailyGenerationUncertain(db, "preview", uncertain.reservationId)).toBe(true);
    expect(await gate.recoverDailyGenerationReservation(db, "preview", uncertain.reservationId, randomUUID())).toBe(false);
    expect(await gate.recoverDailyGenerationReservation(db, "production", uncertain.reservationId, uncertain.reservationId)).toBe(false);
    expect(await gate.recoverDailyGenerationReservation(db, "preview", uncertain.reservationId, uncertain.reservationId)).toBe(true);
    expect(await gate.recoverDailyGenerationReservation(db, "preview", uncertain.reservationId, uncertain.reservationId)).toBe(true);
    expect((await gate.readDailyGenerationUsage(db, owners.second, "preview")).attempts.used).toBe(2);

    await backdateDispatch(pool, schema);
    const overnight = await reserve(owners.second, "preview");
    await gate.markDailyGenerationDispatched(db, "preview", overnight.reservationId);
    await gate.markDailyGenerationUncertain(db, "preview", overnight.reservationId);
    await raw(pool, schema, "UPDATE generation_daily_usage SET sgt_day = sgt_day - 1 WHERE owner_id = $1 AND environment = 'PREVIEW'", [owners.second]);
    expect(await gate.readDailyGenerationUsage(db, owners.second, "preview")).toMatchObject({ attempts: { used: 0, remaining: 10 }, inFlight: true });
    expect(await gate.reserveDailyGeneration(db, owners.second, "preview")).toMatchObject({ status: "limited", details: { limitReason: "environment_busy" } });
    expect(await gate.recoverDailyGenerationReservation(db, "preview", overnight.reservationId, overnight.reservationId)).toBe(true);
    const oldDay = await raw(pool, schema,
      "SELECT attempt_count, reserved_output_tokens FROM generation_daily_usage WHERE owner_id = $1 AND environment = 'PREVIEW' AND sgt_day = (clock_timestamp() AT TIME ZONE 'Asia/Singapore')::date - 1",
      [owners.second]);
    expect(oldDay.rows[0]).toEqual({ attempt_count: 3, reserved_output_tokens: 12_288 });
  });

  it("charges dispatched invalid output and enforces schema caps", async () => {
    const before = await gate.readDailyGenerationUsage(db, owners.second, "preview");
    await backdateDispatch(pool, schema);
    const result = await gate.executeDailyGeneration(db, {
      enabled: true,
      ownerId: owners.second,
      environment: "preview",
    }, async (markDispatched) => {
      await markDispatched();
      return { ok: false, outcome: "invalid_response" } as const;
    }, () => false);
    expect(result).toMatchObject({ ok: true, value: { ok: false, outcome: "invalid_response" } });
    const usage = await gate.readDailyGenerationUsage(db, owners.second, "preview");
    expect(usage.attempts.used).toBe(before.attempts.used + 1);
    expect(usage.outputTokens.reserved).toBe(before.outputTokens.reserved + 4_096);

    await expect(raw(pool, schema,
      "UPDATE generation_daily_usage SET attempt_count = 11, reserved_output_tokens = 45056 WHERE owner_id = $1",
      [owners.first])).rejects.toThrow();
  });

  it("refunds executor failures before dispatch and retains dispatched ambiguity for guarded recovery", async () => {
    await backdateDispatch(pool, schema);
    const before = await gate.readDailyGenerationUsage(db, owners.second, "preview");
    const missingMarker = await gate.executeDailyGeneration(db, {
      enabled: true,
      ownerId: owners.second,
      environment: "preview",
    }, async () => ({ ok: true, text: "must not be delivered" }), () => false);
    expect(missingMarker).toEqual({ ok: false, outcome: "unavailable" });
    expect(await gate.readDailyGenerationUsage(db, owners.second, "preview")).toMatchObject({
      attempts: { used: before.attempts.used },
      inFlight: false,
    });

    const beforeDispatch = await gate.executeDailyGeneration(db, {
      enabled: true,
      ownerId: owners.second,
      environment: "preview",
    }, async () => { throw new Error("synthetic failure before dispatch"); }, () => false);
    expect(beforeDispatch).toEqual({ ok: false, outcome: "unavailable" });
    expect(await gate.readDailyGenerationUsage(db, owners.second, "preview")).toMatchObject({
      attempts: { used: before.attempts.used, remaining: before.attempts.remaining },
      inFlight: false,
    });

    const afterDispatch = await gate.executeDailyGeneration(db, {
      enabled: true,
      ownerId: owners.second,
      environment: "preview",
    }, async (markDispatched) => {
      await markDispatched();
      throw new Error("synthetic ambiguous transport failure");
    }, () => false);
    expect(afterDispatch).toEqual({ ok: false, outcome: "unavailable" });
    expect(await gate.readDailyGenerationUsage(db, owners.second, "preview")).toMatchObject({
      attempts: { used: before.attempts.used + 1 },
      inFlight: true,
    });
    const uncertain = await raw(pool, schema,
      "SELECT id FROM generation_reservation WHERE owner_id = $1 AND environment = 'PREVIEW' AND sgt_day = (clock_timestamp() AT TIME ZONE 'Asia/Singapore')::date AND status = 'UNCERTAIN' ORDER BY created_at DESC LIMIT 1",
      [owners.second]);
    const reservationId = uncertain.rows[0]?.id;
    expect(typeof reservationId).toBe("string");
    expect(await gate.recoverDailyGenerationReservation(db, "preview", reservationId as string, reservationId as string)).toBe(true);
    expect(await gate.readDailyGenerationUsage(db, owners.second, "preview")).toMatchObject({
      attempts: { used: before.attempts.used + 1 },
      inFlight: false,
    });
  });

  async function reserve(owner: string, environment: "preview" | "production") {
    const admission = await gate.reserveDailyGeneration(db, owner, environment);
    expect(admission.status).toBe("reserved");
    if (admission.status !== "reserved") throw new Error("Expected reserved daily generation admission.");
    return admission;
  }
});

function makeDatabaseAdapter(pool: Pool, schema: string): RawSqlClient {
  const queryRaw = async <T>(connection: SqlConnection, strings: TemplateStringsArray, values: unknown[]): Promise<T> => {
    const sql = strings.reduce((text, part, index) => text + (index > 0 ? `$${index}` : "") + part, "");
    const result = await connection.query(sql, values);
    return result.rows as T;
  };
  const executeRaw = async (connection: SqlConnection, strings: TemplateStringsArray, values: unknown[]): Promise<number> => {
    const sql = strings.reduce((text, part, index) => text + (index > 0 ? `$${index}` : "") + part, "");
    const result = await connection.query(sql, values);
    return result.rowCount ?? 0;
  };

  return {
    async $queryRaw<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T> {
      const connection = await pool.connect();
      try {
        await connection.query(`SET search_path TO "${schema}"`);
        return await queryRaw<T>(connection, strings, values);
      } finally { connection.release(); }
    },
    async $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number> {
      const connection = await pool.connect();
      try {
        await connection.query(`SET search_path TO "${schema}"`);
        return await executeRaw(connection, strings, values);
      } finally { connection.release(); }
    },
    async $transaction<T>(work: (tx: RawSqlClient) => Promise<T>): Promise<T> {
      const connection = await pool.connect();
      try {
        await connection.query(`SET search_path TO "${schema}"`);
        await connection.query("BEGIN");
        const result = await work(transactionAdapter(connection, queryRaw, executeRaw));
        await connection.query("COMMIT");
        return result;
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      } finally { connection.release(); }
    },
  } as RawSqlClient;
}

function transactionAdapter(
  connection: PoolClient,
  queryRaw: <T>(connection: SqlConnection, strings: TemplateStringsArray, values: unknown[]) => Promise<T>,
  executeRaw: (connection: SqlConnection, strings: TemplateStringsArray, values: unknown[]) => Promise<number>,
): RawSqlClient {
  return {
    $queryRaw<T>(strings: TemplateStringsArray, ...values: unknown[]) { return queryRaw<T>(connection, strings, values); },
    $executeRaw(strings: TemplateStringsArray, ...values: unknown[]) { return executeRaw(connection, strings, values); },
  };
}

async function raw(pool: Pool, schema: string, sql: string, values: readonly unknown[] = []) {
  const connection = await pool.connect();
  try {
    await connection.query(`SET search_path TO "${schema}"`);
    return await connection.query(sql, [...values]);
  } finally { connection.release(); }
}

async function backdateDispatch(pool: Pool, schema: string): Promise<void> {
  await raw(pool, schema, "UPDATE generation_environment_gate SET last_dispatch_at = clock_timestamp() - interval '3 seconds'");
}
