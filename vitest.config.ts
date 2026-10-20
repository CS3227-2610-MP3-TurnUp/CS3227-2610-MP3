import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/foundation/**/*.test.ts",
      "tests/hosting/**/*.test.ts",
      "src/server/ai/**/*.test.ts",
      "tests/auth/**/*.test.ts",
    ],
    exclude: ["tests/foundation/**/*.integration.test.ts", "tests/auth/**/*.integration.test.ts"],
  },
});
