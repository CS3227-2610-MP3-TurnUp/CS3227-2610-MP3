# Agent usage tracking

This Python 3.11+ tool measures TurnUp development-agent usage on each contributor's machine. It does not call a model, require an API key or connect to a hosted service. Python standard-library dependencies only. It is separate from the Next.js application and its AI/provider usage.

Run commands from a checkout containing this tool. On Windows replace `python3` with `py -3`. All examples use the default local state directory `~/.turnup-agent-usage/`; put `--state PATH` **before** the command to select an isolated ledger. `TURNUP_USAGE_STATE` also changes the default. `CODEX_HOME` is respected when first initializing; use `--codex-home PATH` for a different Codex installation.

## Start collecting

```sh
python3 -m tools.agent_usage init --owner keith --repo .
python3 -m tools.agent_usage collect --all
python3 -m tools.agent_usage report
python3 -m tools.agent_usage doctor
```

Darryl uses `--owner darryl` on his machine. The registry keeps contributor identity separate from change prefixes. Init can be repeated for additional clones of the same project; it discovers existing worktrees in that repository, including branches predating this tool. Repeat init after adding new worktrees. The shared `.codex/agent-usage.json` identifies TurnUp consistently across paths and machines. Separate contributors on the same machine use separate state directories. No account identifiers are needed.

Open `~/.turnup-agent-usage/reports/index.html` in a browser. Reports work offline and contain response tables, daily/dimension rollups, filters, pricing coverage, missing metadata, diagnostics and optional task-evaluation metrics. CSV tables are generated alongside the HTML. Reports are snapshots; `collect --scheduled` refreshes them. Data, queue, exports and reports remain outside Git. Raw transcript content is never copied into the ledger.

## Assign work and evaluate it

Find a root thread ID in the report. Assign it explicitly:

```sh
python3 -m tools.agent_usage bind --thread THREAD_ID --change CHG-K-003
python3 -m tools.agent_usage bind --thread THREAD_ID --change CHG-K-004 --wp WP-001 --from-turn TURN_ID
python3 -m tools.agent_usage annotate --root-turn TURN_ID --phase implementation --outcome accepted --evidence 'Synthetic checks passed; review record linked in change verification'
python3 -m tools.agent_usage report
```

A binding applies to the root thread and its descendants. A from-turn override applies from that root turn onward, leaving earlier work attributed to the previous change. Unknown parents, unresolved boundaries and unbound work stay visible rather than being guessed from a branch or change prefix. Historical assignment is manual. Changes may span multiple root tasks.

Phases: `planning`, `implementation`, `review`, `correction`, `delivery`, `other`. Outcomes: `accepted`, `needs_changes`, `abandoned`. Root tasks discovered from response records, collected root turns or root-thread lifecycle events can be annotated even when no response usage was recorded. Unknown IDs and child-only lifecycle/turn evidence do not create new root tasks. Annotations record your assessment, not proof supplied by the collector. Link evidence in change verification; do not paste private source content into evidence text. Evidence is deliberately shareable; exports redact recognizable local paths. Agent review and human PR review remain distinct.

For comparisons use similar task scope, source revisions and acceptance criteria. Compare cost, elapsed time, failures and correction effort across several tasks. Cost per accepted task includes only evaluated, fully credit-priced tasks with response records. Tasks without responses remain visible in HTML, task CSV and embedded report JSON with `usage_status=missing`; token/cost values remain unknown. Tasks with response records have `usage_status=observed`, while individual missing token fields remain unknown. The summary counts `tasks_without_responses` separately. Overlapping agent durations do not equal task wall time. Where lifecycle bounds are absent, report timing is an observed span of recorded activity, not complete execution time.

## Automatic updates on macOS and Windows

First preview concrete setup artifacts:

```sh
python3 -m tools.agent_usage setup
```

Then install on the current machine:

```sh
python3 -m tools.agent_usage setup --apply
```

Setup copies a stable runtime into the local state directory, pins the absolute Python executable, merges only this tool's entries into user-level Codex hooks, and registers a catch-up job every five minutes and at login. macOS uses a user LaunchAgent; Windows uses Task Scheduler without administrator privileges. Run setup again after upgrading the repository tool. It preserves unrelated hooks. Preview another platform with `--platform darwin` or `--platform win32`; applying a foreign platform is rejected. Keep the selected Python installation available.

Codex requires review/trust of new or changed hooks: use `/hooks` in the CLI to inspect and trust the generated definitions. The installer does not grant trust or bypass it. Restart/resume an eligible local Codex session if needed. Hooks use `SessionStart`, `SubagentStart`, `SubagentStop`, `Stop`, `Interrupt` and `SessionEnd`; they queue minimal lifecycle metadata and return without reading transcripts or sending model context. The scheduled collector scans registered session history independently, including active and archived descendants, and recovers delayed writes or missed hooks. A successful scheduled run persists known lifecycle observations and acknowledges only those events queued before that run. Events awaiting a session log, malformed files and rejected observations remain queued and are counted in the command summary; inspect these when the queue grows. Native task-start/completion records also supply root-turn elapsed bounds. A matching `Interrupt` closes the observed root-turn interval when no later restart leaves it open; interruption does not imply task acceptance.

