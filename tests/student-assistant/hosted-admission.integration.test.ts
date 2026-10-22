import { createRequire } from "node:module";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const actor = vi.hoisted(() => ({ id: "11111111-1111-4111-8111-111111111111", role: "STUDENT" }));
vi.mock("../../src/server/auth/session", () => ({ resolveSession: vi.fn(async () => ({ ...actor })) }));
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/server/db/generated/client";
import { reserveHosted } from "../../src/server/student-assistant/hosted-admission";
import { PREVIEW_APPROVAL } from "../../src/server/student-assistant/hosted-policy";
const helper = await import(/* @vite-ignore */ pathToFileURL(resolve("scripts/activate-student-ai-budget.mjs")).href);
if (process.env.RUN_LOCAL_PUBLICATION_SQL !== "1") throw Error("Disposable SQL opt-in required.");
const require = createRequire(import.meta.url), prismaRequire = createRequire(require.resolve("prisma/package.json")), devRequire = createRequire(prismaRequire.resolve("@prisma/dev"));
const { PGlite } = await import(devRequire.resolve("@electric-sql/pglite"));
const { PGLiteSocketServer } = await import(devRequire.resolve("@electric-sql/pglite-socket"));
const engine = await PGlite.create(), socket = new PGLiteSocketServer({ db: engine, host: "127.0.0.1", port: 0, maxConnections: 1 });
let db: PrismaClient;
const model = "qwen3.8:27b", config = { apiKey: "synthetic", model, maxInputBytes: 65536, maxOutputTokens: 4096, timeoutMs: 30000 };
beforeAll(async () => {
  for (const name of (await readdir("prisma/migrations")).filter(n => /^\d/.test(n)).sort()) await engine.exec(await readFile(resolve("prisma/migrations", name, "migration.sql"), "utf8"));
  await socket.start(); const endpoint = socket.getServerConn(); if (!/^127\.0\.0\.1:\d+$/.test(endpoint)) throw Error("Loopback only.");
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: `postgresql://postgres@${endpoint}/postgres`, max: 1 }) });
});
afterAll(async () => { await db?.$disconnect(); await socket.stop(); await engine.close(); });
beforeEach(async () => {
  actor.id = "11111111-1111-4111-8111-111111111111"; actor.role = "STUDENT";
  await db.$executeRaw`DELETE FROM student_ai_reservation`; await db.$executeRaw`DELETE FROM student_ai_budget`;
});
async function activate() {
  return db.$transaction(tx => helper.activate({ query: async (sql: string, args: unknown[] = []) => {
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rows: [] };
    return { rows: await tx.$queryRawUnsafe(sql, ...args) };
  } }, model));
}
async function reserve(id = randomUUID()) { return reserveHosted(db, "synthetic-token", id, config); }
async function space() { await db.$executeRaw`UPDATE student_ai_budget SET last_admission_at = clock_timestamp() - interval '11 seconds'`; }
async function spend() { const admitted = await reserve(); expect(admitted.ok).toBe(true); if (admitted.ok) await admitted.release(); await space(); }
async function counters() { return (await db.$queryRaw<{ attempts: number; reserved_output_tokens: number }[]>`SELECT attempts,reserved_output_tokens FROM student_ai_budget WHERE id=1`)[0]; }

it("missing activation blocks; explicit activation caps config and redeploy preserves spend/expiry", async () => {
  expect(await reserve()).toEqual({ ok: false, reason: "blocked" }); await activate();
  const before = await db.$queryRaw`SELECT expires_at FROM student_ai_budget`; const admitted = await reserve();
  expect(admitted.ok).toBe(true); if (!admitted.ok) throw Error("Expected admission");
  expect(admitted.config).toMatchObject({ maxOutputTokens: 1000, timeoutMs: 20000 }); await admitted.release(); await admitted.release();
  await activate(); expect(await counters()).toEqual({ attempts: 1, reserved_output_tokens: 1000 });
  expect(await db.$queryRaw`SELECT expires_at FROM student_ai_budget`).toEqual(before);
});
it("serialises simultaneous requests and releases only the named lease", async () => {
  await activate(); const results = await Promise.all([reserve(), reserve()]); expect(results.filter(r => r.ok)).toHaveLength(1);
  expect(await counters()).toEqual({ attempts: 1, reserved_output_tokens: 1000 });
  const first = results.find(r => r.ok)!; if (!first.ok) throw Error("Expected admission");
  await db.$executeRaw`UPDATE student_ai_reservation SET lease_until = clock_timestamp() - interval '1 second'`; await space();
  const next = await reserve(); expect(next.ok).toBe(true); await first.release(); await space();
  expect(await reserve()).toEqual({ ok: false, reason: "busy" }); if (next.ok) await next.release();
  expect((await counters()).attempts).toBe(2);
});
it("duplicate IDs never dispatch again after release, while throttling is account scoped", async () => {
  await activate(); const id = randomUUID(), first = await reserve(id); if (!first.ok) throw Error("Expected admission"); await first.release(); await space();
  expect(await reserve(id)).toEqual({ ok: false, reason: "busy" });
  for (let i = 0; i < 4; i++) await spend(); expect(await reserve()).toEqual({ ok: false, reason: "busy" });
  actor.id = "22222222-2222-4222-8222-222222222222"; const other = await reserve(id); expect(other.ok).toBe(true); if (other.ok) await other.release();
  expect((await counters()).attempts).toBe(6);
});
it("enforces aggregate attempt/output caps and expiration without resets", async () => {
  await activate(); await db.$executeRaw`UPDATE student_ai_budget SET attempts=199,reserved_output_tokens=199000`;
  await spend(); expect(await reserve()).toEqual({ ok: false, reason: "limited" }); expect((await counters()).attempts).toBe(200);
  await db.$executeRaw`UPDATE student_ai_budget SET expires_at=clock_timestamp()-interval '1 second'`;
  expect(await reserve()).toEqual({ ok: false, reason: "blocked" }); await expect(activate()).rejects.toThrow("preview_budget_operator_action_required");
  expect((await counters()).attempts).toBe(200);
});
it("disabled, mismatched model/approval and Organiser never spend", async () => {
  await activate(); await db.$executeRaw`UPDATE student_ai_budget SET enabled=false`; expect(await reserve()).toMatchObject({ ok: false, reason: "blocked" });
  await db.$executeRaw`UPDATE student_ai_budget SET enabled=true,approval_id='foreign'`; expect(await reserve()).toMatchObject({ ok: false, reason: "blocked" });
  await db.$executeRaw`UPDATE student_ai_budget SET approval_id=${PREVIEW_APPROVAL}`;
  expect(await reserveHosted(db, "synthetic", randomUUID(), { ...config, model: "other" })).toMatchObject({ ok: false, reason: "blocked" });
  actor.role = "ORGANISER"; await expect(reserve()).rejects.toMatchObject({ status: 403 }); expect((await counters()).attempts).toBe(0);
});
it("database errors propagate so inference cannot fall back to local admission", async () => {
  await db.$executeRaw`DROP TABLE student_ai_reservation`; await db.$executeRaw`DROP TABLE student_ai_budget`;
  await expect(reserve()).rejects.toThrow();
});
