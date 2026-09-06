# Time: Hijri, weeks, and Gulf conventions

## 1. Calendars — store Gregorian, project Hijri

- Persist timestamps as ISO-8601/Unix (Gregorian). Hijri is a **display projection**, never a storage format.
- Umm al-Qura is built into the platform — no conversion library needed:

```js
new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", { dateStyle: "long" })
  .format(new Date("2026-08-31"))   // ١٨ ربيع الأول ١٤٤٨ هـ
```

- Dual display pattern: primary date in the product's default calendar, secondary in the other, e.g. «١٨ ربيع الأول ١٤٤٨هـ (31 أغسطس 2026)». Mark which is authoritative.
- Saudi official/government contexts expect Umm al-Qura (`islamic-umalqura`, not generic `islamic`). Other regions default Gregorian with Hijri for religious dates.
- Hijri months are 29–30 days and the future calendar can shift by observation: never compute contractual deadlines in Hijri arithmetic; convert from Gregorian at display time.
- Hijri date **input** (birthdates on official forms): accept hijri fields, convert once via `Temporal`/ICU to Gregorian for storage, keep the original string for audit.

## 2. Weeks — Friday–Saturday weekend

- Weekend in KSA and most Gulf states: **Friday–Saturday**; the week starts **Sunday**. (UAE since 2022: Sat–Sun weekend, week starts Monday.) Read it per region, don't assume:

```js
new Intl.Locale("ar-SA").getWeekInfo()  // { firstDay: 7→Sunday, weekend: [5, 6] }
```

- Calendar grids: first column Sunday (SA), weekend columns shaded Fri–Sat, and the grid flows right-to-left.
- «نهاية الأسبوع», scheduling defaults, SLA counters, «أيام العمل» calculations must use the regional weekend — a "business days" helper hardcoding Sat–Sun is wrong in KSA.

## 3. Formatting — locale does the words

```js
new Intl.DateTimeFormat("ar-SA", { weekday: "long", day: "numeric", month: "long" })
new Intl.RelativeTimeFormat("ar", { numeric: "auto" }).format(-2, "day") // أول أمس
```

- `RelativeTimeFormat` knows أمس/أول أمس/غداً/بعد غد — don't hand-write relative strings, and plural rules (see arabic-correctness.md) apply to «منذ ٣ أيام».
- Construct formatters once and reuse (they are expensive); one formatter per (locale, options) pair.
- Time is usually 12-hour with ص/م in Arabic locales; let the locale decide via `hour12` default rather than forcing.
- Mixed-direction timestamps («14:30 · ١٨ ربيع الأول») need the time as an LTR island.

## 4. Ramadan and prayer awareness

- Ramadan shifts life: working hours shrink, activity moves to night. Products with scheduling, delivery slots, or notification windows should read Ramadan from the Hijri calendar (month 9) and adapt defaults — no hardcoded Gregorian dates, it moves ~11 days/year.
- Respect quiet windows around Maghrib (iftar) for marketing notifications during Ramadan.
- Prayer times are **location + calculation-method** computations, not in `Intl`. Use an established library/API with the method appropriate to the market (Umm al-Qura for KSA). Surface them only when the product's domain calls for it.

## Verify checklist

- The same stored timestamp renders correctly as Hijri and Gregorian, with the authoritative one visually primary.
- Calendar grid: RTL flow, Sunday first, Fri–Sat weekend (per region).
- «أيام العمل» math excludes Friday and Saturday in KSA.
- Relative dates say أمس/غداً via RelativeTimeFormat, and «منذ ١١ يوماً» uses the `many` plural form.
- Nothing anywhere hardcodes Ramadan or Eid as fixed Gregorian dates.
