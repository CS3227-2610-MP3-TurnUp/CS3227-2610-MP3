import { expect, it } from "vitest";

process.env.TURNUP_ENVIRONMENT = "development";
process.env.DATABASE_ENVIRONMENT = "non-production";
process.env.DATABASE_URL =
  "postgresql://synthetic:synthetic@ep-turnup-pooler.us-east-1.aws.neon.tech/turnup?sslmode=require";

it("imports the server-only synthetic probe helper without opening a database connection", async () => {
  const probe = await import("../../src/server/db/foundation-probe");

  expect(probe.createFoundationProbe).toBeTypeOf("function");
  expect(probe.foundationProbeExists).toBeTypeOf("function");
  expect(probe.deleteFoundationProbe).toBeTypeOf("function");
});
