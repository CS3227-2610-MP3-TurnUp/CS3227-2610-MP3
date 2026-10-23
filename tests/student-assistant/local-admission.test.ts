import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os"; import { join } from "node:path";
vi.mock("server-only", () => ({}));
import { reserveLocal, localAvailability, type LocalAllowance } from "../../src/server/student-assistant/local-admission";
let directory: string; const now = 100000;
const config = { apiKey: "synthetic-key", model: "synthetic-model", maxInputBytes: 65536, maxOutputTokens: 100, timeoutMs: 30000 };
const allowance: LocalAllowance = { version: 1, approvalId: "synthetic-only", model: config.model, permissionConfirmed: true, handlingConfirmed: true, expiresAt: now + 10000, maxAttempts: 2, outputTokenBudget: 150, maxInputBytes: 4096, maxOutputTokens: 50, timeoutMs: 1000, minIntervalMs: 100, attempts: 0, reservedOutputTokens: 0, lastAttemptAt: 0 };
const save = (value: unknown = allowance) => writeFile(join(directory, "allowance.json"), JSON.stringify(value));
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), "student-ai-admission-")); }); afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
describe("persisted local allowance", () => {
  it("never creates missing state or accepts corrupt/unauthorised state", async () => {
    expect(await localAvailability(config, directory, now)).toBe(false); expect((await reserveLocal(config, directory, now)).ok).toBe(false);
    await save({ ...allowance, permissionConfirmed: false }); expect((await reserveLocal(config, directory, now)).ok).toBe(false);
    await writeFile(join(directory, "allowance.json"), "not json"); expect((await reserveLocal(config, directory, now)).ok).toBe(false);
  });
  it("reserves before inference, serializes in-flight calls, enforces spacing and retains reservations", async () => {
    await save(); const first = await reserveLocal(config, directory, now); expect(first.ok).toBe(true); if (!first.ok) throw Error("fixture");
    expect(first.config).toMatchObject({ maxInputBytes: 4096, maxOutputTokens: 50, timeoutMs: 1000 });
    expect(JSON.parse(await readFile(join(directory, "allowance.json"), "utf8"))).toMatchObject({ attempts: 1, reservedOutputTokens: 50, lastAttemptAt: now });
    expect((await reserveLocal(config, directory, now + 101)).ok).toBe(false); await first.release();
    expect(await reserveLocal(config, directory, now + 99)).toEqual({ ok: false, reason: "busy" });
    const second = await reserveLocal(config, directory, now + 100); expect(second.ok).toBe(true); if (second.ok) await second.release();
    expect(await reserveLocal(config, directory, now + 200)).toEqual({ ok: false, reason: "limited" });
    expect(JSON.parse(await readFile(join(directory, "allowance.json"), "utf8"))).toMatchObject({ attempts: 2, reservedOutputTokens: 100 });
  });
  it.each([{ model: "other" }, { expiresAt: now }, { minIntervalMs: 0 }, { lastAttemptAt: now + 1 }, { maxInputBytes: 65537 }, { attempts: 3 }, { reservedOutputTokens: 151 }])("denies invalid state %j", async (change) => { await save({ ...allowance, ...change }); expect((await reserveLocal(config, directory, now)).ok).toBe(false); });
  it("denies a reservation that would overspend output allowance", async () => { await save({ ...allowance, outputTokenBudget: 49 }); expect(await reserveLocal(config, directory, now)).toEqual({ ok: false, reason: "limited" }); });
  it("never resets an abandoned lock or unavailable directory", async () => { await save(); await writeFile(join(directory, "admission.lock"), "abandoned"); expect((await reserveLocal(config, directory, now)).ok).toBe(false); expect((await reserveLocal(config, join(directory, "missing"), now)).ok).toBe(false); });
});
