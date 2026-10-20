import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { hashPassword, verifyPassword } from "../../src/server/auth/password";

it("stores salted scrypt, verifies NFC equivalence and rejects changed passwords/dummy/corrupt hashes", async () => {
  const password = "unique campus cafe\u0301 phrase";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  expect(first).toMatch(/^scrypt\$131072\$8\$1\$[a-f0-9]{64}\$[a-f0-9]{128}$/);
  expect(first).not.toContain(password);
  expect(first).not.toBe(second);
  expect(await verifyPassword(password.normalize("NFC"), first)).toBe(true);
  expect(await verifyPassword(`${password} `, first)).toBe(false);
  expect(await verifyPassword(password, null)).toBe(false);
  expect(await verifyPassword(password, "corrupt")).toBe(false);
}, 15000);

it("bounds active memory-hard work without an unbounded waiting queue", async () => {
  const work = [hashPassword("a completely unique phrase"), hashPassword("another different phrase")];
  await expect(hashPassword("a third different phrase")).rejects.toMatchObject({ status: 503 });
  await Promise.all(work);
  expect(await verifyPassword("another attempt after completion", null)).toBe(false);
}, 10000);
