import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
const serverOnlyTestEntry = resolve(dirname(require.resolve("server-only")), "empty.js");

export default defineConfig({
  resolve: {
    alias: { "server-only": serverOnlyTestEntry },
  },
  ssr: {
    noExternal: ["server-only"],
  },
  test: {
    environment: "node",
    include: ["tests/foundation/**/*.integration.test.ts"],
    exclude: [],
  },
});
