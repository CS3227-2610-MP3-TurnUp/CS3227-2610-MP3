# CHG-K-009 — Manual event preparation and publication

Status: locally implemented and independently reviewed; hosted migration and consumer integration remain pending. Human owner and allocating coordinator: Keith. Source/spec revision: `54024616eb2c5dd93dcdee458fd66b53c03354b2`, B1/D12. Branch/worktree: `wp-003-publication` / `.worktrees/wp-003-publication`.

## Intent and assignment

Keith requested implementation of the original WP-003 scope on 21 October 2026, preserving Organiser ownership and deferring Student discovery/details, all registration and AI features. Keith subsequently explicitly accepted the event bounds and the scoped timing rules in this conversation. No Darryl agreement to deferred cross-role timing policies is inferred. The primary agent writes all assigned files sequentially; a non-author agent reviews the completed implementation under AGENTS.md.

Read specs/README.md task reading map, baseline, implementation plan, full integration handoffs, decisions G03/G05/G07/G08, shared accounts/privacy/domain/deployment contracts, Organiser event management and forms/publication contracts, and complete T02/T05–07/T22–25/T29. UI follows docs/ui-guidelines.md and the Organiser workspace screen pattern. Historical K-006 and D-002/003 evidence establish provenance and account dependencies, not event runtime success.

## Scope

ORG01/02/08–13/18; SHR05–08; SEC01–03/06. Own-event dashboard/search/sort; incomplete manual drafts; public-only preview and exact approval; immutable publication/empty form; private replacements; withdrawal, republish, final cancellation and never-published deletion; Cancel Editing and distinct saved-draft discard.

Exclusions: Student pages/public APIs, Join/Cancel/Rejoin, configurable forms, submissions/roster/My Events, PDF/AI, retention jobs, deployment and remote Git writes. Registration/chat-dependent portions of scenarios remain consumer checks, not passed by WP-003. No new dependencies.

Dependencies: full integrated WP-002 at source HEAD; additive schema/migration handoff coordinated by Keith. Migration application/live SQL require an explicitly assigned synthetic non-production target; none is assigned by this prompt. Production data and credentials remain outside scope.

## Acceptance and decisions

Canonical bounds/timing are in specs/shared/domain-and-data-contracts.md. G03 form/answer bounds, Student discovery and registration timing, G07 history and G06 retention remain open. Implementation must fail closed on role/ownership/session/state/version checks; never publish newer/unreviewed content or expose private data. Manual publication makes zero AI calls.

Planned PR increment: WP-003 original publication scope; designated log logs/keith/13-wp-003-publication.md. The original implementation assignment did not authorise commit/push/deployment; subsequent delivery authorisation is recorded in log entry 05. Decision-to-issue reconciliation: identify affected existing issues read-only; remote issue updates remain outside this implementation assignment. Record URLs/pending owner actions in verification.

## Layout/rescheduling amendment — 21 October 2026

Keith explicitly approved the follow-up plan after nine layout/behaviour answers, then requested implementation. The new scoped G05 rule supersedes the prior blanket no-earlier-start choice. Primary agent owns the amended source/tests/specs/screen-patterns/plan and increment log; independent verifier reviews the completed change. No new migration/dependency/endpoint or Student/registration scope. Details in canonical contracts and amendment tasks; new results appended to verification rather than reusing prior source hashes.
