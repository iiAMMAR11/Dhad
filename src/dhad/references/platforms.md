# Platform mapping

Use `assets/tokens/dhad.tokens.json` as the platform-neutral source. Preserve semantic roles even when native APIs use different names.

Keep neutral selection roles separate from action and success on every platform. Map amount and metric typography as ordinary text styles with tabular figures when alignment matters, not as code styles. Use the platform locale APIs for currency, number, and date formatting rather than copying web-formatted strings across targets.

## Maturity contract

| Target | What this repository provides | Maturity |
|---|---|---|
| Web | tokens, CSS components, a small runtime, and a starter | implemented foundation; verify inside the host stack |
| React Native / Expo | typed theme mapping example | theme starter, not a component library |
| Flutter | typed token/theme mapping example | theme starter, not a ready `ThemeData` or widget library |
| SwiftUI | color, spacing, and type mapping example | theme starter, not a view library |
| Android / Compose | generated typed theme mapping | theme starter, not a component library |

Do not describe a theme starter as native component parity. The adopting product owns native controls, navigation, focus, dynamic type, input behavior, and platform testing.

## Typography across targets

- IBM Plex Sans Arabic is the only typeface; bundle its woff2/ttf from `assets/starter/fonts/` (OFL-1.1, license file included) into whatever the platform expects.
- On the web, the open fallback is IBM Plex Sans Arabic under OFL-1.1. Install the official package with `npm install @ibm/plex-sans-arabic`; Sass projects that need the full Dhad weight range can use `@use '@ibm/plex-sans-arabic/scss' as PlexSansArabic;` followed by `@include PlexSansArabic.all();`.
- Native targets cannot register a font through CSS or an npm web import. The adopting app must either bundle and register IBM Plex Sans Arabic under OFL-1.1 with its copyright and license notice, or select an available Arabic platform fallback at runtime.
- After either path, test Arabic shaping, baselines, font scaling, control heights, clipping, and long labels on every target platform.

## Web, React, Vue, Svelte, Angular and SaaS dashboards

- Import `dhad.tokens.css` before `dhad.core.css`, then add `dhad.patterns.css` when needed.
- Copy only components the project uses; do not replace a working accessible component foundation.
- Set `dir="rtl"` and `lang="ar"` at the document or application root.
- Use logical properties such as `margin-inline`, `padding-inline`, `inset-inline-start`, and `border-inline-start`.
- Use `data-dhad-theme="dark|light"` or map tokens into the framework's theme provider.
- Use the included runtime only for the small interactions it implements; framework apps should express the same behavior in native state.
- Keep route navigation, ARIA tabs, segmented radio groups, and pressed view toggles as separate accessible primitives even when their visual treatment is shared.
- Use `Intl.NumberFormat`, semantic `<time>`, `bdi`, and isolated LTR spans for mixed-direction money, dates, and user-authored Latin names.
- Apply emoji only when the user request or host product establishes that visual language. Keep functional controls consistent with the host icon system.

## React Native and Expo

- Map colors, spacing, radii, type sizes, and motion into a typed theme object.
- Set `I18nManager.allowRTL(true)` and test actual RTL layout instead of mirroring screenshots.
- Use `start` and `end` alignment where supported.
- Use `Pressable` states for pressed, disabled, loading, and focus on supported platforms.
- Prefer native segmented or tab primitives when they preserve the required semantics. Do not represent participant selection as a success checkbox.
- Format currencies and dates with the device locale APIs, while keeping the product's chosen digit policy consistent.
- Use native `AccessibilityInfo.isReduceMotionEnabled()` behavior.
- Register IBM Plex Sans Arabic through the native asset pipeline; otherwise resolve the platform fallback at runtime.
- Emoji appearance follows the operating system. Use accessible labels and never depend on pixel-identical rendering across platforms.

## Flutter

- Treat the included file as a starting theme map. Map semantic values into `ThemeData`, `ColorScheme`, `TextTheme`, `InputDecorationTheme`, and the component themes the product actually uses.
- Set Arabic locale and `TextDirection.rtl` through app localization rather than forcing direction on every widget.
- Keep local `Directionality(textDirection: TextDirection.ltr)` around URLs, timecodes, technical identifiers, complete money expressions, and machine-formatted dates.
- Use locale-aware number and date formatters for user-facing output.
- Use `MediaQuery.disableAnimations` or accessible navigation settings for reduced motion.
- Declare and register the selected licensed font assets in Flutter, or resolve the platform fallback at runtime.

## SwiftUI and native Apple platforms

- Treat the included file as a starting theme map. Map tokens into a theme namespace or environment values.
- Use leading and trailing alignment so the interface follows locale direction.
- Use Dynamic Type and do not freeze the documented pixel sizes as fixed points.
- Use semantic system colors when platform accessibility requires a stronger contrast than the literal web token.
- Use native `FormatStyle` or equivalent locale APIs for currencies and dates, and map selection tint independently from success color.
- Respect `accessibilityReduceMotion` and safe-area insets.
- Add the selected licensed font files to the app target and register their PostScript family names, or resolve the platform fallback at runtime.

## Android and Jetpack Compose

- Start from `assets/examples/android-compose/DhadTheme.kt`, then map its values into the app's Material theme roles while preserving Dhad semantic intent.
- Use `LayoutDirection.Rtl` from locale and `start`/`end` paddings.
- Keep 48dp Android controls when the platform convention is larger than the 44px system minimum.
- Use locale-aware number/date formatting and keep Material selected-container roles separate from success roles.
- Respect system font scaling, contrast, and reduced-motion or animator-duration settings.
- Package and register the selected licensed font resources in Android, or resolve the platform fallback at runtime.

## Desktop and cross-platform apps

- For Electron and Tauri, use the web mapping and native window conventions.
- For Flutter, React Native, Qt, .NET MAUI, or Compose Multiplatform, use the closest native mapping above.
- Preserve keyboard order, visible focus, resizable layouts, and minimum window sizes.

## Platform precedence

Platform accessibility and interaction conventions take precedence over literal CSS values. Preserve the system's semantic role and visual relationship, not a pixel-for-pixel web copy.
