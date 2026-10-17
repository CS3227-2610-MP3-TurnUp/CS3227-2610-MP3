# TurnUp UI guidelines

Shared visual guidelines for TurnUp, authored 17 October 2026. These presentation defaults do not change product requirements, select a UI framework, or indicate implemented screens. Read the relevant [canonical specs](../specs/README.md) alongside this guide, then only the affected [screen patterns](ui-screen-patterns.md) for a task.

## Visual direction

Use a calm, practical campus application: pale green canvas, white surfaces, dark green headings, forest-green actions, generous whitespace and subtle borders. Keep layouts readable and task focused; avoid oversized promotional heroes, decorative gradients, heavy shadows and unrelated illustrations. Use TurnUp branding and imagery relevant to its event workflows.

## Tokens

Use semantic `--tu-*` names when implementing; define one shared token set rather than repeating raw values across role styles. This is a documentation contract, not a request to install dependencies or create CSS now.

| Suggested token | Value | Use |
| --- | --- | --- |
| `--tu-canvas` | `#f5f7f5` | Page canvas |
| `--tu-surface` | `#ffffff` | Cards, header, fields, dialogs |
| `--tu-ink` | `#20332d` | Headings and body |
| `--tu-muted` | `#57655f` | Supporting text |
| `--tu-action` | `#23654e` | Primary action, links, selected navigation |
| `--tu-action-soft` | `#e7f1ed` | Selected backgrounds and positive accents |
| `--tu-line` | `#d4ddd7` | Decorative separators and card borders; see accessibility |
| `--tu-danger` / `--tu-danger-soft` | `#a2372b` / `#f9ece9` | Destructive actions and errors |
| `--tu-info` / `--tu-info-soft` | `#215b80` / `#eaf2f8` | Informational feedback |
| `--tu-warning` / `--tu-warning-soft` | `#84530b` / `#fff3dc` | Cautions and pending states |
| `--tu-focus` | `#176bba` | Keyboard focus |
| `--tu-shadow` | `0 10px 30px rgb(32 51 45 / 8%)` | Restrained elevation |

| Scale | Values | Application |
| --- | --- | --- |
| Typeface | Public Sans; `system-ui, sans-serif` fallback | Use weights 400/500/600/700. Arrange local delivery through the chosen Next.js font approach without requiring a remote CDN. |
| Type | Caption 12px; small/label 14px; body 16px; section 20px; page title 26px mobile / 32px desktop | Body line height 1.5; title 1.25. Labels/nav 600; headings 700; regular body 400. |
| Space | 0, 4, 8, 12, 16, 24, 32, 56px | 8px label gap, 16px field/card gap, 24px section/card padding, 32px desktop gutter, 56px bottom space. |
| Radius | 8px controls; 12px cards/dialogs; 999px chips | Keep the same geometry across both roles. |
| Controls | Minimum 44px primary button/input height; 12–16px horizontal padding | Allow multiline text and zoom to increase height. Avoid fixed-height clipping. |

Use rem-based type and spacing; the pixel equivalents above assume a 16px root. Respect user font scaling rather than fixing the root to preserve those pixel dimensions.

## Shell and responsive layout

- Desktop: white header with bottom separator, approximately 80px high. Centre header/main in a maximum 1280px container, including 32px side gutters. Main starts about 36px below the header; use 24px section gaps.
- At 800px and below, wrap navigation onto a separate row if needed; retain the TurnUp name or an accessible equivalent, account access and readable active state. Use 16px gutters and 24px top space. Navigation wraps or scrolls deliberately without pushing the page sideways.
- Standard form sections become two columns at 768px when labels/content fit; otherwise stay stacked. Card grids use one column below 672px, two from 672px and three from 1088px. Keep at most three columns for event cards; long real content can force fewer.
- Keep long forms within about 928px and authentication within about 464px. Dialogs use up to 496px plus viewport margins. Text-heavy event information should remain comfortably readable instead of spanning the whole desktop width.
- Review at 320px, 375px mobile, 1280px desktop, intermediate breakpoints, and enlarged text. Fixed breakpoint values are starting layout defaults, not device detection.

## Shared component vocabulary

| Component | Presentation and interaction |
| --- | --- |
| Page heading | Optional small green eyebrow, one clear title, muted explanation; related primary action beside it on desktop and stacked on small screens. |
| Navigation | Muted text; current item green with 3px underline and `aria-current`. Navigation follows the authenticated fixed role; no Student/Organiser switcher. |
| Card | White, 1px separator border, 12px radius, 24px padding. Use a consistent title/metadata/action order. Shadow is optional elevation, not a border replacement. |
| Primary button | Green fill, white text, 8px radius, 600 weight. One visually dominant action per task region. Hover may darken slightly; focus must remain visible. |
| Secondary/text action | White bordered green-text button, or an underlined text link where appropriate. Use descriptive labels; distinguish navigation from mutation. |
| Destructive action | Danger colour plus explicit action name and required confirmation. Never make Cancel Editing look like Cancel Event. |
| Form field | Persistent label, helper text, required/optional wording, full-width control. Connect errors to the field and keep safe entered values. Textareas grow vertically. |
| Status chip | Short label plus tinted background. Suggested mapping: published/answered green; pending/withdrawn warning; cancelled/error danger; draft/neutral muted. Full means no places available, not cancellation. Words convey state independently of colour. |
| Collection | Match card or table columns to the approved task. Dense roster/history can use desktop tables and equivalent mobile cards; retain labels and access restrictions. |
| Feedback | In-place white/info/warning/danger panel with clear outcome and an available next action. Use success feedback only after the operation commits. |

## Accessibility and truthful states

Use semantic headings, labels, buttons and links; maintain logical keyboard order and visible focus. Keyboard focus uses a 3px blue outline with 3px offset. Dialogs need a title, modal semantics, initial focus, a focus trap across all interactive elements, focus restoration and a safe dismissal path where cancellation remains possible. Focus handling must include links, fields and other interactive elements, not only buttons.

The pale border is only about 1.39:1 against white. Keep it for decoration, but do not rely on it alone to identify interactive controls; use sufficiently distinct boundaries/affordances and verify the rendered result. Action/white, ink/white and muted/white pairs calculate to about 6.90:1, 13.35:1 and 6.12:1 respectively. These spot calculations are not a complete accessibility assessment. Check every actual text/state pairing, focus, zoom and disabled state during implementation.

Loading, empty, validation error, conflict, unavailable and success are separate states. Skeletons resemble the eventual content and stop animating for reduced-motion preferences. Empty states explain what is absent; technical failure never masquerades as no results. Pending mutation prevents accidental duplicates without losing input or making an unsupported success claim. Source/version conflicts require an explicit refresh/review path consistent with SHR08.

## Implementer handoff and review

Each UI change lists its spec/scenario IDs, affected pattern, component files and single active writers. Choose shared component ownership per change under the [existing workflow](../CONTRIBUTING.md); this guide assigns no new human ownership or requirement approvals. Put feature-specific wireframes and material implementation choices in that change's optional `design.md`.

Before calling UI work verified: compare both roles' token/component use; exercise keyboard and narrow/wide layouts with long titles, missing optional profiles, zero/many questions and failure states; verify private/public boundaries against the canonical scenarios. Capture actual screenshots/check results in change verification when the application exists. This document itself is not a screenshot, runtime check or pixel-match claim.
