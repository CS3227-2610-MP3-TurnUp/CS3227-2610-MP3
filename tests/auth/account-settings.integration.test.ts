import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/server/db/generated/client";
import { readMigrationDatabaseConfig, readRuntimeDatabaseConfig } from "../../src/server/config/environment";
import * as passwords from "../../src/server/auth/password";
import { AuthError } from "../../src/server/auth/policy";
import { authenticate } from "../../src/server/auth/service";
import { lockAccount, replaceSession, resolveSession, revokeSession, tokenDigest, type Transaction } from "../../src/server/auth/session";
import { admissionKeys, admitAttempt } from "../../src/server/auth/throttle";
import { changeCredentials, readSettings } from "../../src/server/accounts/service";
import { parseChange, parseProfile } from "../../src/server/accounts/policy";
import { studentProfile } from "../../src/server/accounts/profile";

if (process.env.RUN_AUTH_DB_INTEGRATION !== "1" || process.env.AUTH_TEST_OWNER !== "darryl") {
  throw new Error("Account settings SQL tests require explicit Darryl-owned synthetic target opt-in.");
}
const runtime = readRuntimeDatabaseConfig(process.env);
const migration = readMigrationDatabaseConfig(process.env, "status");
const pooled = new URL(runtime.databaseUrl); const direct = new URL(migration.migrationDatabaseUrl);
const endpoint = (url: URL) => url.hostname.replace("-pooler", "");
if (runtime.turnupEnvironment !== "development" || runtime.databaseEnvironment !== "non-production" ||
    !process.env.AUTH_TEST_ENDPOINT_HOST || endpoint(pooled) !== process.env.AUTH_TEST_ENDPOINT_HOST || endpoint(direct) !== endpoint(pooled) ||
    !process.env.AUTH_TEST_DATABASE_NAME || decodeURIComponent(pooled.pathname.slice(1)) !== process.env.AUTH_TEST_DATABASE_NAME || pooled.pathname !== direct.pathname) {
  throw new Error("Account settings SQL tests require matching assigned development pooled/direct targets.");
}
// Independent clients exercise persistence across application instances.
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: runtime.databaseUrl }) });
const other = new PrismaClient({ adapter: new PrismaPg({ connectionString: runtime.databaseUrl }) });
const prefix = `set_${randomUUID().replaceAll("-", "").slice(0, 16)}_`;
const ids: string[] = []; const keys = new Set<string>();
const secret = randomBytes(32).toString("hex");
const password = "private original settings phrase";
let hash: string;
beforeAll(async () => { hash = await passwords.hashPassword(password); });
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  try { await db.user.deleteMany({ where: { id: { in: ids } } }); await db.authThrottle.deleteMany({ where: { key: { in: [...keys] } } }); }
  finally { await Promise.all([db.$disconnect(), other.$disconnect()]); }
});
async function fixture(suffix: string, role: "STUDENT" | "ORGANISER" = "STUDENT") {
  const id = randomUUID(); ids.push(id);
  const user = await db.user.create({ data: { id, username: `${prefix}${suffix}`, role, passwordHash: hash } });
  const token = await db.$transaction((tx) => replaceSession(tx, id));
  return { user, token };
}
function usernameInput(username: string, version = 0) { return parseChange({ action: "username", username, currentPassword: password, expectedCredentialVersion: version }); }
function passwordInput(value: string, version = 0) { return parseChange({ action: "password", newPassword: value, currentPassword: password, expectedCredentialVersion: version }); }
function pauseVerification() {
  const reached = Promise.withResolvers<void>(); const release = Promise.withResolvers<void>();
  const original = passwords.verifyPassword;
  vi.spyOn(passwords, "verifyPassword").mockImplementationOnce(async (...args) => {
    const valid = await original(...args); reached.resolve(); await release.promise; return valid;
  });
  return { reached: reached.promise, release: release.resolve };
}
async function expectAuthFailure(promise: Promise<unknown>, statuses: number[]) {
  const outcome = await promise.then(() => ({ ok: true, auth: false, status: 0 }), (error: unknown) => ({
    ok: false, auth: error instanceof AuthError, status: error instanceof AuthError ? error.status : 0,
  }));
  expect(outcome.ok).toBe(false); expect(outcome.auth).toBe(true); expect(statuses).toContain(outcome.status);
}
async function remember(id: string, source: string) {
  const [clock] = await db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  for (const delta of [-900000, 0, 900000]) admissionKeys("credentials", id, source, secret, new Date(clock.now.getTime() + delta)).forEach((entry) => keys.add(entry.key));
}

