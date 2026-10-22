# WP-006 publication prerequisite integration plan v1

Status: APPROVED by Darryl on22October2026; implementation authorised within this scope. Prepared22October2026. Darryl owns Student integration; main agent is sole writer. No new change ID allocated: this is the next bounded D006 publication-prerequisite plan, not an implemented extension. Log07 entry19. User expressly prohibits spawning/reusing subagents, provider calls, allowance changes, commits, pushes and deployment.

## Verified source and preserved state

Producer: Keith WP003 merged commit1f0aa8773799f44229638cb473ff5584b3d3fb63 (local master). Consumer: existing codex/wp-006-student-ai-components worktree at6d5d250, including389fca0. Base5402461. Both commits and source files must survive. Worktree has only local AGENTS.md/next-env.d.ts modifications; original checkout additionally has local customisations and untracked WP004 plans/logs. Never reset, overwrite, copy or stage these.

Read currentPublication, event policy/service/http, public fields, SQL migration, reader checks and final K009 verification at producer revision. Reuse existing D005/D006 evidence; no application tests rerun for this read-only plan. Current worktree lacks WP003 schema/reader/migration; merge compatibility is untested until implementation. Read shared accounts/AI/domain/lifecycle contracts and complete T06/T07/T09/T13/T14/T18/T27/T31 targets; only stated portions will be exercised. SHR02/04/05/07/08,PAR06/07/11/12,SEC01/02/03/06 apply. WP004/discovery/registration,messaging and real answering remain excluded.

## Producer interface and actual gaps

src/server/publication/reader.ts currentPublication(db,sessionToken,eventId) resolves authoritative session through requireSelf, rejects non-STUDENT403, selects only state PUBLISHED and currentPublication, returns eventId,eventVersion,organiser username and publication{id,revision,snapshot,digest}. A404 is generic for absent/draft/withdrawn/cancelled/no-publication. This is an internal reader, not a Student API. Caller validates UUID; consumers must recheck source before delivery. Query joins are protected by composite event/publication FK in migration; snapshot fields are JSON requiring consumer runtime validation.

Snapshot: {fields:EventFields,form:{formRevisionId,questions:[]}}. Current immutable publications replace pointers; saves/discards increment event.version but do NOT change the published source. Publication revision numbers can skip and are NOT event.version. A new publication ID/revision/digest changes source identity; private draft/preview/version changes must not. Withdraw/cancel keep pointer and historical publication; state filtering is essential even when digest unchanged. Republish creates new publication. Do not use organiser readEvent (private draft) or listEvents.

Gaps and recommended bounded dispositions, subject to approval:

1. G05 post-start/past-event Student FAQ access is explicitly unresolved in K009 contracts. This DEVELOPMENT inspection slice handles future-start publications only; started/past returns a distinct timing-policy-pending result, not withdrawn/cancelled. Does not settle shared G05 or ship production policy. Extending to started events needs affected human decision.
2. Reader deliberately hides unavailable-state distinctions. Preserve generic unavailable for all404 outcomes; clear content/evidence and disable questions, without leaking private existence or inventing withdrawn-vs-cancelled reason. Detailed lifecycle reason needs a future producer-approved contract. Local tests exercise both transitions despite generic public output.
3. WP003 permits20000code points/48000UTF8bytes of authored public text; D005 source limit is32768serialized bytes. Preserve limits, never truncate/omit fields. Fully project then reject oversized source with a dedicated source-too-large status. Full support for every allowed WP003 publication is a separate bounds/provider-envelope decision. No allowance/input-cap change in this slice.
4. Reader authenticates before query; consumer must call it again at final delivery boundary, also revalidating session. No held DB transaction/lock across asynchronous work or browser lifetime. Compare publication identity/state at final read; that read is the linearisation point. Network delivery cannot retract previously received bytes or guarantee no subsequent state change. No promise of instantaneous remote invalidation; reload/refocus/explicit refresh triggers a fresh check. G07 persistent historic-message suppression stays unresolved; this slice has no persistent chat history.
5. Zero-question form is the only delivered schema. Accept exact known empty-form contract; nonempty/unrecognised form/schema fails explicitly, not silently omitted from context. Configurable forms/public-document extensions require producer handoff later.
6. No claimed real database readiness: WP006 private env presently contains only six SOCLAAS settings. No DB/auth settings copied automatically. Disposable synthetic SQL tests need no external target. Interactive authenticated use needs separately assigned isolated DB/auth configuration and migration evidence.

## Proposed implementation sequence after approval

