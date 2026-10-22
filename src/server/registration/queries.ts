import "server-only";
import type { PrismaClient } from "../db/generated/client";
import type { Transaction } from "../auth/session";
import { authenticatedAccount, requireSelf } from "../accounts/service";
import { currentPublication } from "../publication/reader";
import { EventError, parseFields } from "../events/policy";
import { EVENT_LIMITS } from "../../lib/event-fields";
import type { DiscoveryOptions, StudentEvent } from "../../lib/registration-types";

import { parseRegistrationForm, publicationChanges, type PublicationContent, type AnswerMap } from "../../lib/registration-form";
import { remainingCapacity, registrationActions } from "./policy";
import type { MyRegistration, RegistrationScreen } from "../../lib/registration-types";

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

async function asStudent<T>(db: PrismaClient, token: string | undefined, read: (tx: Transaction, actor: string) => Promise<T>) {
  const identity = await requireSelf(db, token);
  if (identity.role !== "STUDENT") throw new EventError(403, "Student access required.");
  return db.$transaction(async (tx) => {
    const account = await authenticatedAccount(tx, identity.id, token);
    if (account.role !== "STUDENT") throw new EventError(403, "Student access required.");
    const result = await read(tx, identity.id);
    await authenticatedAccount(tx, identity.id, token);
    return result;
  });
}
async function databaseNow(tx: Transaction) {
  const [stamp] = await tx.$queryRaw<{ epochMs: number }[]>`SELECT (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::double precision AS "epochMs"`;
  return new Date(stamp.epochMs);
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
  return asStudent(db, token, async (tx, actor) => {
    const records = await tx.event.findMany({ where: { state: "PUBLISHED" }, select: selection });
    const now = await databaseNow(tx);
    const search = options.search.toLocaleLowerCase("en");
    const events = records.map((event) => projection(event, now)).filter((event) =>
      event.hasStarted === (options.period === "past") && event.fields.title.toLocaleLowerCase("en").includes(search))
      .sort((a, b) => a.fields.start.localeCompare(b.fields.start) || a.eventId.localeCompare(b.eventId));
    await availability(tx, actor, events);
    await recheck(tx, events);
    return events;
  });
}
export async function studentEvent(db: PrismaClient, token: string | undefined, eventId: string) {
  // Consume the merged producer's actual public reader, then recheck its state/pointer in the protected read.
  const source = await currentPublication(db, token, eventId);
  return asStudent(db, token, async (tx, actor) => {
    const record = await tx.event.findFirst({ where: { id: eventId, state: "PUBLISHED", currentPublicationId: source.publication.id }, select: selection });
    if (!record) throw unavailable();
    const event = projection(record, await databaseNow(tx));
    await availability(tx, actor, [event]);
    await recheck(tx, [event]);
    return event;
  });
}

async function availability(tx: Transaction, actor: string, items: StudentEvent[]) {
  for (const item of [...items].sort((a,b) => a.eventId.localeCompare(b.eventId))) {
    await tx.$queryRaw`SELECT id FROM event WHERE id = ${item.eventId}::uuid FOR SHARE`;
    const count = await tx.registration.count({ where: { eventId: item.eventId, state: "ACTIVE" } });
    const own = await tx.registration.findUnique({ where: { studentId_eventId: { studentId: actor, eventId: item.eventId } }, select: { state: true } });
    item.remainingPlaces = remainingCapacity(item.fields.capacity!, count);
    item.registrationStatus = own?.state ?? "none";
  }
}
export async function myRegistrations(db: PrismaClient, token: string | undefined): Promise<MyRegistration[]> {
  return asStudent(db, token, async (tx, actor) => {
    const ids = await tx.registration.findMany({ where: { studentId: actor }, select: { eventId: true } });
    for (const { eventId } of ids.sort((a,b) => a.eventId.localeCompare(b.eventId))) await tx.$queryRaw`SELECT id FROM event WHERE id = ${eventId}::uuid FOR SHARE`;
    const registrations = await tx.registration.findMany({ where: { studentId: actor }, include: { event: { include: { currentPublication: true } }, joinedPublication: true }, orderBy: [{ joinedAt: "desc" }, { id: "asc" }] });
    const now = await databaseNow(tx);
    return Promise.all(registrations.map(async (registration): Promise<MyRegistration> => {
      const event = registration.event;
      if (!event.currentPublication || event.state === "DRAFT") throw new EventError(503, "Registration unavailable.");
      const current = event.currentPublication.snapshot as unknown as PublicationContent;
      const joined = registration.joinedPublication.snapshot as unknown as PublicationContent;
      const count = await tx.registration.count({ where: { eventId: event.id, state: "ACTIVE" } });
      const actions = registrationActions(event.state, current.fields.start, registration.state, remainingCapacity(current.fields.capacity!, count), now);
      return { registrationId: registration.id, eventId: event.id, state: registration.state, eventState: event.state,
        generation: registration.generation, version: registration.version, current: event.state === "PUBLISHED" ? current.fields : null,
        changes: event.state === "PUBLISHED" ? publicationChanges(joined, current) : [], ...actions };
    }));
  });
}
export async function registrationScreen(db: PrismaClient, token: string | undefined, reference: string, correction = false): Promise<RegistrationScreen> {
  return asStudent(db, token, async (tx, actor) => {
    const own = correction ? await tx.registration.findFirst({ where: { id: reference, studentId: actor }, select: { eventId: true } }) : null;
    if (correction && !own) throw new EventError(404, "Registration unavailable.");
    const eventId = own?.eventId ?? reference;
    await tx.$queryRaw`SELECT id FROM event WHERE id = ${eventId}::uuid FOR SHARE`;
    const event = await tx.event.findFirst({ where: { id: eventId, state: "PUBLISHED" }, include: { currentPublication: true, owner: { select: { username: true } } } });
    if (!event?.currentPublication) throw unavailable();
    const snapshot = event.currentPublication.snapshot as unknown as PublicationContent;
    const registration = await tx.registration.findUnique({ where: { studentId_eventId: { studentId: actor, eventId } }, include: { currentSubmission: true } });
    const count = await tx.registration.count({ where: { eventId, state: "ACTIVE" } });
    const actions = registrationActions("PUBLISHED", snapshot.fields.start, registration?.state ?? null, remainingCapacity(snapshot.fields.capacity!, count), await databaseNow(tx));
    if (correction && (!registration?.currentSubmission || !actions.canCorrect)) throw new EventError(409, "This submission cannot be corrected now.");
    const captured = correction ? registration!.currentSubmission! : null;
    // Global profile is read for initial join prefills only. Correction always uses immutable submitted values.
    const profile = captured ? null : await tx.user.findUnique({ where: { id: actor }, select: { studentName: true, studentPhone: true } });
    return { eventId, registrationId: registration?.id ?? null, generation: registration?.generation ?? 0, version: registration?.version ?? 0,
      organiser: event.owner.username, eventTitle: snapshot.fields.title, publicationId: event.currentPublication.id,
      form: parseRegistrationForm(captured?.capturedForm ?? snapshot.form), canSubmit: correction ? actions.canCorrect : actions.canJoin || actions.canRejoin,
      submissionVersion: captured?.version ?? 0, initial: { name: captured ? captured.profileName : profile?.studentName ?? null,
        phone: captured ? captured.profilePhone : profile?.studentPhone ?? null, answers: captured ? captured.answers as AnswerMap : {} } };
  });
}
