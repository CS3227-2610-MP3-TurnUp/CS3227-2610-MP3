---
name: application-foundation
description: Implement an assigned Next.js/TypeScript application foundation, isolated configuration and selected database/migration approach with reproducible local evidence.
---

# Application and data foundation

Read the [task reading map](../../../specs/README.md#task-reading-map), assigned package/change and [ownership rules](../../../specs/implementation-plan.md). For WP-001 use the [foundation plan](../../../specs/work-packages/wp-001-foundation.md) and [integration handoffs](../../../specs/integration-handoffs.md). Follow their affected contracts and full scenarios; links are routing, not a replacement specification.

## Establish the design and file handoff

- Use the assigned change ID, base revision, exact file ownership and prerequisites. Record shared manifest/lockfile, configuration and migration writers before dispatch. Transfer ownership sequentially when another engineer needs those files.
- Next.js/TypeScript and Vercel Hobby are settled. Database, migration libraries and versions are selected in the assigned design record after official version/compatibility/provider validation; existing Prisma placeholders do not select Prisma. Keep alternatives, unresolved G08 decisions and the adopted rationale visible.
- Ask the coordinator to assess material database/migration, environment and integration choices before dependent execution. An initial scaffold must not settle Darryl's account/session contract or introduce unrelated feature schemas.

## Implement and validate the assigned slice

- Establish the agreed scaffold and server-only database/configuration boundaries. Keep development/test/production credentials and data isolated; test scripts must not silently fall back to production. Example configuration contains names and safe placeholders, never actual secrets.
- Use durable storage appropriate to the contract; function-local files/memory cannot establish application persistence. Record migration application and recovery procedures appropriate to the selected approach, avoiding speculative rollback guarantees.
- Run the actual available type/build/lint and relevant database/migration checks. Validate meaningful failure cases such as missing configuration or failed connectivity where affected. Do not invent commands before tooling exists or install extra test frameworks simply to check reversible documentation changes.
- Inspect tracked and newly created files and relevant client outputs for accidental credentials; report findings without printing secret values. Keep diagnostics/logs within [SEC06](../../../specs/shared/ai-and-privacy.md).

## Return a reproducible foundation

Supply changed paths, selected versions/approach, safe configuration names, setup and check commands with actual results, database/migration evidence, prerequisite revision and remaining gates. The coordinator owns assigned shared status/log records unless ownership is transferred. Distinguish local evidence from the hosting engineer's checks and from complete T15/T28 acceptance. Agent/skill installation alone authorises no application setup or deployment.
