# Tasks and ownership

Root follows configured sdd_coordinator (gpt-6.1-sol/high), owns change/specs/docs/evidence/log and usage attribution; no application authorship. Reuse log14 for this WP-005 increment, entry15.

Server application_foundation_engineer (gpt-6-luna/xhigh) owns src/features/proposal-assistance/public-candidates.ts (shared types/renderer/constants, sole writer), src/server/proposal-assistance/public-candidates/**, src/app/api/organiser/events/[id]/public-candidates/route.ts, src/server/events/service.ts (minimal read-only readiness snapshot helpers), and new server-focused tests under tests/proposal-assistance/public-candidates*.test.ts plus tests/events/service.test.ts if needed. Reuse existing transport/admission unchanged unless a coordinated necessity appears. No schema/manifest/config/provider-policy edits. Publish shared contract to UI first.

UI application_foundation_engineer (gpt-6-luna/xhigh) owns src/components/events/public-content-assistance.tsx, src/components/events/editor.tsx, src/app/globals.css and UI-only tests tests/proposal-assistance/public-content-assistance.test.tsx, with existing editor-prefill test updates if needed. No backend/shared-type writes. Maintain disjoint ownership with server writer.

Independent implementation_verifier (gpt-6.1-sol/high) reviews completed source, privacy/revision/bounds/explicit apply and failure behaviour; reproduces meaningful checks without authoring fixes. Root owns verification.md. Backend/UI own fixes in their assigned files.

- [x] Freeze shared contract and applicable canonical behaviour.
- [x] Implement read-only saved-draft source/readiness and bounded candidate generation.
- [x] Implement editable page-local candidates, unanswered-question handling and explicit application.
- [x] Run focused/full/static/type/isolated build checks; independent review and recheck fixes.
- [x] Reconcile actual evidence/handoff/limits and usage attribution. No live claims from doubles.

## Reported 502 correction

- [x] Clarify exact root/nested description schema with valid shape example; bump only public-candidate prompt.
- [x] Add finite server-only rejection codes and regression coverage without exposing model/source content.
- [x] Verify one post-fix synthetic call, static/full checks, isolated build and independent review; preserve original event/allowance/validation boundaries.


## FAQ-only refinement

Same disjoint configured backend/UI authors; no other file ownership transferred. Root source snapshot before refinement:13-file fingerprintb70adcb1777088bd4b2556f7fe71493590408a3638b477ed2d2e66241b9afa35. Explicit application integration assignment (not foundation-only); respective agents implement their bounded paths.

- [x] Remove duplicate description candidate contract; promptv3 nonempty participant FAQ questions; Other-only aggregate bounds/tests.
- [x] Remove description UI/application, populate FAQ candidate, separate unanswered controls and explicit empty-state/blank-Apply guards/tests.
- [x] Full/static/isolated build and independent verification, then reconcile current guide/handoff/log18. No live model/DB/allowance/config/commit operations.
