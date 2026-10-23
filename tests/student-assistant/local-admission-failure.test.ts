import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
vi.mock("server-only", () => ({}));
const fault = vi.hoisted(() => ({ sync: false, rename: false }));
vi.mock("node:fs/promises", async (original) => {
  const actual = await original<typeof import("node:fs/promises")>();
  return { ...actual,
    rename: async (...args: Parameters<typeof actual.rename>) => { if (fault.rename) throw Error("synthetic rename failure"); return actual.rename(...args); },
    open: async (...args: Parameters<typeof actual.open>) => {
      const file = await actual.open(...args);
      if (fault.sync && String(args[0]).includes("reservation-")) file.sync = async () => { throw Error("synthetic sync failure"); };
      return file;
    },
  };
});
import { reserveLocal } from "../../src/server/student-assistant/local-admission";
let directory: string;
const config = { apiKey: "synthetic-key", model: "synthetic-model", maxInputBytes: 4096, maxOutputTokens: 100, timeoutMs: 1000 };
const allowance = { version: 1, approvalId: "synthetic-only", model: config.model, permissionConfirmed: true, handlingConfirmed: true, expiresAt: 10000, maxAttempts: 2, outputTokenBudget: 200, maxInputBytes: 4096, maxOutputTokens: 100, timeoutMs: 1000, minIntervalMs: 100, attempts: 0, reservedOutputTokens: 0, lastAttemptAt: 0 };
beforeEach(async () => { fault.sync = false; fault.rename = false; directory = await mkdtemp(join(tmpdir(), "student-ai-write-")); await writeFile(join(directory, "allowance.json"), JSON.stringify(allowance)); });
afterEach(async () => { fault.sync = false; fault.rename = false; await rm(directory, { recursive: true, force: true }); });
describe("admission durable write failures", () => {
  it.each(["sync", "rename"] as const)("does not admit inference when %s fails", async (failure) => {
    fault[failure] = true;
    expect(await reserveLocal(config, directory, 1000)).toEqual({ ok: false, reason: "blocked" });
    expect(JSON.parse(await readFile(join(directory, "allowance.json"), "utf8"))).toEqual(allowance);
    expect(await readdir(directory)).toEqual(["allowance.json"]);
  });
});
