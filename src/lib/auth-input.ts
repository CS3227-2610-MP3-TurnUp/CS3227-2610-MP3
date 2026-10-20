export function canonicalUsername(value: string): string {
  return value.trim().replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

export type AuthInputErrors = { username?: string; password?: string };

// Safe to share with the form. Server validation remains authoritative.
export function authInputErrors(username: string, password: string): AuthInputErrors {
  const errors: AuthInputErrors = {};
  const name = canonicalUsername(username);
  if (!name) errors.username = "Enter your username.";
  else if (!/^[a-z0-9_]{3,32}$/.test(name)) errors.username = "Use 3–32 letters, numbers or underscores.";
  const length = Array.from(password.normalize("NFC")).length;
  if (!length) errors.password = "Enter your password.";
  else if (length < 15 || length > 128) errors.password = "Use 15–128 characters. Spaces are allowed.";
  return errors;
}
