import "server-only";

import { isIP } from "node:net";
import { AuthError } from "./policy";

export type AuthConfig = { origin: string; secret: string; secure: boolean; sourceMode: "local" | "vercel" };

export function authConfig(env: Record<string, string | undefined> = process.env): AuthConfig {
  try {
    const url = new URL(env.AUTH_ORIGIN ?? "");
    if (url.origin !== env.AUTH_ORIGIN || url.username || url.password ||
        !/^[a-f0-9]{64,128}$/i.test(env.AUTH_THROTTLE_SECRET ?? "")) throw new Error();
    if (env.AUTH_SOURCE_MODE === "local" && env.TURNUP_ENVIRONMENT === "development" &&
        env.VERCEL !== "1" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
        ["http:", "https:"].includes(url.protocol)) {
      return { origin: url.origin, secret: env.AUTH_THROTTLE_SECRET!, secure: url.protocol === "https:", sourceMode: "local" };
    }
    if (env.AUTH_SOURCE_MODE === "vercel" && env.VERCEL === "1" &&
        ["preview", "production"].includes(env.TURNUP_ENVIRONMENT ?? "") && url.protocol === "https:") {
      return { origin: url.origin, secret: env.AUTH_THROTTLE_SECRET!, secure: true, sourceMode: "vercel" };
    }
  } catch { /* Configuration failures reveal no values. */ }
  throw new AuthError(503, "Account access is unavailable. Please try again later.");
}

export function requireOrigin(request: Request, config: AuthConfig): void {
  if (request.method !== "POST" || request.headers.get("origin") !== config.origin) {
    throw new AuthError(403, "This request could not be accepted. Reload and try again.");
  }
}

export function trustedSource(request: Request, config: AuthConfig): string {
  // Local mode ignores all caller-supplied IP headers and uses one conservative bucket.
  if (config.sourceMode === "local") return "local-loopback";
  // Only the Vercel ingress may supply this authority. No generic forwarded fallback.
  // https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for
  const source = request.headers.get("x-vercel-forwarded-for");
  if (!source || source.length > 45 || !isIP(source)) {
    throw new AuthError(503, "Account access is unavailable. Please try again later.");
  }
  // URL's IPv6 serializer normalises equivalent spellings before digesting.
  return isIP(source) === 6 ? new URL(`http://[${source}]/`).hostname : source;
}

export async function boundedJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new AuthError(415, "Send account fields as JSON.");
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > 4096)) {
    throw new AuthError(413, "The account request is too large.");
  }
  if (!request.body) throw new AuthError(400, "Enter your account details.");
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const read = async () => {
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) throw new AuthError(413, "The account request is too large.");
        chunks.push(value);
      }
      try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
      catch { throw new AuthError(400, "Enter valid account details."); }
    };
    return await Promise.race([
      read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AuthError(408, "The account request took too long.")), 5000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    // Do not let a stalled producer delay rejection after the timeout/size bound.
    void reader.cancel().catch(() => {});
  }
}
