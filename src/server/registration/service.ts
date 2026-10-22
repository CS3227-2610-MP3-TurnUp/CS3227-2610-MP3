import "server-only";
import { randomUUID } from "node:crypto";
import type { PrismaClient, Prisma, Registration, RegistrationOperationKind } from "../db/generated/client";
import type { Transaction } from "../auth/session";
import { authenticatedAccount, requireSelf } from "../accounts/service";
import { digest, EventError, version } from "../events/policy";
import { formId, formKeys, formObject, parseRegistrationForm, type PublicationContent } from "../../lib/registration-form";
import { confirmedSubmission, parseJoinRequest } from "./contracts";
import { remainingCapacity } from "./policy";

export type RegistrationResult = { registrationId: string; generation: number; version: number; submissionVersion: number; state: "ACTIVE" | "CANCELLED" };
const conflict = () => new EventError(409, "This registration changed or is unavailable. Refresh and review before trying again.");
export async function studentTransaction<T>(db: PrismaClient, token: string | undefined, work: (tx: Transaction, actor: string) => Promise<T>): Promise<T> {
  const identity = await requireSelf(db, token);
  if (identity.role !== "STUDENT") throw new EventError(403, "Student access required.");
  return db.$transaction(async (tx) => {
    const account = await authenticatedAccount(tx, identity.id, token);
    if (account.role !== "STUDENT") throw new EventError(403, "Student access required.");
    const result = await work(tx, account.id);
    await authenticatedAccount(tx, account.id, token);
    return result;
  }, { timeout: 15000, maxWait: 5000 });
}
export async function registrationClock(tx: Transaction) {
  const [row] = await tx.$queryRaw<{ epochMs: number }[]>`SELECT (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::double precision AS "epochMs"`;
  return new Date(row.epochMs);
}
function beforeStart(snapshot: PublicationContent, now: Date) {
  if (!snapshot.fields.start || Date.parse(snapshot.fields.start) <= now.getTime()) throw conflict();
}
function result(registration: Registration, submissionVersion: number): RegistrationResult {
  return { registrationId: registration.id, generation: registration.generation, version: registration.version, submissionVersion, state: registration.state };
}
/** Every lifecycle mutation and publisher holds this same event lock; no absent-row race consumes a second place. */
export async function mutateRegistration(db: PrismaClient, token: string | undefined, eventId: string, operation: RegistrationOperationKind, value: unknown): Promise<RegistrationResult> {
  const input = formObject(value, "submission");
  const key = formId(input.idempotencyKey, "idempotencyKey");
  const payloadDigest = digest(input);
  return retryTransaction(() => studentTransaction(db, token, async (tx, actor) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM event WHERE id = ${eventId}::uuid FOR UPDATE`;
    if (!locked.length) throw new EventError(404, "Event unavailable.");
    const scoped = { actorId: actor, eventId, operation, key };
    // Replay precedes current lifecycle/form validation: an old successful operation never executes against a new generation.
    const replay = await tx.registrationOperation.findUnique({ where: { actorId_eventId_operation_key: scoped } });
    if (replay) {
      if (replay.payloadDigest !== payloadDigest) throw conflict();
      return replay.result as unknown as RegistrationResult;
    }
    const event = await tx.event.findUnique({ where: { id: eventId }, include: { currentPublication: true } });
    if (!event?.currentPublication || event.state === "DRAFT" || event.state === "CANCELLED") throw conflict();
    if (operation !== "CANCEL" && event.state !== "PUBLISHED") throw conflict();
    const snapshot = event.currentPublication.snapshot as unknown as PublicationContent;
    const form = parseRegistrationForm(snapshot.form);
    beforeStart(snapshot, await registrationClock(tx));
    let registration = await tx.registration.findUnique({ where: { studentId_eventId: { studentId: actor, eventId } } });
    let submissionVersion: number;
    if (operation === "JOIN") {
      if (input.expectedPublicationId !== event.currentPublicationId || input.expectedFormRevisionId !== form.formRevisionId) throw conflict();
      const request = parseJoinRequest(form, input);
      if (registration?.state === "ACTIVE") throw conflict();
      const active = await tx.registration.count({ where: { eventId, state: "ACTIVE" } });
      if (remainingCapacity(snapshot.fields.capacity!, active) === 0) throw new EventError(409, "This event is full. No place was reserved.");
      const generation = (registration?.generation ?? 0) + 1;
      const data = { state: "CANCELLED" as const, generation, version: (registration?.version ?? 0) + 1,
        currentSubmissionId: null, joinedPublicationId: event.currentPublication.id, joinedAt: await registrationClock(tx), cancelledAt: null };
      // Temporary CANCELLED state satisfies the immediate pointer constraint; the entire transaction remains invisible until commit.
      registration = registration ? await tx.registration.update({ where: { id: registration.id }, data }) :
        await tx.registration.create({ data: { id: randomUUID(), eventId, studentId: actor, ...data } });
      const submission = await tx.registrationSubmission.create({ data: { id: randomUUID(), registrationId: registration.id,
        generation, version: 1, publicationId: event.currentPublication.id, formRevisionId: form.formRevisionId,
        capturedForm: form as unknown as Prisma.InputJsonValue, profileName: request.name, profilePhone: request.phone, answers: request.answers } });
      registration = await tx.registration.update({ where: { id: registration.id }, data: { state: "ACTIVE", currentSubmissionId: submission.id } });
      submissionVersion = 1;
    } else {
      const allowed = ["idempotencyKey", "registrationId", "expectedGeneration", "expectedVersion", ...(operation === "CORRECT" ? ["expectedSubmissionVersion", "name", "phone", "answers", "sharingConfirmed"] : [])];
      formKeys(input, allowed, allowed, "submission");
      if (!registration || registration.id !== formId(input.registrationId) || registration.state !== "ACTIVE" ||
          registration.generation !== version(input.expectedGeneration) || registration.version !== version(input.expectedVersion)) throw conflict();
      const captured = await tx.registrationSubmission.findUnique({ where: { id: registration.currentSubmissionId! } });
      if (!captured || captured.registrationId !== registration.id || captured.generation !== registration.generation) throw new EventError(503, "Registration unavailable.");
      submissionVersion = captured.version;
      if (operation === "CANCEL") {
        registration = await tx.registration.update({ where: { id: registration.id }, data: { state: "CANCELLED", version: { increment: 1 }, cancelledAt: await registrationClock(tx) } });
      } else {
        if (captured.version !== version(input.expectedSubmissionVersion)) throw conflict();
        const capturedForm = parseRegistrationForm(captured.capturedForm);
        const submission = confirmedSubmission(capturedForm, { name: input.name, phone: input.phone, answers: input.answers, sharingConfirmed: input.sharingConfirmed });
        submissionVersion++;
        const saved = await tx.registrationSubmission.create({ data: { id: randomUUID(), registrationId: registration.id,
          generation: registration.generation, version: submissionVersion, publicationId: captured.publicationId, formRevisionId: captured.formRevisionId,
          capturedForm: capturedForm as unknown as Prisma.InputJsonValue, profileName: submission.name, profilePhone: submission.phone, answers: submission.answers } });
        registration = await tx.registration.update({ where: { id: registration.id }, data: { currentSubmissionId: saved.id, version: { increment: 1 } } });
      }
    }
    const committed = result(registration, submissionVersion);
    await tx.registrationOperation.create({ data: { ...scoped, payloadDigest, result: committed } });
    // Revalidation after all writes rolls back the place/submission/result together on expiry or cutoff.
    await authenticatedAccount(tx, actor, token);
    beforeStart(snapshot, await registrationClock(tx));
    return committed;
  }));
}

export async function mutateOwnRegistration(db: PrismaClient, token: string | undefined, registrationId: string, operation: "CANCEL" | "CORRECT", value: unknown) {
  const eventId = await studentTransaction(db, token, async (tx, actor) => {
    const registration = await tx.registration.findFirst({ where: { id: registrationId, studentId: actor }, select: { eventId: true } });
    if (!registration) throw new EventError(404, "Registration unavailable.");
    return registration.eventId;
  });
  const input = formObject(value, "submission");
  if (input.registrationId !== registrationId) throw new EventError(400, "Use the current registration reference.");
  return mutateRegistration(db, token, eventId, operation, input);
}

/** Retry only explicit database serialization/deadlock aborts, once, retaining the original operation key. */
async function retryTransaction<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      const failure = error as { code?: string; meta?: { code?: string } };
      if (attempt >= 1 || !(failure?.code === "P2034" || (failure?.code === "P2010" && ["40001", "40P01"].includes(failure.meta?.code ?? "")))) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}
