# CHG-K-004 — WP-001 application and data foundation

Status: in progress. Implementation and verification evidence belongs in [verification.md](verification.md).

## Intent and source

Keith requested implementation of the reviewed WP-001 plan on 18 October 2026. This first increment establishes the selected runnable Next.js foundation and isolated Neon/Prisma data path. Source revision: `a3184a2b18a6411bfbbda466ef8b2c05b6607e3e` (B1/D12/D13 and [CHG-K-002 design](../CHG-K-002-wp-001-foundation-design/design.md)). Keith owns this change. Planned branch/PR increment: `4-foundation-stack`; log owner Keith, [06-wp-001-foundation.md](../../logs/keith/06-wp-001-foundation.md). Related overview: [issue #4](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/4).

Read the [task map](../../specs/README.md#task-reading-map), [WP-001](../../specs/work-packages/wp-001-foundation.md), [implementation plan](../../specs/implementation-plan.md), [foundation → accounts handoff](../../specs/integration-handoffs.md), G04/G08 in [decisions](../../specs/decisions.md), Accounts/access, AI/privacy, Deployment/retention and the complete T13/T14/T15/T28 scenarios and coverage. Requirements: DEP01–03, SEC06, DEV01–03; consume DEP04/SEC01–05 boundaries without claiming their feature delivery.

## Ownership and scope

The Application Foundation Engineer is the sole implementation writer for `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` if required, `tsconfig.json`, `next.config.*`, `eslint.config.*`, `vitest.config.*`, `postcss.config.*`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/server/db/**`, `src/server/config/**`, `prisma/schema.prisma`, `prisma.config.ts`, `prisma/migrations/**`, `tests/foundation/**`, `.env.example`, `.nvmrc`, `.gitignore` and the application setup section of `README.md`. Generated framework support files within those responsibility areas may be added after their exact names are reported to the coordinator before writing. The coordinator alone writes this change directory and Keith's log. The independent Implementation Verifier reads the completed diff and writes no implementation files.

Select exact compatible patches within the human-selected Node 24 / Next 16 / React 19 / TypeScript 5.9 / pnpm 12 / Prisma 7 / Neon design. Build a minimal shell, server-only validated configuration and pooled runtime/direct migration wiring. Use synthetic-only non-production Neon and independent production resources; no credential or production private-data access is assigned to agents. Provide migration replay and recovery evidence on disposable synthetic resources when access permits. No account, event, form, registration or AI feature schema; no public database/probe API.

The [CHG-K-002 design](../CHG-K-002-wp-001-foundation-design/design.md) resolves the stack and CLI route. G08 still requires actual patch/driver/connection, resource, allowance and migration/recovery validation. Hosted deployment, SoC calls, paid provisioning, authentication choices and full T14/T15 remain for later changes. The selected foundation must fail closed for missing or misclassified configuration, without production fallback. The application/CLI setup and data evidence handed to Darryl must distinguish local checks from hosted checks.

## Completion

Deliver a reproducible locked install; meaningful type, lint, build and configuration checks; isolated Neon connection/migration/replay and synthetic data evidence where available; safe setup instructions; secret/client-output inspection; and independent implementation review with findings corrected or dispositioned. Record exact commands, environment, revision, remaining gates and unrun checks in [verification.md](verification.md). Documentation does not count as runtime evidence. Human PR review is managed on GitHub under [CONTRIBUTING](../../CONTRIBUTING.md#review-records).
