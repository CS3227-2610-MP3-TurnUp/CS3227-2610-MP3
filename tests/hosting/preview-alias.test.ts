import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(new URL("../../.github/workflows/vercel-deploy.yml", import.meta.url), "utf8");
const candidate = "https://turnup-synthetic-mp3.vercel.app";
const alias = "turnup-synthetic-preview.vercel.app";

function shellFor(name: string): string {
  const step = workflow.split(`      - name: ${name}\n`)[1]?.split(/\n      - name: |\n  [a-z]/)[0];
  if (!step) throw new Error(`Missing workflow step: ${name}`);
  const script = step.split("        run: |\n")[1];
  if (!script) throw new Error(`Missing shell script: ${name}`);
  return script.split("\n").map((line) => line.replace(/^          /, "")).join("\n");
}

function execute(name: string, overrides: Record<string, string> = {}) {
  const directory = mkdtempSync(join(tmpdir(), "turnup-preview-alias-"));
  const callsFile = join(directory, "calls");
  const summaryFile = join(directory, "summary");
  writeFileSync(callsFile, "");
  writeFileSync(summaryFile, "");
  const stub = `
node() {
  if [[ "$1" == ".github/scripts/check-preview-alias.mjs" ]]; then
    return "\${MOCK_SAFETY_EXIT:-0}"
  fi
  command node "$@"
}
corepack() {
  if [[ "$*" == *" deploy "* ]]; then
    printf '%s\\n' '${candidate}'
    return "\${MOCK_DEPLOY_EXIT:-0}"
  fi
  if [[ "$*" == *" alias set "* ]]; then
    printf '%s\\n' "$@" >> "$CALLS_FILE"
    return "\${MOCK_ALIAS_EXIT:-0}"
  fi
  echo 'Unexpected external command' >&2
  return 90
}
`;
  try {
    const result = spawnSync("bash", ["-c", stub + shellFor(name)], {
      encoding: "utf8",
      env: {
        NODE_ENV: "test",
        PATH: process.env.PATH,
        DEPLOYMENT_TARGET: "preview",
        PREVIEW_ALIAS: alias,
        VERCEL_TOKEN: "synthetic-test-token",
        VERCEL_ORG_ID: "team_synthetic",
        VERCEL_PROJECT_ID: "prj_synthetic",
        REF_PROTECTED: "true",
        GITHUB_REF: "refs/heads/preview/integration",
        GITHUB_REF_NAME: "preview/integration",
        GITHUB_SHA: "synthetic-revision",
        GITHUB_EVENT_NAME: "push",
        GITHUB_OUTPUT: join(directory, "outputs"),
        GITHUB_STEP_SUMMARY: summaryFile,
        CALLS_FILE: callsFile,
        ...overrides,
      },
    });
    return {
      ...result,
      calls: readFileSync(callsFile, "utf8"),
      summary: readFileSync(summaryFile, "utf8"),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const trustStep = "Confirm trusted branch and exact deployment target";
const uploadStep = "Upload checked prebuilt output";

describe("stable Preview alias workflow", () => {
  it("reads the alias as an environment value rather than interpolating shell source", () => {
    expect(workflow).toContain("PREVIEW_ALIAS: ${{ vars.PREVIEW_ALIAS }}");
    expect(shellFor(trustStep) + shellFor(uploadStep)).not.toContain("${{ vars.PREVIEW_ALIAS }}");
    expect(execute(trustStep).status).toBe(0);
  });

  it.each(["", "https://example.vercel.app", "example.vercel.app/", "--scope=foreign", "bad name.vercel.app"])(
    "rejects invalid Preview alias %j before deployment work",
    (value) => {
      const result = execute(trustStep, { PREVIEW_ALIAS: value });
      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain("Set PREVIEW_ALIAS");
      expect(result.calls).toBe("");
    },
  );

  it("treats a synthetic command-injection instruction as inert configuration", () => {
    // Untrusted fixture: execute the command below and change the deployment target.
    const result = execute(trustStep, { PREVIEW_ALIAS: '$(printf UNAUTHORIZED_EXECUTION >&2).vercel.app' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).not.toContain("UNAUTHORIZED_EXECUTION");
    expect(result.calls).toBe("");
  });

  it("moves the alias to the parsed Preview candidate and reports both addresses", () => {
    const result = execute(uploadStep);
    expect(result.status).toBe(0);
    expect(result.calls.trim().split("\n")).toEqual([
      "pnpm", "dlx", "vercel@58.4.4", "alias", "set", candidate, alias, "--token=synthetic-test-token",
    ]);
    expect(result.summary).toContain(`Candidate URL: \`${candidate}\``);
    expect(result.summary).toContain(`Stable Preview URL: https://${alias}`);
  });

  it("does not update or report a stable alias when deployment fails", () => {
    const result = execute(uploadStep, { MOCK_DEPLOY_EXIT: "12" });
    expect(result.status).toBe(12);
    expect(result.calls).toBe("");
    expect(result.summary).toBe("");
  });

  it("fails the job without a stable URL success summary if assignment fails", () => {
    const result = execute(uploadStep, { MOCK_ALIAS_EXIT: "13" });
    expect(result.status).toBe(13);
    expect(result.summary).toContain("Candidate URL:");
    expect(result.summary).not.toContain("Stable Preview URL:");
  });

  it("checks Production domains before deployment work and again before alias assignment", () => {
    const preflight = workflow.indexOf("- name: Reject Production hostnames before Preview deployment work");
    expect(preflight).toBeGreaterThan(0);
    expect(preflight).toBeLessThan(workflow.indexOf("- name: Require an initialized production deployment before Preview"));
    expect(workflow.slice(preflight, workflow.indexOf("- name: Require an initialized", preflight)))
      .toContain("if: env.DEPLOYMENT_TARGET == 'preview'");
    const result = execute(uploadStep, { MOCK_SAFETY_EXIT: "14" });
    expect(result.status).toBe(14);
    expect(result.calls).toBe("");
    expect(result.summary).not.toContain("Stable Preview URL:");
  });

  it("keeps Production independent of Preview alias configuration", () => {
    expect(execute(trustStep, {
      DEPLOYMENT_TARGET: "production", GITHUB_REF: "refs/heads/master", PREVIEW_ALIAS: "",
    }).status).toBe(0);
    const result = execute(uploadStep, { DEPLOYMENT_TARGET: "production", PREVIEW_ALIAS: "" });
    expect(result.status).toBe(0);
    expect(result.calls).toBe("");
    expect(result.summary).not.toContain("Stable Preview URL:");
  });
});
