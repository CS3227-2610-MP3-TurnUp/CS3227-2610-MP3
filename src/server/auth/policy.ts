import "server-only";

export type AccountRole = "STUDENT" | "ORGANISER";
export type Credentials = { username: string; password: string; role?: AccountRole };

export class AuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// Deliberately local, finite starter blocklist. See README for scope and maintenance.
export const COMMON_PASSWORDS = new Set([
  "password", "123456", "123456789", "qwerty", "password123", "password123456789",
  "123456789012345", "1234567890123456", "qwertyuiopasdfgh", "qwertyuiopasdfghjkl",
  "thisisapassword", "thisisapassword123", "iloveyou", "iloveyouiloveyou",
  "letmein", "letmeinletmeinletmein", "passwordpassword", "passwordpassword123",
  "correct horse battery staple", "aaaaaaaaaaaaaaa", "000000000000000",
]);

export function canonicalUsername(value: string): string {
  return value.trim().replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

export function parseCredentials(input: unknown, signup: boolean): Credentials {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AuthError(400, "Enter a valid username and password.");
  }
  const data = input as Record<string, unknown>;
  const fields = signup ? ["username", "password", "role"] : ["username", "password"];
  if (Object.keys(data).some((key) => !fields.includes(key)) ||
      typeof data.username !== "string" || typeof data.password !== "string") {
    throw new AuthError(400, "Only the displayed account fields are accepted.");
  }
  const username = canonicalUsername(data.username);
  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    throw new AuthError(400, "Use 3–32 letters, numbers or underscores for your username.");
  }
  const password = data.password.normalize("NFC");
  const length = Array.from(password).length;
  if (length < 15 || length > 128) {
    throw new AuthError(400, "Use a password with 15–128 characters. Spaces are allowed.");
  }
  if (signup && COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new AuthError(400, "Choose a less common password or a longer unique passphrase.");
  }
  if (signup && data.role !== "STUDENT" && data.role !== "ORGANISER") {
    throw new AuthError(400, "Choose Student or Organiser.");
  }
  return { username, password, ...(signup ? { role: data.role as AccountRole } : {}) };
}

export function roleDestination(role: AccountRole): "/student" | "/organiser" {
  return role === "STUDENT" ? "/student" : "/organiser";
}
