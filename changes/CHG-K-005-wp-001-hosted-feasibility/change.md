# CHG-K-005 — WP-001 hosted feasibility and SoC boundary

Status: in progress. Actual checks and limitations belong in [verification.md](verification.md).

## Intent and source

Keith requested the second slice of the reviewed WP-001 plan on 18 October 2026, including bounded live checks when access exists and a post-implementation setup guide. This change consumes reviewed foundation commit `7d4d1b983c4104f758c476fc345c7de20efb1f58` from CHG-K-004, with B1/D12/D13 and the [selected CHG-K-002 design](../CHG-K-002-wp-001-foundation-design/design.md). Keith owns this change. Planned branch/PR increment: `6-hosted-feasibility`; log owner Keith, [07-wp-001-hosted-feasibility.md](../../logs/keith/07-wp-001-hosted-feasibility.md). Related overview: [issue #6](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/6).

Read the [task map](../../specs/README.md#task-reading-map), [WP-001](../../specs/work-packages/wp-001-foundation.md), implementation plan, complete affected integration handoffs, G04/G08, Accounts/access, AI/privacy, Deployment/retention and complete T13/T14/T15/T28 scenarios/coverage. Requirements: DEP01–04, SEC05–06, DEV01–03; consume SEC01–04 boundaries. This slice demonstrates infrastructure/provider feasibility, not either end-user AI workflow.

## Ownership and scope

The coordinator also owns status-only updates in `specs/shared/deployment-and-retention.md`, `specs/work-packages/wp-001-foundation.md`, and `specs/decisions.md` for this increment.

Sequential shared-file handoffs on 18 October 2026: the Foundation Engineer alone added empty SoCLaaS/probe placeholders to `.env.example` after the Hosting Engineer requested them. After the coordinator found that default Vitest discovery omitted hosted checks, the Foundation Engineer alone updated `vitest.config.ts` to include the hosted and AI test paths while retaining the database-integration exclusion. The Hosting Engineer did not edit either shared file.

The Hosting & SoC Engineer is sole implementation writer for `.github/workflows/vercel-deploy.yml`, `vercel.json` only if needed, `src/server/ai/soclaas-client.ts`, `src/server/ai/soclaas-config.ts`, `src/server/ai/*.test.ts`, `src/app/api/internal/foundation-probe/route.ts`, `tests/hosting/**` and `docs/wp-001-hosting-setup.md`. Any additional file needs a coordinator-recorded exact-path handoff before writing. The foundation engineer retains sole ownership of `package.json`, `pnpm-lock.yaml`, `.env.example`, shared `src/server/config/**`, `src/server/db/**`, Prisma schema/migrations and the application setup in README; the hosting engineer requests changes to these paths instead of editing them. The coordinator alone writes this change directory and Keith's log. An independent Implementation Verifier reviews the completed implementation and authors no implementation files.

Implement the selected trusted GitHub Actions → checked, target-matched Vercel CLI prebuilt route with safe secret separation and failed-step gates. Implement an internal server-only one-attempt SoCLaaS adapter with explicit bounded configuration and classified safe failures. Add a temporary protected-preview synthetic probe route only if necessary for future intended-host checks: disabled by default, non-production only, independently token-protected, fixed synthetic input, no caller-supplied provider prompt/model/base URL or credential/raw payload output. Its presence is not public product behaviour. Do not persist proposal/private user data or add account/AI workflow behavior.

No Vercel/Neon/SoCLaaS credentials, model selection or course-specific deployment evidence were present at the source handoff. Non-production hosted access, CLI project/team/token eligibility, model/quotas/data handling and live migration/recovery remain G04/G08 prerequisites. Do not claim live connectivity from a stub or successful build. The setup guide must name exact resources, secret/configuration placement and bounded verification steps without secret values. Production private data is out of scope.

## Completion

Deliver exact workflow/adapter/probe source and deterministic negative tests, a reproducible setup guide, local build/check evidence and independent review with findings corrected or dispositioned. If Keith configures authorized resources, perform bounded synthetic protected-preview deployment, persistence/redeploy and permitted-model SoC checks and record target/revision/URL/results without secrets. Otherwise record each live check as unrun with the missing prerequisite. Full T14/T15/T28 remain later integrated targets. Human PR review belongs on GitHub under [CONTRIBUTING](../../CONTRIBUTING.md#review-records).
