import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const requireSelf = vi.hoisted(() => vi.fn());
vi.mock("../../src/server/accounts/service", () => ({ requireSelf }));

import { AuthError } from "../../src/server/auth/policy";
import { EventError } from "../../src/server/events/policy";
import { assertProposalEventAccess } from "../../src/server/proposal-assistance/access";
import { admitProposalExtraction, PROPOSAL_EXTRACTION_OWNER_LIMIT } from "../../src/server/proposal-assistance/admission";

const eventId = "a3c1fedd-1bdf-4e70-9fa0-4e8a074c2587";
const expectedVersion = 7;

describe("proposal event access", () => {
  beforeEach(() => requireSelf.mockReset());

  it("requires Organiser role before looking up an event", async () => {
    requireSelf.mockResolvedValueOnce({ id: "student-id", role: "STUDENT" });
    const findUnique = vi.fn();
    await expect(assertProposalEventAccess({ event: { findUnique } } as never, "token", eventId, expectedVersion))
      .rejects.toMatchObject({ status: 403 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("hides foreign events and rejects cancelled or stale versions", async () => {
    requireSelf.mockResolvedValue({ id: "owner-id", role: "ORGANISER" });
    const findUnique = vi.fn().mockResolvedValueOnce({ ownerId: "other-id", state: "DRAFT", version: expectedVersion, preparationVersion: 0 });
    const db = { event: { findUnique } } as never;
    await expect(assertProposalEventAccess(db, "token", eventId, expectedVersion)).rejects.toMatchObject({ status: 404 });
    findUnique.mockResolvedValueOnce({ ownerId: "owner-id", state: "CANCELLED", version: expectedVersion, preparationVersion: 0 });
    await expect(assertProposalEventAccess(db, "token", eventId, expectedVersion)).rejects.toBeInstanceOf(EventError);
    findUnique.mockResolvedValueOnce({ ownerId: "owner-id", state: "DRAFT", version: expectedVersion + 1, preparationVersion: 0 });
    await expect(assertProposalEventAccess(db, "token", eventId, expectedVersion)).rejects.toMatchObject({ status: 409 });
  });

  it("rechecks the persisted preparation revision independently from the event version", async () => {
    requireSelf.mockResolvedValue({ id: "owner-id", role: "ORGANISER" });
    const findUnique = vi.fn().mockResolvedValue({ ownerId: "owner-id", state: "DRAFT", version: expectedVersion, preparationVersion: 4 });
    const db = { event: { findUnique } } as never;
    await expect(assertProposalEventAccess(db, "token", eventId, expectedVersion, 3)).rejects.toMatchObject({ status: 409 });
    expect(await assertProposalEventAccess(db, "token", eventId, expectedVersion, 4)).toEqual({
      ownerId: "owner-id", eventVersion: expectedVersion, preparationRevision: 4,
    });
  });

  it("uses the authenticated owner identity and current event state", async () => {
    requireSelf.mockResolvedValueOnce({ id: "owner-id", role: "ORGANISER" });
    const findUnique = vi.fn().mockResolvedValueOnce({ ownerId: "owner-id", state: "PUBLISHED", version: expectedVersion, preparationVersion: 2 });
    const access = await assertProposalEventAccess({ event: { findUnique } } as never, "token", eventId, expectedVersion);
    expect(access).toEqual({ ownerId: "owner-id", eventVersion: expectedVersion, preparationRevision: 2 });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: eventId }, select: { ownerId: true, state: true, version: true, preparationVersion: true } });
  });
});

describe("durable local proposal admission", () => {
  function fakeDb(admitted: boolean) {
    const query = vi.fn(async (strings: TemplateStringsArray, ..._values: unknown[]) => {
      const sql = strings.join(" ");
      if (sql.includes("SELECT clock_timestamp()")) return [{ now: new Date("2026-10-22T00:00:00.000Z") }];
      if (sql.includes("INSERT INTO auth_throttle")) return admitted ? [{ key: "opaque" }] : [];
      return [];
    });
    const execute = vi.fn(async () => 0);
    const transaction = vi.fn(async (callback: (tx: { $queryRaw: typeof query; $executeRaw: typeof execute }) => unknown) => callback({ $queryRaw: query, $executeRaw: execute }));
    return { db: { $transaction: transaction } as never, query, execute, transaction };
  }

  it("admits no more than the local owner ceiling without storing raw owner or proposal data", async () => {
    const { db, query, transaction } = fakeDb(true);
    await admitProposalExtraction(db, "stable-owner-uuid", "b".repeat(64));
    expect(PROPOSAL_EXTRACTION_OWNER_LIMIT).toBe(5);
    expect(transaction).toHaveBeenCalledOnce();
    const insert = query.mock.calls.find(([strings]) => strings.join(" ").includes("INSERT INTO auth_throttle"));
    expect(insert).toBeDefined();
    expect(insert?.[1]).toMatch(/^proposal:owner:[a-f0-9]{64}:\d+$/);
    expect(insert?.[1]).not.toContain("stable-owner-uuid");
    expect(insert?.[0].join(" ")).toContain("auth_throttle.count <");
    expect(insert?.[3]).toBe(5);
  });

  it("fails closed when the owner window is exhausted or storage is unavailable", async () => {
    await expect(admitProposalExtraction(fakeDb(false).db, "owner", "b".repeat(64))).rejects.toBeInstanceOf(AuthError);
    const broken = { $transaction: vi.fn(async () => { throw new Error("storage down"); }) } as never;
    await expect(admitProposalExtraction(broken, "owner", "b".repeat(64))).rejects.toThrow("storage down");
  });
});
