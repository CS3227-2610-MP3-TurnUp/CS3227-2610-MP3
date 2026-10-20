import "server-only";

import { AuthError, canonicalUsername, COMMON_PASSWORDS } from "../auth/policy";

export class AccountError extends AuthError {
  constructor(status: number, message: string, public readonly field?: string) { super(status, message); }
}
export type CredentialChange = { action: "username"; username: string; currentPassword: string; expectedCredentialVersion: number }
  | { action: "password"; newPassword: string; currentPassword: string; expectedCredentialVersion: number };

export function fields(input: unknown, allowed: string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some((key) => !allowed.includes(key)) || allowed.some((key) => !(key in input))) {
    throw new AccountError(400, "Only the required settings fields are accepted.");
  }
  return input as Record<string, unknown>;
}
export function version(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 2147483647) {
    throw new AccountError(400, "Reload settings and try again.", field);
  }
  return value;
}
function password(value: unknown, field: string): string {
  if (typeof value !== "string") throw new AccountError(400, "Enter your password.", field);
  const normalized = value.normalize("NFC");
  if (Array.from(normalized).length < 15 || Array.from(normalized).length > 128) {
    throw new AccountError(400, "Use 15–128 characters. Spaces are allowed.", field);
  }
  return normalized;
}
export function parseChange(input: unknown): CredentialChange {
  const action = input && typeof input === "object" && "action" in input ? input.action : null;
  if (action !== "username" && action !== "password") throw new AccountError(400, "Choose a credential action.");
  const data = fields(input, ["action", "currentPassword", "expectedCredentialVersion", action === "username" ? "username" : "newPassword"]);
  const currentPassword = password(data.currentPassword, "currentPassword");
  const expectedCredentialVersion = version(data.expectedCredentialVersion, "expectedCredentialVersion");
  if (action === "username") {
    const username = typeof data.username === "string" ? canonicalUsername(data.username) : "";
    if (!/^[a-z0-9_]{3,32}$/.test(username)) throw new AccountError(400, "Use 3–32 letters, numbers or underscores.", "username");
    return { action, username, currentPassword, expectedCredentialVersion };
  }
  // Current-password verification never applies the new-password blocklist.
  return { action, newPassword: password(data.newPassword, "newPassword"), currentPassword, expectedCredentialVersion };
}
export function validateNewPassword(value: string): void {
  if (COMMON_PASSWORDS.has(value.toLowerCase())) throw new AccountError(400, "Choose a less common password.", "newPassword");
}
export type ProfileInput = { name: string | null; phone: string | null; expectedProfileVersion: number };
export function parseProfile(input: unknown): ProfileInput {
  const data = fields(input, ["name", "phone", "expectedProfileVersion"]);
  if (data.name !== null && typeof data.name !== "string") throw new AccountError(400, "Enter a name or leave it blank.", "name");
  if (data.phone !== null && typeof data.phone !== "string") throw new AccountError(400, "Enter a phone number or leave it blank.", "phone");
  const name = typeof data.name === "string" ? data.name.normalize("NFC").trim() || null : null;
  if (name && (Array.from(name).length > 100 || /[\p{Cc}\p{Zl}\p{Zp}]/u.test(name))) {
    throw new AccountError(400, "Use up to 100 characters without control characters or line breaks.", "name");
  }
  const rawPhone = typeof data.phone === "string" ? data.phone.trim() : "";
  let phone: string | null = null;
  if (rawPhone) {
    if (Array.from(rawPhone).length > 64 || !/^\+?[0-9 ()-]+$/.test(rawPhone)) {
      throw new AccountError(400, "Use digits, spaces, hyphens, parentheses and an optional leading +.", "phone");
    }
    phone = rawPhone.replace(/[ ()-]/g, "");
    if (!/^\+?[0-9]{7,15}$/.test(phone)) throw new AccountError(400, "Use 7–15 digits.", "phone");
  }
  return { name, phone, expectedProfileVersion: version(data.expectedProfileVersion, "expectedProfileVersion") };
}
