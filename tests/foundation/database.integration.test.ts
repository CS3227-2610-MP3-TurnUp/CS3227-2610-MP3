import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { readRuntimeDatabaseConfig } from "../../src/server/config/environment";

if (process.env.RUN_FOUNDATION_DB_INTEGRATION !== "1") {
  throw new Error(
    "Set RUN_FOUNDATION_DB_INTEGRATION=1 to run this test against an isolated synthetic non-production Neon database.",
  );
}

loadEnvConfig(process.cwd(), true);

const runtimeConfig = readRuntimeDatabaseConfig(process.env);
if (runtimeConfig.databaseEnvironment !== "non-production") {
  throw new Error("Foundation database integration tests refuse production configuration.");
}

it("recovers an idempotent synthetic foundation probe after a lost create response", async () => {
  const { createFoundationProbe, deleteFoundationProbe, foundationProbeExists } = await import(
    "../../src/server/db/foundation-probe"
  );
  const id = randomUUID();

  try {
    // Model a create response being lost while the caller retries with its known ID.
    await Promise.all([createFoundationProbe(id), createFoundationProbe(id)]);
    expect(await foundationProbeExists(id)).toBe(true);
  } finally {
    await deleteFoundationProbe(id);
  }

  expect(await foundationProbeExists(id)).toBe(false);
});
