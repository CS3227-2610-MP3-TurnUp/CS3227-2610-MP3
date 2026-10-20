import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseChange, parseProfile, validateNewPassword } from "../../src/server/accounts/policy";
const change = { action: "username", username: " Alice ", currentPassword: "passwordpassword", expectedCredentialVersion: 0 };
const profile = { name: null, phone: null, expectedProfileVersion: 0 };
it("canonicalises credential choices, requires current password/version and rejects protected fields", () => {
  expect(parseChange(change)).toMatchObject({ username: "alice", currentPassword: "passwordpassword" });
  for (const field of ["role", "userId", "id", "passwordHash", "credentialVersion"]) expect(() => parseChange({ ...change, [field]: "forged" })).toThrow();
  expect(() => parseChange({ ...change, expectedCredentialVersion: -1 })).toThrow();
  expect(() => parseChange({ ...change, currentPassword: "" })).toThrow();
  expect(() => validateNewPassword("passwordpassword")).toThrow();
  expect(parseChange({ action: "password", currentPassword: "passwordpassword", newPassword: "passwordpassword", expectedCredentialVersion: 0 })).toMatchObject({ action: "password" });
});
it("normalises optional Unicode names, bounds code points and rejects remaining controls/separators", () => {
  expect(parseProfile({ ...profile, name: "  Jose\u0301 李 O'Connor  " }).name).toBe("José 李 O'Connor");
  expect(parseProfile({ ...profile, name: "🌱".repeat(100) }).name).toHaveLength(200);
  expect(() => parseProfile({ ...profile, name: "🌱".repeat(101) })).toThrow();
  for (const name of ["a\nb", "a\u0000b", "a\u2028b", "a\u2029b"]) expect(() => parseProfile({ ...profile, name })).toThrow();
  expect(parseProfile({ ...profile, name: "  \t " }).name).toBeNull();
});
it("preserves phone leading zero/plus, accepts separators and bounds raw length and digits", () => {
  expect(parseProfile({ ...profile, phone: " +65 (0123)-4567 " }).phone).toBe("+6501234567");
  expect(parseProfile({ ...profile, phone: "0012345" }).phone).toBe("0012345");
  expect(parseProfile({ ...profile, phone: "123456789012345" }).phone).toBe("123456789012345");
  expect(parseProfile({ ...profile, phone: `1234567${"-".repeat(57)}` }).phone).toBe("1234567");
  for (const phone of ["123456", "1234567890123456", "123+4567", "++1234567", "123.4567", "１２３４５６７", `1234567${"-".repeat(58)}`]) expect(() => parseProfile({ ...profile, phone })).toThrow();
  expect(parseProfile({ ...profile, phone: "   " }).phone).toBeNull();
});
it("requires a full pair and expected version, preventing accidental or forged removal", () => {
  for (const input of [{ name: null, expectedProfileVersion: 0 }, { ...profile, userId: "foreign" }, { ...profile, expectedProfileVersion: 0.5 }, { ...profile, name: 123 }]) expect(() => parseProfile(input)).toThrow();
});