it("both roles rename retaining UUID/role/profile/all sessions, then change password using returned revision and revoke every device", async () => {
  for (const role of ["STUDENT", "ORGANISER"] as const) {
    const { user, token } = await fixture(role.toLowerCase(), role);
    const second = await db.$transaction((tx) => replaceSession(tx, user.id));
    if (role === "STUDENT") await studentProfile(db, token, parseProfile({ name: "José 李", phone: "+65 0123 4567", expectedProfileVersion: 0 }));
    expect(await changeCredentials(db, token, usernameInput(` ${user.username.toUpperCase()} `))).toEqual({ changed: false });
    expect(await changeCredentials(db, token, passwordInput(password))).toEqual({ changed: false });
    expect(await resolveSession(other, second)).toMatchObject({ id: user.id });
    const renamed = `${prefix}${role === "STUDENT" ? "student_new" : "org_new"}`;
    const result = await changeCredentials(db, token, usernameInput(renamed));
    expect(result).toMatchObject({ changed: true, username: renamed, credentialVersion: 1 });
    const saved = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { id: true, role: true, username: true, credentialVersion: true, studentName: true } });
    expect(saved).toMatchObject({ id: user.id, role, username: renamed, credentialVersion: 1 });
    if (role === "STUDENT") expect(saved.studentName).toBe("José 李");
    expect(await resolveSession(db, token)).toMatchObject({ id: user.id, username: renamed });
    expect(await resolveSession(other, second)).toMatchObject({ id: user.id, username: renamed });
    await expectAuthFailure(authenticate(db, "login", { username: user.username, password }), [401]);
    expect((await authenticate(db, "login", { username: renamed, password })).redirect).toBe(role === "STUDENT" ? "/student" : "/organiser");
    expect(await changeCredentials(db, token, passwordInput("a changed private settings phrase", result.credentialVersion))).toMatchObject({ changed: true, redirect: "/login" });
    expect(await resolveSession(db, token)).toBeNull(); expect(await resolveSession(other, second)).toBeNull();
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
  }
});
it("verified old-password login cannot issue after password change", async () => {
  const { user, token } = await fixture("oldpwd"); const barrier = pauseVerification();
  const login = authenticate(other, "login", { username: user.username, password });
  try {
    await barrier.reached;
    await changeCredentials(db, token, passwordInput("a new unique settings password"));
  } finally { barrier.release(); }
  await expectAuthFailure(login, [401]);
  expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
  await expectAuthFailure(authenticate(db, "login", { username: user.username, password }), [401]);
  expect((await authenticate(db, "login", { username: user.username, password: "a new unique settings password" })).redirect).toBe("/student");
});
it("verified old-name login cannot issue after rename", async () => {
  const { user, token } = await fixture("oldname"); const barrier = pauseVerification();
  const login = authenticate(other, "login", { username: user.username, password });
  try { await barrier.reached; await changeCredentials(db, token, usernameInput(`${prefix}renamed`)); }
  finally { barrier.release(); }
  await expectAuthFailure(login, [401]); expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
  expect(await resolveSession(other, token)).toMatchObject({ id: user.id, username: `${prefix}renamed` });
});
it("concurrent verified username saves preserve sessions and reject stale work with conflict", async () => {
  const { user, token } = await fixture("parallel");
  const reached = Promise.withResolvers<void>(); const release = Promise.withResolvers<void>(); let count = 0;
  const original = passwords.verifyPassword;
  vi.spyOn(passwords, "verifyPassword").mockImplementation(async (...args) => { const valid = await original(...args); if (++count === 2) reached.resolve(); await release.promise; return valid; });
  const one = changeCredentials(db, token, usernameInput(`${prefix}winner_a`));
  const two = changeCredentials(other, token, usernameInput(`${prefix}winner_b`));
  await reached.promise; release.resolve();
  const outcomes = await Promise.allSettled([one, two]);
  expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
  for (const outcome of outcomes) if (outcome.status === "rejected") { expect(outcome.reason instanceof AuthError).toBe(true); expect(outcome.reason.status).toBe(409); }
  expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).credentialVersion).toBe(1);
  expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
  expect(await resolveSession(other, token)).toMatchObject({ id: user.id });
});
it("duplicate replacement race has one winner and loser account/sessions stay unchanged", async () => {
  const a = await fixture("dupa"); const b = await fixture("dupb"); const name = `${prefix}same`;
  const outcomes = await Promise.allSettled([changeCredentials(db, a.token, usernameInput(name)), changeCredentials(other, b.token, usernameInput(name))]);
  expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
  for (let index = 0; index < outcomes.length; index++) if (outcomes[index].status === "rejected") {
    const outcome = outcomes[index] as PromiseRejectedResult;
    expect(outcome.reason instanceof AuthError).toBe(true); expect(outcome.reason.status).toBe(409);
    const loser = index === 0 ? a : b;
    expect(await resolveSession(db, loser.token)).toMatchObject({ id: loser.user.id, username: loser.user.username });
    expect((await db.user.findUniqueOrThrow({ where: { id: loser.user.id } })).credentialVersion).toBe(0);
  }
});
it("logout or expiry while a verified mutation queues on the user lock denies the mutation", async () => {
  for (const mode of ["logout", "expiry"] as const) {
    const { user, token } = await fixture(mode);
    const locked = Promise.withResolvers<void>(); const unlock = Promise.withResolvers<void>();
    const lock = other.$transaction(async (tx) => { await lockAccount(tx, user.id); locked.resolve(); await unlock.promise; });
    await locked.promise;
    const barrier = pauseVerification();
    const change = changeCredentials(db, token, usernameInput(`${prefix}${mode}_new`));
    try {
      await barrier.reached;
      if (mode === "logout") await revokeSession(db, token);
      else await db.session.update({ where: { tokenDigest: tokenDigest(token)! }, data: { expiresAt: new Date(0) } });
    } finally { barrier.release(); unlock.resolve(); await lock; }
    await expectAuthFailure(change, [401]);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).username).toBe(user.username);
  }
});
it("transaction failure rolls credential write and session revocation back together", async () => {
  const { user, token } = await fixture("rollback");
  const failing = new Proxy(db, { get(target, key) {
    if (key === "$transaction") return (callback: (tx: Transaction) => Promise<unknown>) => target.$transaction((tx) => callback(new Proxy(tx, { get(inner, property) {
      if (property === "session") return { deleteMany: async () => { throw new Error("synthetic rollback"); } };
      const value = Reflect.get(inner, property); return typeof value === "function" ? value.bind(inner) : value;
    } })));
    const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
  } });
  await expect(changeCredentials(failing, token, passwordInput("a rollback candidate settings phrase"))).rejects.toThrow("synthetic rollback");
  expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).username).toBe(user.username);
  expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).credentialVersion).toBe(0);
  expect(await passwords.verifyPassword(password, (await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash)).toBe(true);
  expect(await resolveSession(db, token)).toMatchObject({ id: user.id });
});
it("Student profile adds/removes independently, stale removal races reject, and Organiser sees no profile", async () => {
  const { user, token } = await fixture("profile");
  expect(await studentProfile(db, token)).toMatchObject({ name: null, phone: null, profileVersion: 0 });
  await studentProfile(db, token, parseProfile({ name: "Núñez 王", phone: "0012345", expectedProfileVersion: 0 }));
  const attempts = await Promise.allSettled([
    studentProfile(db, token, parseProfile({ name: null, phone: "0012345", expectedProfileVersion: 1 })),
    studentProfile(other, token, parseProfile({ name: "stale tab", phone: null, expectedProfileVersion: 1 })),
  ]);
  expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  for (const result of attempts) if (result.status === "rejected") { expect(result.reason instanceof AuthError).toBe(true); expect(result.reason.status).toBe(409); }
  const profile = await studentProfile(db, token);
  await studentProfile(db, token, parseProfile({ name: null, phone: null, expectedProfileVersion: profile.profileVersion }));
  expect(await studentProfile(db, token)).toMatchObject({ name: null, phone: null });
  expect(await resolveSession(db, token)).toEqual({ id: user.id, username: user.username, role: "STUDENT" });
  expect(Object.keys(await readSettings(db, token)).sort()).toEqual(["credentialVersion", "role", "username"]);
  const organiser = await fixture("org", "ORGANISER"); await expectAuthFailure(studentProfile(db, organiser.token), [403]);
});
it("credential admissions share UUID budget across rename/actions and independent clients", async () => {
  const { user, token } = await fixture("budget"); const source = `${prefix}source`;
  await remember(user.id, source);
  await Promise.all([admitAttempt(db, "credentials", user.id, source, secret), admitAttempt(other, "credentials", user.id, source, secret)]);
  await changeCredentials(db, token, usernameInput(`${prefix}budget_new`));
  await Promise.all([admitAttempt(db, "credentials", user.id, source, secret), admitAttempt(other, "credentials", user.id, source, secret), admitAttempt(db, "credentials", user.id, source, secret)]);
  await expectAuthFailure(admitAttempt(other, "credentials", user.id, source, secret), [429]);
});
