"use client";
import { StudentRegistrationForm, type SubmissionDraft } from "./registration-form";
import type { RegistrationFormRevision, AnswerMap } from "../../lib/registration-form";
import type { RegistrationActionResult } from "../../lib/registration-types";
export type CapturedSubmission = { id: string; version: number; form: RegistrationFormRevision; name: string | null; phone: string | null; answers: AnswerMap };
/** No profile lookup: corrections retain this event's captured form and explicitly submitted values. */
export function SubmissionEditor({ submission, onSubmit }: { submission: CapturedSubmission; onSubmit: (draft: SubmissionDraft) => Promise<RegistrationActionResult> }) {
  return <section className="card student-submission-editor"><h2>Correct your submission</h2><p>These are the questions captured when you registered. Saving creates a new submission version for this event only.</p>
    <StudentRegistrationForm key={submission.id} form={submission.form} mode="correction" initial={submission} onSubmit={onSubmit} /></section>;
}
