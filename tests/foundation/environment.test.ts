import { describe, expect, it } from "vitest";
import pg from "pg";
import {
  readMigrationDatabaseConfig,
  readRuntimeDatabaseConfig,
  type EnvironmentSource,
} from "../../src/server/config/environment";

const nonProductionEnvironment = {
  TURNUP_ENVIRONMENT: "development",
  DATABASE_ENVIRONMENT: "non-production",
  DATABASE_URL:
    "postgresql://synthetic:synthetic@ep-turnup-pooler.us-east-1.aws.neon.tech/turnup?sslmode=require",
  MIGRATION_DATABASE_URL:
    "postgresql://synthetic:synthetic@ep-turnup.us-east-1.aws.neon.tech/turnup?sslmode=require",
  SHADOW_DATABASE_URL:
    "postgresql://synthetic:synthetic@ep-turnup-shadow.us-east-1.aws.neon.tech/turnup_shadow?sslmode=require",
} satisfies EnvironmentSource;

describe("server database configuration", () => {
  it("accepts an explicitly classified Neon pooled runtime URL", () => {
    expect(readRuntimeDatabaseConfig(nonProductionEnvironment)).toMatchObject({
      turnupEnvironment: "development",
      databaseEnvironment: "non-production",
      databaseUrl: nonProductionEnvironment.DATABASE_URL,
    });
  });

  it("fails when runtime configuration is missing", () => {
    expect(() => readRuntimeDatabaseConfig({})).toThrow("TURNUP_ENVIRONMENT");
    expect(() =>
      readRuntimeDatabaseConfig({
        ...nonProductionEnvironment,
        DATABASE_URL: undefined,
      }),
    ).toThrow("DATABASE_URL");
  });

  it("fails closed when the application and database environment labels disagree", () => {
    expect(() =>
      readRuntimeDatabaseConfig({
        ...nonProductionEnvironment,
        TURNUP_ENVIRONMENT: "preview",
        DATABASE_ENVIRONMENT: "production",
      }),
    ).toThrow("do not match");

    expect(() =>
      readRuntimeDatabaseConfig({
        ...nonProductionEnvironment,
        TURNUP_ENVIRONMENT: "production",
      }),
    ).toThrow("do not match");
  });

  it("requires a Neon pooled endpoint for runtime use", () => {
    expect(() =>
      readRuntimeDatabaseConfig({
        ...nonProductionEnvironment,
        DATABASE_URL: nonProductionEnvironment.MIGRATION_DATABASE_URL,
      }),
    ).toThrow("pooled endpoint");
  });

  it("requires TLS and rejects disabled, ambiguous, or unverified SSL modes", () => {
    for (const suffix of ["", "?sslmode=disable", "?sslmode=no-verify", "?SSLMODE=require"]) {
      const url = `postgresql://synthetic:synthetic@ep-turnup-pooler.us-east-1.aws.neon.tech/turnup${suffix}`;
      expect(() =>
        readRuntimeDatabaseConfig({ ...nonProductionEnvironment, DATABASE_URL: url }),
      ).toThrow("verified TLS");
    }

    const duplicateModeUrl =
      "postgresql://synthetic:synthetic@ep-turnup-pooler.us-east-1.aws.neon.tech/turnup?sslmode=require&sslmode=disable";
    expect(() =>
      readRuntimeDatabaseConfig({ ...nonProductionEnvironment, DATABASE_URL: duplicateModeUrl }),
    ).toThrow("duplicate query parameters");

    const verifyFullUrl =
      "postgresql://synthetic:synthetic@ep-turnup-pooler.us-east-1.aws.neon.tech/turnup?sslmode=verify-full";
    expect(
      readRuntimeDatabaseConfig({ ...nonProductionEnvironment, DATABASE_URL: verifyFullUrl })
        .databaseUrl,
    ).toBe(verifyFullUrl);
  });

  it("rejects duplicate security query parameters so the driver cannot use a later value", () => {
    const url = new URL(nonProductionEnvironment.DATABASE_URL);
    url.searchParams.append("uselibpqcompat", "false");
    url.searchParams.append("uselibpqcompat", "true");

    const client = new pg.Client({ connectionString: url.toString() });
    const driverConfig = client as unknown as {
      connectionParameters: { ssl?: { rejectUnauthorized?: boolean } };
    };
    expect(driverConfig.connectionParameters.ssl?.rejectUnauthorized).toBe(false);
    expect(() =>
      readRuntimeDatabaseConfig({ ...nonProductionEnvironment, DATABASE_URL: url.toString() }),
    ).toThrow("duplicate query parameters");

    const singleCompatParameter = new URL(nonProductionEnvironment.DATABASE_URL);
    singleCompatParameter.searchParams.set("uselibpqcompat", "true");
    expect(() =>
      readRuntimeDatabaseConfig({
        ...nonProductionEnvironment,
        DATABASE_URL: singleCompatParameter.toString(),
      }),
    ).toThrow("override connection settings");
  });

  it("rejects connection target overrides accepted by node-postgres", () => {
    const overriddenUrl = new URL(nonProductionEnvironment.DATABASE_URL);
    overriddenUrl.searchParams.set("sslmode", "verify-full");
    overriddenUrl.searchParams.set("host", "attacker.example");

    // Constructing a Client parses the connection URL but does not connect to it.
    const client = new pg.Client({ connectionString: overriddenUrl.toString() });
    const driverConfig = client as unknown as { connectionParameters: { host: string } };
    expect(driverConfig.connectionParameters.host).toBe("attacker.example");
    expect(() =>
      readRuntimeDatabaseConfig({
        ...nonProductionEnvironment,
        DATABASE_URL: overriddenUrl.toString(),
      }),
    ).toThrow("override connection settings");

    for (const parameter of ["hostaddr", "port", "user", "password", "dbname", "servicefile"]) {
      const url = new URL(nonProductionEnvironment.DATABASE_URL);
      url.searchParams.set(parameter, "synthetic-override");
      expect(() =>
        readRuntimeDatabaseConfig({ ...nonProductionEnvironment, DATABASE_URL: url.toString() }),
      ).toThrow("override connection settings");
    }

    const nonstandardPortUrl =
      "postgresql://synthetic:synthetic@ep-turnup-pooler.us-east-1.aws.neon.tech:6543/turnup?sslmode=require";
    expect(() =>
      readRuntimeDatabaseConfig({ ...nonProductionEnvironment, DATABASE_URL: nonstandardPortUrl }),
    ).toThrow("credentialed Neon PostgreSQL URL");
  });

  it("uses direct migration URLs and requires a separate direct shadow target in development", () => {
    expect(
      readMigrationDatabaseConfig(nonProductionEnvironment, "dev").shadowDatabaseUrl,
    ).toBe(nonProductionEnvironment.SHADOW_DATABASE_URL);

    expect(() =>
      readMigrationDatabaseConfig(
        { ...nonProductionEnvironment, MIGRATION_DATABASE_URL: nonProductionEnvironment.DATABASE_URL },
        "dev",
      ),
    ).toThrow("direct Neon endpoint");

    expect(() =>
      readMigrationDatabaseConfig(
        { ...nonProductionEnvironment, SHADOW_DATABASE_URL: nonProductionEnvironment.MIGRATION_DATABASE_URL },
        "dev",
      ),
    ).toThrow("separate database");

    const migrationOnlyEnvironment = { ...nonProductionEnvironment, DATABASE_URL: undefined };
    expect(readMigrationDatabaseConfig(migrationOnlyEnvironment, "deploy").migrationDatabaseUrl).toBe(
      nonProductionEnvironment.MIGRATION_DATABASE_URL,
    );
  });

  it("does not permit development migrations against production configuration", () => {
    const productionEnvironment: EnvironmentSource = {
      TURNUP_ENVIRONMENT: "production",
      DATABASE_ENVIRONMENT: "production",
      DATABASE_URL:
        "postgresql://synthetic:synthetic@ep-turnup-prod-pooler.us-east-1.aws.neon.tech/turnup?sslmode=require",
      MIGRATION_DATABASE_URL:
        "postgresql://synthetic:synthetic@ep-turnup-prod.us-east-1.aws.neon.tech/turnup?sslmode=require",
    };

    expect(() => readMigrationDatabaseConfig(productionEnvironment, "dev")).toThrow(
      "only with non-production configuration",
    );
    expect(readMigrationDatabaseConfig(productionEnvironment, "deploy").databaseEnvironment).toBe(
      "production",
    );
  });
});
