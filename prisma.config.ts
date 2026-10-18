import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";
import { readMigrationDatabaseConfig, type MigrationIntent } from "./src/server/config/environment";

loadEnvConfig(process.cwd());

const [command, subcommand] = process.argv.slice(2);
const isMigrationCommand = command === "migrate";
const intent: MigrationIntent =
  isMigrationCommand && subcommand === "dev"
    ? "dev"
    : isMigrationCommand && subcommand === "deploy"
      ? "deploy"
      : isMigrationCommand && subcommand === "status"
        ? "status"
        : "other";

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
