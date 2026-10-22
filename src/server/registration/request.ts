import "server-only";
import { EventError } from "../events/policy";

export const REGISTRATION_BODY_BYTES = 256 * 1024;
/** Registration-only bound. Existing authentication body limits are unchanged. */
export async function registrationJson(request: Request): Promise<Record<string, unknown>> {
  if (request.method !== "POST") throw new EventError(405, "Use POST for registration changes.");
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new EventError(415, "Send registration fields as JSON.");
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > REGISTRATION_BODY_BYTES)) throw new EventError(413, "The registration request is too large.");
  if (!request.body) throw new EventError(400, "Send registration fields.");
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const chunks: Uint8Array[] = []; let bytes = 0;
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          bytes += value.byteLength;
          if (bytes > REGISTRATION_BODY_BYTES) throw new EventError(413, "The registration request is too large.");
          chunks.push(value);
        }
        try {
          const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
          if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected object");
          return value as Record<string, unknown>;
        } catch { throw new EventError(400, "Send valid registration fields."); }
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new EventError(408, "The registration request took too long.")), 5000); }),
    ]);
  } finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
}
