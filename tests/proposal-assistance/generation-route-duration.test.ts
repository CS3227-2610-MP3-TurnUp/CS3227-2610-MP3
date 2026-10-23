import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const extraction = readFileSync(resolve("src/app/api/organiser/events/[id]/proposal-extraction/route.ts"), "utf8");
const faq = readFileSync(resolve("src/app/api/organiser/events/[id]/public-candidates/route.ts"), "utf8");

describe("hosted generation route execution budget", () => {
  it("allows the selected 60-second inference timeout plus bounded request processing", () => {
    expect(extraction).toContain("export const maxDuration = 120;");
    expect(faq).toContain("export const maxDuration = 120;");
  });
});
