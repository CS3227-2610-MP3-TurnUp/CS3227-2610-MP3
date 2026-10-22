import "server-only";
import { randomUUID } from "node:crypto";
import type { Event, Prisma, PrismaClient } from "../db/generated/client";
import { EMPTY_EVENT, sameEventFields, type EventFields, type EventSummary } from "../../lib/event-fields";
import { authenticatedAccount, requireSelf } from "../accounts/service";
import type { Transaction } from "../auth/session";
import { digest, EventError, parseFields, parseDraftForm, publicationSnapshot, validatePublication } from "./policy";

import { sameFormContent, type FormQuestion } from "../../lib/registration-form";

const draftForm = (event: Event) => (event.draftForm ?? { questions: [] }) as unknown as { questions: FormQuestion[] };
type Snapshot = ReturnType<typeof publicationSnapshot>;
type Db = PrismaClient;
const unavailable = () => new EventError(404, "Event unavailable.");

/** Match account lock order, then serialize each event and revalidate mutations at commit. */
async function asOrganiser<T>(db: Db, token: string | undefined, operation: (tx: Transaction, actor: string) => Promise<T>): Promise<T> {
  const identity = await requireSelf(db, token);
  if (identity.role !== "ORGANISER") throw new EventError(403, "Organiser access required.");
  return db.$transaction(async (tx) => {
    const account = await authenticatedAccount(tx, identity.id, token);
    if (account.role !== "ORGANISER") throw new EventError(403, "Organiser access required.");
    const result = await operation(tx, account.id);
    // A transaction can span the absolute expiry boundary while waiting for a lock.
    await authenticatedAccount(tx, account.id, token);
    return result;
  });
}
async function owned(tx: Transaction, actor: string, id: string): Promise<Event> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM event WHERE id = ${id}::uuid AND owner_id = ${actor}::uuid FOR UPDATE`;
  if (!rows.length) throw unavailable();
  const event = await tx.event.findUnique({ where: { id } });
  if (!event || event.ownerId !== actor) throw unavailable();
  return event;
}
function currentVersion(event: Event, expected: number) {
  if (event.version !== expected) throw new EventError(409, "This event changed. Reload and review before trying again.");
}
function editable(event: Event) {
  if (event.state === "CANCELLED") throw new EventError(409, "Cancelled events cannot be edited or republished.");
}
async function stamp(tx: Transaction): Promise<Date> {
  const [row] = await tx.$queryRaw<{ epochMs: number }[]>`SELECT (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::double precision AS "epochMs"`;
  return new Date(row.epochMs);
}
async function previousSnapshot(tx: Transaction, event: Event): Promise<Snapshot | null> {
  if (!event.currentPublicationId) return null;
  const publication = await tx.eventPublication.findFirst({ where: { id: event.currentPublicationId, eventId: event.id } });
  if (!publication) throw new EventError(503, "Event publication is unavailable.");
  return publication.snapshot as unknown as Snapshot;
}
export async function listEvents(db: Db, token: string | undefined, search = "", sort = "modified", direction = "desc") {
  return asOrganiser(db, token, async (tx, actor) => {
    const records = await tx.event.findMany({ where: { ownerId: actor }, include: { currentPublication: true } });
    const items: EventSummary[] = records.map((event) => {
      if (event.currentPublicationId && !event.currentPublication) throw new EventError(503, "Event publication is unavailable.");
      const draft = event.draft as unknown as EventFields;
      const publication = event.currentPublication?.snapshot as unknown as Snapshot | undefined;
      return { id: event.id, state: event.state, version: event.version, fields: publication?.fields ?? draft,
        editedAt: event.editedAt.toISOString(), hasSavedChanges: event.state !== "CANCELLED" && !!publication && (!sameEventFields(draft, publication.fields) || !sameFormContent({ ...publication.form, ...draftForm(event) }, publication.form)) };
    });
    const filtered = items.filter((event) => event.fields.title.toLocaleLowerCase("en").includes(search.toLocaleLowerCase("en")));
    return filtered.sort((a, b) => {
      let comparison: number;
      if (sort === "title") comparison = a.fields.title.localeCompare(b.fields.title, "en");
      else if (sort === "start") {
        // Incomplete draft schedules always appear after scheduled events.
        if (!a.fields.start || !b.fields.start) return a.fields.start ? -1 : b.fields.start ? 1 : a.id.localeCompare(b.id);
        comparison = a.fields.start.localeCompare(b.fields.start);
      } else comparison = a.editedAt.localeCompare(b.editedAt);
      return comparison ? comparison * (direction === "asc" ? 1 : -1) : a.id.localeCompare(b.id);
    });
  });
}
export async function createEvent(db: Db, token: string | undefined) {
  return asOrganiser(db, token, async (tx, actor) => tx.event.create({ data: { id: randomUUID(), ownerId: actor, draft: { ...EMPTY_EVENT } } }));
}
export async function readEvent(db: Db, token: string | undefined, id: string) {
  return asOrganiser(db, token, async (tx, actor) => {
    const event = await owned(tx, actor, id);
    return { id: event.id, state: event.state, version: event.version, draftVersion: event.draftVersion,
      fields: event.draft as unknown as EventFields, form: draftForm(event), published: await previousSnapshot(tx, event) };
  });
}
export type EventAction = "save" | "preview" | "publish" | "withdraw" | "cancel" | "delete" | "discard";
export async function mutateEvent(db: Db, token: string | undefined, id: string, expected: number,
  action: EventAction, fields?: EventFields, approvalId?: string, form?: unknown) {
  return asOrganiser(db, token, async (tx, actor) => {
    const event = await owned(tx, actor, id);
    currentVersion(event, expected);
    if (action === "delete") {
      if (event.firstPublishedAt || event.currentPublicationId || event.state !== "DRAFT") throw new EventError(409, "Previously published events must be cancelled, not deleted.");
      await tx.event.delete({ where: { id } });
      return { deleted: true };
    }
    editable(event);
    if (action === "save" || action === "discard") {
      const snapshot = action === "discard" ? await previousSnapshot(tx, event) : null;
      if (action === "discard" && !snapshot) throw new EventError(409, "Use Delete Draft for a never-published event.");
      const next = action === "save" ? parseFields(fields) : snapshot!.fields;
      const nextForm = action === "discard" ? { questions: snapshot!.form.questions } : form === undefined ? draftForm(event) : parseDraftForm(form, draftForm(event));
      publicationSnapshot(next, randomUUID(), nextForm.questions);
      await tx.event.update({ where: { id }, data: { draft: next, draftForm: nextForm, version: { increment: 1 }, draftVersion: { increment: 1 }, editedAt: await stamp(tx) } });
      await tx.eventApproval.deleteMany({ where: { eventId: id } });
      return { saved: true };
    }
    if (action === "preview") {
      const fields = parseFields(event.draft);
      const previous = await previousSnapshot(tx, event);
      validatePublication(fields, event.state, previous?.fields.start, await stamp(tx));
      const snapshot = publicationSnapshot(fields, randomUUID(), draftForm(event).questions);
      // Retain one reviewable snapshot per event/version; an older tab must review anew.
      await tx.eventApproval.deleteMany({ where: { eventId: id } });
      const approval = await tx.eventApproval.create({ data: { id: randomUUID(), eventId: id, actorId: actor,
        eventVersion: event.version, draftVersion: event.draftVersion, snapshot, digest: digest(snapshot) } });
      return { approvalId: approval.id, snapshot, digest: approval.digest, version: event.version };
    }
    if (action === "publish") {
      if (!approvalId) throw new EventError(409, "Preview this exact saved draft again before publishing.");
      const approval = await tx.eventApproval.findFirst({ where: { id: approvalId, eventId: id, actorId: actor,
        eventVersion: event.version, draftVersion: event.draftVersion } });
      if (!approval) throw new EventError(409, "Preview this exact saved draft again before publishing.");
      const snapshot = approval.snapshot as unknown as Snapshot;
      const fields = parseFields(event.draft);
      if (digest(snapshot) !== approval.digest || digest(publicationSnapshot(fields, snapshot.form.formRevisionId, draftForm(event).questions)) !== approval.digest) throw new EventError(409, "The approved content changed. Preview again.");
      const previous = await previousSnapshot(tx, event);
      const now = await stamp(tx);
      validatePublication(fields, event.state, previous?.fields.start, now);
      // Same event row lock as Student mutations: a publisher cannot undercut active places.
      const active = await tx.registration.count({ where: { eventId: id, state: "ACTIVE" } });
      if (fields.capacity! < active) throw new EventError(409, "Capacity cannot be lower than the active registration count.", "capacity");
      const publication = await tx.eventPublication.create({ data: { id: randomUUID(), eventId: id, revision: event.version + 1,
        snapshot: snapshot as unknown as Prisma.InputJsonValue, digest: approval.digest, approvedBy: actor } });
      await tx.event.update({ where: { id }, data: { currentPublicationId: publication.id, state: "PUBLISHED",
        firstPublishedAt: event.firstPublishedAt ?? now, version: { increment: 1 }, editedAt: now } });
      await tx.eventApproval.deleteMany({ where: { eventId: id } });
      return { published: true };
    }
    if ((action === "withdraw" && event.state !== "PUBLISHED") ||
        (action === "cancel" && !["PUBLISHED", "WITHDRAWN"].includes(event.state))) throw new EventError(409, "That action is unavailable in the current event state.");
    await tx.event.update({ where: { id }, data: { state: action === "withdraw" ? "WITHDRAWN" : "CANCELLED", version: { increment: 1 }, editedAt: await stamp(tx) } });
    await tx.eventApproval.deleteMany({ where: { eventId: id } });
    return { updated: true };
  });
}
