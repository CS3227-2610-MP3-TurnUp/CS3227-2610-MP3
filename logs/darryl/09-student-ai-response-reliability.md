# 01 - Friendly and reliable Student chat - 22 October 2026

## Request

Darryl authorises the proposed response-pipeline fixes, friendly helpful language, commit and push to a PR after valid casual questions produced a technical error. Existing main-agent-only constraint applies. Related CHG-D-006; base 4b2d33a; reuse preview/WP-006. No live inference or allowance changes.

## Results

Plan: reduce model bookkeeping through a compact server-bound response; preserve exact evidence, publication recheck and strict validation; handle complete JSON fences without extracting arbitrary text; identify truncation/parse/schema failures through metadata-only diagnostics; use friendly technical-failure copy, never fabricate a successful answer. Mocked checks and delivery pending. The precise previous hosted provider response was not retained, so its cause is not asserted.

<!-- turnup-prompt:v1 -->
```json
{
  "version": 1,
  "entry": 1,
  "root_thread_id": null,
  "root_turn_id": null,
  "revision": "4b2d33a",
  "captured_at": null,
  "delegation": "Explicit main-agent-only instruction retained;no subagents.",
  "agents": [
    {
      "id": "/root",
      "parent": null,
      "thread_id": null,
      "action": "root",
      "role": "main",
      "task": "Simplify Student answer protocol, improve friendly failure UX, mock-test casual questions and safely commit/push a focused PR.",
      "reason": null,
      "dispatches": 0,
      "outcome": "completed",
      "result": "Compact Student protocol and friendly clarification/failure guidance implemented; six mocked suites106/106passed. No live inference, budget change or subagent. Scoped ESLint and nonincremental TypeScript passed; publication follows validated records.",
      "settings": {
        "model": null,
        "effort": null,
        "basis": "unknown"
      },
      "tokens": {
        "status": "unavailable",
        "responses": null,
        "input": null,
        "cached_input": null,
        "output": null,
        "reasoning_output": null,
        "total": null,
        "source": null,
        "note": "Prompt-scoped telemetry unavailable;root active."
      }
    }
  ],
  "usage_updates": []
}
```

Affected mock checks passed106/106; original hosted output unavailable, so exact prior cause is unconfirmed. A file-write encoding failure was corrected before the final checks. Live quality and semantic entailment are not proven by fixtures. Scope excludes unrelated staged next-env.d.ts and registration diagnostics, all private configuration and local-only skills/agents. Scoped ESLint and nonincremental TypeScript passed. Commit/PR outcome pending.

# 02 - Friendly failure messages - 22 October 2026

## Request

Remove parser/security jargon from user-facing failures; valid questions do not warrant technical-input errors.

## Results

Friendly fallback now distinguishes a genuine failed reply from a misunderstood question, preserves question/retry, and keeps diagnostics server-only. Included in106passing affected checks.

<!-- turnup-prompt:v1 -->
```json
{
  "version": 1,
  "entry": 2,
  "root_thread_id": null,
  "root_turn_id": null,
  "revision": "4b2d33a",
  "captured_at": null,
  "delegation": "Explicit main-agent-only instruction retained;no subagents.",
  "agents": [
    {
      "id": "/root",
      "parent": null,
      "thread_id": null,
      "action": "root",
      "role": "main",
      "task": "Remove parser/security jargon from user-facing failures; valid questions do not warrant technical-input errors.",
      "reason": null,
      "dispatches": 0,
      "outcome": "completed",
      "result": "Friendly fallback now distinguishes a genuine failed reply from a misunderstood question, preserves question/retry, and keeps diagnostics server-only. Included in106passing affected checks.",
      "settings": {
        "model": null,
        "effort": null,
        "basis": "unknown"
      },
      "tokens": {
        "status": "unavailable",
        "responses": null,
        "input": null,
        "cached_input": null,
        "output": null,
        "reasoning_output": null,
        "total": null,
        "source": null,
        "note": "Prompt-scoped telemetry unavailable;root active."
      }
    }
  ],
  "usage_updates": []
}
```

# 03 - Clarify garbled language - 22 October 2026

