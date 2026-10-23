import "server-only";
import { randomUUID } from "node:crypto";
import type { Event, Prisma, PrismaClient } from "../db/generated/client";
import { draftRetentionStatus } from "../../lib/event-retention";
import { EMPTY_EVENT, sameEventFields, type EventFields, type EventSummary } from "../../lib/event-fields";
import { formatEventAlternative } from "../../features/proposal-assistance/event-prefill";
import type { PublicCandidateSource } from "../../features/proposal-assistance/public-candidates";
import { authenticatedAccount, requireSelf } from "../accounts/service";
import type { Transaction } from "../auth/session";
import { digest, EventError, parseFields, parseDraftForm, publicationSnapshot, validatePublication } from "./policy";
import type { EventPreparation, ClarificationResolutionIntent } from "../../features/proposal-assistance/clarification";
import { PROPOSAL_TO_EVENT_FIELD } from "../../features/proposal-assistance/clarification";
import type { ProposalField } from "../../features/proposal-assistance/types";
import type { PrivateExtraction } from "../../features/proposal-assistance/types";
import {
  applyPreparationResolutions,
  clarificationPersistenceEnabled,
  mergeGeneratedPreparation,
  preparationJson,
  readPreparation,
  unresolvedClarificationFields,
} from "../proposal-assistance/clarification";

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
function retentionDisposition(event: Pick<Event, "state" | "firstPublishedAt" | "currentPublicationId">) {
  return event.firstPublishedAt || event.currentPublicationId || event.state !== "DRAFT" ? "restore_publication" : "delete_draft";
}
function hasPrivateEventState(
  event: Pick<Event, "state" | "firstPublishedAt" | "currentPublicationId">,
  fields: EventFields,
  preparation: unknown,
  preparationVersion: number,
  publicationFields: unknown,
  form?: { questions: FormQuestion[] },
  publicationForm?: Snapshot["form"],
): boolean {
  if (retentionDisposition(event) === "delete_draft") return true;
  if (preparation !== null || preparationVersion !== 0 || publicationFields === null || publicationFields === undefined) return true;
  try { return !sameEventFields(fields, parseFields(publicationFields)) || !!(form && publicationForm && !sameFormContent({ ...publicationForm, ...form }, publicationForm)); }
  catch { return true; }
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
    const now = await stamp(tx);
    const items: EventSummary[] = records.map((event) => {
      if (event.currentPublicationId && !event.currentPublication) throw new EventError(503, "Event publication is unavailable.");
      const draft = event.draft as unknown as EventFields;
      const publication = event.currentPublication?.snapshot as unknown as Snapshot | undefined;
      const disposition = retentionDisposition(event);
      const privateState = hasPrivateEventState(event, draft, event.preparation, event.preparationVersion, publication?.fields, draftForm(event), publication?.form);
      return { id: event.id, state: event.state, version: event.version, fields: publication?.fields ?? draft,
        editedAt: event.editedAt.toISOString(), hasSavedChanges: event.state !== "CANCELLED" && !!publication && (!sameEventFields(draft, publication.fields) || !sameFormContent({ ...publication.form, ...draftForm(event) }, publication.form)),
        retention: privateState ? draftRetentionStatus(event.privateActivityAt, now, disposition) : null };
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
  return asOrganiser(db, token, async (tx, actor) => tx.event.create({ data: {
    id: randomUUID(), ownerId: actor, draft: { ...EMPTY_EVENT }, privateActivityAt: await stamp(tx),
  } }));
}
export async function readEvent(db: Db, token: string | undefined, id: string) {
  return asOrganiser(db, token, async (tx, actor) => {
    const event = await owned(tx, actor, id);
    const preparationEnabled = clarificationPersistenceEnabled();
    assertPreparationMode(event, preparationEnabled);
    const published = await previousSnapshot(tx, event);
    const now = await stamp(tx);
    const privateState = hasPrivateEventState(event, event.draft as unknown as EventFields,
      event.preparation, event.preparationVersion, published?.fields, draftForm(event), published?.form);
    return { id: event.id, state: event.state, version: event.version, draftVersion: event.draftVersion,
      fields: event.draft as unknown as EventFields, form: draftForm(event),
      preparation: preparationEnabled ? readPreparation(event.preparation, event.preparationVersion) : null,
      published,
      retention: privateState ? draftRetentionStatus(event.privateActivityAt, now, retentionDisposition(event)) : null };
  });
}

export type SavedPublicCandidateSnapshot = {
  ownerId: string;
  eventVersion: number;
  preparationRevision: number;
  state: Event["state"];
  source: PublicCandidateSource;
};

export class PublicCandidateNotReadyError extends EventError {
  constructor(field?: string) {
    super(409, "Complete and resolve the saved public draft before generating candidates.", field);
  }
}

/**
 * Read the saved public draft under the normal owner/event/session transaction,
 * requiring a complete publishable snapshot and resolved private clarifications.
 * Only display-safe public fields leave this service helper.
 */
export async function readSavedPublicCandidateSnapshot(
  db: Db,
  token: string | undefined,
  id: string,
  expectedVersion: number,
  expectedPreparationRevision: number,
): Promise<SavedPublicCandidateSnapshot> {
  return asOrganiser(db, token, async (tx, actor) => {
    const event = await owned(tx, actor, id);
    currentVersion(event, expectedVersion);
    if (event.preparationVersion !== expectedPreparationRevision) {
      throw new EventError(409, "Proposal clarifications changed. Reload and try again.");
    }
    editable(event);

    const preparationEnabled = clarificationPersistenceEnabled();
    assertPreparationMode(event, preparationEnabled);
    const preparation = preparationEnabled ? readPreparation(event.preparation, event.preparationVersion) : null;
    let fields: EventFields;
    try { fields = parseFields(event.draft); }
    catch (error) {
      if (error instanceof EventError) throw new PublicCandidateNotReadyError(error.field);
      throw error;
    }
    const unresolved = unresolvedClarificationFields(preparation, fields);
    if (unresolved.length) {
      throw new PublicCandidateNotReadyError(PROPOSAL_TO_EVENT_FIELD[unresolved[0] as ProposalField]);
    }

    const previous = await previousSnapshot(tx, event);
    const now = await stamp(tx);
    try {
      validatePublication(fields, event.state, previous?.fields.start, now);
    } catch (error) {
      if (error instanceof EventError) {
        throw new PublicCandidateNotReadyError(error.field);
      }
      throw error;
    }

    const source: PublicCandidateSource = {
      title: fields.title,
      description: fields.description,
      start: formatEventAlternative("start", fields.start),
      end: formatEventAlternative("end", fields.end),
      location: fields.location,
      capacity: String(fields.capacity),
      fee: fields.fee,
      openTo: fields.openTo,
      preparation: fields.preparation,
      other: fields.other,
    };
    return {
      ownerId: actor,
      eventVersion: event.version,
      preparationRevision: event.preparationVersion,
      state: event.state,
      source,
    };
  });
}
export type EventAction = "save" | "preview" | "publish" | "withdraw" | "cancel" | "delete" | "discard";
export type EventClarificationMutation = { expectedPreparationRevision: number; resolutions: ClarificationResolutionIntent[] };
export async function mutateEvent(db: Db, token: string | undefined, id: string, expected: number,
  action: EventAction, fields?: EventFields, approvalId?: string, clarification?: EventClarificationMutation, form?: unknown) {
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
      const preparationEnabled = clarificationPersistenceEnabled();
      assertPreparationMode(event, preparationEnabled);
      const snapshot = action === "discard" || event.firstPublishedAt || event.currentPublicationId
        ? await previousSnapshot(tx, event) : null;
      if (action === "discard" && !snapshot) throw new EventError(409, "Use Delete Draft for a never-published event.");
      const oldFields = parseFields(event.draft);
      const next = action === "save" ? parseFields(fields) : snapshot!.fields;
      const nextForm = action === "discard" ? { questions: snapshot!.form.questions } : form === undefined ? draftForm(event) : parseDraftForm(form, draftForm(event));
      publicationSnapshot(next, randomUUID(), nextForm.questions);
      const priorPreparation = preparationEnabled ? readPreparation(event.preparation, event.preparationVersion) : null;
      if (action === "save") {
        if (priorPreparation && !clarification) throw new EventError(409, "Reload the proposal clarification state before saving.");
        if (preparationEnabled && clarification && clarification.expectedPreparationRevision !== event.preparationVersion) {
          throw new EventError(409, "Proposal clarifications changed. Reload and review them before saving.");
        }
      }
      const now = await stamp(tx);
      const preparation = applyPreparationResolutions(priorPreparation, oldFields, next,
        action === "save" ? clarification?.resolutions ?? [] : [], actor, now, event.preparationVersion + 1);
      const activityRequired = hasPrivateEventState(event, next, preparation,
        preparation ? event.preparationVersion + 1 : event.preparationVersion, snapshot?.fields, nextForm, snapshot?.form);
      const data: Prisma.EventUpdateInput = {
        draft: next as unknown as Prisma.InputJsonValue,
        draftForm: nextForm as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
        draftVersion: { increment: 1 },
        editedAt: now,
        privateActivityAt: activityRequired ? (action === "save" ? now : event.privateActivityAt) : null,
        retentionCheckedAt: activityRequired ? (action === "save" ? null : event.retentionCheckedAt) : null,
        ...(preparation ? {
          preparation: preparationJson(preparation) as unknown as Prisma.InputJsonValue,
          preparationVersion: { increment: 1 },
        } : {}),
      };
      await tx.event.update({ where: { id }, data });
      await tx.eventApproval.deleteMany({ where: { eventId: id } });
      return { saved: true };
    }
    if (action === "preview") {
      const preparationEnabled = clarificationPersistenceEnabled();
      assertPreparationMode(event, preparationEnabled);
      const fields = parseFields(event.draft);
      assertClarificationsResolved(preparationEnabled ? readPreparation(event.preparation, event.preparationVersion) : null, fields);
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
      const preparationEnabled = clarificationPersistenceEnabled();
      assertPreparationMode(event, preparationEnabled);
      const currentFields = parseFields(event.draft);
      assertClarificationsResolved(preparationEnabled ? readPreparation(event.preparation, event.preparationVersion) : null, currentFields);
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
        firstPublishedAt: event.firstPublishedAt ?? now, version: { increment: 1 }, editedAt: now,
        ...(event.preparation === null ? { privateActivityAt: null, retentionCheckedAt: null } : {}) } });
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

