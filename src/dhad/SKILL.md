---
name: dhad
description: Design or fix Arabic-first and RTL product interfaces and behavior. Use for عربي UI, accessibility, plurals, sorting, search, numerals, Hijri dates, or regional week conventions.
---

# Dhad (ضاد)

Dhad has two layers — design (RTL tokens, components, themes) and correctness (pluralization, sorting, search, numerals, and calendars). A task may need one or both; a designed list still sorts, counts, and truncates.

## Load only what the task needs

Correctness:
- Text handling, lists, counts, search, sorting, truncation, digits: [references/arabic-correctness.md](references/arabic-correctness.md).
- Dates, Hijri, weekends, scheduling, Ramadan: [references/time.md](references/time.md).

Design:
- Any UI design or implementation: always read [references/core.md](references/core.md).
- Before implementing in a specific framework or native platform: [references/platforms.md](references/platforms.md).
- Navigation, flows, mobile behavior, offline states, persistence, collaboration: [references/ux.md](references/ux.md).
- Typography or any public output: [references/fonts.md](references/fonts.md) and [references/licensing.md](references/licensing.md).
- Arabic interface copy, mixed-direction content, labels, errors, emoji: [references/content.md](references/content.md).

Optional domain recipes (only when the product's real workflow matches):
- Shared expenses, trip budgets, splits, settlements: [references/shared-expenses.md](references/shared-expenses.md).
- Media production, scenes, shots, timecode, and teleprompter workflows: use the optional `assets/starter/css/dhad.recipes-production.css` and `assets/starter/js/dhad.recipes-production.js` files.

## Apply the system

1. Inspect the target stack, component architecture, direction, accessibility baseline, and existing tokens before editing.
2. Inspect the user's request and the host product's established icon or emoji language. Decide whether emoji belong in this product before selecting any symbol.
3. Choose the required layer:
   - Correctness: plural forms, collation, normalization, numeral policy, and calendar and week rules.
   - Core design: tokens, typography, buttons, fields, cards, selection, money values, status, focus, toast, decision dialogs, and task-form dialogs.
   - Product patterns: navigation, tabs, segmented choices, layouts, summaries, ledger rows, progress, compact charts, boards, empty states, and editors.
   - Domain recipes: include only patterns that match the product's real workflow.
4. Map the platform-neutral tokens into the project's native theme system. For a new web interface, use `assets/starter/`; for React Native, Flutter, SwiftUI, or Android Compose, treat `assets/examples/` as theme starters rather than complete component libraries; for an existing product, integrate incrementally.
5. Keep semantic names and the `dhad-` namespace unless the project already has a token pipeline. If it does, map values by role and document the mapping.
6. Make every visible control functional. Cover relevant default, hover, active, focus-visible, disabled, loading, empty, success, failure, offline, and reconnecting states.
7. Verify dark and light themes, Arabic content, RTL and local LTR islands, desktop and mobile sizes, keyboard or assistive navigation, reduced motion, and overflow — plus the verify checklists in each loaded correctness reference.

## System invariants

- Arabic and RTL are the default. Isolate only the value that needs another direction. Use local LTR for URLs, emails, filenames, timecodes, code, technical identifiers, complete money values, and machine-formatted dates. Use `bdi dir="auto"` for user-authored names that may mix Arabic and Latin text.
- Counts respect all six Arabic plural categories; lists sort with the Arabic collator; search matches normalized Arabic. Never ship default `.sort()` or substring search over Arabic content.
- One numeral system per product, pinned explicitly; input always accepts Eastern digits.
- Arabic text never has non-zero letter-spacing, and truncation respects word boundaries.
- Store Gregorian, project Hijri; weekend and week start come from the region, not from library defaults.
- IBM Plex Sans Arabic (OFL-1.1) is the single Dhad typeface, bundled with the starter and always available offline. Hierarchy comes from weight, size, and color per references/fonts.md - body text uses 450, UI chrome 500, headings 600-700, and weights below 400 appear only at display sizes. Never introduce a second Arabic family.
- Dark is the default theme. Preserve the semantic color roles rather than copying raw colors into unrelated roles.
- Primary touch targets are at least 44 by 44 logical pixels and mobile safe-area insets are respected.
- Never rely on color alone for status; pair it with text, a number, a shape, or an accessible label.
- Selection is not success. Use neutral selection roles for tabs, radio segments, selected rows, and participant checkboxes; reserve success for completed or successful outcomes.
- Tabs, segmented radio groups, and view toggles may share a visual treatment but must keep their distinct keyboard and assistive-technology semantics.
- Financial figures use locale-aware formatting and tabular numerals where alignment matters. Do not render money as monospace merely because it is numeric, and label converted values as approximate when they are not authoritative.
- Keep save or sync failure visible until a later success. Use toast for transient results and a platform-native sheet or dialog for decisions.
- Use a bottom sheet for short mobile decisions. Use an inset or full-height task-form dialog for long structured input when keyboard space, internal scrolling, or a persistent action requires it.
- Progress originates from the right in RTL.
- Respect reduced-motion preferences and never hide essential content behind an entrance animation.
- Emoji are optional semantic content, not a mandatory brand layer. Use them only when the user asks for them or the host product already has a coherent emoji language.
- When emoji are appropriate, build a small product-specific meaning map from the user's domain. Never carry one domain's emoji vocabulary into an unrelated product and never mix emoji, outline icons, filled icons, and custom illustrations without explicit role boundaries.
- An emoji-only control requires an accessible name. Decorative emoji must be hidden from assistive technology; informative standalone emoji needs an equivalent text label. It is valid to use no emoji when the host system does not use them.
- Do not import product-specific business logic, backend configuration, export code, or domain terms unless the target product needs them.

## Deliverables

Leave reusable tokens and components rather than one-off styling. Summarize the layers applied, platform mapping, typography source, number/date direction policy, emoji or icon decision, and the states and viewports verified. Distinguish implemented components from documented recipes and native theme starters.
