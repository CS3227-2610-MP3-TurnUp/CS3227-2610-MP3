import "server-only";

import { readRuntimeDatabaseConfig } from "./environment";

export const runtimeDatabaseConfig = readRuntimeDatabaseConfig(process.env);
