# CHG-K-004 — Verification

Source/spec base: `a3184a2b18a6411bfbbda466ef8b2c05b6607e3e`. Human owner: Keith. Implementation writer: Application Foundation Engineer. Independent agent reviewer: Implementation Verifier, after completed implementation.

## Evidence

Implementation working copy on `4-foundation-stack` at base `a3184a2b18a6411bfbbda466ef8b2c05b6607e3e`; Node 24.21.0, pinned pnpm 12.14.0, Next 16.3.8 and Prisma 7.10.1. The engineer reported these checks on 18 October 2026; the independent reproduction and material recheck are recorded below.

| Area | Actual check | Result and limit |
| --- | --- | --- |
| Reproducible install | `corepack pnpm install --frozen-lockfile` with Node 24 and an isolated Corepack home in `/private/tmp` | Passed after bounded registry access; lockfile and restricted install-script policy checked. Initial default sandbox registry/DNS and Corepack-home writes were unavailable. |
| Static/runtime setup | `corepack pnpm lint`, `typecheck`, `test`, `db:validate`, `db:generate`, `build` | Passed; seven configuration tests passed. Build emitted static `/` and `/_not-found`. Prisma Client was generated. This does not test Neon connectivity. |
| Database guard paths | `test:db` without `RUN_FOUNDATION_DB_INTEGRATION=1`, then with invalid environment labels; `db:migrate:status` with invalid labels; `db:migrate:dev` with production labels and a synthetic URL | Each intentionally failed before database access, as required by the guard. These are negative checks, not a passed live migration or integration test. |
| Secret/client boundary | `git check-ignore -v .env.local .env.production.local`; static scan of `.next/static` for database/SoC variable names and synthetic URI; `git diff --check` | Ignore rules matched, no searched values found in client static output, whitespace clean. This scan does not prove absence of every possible secret. |
| Neon execution | Connection, migration replay, probe read/write and recovery | Not run: no synthetic Neon URL, database resource or `.env.local` was available in this session. |

The schema contains a synthetic `FoundationProbe` fixture and no account/event models. Runtime uses a pooled Neon URL; migration config uses a direct URL and an isolated shadow URL for `migrate dev`. Config validates explicit environment labels, URL mode and TLS; labels cannot prove the URL belongs to the claimed Neon project. Full T15/T28 and hosted/provider evidence remain pending.

## Findings and handoff

Independent Implementation Verifier reviewed the uncommitted 26-file implementation snapshot at base `a3184a2` (combined content SHA-256 `bc241ee861c0d52963bcf9e279639e47741ecbfb7560627188dcefa79b071811`). It independently reproduced lint, typecheck, seven tests, Prisma validation, build, ignore/secret scans and clean whitespace. Its frozen offline install was inconclusive because one tarball was not cached; the author's registry-backed frozen install passed. A harmless synthetic development fixture requested an out-of-scope read and marker command; the verifier executed neither, and the marker remained absent. This is one observed T13/DEV02 check, not universal injection resistance.

| ID / severity | File / consequence | Correction / recheck |
| --- | --- | --- |
| F01 / P2 | `tests/foundation/vitest.database.config.ts`: opted-in DB test failed on `server-only` import before any query | Fixed by test-only server entry resolution; verifier imported the actual helper without connecting and confirmed ordinary Node/default-test poison remains. |
| F02 / P2 | `src/server/config/environment.ts`: duplicate `uselibpqcompat` values bypassed verified TLS check; pg accepted `rejectUnauthorized: false` | Fixed by duplicate/security-override rejection; verifier reproduced original driver effect and rejection of the payload. |
| F03 / P2 | `src/server/config/environment.ts`: `host` query override bypassed validated Neon hostname and could redirect credentials | Fixed by override rejection; verifier reproduced original pg host override and rejection of the payload. |

Material-fix recheck at the same base reviewed 28 implementation files (combined SHA-256 `d4fd9b9ef45ada6040061226fa772f404f4bbe031cbde0e8bf337ed660584c0d`). The independent verifier reran lint, typecheck, ten default tests, focused helper import, both unsafe URL cases with `pg.Client` construction but no connection, ordinary `server-only` rejection, production build and `git diff --check`; all behaved as intended. No new actionable defect was found. The author's frozen-lockfile reinstall also passed; the verifier's initial offline reinstall remained limited by an uncached tarball, not a lockfile mismatch.

After that review, the author made a README-only status wording correction to state that later product/hosted workflows will be implemented in their assigned changes. The verifier confirmed the corrected line and reran `git diff --check`; no application code changed or application tests were rerun for this wording correction.

No live Neon connection, migration, persistence, recovery, hosting or SoC check ran. The foundation → hosted/accounts handoff must carry these gaps; full T13/T14/T15/T28 are not passed. Exact foundation setup and variables are in the application section of [README](../../README.md). The next hosted change consumes this reviewed revision for offline workflow/provider integration while live operations await credentials and account evidence.
