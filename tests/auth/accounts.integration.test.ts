import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { readMigrationDatabaseConfig, readRuntimeDatabaseConfig } from "../../src/server/config/environment";
import { hashPassword } from "../../src/server/auth/password";
import { AuthError, parseCredentials } from "../../src/server/auth/policy";
import { authenticate } from "../../src/server/auth/service";
import { ABSOLUTE_MS, IDLE_MS, replaceSession, resolveSession, revokeSession, tokenDigest } from "../../src/server/auth/session";
import { admissionKeys, admitAttempt } from "../../src/server/auth/throttle";

// Explicit process configuration only: never load another developer's private file.
if (process.env.RUN_AUTH_DB_INTEGRATION !== "1" || process.env.AUTH_TEST_OWNER !== "darryl") {
  throw new Error("Auth SQL tests require explicit RUN_AUTH_DB_INTEGRATION=1 and AUTH_TEST_OWNER=darryl for an assigned synthetic target.");
}
const runtime = readRuntimeDatabaseConfig(process.env);
const migration = readMigrationDatabaseConfig(process.env, "status");
if (runtime.turnupEnvironment !== "development" || runtime.databaseEnvironment !== "non-production") {
  throw new Error("Auth SQL tests accept only development/non-production.");
}
const pooled = new URL(runtime.databaseUrl);
const direct = new URL(migration.migrationDatabaseUrl);
const endpoint = (url: URL) => url.hostname.replace("-pooler", "");
if (!process.env.AUTH_TEST_ENDPOINT_HOST || !process.env.AUTH_TEST_DATABASE_NAME ||
    endpoint(pooled) !== process.env.AUTH_TEST_ENDPOINT_HOST || endpoint(direct) !== endpoint(pooled) ||
    decodeURIComponent(pooled.pathname.slice(1)) !== process.env.AUTH_TEST_DATABASE_NAME || pooled.pathname !== direct.pathname) {
  throw new Error("Explicit auth test endpoint/database must match both assigned pooled and direct connections.");
}

const { prisma } = await import("../../src/server/db/client");
const prefix = `auth_${randomUUID().replaceAll("-", "").slice(0, 16)}_`;
const usernames = new Set<string>();
const throttleKeys = new Set<string>();
const secret = randomBytes(32).toString("hex");
let passwordHash: string;
const password = "synthetic campus phrase unique";
function name(suffix: string) { const value = `${prefix}${suffix}`; usernames.add(value); return value; }
async function user(suffix: string, role: "STUDENT" | "ORGANISER" = "STUDENT") {
  return prisma.user.create({ data: { id: randomUUID(), username: name(suffix), role, passwordHash } });
}
async function rememberKeys(action: "login" | "signup", username: string, source: string) {
  const [clock] = await prisma.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  // Include adjacent windows so scoped cleanup stays correct even across a boundary.
  for (const delta of [-3600000, -900000, 0, 900000, 3600000]) {
    admissionKeys(action, username, source, secret, new Date(clock.now.getTime() + delta)).forEach((entry) => throttleKeys.add(entry.key));
  }
}

function assertAdmissions(results: PromiseSettledResult<void>[], expected: number): void {
  const admitted = results.filter((result) => result.status === "fulfilled").length;
  const safeClasses = new Set([
    "Error", "PrismaClientKnownRequestError", "PrismaClientUnknownRequestError",
    "PrismaClientInitializationError", "PrismaClientRustPanicError", "PrismaClientValidationError",
  ]);
  const rejections = results.filter((result) => result.status === "rejected").map(({ reason }) => {
    const error = reason && typeof reason === "object" ? reason as Record<string, unknown> : {};
    const className = reason instanceof AuthError ? "AuthError"
      : reason instanceof Error && safeClasses.has(reason.constructor.name) ? reason.constructor.name : "Other";
    return {
      class: className,
      status: typeof error.status === "number" && Number.isInteger(error.status) && error.status >= 100 && error.status <= 599 ? error.status : null,
      code: typeof error.code === "string" && /^(?:P\d{4}|[0-9A-Z]{5})$/.test(error.code) ? error.code : null,
    };
  });
  // Diagnostics deliberately exclude messages, metadata, URLs and original errors.
  const diagnostic = JSON.stringify({ admitted, rejected: rejections.length, errors: rejections });
  expect(rejections.every((error) => error.class === "AuthError" && error.status === 429), diagnostic).toBe(true);
  expect(admitted, diagnostic).toBe(expected);
}
beforeAll(async () => { passwordHash = await hashPassword(password); });
afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: { in: [...usernames] } } });
  await prisma.authThrottle.deleteMany({ where: { key: { in: [...throttleKeys] } } });
  await prisma.$disconnect();
});

it("racing equivalent names across roles produce one atomic account/session", async () => {
  const username = name("race");
  const candidates = [
    parseCredentials({ username: ` ${username.toUpperCase()} `, password, role: "STUDENT" }, true),
    parseCredentials({ username, password, role: "ORGANISER" }, true),
  ];
  const results = await Promise.allSettled(candidates.map((input) => authenticate(prisma, "signup", input)));
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { status: 409 } });
  const account = await prisma.user.findUniqueOrThrow({ where: { username }, include: { sessions: true } });
  expect(account.sessions).toHaveLength(1);
  expect(account.id).toMatch(/^[a-f0-9-]{36}$/);
  const winner = results.find((result) => result.status === "fulfilled")!;
  if (winner.status === "fulfilled") {
    expect(account.sessions[0].tokenDigest).toBe(tokenDigest(winner.value.token));
    expect(await resolveSession(prisma, winner.value.token)).toMatchObject({ id: account.id, role: account.role });
  }
});

