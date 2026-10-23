# Ownership and tasks

Root sdd_coordinator (gpt-6.1-sol/high): canonical policy/scenarios, change records, operator/testing guide, existing member log and usage attribution, isolated generation/build coordination/evidence. No application authorship.

Backend application_foundation_engineer (gpt-6-luna/xhigh), explicit application integration assignment: sole writer prisma/schema.prisma and one new additive migration, src/lib/generation-usage.ts public DTO, src/server/ai and src/server/db new daily generation/accounting modules, src/server/proposal-assistance/transport.ts and http.ts, public-candidates API route, new /api/organiser/ai-usage route, tests for those paths, .env.example only if needed. Preserve original local/probe execution and existing guards. Publish endpoint/DTO contract to root/UI before dependent work. No components/docs/log writes.

UI application_foundation_engineer (gpt-6-luna/xhigh): sole writer new shared generation-usage UI/hook, src/components/events/proposal-assistance.tsx and public-candidates.tsx (confirm actual component names), integration in editor only if required, related component tests. Consume backend contract sequentially; no server/schema/shared DTO/config/docs writes.

Independent implementation_verifier (gpt-6.1-sol/high): frozen completed diff, no fixes; reproduce tests/static checks, evaluate atomic accounting/dispatch/recovery/identity/environment/rollover and unchanged local/probe isolation. Inert injection check. Root records findings; authors fix their own paths. No private config/provider/production access.

- [x] Canonical policy/scenario and implementation contract
- [x] Backend additive schema/gate/transport/endpoint/tests
- [x] UI usage/read refresh/limit feedback/tests
- [x] Deterministic suite, lint, types, schema/build and scoped database evidence
- [x] Independent review, fixes/rechecks, docs/handoff/usage attribution

Actual new UI component is public-content-assistance.tsx; backend additionally owns the necessary shared public-candidate result type extension and dedicated database test config. Final checks/evidence and scope limits are in verification.md.
