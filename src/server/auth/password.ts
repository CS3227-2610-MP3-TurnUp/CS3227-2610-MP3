import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { AuthError } from "./policy";

const N = 2 ** 17;
const MAX_MEMORY = 256 * 1024 * 1024;
let activeHashes = 0;

// Unknown accounts still perform the same scrypt operation and comparison.
const DUMMY = `scrypt$131072$8$1$${"00".repeat(32)}$${"00".repeat(64)}`;

async function derive(password: string, salt: Buffer): Promise<Buffer> {
  if (activeHashes >= 2) throw new AuthError(503, "Sign in is busy. Please try again shortly.");
  activeHashes += 1;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(password.normalize("NFC"), salt, 64, { N, r: 8, p: 1, maxmem: MAX_MEMORY },
        (error, key) => error ? reject(error) : resolve(key));
    });
  } finally {
    activeHashes -= 1;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32);
  const key = await derive(password, salt);
  return `scrypt$${N}$8$1$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const encoded = stored ?? DUMMY;
  const match = /^scrypt\$131072\$8\$1\$([a-f0-9]{64})\$([a-f0-9]{128})$/.exec(encoded);
  // Corrupt persisted hashes fail closed after equivalent work; never lower the cost.
  const parts = match ?? /^scrypt\$131072\$8\$1\$([a-f0-9]{64})\$([a-f0-9]{128})$/.exec(DUMMY)!;
  const actual = await derive(password, Buffer.from(parts[1], "hex"));
  return timingSafeEqual(actual, Buffer.from(parts[2], "hex")) && stored !== null && match !== null;
}
