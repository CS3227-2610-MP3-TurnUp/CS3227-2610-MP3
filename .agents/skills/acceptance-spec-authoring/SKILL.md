---
name: acceptance-spec-authoring
description: Write behaviour-focused SDD requirements and concrete acceptance scenarios with traceable IDs, access rules, failure outcomes, and cross-role contracts. Use for specification authoring, not implementation checklists.
---

# Acceptance specification authoring

## Inputs

Use the reconciled decisions, assigned capability/workflow, existing requirement IDs, and shared contracts. If reconciliation has not resolved an ambiguity, keep the affected requirement explicitly open rather than manufacturing a policy. Read only the relevant role and shared specifications.

## Procedure

1. State the capability purpose, actor, scope/exclusions, owner, and dependencies. Separate an agreed target from implemented/verified status.
2. Write each requirement as one observable behaviour with an ID and unambiguous requirement strength. Avoid vague outcomes such as 'handle safely' without specifying what occurs.
3. Define inputs/outputs, role and ownership checks, lifecycle/version preconditions, state changes, and error outcomes. Link the canonical shared rule instead of rewording it in competing role documents.
4. Add concrete Given/When/Then scenarios for normal operation, important invalid input, unauthorised access, stale versions, and applicable retry/concurrency/dependency failures. Do not mechanically create irrelevant cases for every requirement.
5. Identify the verification method: deterministic unit/integration/browser scenario, bounded provider evaluation, or explicit human review. AI quality scenarios need labelled synthetic cases and captured model/prompt/configuration versions; quotation existence alone does not prove answer relevance.
6. For changed behaviour, identify ADDED, MODIFIED, or REMOVED IDs against the actual baseline. Initial implementation of an existing agreed requirement references its ID without duplicating it as newly added scope.
7. Check that scenarios specify effects beyond wording: no reserved seat/partial write after failure, no private input in Student model context, no stale approval publication, and no unauthorised state change where relevant.

## Useful scenario example

For capacity safety: Given one remaining place and two different authenticated Students, when both submit valid current forms concurrently, exactly one reserves a place and the other receives a full-event outcome; retries do not reserve an additional place. Treat this as one scenario, not a prescribed database implementation.

## Output

Return the authored requirement IDs, scenarios, shared-contract references, verification mapping, and unresolved items. Keep library selections, schema internals, function names, and execution steps in design/tasks. Do not add mandatory global contacts, dual-role accounts, payment processing, or other functionality merely to simplify a design.
