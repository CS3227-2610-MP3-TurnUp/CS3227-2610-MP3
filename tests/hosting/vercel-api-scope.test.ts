import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/vercel-deploy.yml"), "utf8");
const projectId = "prj_synthetic";
const sourceSha = "synthetic-source-sha";
const sourceRef = "preview/synthetic";
const vercelApiExampleUserId = "AEIIDYVk59zbFF2Sxfyxxmua";

const apiChecks = [
  {
    step: "Require an initialized production deployment before Preview",
    expectedPath: "/v7/deployments",
  },
  {
    step: "Check candidate project, production target and source revision",
    expectedPath: "/v13/deployments/turnup-synthetic.vercel.app",
  },
];

function extractNodeScript(stepName: string): string {
  const stepStart = workflow.indexOf(`- name: ${stepName}\n`);
  if (stepStart < 0) throw new Error(`Workflow step not found: ${stepName}`);

  const scriptStartMarker = "node --input-type=module <<'NODE'\n";
  const scriptStart = workflow.indexOf(scriptStartMarker, stepStart);
  const scriptEnd = workflow.indexOf("\n          NODE", scriptStart);
  if (scriptStart < 0 || scriptEnd < 0) throw new Error(`Node script not found: ${stepName}`);

  return workflow
    .slice(scriptStart + scriptStartMarker.length, scriptEnd)
    .split("\n")
    .map((line) => line.replace(/^ {10}/, ""))
    .join("\n");
}

function runApiCheck(script: string, ownerId?: string) {
  const deployments = [{ projectId, target: "production", state: "READY" }];
  const mockBody = JSON.stringify({
    deployments,
    projectId,
    readyState: "READY",
    target: "production",
    meta: { turnupTarget: "production", turnupCommit: sourceSha, turnupRef: sourceRef },
  });
  const harness = `
globalThis.fetch = async (input) => {
  process.stdout.write("FETCH_URL=" + String(input) + "\\n");
  return new Response(${JSON.stringify(mockBody)}, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
${script}
`;
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH ?? "",
    NODE_ENV: "test",
    VERCEL_PROJECT_ID: projectId,
    VERCEL_PROJECT_INITIALIZED: "true",
    VERCEL_TOKEN: "synthetic-token",
    CANDIDATE_URL: "https://turnup-synthetic.vercel.app",
    SOURCE_SHA: sourceSha,
    SOURCE_REF: sourceRef,
  };
  if (ownerId !== undefined) env.VERCEL_ORG_ID = ownerId;

  return spawnSync(process.execPath, ["--input-type=module", "-e", harness], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
}

describe("Vercel workflow REST API account scope", () => {
  for (const { step, expectedPath } of apiChecks) {
    describe(step, () => {
      const script = extractNodeScript(step);

      it("keeps team-owned projects scoped with teamId", () => {
        const result = runApiCheck(script, "team_synthetic123");
        expect(result.status).toBe(0);

        const requestLine = result.stdout.match(/^FETCH_URL=(.+)$/m)?.[1];
        expect(requestLine).toBeDefined();
        const requestUrl = new URL(requestLine!);
        expect(requestUrl.pathname).toBe(expectedPath);
        expect(requestUrl.searchParams.get("teamId")).toBe("team_synthetic123");
        if (step.startsWith("Require")) expect(requestUrl.searchParams.get("projectId")).toBe(projectId);
      });

      it.each([
        ["usr_ prefixed ID", "usr_synthetic123"],
        ["unprefixed Vercel API example", vercelApiExampleUserId],
      ])("uses default personal account scope for %s without teamId", (_label, ownerId) => {
        const result = runApiCheck(script, ownerId);
        expect(result.status).toBe(0);

        const requestLine = result.stdout.match(/^FETCH_URL=(.+)$/m)?.[1];
        expect(requestLine).toBeDefined();
        const requestUrl = new URL(requestLine!);
        expect(requestUrl.pathname).toBe(expectedPath);
        expect(requestUrl.searchParams.has("teamId")).toBe(false);
      });

      it.each([
        undefined,
        "",
        "org_synthetic123",
        "team_",
        "usr_",
        vercelApiExampleUserId.slice(0, -1),
        `${vercelApiExampleUserId}x`,
      ])(
        "rejects missing or unrecognized VERCEL_ORG_ID (%s) before fetching",
        (ownerId) => {
          const result = runApiCheck(script, ownerId);
          expect(result.status).not.toBe(0);
          expect(result.stdout).not.toContain("FETCH_URL=");
          expect(result.stderr).toContain("VERCEL_ORG_ID is missing or uses an unsupported Vercel account ID.");
        },
      );
    });
  }
});
