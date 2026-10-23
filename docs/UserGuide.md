---
title: User Guide
description: Learn TurnUp's implemented account, event, registration and assistant workflows.
---

# TurnUp User Guide

TurnUp is a web application for campus events. **Students** discover published events,
register and manage their own submissions. **Organisers** prepare private drafts,
review public content and publish or remove events from discovery.

This guide describes the code at **55d9cb7, 23 October 2026**. Availability on a hosted
deployment also depends on its deployed revision and configuration. Planned features
are listed separately at the end; they are not instructions for working controls.

> **Screenshots:** account and Student captures were supplied by the project team on
> 23 October 2026. The four Organiser figures (UG-10 to UG-13) remain marked placeholders.
> Screenshots illustrate the displayed interface; they do not establish the deployed
> source revision or replace acceptance-test evidence.

## Contents

- [Getting started](#getting-started)
- [Finding your way around](#finding-your-way-around)
- [Student features](#student-features)
- [Organiser features](#organiser-features)
- [Account settings](#account-settings)
- [Troubleshooting](#troubleshooting)
- [A short tester walkthrough](#a-short-tester-walkthrough)
- [Current limitations](#current-limitations)

## Getting started

### Open TurnUp

Open **[TurnUp](https://turnup-nine.vercel.app/)** in your web browser. No application
download is required. This is the project team's selected Production address; use a
team-provided test deployment if instructed to do so. Different deployments may have
different accounts and event data.

> **Using school Wi-Fi?** If TurnUp does not load, try mobile data or another permitted
> network. Some managed networks may restrict access to Vercel-hosted sites. If the
> problem continues, report the URL and error message to the project team or your
> network administrator. Availability depends on the network; this is not a blanket
> restriction on school networks.

The Production site is publicly accessible. Create a TurnUp account or log in to use
your role's features. The documentation website is separate from the application:
it does not store registrations or sign users in.

### Create an account

1. On the home page, select **Create an account**.
2. Choose **Student** or **Organiser**. Your account has one fixed role; there is no role
   switch after signup. Use separate accounts to test both roles.
3. Enter a username containing 3–32 ASCII letters, digits or underscores. It is stored
   in lowercase, and equivalent usernames cannot be registered twice.
4. Enter a password containing 15–128 Unicode characters. Spaces are preserved; common
   passwords from the application's starter blocklist are rejected.
5. Select **Create account**. Success signs you in and opens your role's workspace.

Signup requires only username, password and role. A Student's optional global profile
can be filled in later.
The eye control shows or hides the password while you enter it.

![Account creation with Student and Organiser role choices and blank credential fields](assets/images/ug-01-signup.png)

*Figure UG-01. Create an account by choosing a role and entering your credentials.*

### Log in and out

Select **Log in**, enter your username and password, then select **Log in**. The stored
role determines the destination; there is no login role selector. Repeated attempts may
temporarily be limited. Wait before retrying instead of repeatedly submitting.

Open the account menu at the upper right and select **Log out** when finished. Logging
out ends the current session. Sessions also expire after 30 minutes of inactivity or
eight hours from issue. If a protected operation asks you to log in again, do so before
continuing. A password change signs you out on all devices.

![Login form with username and password fields](assets/images/ug-02-login.png)

*Figure UG-02. Enter your credentials to log in.*

![Expanded account menu with Profile and Log out](assets/images/ug-02-account-menu.png)

*Figure UG-02. Open the account menu to access settings or log out.*

## Finding your way around

| Location | Purpose |
| --- | --- |
| **TurnUp** brand | Returns to your role's workspace. |
| **Discover events** | Student search and upcoming/started-event browsing. |
| **My Events** | Your own registrations, available corrections and cancellation. |
| **Your events** | Organiser-owned drafts and previously published events. |
| Account menu → **Profile** | Account settings; Students also see their optional profile. |
| **Back to event / Back to My Events / Back to your events** | Returns from a contextual screen. |

The navigation follows your fixed role. Organiser controls do not appear in a Student
workspace, and knowing another role's URL does not grant access. On smaller screens,
the primary navigation wraps beneath the brand and account menu.

## Student features

### Discover events

1. Open **Discover events**.
2. Type part of an event title into **Search by title**. Matching ignores letter case.
   Searches are limited to 150 characters; the page explains invalid input.
3. Use **Show events** to choose **Upcoming** or **Started / past**.
4. Select a card to open that event. Results are ordered by start time, earliest first,
   and dates are displayed in Singapore time (SGT).

Only currently published events appear. An empty result is not a service error: clear
the search or change the event filter. **Refresh list** fetches current results. Cards
show the title, start, location, fee text and organiser; remaining places and your own
registration status appear when available.

![Discover events page with title search, Upcoming filter and an event card](assets/images/ug-03-discovery.png)

*Figure UG-03. Search and filter published events. This capture shows the top of an upcoming event card.*

### Review an event

The details screen shows the published title, organiser, schedule, purpose/description,
location or participation instructions, fee status, eligible audience, preparation and
any FAQ/Other text. The registration panel shows capacity, remaining places and your
own status. Use **Refresh event** to check current information.

- **Continue to registration** opens the form; it does not reserve a place.
- **Manage your registration** opens My Events when you already hold a place.
- A full event has no join action. A started event is closed for registration changes
  under its current schedule.
- A withdrawn or cancelled event is unavailable through Student details/discovery.
- Fees are information supplied by the Organiser. TurnUp does not take payments.

![Published jog event with schedule and Continue to registration beside 30 remaining places](assets/images/ug-04-event-details.png)

*Figure UG-04. Review the event and available places before registration.*

![Registration panel confirming a place with Manage your registration](assets/images/ug-04-registered-event.png)

*Figure UG-04. After registering, the panel confirms your place and provides registration management.*

### Register for an event

1. Select **Continue to registration** on an upcoming event with available places.
2. Review or enter your **Name** and **Phone number or Telegram handle**. Both are
   required for this event even if your global profile is empty.
3. If supplied by the published form, answer its questions. Supported controls are short
   text, long text, a single choice and multiple choices. Complete every required answer;
   optional single-choice answers have a **Clear choice** control.
4. Tick **I confirm sharing my details and answers with the organizer.**
5. Select **Confirm and register**. Only a successful submission saves a place.
6. On **Registration saved**, select **View My Events** to check your current status.

A phone number must contain 7–15 digits after permitted separators are removed; an
initial `+`, spaces, hyphens and parentheses are accepted. A Telegram handle starts
with `@` followed by 5–32 letters, digits or underscores. Names allow up to 100
characters. A form can contain zero questions; the required event contact and sharing
confirmation still apply.

Opening the form holds no seat. If another Student takes the last place, or the event
or form changes before your submission, the server may reject it. Read the feedback,
return to current event information and review again. Repeated clicks are disabled
while submitting. If the response is uncertain, check My Events before starting a new
registration attempt.

![Event registration form with name, contact, sharing confirmation and Confirm and register](assets/images/ug-05-registration.png)

*Figure UG-05. Review your event-specific contact details and confirm sharing before registering.*

![Registration saved confirmation with View My Events](assets/images/ug-06-registration-saved.png)

*Figure UG-06. A successful submission displays Registration saved. Open My Events to check current status.*

### My Events: check, correct, cancel and re-register

Open **My Events** and use **Refresh My Events** to check current state. Each record
shows **Registered** or **Registration cancelled**. Published events may show fields
that changed since you joined; an active place is preserved by publication edits.
Withdrawn/cancelled records show an unavailable notice rather than old public excerpts.

| Action | When it is available | Result |
| --- | --- | --- |
| **View current event** | The event remains published. | Opens its current public details. |
| **Correct submission** | Your registration is active, the event is published and it has not started. | Opens the form and values captured for your submission. |
| **Cancel registration** | Your registration is active, the event is published or withdrawn and it has not started. | Cancels your place after a successful update. |
| **Register again** | You cancelled, the event is published, has not started and has room. | Opens a fresh registration using the current published form. |

For a correction, edit your contact/answers, confirm sharing again and select **Save
corrected submission**. It uses the form wording you originally submitted, even if the
Organiser later publishes another form. Correction does not take another place.

There is no undo button for a successful cancellation and no held seat afterwards.
Re-registration depends on current availability. Registration, cancellation,
re-registration and correction all stop when the event starts. Editing your optional
profile does not update these captured event submissions.

![My Events active registration with View current event, Cancel registration and Correct submission](assets/images/ug-07-my-events.png)

*Figure UG-07. Manage an active registration from My Events.*

![Correct your submission form with contact fields, sharing confirmation and Save corrected submission](assets/images/ug-08-correction.png)

*Figure UG-08. Update the captured submission for this event.*

### Ask the event assistant

When enabled for the deployment, **Ask about this event** appears on an event page.
Open it, enter a question of up to 1,000 characters and select the arrow labelled
**Send question**. Enter sends; Shift+Enter inserts a new line. The assistant currently
supports future-start published events and uses their approved public details and
published form wording, not live remaining places or your submitted answers.

Replies are short conversational text. If a fact is absent, the assistant may say it
cannot confirm it and suggest checking with the Organiser. Clarification, unrelated
questions and technical failures have separate outcomes. Asking to join does not
register you. Use the registration form to obtain a place.

**Hide chat**, the close control or Escape closes the panel. Opening chat or returning
to the window checks source availability without automatically asking another question.
If published information changes, old replies are invalidated. If a recovery control
appears, **Refresh event information** checks the source; it is not an inference retry.
**Try again** explicitly retries a failed question when offered.

Up to 20 recent saved turns for your account, selected event and current publication
can be restored. Closing chat or logging out does not itself erase them. A changed
publication, unavailable event, expiry or a history-service failure may prevent their
display. History is not sent to the model as conversation context: make a new question
self-contained rather than relying on “what about that?”.

Availability is bounded. Current hosted code limits a Student to 20 admitted requests
per rolling 15 minutes, with shared spacing and a finite deployment-wide allowance.
Failures may consume allowance. A busy or unavailable assistant is not evidence that
an event fact is absent. You can still read public event information.

![Event assistant answering a reporting-time question using the published start time and acknowledging uncertainty](assets/images/ug-09-assistant.png)

*Figure UG-09. The supplied capture is labelled Live AI in the interface. The reply gives the published start time and asks the Student to check with the organiser about a separate reporting time.*

## Organiser features

### Find and create your events

**Your events** contains only events owned by your Organiser account. Search by title
and sort by **Title**, **Last edited** or **Start time**, in either direction. Select
an event card to open it. **Create event** creates a new private, initially incomplete
draft. Drafts may be saved before every publication field is complete.

> **Screenshot UG-10 — Organiser dashboard**
>
> Capture `/organiser` with synthetic draft and published cards, Create event and the
> search/sort controls. Ensure the screenshot is from an Organiser account.

### Prepare a private draft

The editor groups fields under **Event details**, **Participation** and **Additional
information**. Enter the title, purpose/description, location/participation instructions,
start/end, fee status, audience, preparation and capacity. FAQ/Other is optional. Use
explicit text such as “Free” or “None” where appropriate; blank required fields do not
mean free entry or no prerequisites.

| Field | Maximum |
| --- | --- |
| Title | 150 characters |
| Purpose / description | 4,000 characters |
| Location / participation instructions | 1,000 characters |
| Fee status | 500 characters |
| Open to | 1,000 characters |
| Prerequisites / preparation | 2,000 characters |
| FAQ / Other | 4,000 characters |
| Capacity | Whole number from 1 to 10,000 |

Public content also has combined character/byte limits; character counters do not
override those checks. Enter times in **Singapore time**. End must follow start.
First publication and republication require a future start. An already published
event may retain an unchanged past start for content-only updates; a changed start
must be in the future.

Select **Save Draft** to persist privately. **Cancel Editing** discards unsaved edits;
**Discard saved changes** restores the working draft from the last publication after
confirmation. These are different from cancelling an event. Leaving an edited draft
through a navigation link asks whether to discard unsaved edits.

> **Screenshot UG-11 — Private working draft**
>
> Capture a synthetic completed draft with its grouped sections, character counts and
> Save Draft / Preview saved draft controls. Use a full-page capture or two ordered
> images if the form is taller than the viewport. Include SGT labels.

### Preview and publish

1. Save your draft. Unsaved edits must be saved before previewing.
2. Select **Preview saved draft**. Required-field or timing errors must be corrected.
3. Read **Public Preview**, including any published registration form.
4. Tick **I reviewed and approve this exact public content.**
5. Select **Publish approved event** (or **Republish approved event** after withdrawal).

Approval covers that saved snapshot. If another tab changes the event or refreshes
its approval, reload and preview again. Publication can also reject a capacity lower
than the number of active registrations. A preview or checked checkbox alone does not
mean the event is published.

> **Screenshot UG-12 — Exact public preview**
>
> Capture Public Preview with the actual event/form content, approval checkbox and
> Publish approved event action. Include a second crop if needed; do not publish a real
> event just to obtain this screenshot.

### Edit, withdraw, cancel or delete

Previously published events open on **Current Live Publication** or **Last Publication**.
Select **Edit Live Publication** to change the private working draft, then save,
preview and approve again. Until successful publication, Students see the previous
public revision.

| Control | Effect |
| --- | --- |
| **Withdraw** | Makes a published event unavailable publicly. The owner can edit and review it for republication. |
| **Cancel Event** | Permanently cancels a published/withdrawn event. It cannot be republished. |
| **Delete draft** | Permanently removes a draft that has never been published. Previously published events cannot use this action. |
| **Discard saved changes** | Restores private fields/form from the last publication; does not delete the event or publication. |

Read the native confirmation carefully: it names the event and the consequence.
Cancelling an event is distinct from a Student cancelling one registration. Organisers
cannot register through their Organiser account.

> **Screenshot UG-13 — Live publication actions**
>
> Capture Current Live Publication with Edit Live Publication, Withdraw and Cancel Event.
> If illustrating withdrawal, use a disposable synthetic event and capture Last
> Publication with its unavailable notice and Edit for republication. Do not click a
> permanent destructive action solely for a screenshot.

## Account settings

Open the account menu and select **Profile**. Both roles can edit username/password;
Students additionally see **Student profile**.

- **Username:** select Edit, enter the replacement and current password, then Save.
  A successful actual rename keeps you signed in and preserves event/registration
  ownership. Duplicate names and stale edits fail rather than overwriting another user.
- **Password:** select Change, enter the current password and matching new passwords,
  then Save. An actual password change signs out **all devices**. Log in using the new
  password. Saving the unchanged canonical value does not revoke sessions.
- **Student profile:** edit Name or Phone number separately; both are optional.
  Leaving a field blank removes it. The profile phone field accepts phone numbers,
  not Telegram handles; the event-specific contact field also accepts Telegram.
  Changes affect future prefills and do not rewrite earlier event submissions.
- **Cancel** closes the inline editor. Conflict feedback may offer **Reload saved
  values for review** or **Reload settings** before saving again.

![Account settings with username Edit, password Change and the start of the optional Student profile](assets/images/ug-14-settings.png)

*Figure UG-14. Account settings provides credential controls and optional profile editing. This capture shows the upper portion of the page.*

## Troubleshooting

| What you see | What to do |
| --- | --- |
| Page will not load on school Wi-Fi / connection timeout | Try mobile data or another permitted network. If it works there, report the affected network, URL and exact error to the project team or network administrator. A network-specific failure does not identify its cause by itself. |
| Account access is unavailable | Retry later and report the page/time to the team. It is a service/configuration failure, not proof of invalid credentials or database quota exhaustion. |
| Invalid login / duplicate username | Recheck credentials or choose a different username. |
| Too many attempts | Wait for the relevant limit window; repeatedly clicking does not reset it. |
| Event changed / stale form | Refresh current information and review before a new operation. Check My Events if an earlier submission may have succeeded. |
| No events / no matching events | Clear search, change Upcoming/Started / past, or ask the Organiser to publish an event. |
| Event unavailable | It may have been withdrawn/cancelled or access may be unavailable. Return to discovery/My Events. |
| No registration action | Check full/started/already-registered status. Only eligible actions appear. |
| Assistant unavailable / busy / took too long | Read the published details; wait or use an explicit retry when offered. Do not treat the failure as an answer about the event. |
| Saved conversation could not be loaded | Existing history is not currently available for display. A fresh question may still be possible; do not assume it erases saved records. |

## A short tester walkthrough

Use two **synthetic** accounts, one per role, and a demonstration event on the team's
designated test deployment. There are no built-in demo
credentials. Do not enter real attendee details or use Production destructive actions
to test error cases.

1. As Organiser, create a future event with capacity 2, explicit fee/audience/preparation
   text and complete required fields. Save, preview, approve and publish it.
2. Log out; sign in as Student. Find the event, inspect details and register with
   synthetic contact values plus sharing confirmation.
3. Check My Events. Correct a submission before start and verify the success summary.
   Change your optional profile and confirm that the earlier submission is independent.
4. As Organiser, change the published event's location through save/preview/publish.
   As Student, refresh and check the change notice and preserved place.
5. On a disposable test registration, cancel and, if room remains, register again.
6. If AI testing and budget are authorised, ask one source-supported question and one
   absent-fact question. Check clear uncertainty and that no automatic registration or
   private message is claimed. Skip live requests if allowance/access is unavailable.
7. Log out and check that protected pages/operations require authentication again.

Record what actually happened, the deployment/revision, browser and any error. This
walkthrough is a testing procedure, not a claim that the complete flow has passed.

## Current limitations

The documented code does **not** provide PDF proposal upload/generation screens, an
Organiser form-builder or roster screen, a private question inbox/reply workflow,
automatic forwarding, an Organiser-contact button, email notifications,
role switching, payments, a waitlist or seat holds. The registration engine
supports versioned custom forms, but that does not create a form-builder interface.

The assistant currently refuses started/past-event sources and publications exceeding
its source-size limit. Budget/key/configuration problems may hide or disable it.
Quoted evidence is checked internally; it is not shown as a source panel and does not
guarantee that every generated sentence is semantically correct. Use published details
and the Organiser to resolve important uncertainties.

For setup, data/security design, supported tests and pending integration work, see the
[Developer Guide](DeveloperGuide.md).
