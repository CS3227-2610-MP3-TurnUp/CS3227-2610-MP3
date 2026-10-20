import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(resolve(".github/workflows/vercel-deploy.yml"), "utf8");
const parser = resolve(".github/scripts/read-vercel-output.mjs");
const candidate = "https://turnup-synthetic.vercel.app";
const previewOrigin = "https://preview.turnup.example";
const diagnostic = `Error while parsing config file: "${resolve("pnpm-lock.yaml")}"`;

function stepScript(name: string) {
  const start = workflow.indexOf(`      - name: ${name}\n`);
  if (start < 0) throw new Error(`Missing workflow step: ${name}`);
  const run = workflow.indexOf("        run: |\n", start);
  if (run < 0) throw new Error(`Missing workflow script: ${name}`);
  const lines = workflow.slice(run + "        run: |\n".length).split("\n");
  const end = lines.findIndex((line) => line.length > 0 && !line.startsWith("          "));
  return lines.slice(0, end < 0 ? undefined : end)
    .map((line) => line.replace(/^ {10}/, ""))
    .join("\n");
}

function runStep(name: string, stdout: string, exitCode = 0, target = "production") {
  const directory = mkdtempSync(join(tmpdir(), "turnup-vercel-output-"));
  const outputFile = join(directory, "output");
  const summaryFile = join(directory, "summary");
  const argumentsFile = join(directory, "arguments");
  try {
    const result = spawnSync("bash", ["-c", `
corepack() {
  printf '%s\\n' "$@" >> "$CLI_ARGUMENTS"
  [[ "$VERCEL_TOKEN" == "synthetic-token" ]] || return 90
  printf '%s' "$CLI_STDOUT"
  return "$CLI_EXIT"
}
# Metadata fetch is covered separately by vercel-api-scope.test.ts.
node() {
  if [[ "$1" == "--input-type=module" ]]; then cat >/dev/null; return 0; fi
  command node "$@"
}
${stepScript(name)}
`], {
      encoding: "utf8",
      env: {
        PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}`,
        NODE_ENV: "test",
        CLI_STDOUT: stdout,
        CLI_EXIT: String(exitCode),
        CLI_ARGUMENTS: argumentsFile,
        DEPLOYMENT_TARGET: target,
        VERCEL_TOKEN: "synthetic-token",
        CANDIDATE_URL: candidate,
        GITHUB_SHA: "synthetic-sha",
        GITHUB_REF_NAME: "master",
        GITHUB_OUTPUT: outputFile,
        GITHUB_STEP_SUMMARY: summaryFile,
        PREVIEW_ORIGIN: previewOrigin,
      },
    });
    let output = "";
    try { output = readFileSync(outputFile, "utf8"); } catch { /* Failed steps produce no output. */ }
    let args: string[] = [];
    try { args = readFileSync(argumentsFile, "utf8").trimEnd().split("\n"); } catch { /* Some steps do not invoke the CLI. */ }
    let summary = "";
    try { summary = readFileSync(summaryFile, "utf8"); } catch { /* Failed steps may produce no summary. */ }
    return { ...result, output, args, summary };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("Vercel output handling in the executable workflow steps", () => {
  for (const target of ["preview", "production"]) {
    it.each([candidate, `${diagnostic}\n${candidate}\n`])(`captures only the ${target} deployment URL`, (stdout) => {
      const result = runStep("Upload checked prebuilt output", stdout, 0, target);
      expect(result.status).toBe(0);
      expect(result.output).toBe(`candidate_url=${candidate}\n${target === "preview" ? `preview_url=${previewOrigin}\n` : ""}`);
      expect(result.summary).toContain(target === "preview" ? `[Open Preview](${previewOrigin})` : `[Open candidate](${candidate})`);
      if (target === "preview") expect(result.args).toEqual([
        "pnpm", "dlx", "vercel@58.4.4", "deploy", "--prebuilt", "--target=preview", "--token=synthetic-token",
        "--meta", "turnupCommit=synthetic-sha", "--meta", "turnupRef=master", "--meta", "turnupTarget=preview",
        "pnpm", "dlx", "vercel@58.4.4", "alias", "set", candidate, "preview.turnup.example", "--token=synthetic-token",
      ]);
      if (target === "production") expect(result.summary).toContain("not yet promoted");
    });

    it(`preserves a failed ${target} deploy even if it prints a valid URL`, () => {
      const result = runStep("Upload checked prebuilt output", candidate, 7, target);
      expect(result.status).toBe(7);
      expect(result.output).toBe("");
    });
  }

  it.each([
    "", diagnostic, `${candidate}\n${candidate}`,
    "https://user:synthetic-secret@turnup-synthetic.vercel.app",
    "https://turnup-synthetic.vercel.app/extra",
    "https://turnup-synthetic.vercel.app?token=synthetic-secret",
    "https://turnup-synthetic.vercel.app.evil.example",
    `Unexpected diagnostic\n${candidate}`,
    `Error while parsing config file: "other.yaml"\n${candidate}`,
  ])("rejects absent, ambiguous, unsafe or unexpected upload output: %s", (stdout) => {
    const result = runStep("Upload checked prebuilt output", stdout);
    expect(result.status).not.toBe(0);
    expect(result.output).toBe("");
    expect(result.stderr).not.toContain("synthetic-secret");
  });

  it.each(["", "http://preview.turnup.example", "https://preview.turnup.example/path", "https://user:pass@preview.turnup.example", "https://preview.turnup.example:8443"])("blocks a malformed Preview origin before deployment: %s", (origin) => {
    const directory = mkdtempSync(join(tmpdir(), "turnup-trust-"));
    try {
      const result = spawnSync("bash", ["-c", stepScript("Confirm trusted branch and exact deployment target")], {
        encoding: "utf8",
        env: {
          PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}`,
          NODE_ENV: "test",
          DEPLOYMENT_TARGET: "preview", REF_PROTECTED: "true", VERCEL_ORG_ID: "team_synthetic", VERCEL_PROJECT_ID: "prj_synthetic",
          PREVIEW_ORIGIN: origin, GITHUB_REF: "refs/heads/preview/test", GITHUB_EVENT_NAME: "push", GITHUB_SHA: "synthetic-sha",
          GITHUB_OUTPUT: join(directory, "output"),
        },
      });
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("PREVIEW_ORIGIN must be the exact HTTPS Preview alias origin");
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it("accepts the configured Preview alias before deployment", () => {
    const directory = mkdtempSync(join(tmpdir(), "turnup-trust-"));
    try {
      const output = join(directory, "output");
      const result = spawnSync("bash", ["-c", stepScript("Confirm trusted branch and exact deployment target")], {
        encoding: "utf8",
        env: {
          PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}`,
          NODE_ENV: "test",
          DEPLOYMENT_TARGET: "preview", REF_PROTECTED: "true", VERCEL_ORG_ID: "team_synthetic", VERCEL_PROJECT_ID: "prj_synthetic",
          PREVIEW_ORIGIN: previewOrigin, GITHUB_REF: "refs/heads/preview/test", GITHUB_EVENT_NAME: "push", GITHUB_SHA: "synthetic-sha",
          GITHUB_OUTPUT: output,
        },
      });
      expect(result.status).toBe(0);
      expect(readFileSync(output, "utf8")).toBe("target=preview\n");
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it.each(["200", `${diagnostic}\n200`])("accepts the smoke response independently of the lockfile diagnostic: %s", (stdout) => {
    const result = runStep("Check candidate project, production target and source revision", stdout);
    expect(result.status).toBe(0);
    expect(result.output).toBe(`candidate_url=${candidate}\n`);
  });

  it.each(["", "503", "200\n200", "unexpected\n200"])("blocks promotion after a failed or malformed smoke response: %s", (stdout) => {
    const result = runStep("Check candidate project, production target and source revision", stdout);
    expect(result.status).not.toBe(0);
    expect(result.output).toBe("");
  });

  it("authenticates the protected smoke through the environment without forwarding CLI credentials to curl", () => {
    const result = runStep("Check candidate project, production target and source revision", "200");
    expect(result.status).toBe(0);
    expect(result.args).toEqual([
      "pnpm", "dlx", "vercel@58.4.4", "curl", "/", "--deployment", candidate,
      "--fail", "--silent", "--show-error", "--output", "/dev/null",
      "--write-out", "%{http_code}", "--max-time", "30",
    ]);
    expect(result.stdout + result.stderr + result.output).not.toContain("synthetic-token");
  });

  it("preserves a failed curl exit even if it prints 200", () => {
    const result = runStep("Check candidate project, production target and source revision", "200", 22);
    expect(result.status).toBe(22);
    expect(result.output).toBe("");
  });

  it("routes the known diagnostic to stderr and supports CRLF output", () => {
    const result = spawnSync(process.execPath, [parser, "deployment-url"], {
      input: `${diagnostic}\r\n${candidate}\r\n`, encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${candidate}\n`);
    expect(result.stderr).toContain("known diagnostic");
  });
});
