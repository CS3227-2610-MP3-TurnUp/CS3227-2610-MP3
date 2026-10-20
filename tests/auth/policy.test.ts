import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { canonicalUsername, parseCredentials } from "../../src/server/auth/policy";

const valid = { username: " Alice_123 ", password: "a unique phrase for campus", role: "STUDENT" };

describe("signup account boundary", () => {
  it("canonicalises globally and needs no contact/profile fields", () => {
    expect(parseCredentials(valid, true)).toEqual({ ...valid, username: "alice_123" });
    expect(canonicalUsername("ALICE")).toBe("alice");
    expect(parseCredentials({ ...valid, role: "ORGANISER" }, true).role).toBe("ORGANISER");
  });
  it.each(["ab", "a".repeat(33), "al ice", "álïce", "alice-1", ""])("rejects invalid username %s", (username) => {
    expect(() => parseCredentials({ ...valid, username }, true)).toThrow();
  });
  it.each(["id", "userId", "passwordHash", "email", "name", "phone", "isOrganiser"])("rejects protected/unknown field %s", (key) => {
    expect(() => parseCredentials({ ...valid, [key]: "forged" }, true)).toThrow();
  });
  it.each(["ADMIN", "student", null, ["STUDENT", "ORGANISER"]])("rejects role %s", (role) => {
    expect(() => parseCredentials({ ...valid, role }, true)).toThrow();
  });
  it("normalises NFC and counts Unicode code points without trimming", () => {
    const password = ` e\u0301${"🌱".repeat(12)} `;
    expect(parseCredentials({ ...valid, password }, true).password).toBe(password.normalize("NFC"));
    expect(() => parseCredentials({ ...valid, password: "🌱".repeat(14) }, true)).toThrow();
    expect(parseCredentials({ ...valid, password: "🌱".repeat(128) }, true).password).toHaveLength(256);
    expect(() => parseCredentials({ ...valid, password: "🌱".repeat(129) }, true)).toThrow();
  });
  it("rejects listed common long passwords at signup but permits verification at login", () => {
    expect(() => parseCredentials({ ...valid, password: "PASSWORDPASSWORD" }, true)).toThrow(/less common/);
    expect(parseCredentials({ username: "alice", password: "PASSWORDPASSWORD" }, false).password).toBe("PASSWORDPASSWORD");
  });
  it("rejects login role/identity injection", () => {
    expect(() => parseCredentials(valid, false)).toThrow(/displayed/);
  });
});
