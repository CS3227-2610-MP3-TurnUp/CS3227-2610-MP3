# CHG-K-009 — Tasks and handoff

Source: 54024616eb2c5dd93dcdee458fd66b53c03354b2. Human owner: Keith. Primary agent is sole author of all paths below; reviewer is non-author /root/review_wp003 dispatched after source freeze. Log: logs/keith/13-wp-003-publication.md, entry 01.

- [x] Establish original Organiser-only scope, accepted G03/G05 choices and isolated branch.
- [x] Reconcile canonical bounds/timing and scoped acceptance targets.
- [x] Implement schema plus additive prisma/migrations/20261021000000_events/migration.sql; no historical migration changes/application.
- [x] Implement src/lib/event-fields.ts, src/server/events/{policy,service,http}.ts, src/server/publication/reader.ts and assigned src/app/api/organiser/events/** routes.
- [x] Implement src/components/events/**, src/app/organiser/page.tsx, src/app/organiser/events/** and src/app/globals.css, preserving shared account navigation.
- [x] Add tests/events/** and Vitest include, plus scoped SQL configuration/script if supplied. No account-policy/test edits except necessary shared integration.
- [x] Run tests/lint/typecheck/schema/build and local browser checks when available; record all limitations.
- [x] Obtain independent completed-change review, correct/disposition findings and recheck material fixes.
- [x] Complete verification, current-status/handoff links and owner log without claiming full consumer scenarios.

Allowed documentation: this change directory; specs/{decisions,README,implementation-plan,integration-handoffs}.md; specs/shared/domain-and-data-contracts.md; specs/organiser/event-management.md; specs/work-packages/wp-003-publication.md; specs/verification/acceptance-scenarios.md; docs/plans/wp-003-publication-plan.md; README.md; designated log. New product filenames may be expanded here sequentially before writing if required by implementation.

Handoff: implement against accounts/session.ts and accounts/service.ts identity/revalidation APIs. Lock account before session/event mutations to serialize with password revocation; check immutable Organiser role and owner on every operation. Shared publication revision includes an immutable empty form. WP-004 must supply registration relationships/capacity-floor enforcement and integration; WP-006 supplies chat invalidation/history. No Student UI ownership transfer.

## Completion boundary

Completed checkboxes describe locally delivered code, scoped checks and independent agent review, not hosted readiness or whole consumer scenarios. Actual outcomes/limitations are in verification.md. Exact changed paths are recorded there after final checks. New local SQL config/test remains opt-in and uses no hosted target. No commit/push/deployment.

## Approved layout/rescheduling amendment — 21 October 2026

Primary agent remains sole writer. Allow docs/ui-screen-patterns.md in addition to the prior output list, src/components/events/event-card.tsx and tests/events/card.test.ts under their assigned directories. Preserve the pre-existing generated next-env.d.ts modification and all unrelated work. Reuse the existing log with entry04 for this substantial prompt.

- [x] Record explicit nine-answer layout/behaviour choices and approved plan; reconcile current G05/presentation/scenarios without erasing history.
- [x] Implement separated modes, publication-based semantic cards, saved-change indication and future-start replacement rule.
- [x] Run focused/full/API/SQL/type/lint/build and scoped browser checks; record environment limits.
- [x] Independent non-author completed-change review and material-fix recheck.
- [x] Final evidence/log/handoff with remaining consumer/hosted limits; no commit/push/deployment.
