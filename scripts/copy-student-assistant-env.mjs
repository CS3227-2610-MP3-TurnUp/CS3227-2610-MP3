import { readFile, open, rename, unlink } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
export const settings = ["SOCLAAS_API_KEY", "SOCLAAS_BASE_URL", "SOCLAAS_MODEL", "SOCLAAS_MAX_INPUT_BYTES", "SOCLAAS_MAX_OUTPUT_TOKENS", "SOCLAAS_TIMEOUT_MS"];
function select(text) {
  const parsed = parseEnv(text), selected = {};
  for (const name of settings) {
    const count = [...text.matchAll(new RegExp('^\s*(?:export\s+)?' + name + '\s*=', 'gm'))].length;
    // Restrict the private copy to standalone literal settings. Never resolve unrelated variables.
    if (count !== 1 || !parsed[name] || !/^[A-Za-z0-9._~+/:=-]+$/.test(parsed[name])) throw Error("unsafe_source_setting");
    selected[name] = parsed[name];
  }
  return selected;
}
export async function copySettings(source, target) {
  const sourceBytes = await readFile(source, "utf8"), selected = select(sourceBytes);
  let original;
  try { original = await readFile(target, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw Error("destination_unavailable"); }
  const existing = parseEnv(original ?? ""); let additions = "";
  for (const name of settings) {
    const count = [...(original ?? "").matchAll(new RegExp('^\s*(?:export\s+)?' + name + '\s*=', 'gm'))].length;
    if (count > 1 || (Object.hasOwn(existing, name) && existing[name] !== selected[name])) throw Error("destination_setting_conflict:" + name);
    if (!Object.hasOwn(existing, name)) additions += name + "=" + selected[name] + "\n";
  }
  if (additions) {
    const next = (original ?? "") + (original && !original.endsWith("\n") ? "\n" : "") + additions;
    const temp = join(dirname(target), ".env.student-assistant-copy-" + randomUUID() + ".tmp");
    let writer;
    try {
      writer = await open(temp, "wx", 0o600); await writer.writeFile(next); await writer.sync(); await writer.close(); writer = undefined;
      // Fail rather than overwriting an intervening operator edit.
      let current; try { current = await readFile(target, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw Error("destination_unavailable"); }
      if (current !== original) throw Error("destination_changed");
      await rename(temp, target);
    } finally { await writer?.close(); await unlink(temp).catch(() => undefined); }
  }
  const checked = parseEnv(await readFile(target, "utf8"));
  if (!settings.every((name) => checked[name] === selected[name])) throw Error("private_verification_failed");
  return { copiedNames: settings, preservedExisting: true, effectiveValuesMatch: true };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [source, target] = process.argv.slice(2);
  try {
    if (!source || !target) throw Error("paths_required");
    console.log(JSON.stringify(await copySettings(resolve(source), resolve(target))));
  } catch { console.error("Private configuration copy refused; no credential values displayed."); process.exitCode = 1; }
}