/** Persist one successful extraction while rechecking owner, event and preparation revisions. */
export async function recordProposalExtraction(
  db: Db,
  token: string | undefined,
  id: string,
  expectedVersion: number,
  expectedPreparationRevision: number,
  extraction: PrivateExtraction,
) {
  if (!clarificationPersistenceEnabled()) throw new EventError(503, "Proposal clarification is unavailable in this environment.");
  return asOrganiser(db, token, async (tx, actor) => {
    const event = await owned(tx, actor, id);
    currentVersion(event, expectedVersion);
    if (event.preparationVersion !== expectedPreparationRevision) throw new EventError(409, "Proposal clarifications changed. Reload and try again.");
    editable(event);
    const prior = readPreparation(event.preparation, event.preparationVersion);
    const fields = parseFields(event.draft);
    const next = mergeGeneratedPreparation(prior, extraction, fields, event.preparationVersion + 1);
    const now = await stamp(tx);
    const nextEventVersion = event.version + 1;
    await tx.event.update({ where: { id }, data: {
      preparation: preparationJson(next) as unknown as Prisma.InputJsonValue,
      preparationVersion: { increment: 1 },
      version: { increment: 1 },
      editedAt: now,
      privateActivityAt: now,
      retentionCheckedAt: null,
    } });
    await tx.eventApproval.deleteMany({ where: { eventId: id } });
    return { eventVersion: nextEventVersion, preparation: next,
      retention: draftRetentionStatus(now, now, retentionDisposition(event)) };
  });
}

function assertClarificationsResolved(preparation: EventPreparation | null, fields: EventFields) {
  const unresolved = unresolvedClarificationFields(preparation, fields);
  if (unresolved.length) throw new EventError(409, "Resolve the proposal clarifications before previewing or publishing.", unresolved[0]);
}

function assertPreparationMode(event: Event, preparationEnabled: boolean) {
  if (!preparationEnabled && (event.preparation !== null || event.preparationVersion !== 0)) {
    throw new EventError(503, "Saved proposal clarifications are unavailable in this environment.");
  }
}
