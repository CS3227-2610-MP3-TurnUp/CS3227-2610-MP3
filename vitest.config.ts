import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/foundation/**/*.test.ts",
      "tests/hosting/**/*.test.ts",
      "src/server/ai/**/*.test.ts",
      "tests/auth/**/*.test.ts",
      "tests/events/**/*.test.ts",
      "tests/registration/**/*.test.ts",
      "tests/student-assistant/**/*.test.ts",
    ],
    exclude: ["tests/foundation/**/*.integration.test.ts", "tests/auth/**/*.integration.test.ts", "tests/events/**/*.integration.test.ts", "tests/registration/**/*.integration.test.ts", "tests/student-assistant/**/*.integration.test.ts"],
  },
});
