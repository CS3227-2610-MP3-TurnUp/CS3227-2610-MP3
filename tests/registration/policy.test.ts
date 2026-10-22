import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { discoveryOptions } from "../../src/server/registration/policy";
import { discoverySearchError } from "../../src/lib/registration-types";
it("defaults to upcoming, normalises title search and accepts only the two explicit periods", () => {
  expect(discoveryOptions(new URLSearchParams())).toEqual({ search: "", period: "upcoming" });
  expect(discoveryOptions(new URLSearchParams({ search: "  cafe\u0301  ", period: "past" }))).toEqual({ search: "café", period: "past" });
  expect(discoveryOptions(new URLSearchParams({ search: "🌱".repeat(150) })).search).toHaveLength(300);
});
it("rejects overlong/control search, unknown or duplicate query fields and unsupported period", () => {
  for (const query of ["period=all", "period=", "ownerId=someone", "publicationId=old", "role=STUDENT", "search=a&search=b", "period=past&period=upcoming",
    new URLSearchParams({ search: "x".repeat(151) }).toString(), new URLSearchParams({ search: "a\nb" }).toString()]) {
    expect(() => discoveryOptions(new URLSearchParams(query))).toThrowError();
  }
});
it("accepts full Unicode search bounds in browser/server policy without UTF-16 truncation", () => {
  expect(discoverySearchError("🌱".repeat(150))).toBeUndefined();
  expect(discoverySearchError("e\u0301".repeat(150))).toBeUndefined();
  expect(discoverySearchError("🌱".repeat(151))).toContain("150");
  expect(discoverySearchError("a\nb")).toBeDefined();
});

import { remainingCapacity, registrationActions } from "../../src/server/registration/policy";
it("derives remaining capacity from active registrations and fails on inconsistent counts", () => {
  expect(remainingCapacity(10, 3)).toBe(7); expect(remainingCapacity(1, 1)).toBe(0);
  for (const [capacity, count] of [[0, 0], [10001, 0], [2, 3], [2, -1], [2, 0.5]]) expect(() => remainingCapacity(capacity, count)).toThrow();
});
it("follows effective-start equality, safe withdrawal cancellation and explicit future rejoining", () => {
  const start = "2099-01-01T00:00:00.000Z", before = new Date("2098-12-31T23:59:59.999Z");
  expect(registrationActions("PUBLISHED", start, null, 1, before).canJoin).toBe(true);
  expect(registrationActions("PUBLISHED", start, "CANCELLED", 1, before).canRejoin).toBe(true);
  expect(registrationActions("WITHDRAWN", start, "ACTIVE", 0, before)).toMatchObject({ canCancel: true, canCorrect: false, canJoin: false });
  expect(Object.values(registrationActions("PUBLISHED", start, "ACTIVE", 0, new Date(start)))).not.toContain(true);
  expect(Object.values(registrationActions("CANCELLED", start, "ACTIVE", 1, before))).not.toContain(true);
  expect(registrationActions("PUBLISHED", start, null, 0, before).canJoin).toBe(false);
});
