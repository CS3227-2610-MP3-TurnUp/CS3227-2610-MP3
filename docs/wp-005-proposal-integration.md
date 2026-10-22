# Test proposal assistance locally

Use the **WP-005 integration worktree**, not the main checkout or the old `/dev/proposal-evaluation` prototype. This guide has three paths: automated tests without credentials, browser testing with inference disabled, and one bounded live extraction using a synthetic PDF. Preview/Production inference is disabled in this increment.

## 1. Open the worktree and install

On Keith's current machine, run in Terminal:

```sh
cd /Users/keith/Documents/CS3227-2610-MP3/.worktrees/wp-005-proposal-integration
export PATH="/Users/keith/.nvm/versions/node/v24.21.0/bin:$PATH"
export COREPACK_HOME=/private/tmp/turnup-wp002-corepack
node --version
corepack pnpm --version
corepack pnpm install --frozen-lockfile
corepack pnpm db:generate
```

Expected versions: Node `v24.21.0`, pnpm `12.14.0`. The Corepack cache path above is local to this machine; another machine can use its own writable cache. The first install may need registry access. Keep this Terminal open for the following commands.

## 2. Run automated tests — no database or model credentials needed

```sh
corepack pnpm exec vitest run tests/proposal-assistance
corepack pnpm test
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
```

At the delivered snapshot the focused command has **57 passing tests across ten files** and the full suite has **310 passing tests across 33 files**. The focused suite covers the PDF parser, evidence validation, endpoint/access/admission behavior, provider failures and actual-component handler/SSR interactions. Provider/database doubles are used where applicable: these commands make no live inference calls and do not prove browser or hosted behavior. Prisma generation/type generation may update generated files; the delivered change does not include changes to `AGENTS.md` or `next-env.d.ts`.

## 3. Configure browser testing

Browser testing needs a **synthetic non-production Neon database** with the application's existing migrations, even if model inference is disabled: accounts, sessions and event drafts use the database.

Create a local environment file without overwriting an existing one:

```sh
if [ ! -f .env.local ]; then
  cp .env.example .env.local
fi
chmod 600 .env.local
```

Open `.env.local` in your editor. Set these entries; replace the two database URL placeholders privately:

```dotenv
TURNUP_ENVIRONMENT=development
DATABASE_ENVIRONMENT=non-production
DATABASE_URL=YOUR_ASSIGNED_NEON_POOLED_URL
MIGRATION_DATABASE_URL=YOUR_ASSIGNED_NEON_DIRECT_URL
AUTH_ORIGIN=http://127.0.0.1:3117
AUTH_SOURCE_MODE=local
AUTH_THROTTLE_SECRET=YOUR_RANDOM_64_TO_128_HEX_CHARACTER_SECRET
PROPOSAL_ASSISTANCE_LOCAL_SYNTHETIC=false
```

Use the pooled URL for `DATABASE_URL` with `sslmode=require`; the direct URL must identify the same assigned database and include `sslmode=require&sslaccept=strict`. `SHADOW_DATABASE_URL` is not needed for migration status/deploy or normal testing. Keep existing valid local secrets stable. For a **blank** `AUTH_THROTTLE_SECRET`, this command fills it without printing it:

```sh
node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const path = '.env.local';
const text = readFileSync(path, 'utf8');
if (!/^AUTH_THROTTLE_SECRET=\s*$/m.test(text)) {
  throw new Error('Keep the existing value, or clear the placeholder in your editor first.');
}
writeFileSync(path, text.replace(/^AUTH_THROTTLE_SECRET=\s*$/m,
  `AUTH_THROTTLE_SECRET=${randomBytes(32).toString('hex')}`), { mode: 0o600 });
JS
```

Do not copy Production settings or source an env file as shell code. Shell-exported variables override env-file values; use a local-development Terminal rather than one configured for Vercel/Production. `VERCEL` must be unset, and `VERCEL_ENV` must be unset or `development`.

Check migration status against that assigned database:

```sh
node --env-file=.env.local node_modules/prisma/build/index.js migrate status
```

If migrations are pending, apply the existing reviewed migrations **only to that assigned synthetic database**, then check status again:

```sh
node --env-file=.env.local node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.local node_modules/prisma/build/index.js migrate status
```

WP-005 adds no migration, but a fresh target still needs the foundation, gate, account and event migrations already in this worktree. Do not use `migrate reset`.

## 4. Start the app and test without inference

```sh
corepack pnpm dev --hostname 127.0.0.1 --port 3117
```

