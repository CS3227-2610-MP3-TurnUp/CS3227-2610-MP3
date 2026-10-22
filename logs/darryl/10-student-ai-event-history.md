# 01 - Account-owned event chat history - 22 October 2026

## Request

Darryl requests preserving history across popup close,event navigation and logout,and explicitly authorises commit/push. He selected account-based cross-device storage in the clarification. Main agent only;preserve unrelated work and existing allowance.

## Results

Bounded design: server saves completed turns for the authenticated Student,retains the latest20per event/current revision,restores only after fresh authentication/publication validation,and never includes stored history in provider context. Replaced/withdrawn/cancelled content stays hidden under the existing conservative suppression rule;G07is not globally resolved. Expiry follows90days after published end;query expiry and opportunistic cleanup do not establish scheduled or backup erasure/G06completion. Migration and checks pending;no live provider or external database access.

<!-- turnup-prompt:v1 -->
```json
{
  "version": 1,
  "entry": 1,
  "root_thread_id": null,
  "root_turn_id": null,
  "revision": "02bdca7",
  "captured_at": null,
  "delegation": "Explicit main-agent-only instruction retained;no subagents.",
  "agents": [
    {
      "id": "/root",
      "parent": null,
      "thread_id": null,
      "action": "root",
      "role": "main",
      "task": "Persist private per-account/event chat across popup closing, navigation and logout, including across devices; test,commit,push.",
      "reason": null,
      "dispatches": 0,
      "outcome": "completed",
      "result": "Implemented server-only account/event history,additive migration,guarded reads,validated restoration and suppression.75affected mock checks passed;final31history/controller/HTTPchecks overlap;15disposable SQLchecks passed.Scopedlint,types,schema passed.No live inference or external DB.",
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

PR30merged during this increment;fast-forwarded to02bdca7without code changes and moved this uncommitted entry to the new PR-owned log10. Previous log09history is preserved. Newchecks:75mocked across6files;finalhistory/controller/HTTP31across3files (overlap,not additive);15disposable SQLchecks prove same-account new-session recovery,idempotency,concurrent appends,other account/Organiser/event denial,withdrawal/cancellation/replacement suppression,expiry,twenty-turn pruning and corrupt-evidence refusal. Scoped ESLint,nonincremental TypeScript and Prisma schema validation passed. No live provider,external DB,migration application,allowance reset or independent-agent review;main-agent-only override remains explicit. Existing stagednext-env.d.ts and registration diagnostics remain excluded. Scheduled cleanup and recoverable-copy retention remainG06pending;queries suppress expired rows and appends opportunistically delete expired rows. Local/hosted databases need20261022030000migration before using persistence. Commit/push/new PR follow.

Main-agent review follow-up: history responses carry the authenticated account scope;routine source refresh also rechecks saved history so an account switched in another tab cannot retain the previous account's transcript or draft. Unchanged history keeps existing branded answer/state references and avoids focus/loading flicker. Failed history/identity checks clear cached private display,while DBhistory remains intact. Finalhistory/controller/HTTP31/31passed,including both edgecases;SQL15/15unchanged. Scopedlint/types rechecked. Serverstorage commit19ea761;client restoration and these reviewed safety changes follow in the second commit. No subagent/livecall/config/allowance change.
