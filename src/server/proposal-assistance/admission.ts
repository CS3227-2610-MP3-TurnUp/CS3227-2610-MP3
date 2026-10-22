import "server-only";

import { createHmac } from "node:crypto";
import type { PrismaClient } from "../db/generated/client";
import { AuthError } from "../auth/policy";

const windowMs = 15 * 60 * 1000;
const ownerLimit = 5;

/** Local synthetic feature ceiling only. This does not set a hosted provider policy. */
export async function admitProposalExtraction(db: PrismaClient, ownerId: string, secret: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const start = Math.floor(clock.now.getTime() / windowMs) * windowMs;
    const expiresAt = new Date(start + windowMs);
    const ownerDigest = createHmac("sha256", Buffer.from(secret, "hex"))
      .update(`proposal-assistance:owner:${ownerId}`).digest("hex");
    const key = `proposal:owner:${ownerDigest}:${start}`;
    const admitted = await tx.$queryRaw<{ key: string }[]>`
      INSERT INTO auth_throttle (key, count, expires_at) VALUES (${key}, 1, ${expiresAt})
      ON CONFLICT (key) DO UPDATE SET count = auth_throttle.count + 1
      WHERE auth_throttle.count < ${ownerLimit}
      RETURNING key
    `;
    if (!admitted.length) throw new AuthError(429, "Proposal assistance is temporarily limited. Try again after the current window.");
    await tx.$executeRaw`
      DELETE FROM auth_throttle WHERE key IN (
        SELECT key FROM auth_throttle WHERE expires_at <= ${clock.now}
        ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED
      )
    `;
  });
}

export const PROPOSAL_EXTRACTION_OWNER_LIMIT = ownerLimit;
export const PROPOSAL_EXTRACTION_WINDOW_MS = windowMs;