Next loads `.env.local`; `next dev` supplies `NODE_ENV=development`. Open **<http://127.0.0.1:3117/signup>**. Use this exact hostname and port throughout; `localhost` is a different origin from `127.0.0.1`.

1. Create a synthetic account with the **Organiser** role, or log in at `/login` with an existing local Organiser. Signup needs a unique 3–32 character lowercase username and a 15–128 character password that passes the existing password policy.
2. On `/organiser`, choose **Create event**. For an existing publication, enter its edit mode.
3. In **Proposal assistance**, choose a text PDF. Confirm that the single No file chosen status changes to its filename and size, Generate was disabled before selection, and selection alone does not send an extraction request. Remove proposal should restore No file chosen. You can observe requests in the browser Network panel.
4. Choose **Generate Findings**. With the flag still `false`, expect “Proposal assistance is not enabled in this environment.” Your entered event values must remain unchanged. This checks disabled-state handling; it does not test parsing/model output.
5. Remove the proposal. Enter values manually, choose **Save Draft**, then refresh. Saved values should remain. An incomplete draft can save; it cannot publish.

## 5. Enable one live synthetic extraction

Do this only when you have the current SoCLaaS key/model permission and a bounded test allowance for the assigned non-production database. Use synthetic source text only. This guide does not establish provider handling or allocate/reset a budget.

Stop the server with **Ctrl+C**. In `.env.local`, set:

```dotenv
PROPOSAL_ASSISTANCE_LOCAL_SYNTHETIC=true
SOCLAAS_API_KEY=YOUR_SOCLAAS_KEY
SOCLAAS_BASE_URL=https://soclaas-api.comp.nus.edu.sg/v1
SOCLAAS_MODEL=qwen3.5:9b
SOCLAAS_MAX_INPUT_BYTES=65536
SOCLAAS_MAX_OUTPUT_TOKENS=4096
SOCLAAS_TIMEOUT_MS=60000
FOUNDATION_PROBE_SOC_MAX_ATTEMPTS=YOUR_APPROVED_CUMULATIVE_ATTEMPT_CAP
FOUNDATION_PROBE_SOC_MAX_IN_FLIGHT=1
FOUNDATION_PROBE_SOC_MIN_INTERVAL_MS=YOUR_VERIFIED_INTERVAL_AT_LEAST_2100
FOUNDATION_PROBE_SOC_OUTPUT_TOKEN_BUDGET=YOUR_APPROVED_CUMULATIVE_OUTPUT_TOKEN_CAP
```

Replace all placeholders. These exact model/context/output/timeout settings are required by the current adapter. The interval must be at least `2100` ms and any stricter applicable provider limit. The cumulative output cap must have room for a full `4096`-token reservation for the next call.

**Existing gate state matters.** In the assigned database's SQL editor, inspect this read-only query before generating:

```sql
SELECT attempt_count, in_flight_count, reserved_output_tokens,
       max_attempts_limit, max_in_flight_limit,
       min_interval_ms, output_token_budget
FROM soc_probe_gate WHERE id = 1;
```

