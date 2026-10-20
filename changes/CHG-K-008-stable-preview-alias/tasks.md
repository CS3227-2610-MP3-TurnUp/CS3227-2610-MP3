# CHG-K-008 — Tasks and handoffs

Source/spec revision: `0c7d5ad`, B1/D11–D13, DEP01–03, DEV01–03, SEC02/06;
partial T13/T15/T28 only. Human owner: Keith. Primary agent owns all allowed
implementation/documentation paths in change.md. Independent reviewer is read-only
and returns findings; primary agent records them, avoiding overlapping writers.

- [x] Record assignment, isolated branch/worktree, scope, contracts and owner log.
- [x] Implement validated Preview-only alias assignment and stable URL summary.
- [x] Update operational contract and setup guidance, preserving isolation.
- [x] Execute local shell/static regression checks and record exact results.
- [x] Independent agent review; disposition findings and recheck material fixes.
- [x] Commit scoped paths, push authorised branch, create/read back normal PR [#24](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/pull/24).

## Handoff

21 October 2026: Primary agent → independent implementation verifier after edits.
Read change.md's full contract/context list plus actual diff, tests and guide.
Allowed review: scoped files against `0c7d5ad`; no production/provider access,
implementation writes, staging or commits. Return concrete findings, exact checks,
revision/snapshot and limits. Review DEP02 isolation, failure propagation, aliases,
untrusted configuration handling and unchanged Production release path. Record
findings/checks only in verification.md via primary agent. Log owner Keith:
`logs/keith/12-stable-preview-alias.md`, originating prompt entry 01.

Next bounded runtime task: run the integrated workflow from an authorised protected
`preview/*` branch, verify stable target across two uploads and authentication/
complete sharing-link behaviour. No such deployment is performed by this increment.

## Follow-up tasks: Production hostname collision

Source: `65b845f`, existing PR #24. Same primary writer/log; extend allowed paths
with `.github/scripts/check-preview-alias.mjs` and
`tests/hosting/preview-alias-safety.test.ts`. SEC06/DEP02–03; T13/T15/T28 portions.

- [x] Verify original syntax-only acceptance and reconcile contract/scenario.
- [x] Implement paginated project Production-domain checks before deployment work
  and immediately before assignment; fail closed on lookup errors.
- [x] Reproduce collision, later-page collision, metadata failure and allowed alias
  checks; lint, shell/YAML checks and independent agent recheck.
- [ ] Commit/push scoped correction to existing PR and read back delivery.
