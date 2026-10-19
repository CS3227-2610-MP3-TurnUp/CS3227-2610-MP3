import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(new URL("../../.github/workflows/vercel-deploy.yml", import.meta.url), "utf8");
const vercelConfig = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8")) as {
  functions?: Record<string, { supportsCancellation?: boolean }>;
};

describe("hosted deployment concurrency and cancellation configuration", () => {
  it("isolates Preview and Production workflows and cancels superseded Production runs", () => {
    expect(workflow).toContain("'turnup-production-workflow'");
    expect(workflow).toContain("'turnup-preview-workflow'");
    const productionCondition =
      "github.ref == 'refs/heads/master' && (github.event_name == 'push' || inputs.target == 'production')";
    const productionCancellationSetting = `cancel-in-progress: \${{ ${productionCondition} }}`;
    expect(workflow.split(productionCancellationSetting)).toHaveLength(3);
  });

  it("checks the protected master head in the same shell immediately before promotion", () => {
    const promoteStart = workflow.indexOf("- name: Promote the exact verified candidate");
    expect(promoteStart).toBeGreaterThanOrEqual(0);
    const promoteStep = workflow.slice(promoteStart);
    expect(promoteStep.slice(promoteStep.indexOf("\n") + 1)).not.toContain("- name:");

    const runStart = promoteStep.indexOf("        run: |\n");
    expect(runStart).toBeGreaterThanOrEqual(0);
    const commandLines = promoteStep
      .slice(runStart)
      .split("\n")
      .filter((line) => line.startsWith("          "))
      .map((line) => line.trim());
    const latestHeadCheck = commandLines.indexOf('latest_sha="$(gh api "repos/$GITHUB_REPOSITORY/commits/master" --jq .sha)"');
    const promoteCommand = commandLines.indexOf(
      'corepack pnpm dlx vercel@58.4.4 promote "$CANDIDATE_URL" --yes --token="$VERCEL_TOKEN"',
    );

    expect(latestHeadCheck).toBeGreaterThanOrEqual(0);
    expect(promoteCommand).toBe(latestHeadCheck + 5);
    expect(commandLines[promoteCommand - 1]).toBe("fi");
  });

  it("opts only the protected internal probe route into Vercel request cancellation", () => {
    expect(vercelConfig.functions).toEqual({
      "src/app/api/internal/foundation-probe/route.ts": { supportsCancellation: true },
    });
  });
});