The row must exist; a call needs an available in-flight slot, remaining attempts and at least 4096 remaining reserved-output tokens under the **strictest stored/configured limits**. Attempt/token counters are cumulative, not reset by restarting the server. A previous lower stored cap cannot be increased by editing `.env.local`. Do not clear old leases or counters just to make this test run; use the existing [gate recovery guidance](wp-001-hosting-setup.md#6-temporary-synthetic-preview-probe) only under its stated conditions. Timeout/transport ambiguity may retain a lease even after the browser stops waiting.

Restart using the command in section 4.

### Prepare a synthetic PDF

Paste the following into Word or TextEdit, choose a **future** date at testing time, then export/print to PDF. Ensure text can be selected/copied in the PDF; a screenshot or scanned image is not supported.

```text
Campus Circuit Workshop
Purpose: Students build and test a simple LED circuit.
Start: 14 November 2026, 2:00 pm Singapore time (UTC+08:00).
End: 14 November 2026, 4:00 pm Singapore time (UTC+08:00).
Location: Cedar Hall.
Capacity: 20 students.
Fee: Free admission.
Open to: All students using TurnUp.
Preparation: Bring a laptop. No prior electronics experience is required.
```

### Perform the walkthrough

1. Open an owned editable event. Select the synthetic PDF and click **Generate Findings once**. One request may take up to 60 seconds. Do not repeatedly retry or double-click after an uncertain failure.
2. Inspect the original event textboxes: validated known values should already be prefilled, with exact source quotes and page numbers immediately below their matching inputs. A live model may return partial or rejected findings; record that outcome rather than treating HTTP success as extraction accuracy.
3. Generate replaces snapshot-existing fields only where a valid known finding was returned; missing/conflicting/invalid/unprocessed fields retain their previous values. Known findings need no individual Apply step. Conflicting findings offer up to three choices: select one to fill just that field and remove its suggestions, keeping its chosen evidence. Edit a prefilled value and verify its old evidence is removed or marked outdated. Nothing saves or publishes automatically, and newer edits made while Generate is running must reject the old response.
4. When the PDF provides a complete supported date/time, the existing Start/End calendar fields should already show the corresponding SGT values; no duplicate calendar entry or confirmation is required. The model returns canonical UTC ISO timestamps, validated before prefilling. Missing/incomplete/ambiguous date/time findings remain unresolved; correct those original inputs manually. When the PDF omits a timezone, complete dates/times are interpreted as Singapore time. Explicitly stated zones take precedence; ambiguous stated zones still need clarification.
5. Choose **Save Draft** and refresh. Prefilled and saved public field values remain; selected PDF/private evidence disappears. Do not expect evidence to survive saving/reloading the event version.
6. Choose **Preview saved draft**. Verify it shows public fields only, without private review notes or the PDF. Publication still requires explicit approval; publishing is optional for this test.
7. For a separate test within the remaining allowance, omit fee/capacity or include conflicting locations in another synthetic PDF. Expect missing/conflicting/partial findings, not invented facts. For conflicting fields, verify that no value is automatically selected; click a supported alternative and check only that textbox changes and its suggestions disappear. Other fields and findings should remain unchanged. Date/time choices show readable SGT values (for example 14/11/2026, 09:00 PM); selecting one must populate the correct original date/time input. More than three competing values should be shortlisted to three supported choices. Purpose/description wording should use second person or an impersonal activity description, retain supported meaning and avoid first-person or third-person participant narration. Check that location identifies the supported venue or remote medium (for example Zoom or YouTube), Open to identifies the stated target participants, and preparation preserves participant prerequisites/advance tasks/materials and whether they are required or recommended. Complementary details such as a venue plus room, or explicitly hybrid on-site and online attendance, should combine rather than create false conflicts. Conflicts require incompatible information serving the same purpose for the same event fact/context. Evidence quotes remain exact. Additional Generate clicks each consume admission/budget.

## Troubleshooting and stopping

| Symptom | Check / next action |
| --- | --- |
| Account access unavailable | Check local database connectivity/migrations, environment labels, `AUTH_SOURCE_MODE` and valid hex throttle secret. |
| POST rejected / origin error | Use `http://127.0.0.1:3117` in both browser and `AUTH_ORIGIN`; restart after config changes. |
| Assistance disabled | Run `next dev`, enable the local flag, check development/non-production labels and remove hosted runtime labels. `next start`/Production is intentionally disabled. |
| Not configured / invalid configuration | Check all provider and gate entries, replace placeholders and use the exact fixed profile above. |
| Temporarily limited | Check the per-owner five-attempt/15-minute window and shared gate's cumulative counters/leases. Waiting only helps the rolling owner window or interval, not exhausted cumulative budgets. |
| PDF unreadable | Use an unencrypted text PDF ≤4,000,000 bytes and ≤20 pages; no OCR. Parser limit: 48,000 extracted-text bytes / eight seconds. |
| Timeout, invalid response or unsupported evidence | Keep manual fields; inspect the recorded outcome. Check remaining budget/lease state before another deliberate attempt. Do not weaken quote validation to force acceptance. |
| Event changed | Reload saved values and review current fields before generating again. |

When finished, stop the server with **Ctrl+C** and set `PROPOSAL_ASSISTANCE_LOCAL_SYNTHETIC=false` before the next start. No test flow here requires deployment, a public probe token, resetting the database or running the old evaluation CLI.

## Evidence and deferred work

[Verification](../changes/CHG-K-010-wp-005-proposal-integration/verification.md) records checks actually run. Browser file-picker automation and the authenticated live-model walkthrough were not completed during implementation; the steps above are instructions, not passed results. A later single bounded synthetic guide-PDF check using prompt v3 directly exercised parser → model → validator → prefill and returned Campus Circuit Workshop with valid title evidence. That live check used v3; the current v6 field-semantics, punctuation, description-rephrasing and conflict-identification instructions have deterministic test coverage but have not been checked against the live model. This is no browser or general-accuracy guarantee. Public-content/FAQ generation (ORG07), durable private-preparation storage and hosted inference remain deferred. Manual completion and existing Save Draft → Preview → Publish remain available without model inference.
