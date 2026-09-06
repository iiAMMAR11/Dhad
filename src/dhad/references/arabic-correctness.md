# Arabic correctness

Rules that make Arabic products behave correctly, independent of visual design. Every rule here fixes a bug that ships silently: the UI looks fine and is wrong. Platform `Intl` (CLDR/ICU) already solves most of this — the failure mode is not using it.

## 1. Pluralization — Arabic has six categories

Arabic plural selection depends on `n % 100`, so it cannot be hardcoded:

| Category | Numbers | Example with ملف |
|---|---|---|
| `zero` | 0 | لا توجد ملفات |
| `one` | 1 | ملف واحد |
| `two` | 2 | ملفان |
| `few` | 3–10, 103–110, 203… | ٥ ملفات |
| `many` | 11–99, 111–199… | ١١ ملفاً |
| `other` | 100, 101, 102, 200… | ١٠٠ ملف |

Note 103 is `few` while 100 is `other`. Any library configured with only one/other produces «11 ملفات» everywhere.

```js
const CATEGORY = new Intl.PluralRules("ar");
const FILES = { zero: "لا توجد ملفات", one: "ملف واحد", two: "ملفان",
                few: "# ملفات", many: "# ملفاً", other: "# ملف" };
const label = n => FILES[CATEGORY.select(n)].replace("#", new Intl.NumberFormat("ar-SA").format(n));
```

- Every countable string needs all six forms. Audit i18n message files for Arabic entries with fewer than six.
- `zero`, `one`, `two` usually omit the digit entirely (write the word, not «1 ملف»).
- ICU MessageFormat: `{count, plural, zero{…} one{…} two{…} few{…} many{…} other{…}}`.

## 2. Collation — never sort Arabic with default sort

Code-point order puts أ إ آ before bare ا, scattering names that start with alef:

```js
["أحمد","ابراهيم","آدم"].sort()                                  // آدم, أحمد, ابراهيم ← غلط
["أحمد","ابراهيم","آدم"].sort(new Intl.Collator("ar").compare)   // آدم, ابراهيم, أحمد ← صح
```

- Use `new Intl.Collator("ar")` for every user-visible ordering: lists, tables, dropdowns, autocomplete.
- Add `{ numeric: true }` when strings embed numbers («فرع 2» before «فرع 10»).
- Databases: use ICU collations (Postgres `ar-x-icu`), not byte order.

## 3. Search normalization — 75% of records disappear without it

Users type without hamza and without diacritics. «احمد» must find «أحمد», «أَحْمَد», and «احـمـد»; «فاطمه» must find «فاطمة».

```js
const normalizeArabic = s => s
  .replace(/[ً-ْٰـ]/g, "")  // tashkeel + dagger alef + tatweel
  .replace(/[أإآٱ]/g, "ا")                       // hamza/wasla forms → bare alef
  .replace(/ى/g, "ي")                            // alef maqsura → ya
  .replace(/ة/g, "ه");                           // ta marbuta → ha
```

- Apply to **both** the indexed value and the query. Store the original for display; never show normalized text.
- Engines: Elasticsearch `arabic` analyzer and Postgres `unaccent`/custom do the same job — configure them instead of reimplementing when a real search engine exists.
- Deduplication of names must compare normalized forms, or «فاطمة» and «فاطمه» become two customers.

## 4. Numerals — one policy, applied everywhere

Two digit systems: Eastern ٠١٢٣٤٥٦٧٨٩ (`arab`) and Western 0123456789 (`latn`). CLDR defaults differ **by region tag**, which surprises:

```js
new Intl.NumberFormat("ar")   // 1,234.50  ← latn
new Intl.NumberFormat("ar-SA") // ١٬٢٣٤٫٥٠ ← arab
new Intl.NumberFormat("ar-SA-u-nu-latn") // 1,234.50 ← explicit override
```

- Decide one system per product (document the choice); pin it explicitly with `-u-nu-latn` or `-u-nu-arab` instead of trusting the region default.
- **Input** must accept both: convert Eastern digits before validation — `s.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))`. Also accept ٫ (Arabic decimal separator) where , or . is expected.
- Phone numbers, IDs, IBANs, codes: always `latn`, always LTR islands.

## 5. Bidi safety — invisible marks are load-bearing

`Intl` currency/date output embeds invisible directional marks (RLM and friends). They are why «ر.س» stays on the correct side.

- Never slice, truncate, or regex-strip formatted output; recompose from parts (`formatToParts`) instead.
- Text pasted from chat apps carries stray RLM/LRM; strip `[‎‏‪-‮]` from **machine fields** (phones, codes, URLs) on input — but not from free text.
- Plaintext contexts (SMS, push, email subjects, logs) have no HTML `dir`: wrap opposite-direction values in Unicode isolates `⁨value⁩` (FSI…PDI).
- In HTML use `<bdi>` or `dir="auto"` for user-authored names; see core.md for the full LTR-island list.

## 6. Shaping hazards — connected script breaks differently

- `letter-spacing` must be `0` on Arabic text: tracking visually **disconnects the joined letters**. Use word-spacing or weight for emphasis. Audit any design system that applies tracking to headings/buttons globally.
- Tight `line-height` or `overflow: hidden` clips tashkeel above letters; Arabic needs more vertical room than Latin at the same size.
- Mid-word ellipsis truncation leaves a letter in its medial (connected) form looking amputated; prefer truncating at word boundaries.
- Canvas, SVG text, chart libraries, and most PDF generators do not shape Arabic (letters render isolated, LTR). Verify shaping before adopting any rendering library; see documents.md when it exists.

## Verify checklist

- Counts at 0, 1, 2, 5, 11, 100, 103 all read naturally.
- A list of names starting with آ أ إ ا sorts as one alef group.
- Searching «احمد» matches «أحمد»; searching «فاطمه» matches «فاطمة».
- Digits render in the product's declared system on every screen, including after locale changes.
- Currency values survive copy/paste into plain text with the symbol on the correct side.
- No Arabic text anywhere has non-zero letter-spacing.
