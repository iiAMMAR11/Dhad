# Typography: IBM Plex Sans Arabic

Dhad has one typeface: **IBM Plex Sans Arabic** (OFL-1.1). It is bundled with the skill, works offline, requires no CDN, no local-font detection, and no license checks. Never introduce a second Arabic family; hierarchy comes from weight, size, and color — not from switching fonts.

## Loading

- Web starter: `assets/starter/css/dhad.fonts.css` registers all eight weights from `assets/starter/fonts/` (~600KB total, woff2). Import it before `dhad.core.css` (already wired).
- Existing web project with npm: `npm i @ibm/plex-sans-arabic` then import its CSS, or copy the skill's `fonts/` + `dhad.fonts.css` pair as-is.
- Native: bundle the same woff2/ttf per platform convention and register the family; `assets/examples/` themes already name the family. Include `fonts/OFL-LICENSE.txt` in distributed apps.
- Performance: preload only the two weights the first screen uses (usually 450 and 700): `<link rel="preload" as="font" type="font/woff2" crossorigin href=".../IBMPlexSansArabic-Text.woff2">`.

## The eight weights and their jobs

| Weight | Name | Job |
|---|---|---|
| 100 Thin / 200 ExtraLight | display only | Decorative hero numerals or oversized display (≥40px). Never for reading text. |
| 300 Light | large quiet display | Subtitles over 28px. Never below that. |
| 400 Regular | secondary text | Captions, descriptions, meta, help text. |
| **450 Text** | **body** | The default for running Arabic text — designed for it; renders fuller than 400 at body sizes. |
| 500 Medium | UI chrome | Buttons, labels, inputs, tabs, list titles, money values. |
| 600 SemiBold | section headings | H2/H3, card titles, dialog titles. |
| 700 Bold | page identity | H1, hero statements, key metrics, active states needing weight. |

## Hierarchy: how to tell heading from subheading from body

Decide levels by **role**, then express each level as weight + size + color together:

1. **Page title (H1)** — 700, largest size on the screen, default text color. One per screen.
2. **Section heading (H2)** — 600, clearly smaller than H1 (≈ 0.7× of it), default color.
3. **Card/item title (H3)** — 600 at near-body size, or 500 one step up; the container provides the grouping, the weight provides the rank.
4. **Body** — 450 at the project's base size, `line-height` ≥ 1.7 for Arabic.
5. **Secondary/meta** — 400 at 0.85–0.9× base **with muted color**. Demote with color, not with weights below 400 — light weights at small sizes are illegible in Arabic.
6. **Numbers and money** — 500 with `font-variant-numeric: tabular-nums` where columns align.

Rules that keep the hierarchy honest:

- Adjacent levels must differ in at least two of the three channels (weight, size, color). Same weight + same size + different color is a tone change, not a level change.
- Sizes are **relative to the project**, not fixed: pick a base for body (17–18px comfortable default for Arabic web; denser data products may use 15–16px), then scale roles from it (meta ≈ 0.85×, H3 ≈ 1.05–1.15×, H2 ≈ 1.3–1.5×, H1 ≈ 1.6–2.2×, hero ≈ 2.5–3.5×). Match an existing product's density instead of importing these numbers blindly.
- Weights below 400: display sizes (≥28px) only, and never for body or UI controls.
- `letter-spacing` stays 0 on Arabic at every weight (see arabic-correctness.md).
- Line-height needs: body ≥1.7, headings 1.3–1.4, hero 1.15–1.25 — Arabic ascenders, descenders, and diacritics clip below these.

## Fallback stack

`"IBM Plex Sans Arabic", -apple-system, BlinkMacSystemFont, "Geeza Pro", "Arabic UI Text", "Traditional Arabic", "Al Nile", "Helvetica Neue", Arial, sans-serif` — already encoded in the tokens. The fallbacks exist for the instant before woff2 loads (`font-display: swap`), not as alternatives to bundling.

## Verify

- Every screen renders IBM Plex Sans Arabic (check computed styles, not the CSS).
- H1 vs H2 vs body distinguishable with color vision deficiency (weight+size carry the rank).
- No Arabic text below 28px uses weight < 400; no running text uses weight > 500.
- Offline reload still renders the correct font (bundled, not CDN).
