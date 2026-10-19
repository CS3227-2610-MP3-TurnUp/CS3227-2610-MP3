export type TurnUpEnvironment = "development" | "preview" | "production";
export type DatabaseEnvironment = "non-production" | "production";

export interface RuntimeDatabaseConfig {
  turnupEnvironment: TurnUpEnvironment;
  databaseEnvironment: DatabaseEnvironment;
  databaseUrl: string;
}

export interface MigrationDatabaseConfig {
  turnupEnvironment: TurnUpEnvironment;
  databaseEnvironment: DatabaseEnvironment;
  migrationDatabaseUrl: string;
  shadowDatabaseUrl?: string;
}

export type EnvironmentSource = Record<string, string | undefined>;
export type MigrationIntent = "dev" | "deploy" | "status" | "reset" | "other";

export function classifyMigrationIntent(args: readonly string[]): MigrationIntent {
  const [command, subcommand] = args;

  if (command !== "migrate") {
    return "other";
  }

  switch (subcommand) {
    case "dev":
    case "deploy":
    case "status":
    case "reset":
      return subcommand;
    default:
      return "other";
  }
}

const connectionOverrideParameters = new Set([
  "host",
  "hostaddr",
  "port",
  "user",
  "password",
  "database",
  "dbname",
  "db",
  "service",
  "servicefile",
  "connectionstring",
  "ssl",
  "sslcert",
  "sslkey",
  "sslrootcert",
  "sslcrl",
  "sslcrldir",
  "sslpassword",
  "sslnegotiation",
  "uselibpqcompat",
]);

const environmentNames: readonly TurnUpEnvironment[] = [
  "development",
  "preview",
  "production",
];

const databaseEnvironmentNames: readonly DatabaseEnvironment[] = [
  "non-production",
  "production",
];

export function readRuntimeDatabaseConfig(env: EnvironmentSource): RuntimeDatabaseConfig {
  const { turnupEnvironment, databaseEnvironment } = readEnvironmentLabels(env);

  const databaseUrl = requireNeonUrl(env.DATABASE_URL, "DATABASE_URL", "pooled");

  return { turnupEnvironment, databaseEnvironment, databaseUrl };
}

export function readMigrationDatabaseConfig(
  env: EnvironmentSource,
  intent: MigrationIntent,
): MigrationDatabaseConfig {
  const labels = readEnvironmentLabels(env);

  if (intent === "reset" && labels.databaseEnvironment === "production") {
    throw new Error("Prisma migrate reset is permitted only with non-production configuration.");
  }

  if (intent === "dev" && labels.databaseEnvironment !== "non-production") {
    throw new Error("Prisma migrate dev is permitted only with non-production configuration.");
  }

  const migrationDatabaseUrl = requireNeonUrl(
    env.MIGRATION_DATABASE_URL,
    "MIGRATION_DATABASE_URL",
    "direct",
  );

  if (intent === "dev") {
    const shadowDatabaseUrl = requireNeonUrl(
      env.SHADOW_DATABASE_URL,
      "SHADOW_DATABASE_URL",
      "direct",
    );

    if (sameDatabase(migrationDatabaseUrl, shadowDatabaseUrl)) {
      throw new Error("SHADOW_DATABASE_URL must identify a separate database from the migration target.");
    }

    return { ...labels, migrationDatabaseUrl, shadowDatabaseUrl };
  }

  return { ...labels, migrationDatabaseUrl };
}

function readEnvironmentLabels(
  env: EnvironmentSource,
): Pick<RuntimeDatabaseConfig, "turnupEnvironment" | "databaseEnvironment"> {
  const turnupEnvironment = readChoice(
    env.TURNUP_ENVIRONMENT,
    environmentNames,
    "TURNUP_ENVIRONMENT",
  );
  const databaseEnvironment = readChoice(
    env.DATABASE_ENVIRONMENT,
    databaseEnvironmentNames,
    "DATABASE_ENVIRONMENT",
  );

  assertEnvironmentPair(turnupEnvironment, databaseEnvironment);
  return { turnupEnvironment, databaseEnvironment };
}

