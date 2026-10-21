import "server-only";
import type { PrismaClient } from "../db/generated/client";
import type { Transaction } from "../auth/session";
import { authenticatedAccount, requireSelf } from "../accounts/service";
import { currentPublication } from "../publication/reader";
import { EventError, parseFields } from "../events/policy";
import { EVENT_LIMITS } from "../../lib/event-fields";
import type { DiscoveryOptions, StudentEvent } from "../../lib/registration-types";

const unavailable = () => new EventError(404, "Event unavailable.");
const selection = { id: true, version: true, owner: { select: { username: true } },
  currentPublication: { select: { id: true, revision: true, snapshot: true } } } as const;
type PublicRecord = { id: string; version: number; owner: { username: string };
  currentPublication: { id: string; revision: number; snapshot: unknown } | null };

function projection(event: PublicRecord, now: Date): StudentEvent {
  const publication = event.currentPublication;
  if (!publication) throw new EventError(503, "Published events are unavailable. Try again later.");
  try {
    const fields = parseFields((publication.snapshot as { fields?: unknown })?.fields);
    if (!fields.start || !fields.end || fields.capacity === null ||
        Object.keys(EVENT_LIMITS).some((key) => key !== "other" && !fields[key as keyof typeof EVENT_LIMITS]) ||
        Date.parse(fields.end) <= Date.parse(fields.start)) throw new Error("Incomplete publication");
    return { eventId: event.id, eventVersion: event.version, organiser: event.owner.username,
      publicationId: publication.id, publicationRevision: publication.revision, fields,
      hasStarted: Date.parse(fields.start) <= now.getTime(), remainingPlaces: null, registrationStatus: "unavailable" };
  } catch { throw new EventError(503, "Published events are unavailable. Try again later."); }
}

async function asStudent<T>(db: PrismaClient, token: string | undefined, read: (tx: Transaction) => Promise<T>) {
  const identity = await requireSelf(db, token);
  if (identity.role !== "STUDENT") throw new EventError(403, "Student access required.");
  return db.$transaction(async (tx) => {
    const account = await authenticatedAccount(tx, identity.id, token);
    if (account.role !== "STUDENT") throw new EventError(403, "Student access required.");
    const result = await read(tx);
    await authenticatedAccount(tx, identity.id, token);
    return result;
  });
}
async function databaseNow(tx: Transaction) {
  const [stamp] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return stamp.now;
}
/** Recheck availability/pointer after projection; never deliver a detected withdrawn/replaced revision. */
async function recheck(tx: Transaction, items: StudentEvent[]) {
  if (!items.length) return;
  const current = await tx.event.findMany({ where: { id: { in: items.map((item) => item.eventId) }, state: "PUBLISHED" },
    select: { id: true, currentPublicationId: true } });
  const pointers = new Map(current.map((event) => [event.id, event.currentPublicationId]));
  if (items.some((item) => pointers.get(item.eventId) !== item.publicationId)) {
    throw new EventError(409, "Published events changed. Refresh to see current information.");
  }
}
export async function discoverEvents(db: PrismaClient, token: string | undefined, options: DiscoveryOptions) {
  return asStudent(db, token, async (tx) => {
    const records = await tx.event.findMany({ where: { state: "PUBLISHED" }, select: selection });
    const now = await databaseNow(tx);
    const search = options.search.toLocaleLowerCase("en");
    const events = records.map((event) => projection(event, now)).filter((event) =>
      event.hasStarted === (options.period === "past") && event.fields.title.toLocaleLowerCase("en").includes(search))
      .sort((a, b) => a.fields.start.localeCompare(b.fields.start) || a.eventId.localeCompare(b.eventId));
    await recheck(tx, events);
    return events;
  });
}
export async function studentEvent(db: PrismaClient, token: string | undefined, eventId: string) {
  // Consume the merged producer's actual public reader, then recheck its state/pointer in the protected read.
  const source = await currentPublication(db, token, eventId);
  return asStudent(db, token, async (tx) => {
    const record = await tx.event.findFirst({ where: { id: eventId, state: "PUBLISHED", currentPublicationId: source.publication.id }, select: selection });
    if (!record) throw unavailable();
    const event = projection(record, await databaseNow(tx));
    await recheck(tx, [event]);
    return event;
  });
}
