import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";
import { classifyMigrationIntent, readMigrationDatabaseConfig } from "./src/server/config/environment";

loadEnvConfig(process.cwd());

const args = process.argv.slice(2);
const isMigrationCommand = args[0] === "migrate";
const intent = classifyMigrationIntent(args);

const migrationConfig = isMigrationCommand
  ? readMigrationDatabaseConfig(process.env, intent)
  : undefined;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: migrationConfig?.migrationDatabaseUrl ?? "",
    ...(migrationConfig?.shadowDatabaseUrl
      ? { shadowDatabaseUrl: migrationConfig.shadowDatabaseUrl }
      : {}),
  },
});