function readChoice<T extends string>(
  value: string | undefined,
  choices: readonly T[],
  name: string,
): T {
  if (!value || !choices.includes(value as T)) {
    throw new Error(`${name} must be set to one of its documented environment values.`);
  }
  return value as T;
}

function assertEnvironmentPair(
  turnupEnvironment: TurnUpEnvironment,
  databaseEnvironment: DatabaseEnvironment,
): void {
  const isProductionPair =
    turnupEnvironment === "production" && databaseEnvironment === "production";
  const isNonProductionPair =
    turnupEnvironment !== "production" && databaseEnvironment === "non-production";

  if (!isProductionPair && !isNonProductionPair) {
    throw new Error("TURNUP_ENVIRONMENT and DATABASE_ENVIRONMENT do not match.");
  }
}

function requireNeonUrl(
  value: string | undefined,
  name: string,
  connectionMode: "pooled" | "direct",
): string {
  if (!value) {
    throw new Error(`${name} is required for this operation.`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL.`);
  }

  const host = url.hostname.toLowerCase();
  const isPostgresProtocol = url.protocol === "postgresql:" || url.protocol === "postgres:";
  const isNeonHost = host.endsWith(".neon.tech");
  const isPooledHost = host.split(".").some((label) => label.endsWith("-pooler"));
  const usesDefaultPostgresPort = url.port === "";
  const hasCredentialsAndDatabase = Boolean(url.username && url.password && url.pathname.length > 1);
  const queryEntries = [...url.searchParams.entries()];
  const queryParameterNames = queryEntries.map(([parameter]) => parameter.toLowerCase());
  const uniqueQueryParameterNames = new Set(queryParameterNames);
  const hasDuplicateQueryParameters = uniqueQueryParameterNames.size !== queryParameterNames.length;
  const hasConnectionOverride = queryParameterNames.some((parameter) =>
    connectionOverrideParameters.has(parameter),
  );
  const sslModes = queryEntries
    .filter(([parameter]) => parameter === "sslmode")
    .map(([, mode]) => mode);

  if (!isPostgresProtocol || !isNeonHost || !usesDefaultPostgresPort || !hasCredentialsAndDatabase) {
    throw new Error(`${name} must be a credentialed Neon PostgreSQL URL.`);
  }

  if (hasDuplicateQueryParameters) {
    throw new Error(`${name} must not contain duplicate query parameters.`);
  }

  if (hasConnectionOverride) {
    throw new Error(`${name} must not contain query parameters that override connection settings.`);
  }

  if (connectionMode === "direct") {
    const sslAcceptModes = queryEntries
      .filter(([parameter]) => parameter === "sslaccept")
      .map(([, mode]) => mode);

    if (
      sslModes.length !== 1 ||
      sslModes[0] !== "require" ||
      sslAcceptModes.length !== 1 ||
      sslAcceptModes[0] !== "strict"
    ) {
      throw new Error(`${name} must use sslmode=require and sslaccept=strict for Prisma TLS validation.`);
    }
  } else if (sslModes.length !== 1 || !["require", "verify-full"].includes(sslModes[0])) {
    throw new Error(`${name} must require verified TLS with sslmode=require or sslmode=verify-full.`);
  }

  if ((connectionMode === "pooled") !== isPooledHost) {
    throw new Error(
      connectionMode === "pooled"
        ? `${name} must use a Neon pooled endpoint.`
        : `${name} must use a direct Neon endpoint without the pooler host label.`,
    );
  }

  return value;
}

function sameDatabase(left: string, right: string): boolean {
  const leftUrl = new URL(left);
  const rightUrl = new URL(right);
  return leftUrl.hostname === rightUrl.hostname && leftUrl.pathname === rightUrl.pathname;
}
