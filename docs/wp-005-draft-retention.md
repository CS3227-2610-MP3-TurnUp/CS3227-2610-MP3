# Private draft retention

CHG-K-013 covers Organiser private drafts/preparation, not Student registration/thread/account cleanup. Read its [handoff](../changes/CHG-K-013-wp-005-draft-retention/handoff.md) and [verification](../changes/CHG-K-013-wp-005-draft-retention/verification.md) for the exact delivered snapshot and executed checks.

## Behaviour

A new draft starts a30-day clock. Successful Save Draft and accepted persisted PDF extraction restart it using database time; opening/listing, unsaved typing/confirmations, FAQ generation, previews and failed/stale actions do not. Owner-only warnings appear in event cards/editor fromday23, displaying Singapore time. Cancelled events have cleanup guidance without unavailable Save/Generate instructions. Warnings/private expiry metadata are absent from public previews/snapshots.

Atday30 a record becomes eligible for cleanup; a later successful sweep performs removal. Never-published drafts and cascading preview approvals are deleted. Previously published events keep state/current publication/history and registration relationships: private fields return to the latest validated publication, private preparation clears and old preview approvals/revisions become stale. Corrupt/missing publication records fail closed and rotate behind unexamined candidates. No global90-day personal-data cleanup is implemented here.

## Migration and local use

`20261023010000_draft_retention` adds private activity and cleanup-check timestamps. Existing rows receive a fresh30-day migration-time window. New drafts initialise activity through the event service/database clock. The assigned development/non-production target has this migration checksum-verified; other targets need normal migration status/deploy. Regenerate the Prisma client and restart an existing development server after applying it. Do not use migrate reset.

Normal owner notices do not enable deletion. The internal worker is default-off. Configure privately for an assigned target only:

```dotenv
DRAFT_RETENTION_ENABLED=true
CRON_SECRET=YOUR_PRIVATE_RANDOM_SECRET_OF_AT_LEAST_32_BYTES
```

Keep existing environment/DB labels correct. Supported pairs are development/non-production, hosted Preview/non-production, and hosted Production/production. Missing/invalid configuration or bearer authentication fails before database access. Credentials are not ordinary account sessions. Do not publish the secret or put it in a URL.

An operator may call `GET /api/internal/draft-retention?dryRun=true` with `Authorization: Bearer <CRON_SECRET>`. Dry-run changes no records and reports a bounded candidate count, not a guarantee that every candidate is deletable. After review, `GET /api/internal/draft-retention` performs at most50records. Output is counts only. Check unavailable counts privately; never weaken publication validation to force a purge. Repeated calls are safe; a fuller batch may require another invocation. Cleanup remains disabled unless explicitly opted in.

## Hosted scheduling and recovery

`vercel.json` schedules daily UTC midnight. Vercel Cron targets Production only; Preview/local require an explicit operator request. Hobby timing can vary within the scheduled hour, so expiry is eligibility rather than an exact deletion instant. The route requires the same server-only secret for scheduled requests. Scheduler/configuration activation is a separate operator action, and no production cleanup was run by agents. See [Vercel cron](https://vercel.com/docs/cron-jobs), [security](https://vercel.com/docs/cron-jobs/manage-cron-jobs), and [daily limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) checked23October2026.

Active database rows/preview copies are covered; recoverable provider backups may retain earlier versions. Record the actual account's backup/history window separately; do not claim immediate erasure from backups. Keep restores quarantined, preserve the original activity timestamps and rerun retention before serving restored data. For a pre-retention backup, reconstruct conservative expiry from the original activity/migration record or remove expired private data before release; never grant a new grace window merely because a backup was restored. Production private-data recovery is an operator task, not an agent test.

Automated tests use synthetic doubles; root additionally exercised the actual worker on temporary assigned non-production fixtures, including row-lock skip/freshness between claim and processing. These checks do not prove hosted scheduler activation, universal concurrency behaviour, provider backup erasure or the deferred labelled model evaluation.
