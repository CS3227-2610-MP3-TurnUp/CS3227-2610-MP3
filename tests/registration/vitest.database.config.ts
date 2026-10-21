import { defineConfig } from "vitest/config";
export default defineConfig({ test: {
  environment: "node", include: ["tests/registration/local-sql.integration.test.ts"], exclude: [],
  fileParallelism: false, testTimeout: 30000, hookTimeout: 30000,
} });
