# CHG-K-006 — Verify and hand off the application foundation

Status: database foundation handoff delivered; provider portion remains blocked by G04 evidence. Independent outcomes, actual checks and cleanup are in [verification.md](verification.md).

## Intent and source

Keith requested a review and next-increment plan on 20 October 2026, selected completion of the foundation handoff, then instructed implementation of that plan. CHG-K-006 was explicitly supplied by Keith for this session and its descendants. Source revision: `05e1b42c69ce57d389172a5b0c290d08ff0c729e`, B1/D12/D13, consuming CHG-K-004 and CHG-K-005. The source already includes the three merged Vercel corrections and a successful Production workflow; this change does not claim to have performed that deployment.

Human owner: Keith. Increment: branch `6-foundation-handoff`, isolated worktree `.worktrees/foundation-handoff`; designated log [11-foundation-handoff.md](../../logs/keith/11-foundation-handoff.md). The increment is published as [PR #22](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/pull/22) into `master`. Existing modified logs in the main checkout belong to earlier increments and are preserved. Related overviews: [foundation #4](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/4), [hosting #6](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/6), and [accounts #7](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/7).

## Scope and ownership

Keith’s follow-up also assigns `.gitignore` for generated/local-file exclusions. The same two ignore rules are mirrored in the main checkout so its existing pnpm cache stops appearing immediately; unrelated main-checkout logs are preserved.

The primary agent is the sole writer for this change directory, `docs/wp-001-foundation-handoff.md`, current-status edits in `README.md`, `docs/wp-001-hosting-setup.md`, `specs/README.md`, `specs/implementation-plan.md`, `specs/integration-handoffs.md`, `specs/decisions.md`, `specs/shared/deployment-and-retention.md`, `specs/work-packages/wp-001-foundation.md`, and the designated Keith log. No concurrent document writer is assigned. Application code, migrations, dependencies, workflows and agent instructions remain at the reviewed prerequisite unless a concrete defect requires a separately recorded path assignment and independent implementation review. Documentation/evidence-only edits do not require a standalone specification audit.

Required reading: the task reading map and baseline; implementation plan and complete integration handoffs; WP-001; G04/G08; Accounts/access, AI/privacy, Deployment/retention; complete T13/T14/T15/T28 and coverage/evaluation guidance; CHG-K-004/005 change/tasks/verification and the selected CHG-K-002 design. The historical decision reference and Keith logs supply provenance, not new execution authority.

Requirements: DEP01–04, SEC05–06, DEV01–03. Acceptance coverage is limited to foundation portions of T13/T14/T15/T28. Two outputs are distinct:

- Foundation → Darryl's accounts work: pinned setup, isolated configuration, actual pooled/direct/shadow compatibility, fresh replay and upgrade, database integration, hosted persistence/redeploy and recovery evidence.
- Provider → later AI consumers: permitted-model and numeric-limit decisions, intended-host synthetic SoC result, admission denial and probe retirement, or explicit unmet prerequisites.

## Decisions and boundaries

Keith selected agent-run synthetic non-production checks after privately configuring access. Agents receive no Production credentials/private data. Keith supplies non-secret Production resource/configuration facts. The successful existing Production workflow is read-only evidence; this increment's live mutations are confined to assigned synthetic non-production resources and protected Preview deployments. No paid upgrade, new product schema, public API, product feature, Production deployment/restore, merge or remote issue edit is assigned here. The subsequent `$commit all relevant files` instruction authorised local commits. Keith later explicitly authorised pushing this branch and creating its normal pull request; publication does not authorise merge or Production deployment. A protected Preview publication uses the reviewed source and existing release workflow only after access, isolation and protection are established.

Keith selected separate handoffs: SoC prerequisites do not block a completed database handoff. This does not waive database replay, persistence or recovery checks, and it does not mark CHG-K-006 or WP-001 complete while assigned evidence is missing. The existing fixed synthetic provider request has at most one live attempt per explicitly authorised activation, concurrency one, no automatic retry and explicit verified input/output/time/interval/token limits. Model/handling/course/allowance uncertainty leaves it disabled.

The assigned non-production access, resource/major/isolation metadata, replay/upgrade, hosted persistence and synthetic recovery checks passed; broader G08 eligibility/release claims remain open. On 20 October 2026 Keith selected `SOCLAAS_MODEL=qwen3.8:27b`, `SOCLAAS_MAX_INPUT_BYTES=65536`, `SOCLAAS_MAX_OUTPUT_TOKENS=4096`, and `SOCLAAS_TIMEOUT_MS=30000` in the implementation conversation. These are selected configuration values, not evidence of key permission or provider support. G04 still needs key-visible limits/remaining allowance, provider spacing, data handling and authoritative course rules before activation. G01/G02 remain Darryl-led account decisions; G03/G05 affect Keith's later event validation; G06/G07 remain with retention/withdrawn-history work. No product gate is silently adopted by this increment.

## Completion and tracking

The [runbook](../../docs/wp-001-foundation-handoff.md) defines safe commands, resource separation, expected outcomes and failure handling. Record checks with source/deployment identity, environment, exact commands, sanitized results, cleanup and limitations in verification.md. Missing credentials are not failed database/provider tests and unavailable tests are not passes. No complete application scenario is claimed.

GitHub issues #4/#6/#7 contain historical planning and need their owner to reconcile links and actual readiness. Remote issue mutation is not assigned; record pending updates rather than claiming synchronization. This change updates current repository status, preserving the original decisions and previous check results. Any later product decision resolution must follow CONTRIBUTING's decision-to-issue reconciliation rules.
