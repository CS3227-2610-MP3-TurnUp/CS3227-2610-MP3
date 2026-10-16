# Deployment, retention and development evidence

Owner: Keith for database migrations, retention infrastructure, deployment and release checks; reviewer: Darryl. Both humans decide unresolved retention policies and supply role evidence. See [ownership](../implementation-plan.md#human-ownership). B1 target; this scaffold creates no hosted runtime or passing application checks.

| ID | Observable requirement |
| --- | --- |
| DEP01 | Run Next.js/TypeScript frontend/server and durable data online over HTTPS on Vercel Hobby; second-device workflows need no developer laptop. Persistent records survive requests/redeployments. |
| DEP02 | Isolate development/test and production configuration/credentials/data; enforce retention/deletion across stores and derived copies. Development agents cannot access production private data. |
| DEP03 | Team-managed releases have required checks, migrations and recovery/rollback instructions with actual evidence; failed required checks block release. Automation design G08. |
| DEP04 | Verify server-side SoC LLM integration for both AI workflows from intended hosting: access, credentials, limits, truthful failure. Confirm course-specific provider rules from authoritative material before claiming compliance. |
| DEV01 | Team Markdown/Git SDD without installing/running OpenSpec: requirements/scenarios precede implementation; scoped changes link affected IDs, tasks, code and actual checks. |
| DEV02 | Use specialised specification/implementation/independent review agents; retain instructions, input versions, handoffs, changes, findings, actual output and human decisions. Include harmless development-time injection verification. |
| DEV03 | Preserve contribution/reflection evidence: role/shared human ownership, decisions, failures/fixes/checks/limitations, quantified reuse where applicable. |

Vercel function storage is not the durable application store. Originals/fulltext are transient by product decision; users/events/forms/registrations/messages need an external persistent database. PostgreSQL/Neon and Prisma are suggestions, not selected versions or guaranteed free allowances. Validate current provider eligibility/resources/costs (G04/G08); free hosting does not imply all dependencies are free. Do not invent cron/provider capabilities or working deploy commands.

## Retention targets

| Data | Accepted target | Open operational detail |
| --- | --- | --- |
| Original PDF/full extracted text | Processing only; no application persistence | All-exit cleanup, provider handling G04 |
| Inactive private preparation/saved drafts | 30 days inactivity, advance notice | Inactivity/notice lead time, derivatives G06 |
| Registration details/historical submissions/private threads/messages | Delete/anonymise 90 days after completion/cancellation | Completion reference, integrity, account deletion G06 |
| Minimal audits | 90 days; exclude raw private content | Copies/expiry evidence G06 |
| Optional Student profile | Until Student removes/account deletion | Historical identity relationship G06 |

Do not delete live publications with inactive draft cleanup or retain personal history indefinitely merely because versions are immutable. Define derived/cached/backup expiry and deletion/anonymisation relationships; do not claim erasure while recoverable backups remain under policy. See [G06/G07](../decisions.md).

Verification: T15/26/28. Actual hosted walkthrough, deterministic suite and bounded live-model evaluation are release evidence; scaffold checks validate documents only.