it("rolls back account and session writes on transaction failure and enforces immutable role", async () => {
  const username = name("rollback");
  await expect(prisma.$transaction(async (tx) => {
    const account = await tx.user.create({ data: { id: randomUUID(), username, role: "STUDENT", passwordHash } });
    await replaceSession(tx, account.id);
    throw new Error("synthetic rollback");
  })).rejects.toThrow("synthetic rollback");
  expect(await prisma.user.count({ where: { username } })).toBe(0);
  const account = await user("fixed");
  await expect(prisma.user.update({ where: { id: account.id }, data: { role: "ORGANISER" } })).rejects.toThrow();
  expect((await prisma.user.findUniqueOrThrow({ where: { id: account.id } })).role).toBe("STUDENT");
});

it("replaces current session, retains other devices, revokes logout replay and denies forged tokens", async () => {
  const account = await user("sessions");
  const first = await prisma.$transaction((tx) => replaceSession(tx, account.id));
  const otherDevice = await prisma.$transaction((tx) => replaceSession(tx, account.id));
  const replacement = await authenticate(prisma, "login", { username: account.username, password }, first);
  expect(replacement.token).not.toBe(first);
  expect(await resolveSession(prisma, first)).toBeNull();
  expect(await resolveSession(prisma, otherDevice)).toMatchObject({ id: account.id });
  await revokeSession(prisma, replacement.token);
  expect(await resolveSession(prisma, replacement.token)).toBeNull();
  expect(await resolveSession(prisma, randomBytes(32).toString("base64url"))).toBeNull();
});

it("rejects exact idle/absolute boundaries and expired touches cannot resurrect sessions", async () => {
  const account = await user("expiry");
  const now = new Date("2026-10-20T10:00:00Z");
  async function fixture(age: number, idle: number) {
    const token = randomBytes(32).toString("base64url");
    await prisma.session.create({ data: { tokenDigest: tokenDigest(token)!, userId: account.id,
      createdAt: new Date(now.getTime() - age), lastSeenAt: new Date(now.getTime() - idle), expiresAt: new Date(now.getTime() - age + ABSOLUTE_MS) } });
    return token;
  }
  expect(await resolveSession(prisma, await fixture(IDLE_MS, IDLE_MS - 1), now)).toMatchObject({ id: account.id });
  const idle = await fixture(IDLE_MS, IDLE_MS);
  expect(await Promise.all([resolveSession(prisma, idle, now), resolveSession(prisma, idle, now)])).toEqual([null, null]);
  const absolute = await fixture(ABSOLUTE_MS, 1);
  expect(await resolveSession(prisma, absolute, now)).toBeNull();
  expect(await resolveSession(prisma, await fixture(ABSOLUTE_MS - 1, 1), now)).toMatchObject({ id: account.id });
  const live = await fixture(100, 100);
  await Promise.all([resolveSession(prisma, live, now), revokeSession(prisma, live)]);
  expect(await resolveSession(prisma, live, now)).toBeNull();
});

it("atomically caps concurrent login username/source and signup source windows without resetting", async () => {
  const username = name("limit");
  const source = `${prefix}source`;
  await rememberKeys("login", username, source);
  const results = await Promise.allSettled(Array.from({ length: 9 }, () => admitAttempt(prisma, "login", username, source, secret)));
  assertAdmissions(results, 5);
  const names = Array.from({ length: 35 }, (_, index) => name(`n${index}`));
  const source2 = `${prefix}many`;
  for (const value of names) await rememberKeys("login", value, source2);
  // The original 35-way burst exhausted Prisma's bounded transaction wait/time
  // budget (P2028), which is availability failure rather than a throttle denial.
  // Fill 25 places in concurrent waves, then race ten callers for five remaining
  // places. This still checks atomic source saturation and requires real 429s.
  const acrossNames: PromiseSettledResult<void>[] = [];
  for (let offset = 0; offset < 25; offset += 5) {
    const wave = await Promise.allSettled(names.slice(offset, offset + 5)
      .map((value) => admitAttempt(prisma, "login", value, source2, secret)));
    assertAdmissions(wave, 5);
    acrossNames.push(...wave);
  }
  const finalRace = await Promise.allSettled(names.slice(25)
    .map((value) => admitAttempt(prisma, "login", value, source2, secret)));
  assertAdmissions(finalRace, 5);
  acrossNames.push(...finalRace);
  assertAdmissions(acrossNames, 30);
  await rememberKeys("signup", username, source);
  const signups = await Promise.allSettled(Array.from({ length: 14 }, () => admitAttempt(prisma, "signup", username, source, secret)));
  assertAdmissions(signups, 10);
  const counters = await prisma.authThrottle.findMany({ where: { key: { in: [...throttleKeys] } } });
  expect(counters.every((counter) => !counter.key.includes(username) && !counter.key.includes(source))).toBe(true);
});

it("expired windows no longer deny and bounded cleanup removes stale counters", async () => {
  const username = name("old"); const source = `${prefix}expired`;
  await rememberKeys("signup", username, source);
  const stale = admissionKeys("signup", username, source, secret, new Date(Date.now() - 7200000))[0];
  throttleKeys.add(stale.key);
  await prisma.authThrottle.create({ data: { key: stale.key, count: 10, expiresAt: stale.expiresAt } });
  await admitAttempt(prisma, "signup", username, source, secret);
  expect(await prisma.authThrottle.findUnique({ where: { key: stale.key } })).toBeNull();
});
