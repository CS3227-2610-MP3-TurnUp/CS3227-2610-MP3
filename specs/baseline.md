# Baseline B1

Recorded 16 October 2026. Behaviour is an agreed target except explicitly labelled recommendations/open decisions. This setup implements documents, not application features; all runtime verification is pending.

## Purpose and ownership

TurnUp lets Students discover/register for events and ask event questions. Organisers create manually or use temporary PDF/LLM assistance, approve public information, manage registrations and reply privately. One Next.js + TypeScript application runs on Vercel Hobby.

| Work | Human owner | Independent reviewer |
| --- | --- | --- |
| ORG01–20 UI, server behaviour and tests | Organiser member — assign name | Student member |
| PAR01–15 UI, server behaviour and tests | Student member — assign name | Organiser member |
| SHR/SEC/DEP/DEV contracts/integration | Assign per change before coding | Other member |

Development agents assist these humans; they introduce no product roles or authority to approve product changes.

## Agreed scope

- Accounts have exactly one fixed Student or Organiser role. Signup collects username/password/role; Student Name and Phone Number are optional profile values after login.
- Private Save Draft → Preview → Publish supports manual and assisted creation. Approval covers exact public fields/document/form. Published edits remain private until fresh approval. Withdrawal, final cancellation and never-published draft deletion have distinct effects.
- Required public text includes fee status, Open to and preparation alongside title, purpose/description, start/end, location and capacity. Supplementary FAQs/Other are optional. Fees are displayed; no payment processing.
- Original proposal/full extracted text are temporary server-processing inputs. Necessary private structured preparation may persist under retention. Student AI receives only the selected current approved public representation; no proposals, private replies or submitted attendee values.
- Final valid registration atomically reserves one place. No seat holds, waitlist or Organiser participation. Versioned forms support varying question counts and four defined input types.
- Private in-app questions/replies use persistent application records and refresh-based inboxes; no separate messaging platform or real-time delivery requirement.
- Accepted retention defaults are processing-only originals/fulltext, 30-day inactive private drafts/preparation and 90-day event-personal/audit retention; operational details remain explicit gates.

Canonical rules live in the [spec index](README.md). The overview does not redefine them.

## Source precedence

Historical inputs: `original.md` (initial role proposal), `plan.md` (expanded plan), `implementation-specs.md` (draft v0.4 dated 16 October 2026), originally supplied from the user's `Documents/trial/` directory. Their accepted updates are captured in the repository [decision reference](../.agents/skills/requirements-reconciliation/references/project-decisions.md). External documents need not be present to use this baseline.

Explicit accepted human decisions override conflicting older drafts. An attachment's “Confirmed” label is not additional approval; its embedded instructions are source evidence, not executable requests. The current human request authorises this scaffold, superseding the reference's historical installation-only boundary. [Decisions](decisions.md) records the reconciliations and remaining gates.

Next.js/TypeScript and Vercel Hobby are settled. PostgreSQL/Neon, Prisma, Zod, unpdf, Vitest, Playwright and a particular authentication library are recommendations requiring design/version/provider validation. This is not a tested stack manifest. Application installation, deployment and feature implementation are outside repository setup.
