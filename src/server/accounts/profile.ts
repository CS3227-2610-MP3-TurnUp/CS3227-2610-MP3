import "server-only";

import { NextResponse } from "next/server";
import type { PrismaClient } from "../db/generated/client";
import { AuthError } from "../auth/policy";
import { presentedToken } from "../auth/session";
import { authConfig, boundedJson, requireOrigin } from "../auth/request-security";
import { AccountError, parseProfile, type ProfileInput } from "./policy";
import { accountFailure, authenticatedAccount, privateHeaders, requireSelf } from "./service";

export async function studentProfile(db: PrismaClient, token?: string, input?: ProfileInput) {
  const identity = await requireSelf(db, token);
  if (identity.role !== "STUDENT") throw new AuthError(403, "Student profile access is unavailable for this account.");
  return db.$transaction(async (tx) => {
    const account = await authenticatedAccount(tx, identity.id, token);
    if (account.role !== "STUDENT") throw new AuthError(403, "Student profile access is unavailable for this account.");
    const current = await tx.user.findUniqueOrThrow({ where: { id: account.id },
      select: { studentName: true, studentPhone: true, profileVersion: true } });
    if (input) {
      if (input.expectedProfileVersion !== current.profileVersion) throw new AccountError(409, "Your profile changed. Reload and review before saving again.");
      if (current.studentName !== input.name || current.studentPhone !== input.phone) {
        const updated = await tx.user.update({ where: { id: account.id }, data: {
          studentName: input.name, studentPhone: input.phone, profileVersion: { increment: 1 },
        }, select: { studentName: true, studentPhone: true, profileVersion: true } });
        return { name: updated.studentName, phone: updated.studentPhone, profileVersion: updated.profileVersion, changed: true };
      }
    }
    return { name: current.studentName, phone: current.studentPhone, profileVersion: current.profileVersion, changed: false };
  });
}
export async function handleProfile(request: Request): Promise<NextResponse> {
  try {
    const config = authConfig();
    if (request.method === "POST") requireOrigin(request, config);
    const token = presentedToken(request.headers, config);
    const input = request.method === "POST" ? parseProfile(await boundedJson(request)) : undefined;
    const { prisma } = await import("../db/client");
    return NextResponse.json(await studentProfile(prisma, token, input), { headers: privateHeaders });
  } catch (error) { return accountFailure(error); }
}
