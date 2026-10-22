# WP006 hosted event Q&A — approved plan, 22 October 2026

Status: approved by Darryl on22October2026 with200total Preview attempts;implemented locally,pending deployment checks. Extends D006, without allocating a new change ID. Darryl owns Student behavior; Keith owns deployment/database operation and shared provider contracts. Main agent only. Preserve current work and private settings. Existing delivery is PR28, branch preview/WP-006, source724189d; its Preview deploy and PR checks passed. The deployed chat is intentionally disabled.

## Why the current slice is local

The approved earlier plans explicitly required loopback-only source/answer routes and local file admission. `localDevelopment()` rejects Vercel; the event page omits the widget there. Removing that check would still leave a file-based allowance that cannot coordinate concurrent serverless instances. The existing durable `soc-probe-gate.ts` is a singleton for synthetic probes and rejects production databases; reuse its locking/reservation pattern, not its counters or tables for product traffic. No production-ready WP005 admission service exists in this checkout.

## Proposed smallest implementation

1. Add authenticated product source/answer endpoints, separate from the development harness. Reuse current publication projection, server-only SoCLaaS adapter, final session/revision/availability/evidence checks and natural corner chat. Keep synthetic development routes disabled on Vercel.
2. Add durable Student-specific admission in Neon: atomic global budget plus per-account throttling, single in-flight lease, database clock, unique request/reservation IDs, idempotent release and bounded abandoned-lease recovery. Reserve before inference, never refund spent attempts/output reservations on failure, never hold a DB transaction during inference. Database/configuration failure denies inference. Do not store prompts/replies/private event content in the admission ledger.
3. Make transport select fixed local versus hosted endpoints through server-owned page configuration. No browser-supplied provider URL, key, source, actor or limits. Preserve request binding, stale-answer suppression, lifecycle checks and friendly failures.
4. Add a separate hosted enable switch and explicit environment-bound budget activation. Missing configuration, expired policy or missing migrations disables hosted answering. Production stays disabled until its own key/budget/deployment prerequisites are confirmed. Local allowance/configuration is untouched; do not upload .env.local or allowance.json.

## Approved limits

For the initial **Preview-only** budget: 200 total attempts, 200000 reserved output tokens, 1000 output tokens/request, 20000ms provider timeout, 65536 input bytes, 10-second global spacing, one concurrent generation and five attempts/account per15minutes. Existing32KiB source ceiling stays. This is the explicitly approved hosted budget, separate from the earlier local150 limit; they do not reset or renew any allowance. Activate once with an explicit approval identifier and seven-day expiry from first activation. Redeploy/retry does not renew it. Any later renewal or Production activation needs explicit operator authorisation and account quota permission; no daily automatic reset is proposed.

## Exact intended paths

- New `src/server/student-assistant/hosted-policy.ts` and `hosted-admission.ts`.
- New `src/app/api/student/events/[eventId]/assistant/source/route.ts` and `assistant/answer/route.ts`.
- Update `src/server/student-assistant/publication-answer.ts` to require the server-selected admission adapter; local adapter remains for local callers. Reuse `publication-source.ts`, `publication-lifecycle.ts` and `answer.ts` unchanged unless focused checks reveal a contract defect.
- Update `src/app/student/events/[eventId]/page.tsx`, `src/features/student-assistant/publication-chat.tsx`, `publication-transport.ts` and `publication-answer-transport.ts` for the fixed endpoint choice.
- Add only Student admission models to `prisma/schema.prisma` and one additive migration under `prisma/migrations/<next_timestamp>_student_ai_admission/migration.sql`; coordinate schema ownership/migration deployment with Keith before applying to a shared target.
- Add a server-only activation utility `scripts/activate-student-ai-budget.mjs` with explicit target/approval/expiry checks and no reset/increase operation.
- New focused tests `tests/student-assistant/hosted-policy.test.ts`, `hosted-routes.test.ts` and disposable `hosted-admission.integration.test.ts`; extend the existing publication-answer/transport/chat suites.
- Update `.env.example` with non-secret hosted switch/policy placeholders, D006records, this plan, log07 and relevant WP006/privacy/handoff/scenario documentation. Never commit local keys/settings/custom agents/skills.

## Acceptance and deployment checks

Mock provider only during implementation. Check anonymous/Organiser/cross-origin denial, missing/expired/disabled policy, no client limit/source overrides, correct Student/current publication, revision replacement/withdrawal/cancellation/session expiry during generation, corrupt output/evidence, provider timeout/failure, no automatic retries, source-only refresh and corner-chat preservation. With disposable SQL check multi-instance admission, user/global limits, duplicate requests, attempts/token reservation across redeploy, lease expiry/late release and failure-closed behavior. Run affected tests/types/lint and one production-mode build/HTTP route check; preserve previous independent evidence and label new verification main-agent-only.

After approval and implementation: apply the reviewed additive migration to the assigned Preview database through the existing authorised deployment process; configure the six SOCLAAS settings privately in Vercel Preview and the explicit hosted policy/activation; verify exact stable AUTH_ORIGIN, model permission/key owner/quota, published-event availability and function timeout compatibility. One live Preview smoke request requires separate explicit bounded authorisation; no live request is included in plan preparation or offline implementation. Production uses its own database, environment settings, approved budget and normal master/promotion workflow after Preview acceptance; no production rollout is authorised by this plan.

No contact schema, inbox/history, broader FAQ timing/size policy, provider/model change or unrelated registration fix is included. Keith's future public organiser contact remains a separate dependency; current uncertainty uses text guidance only.

## Implementation detail and deployment handoff

Product HTTP boundaries live in new src/server/student-assistant/hosted-http.ts;existing publication-answer.ts already accepts the server-selected admission adapter and remains unchanged. Fixed hosted transport mode is passed by the server page. The existing workflow now activates this approved budget after migrations from Vercel's target-matched Preview env file and supplies only the nonsecret STUDENT_ASSISTANT_ENABLED=true runtime override for preview/WP-006. Other Preview branches and Production do not implicitly opt in. The source-only anonymous401smoke uses the stable alias and consumes no AI allowance. scripts/activate-student-ai-budget.mjs validates the canonical runtime DB config and approved qwen3.8:27b model,never reads developer .env.local,never prints secrets,and refuses expired/disabled/mismatched existing budgets without resetting them. Database enabled=false is an operator kill switch;expiry is seven days after first activation and redeploys preserve it. The additive migration seeds no budget in any environment. Shared migration application is performed only by the protected target-specific deployment workflow authorised in this request.
