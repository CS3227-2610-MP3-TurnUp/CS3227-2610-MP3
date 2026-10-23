# CHG-D-007 — Tasks and file ownership

Sole implementation/evidence writer: main agent for Darryl. No subagents. Read authoritative contracts and full scenarios listed in approved plan at base `1f0aa87`; reuse same-revision context. Work only in the WP-004 branch; preserve original root and WP-006 trees.

- [x] Record Darryl approval and D007 allocation; preserve source and prior evidence.
- [x] Implement slice1 discovery/current details with server role/state/projection boundaries; no fabricated capacity/registration state.
- [x] Focused query/HTTP/rendering tests and disposable real-service SQL, then lint/typecheck/unit/schema/build and browser checks with limitations.
- [x] Main-agent completed-diff review; record actual findings/corrections/rechecks.
- [x] Record proposed shared-contract/schema handoff and exact outstanding producer/database gates.
- [ ] Implement slices2–6 only after their recorded shared-contract, producer and migration prerequisites arrive; not authorised to take Keith's scope.

Ready exact files: src/app/student/page.tsx; src/app/student/events/[eventId]/page.tsx; src/features/student/event-list.tsx; src/features/student/event-details.tsx; src/lib/registration-types.ts; src/server/registration/policy.ts; queries.ts; http.ts (same directory); src/app/api/student/events/route.ts; src/app/api/student/events/[eventId]/route.ts; tests/registration/policy.test.ts; queries.test.ts; routes.test.ts; components.test.ts; fixtures.ts; local-sql.integration.test.ts; vitest.database.config.ts (same tests directory); src/app/globals.css; vitest.config.ts. The approved plan enumerates later paths. package.json only if a scoped SQL script is needed. No new dependencies or lockfile edits.

Evidence writer owns this directory's change/tasks/verification, approved plan/log06 and affected Student/shared spec/handoff/scenario updates. Shared documents one writer, no concurrent agents. Keith retains prisma/schema.prisma, exact unallocated additive migration, src/server/events/policy.ts/service.ts and src/server/publication/reader.ts; no edits to those files here. Keith assigns his form/roster source and tests separately.

Required producer handoff: agreed bounds/version/profile/cutoff/rescheduling contract, real nonempty form approval/publish support, capacity floor using common event lock, source/spec revisions/imports/test evidence, additive migration path/writer and explicit synthetic target/check authority. Darryl returns logical data requirements and captured-answer projection; full publish→join→roster verification waits for actual consumer implementation.

Slice1 live remaining places/own registration state remain pending slice3. Slices2–6 are blocked by the named shared-contract/producer/schema/database handoff, not complete or silently delegated. Exact final results/limits and main-agent fixes are in verification.md. No new independent review was dispatched, in accordance with Darryl's explicit instruction.

Evidence-only scope check: main agent also updates specs/README.md and specs/implementation-plan.md to avoid stale all-unimplemented status after the delivered discovery slice. These add no product behaviour or source paths and require no repeated runtime review.

## Completion ready/blocked matrix — planv1.1, awaiting approval

This replaces the earlier all-slices blanket hold; retain checked discovery work and evidence.

| Slice | Ready after completion-plan approval | Specific remaining handoff |
| --- | --- | --- |
| A: shared candidate/types and Student form/profile/correction/My Events components/content flags | Main agent implements all pure/deterministic/component portions | Keith acceptance needed for cross-role live contract adoption, not candidate construction |
| B: registration schema/migration | Draft detailed data design now; code after exclusive writer/path assignment | Keith-coordinated slot/explicit writer; exact synthetic target and migration authority before applying |
| C: transactional Student services/endpoints | Pure policy/service tests after data contract; no wait for roster UI | Schema interface and publisher capacity safety before live activation; assigned real DB for concurrency |
| D: Student reads/pages/accurate counts/change flags | UI/state/query policy independently; wire progressively | Real registration persistence for accurate counts/own state and final walkthrough |
| E: nonempty form publisher/builder and roster integration | Student consumer fixtures/DTO handoff independently | Keith's actual producer/Organiser revisions for cross-role proof |

