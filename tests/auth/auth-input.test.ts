import { expect, it } from "vitest";
import { authInputErrors, canonicalUsername } from "../../src/lib/auth-input";

it("identifies blank and invalid fields independently without imposing additional password rules", () => {
  expect(authInputErrors("", "")).toEqual({ username: "Enter your username.", password: "Enter your password." });
  expect(authInputErrors("da", "valid unique campus phrase")).toEqual({ username: "Use 3–32 letters, numbers or underscores." });
  expect(authInputErrors("valid_user", "short")).toEqual({ password: "Use 15–128 characters. Spaces are allowed." });
  expect(authInputErrors("a".repeat(33), "x".repeat(129))).toHaveProperty("username");
  expect(authInputErrors("valid_user", "x".repeat(129))).toHaveProperty("password");
  expect(authInputErrors(" A_B ", " ".repeat(15))).toEqual({});
  expect(canonicalUsername(" A_B ")).toBe("a_b");
});

it("matches NFC code-point bounds and preserves password spaces rather than UTF-16 length", () => {
  expect(authInputErrors("valid_user", "🌱".repeat(128))).toEqual({});
  expect(authInputErrors("valid_user", "🌱".repeat(129))).toHaveProperty("password");
  expect(authInputErrors("valid_user", "e\u0301".repeat(14))).toHaveProperty("password");
  expect(authInputErrors("valid_user", "e\u0301".repeat(15))).toEqual({});
});
