import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type AccountRole } from "./policy";
import { authConfig } from "./request-security";
import { cookieName, resolveSession, type Identity } from "./session";

export type GuardResult = { status: "granted"; user: Identity } | { status: "denied" | "unavailable" };

/** Every protected server operation must resolve identity and check its own role/ownership/state. */
export async function requireRole(role?: AccountRole): Promise<GuardResult> {
  let user: Identity | null;
  try {
    const config = authConfig();
    const jar = await cookies();
    const token = jar.get(cookieName(config))?.value;
    if (!token) user = null;
    else {
      const { prisma } = await import("../db/client");
      user = await resolveSession(prisma, token);
    }
  } catch { return { status: "unavailable" }; }
  if (!user) redirect("/login");
  if (role && user.role !== role) return { status: "denied" };
  return { status: "granted", user };
}
