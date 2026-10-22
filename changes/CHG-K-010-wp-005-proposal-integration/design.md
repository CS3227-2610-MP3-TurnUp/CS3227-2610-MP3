# Integration design

## Reuse boundary

The new integration is based on master1f0aa87 rather than the old prototype base0c7d5ad. CHG-K-007 remains uncommitted and untouched in its original worktree. Port only reusable extraction/parser/validation/provider components and their meaningful tests; the developer-only UI/API, debug logging and evaluation CLI are not production application entrypoints. Existing EventFields, role/session/ownership checks and Save Draft/Preview/Publish stay authoritative.

## Data flow

Owner selects one local PDF → explicit Generate submits a bounded owner/event request → server validates session/origin/role/ownership/state/version → temporary parser → server-owned prompt/schema → bounded provider adapter and durable admission → strict partial-finding/evidence validator → delivery-time access/state/version check → private page-local findings → validated batch-prefill with inline evidence/correction → existing working fields → explicit Save Draft → exact Preview/Publish. No provider capability can save, approve or publish. No original/fulltext or private findings enter event persistence/publication.

Internal prototype finding IDs may remain purpose/feeStatus, with one explicit adapter to description/fee; identity/profile/roster data never enters the prompt. All nine required factual categories retain missing/conflicting/unprocessed states. Optional Other remains manual. Complete supported dates/times normalize to canonical UTC ISO and prefill existing SGT calendar controls without duplicate manual entry; strict calendar/offset validation rejects invalid or incomplete timestamps. A complete source date/time with omitted zone defaults to Singapore time under Keith’s explicit amendment; stated zones take precedence. Missing/ambiguous calendar/time components or ambiguous stated zones remain unresolved. Exact quotes remain required; no arbitrary Date.parse inference from partial natural language. Source/request/editor revisions and event version protect asynchronous output, including Cancel Editing invalidation. Manual edits clear matching source evidence.

## Runtime boundary

Initial integrated inference remains explicit local synthetic-only. Preview/Production processing stays disabled pending a later intended-host/provider-handling assignment. A successful local stub or prototype model experiment does not establish hosted feasibility. Shared durable provider gate and conservative uncertain-request lease behavior are reused; no gate reset or old allowance assumption is authorized here. Per-user admissions are implemented with a separate namespaced counter so account login/credential budgets do not change. Final scoped defaults/configuration are recorded from actual implementation.

## Acceptance limits

Page-local private preparation is an accepted first-slice limit, not a replacement of full WP-005/retention policy. Public drafting/FAQ suggestions remain ORG07 pending. Deterministic tests, component/browser observations, live inference and hosted checks are separate evidence.
