import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "./client";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Create or recover the same synthetic receipt when a caller retries after a lost response. */
export async function createFoundationProbe(id: string): Promise<void> {
  assertProbeId(id);
  await prisma.$executeRaw`
    INSERT INTO "foundation_probe" ("id", "marker")
    VALUES (${id}::uuid, ${randomUUID()}::uuid)
    ON CONFLICT ("id") DO NOTHING
  `;
}

/** Return only whether the synthetic receipt exists; never expose stored markers. */
export async function foundationProbeExists(id: string): Promise<boolean> {
  assertProbeId(id);
  const probe = await prisma.foundationProbe.findUnique({
    where: { id },
    select: { id: true },
  });
  return probe !== null;
}

/** Remove the synthetic row after the bounded feasibility check. */
export async function deleteFoundationProbe(id: string): Promise<void> {
  assertProbeId(id);
  await prisma.foundationProbe.deleteMany({ where: { id } });
}

function assertProbeId(id: string): void {
  if (!uuidPattern.test(id)) {
    throw new Error("Foundation probe ID must be a UUID.");
  }
}
