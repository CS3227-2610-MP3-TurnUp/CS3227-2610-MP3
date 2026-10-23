import "server-only";

export const localOrigins = ["http://localhost:3001", "http://127.0.0.1:3001"] as const;
export function localDevelopment(env: NodeJS.ProcessEnv = process.env): boolean {
  // Next sets this after listening. Its default/wildcard bindings produce localhost, not 127.0.0.1.
  return env.NODE_ENV === "development" && !env.VERCEL && env.__NEXT_PRIVATE_ORIGIN === "http://127.0.0.1:3001";
}
export function permittedRequest(request: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!localDevelopment(env) || request.method !== "POST") return false;
  const origin = request.headers.get("origin"), host = request.headers.get("host");
  if (!localOrigins.some((value) => value === origin) || !host || origin !== "http://" + host) return false;
  const site = request.headers.get("sec-fetch-site");
  return (!site || site === "same-origin") && request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json";
}
export interface LocalQuestion { requestId: string; eventId: string; revision: string; question: string }
export function readQuestion(value: unknown): LocalQuestion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const keys = ["requestId", "eventId", "revision", "question"];
  if (Object.keys(input).length !== keys.length || !keys.every((key) => Object.hasOwn(input, key))) return null;
  for (const key of keys) {
    const item = input[key];
    if (typeof item !== "string" || !item.isWellFormed() || !item.trim() || Array.from(item).length > (key === "question" ? 1000 : 128)) return null;
  }
  return { requestId: input.requestId as string, eventId: input.eventId as string, revision: input.revision as string, question: input.question as string };
}
/** Bound bytes while streaming, not only a caller-supplied Content-Length. */
export async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const next = await reader.read(); if (next.done) break;
      size += next.value.byteLength;
      if (size > 8192) { await reader.cancel(); return null; }
      chunks.push(next.value);
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } catch { return null; } finally { reader.releaseLock(); }
}
