import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(resolve(".github/workflows/vercel-deploy.yml"), "utf8").replace(/\r\n/g, "\n");
const parser = resolve(".github/scripts/read-vercel-output.mjs");
const candidate = "https://turnup-synthetic.vercel.app";
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

function runStep(name: string, stdout: string, exitCode = 0, target = "production", studentStatus = "403", studentBody = '{"ok":false,"code":"invalid_request"}') {
  const directory = mkdtempSync(join(tmpdir(), "turnup-vercel-output-"));
  const outputFile = join(directory, "output");
  const summaryFile = join(directory, "summary");
  const argumentsFile = join(directory, "arguments");
  const studentArgumentsFile = join(directory, "student-arguments");
  try {
    const result = spawnSync("bash", ["-c", `
corepack() {
  if [[ ! -f "$CLI_ARGUMENTS" ]]; then printf '%s\\n' "$@" > "$CLI_ARGUMENTS"; fi
  [[ "$VERCEL_TOKEN" == "synthetic-token" ]] || return 90
  for argument in "$@"; do
    if [[ "$argument" == /api/student/*/assistant/source ]]; then
      printf '%s\\n' "$@" > "$STUDENT_ARGUMENTS"
      while (( $# )); do
        if [[ "$1" == "--output" ]]; then printf '%s' "$STUDENT_BODY_RESPONSE" > "$2"; fi
        shift
      done
      printf '%s' "$STUDENT_STATUS_RESPONSE"
      return "$CLI_EXIT"
    fi
  done
  printf '%s' "$CLI_STDOUT"
  return "$CLI_EXIT"
}
# Metadata fetch is covered separately by vercel-api-scope.test.ts.
node() {
  if [[ "$1" == ".github/scripts/check-preview-alias.mjs" ]]; then return 0; fi
  if [[ "$1" == "--input-type=module" ]]; then
    script="$(cat)"
    if [[ "$script" == *"process.env.STUDENT_BODY"* ]]; then printf '%s' "$script" | command node "$@"; return; fi
    return 0
  fi
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
        STUDENT_ARGUMENTS: studentArgumentsFile,
        STUDENT_STATUS_RESPONSE: studentStatus,
        STUDENT_BODY_RESPONSE: studentBody,
        RUNNER_TEMP: directory,
        DEPLOYMENT_TARGET: target,
        PREVIEW_ALIAS: "turnup-synthetic-preview.vercel.app",
        VERCEL_TOKEN: "synthetic-token",
        CANDIDATE_URL: candidate,
        GITHUB_SHA: "synthetic-sha",
        GITHUB_REF_NAME: "master",
        GITHUB_OUTPUT: outputFile,
        GITHUB_STEP_SUMMARY: summaryFile,
      },
    });
    let output = "";
    try { output = readFileSync(outputFile, "utf8"); } catch { /* Failed steps produce no output. */ }
    const args = readFileSync(argumentsFile, "utf8").trimEnd().split("\n");
    let studentArgs: string[] = [];
    try { studentArgs = readFileSync(studentArgumentsFile, "utf8").trimEnd().split("\n"); } catch { /* Earlier failures must not reach Student guard. */ }
    return { ...result, output, args, studentArgs };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("Vercel output handling in the executable workflow steps", () => {
  for (const target of ["preview", "production"]) {
    it.each([candidate, `${diagnostic}\n${candidate}\n`])(`captures only the ${target} deployment URL`, (stdout) => {
      const result = runStep("Upload checked prebuilt output", stdout, 0, target);
      expect(result.status).toBe(0);
      expect(result.output).toBe(`candidate_url=${candidate}\n`);
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
    expect(result.studentArgs).toContain("/api/student/events/11111111-1111-4111-8111-111111111111/assistant/source");
    expect(result.studentArgs).not.toContain("--token");
    expect(result.studentArgs.join(" ")).not.toContain("synthetic-token");
    expect(result.stdout + result.stderr + result.output).not.toContain("synthetic-token");
  });
  it("accepts the exact anonymous Student guard response on a matching candidate origin", () => {
    expect(runStep("Check candidate project, production target and source revision", "200", 0, "production", "401", '{"ok":false,"code":"login_required"}').status).toBe(0);
  });
  it.each([
    ["404", '{"ok":false,"code":"invalid_request"}'],
    ["403", '<html>platform denied</html>'],
    ["403", '{"ok":false,"code":"login_required"}'],
    ["401", '{"ok":false,"code":"invalid_request"}'],
    ["200", '{"ok":true}'],
  ])("blocks promotion on a disabled or unexpected Student guard %s/%s", (status, body) => {
    const result = runStep("Check candidate project, production target and source revision", "200", 0, "production", status, body);
    expect(result.status).not.toBe(0); expect(result.output).toBe("");
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