## Request

Treat garbled words, typos and casual input conversationally; reserve technical failure states for actual backend/provider failures.

## Results

Prompt explicitly requests friendly clarification for unknown intent without keyword filtering or hard-coded answers. Four mocked unclear-input cases pass within106checks. No live requests; model compliance still needs separately authorised quality evaluation.

<!-- turnup-prompt:v1 -->
```json
{
  "version": 1,
  "entry": 3,
  "root_thread_id": null,
  "root_turn_id": null,
  "revision": "4b2d33a",
  "captured_at": null,
  "delegation": "Explicit main-agent-only instruction retained;no subagents.",
  "agents": [
    {
      "id": "/root",
      "parent": null,
      "thread_id": null,
      "action": "root",
      "role": "main",
      "task": "Treat garbled words, typos and casual input conversationally; reserve technical failure states for actual backend/provider failures.",
      "reason": null,
      "dispatches": 0,
      "outcome": "completed",
      "result": "Prompt explicitly requests friendly clarification for unknown intent without keyword filtering or hard-coded answers. Four mocked unclear-input cases pass within106checks. No live requests; model compliance still needs separately authorised quality evaluation.",
      "settings": {
        "model": null,
        "effort": null,
        "basis": "unknown"
      },
      "tokens": {
        "status": "unavailable",
        "responses": null,
        "input": null,
        "cached_input": null,
        "output": null,
        "reasoning_output": null,
        "total": null,
        "source": null,
        "note": "Prompt-scoped telemetry unavailable;root active."
      }
    }
  ],
  "usage_updates": []
}
```

Final checks: scoped ESLint passed; nonincremental TypeScript passed; git diff --check passed. Structured log initially failed because a closing JSON fence shared its line with the object; corrected before delivery. No independent review is claimed.

Delivery: pipeline committed as48b48ec. Six affected suites106/106passed; final wording-only rendering recheck17/17passed. Scoped lint, nonincremental types, diff whitespace and all3structured log entries passed. Main-agent review only. Two focused commits prepared; authorised push/new PR follows. No live/provider/SQL/config/allowance changes or subagent use.

# 04 - Hosted account attempt window - 22 October 2026

## Request

Darryl authorises20attempts per account per15minutes and push, explicitly for both Preview and Production. Keep separate200attempttotal pools, cooldown/output/time caps and existing spend/expiry. Main agent only.

## Results

Shared HOSTED_LIMITS changes from5to20; database acceptance tests cover both target environments, twenty accepted requests, twenty-first denial and rolling-window recovery without a reset. Checks passed:10disposableSQLtests and15policytests;scopedESLint passed. No external database/provider requests. Bothenvironmentboundary/expirychecks use isolated throwaway local databases. Main-agent-only review under existing human override;historical independent evidence retained. PR30remainsopen;push will update it. No migration/reset/activation or total-pool change.

<!-- turnup-prompt:v1 -->
```json
{
  "version": 1,
  "entry": 4,
  "root_thread_id": null,
  "root_turn_id": null,
  "revision": "3ef32a6",
  "captured_at": null,
  "delegation": "Explicit main-agent-only instruction retained;no subagents.",
  "agents": [
    {
      "id": "/root",
      "parent": null,
      "thread_id": null,
      "action": "root",
      "role": "main",
      "task": "Increase Student hosted per-account admission to20attempts per15minutes in both Preview and Production; test and push.",
      "reason": null,
      "dispatches": 0,
      "outcome": "completed",
      "result": "Hosted limit20inbothenvironments;10disposableSQLand15policychecks passed;scopedlint passed.No live inference, external DB, resets, migration or budget-pool changes. Main-agent review only.",
      "settings": {
        "model": null,
        "effort": null,
        "basis": "unknown"
      },
      "tokens": {
        "status": "unavailable",
        "responses": null,
        "input": null,
        "cached_input": null,
        "output": null,
        "reasoning_output": null,
        "total": null,
        "source": null,
        "note": "Prompt-scoped telemetry unavailable;root active."
      }
    }
  ],
  "usage_updates": []
}
```
