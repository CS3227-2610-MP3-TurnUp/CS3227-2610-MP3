# WP-001 - Application foundation and hosting feasibility

Planned work under B1/D12; no implementation or passing runtime evidence is implied. Read the [common planning rules and ownership](../implementation-plan.md), the [task reading map](../README.md#task-reading-map), applicable [decision gates](../decisions.md) (G04/G08) and the relevant [integration handoff](../integration-handoffs.md). Exact file writers and change IDs remain per-change assignments.

## Scope and dependencies

| Order / roadmap work package | Human ownership | Scope and requirement package | Depends on / observable completion |
| --- | --- | --- | --- |
| WP-001: application foundation and hosting feasibility | Keith leads; Darryl reviews | Initialise the selected Next.js/TypeScript stack, database/migration approach, isolated configuration, hosted execution and server-side SoC connectivity. DEP01–DEP04, SEC06; DEV01–DEV03 throughout. | Resolve only required library/provider choices first. Record actual hosted connectivity and free-tier constraints; no secrets in browser/repository. A feasibility check does not demonstrate the complete application. |

## Bounded implementation slices

| Package / slice | Lead and responsibility areas | Ordered deliverables and planned checks | Prerequisites / limits |
| --- | --- | --- | --- |
| WP-001: foundation | Keith; root application/configuration files, database integration and `prisma/migrations/` if that approach is selected; Darryl reviews | Record selected versions/database/migration approach; initialise Next.js/TypeScript and isolated configuration; document actual local build/check commands and setup steps. Check that no credentials are committed. DEP01–03, SEC06; foundation portions of T15/T28. | G08 selections and assigned foundation change. The reserved Prisma directory does not select Prisma. |
| WP-001: hosted feasibility | Keith; hosting configuration and assigned `src/server/ai/` provider integration; Darryl reviews | Establish durable-data and server-side SoC connectivity evidence from intended hosting; record limits, access requirements, failures and recovery instructions. Hand off the reproducible foundation revision. DEP01–04; partial T14/T15/T28. | Required provider access/configuration and G04/G08 validation. A connection check does not pass the complete hosted user journey. |

## Planned acceptance targets

| Package | Planned acceptance targets in [acceptance-scenarios.md](../verification/acceptance-scenarios.md) |
| --- | --- |
| WP-001 | T15/T28 foundations; complete workflow evidence follows feature integration |

Read each applicable scenario's complete Given/When/Then and method, including coverage and evaluation guidance. Partial package evidence does not pass an entire scenario.