No new product code before the requested plan decision. No agent dispatch; main agent verifies. Recommend prioritising schema+capacity server handoff rather than waiting for the complete Organiser builder/roster. Exact source paths stay in v1.0/v1.1; prisma schema/new migration are conditional writes, never assumed assigned. No new change ID or owner log.

22October2026 explicit assignment update: Darryl approved planv1.1 and assigned main-agent authorship of prisma/schema.prisma, one new additive registration migration (exact collision-free path to be chosen after the shared-file window is established), and necessary src/server/events/policy.ts/service.ts publisher form/capacity integration. src/server/publication/reader.ts changes only if required by this shared contract. Keith's Organiser builder/roster UI/API remain outside scope. This is Darryl's assignment, not invented Keith agreement. Exclusive shared-file window and actual synthetic project/branch/database are not yet identified; no shared source or database write made at this checkpoint. Existing independent components remain ready. Previous D007 discovery/planning changes are authorised for commit; no push/deployment.

## Current execution matrix — approved completion v1.1, 22 October 2026

This section supersedes historical blanket holds above. Main agent is the only local writer in the existing isolated WP004 worktree, under Darryl's explicit assignment and subsequent continue instructions. No exclusive shared merge/Neon window or Keith agreement is invented.

| Slice | Current outcome | Remaining boundary |
| --- | --- | --- |
| A: versioned forms, typed answers, profile confirmation, captured correction and My Events components | Implemented; focused unit and synthetic component/browser evidence | Human/hosted UI acceptance remains separate |
| B: schema/additive migration | Implemented `prisma/migrations/20261022000000_registration/migration.sql`; fresh replay/upgrade locally verified | Shared Neon target/migration slot and applied migration evidence pending |
| C: atomic registration/cancel/rejoin/correction and protected endpoints | Implemented; actual PostgreSQL last-seat/duplicate/capacity/lifecycle/conflict/rollback/time/expiry/retry tests | Shared hosted execution remains unrun |
| D: live own state/counts, My Events/change flags and pages | Implemented against real store; SQL service integration verified | Full signed-in browser walkthrough on assigned configured shared target pending |
| E: saved form/preview/approval/publish and capacity safety | Necessary shared server/readonly preview implemented by assignment | Keith owns builder and owner-roster UI/API; actual builder→Student→roster integration pending |

Exact additional main-agent paths: `prisma/schema.prisma`; `prisma/migrations/20261022000000_registration/migration.sql`; `src/server/events/{policy,service,http}.ts`; relevant `tests/events/{policy,service}.test.ts`; `src/components/events/{editor,event-content}.tsx` only for exact readonly form preview; `src/features/student/registration-screen.tsx` composes the already allocated Student components/pages. The earlier plan's Student API/pages/lib/server/test paths remain the rest of the source manifest. `src/server/publication/reader.ts`, account sources, dependencies/lockfile, workflow, original checkout and WP006 are unchanged.

- [x] Author bounded form/submission contracts and safe private Student controls.
- [x] Author additive schema/migration, composite pointer/source guards and immutable submissions.
- [x] Integrate publisher saved forms, exact readonly preview/approval/digest, form-only saved-change state and locked capacity floor.
- [x] Implement atomic mutations, durable generation-safe replay and bounded serialization retry; final session/UTC database-clock checks.
- [x] Wire real Student discovery counts/state, registration, own captured correction and My Events/change indicators.
- [x] Run focused/unit/disposable SQL/real PostgreSQL checks and main-agent source review; preserve earlier independent producer review evidence.
- [ ] Apply migration/checks to explicitly confirmed shared Neon target and exclusive migration window.
- [ ] Signed-in full browser walkthrough on that actual configured target, and Keith's actual builder/roster cross-role handoff.
- [ ] G06 cleanup/key expiry operational implementation is separate; not claimed complete.

No new commit, push, deployment, SoCLaaS call or remote message. Previous requested checkpoint commit remains b1f6d92. Main-agent verification only.
