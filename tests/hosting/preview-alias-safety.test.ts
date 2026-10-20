import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const scriptPath = resolve(".github/scripts/check-preview-alias.mjs");
const preview = "turnup-preview.vercel.app";
const production = "turnup.vercel.app";
const projectId = "prj_synthetic";
const page = (names: string[], next: number | null = null) => ({
  domains: names.map((name) => ({ name, projectId })), pagination: { next },
});

function run(pages: unknown[], env: Record<string, string> = {}, status = 200) {
  const harness = `
const { checkPreviewAlias } = await import(${JSON.stringify(pathToFileURL(scriptPath).href)});
const pages = ${JSON.stringify(pages)};
let index = 0;
try {
  await checkPreviewAlias(process.env, async (url, options) => {
    console.log('REQUEST=' + url);
    if (options.headers.authorization !== 'Bearer synthetic-token') throw new Error('missing auth');
    if (!options.signal || options.redirect !== 'error') throw new Error('unbounded request');
    const body = pages[index++];
    if (body === 'NETWORK_ERROR') throw new Error('synthetic-sensitive-body');
    if (body === 'BAD_JSON') return { ok: true, json: async () => { throw new Error('bad JSON'); } };
    return { ok: ${status} === 200, json: async () => body };
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
`;
  return spawnSync(process.execPath, ["--input-type=module", "-e", harness], {
    encoding: "utf8",
    env: {
      NODE_ENV: "test",
      PATH: process.env.PATH,
      DEPLOYMENT_TARGET: "preview",
      PREVIEW_ALIAS: preview,
      VERCEL_PROJECT_ID: projectId,
      VERCEL_ORG_ID: "team_synthetic",
      VERCEL_TOKEN: "synthetic-token",
      ...env,
    },
  });
}

describe("Preview alias Production-domain safety", () => {
  it("rejects the existing Production hostname even though its syntax is valid", () => {
    const result = run([page([production])], { PREVIEW_ALIAS: production });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Production hostname");
  });

  it("checks every page before allowing a dedicated alias", () => {
    const result = run([page([production], 123), page(["other.vercel.app"])]);
    expect(result.status).toBe(0);
    const requests = result.stdout.trim().split("\n").map((line) => new URL(line.slice(8)));
    expect(requests).toHaveLength(2);
    expect(requests[0].pathname).toBe(`/v9/projects/${projectId}/domains`);
    expect(requests[0].searchParams.get("production")).toBe("true");
    expect(requests[0].searchParams.get("limit")).toBe("100");
    expect(requests[0].searchParams.get("teamId")).toBe("team_synthetic");
    expect(requests[1].searchParams.get("until")).toBe("123");
  });

  it("rejects a Production collision on a later page with normalized DNS spelling", () => {
    const result = run([page([production], 123), page([preview.toUpperCase() + "."])]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Production hostname");
  });

  it.each(["usr_synthetic", "AEIIDYVk59zbFF2Sxfyxxmua"])("uses personal scope for %s", (owner) => {
    const result = run([page([production])], { VERCEL_ORG_ID: owner });
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("teamId");
  });

  it.each([401, 403, 404, 429, 500])("blocks on HTTP %s instead of assuming no Production aliases", (status) => {
    expect(run([page([])], {}, status).status).toBe(1);
  });

  it.each([
    undefined, null, {}, { domains: [] }, { domains: [], pagination: {} },
    { domains: [{ name: production, projectId: "prj_other" }], pagination: { next: null } },
    { domains: [null], pagination: { next: null } },
    page([], -1), page([], "123" as unknown as number), "BAD_JSON", "NETWORK_ERROR",
  ])("blocks on malformed or unavailable Production-domain metadata: %j", (body) => {
    expect(run([body]).status).toBe(1);
  });

  it("blocks repeated pagination cursors and excessive pagination", () => {
    expect(run([page([], 123), page([], 123)]).status).toBe(1);
    const result = run(Array.from({ length: 20 }, (_, index) => page([], 100 - index)));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("pagination limit");
  });

  it("rejects hostile alias configuration without executing it or making requests", () => {
    const result = run([], { PREVIEW_ALIAS: '$(printf UNAUTHORIZED >&2).vercel.app' });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain("UNAUTHORIZED");
  });

  it("does not fetch or require Preview settings for Production", () => {
    const result = run([], { DEPLOYMENT_TARGET: "production", PREVIEW_ALIAS: "", VERCEL_TOKEN: "" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("keeps CLI diagnostics fixed instead of exposing raw provider errors", () => {
    const result = spawnSync(process.execPath, [scriptPath], {
      encoding: "utf8", env: { NODE_ENV: "test", DEPLOYMENT_TARGET: "preview", PREVIEW_ALIAS: preview },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toBe("Preview alias safety check failed. Use a dedicated non-Production hostname and verify Vercel read access.\n");
    expect(readFileSync(scriptPath, "utf8")).not.toContain("console.error(error");
  });
});
