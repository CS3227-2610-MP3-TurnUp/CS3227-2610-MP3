import "server-only";

import { createHmac } from "node:crypto";
import type { PrismaClient } from "../db/generated/client";
import { AuthError } from "./policy";

export type Admission = { key: string; limit: number; expiresAt: Date };

export function admissionKeys(action: "signup" | "login" | "credentials", username: string, source: string, secret: string, now: Date): Admission[] {
  const minutes = action === "signup" ? 60 : 15;
  const window = minutes * 60 * 1000;
  const start = Math.floor(now.getTime() / window) * window;
  const expiresAt = new Date(start + window);
  const digest = (kind: string, value: string) => createHmac("sha256", Buffer.from(secret, "hex"))
    .update(`${action}:${kind}:${value}`).digest("hex");
  const sourceKey = { key: `${action}:source:${digest("source", source)}:${start}`, limit: action === "signup" ? 10 : 30, expiresAt };
  const identityKind = action === "credentials" ? "account" : "name";
  return action === "signup" ? [sourceKey] : [
    { key: `${action}:${identityKind}:${digest(identityKind, username)}:${start}`, limit: 5, expiresAt }, sourceKey,
  ];
}

export async function admitAttempt(db: PrismaClient, action: "signup" | "login" | "credentials", username: string, source: string, secret: string): Promise<void> {
  await db.$transaction(async (tx) => {
    // One database clock for all buckets; workers cannot select their own window.
    const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const keys = admissionKeys(action, username, source, secret, clock.now).sort((a, b) => a.key.localeCompare(b.key));
    for (const entry of keys) {
      const admitted = await tx.$queryRaw<{ key: string }[]>`
        INSERT INTO auth_throttle (key, count, expires_at) VALUES (${entry.key}, 1, ${entry.expiresAt})
        ON CONFLICT (key) DO UPDATE SET count = auth_throttle.count + 1
        WHERE auth_throttle.count < ${entry.limit}
        RETURNING key
      `;
      if (!admitted.length) throw new AuthError(429, "Too many attempts. Wait until the current limit expires and try again.");
    }
    // Bounded opportunistic cleanup; no raw source/name is ever stored.
    await tx.$executeRaw`
      DELETE FROM auth_throttle WHERE key IN (
        SELECT key FROM auth_throttle WHERE expires_at <= ${clock.now}
        ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED
      )
    `;
  });
}
