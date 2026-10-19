import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";
import { runtimeDatabaseConfig } from "../config/runtime";

const adapter = new PrismaPg({ connectionString: runtimeDatabaseConfig.databaseUrl });
const globalForPrisma = globalThis as typeof globalThis & { turnupPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.turnupPrisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.turnupPrisma = prisma;
}
