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
