# CHG-K-004 — Tasks and handoff

Source/spec revision: `a3184a2b18a6411bfbbda466ef8b2c05b6607e3e`; 18 October 2026. Keith owns the `4-foundation-stack` increment and [foundation log](../../logs/keith/06-wp-001-foundation.md). Complete applicable contracts and scenarios are routed in [change.md](change.md).

| Order | Output | Sole writer | Dependency | Evidence target |
| --- | --- | --- | --- | --- |
| 1 | This change record, exact assignment and owner log | Coordinator | Selected CHG-K-002 design and clean source base | DEP01–03, SEC06, DEV01–03; T13/T15/T28 portions |
| 2 | Pinned app/config/database foundation in the exact responsibility areas in change.md | Application Foundation Engineer | Step 1; validate exact patches and G08 capabilities | Local setup, server boundary, isolated connection and migrations |
| 3 | Integrated evidence and implementation review | Independent Implementation Verifier, read-only; coordinator records evidence | Completed step 2 and reviewed revision | Findings, reproduced checks and harmless T13 injection check |
| 4 | Corrections and material recheck | Foundation engineer, then verifier | Step 3 findings | Corrected scoped behaviour and honest limits |

The engineer is not alone in the codebase: preserve all other files and coordinate any path outside this assignment before editing. The coordinator owns change/evidence/log files exclusively. Implementation requires no public role feature, production private data, live SoC call or deployment. Return changed paths, exact commands/results, version pins, safe configuration names, migration evidence and the next handoff. The verifier has no implementation authorship.

## Work state

- [x] Scope, source revision, single writers and requirements recorded.
- [x] Application foundation implemented and actual local checks recorded; live Neon checks remain pending for lack of access.
- [x] Independent implementation review and material-fix recheck recorded in verification.md.
- [x] Foundation → hosted-feasibility handoff recorded with live Neon evidence still pending; accounts consumption needs the actual connection/migration evidence.
