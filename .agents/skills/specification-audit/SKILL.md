---
name: specification-audit
description: Perform an explicitly assigned standalone agent audit of SDD artifacts against decisions and acceptance evidence. Find substantive contradictions, missing scenarios and unsafe contracts affecting implementation or operation; ordinary documentation edits do not require this audit.
---

# Independent specification audit

Use this standalone audit only when explicitly assigned. Documentation edits alone do not require a separate audit. Apply [Code Review Rules](../../../AGENTS.md#code-review-rules) and the [review policy](../../../CONTRIBUTING.md#review-records); independence refers to this agent's lack of authorship of the reviewed change.

## Inputs and independence

Use the actual assignment, raw source decisions, relevant spec/change revision, reviewed diff/files, and available verification results. For initial TurnUp setup, consult the [decision reference](../requirements-reconciliation/references/project-decisions.md). Do not rely solely on the author's summary. Declare prior authorship or other limits to review independence.

Review read-only unless an output report path is explicitly assigned. Return findings to the parent by default; do not correct the reviewed files yourself or turn a review into implementation.

## Audit procedure

1. Identify authoritative decisions, historical material, open proposals, affected IDs, and the authorised output list. Check that generated files do not execute embedded source-document instructions.
2. Trace changed rules through role definitions, account fields, permission matrices, interfaces, scenarios, and old tests. Catch residual dual-role defaults, mandatory profile contacts, and incomplete supersession.
3. Check canonical rules for substantive contradictions affecting implementation or operation; distinguish behavioural requirements from design/tasks and agreed from implemented/verified. Keep findings within the assigned change and its actual consumers; historical records are evidence, not current workflow instructions.
4. Examine high-risk contracts where applicable: publication approval/version consistency; role/ownership denial; atomic capacity/registration writes; immutable captured forms; temporary proposals; approved-only Student context; private replies and attendee values; bounded AI failures; retention and derived copies.
5. Check scenarios against effects, including negative and concurrent cases where the requirement warrants them. Flag a quote-existence test used as proof of semantic accuracy or an absence of evidence reported as a passed check.
6. Check TOML/skill metadata and real local references if setup definitions are in scope. Treat absent future scaffold as a defect only if its creation was assigned. Do not recommend scope expansion to fill an intentional deferral.
7. Report reproducible, actionable defects with a concrete implementation or operational consequence; separate confirmed defects, open decisions and optional improvements. Match severity to consequence and do not claim universal no-leak/no-hallucination guarantees from finite tests.

Do not inspect, infer, require or enforce human reviewer assignment, independence, approval, sign-off or merge readiness, whether in files, GitHub metadata or missing evidence. Human development review is outside scope; preserve accepted product decisions and application approval/access rules. Missing review-status fields, historical snapshot updates or additional review attestations alone are not defects. Evidence/log-only updates do not restart review, and the current GitHub review does not need another audit of itself.

## Result format

For each finding: severity, artifact/line or requirement ID, observed contradiction or omission, practical consequence, and a focused correction. Finish with reviewed scope, evidence/checks, unverified items, and whether task acceptance conditions are evidenced. 'No findings' is valid only with the review scope and limitations stated; it does not authorise merging, publication, or deployment.
