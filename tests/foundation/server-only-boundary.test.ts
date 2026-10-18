import { expect, it } from "vitest";

it("keeps the server-only marker poisoned in the default test configuration", async () => {
  await expect(import("server-only")).rejects.toThrow(
    "This module cannot be imported from a Client Component module.",
  );
});