1. Integrate exact1f0aa87 using a noncommitting merge in existing WP006 worktree, preserving two feature commits and all local files. No rebase/reset/cherry-pick replacement. Resolve only shared overlap; retain both event and student-assistant Vitest includes and explicit events integration exclusion. Combine both UI-pattern/handoff/acceptance additions. Merge remains uncommitted because commits are not authorised; report state. Do not migrate a hosted DB.
2. New server consumer adapter calls currentPublication, runtime-validates approved snapshot/empty form and digest using producer canonical digest function, constructs immutable public-only source. Stable section IDs:description,schedule,location,fee,openTo,preparation,other,capacity; title is source.title. Include all nonempty approved text; represent UTC schedule deterministically with explicit timezone labels and advertised capacity as published capacity (never remaining seats). Omit organiser username/owner IDs,forms containing no public questions,draft/approval metadata and all private data from answer context. Form revision retained only server-side for identity bookkeeping if needed. No sanitisation that changes quoted text; validate complete serialized projection. Oversize/error has no source payload.
3. Revision identity = publication UUID + numeric publication.revision + digest (bounded string <=128code points), not event.version. Retain eventVersion only for diagnostics,never invalidation. Server load returns an opaque binding and validated source. Final-delivery helper rereads/re-authenticates and compares binding before returning any candidate/source; wrong event/revision/digest or unavailable source discards result. Use an injected/mock completion only in tests; do not expose any route that returns mock answers as genuine or connect this helper to live provider.
4. Add authenticated DEVELOPMENT-only source GET at /api/dev/student-assistant/publication/[eventId]. Existing pinned loopback guard runs before DB/auth; production/Vercel404. Parse actual session cookie through authConfig/presentedToken and enforce STUDENT on every API read,not just page. Reject UUID/query overrides; optional expectedRevision is comparison only,never a source selector. Return no-store fixed status codes for401/403/404/409changed/413too-large/503dependency failure; started-event policy-pending is explicit409. Never return raw snapshots/errors/config/tokens. Error DTO contains no old or current source text. Source is reread at delivery; no provider/admission imports.
5. Add a separate authenticated development source-inspection page /dev/student-assistant/publication/[eventId] with real-publication label,explicit refresh and refresh-on-refocus. It displays only fresh source/status,retains safe question draft if reused but clears transcript/excerpts on revision/error/unavailability or logout. No provider or simulation answer dispatch from this page; composer disabled with clear source-inspection-only status. Existing synthetic/live harness remains separate and unchanged. Reuse widget via a defaulted canAsk prop only if useful; no discovery list/event navigation work. Client generation/abort guard discards late loads across event/revision changes and checks on refocus/open/explicit refresh. Cannot detect external withdrawal between requests; do not imply push updates.

## Exact files and ownership

Main is sole writer; Keith owns producer contract/schema. Import producer files via merge unchanged; no new migration or producer reader edit proposed.

Integration conflicts to reconcile: vitest.config.ts,docs/ui-screen-patterns.md,specs/integration-handoffs.md,specs/verification/acceptance-scenarios.md. Other WP003 files arrive at exact merged revision,including prisma/schema.prisma and prisma/migrations/20261021000000_events/migration.sql. Preserve current AGENTS/next-env/local-only setup.

New Student paths:
- src/server/student-assistant/publication-source.ts — approved snapshot projection,digest/size/schema checks and stable binding.
- src/server/student-assistant/publication-lifecycle.ts — session-aware initial/final source checks; no provider imports.
- src/server/student-assistant/publication-http.ts — guarded authenticated source-only response/status adapter.
- src/app/api/dev/student-assistant/publication/[eventId]/route.ts — thin GET route.
- src/app/dev/student-assistant/publication/[eventId]/page.tsx — authenticated dev inspection entry.
- src/features/student-assistant/publication-preview.tsx — real-source-only inspection,refresh/abort/focus handling; no inference/simulation fallback.
- src/features/student-assistant/publication-transport.ts — cookie-authenticated source GET,strict result validation,no-store.
- tests/student-assistant/publication-source.test.ts
- tests/student-assistant/publication-lifecycle.test.ts
- tests/student-assistant/publication-route.test.ts
- tests/student-assistant/publication-preview.test.ts
- tests/student-assistant/publication-sql.integration.test.ts and publication-sql.config.ts — opt-in disposable PGlite integration,not ordinary test discovery or hosted target.

Existing files only if needed: src/features/student-assistant/types.ts,state.ts,chat-panel.tsx (generic source-check failure clears evidence without false withdrawal; defaulted canAsk for disabled source-inspection composer),tests/student-assistant/state.test.ts,rendering.test.ts. UI CSS changes only if source-status display cannot reuse existing tokens.

