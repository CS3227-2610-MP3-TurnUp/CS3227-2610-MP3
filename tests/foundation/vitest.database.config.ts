import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
const serverOnlyTestEntry = resolve(dirname(require.resolve("server-only")), "empty.js");
const integrationTests = ["tests/foundation/database.integration.test.ts"];

if (process.env.RUN_SOC_PROBE_GATE_DB_INTEGRATION === "1") {
  integrationTests.push("tests/foundation/soc-probe-gate.integration.test.ts");
}

export default defineConfig({
  resolve: {
    alias: { "server-only": serverOnlyTestEntry },
  },
  ssr: {
    noExternal: ["server-only"],
  },
  test: {
    environment: "node",
    include: integrationTests,
    exclude: [],
  },
});
