import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { PrismaClient } from "../db/generated/client";
import { AuthError, parseCredentials, roleDestination, type Credentials } from "./policy";
import { hashPassword, verifyPassword } from "./password";
import { lockAccount, presentedToken, replaceSession, revokeSession, sessionCookie } from "./session";
import { authConfig, boundedJson, requireOrigin, trustedSource } from "./request-security";
import { admitAttempt } from "./throttle";

export async function authenticate(db: PrismaClient, action: "signup" | "login", credentials: Credentials, previous?: string) {
  if (action === "signup") {
    const passwordHash = await hashPassword(credentials.password);
    try {
      return await db.$transaction(async (tx) => {
        const user = await tx.user.create({ data: {
          id: randomUUID(), username: credentials.username, passwordHash, role: credentials.role!,
        }, select: { id: true, role: true } });
        const token = await replaceSession(tx, user.id, previous);
        return { token, redirect: roleDestination(user.role) };
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        throw new AuthError(409, "That username is unavailable. Choose another username.");
      }
      throw error;
    }
  }
  const user = await db.user.findUnique({ where: { username: credentials.username },
    select: { id: true, role: true, passwordHash: true, credentialVersion: true } });
  const valid = await verifyPassword(credentials.password, user?.passwordHash ?? null);
  if (!valid || !user) throw new AuthError(401, "The username or password is incorrect.");
  return db.$transaction(async (tx) => {
    const current = await lockAccount(tx, user.id);
    if (!current || current.username !== credentials.username || current.credentialVersion !== user.credentialVersion) {
      throw new AuthError(401, "The username or password is incorrect.");
    }
    return { token: await replaceSession(tx, current.id, previous), redirect: roleDestination(current.role) };
  });
}

export async function handleAuth(request: Request, action: "signup" | "login" | "logout"): Promise<NextResponse> {
  const responseHeaders = { "Cache-Control": "no-store, private", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
  let stage = "configuration";
  try {
    const config = authConfig();
    stage = "origin";
    requireOrigin(request, config);
    const previous = presentedToken(request.headers, config);
    // Import only on a request, after security validation. Builds need no DB credentials.
    if (action === "logout") {
      stage = "database_initialisation";
      const { prisma } = await import("../db/client");
      stage = "logout";
      await revokeSession(prisma, previous);
      return NextResponse.json({ redirect: "/login" }, { headers: { ...responseHeaders, "Set-Cookie": sessionCookie(config) } });
    }
    stage = "trusted_source";
    const source = trustedSource(request, config);
    stage = "input";
    const credentials = parseCredentials(await boundedJson(request), action === "signup");
    stage = "database_initialisation";
    const { prisma } = await import("../db/client");
    stage = "admission";
    await admitAttempt(prisma, action, credentials.username, source, config.secret);
    stage = "authentication";
    const result = await authenticate(prisma, action, credentials, previous);
    return NextResponse.json({ redirect: result.redirect }, {
      status: action === "signup" ? 201 : 200,
      headers: { ...responseHeaders, "Set-Cookie": sessionCookie(config, result.token) },
    });
  } catch (error) {
    const expected = error instanceof AuthError;
    if (!expected || error.status >= 500) {
      // Fixed fields only: never log the error object/message, request, identity,
      // password, source IP, cookie, database metadata or configuration values.
      const code = expected ? "AUTH_UNAVAILABLE" : "DEPENDENCY_FAILURE";
      console.error(JSON.stringify({ event: "auth_unavailable", action, stage, code }));
    }
    return NextResponse.json({ error: expected ? error.message : "Account access is unavailable. Please try again later." }, {
      status: expected ? error.status : 503, headers: responseHeaders,
    });
  }
}
