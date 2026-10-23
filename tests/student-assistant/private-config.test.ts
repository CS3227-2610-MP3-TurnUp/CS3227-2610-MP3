import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";
// Exercise the same helper directly; Windows process startup is not the behaviour under test.
const helperUrl = pathToFileURL(resolve("scripts/copy-student-assistant-env.mjs")).href;
const helper = await import(/* @vite-ignore */ helperUrl);
const copySettings: (source: string, target: string) => Promise<{ copiedNames: string[]; effectiveValuesMatch: boolean }> = helper.copySettings;
let dir: string;
const six = ["SOCLAAS_API_KEY=synthetic-key", "SOCLAAS_BASE_URL=https://soclaas-api.comp.nus.edu.sg/v1", "SOCLAAS_MODEL=synthetic-model", "SOCLAAS_MAX_INPUT_BYTES=4096", "SOCLAAS_MAX_OUTPUT_TOKENS=100", "SOCLAAS_TIMEOUT_MS=1000", ""].join(String.fromCharCode(10));
async function run(source = six) { writeFileSync(join(dir, "source.env"), source); return copySettings(join(dir, "source.env"), join(dir, ".env.local")); }
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "student-ai-env-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });
describe("private six-setting projection with synthetic fixtures", () => {
  it("copies no unrelated secrets, preserves existing bytes and is idempotent", async () => {
    const prefix = "# existing" + String.fromCharCode(10); writeFileSync(join(dir, ".env.local"), prefix);
    const result = await run(six + "DATABASE_URL=synthetic-private-db"); expect(result.copiedNames).toHaveLength(6); expect(result.effectiveValuesMatch).toBe(true); expect(JSON.stringify(result)).not.toContain("synthetic-key");
    const saved = readFileSync(join(dir, ".env.local"), "utf8"); expect(saved.startsWith(prefix)).toBe(true); expect(saved).not.toContain("DATABASE_URL");
    await run(); expect(readFileSync(join(dir, ".env.local"), "utf8")).toBe(saved); expect(parseEnv(saved).SOCLAAS_MODEL).toBe("synthetic-model");
  });
  it.each([six + "SOCLAAS_MODEL=duplicate", six.replace("synthetic-key", "$UNRELATED_SECRET"), six.replace("synthetic-key", "'unsafe#literal'")])("refuses ambiguous/interpolated settings before writing", async (source) => {
    await expect(run(source)).rejects.toThrow("unsafe_source_setting"); expect(existsSync(join(dir, ".env.local"))).toBe(false);
  });
  it("preserves conflicting destination unchanged", async () => {
    const original = "SOCLAAS_MODEL=other"; writeFileSync(join(dir, ".env.local"), original);
    await expect(run()).rejects.toThrow("destination_setting_conflict:SOCLAAS_MODEL"); expect(readFileSync(join(dir, ".env.local"), "utf8")).toBe(original);
  });
});
