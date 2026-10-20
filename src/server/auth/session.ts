import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient, Prisma } from "../db/generated/client";
import { AuthError, type AccountRole } from "./policy";
import type { AuthConfig } from "./request-security";

export const IDLE_MS = 30 * 60 * 1000;
export const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
export type Identity = { id: string; username: string; role: AccountRole };
export type Transaction = Prisma.TransactionClient;

export type CredentialAccount = Identity & { passwordHash: string; credentialVersion: number };

// All issuance/settings transactions lock user first, then session. Hashing stays outside.
export async function lockAccount(tx: Transaction, id: string): Promise<CredentialAccount | null> {
  const rows = await tx.$queryRaw<CredentialAccount[]>`
    SELECT id, username, role, password_hash AS "passwordHash", credential_version AS "credentialVersion"
    FROM app_user WHERE id = ${id}::uuid FOR UPDATE
  `;
  return rows[0] ?? null;
}

export async function revalidateSession(tx: Transaction, id: string, token?: string): Promise<void> {
  const digest = tokenDigest(token);
  if (!digest) throw new AuthError(401, "Log in again to continue.");
  const rows = await tx.$queryRaw<{ user_id: string }[]>`
    UPDATE auth_session SET last_seen_at = GREATEST(last_seen_at, clock_timestamp())
    WHERE token_digest = ${digest} AND user_id = ${id}::uuid
      AND last_seen_at > clock_timestamp() - interval '30 minutes'
      AND expires_at > clock_timestamp()
    RETURNING user_id
  `;
  if (!rows.length) throw new AuthError(401, "Log in again to continue.");
}

export function tokenDigest(token: string | undefined): string | null {
  return token && /^[A-Za-z0-9_-]{43}$/.test(token)
    ? createHash("sha256").update(token).digest("hex") : null;
}

export function cookieName(config: AuthConfig): string {
  return config.secure ? "__Host-turnup_session" : "turnup_local_session";
}

export function presentedToken(headers: Headers, config: AuthConfig): string | undefined {
  const matches = (headers.get("cookie") ?? "").split(";")
    .map((part) => part.trim()).filter((part) => part.startsWith(`${cookieName(config)}=`));
  if (matches.length !== 1) return undefined;
  const token = matches[0].slice(cookieName(config).length + 1);
  return tokenDigest(token) ? token : undefined;
}

export function sessionCookie(config: AuthConfig, token?: string): string {
  return `${cookieName(config)}=${token ?? ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? ABSOLUTE_MS / 1000 : 0}${config.secure ? "; Secure" : ""}`;
}

export async function replaceSession(tx: Transaction, userId: string, previous?: string): Promise<string> {
  const previousDigest = tokenDigest(previous);
  if (previousDigest) await tx.session.deleteMany({ where: { tokenDigest: previousDigest } });
  const token = randomBytes(32).toString("base64url");
  // Use database time so creation/expiry and later checks share one clock.
  await tx.$executeRaw`
    WITH stamp AS MATERIALIZED (SELECT clock_timestamp() AS now)
    INSERT INTO auth_session (token_digest, user_id, created_at, last_seen_at, expires_at)
    SELECT ${tokenDigest(token)}, ${userId}::uuid, stamp.now, stamp.now, stamp.now + interval '8 hours' FROM stamp
  `;
  return token;
}

export async function revokeSession(db: PrismaClient, token?: string): Promise<void> {
  const digest = tokenDigest(token);
  if (digest) await db.session.deleteMany({ where: { tokenDigest: digest } });
}

/** Atomic check-and-touch. Strict comparisons reject exact boundaries. */
export async function resolveSession(db: PrismaClient, token?: string, testNow?: Date): Promise<Identity | null> {
  const digest = tokenDigest(token);
  if (!digest) return null;
  // testNow is for controlled-clock SQL tests only; request callers never supply it.
  const rows = await db.$queryRaw<Identity[]>`
    WITH touched AS (
      UPDATE auth_session
      SET last_seen_at = GREATEST(last_seen_at, COALESCE(${testNow ?? null}::timestamptz, clock_timestamp()))
      WHERE token_digest = ${digest}
        AND last_seen_at > COALESCE(${testNow ?? null}::timestamptz, clock_timestamp()) - interval '30 minutes'
        AND expires_at > COALESCE(${testNow ?? null}::timestamptz, clock_timestamp())
      RETURNING user_id
    )
    SELECT u.id, u.username, u.role FROM app_user u JOIN touched t ON u.id = t.user_id
  `;
  return rows[0] ?? null;
}
