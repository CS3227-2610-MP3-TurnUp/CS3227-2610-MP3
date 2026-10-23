import "server-only";
import { open, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { SoCConfig } from "../ai/soclaas-config";

export interface LocalAllowance {
  version: 1; approvalId: string; model: string; permissionConfirmed: true; handlingConfirmed: true;
  expiresAt: number; maxAttempts: number; outputTokenBudget: number;
  maxInputBytes: number; maxOutputTokens: number; timeoutMs: number; minIntervalMs: number;
  attempts: number; reservedOutputTokens: number; lastAttemptAt: number;
}
const fields = ["version", "approvalId", "model", "permissionConfirmed", "handlingConfirmed", "expiresAt", "maxAttempts", "outputTokenBudget", "maxInputBytes", "maxOutputTokens", "timeoutMs", "minIntervalMs", "attempts", "reservedOutputTokens", "lastAttemptAt"];
function positive(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value > 0; }
function nonnegative(value: unknown): value is number { return value === 0 || positive(value); }
function parse(value: unknown): LocalAllowance | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const a = value as Record<string, unknown>;
  if (Object.keys(a).length !== fields.length || !fields.every((key) => Object.hasOwn(a, key)) || a.version !== 1 || a.permissionConfirmed !== true || a.handlingConfirmed !== true
    || typeof a.approvalId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(a.approvalId) || typeof a.model !== "string" || !/^[A-Za-z0-9._:/-]{1,256}$/.test(a.model)
    || !["expiresAt", "maxAttempts", "outputTokenBudget", "maxInputBytes", "maxOutputTokens", "timeoutMs", "minIntervalMs"].every((key) => positive(a[key]))
    || !["attempts", "reservedOutputTokens", "lastAttemptAt"].every((key) => nonnegative(a[key]))) return null;
  if ((a.maxInputBytes as number) > 65536 || (a.maxOutputTokens as number) > 4096 || (a.timeoutMs as number) > 30000
    || (a.attempts as number) > (a.maxAttempts as number) || (a.reservedOutputTokens as number) > (a.outputTokenBudget as number)) return null;
  return a as unknown as LocalAllowance;
}
const defaultDirectory = resolve(process.cwd(), ".student-assistant-local");
async function readAllowance(directory: string): Promise<LocalAllowance | null> {
  try {
    const file = await open(join(directory, "allowance.json"), "r");
    try {
      const size = (await file.stat()).size; if (size > 8192) return null;
      return parse(JSON.parse(await file.readFile("utf8")));
    } finally { await file.close(); }
  } catch { return null; }
}
function status(a: LocalAllowance | null, config: SoCConfig, now: number) {
  if (!a || a.model !== config.model || now >= a.expiresAt || (a.lastAttemptAt > now)) return "blocked" as const;
  const output = Math.min(config.maxOutputTokens, a.maxOutputTokens);
  if (a.attempts >= a.maxAttempts || output > a.outputTokenBudget - a.reservedOutputTokens) return "limited" as const;
  if (a.attempts > 0 && now - a.lastAttemptAt < a.minIntervalMs) return "busy" as const;
  return "available" as const;
}
export async function localAvailability(config: SoCConfig, directory = defaultDirectory, now = Date.now()) {
  return status(await readAllowance(directory), config, now) === "available";
}
export type Admission = { ok: false; reason: "blocked" | "limited" | "busy" } | { ok: true; config: SoCConfig; release: () => Promise<void> };
/** No allowance creation/reset API. Missing/corrupt state and abandoned locks fail closed. */
export async function reserveLocal(config: SoCConfig, directory = defaultDirectory, now = Date.now()): Promise<Admission> {
  let lock;
  try { lock = await open(join(directory, "admission.lock"), "wx", 0o600); }
  catch { return { ok: false, reason: "blocked" }; }
  let released = false;
  const release = async () => { if (released) return; released = true; await lock.close(); await unlink(join(directory, "admission.lock")); };
  let temporary: string | undefined;
  try {
    const allowance = await readAllowance(directory);
    const decision = status(allowance, config, now);
    if (decision !== "available" || !allowance) { await release(); return { ok: false, reason: decision === "available" ? "blocked" : decision }; }
    const capped = { ...config, maxInputBytes: Math.min(config.maxInputBytes, allowance.maxInputBytes), maxOutputTokens: Math.min(config.maxOutputTokens, allowance.maxOutputTokens), timeoutMs: Math.min(config.timeoutMs, allowance.timeoutMs) };
    const next = { ...allowance, attempts: allowance.attempts + 1, reservedOutputTokens: allowance.reservedOutputTokens + capped.maxOutputTokens, lastAttemptAt: now };
    temporary = join(directory, "reservation-" + randomUUID() + ".tmp");
    const writer = await open(/* turbopackIgnore: true */ temporary, "wx", 0o600);
    try { await writer.writeFile(JSON.stringify(next)); await writer.sync(); } finally { await writer.close(); }
    await rename(temporary, join(directory, "allowance.json")); temporary = undefined;
    return { ok: true, config: capped, release };
  } catch {
    if (temporary) await unlink(temporary).catch(() => undefined);
    // If cleanup fails the lock remains, preventing later inference.
    await release().catch(() => undefined);
    return { ok: false, reason: "blocked" };
  }
}
