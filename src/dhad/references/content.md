# Arabic content and adaptive symbols

Read this reference when the work includes Arabic interface copy, mixed-direction values, labels, errors, status messages, icons, or emoji.

## Arabic interface voice

- Write short, direct labels in modern Arabic.
- Prefer a verb that names the action: «حفظ»، «نشر»، «إعادة المحاولة»، «حذف».
- Describe the result, not the mechanism: «تعذّر حفظ التغييرات» is clearer than a raw transport error.
- Keep destructive labels explicit. Do not use «موافق» when the real action is deletion.
- Pair status with a next step when action is possible.
- Keep transient success short. Keep persistent failure visible until a later success.

## Bidirectional content

The page is RTL by default. Isolate only the value that needs LTR:

    <span dir="ltr">00:14:23:08</span>
    <span class="dhad-money" dir="ltr">TRY&nbsp;2,545.00</span>
    <time dir="ltr" datetime="2026-08-30">2026/08/30</time>
    <bdi dir="auto">Terminal Pide</bdi>
    <input dir="ltr" inputmode="url" value="https://example.com">
    <code dir="ltr">Dhad.setTheme("dark")</code>

Isolate the complete money expression, including its code or symbol, sign, grouping separators, decimal part, and approximation marker. Do not reverse icon meaning mechanically. Progress begins from the right in RTL, while playback, time, code, URLs, email addresses, file paths, machine-formatted dates, and money expressions retain their conventional direction.

Use `bdi dir="auto"` for user-authored names, places, restaurants, and titles whose first strong character may be Arabic or Latin. Do not force an entire row to LTR because one value or proper name needs isolation.

## Money, numbers, and dates

- Store and calculate canonical numeric values separately from the displayed string. Format at the presentation boundary with the platform locale API, such as `Intl.NumberFormat` on the web.
- Follow each currency's minor-unit precision. Do not force two decimals onto currencies with zero or three minor units, and do not infer precision from a screenshot.
- Use tabular figures where columns must align. Money is not code, so do not switch it to a monospace family merely because it is numeric.
- Keep the currency code or symbol visually attached to the amount. Provide a spoken label when the symbol may be unfamiliar or rendered inconsistently.
- Mark converted or estimated values as approximate in text as well as with `≈`. Include rate age or source when freshness affects a decision.
- Distinguish zero, negative, unavailable, pending conversion, and stale conversion. Never display a missing value as `0`.
- Choose Arabic or Latin digits deliberately for the product and locale, then keep that policy consistent within each role. Technical identifiers may retain Latin digits even when prose uses localized digits.
- Use the platform date control for input when possible. Store a machine-readable date, then render a localized human date for reading. State the calendar explicitly when Gregorian and Hijri interpretations could differ.

## Directional relationships

An arrow may reinforce a relationship but cannot be its only explanation. For transfers, assignments, or handoffs, provide a sentence whose source and destination are explicit, such as «تدفع سارة لفارس». Give the interactive row or control an accessible name with the same meaning.

## Terminology consistency

Choose one term for each financial concept and reuse it across summaries, lists, forms, and announcements. Do not alternate casually between pairs such as «نصيبك» و«ما يخصك» or «المجموع» و«الإجمالي» when they denote the same value. If two terms represent different calculations, explain the distinction near the first occurrence.

## Error and help patterns

- Every input has a visible label.
- Help text explains format or consequence before failure.
- Error text names the problem and the repair.
- Use aria-describedby to connect help or error text to its field.
- Do not use placeholder text as the only label.
- When a primary action is disabled because a requirement is incomplete, expose the reason in nearby help or validation text and connect it to the control when practical. A muted button alone is not an explanation.

Examples:

- «أدخل رابطًا كاملًا يبدأ بـ https://»
- «تعذّر الحفظ. سنحتفظ بالتغييرات على هذا الجهاز حتى يعود الاتصال.»
- «ليس لديك صلاحية تعديل هذا المشروع.»

## Adaptive emoji contract

Emoji are optional semantic content. Decide from the user's request and the host product:

1. If the product already has one coherent icon language, inherit it.
2. If the user asks for emoji or the product already uses them, define a compact meaning map for that domain.
3. If emoji would clash with a serious or regulated interface, use the existing icons or no symbols.
4. Never transfer one product's domain vocabulary into an unrelated product.

Suggested neutral roles:

| Role | Meaning |
|---|---|
| workspace | The product's primary working area |
| collection | A group or container |
| item | A single record or content unit |
| complete | Successful completion |
| warning | Attention required |

The role names stay stable while the symbols change by domain. Example maps:

    const learning = { workspace: "🎓", collection: "📚", item: "📝", complete: "✅" };
    const commerce = { workspace: "🛍️", collection: "📦", item: "🧾", complete: "✅" };
    const studio = { workspace: "🎬", collection: "🎞️", item: "🎥", complete: "✅" };

Accessibility:

- Decorative emoji: aria-hidden="true".
- Informative emoji beside text: the text carries the meaning.
- Emoji-only control: provide an exact aria-label.
- Do not encode status by emoji or color alone.
- Avoid consecutive emoji and mixed platform-dependent sequences when a simple symbol is clearer.

## Review checklist

- Read every string at 200% zoom and narrow mobile width.
- Test long Arabic names, mixed Arabic/Latin content, money expressions, currency symbols, negative values, dates, numbers, URLs, and empty values.
- Test currencies with different minor units and converted values whose rate is current, stale, unavailable, or offline.
- Confirm text is not clipped by a fixed height, overflow rule, notch, or icon.
- Confirm every error, status, button, and symbol has a clear accessible meaning.
