---
title: Home
description: TurnUp connects Students with campus events and Organisers with a clear publication workflow.
---

<section class="product-hero">
  <p class="eyebrow">TurnUp · Campus events</p>
  <h1>Find your next reason to show up.</h1>
  <p class="lede">Discover published events, confirm your registration and ask about the details. Organisers prepare privately and review exactly what Students will see before publishing.</p>
  <div class="product-actions">
    <a class="product-button primary" href="{{ site.app_url | escape }}">Open TurnUp</a>
    <a class="product-button" href="{{ '/UserGuide.html' | relative_url }}">Read the User Guide</a>
  </div>
</section>

## From discovery to a confirmed place

<div class="feature-grid">
  <section class="feature-card"><h3>Discover</h3><p>Search published events by title. Check the schedule, location, fee, preparation and remaining places.</p></section>
  <section class="feature-card"><h3>Register</h3><p>Review your event-specific details, confirm sharing and submit. Manage your registration and corrections in My Events.</p></section>
  <section class="feature-card"><h3>Ask</h3><p>When enabled, the event assistant answers from that event’s published information. Uncertain replies suggest checking with the organiser.</p></section>
</div>

## Organise with a deliberate publishing step

Save incomplete drafts privately, enter the event details, then preview and approve the exact public content. Editing a draft does not silently change the live event. Withdraw an event temporarily or cancel it permanently using separate controls.

## Start here

- [User Guide](UserGuide.md): account setup, Student and Organiser workflows, troubleshooting and a tester walkthrough.
- [Developer Guide](DeveloperGuide.md): setup, architecture and UML, data integrity, AI security, tests and the SDD/multi-agent process.
- [Source code and issue tracker](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3): implementation and ongoing work.

TurnUp runs in a web browser; no application download is required. Choose one fixed role when creating your account. There is currently no payment processing or role switching. Proposal PDF assistance, a form-builder/roster interface and private organiser replies are not available in the documented code snapshot. The guides describe these boundaries explicitly.

**Deployment access:** the current application address may first show Vercel sign-in or protection. That is separate from a TurnUp account; obtain deployment access from the project team if needed.

Developed by Darryl and Keith for CS3227. This site follows the documentation structure of the team’s MP2 ClubStock project, adapted for TurnUp’s web application.
