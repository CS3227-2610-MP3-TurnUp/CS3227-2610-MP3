# Tasks and ownership

Orchestrator owns this change directory, scoped specs/decisions/scenarios/guide and increment log14. No application authorship.

Backend application_foundation_engineer owns prisma/schema.prisma and one additive migration; new shared clarification types/policy under src/features/proposal-assistance/clarification.ts; src/server/proposal-assistance/{clarification,http,access}.ts and related server files as necessary; src/server/events/{service,http,policy}.ts; backend tests under tests/proposal-assistance and tests/events excluding component/editor-prefill/new UI tests. Own generated Prisma client generation, no manifest/dependency edits. Publish exact shared types/API handshake to UI before dependent edits. Run bounded local checks without private env/model/database calls; sanitized build after UI handoff.

UI application_foundation_engineer owns src/components/events/{editor,proposal-assistance}.tsx, src/app/globals.css, src/features/proposal-assistance/event-prefill.ts and its tests, tests/proposal-assistance/{component,editor-prefill}.test.tsx plus UI-only new test file. Shared clarification.ts belongs backend. Respect contract handoff, no backend/schema/config/generated/doc edits.

Independent implementation_verifier reviews completed implementation and reproduces proportional checks; no implementation authorship. Report evidence to orchestrator; no concurrent verification.md writes.

- [x] Establish shared API/revision contract and canonical behaviour.
- [x] Implement server preparation/resolution persistence and atomic guards.
- [x] Implement inline UI and explicit Save Draft flow.
- [x] Verify tests/type/lint/schema/isolated build and migration shape; independently review and fix/recheck.
- [x] Record final evidence, limits and changed paths. No live/hosted claim from doubles.


Shared handoff: backend owns clarification.ts with EventPreparation {revision,issues}, ProposalField→EventFields mapping/fixed copy, issues with bounded alternatives/short evidence and nullable resolution carrying value/method/attribution/time; retained confirmedValue protects organiser values after reopening. GET event returns preparation|null. Accepted extraction requires expectedPreparationRevision and returns authoritative eventVersion/preparation plus existing extraction/revisions. Save Draft sends expectedPreparationRevision plus resolution intents, with no client-authored issue/status data accepted; omitted intents never imply resolution. Nullable JSON+revision columns on Event provide additive storage. Local preparation changes ratchet event.version and invalidate approvals. UI and backend agreed this contract before dependent wiring.


Completion: implementation and proportional deterministic/schema/build checks passed; independent defects were fixed and rechecked. Parent separately verified the assigned synthetic non-production target, applied the additive migration and passed rollback-only JSONB/default/revision/delete checks. No model/gate call or production deployment. Native-browser and independent disposable SQL-replay limits remain explicit in verification.


## Handoff and local delivery — 23 October 2026

Reconcile implementation handoff, package/current-status documentation, local migration/client-restart instructions and log14 entry14 against the delivered source and verification. Reuse the independent19-file reviewed snapshot; evidence-only updates require no new implementation review. Commit the coherent K-011 implementation/tests/docs with explicit paths, excluding pre-existing generated next-env.d.ts and all ignored private/local usage files. No push, application changes, expensive reruns or next-increment plan.
