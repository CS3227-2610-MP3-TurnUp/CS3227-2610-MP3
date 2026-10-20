import "server-only";

import { NextResponse } from "next/server";
import type { PrismaClient } from "../db/generated/client";
import { AuthError } from "../auth/policy";
import { hashPassword, verifyPassword } from "../auth/password";
import { lockAccount, presentedToken, revalidateSession, resolveSession, sessionCookie, type Transaction } from "../auth/session";
import { authConfig, boundedJson, requireOrigin, trustedSource } from "../auth/request-security";
import { admitAttempt } from "../auth/throttle";
import { AccountError, parseChange, validateNewPassword, type CredentialChange } from "./policy";

export const privateHeaders = { "Cache-Control": "no-store, private", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
export function accountFailure(error: unknown): NextResponse {
  return NextResponse.json({ error: error instanceof AuthError ? error.message : "Account settings are unavailable. Try again later.",
    ...(error instanceof AccountError && error.field ? { field: error.field } : {}) },
  { status: error instanceof AuthError ? error.status : 503, headers: privateHeaders });
}
export async function authenticatedAccount(tx: Transaction, id: string, token?: string) {
  const account = await lockAccount(tx, id);
  if (!account) throw new AuthError(401, "Log in again to continue.");
  await revalidateSession(tx, id, token);
  return account;
}
export async function requireSelf(db: PrismaClient, token?: string) {
  const identity = await resolveSession(db, token);
  if (!identity) throw new AuthError(401, "Log in again to continue.");
  return identity;
}
export async function readSettings(db: PrismaClient, token?: string) {
  const identity = await requireSelf(db, token);
  return db.$transaction(async (tx) => {
    const account = await authenticatedAccount(tx, identity.id, token);
    return { username: account.username, role: account.role, credentialVersion: account.credentialVersion };
  });
}
export async function changeCredentials(db: PrismaClient, token: string | undefined, input: CredentialChange) {
  const identity = await requireSelf(db, token);
  const verified = await db.user.findUnique({ where: { id: identity.id }, select: { passwordHash: true, credentialVersion: true } });
  if (!await verifyPassword(input.currentPassword, verified?.passwordHash ?? null) || !verified) {
    throw new AccountError(401, "The current password is incorrect.", "currentPassword");
  }
  // Compare a new password to the verified current plaintext only in memory.
  // Policy applies to new choices, while an NFC-equivalent no-op remains allowed.
  const passwordNoop = input.action === "password" && input.newPassword === input.currentPassword;
  let replacementHash: string | undefined;
  if (input.action === "password" && !passwordNoop) {
    validateNewPassword(input.newPassword);
    replacementHash = await hashPassword(input.newPassword);
  }
  try {
    return await db.$transaction(async (tx) => {
      const current = await authenticatedAccount(tx, identity.id, token);
      if (current.credentialVersion !== verified.credentialVersion || current.credentialVersion !== input.expectedCredentialVersion) {
        throw new AccountError(409, "Your account changed. Reload settings and review your change.");
      }
      if (passwordNoop || (input.action === "username" && input.username === current.username)) return { changed: false };
      await tx.user.update({ where: { id: current.id }, data: {
        ...(input.action === "username" ? { username: input.username } : { passwordHash: replacementHash! }),
        credentialVersion: { increment: 1 },
      } });
      if (input.action === "username") {
        return { changed: true, username: input.username, credentialVersion: current.credentialVersion + 1 };
      }
      await tx.session.deleteMany({ where: { userId: current.id } });
      return { changed: true, redirect: "/login" as const };
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new AccountError(409, "That username is unavailable.", "username");
    }
    throw error;
  }
}
export async function handleCredentials(request: Request): Promise<NextResponse> {
  try {
    const config = authConfig(); requireOrigin(request, config);
    const source = trustedSource(request, config);
    const input = parseChange(await boundedJson(request));
    const token = presentedToken(request.headers, config);
    const { prisma } = await import("../db/client");
    const identity = await requireSelf(prisma, token);
    await admitAttempt(prisma, "credentials", identity.id, source, config.secret);
    const result = await changeCredentials(prisma, token, input);
    return NextResponse.json(result, { headers: { ...privateHeaders, ...(result.changed && input.action === "password" ? { "Set-Cookie": sessionCookie(config) } : {}) } });
  } catch (error) { return accountFailure(error); }
}