Records: this plan; D006change.md/tasks.md/verification.md/delivery.md;log07;scoped specs/student/faq-and-private-questions.md,specs/work-packages/wp-006-faq-and-inbox.md,integration-handoffs.md,acceptance-scenarios.md. New contract rows are proposals until approval; no new ID allocation,course/provider policy or G05/G07 resolution implied.

## Migration/configuration prerequisites

Prerequisite chain in order:20261018000000_foundation_probe;20261019000000_soc_probe_gate;20261020000000_accounts;20261020010000_account_settings;20261021000000_events. Existing migration files stay immutable. Regenerate Prisma client after integrating schema. No new table/schema migration needed for a read-only consumer.

Keith's local evidence includes disposable single-connection PGlite with actual SQL/service/lifecycle checks (7/7 latest) and final251deterministic checks/type/build,not Neon deployment/concurrency. This plan does not rerun them. For this slice,extend disposable SQL coverage for authenticated Student source loads,replacement,private draft,withdraw/cancel and canonical digest after JSONB key reorder. Reuse locked transitive PGlite test pattern; explicit opt-in,temp in-memory engine,loopback0 port,no .env URL,no credentials,no provisioned database,no migration against existing targets. If unavailable report SQL check unrun;do not substitute mocked concurrency evidence.

Before interactive real-event walkthrough, an explicitly assigned synthetic nonproduction target must have all five migrations applied/verified by its authorised owner,plus worktree-local DB/auth settings. Need AUTH_ORIGIN for localhost3001,AUTH_SOURCE_MODE=local,development environment labels and private AUTH_THROTTLE_SECRET;DB pooled/direct URLs configured only as required by the existing DB tools. No copying unrelated credentials from original checkout under current authorisation;do not paste secrets. This prerequisite does not block deterministic/disposable-SQL implementation.

## Proportionate acceptance and commands after approval

- SHR02/04/05/PAR06:anonymous/expired/revoked session401,Organiser403,Student source success without registration;API independently enforces session;never client actor/owner/source overrides.
- SHR07/08/PAR07/11/T06/T09 portions:only current immutable approved snapshot;private draft saves/preview leave binding unchanged;republish/replacement change binding even for same text;eventVersion change alone does not. Final recheck rejects stale result,current-source swap and wrong-event response.
- T07/T27 portions:withdraw and cancel before load/while mocked answer pending/final recheck deny;no old source/quotes in error response/UI;republish invalidates old binding;404does not disclose lifecycle reason. No persistent history/G07 or live semantic claim.
- SEC01/02/06/T13/T18 portions:canary draft/proposal/profile/roster/private reply absent in selected query/projection/errors/context;malicious public strings inert;no tools,network provider,admission or allowance access. Wrong digest,unknown snapshot/form,missing publication relation and oversize full projection deny without truncation.
- PAR12/T14/T31 portions:DB/config/dependency errors distinct from unpublished/withdrawn;preserve safe draft but remove unverified excerpts;source loading abort/order/refocus/logout guards;no automatic retries/simulation fallback.
- Run new/affected Student tests with --maxWorkers1 plus affected producer reader/service/policy tests after integration. Exact commands from merged Vitest config;exclude integration file from ordinary include.
- Run dedicated opt-in disposable publication SQL config;no external env URLs. No live provider tests. Run focused eslint and TypeScript/Prisma generation. Build/production-denial check only because new routes/page introduce production boundary;not full unrelated suites. Browser source-only check if browser available;otherwise explicitly record blocked visual check and SSR coverage.
- Preserve earlier reviews as historical. New work main-agent verified only by explicit user override;never call self-review independent. Record outcomes/limits/log validation before handoff.

## Approval requested

Approve this source-only development prerequisite plan,including generic unavailable handling,future-start-only inspection whileG05remains open,and explicit oversize refusal without raising limits. This authorises later uncommitted prerequisite merge and bounded implementation/checks,not provider calls,allowance edits,external DB migration,commits,push or deployment. If full post-start or all48000byte-publication support is required now,resolve those specific product/bounds choices first.

## Implementation disposition -22October2026

Approved scope implemented;source/SQL evidence in D006verification entry20. Three actual merge conflicts resolved by retaining both sides;UI-pattern merge automatic. No new state.ts/type event was necessary:source-inspection reducer clears old source/history on check/failure,leaving existing synthetic reducer unchanged. Added publication-fixture.ts for shared synthetic records;the controller for cancellation/ordering is exported from publication-transport.ts and consumed by preview. Source IDs canonicalise accepted UUID case. Source and prompt/admission settings unchanged. Interactive DB/auth configuration and migration validation remain pending;no external database work performed.
