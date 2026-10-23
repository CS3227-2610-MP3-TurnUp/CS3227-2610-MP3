# User Guide screenshot capture checklist

The built-in browser was unavailable during guide preparation, so manual captures
were requested. On 23 October 2026 the user supplied 12 original PNG screenshots,
now embedded in the User Guide without image edits. These cover UG-01 to UG-09 and
UG-14. **Still required: UG-10, UG-11, UG-12 and UG-13 (Organiser).**

UG-03 shows the top of one event card, and UG-14 shows only the upper settings page.
Full-card/full-profile captures and mobile views are optional supplements. The assistant
image displays the Live AI label; no separate provider or deployed-revision verification
was performed when adding these images.

Use an assigned demonstration environment with synthetic accounts/events. The current
public Production application address is
`https://turnup-nine.vercel.app/`, but a different test deployment may be appropriate
for mutations. Record the deployed revision and date with the final captures. Do not
include passwords, cookies, API keys, real contact details or private participant data.

| Placeholder | Suggested filename under this folder | Required visible content |
| --- | --- | --- |
| UG-01 | `ug-01-signup.png` | Signup roles, empty password, Create account. |
| UG-02 | `ug-02-login.png`, `ug-02-account-menu.png` | Empty-password login and expanded authenticated account menu. |
| UG-03 | `ug-03-discovery.png`, `ug-03-discovery-mobile.png` | Genuine published cards, search/filter/navigation; desktop and ~375 px-wide view. |
| UG-04 | `ug-04-event-details.png`, `ug-04-registered-event.png` | Public facts/availability; join and already-registered management states. |
| UG-05 | `ug-05-registration.png` | Event form, synthetic contact, sharing confirmation; actual question count. |
| UG-06 | `ug-06-registration-saved.png` | Actual committed success summary and View My Events. |
| UG-07 | `ug-07-my-events.png` | Own active record/actions; optionally changed/cancelled/rejoin state. |
| UG-08 | `ug-08-correction.png` | Captured form, event context and Save corrected submission. |
| UG-09 | `ug-09-assistant.png`, `ug-09-assistant-mobile.png` | Open assistant and genuine labelled reply; avoid spending live allowance without approval. |
| UG-10 | `ug-10-organiser-dashboard.png` | Own draft/published cards, Create event and sort controls. |
| UG-11 | `ug-11-private-draft.png` | Grouped editor, SGT labels, counters and save/preview; full-page or sequential captures. |
| UG-12 | `ug-12-public-preview.png` | Exact event/form preview, approval checkbox and publish action. |
| UG-13 | `ug-13-live-publication.png` | Live publication and Edit/Withdraw/Cancel actions; optional withdrawn notice capture. |
| UG-14 | `ug-14-settings.png` | Credential/profile summaries and optional blank-password inline editor crop. |

Capture around 1280 px wide for desktop and 375 px for mobile, at ordinary browser
zoom. Ensure labels are readable, avoid clipping the relevant action, and use
full-page/two sequential images for a tall editor. Native dialogs may need separate
captures; do not confirm permanent deletion/cancellation solely to photograph them.

Replace a placeholder with Markdown, for example:

```markdown
![Published event with schedule, remaining places and registration action](assets/images/ug-04-event-details.png)

*Figure UG-04. An upcoming demonstration event before registration.*
```

Then remove that placeholder's capture instructions. Update the guide's initial
awaiting-capture notice only when every required figure is supplied or explicitly
dispositioned. Use the same image files on GitHub and Pages; don't embed a temporary
local path. `node workflow/validate-docs.mjs` checks image paths and reports remaining
placeholders. `--require-screenshots` deliberately fails until placeholders are gone.