Command hooks are supported in local orchestration. Current Codex documentation excludes local command hooks from cloud orchestration even when tools run locally; in that case the scheduled job still provides collection. Hook configuration alone is not proof of execution. Check `doctor`, queue activity and report freshness. [Official hook behaviour and trust rules](https://learn.chatgpt.com/docs/hooks).

If macOS denies writing the LaunchAgent file, inspect ownership of your personal `~/Library/LaunchAgents` directory. Repairing a root-owned directory requires administrator assistance; rerun `setup --apply` afterwards. Partial setup retains its manifest and runtime, and `doctor` reports whether scheduler registration was recorded. A job manually bootstrapped from the prepared plist can run every five minutes for the current login, but this does not establish startup after a future login. The implementation verification record distinguishes that fallback from persistent installation.

To remove automation while retaining data:

```sh
python3 -m tools.agent_usage uninstall
python3 -m tools.agent_usage uninstall --apply
```

Only this tool's managed hooks/job are removed. A changed or unknown handler is preserved rather than deleted. Removal retains the ledger and runtime so preserved references are not broken.

## Combine both members' records

Each member collects and exports locally:

```sh
python3 -m tools.agent_usage collect
python3 -m tools.agent_usage export
```

Share the generated `~/.turnup-agent-usage/exports/keith.jsonl` or `darryl.jsonl` through your normal file-sharing method. The recipient initializes their own ledger and runs:

```sh
python3 -m tools.agent_usage import PATH_TO_EXPORT.jsonl
python3 -m tools.agent_usage report
```

Exports contain normalized response usage, thread/turn relationships, explicit attribution/evaluation and safe coverage observations. They exclude transcript text, prompts, tool arguments/results, credentials, account identifiers, registry data and absolute source paths. Machine UUIDs are random local provenance identifiers. No automatic upload is configured. Treat reports/exports as project work metadata and share intentionally.

Evidence exports replace local paths and case-insensitive `file:` URI tokens with `[local-path]` while preserving HTTPS evidence links. Parentheses remain inside URI tokens; trailing Markdown punctuation may also be removed. Exporting leaves the original local annotation unchanged. Imports reject unsanitized file-URI fields. Regenerate older exports from the updated source to apply this redaction; existing copied automation runtimes still require the usual setup refresh.

Repeated imports and re-exported records do not duplicate usage. Imports validate the version/fields and reject conflicting response facts or metadata atomically; review the diagnostic rather than editing an export to suppress a conflict. Collectors never infer acceptance or human contribution from token consumption alone.

## Accounting and recovery

Each unique provider/response identity contributes its incremental `usage` once. Cached input and reasoning output are subsets of input and output, respectively. Cumulative thread/turn counters are reconciliation evidence and are not added again. Copied fork history is deduplicated; genuinely reprocessed context in another model response is counted. Automatic approval-review activity is shown separately when recorded.

Missing usage means unknown, not zero. Historical/unsupported log schemas are shown in coverage diagnostics. Codex JSONL is an internal, version-sensitive format; rerun synthetic checks and inspect diagnostics after a Codex upgrade. Partial trailing lines are retried; archive moves, truncation and rescans do not duplicate responses. `collect --all` replays sources without deleting normalized facts or manual attribution. Keep backups of the local state directory if you need durable history; deleting original Codex transcripts before collection loses evidence.

Pricing uses the versioned 18 October 2026 rate card bundled with the tool. Reports distinguish measured token counts, estimated Codex credits and API-equivalent model-token dollars. Known applicable service tiers adjust estimates; otherwise Standard speed is an explicit comparison assumption. Unknown models/rates remain unpriced, with separate credit/API coverage. These are not invoices, included subscription allowances or estimates of tool/container/third-party charges. API long-context/cache-write rules apply only where documented; reasoning is not charged twice. Update dated rates deliberately from official sources rather than fetching changing prices during collection. [Codex credit rates](https://learn.chatgpt.com/docs/pricing), [Sol API rates](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [Luna API rates](https://developers.openai.com/api/docs/models/gpt-6-luna).

The source CLI creates or repairs the selected state directory with POSIX mode 0700 and the ledger with mode 0600 before SQLite opens it. On Windows it uses a protected DACL granting access to the current user. Existing ledger permissions are repaired on the next ledger access without replacing its data. State-directory protection also runs before registry, hook-queue and setup writes; unrelated ancestor permissions are preserved. A selected state directory or ledger that is a symbolic link/reparse point is rejected, as is a nonregular or multiply hard-linked ledger. If protection fails, the command stops with a clear error.

Previously installed automation runs a copied runtime. Run the usual `setup --apply` from the updated checkout when you choose to refresh that runtime; changing repository source alone does not update existing hooks/jobs or repair their state. The review-pointer fix task did not reinstall automation or access/repair the real private ledger.

For recovery, run `doctor`, then `collect --all`, then `report`. A failed scheduled run retains queued events. Concurrent writers serialize through SQLite locking; failed imports roll back. Diagnostics omit raw transcript lines. A report with unresolved collection/pricing coverage is partial evidence rather than a complete project bill.

## Verification

```sh
python3 -m unittest discover -s tests/agent_usage -v
```

Tests use isolated synthetic data, including malicious fixture strings; they do not read real project transcripts or install real hooks/jobs. The tooling workflow runs the same suite on macOS and Windows with Python 3.11/3.14 when published. The new private-storage native Windows ACL test runs only on Windows and is skipped on macOS. Local results do not establish remote CI or Windows ACL/runtime success; see the change verification record for actual evidence and limitations.
