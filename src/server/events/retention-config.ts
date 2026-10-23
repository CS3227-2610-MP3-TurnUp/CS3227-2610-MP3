import "server-only";

import { timingSafeEqual } from "node:crypto";

export function draftRetentionJobEnabled(env: NodeJS.ProcessEnv): boolean {
  if (env.DRAFT_RETENTION_ENABLED !== "true") return false;
  const localSynthetic = env.TURNUP_ENVIRONMENT === "development" &&
    env.DATABASE_ENVIRONMENT === "non-production" &&
    env.NODE_ENV !== "production" &&
    (!env.VERCEL_ENV || env.VERCEL_ENV === "development");
  const previewSynthetic = env.TURNUP_ENVIRONMENT === "preview" &&
    env.DATABASE_ENVIRONMENT === "non-production" && env.VERCEL_ENV === "preview" && env.NODE_ENV === "production";
  const production = env.TURNUP_ENVIRONMENT === "production" &&
    env.DATABASE_ENVIRONMENT === "production" && env.VERCEL_ENV === "production" && env.NODE_ENV === "production";
  return localSynthetic || previewSynthetic || production;
}

export function validCronSecret(secret: string | undefined): secret is string {
  return Boolean(secret && /^[\x21-\x7e]{32,}$/.test(secret));
}

export function authorizedCronRequest(request: Request, secret: string | undefined): boolean {
  if (!validCronSecret(secret)) return false;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const received = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
