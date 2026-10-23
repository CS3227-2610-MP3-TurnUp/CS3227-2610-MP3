import "server-only";
import { parseProfile, AccountError } from "../accounts/policy";
import { FormValidationError, formId, formKeys, formObject, validateAnswers, type AnswerMap, type RegistrationFormRevision } from "../../lib/registration-form";

export type ConfirmedSubmission = { name: string; phone: string; answers: AnswerMap; sharingConfirmed: true };
export type JoinRequest = ConfirmedSubmission & { expectedPublicationId: string; expectedFormRevisionId: string; idempotencyKey: string };
/** Validate explicit event values, never re-read or update the Student's current profile. */
export function confirmedSubmission(form: RegistrationFormRevision, value: unknown): ConfirmedSubmission {
  const input = formObject(value, "submission");
  formKeys(input, ["name", "phone", "answers", "sharingConfirmed"], ["name", "phone", "answers", "sharingConfirmed"], "submission");
  if (input.sharingConfirmed !== true) throw new FormValidationError({ sharingConfirmed: "Confirm sharing these details with the organizer." });
  let profile;
  try { profile = parseProfile({ name: input.name, phone: null, expectedProfileVersion: 0 }); }
  catch (error) {
    if (!(error instanceof AccountError)) throw error;
    throw new FormValidationError({ [error.field ?? "submission"]: error.message });
  }
  if (!profile.name) throw new FormValidationError({ name: "Enter your name." });
  if (typeof input.phone !== "string") throw new FormValidationError({ phone: "Enter a phone number or Telegram handle." });
  const contact = input.phone.normalize("NFC").trim();
  if (!contact) throw new FormValidationError({ phone: "Enter a phone number or Telegram handle." });
  let phone: string;
  if (/^@[A-Za-z0-9_]{5,32}$/.test(contact)) phone = contact;
  else {
    try { phone = parseProfile({ name: null, phone: contact, expectedProfileVersion: 0 }).phone!; }
    catch (error) {
      if (!(error instanceof AccountError)) throw error;
      throw new FormValidationError({ phone: "Use a 7–15 digit phone number or an @Telegram handle." });
    }
  }
  return { name: profile.name, phone, answers: validateAnswers(form, input.answers), sharingConfirmed: true };
}
export function parseJoinRequest(form: RegistrationFormRevision, value: unknown): JoinRequest {
  const input = formObject(value, "submission");
  formKeys(input, ["expectedPublicationId", "expectedFormRevisionId", "idempotencyKey", "name", "phone", "answers", "sharingConfirmed"],
    ["expectedPublicationId", "expectedFormRevisionId", "idempotencyKey", "name", "phone", "answers", "sharingConfirmed"], "submission");
  const expectedPublicationId = formId(input.expectedPublicationId, "publication");
  const expectedFormRevisionId = formId(input.expectedFormRevisionId, "form");
  const idempotencyKey = formId(input.idempotencyKey, "idempotencyKey");
  if (expectedFormRevisionId !== form.formRevisionId) throw new FormValidationError({ form: "This registration form changed. Review the current form." });
  return { expectedPublicationId, expectedFormRevisionId, idempotencyKey,
    ...confirmedSubmission(form, { name: input.name, phone: input.phone, answers: input.answers, sharingConfirmed: input.sharingConfirmed }) };
}
