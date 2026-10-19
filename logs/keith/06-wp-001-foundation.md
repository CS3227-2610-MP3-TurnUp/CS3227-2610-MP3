# 01 - Implement WP-001 foundation - 18 October 2026

## Request

Implement the reviewed WP-001 plan in two increments. This `4-foundation-stack` increment is CHG-K-004, owned by Keith, and establishes the application/database foundation before hosted feasibility.

## Results

The coordinator allocated the change, branch/worktree, writers and acceptance targets. The Application Foundation Engineer implemented a pinned Next.js/TypeScript shell, Prisma/Neon configuration and synthetic probe migration, server-only database helper, guarded environment loading, setup guide and configuration checks. A frozen-lockfile install, lint, typecheck, Prisma validation/generation and production build passed on Node 24.21.0 and pnpm 12.14.0; the final default suite passed ten tests. Negative database/configuration commands stopped before connection as intended.

The independent Implementation Verifier reproduced local checks and found three P2 defects: the opt-in DB test could not import the server helper, duplicate TLS parameters could disable certificate verification in `pg`, and a query host override could redirect a validated Neon URL. The engineer corrected all three within its assigned paths. The verifier rechecked the actual helper import, original unsafe payload rejection, ordinary `server-only` boundary, ten tests, lint, typecheck, build and whitespace, with no new actionable finding. Exact reviewed snapshot, commands and limitations are in [verification](../../changes/CHG-K-004-wp-001-foundation/verification.md). `.env.local` and live Neon access were unavailable; migration replay, persistence and recovery remain unrun. The hosted slice may consume this code with those gaps explicit.

# 02 - Correct migration reset and TLS guards - 19 October 2026

## Request

Implement the accepted correction plan for three PR review reports in CHG-K-004 / PR #17: prevent production `migrate reset`, require Prisma-supported strict certificate validation on direct migration URLs, and reject unsupported `verify-full` for the Prisma CLI.

## Results

The Foundation Engineer updated the migration command classifier, direct URL validation, synthetic configuration tests, README and `.env.example`. The independent verifier initially found three stale test assertions; the engineer corrected them and the verifier reran 13 default tests successfully. Independent TypeScript, ESLint, synthetic Prisma config-loader and `pg` boundary checks passed without a reset or network connection. The final reviewed paths, digest, commands and limits are in [CHG-K-004 verification](../../changes/CHG-K-004-wp-001-foundation/verification.md). Frozen install was blocked by registry DNS and missing offline package cache; live Neon migration/recovery and a production build were not run. GitHub environment migration secrets require a private owner update before deployment; no secret value was handled here.
