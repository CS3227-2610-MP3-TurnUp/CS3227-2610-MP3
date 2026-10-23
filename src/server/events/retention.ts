import "server-only";

import { Prisma, type PrismaClient } from "../db/generated/client";
import type { Transaction } from "../auth/session";
import { EMPTY_EVENT, sameEventFields, type EventFields } from "../../lib/event-fields";
import { PRIVATE_DRAFT_RETENTION_MS } from "../../lib/event-retention";
import { digest, exactKeys, object, parseFields, validatePublication } from "./policy";

import { parseRegistrationForm, sameFormContent, assertPublicFormBudget, type PublicationContent } from "../../lib/registration-form";

const BATCH_SIZE = 50;
type ResultKind = "deleted" | "restored" | "unchanged" | "unavailable" | "skipped";
export type DraftRetentionSweepResult = {
  scanned: number;
  deletedDrafts: number;
  restoredPublications: number;
  unchanged: number;
  unavailable: number;
};

/**
 * Claim a bounded, fair batch using database time and row locks. The check marker is
 * only scheduler bookkeeping; user activity is stored separately and never extended.
 */
async function claimBatch(db: PrismaClient, dryRun: boolean): Promise<string[]> {
  return db.$transaction(async (tx) => {
    if (dryRun) {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM event
        WHERE private_activity_at IS NOT NULL
          AND private_activity_at <= clock_timestamp() - interval '30 days'
        ORDER BY retention_checked_at ASC NULLS FIRST, private_activity_at ASC, id ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      `;
      return rows.map((row) => row.id);
    }
    const rows = await tx.$queryRaw<{ id: string }[]>`
      WITH candidates AS (
        SELECT id FROM event
        WHERE private_activity_at IS NOT NULL
          AND private_activity_at <= clock_timestamp() - interval '30 days'
        ORDER BY retention_checked_at ASC NULLS FIRST, private_activity_at ASC, id ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE event AS target
      SET retention_checked_at = clock_timestamp()
      FROM candidates
      WHERE target.id = candidates.id
      RETURNING target.id
    `;
    return rows.map((row) => row.id);
  });
}

async function processOne(tx: Transaction, id: string): Promise<ResultKind> {
  const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM event WHERE id = ${id}::uuid FOR UPDATE`;
  if (!locked.length) return "skipped";
  const event = await tx.event.findUnique({ where: { id } });
  if (!event) return "skipped";
  const now = await databaseNow(tx);
  if (!event.privateActivityAt || event.privateActivityAt.getTime() > now.getTime() - PRIVATE_DRAFT_RETENTION_MS) return "skipped";

  const publicationEvidence = Boolean(event.firstPublishedAt || event.currentPublicationId || event.state !== "DRAFT");
  if (!publicationEvidence) {
    const history = await tx.eventPublication.findFirst({ where: { eventId: id } });
    if (event.state !== "DRAFT" || history) {
      await markChecked(tx, event.id, now);
      return "unavailable";
    }
    await tx.event.delete({ where: { id } });
    return "deleted";
  }

  const publications = await tx.eventPublication.findMany({
    where: { eventId: id }, orderBy: { revision: "desc" }, take: 1,
  });
  const latest = publications[0];
  const latestContent = latest && event.firstPublishedAt && event.currentPublicationId === latest.id
    ? readValidPublication(latest.snapshot, latest.digest)
    : null;
  if (!latest || !latestContent) {
    await markChecked(tx, event.id, now);
    return "unavailable";
  }

  const latestFields = latestContent.fields;
  let draftFields: EventFields;
  try { draftFields = parseFields(event.draft); }
  catch {
    // A malformed private draft is still private data. A valid, immutable publication
    // is sufficient to restore it without interpreting the malformed value.
    draftFields = EMPTY_EVENT;
  }
  let formChanged = true;
  try {
    const draftForm = object(event.draftForm ?? { questions: [] });
    formChanged = !sameFormContent(parseRegistrationForm({ ...draftForm, formRevisionId: latestContent.form.formRevisionId }), latestContent.form);
  } catch { /* Invalid private forms are restored from the validated publication. */ }
  const hasPrivateState = formChanged || event.preparation !== null || event.preparationVersion !== 0 || !sameEventFields(draftFields, latestFields);
  if (!hasPrivateState) {
    await tx.eventApproval.deleteMany({ where: { eventId: id } });
    await tx.event.update({ where: { id }, data: { privateActivityAt: null, retentionCheckedAt: now } });
    return "unchanged";
  }

  await tx.event.update({ where: { id }, data: {
    draft: latestFields as unknown as Prisma.InputJsonValue,
    draftForm: { questions: latestContent.form.questions } as unknown as Prisma.InputJsonValue,
    preparation: Prisma.DbNull,
    preparationVersion: 0,
    version: { increment: 1 },
    draftVersion: { increment: 1 },
    privateActivityAt: null,
    retentionCheckedAt: now,
    editedAt: now,
  } });
  await tx.eventApproval.deleteMany({ where: { eventId: id } });
  return "restored";
}

async function databaseNow(tx: Transaction): Promise<Date> {
  const [row] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return row.now;
}

async function markChecked(tx: Transaction, id: string, now: Date) {
  await tx.event.update({ where: { id }, data: { retentionCheckedAt: now } });
}

function readValidPublication(snapshotValue: unknown, expectedDigest: string): PublicationContent | null {
  try {
    const snapshot = object(snapshotValue);
    exactKeys(snapshot, ["fields", "form"]);
    if (digest(snapshotValue) !== expectedDigest) return null;
    const form = parseRegistrationForm(snapshot.form);
    const fields = parseFields(snapshot.fields);
    if (!sameEventFields(snapshot.fields as EventFields, fields)) return null;
    validatePublication(fields, "PUBLISHED", fields.start, new Date(0));
    assertPublicFormBudget(fields, form);
    return { fields, form };
  } catch { return null; }
}

/** Process at most 50 candidates. Per-record failures are isolated and reported only as counts. */
export async function runDraftRetentionSweep(db: PrismaClient, options: { dryRun?: boolean } = {}): Promise<DraftRetentionSweepResult> {
  const ids = await claimBatch(db, options.dryRun === true);
  const result: DraftRetentionSweepResult = {
    scanned: ids.length, deletedDrafts: 0, restoredPublications: 0, unchanged: 0, unavailable: 0,
  };
  if (options.dryRun) {
    result.unchanged = ids.length;
    return result;
  }
  for (const id of ids) {
    let kind: ResultKind;
    try { kind = await db.$transaction((tx) => processOne(tx, id)); }
    catch { kind = "unavailable"; }
    if (kind === "deleted") result.deletedDrafts++;
    else if (kind === "restored") result.restoredPublications++;
    else if (kind === "unavailable") result.unavailable++;
    else if (kind === "unchanged") result.unchanged++;
  }
  return result;
}
