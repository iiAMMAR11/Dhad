import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const showcaseCss = new URL("../showcase/app/globals.css", import.meta.url);
const showcaseComponent = new URL("../showcase/app/ShowcaseClient.tsx", import.meta.url);
const showcaseLayout = new URL("../showcase/app/layout.tsx", import.meta.url);
const showcasePage = new URL("../showcase/app/page.tsx", import.meta.url);
const showcaseFavicon = new URL("../showcase/public/favicon.svg", import.meta.url);
const retiredAppleIcon = new URL("../showcase/public/apple-touch-icon.png", import.meta.url);
const retiredSocialCard = new URL("../showcase/public/dhad-og-light.png", import.meta.url);
const tokenCss = new URL("../src/dhad/assets/starter/css/dhad.tokens.css", import.meta.url);
const coreCss = new URL("../src/dhad/assets/starter/css/dhad.core.css", import.meta.url);
const outlinedText = new URL("../showcase/app/OutlinedText.tsx", import.meta.url);
const thmanyahGlyphs = new URL("../showcase/app/thmanyah-glyphs.ts", import.meta.url);

test("showcase semantic swatches pair on-colors with their fill tokens", async () => {
  const css = await readFile(showcaseCss, "utf8");

  for (const [className, role] of [
    ["success", "success"],
    ["danger", "danger"],
    ["warning", "warning"]
  ]) {
    const rule = css.match(new RegExp(`\\.token--${className}\\s*\\{([^}]*)\\}`));
    assert.ok(rule, `missing .token--${className}`);
    assert.match(rule[1], new RegExp(`background:\\s*var\\(--dhad-color-${role}-fill\\)`));
    assert.match(rule[1], new RegExp(`color:\\s*var\\(--dhad-color-on-${role}-fill\\)`));
  }
});

test("showcase documents fill tokens and keeps selected controls visually distinct", async () => {
  const [css, component] = await Promise.all([
    readFile(showcaseCss, "utf8"),
    readFile(showcaseComponent, "utf8")
  ]);

  assert.match(css, /button\[aria-pressed='true'\]\s*\{[^}]*border-color:\s*var\(--dhad-color-border-focus\)/);
  assert.match(css, /\.token code\s*\{[^}]*font-size:\s*var\(--dhad-font-size-200\)/);
  for (const role of ["success", "danger", "warning"]) {
    assert.match(component, new RegExp(`token="--dhad-color-${role}-fill"`));
  }
  assert.doesNotMatch(component, /dhad-toast-stack"\s+aria-live=/);
  assert.match(component, /<th scope="col">/);
  assert.match(component, /<th scope="row">/);
});

test("showcase keeps mobile feedback visible and avoids dead board actions", async () => {
  const [css, component] = await Promise.all([
    readFile(showcaseCss, "utf8"),
    readFile(showcaseComponent, "utf8")
  ]);

  assert.match(css, /\[data-state='saving'\]\s*\{\s*color:\s*var\(--dhad-color-accent-text\);\s*\}/);
  assert.match(css, /\.dhad-toast-stack\s*\{[^}]*inset-inline:\s*var\(--dhad-space-4\);[^}]*transform:\s*none;/);
  assert.match(css, /\[dir='rtl'\] \.dhad-toast-stack\s*\{\s*transform:\s*none;\s*\}/);
  assert.doesNotMatch(css, /\.workspace__board article button/);
  assert.doesNotMatch(component, /onNotify\(`خيارات|>خيارات<|فتحنا خيارات العرض/);
  assert.match(component, /theme === 'dark' \? 'عرض فاتح' : 'عرض داكن'/);
  assert.match(component, /value=\{projectQuery\}/);
  assert.match(component, /normalizeArabic\(project\.name\)\.includes\(normalizedQuery\)/);
  assert.match(component, /لا توجد مشاريع مطابقة/);
  assert.match(component, /value=\{publicUrl\}/);
});

test("showcase renders headings as real DOM text without glyph outlines", async () => {
  const [component, page, css] = await Promise.all([
    readFile(showcaseComponent, "utf8"),
    readFile(showcasePage, "utf8"),
    readFile(showcaseCss, "utf8")
  ]);

  assert.doesNotMatch(page, /OutlinedText|outlined[A-Z]/);
  assert.doesNotMatch(component, /OutlinedText|outlined[A-Z]|thmanyahGlyphs|thmanyah-outline/);
  assert.doesNotMatch(css, /\.thmanyah-outline/);
  for (const heading of [
    "Dhad",
    "نظام واحد لكل المنصات",
    "كل عنصر جاهز لمختلف الحالات",
    "يناسب مشروعك بدل أن يفرض شكلًا واحدًا",
    "الإيموجي اختياري ويتغير حسب المشروع",
    "ملفان لأربع منصات",
    "ما الذي يعمل الآن؟",
    "عمَّار"
  ]) {
    assert.ok(component.includes(`>${heading}<`), `heading must be literal DOM text: ${heading}`);
  }
  await assert.rejects(access(outlinedText), { code: "ENOENT" });
  await assert.rejects(access(thmanyahGlyphs), { code: "ENOENT" });
});

test("showcase presents Dhad as an independent public skill", async () => {
  const [component, layout, favicon] = await Promise.all([
    readFile(showcaseComponent, "utf8"),
    readFile(showcaseLayout, "utf8"),
    readFile(showcaseFavicon, "utf8")
  ]);
  const footerStart = component.indexOf("<footer");

  assert.ok(footerStart >= 0, "showcase footer must exist");
  const pageBody = component.slice(0, footerStart);
  const footer = component.slice(footerStart);
  const hero = pageBody.match(/<section className="hero"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(hero, /سكيل عربي بطبقتين/);
  assert.match(hero, /العربية ليست اتجاهًا فقط/);

  for (const leakedExample of [
    "studio",
    "الحلقة الأولى",
    "مقابلة الضيف",
    "كواليس الاستوديو",
    "المشاهد",
    "يوم التصوير",
    "🎬",
    "🎞️",
    "🎥"
  ]) {
    assert.ok(
      !pageBody.toLocaleLowerCase("en").includes(leakedExample.toLocaleLowerCase("en")),
      `product-specific example leaked into page body: ${leakedExample}`
    );
  }

  assert.doesNotMatch(component, /site-footer__thanks|thanks-title/);
  assert.match(footer, /ضاد، مشروع مستقل/);

  for (const authorUrl of [
    "https://github.com/iiAMMAR11",
    "https://github.com/iiAMMAR11/Dhad",
    "https://x.com/iiAMMAR11",
    "mailto:Hello@iiammar.com",
    "https://iiammar.com"
  ]) {
    assert.ok(component.includes(`href="${authorUrl}"`), `missing author link: ${authorUrl}`);
  }

  assert.ok(footer.includes('href="https://github.com/iiAMMAR11/Dhad/blob/main/NOTICE.md"'), "missing public source notices link");
  assert.ok(footer.indexOf('id="creator"') < footer.indexOf('site-footer__policy'), "Dhad identity must precede legal notices");
  assert.match(favicon, /aria-label="ضاد"/);
  assert.doesNotMatch(favicon, /aria-label="H"/);
  assert.doesNotMatch(layout, /apple-touch-icon|dhad-og-light|summary_large_image/);
  await assert.rejects(access(retiredAppleIcon), { code: "ENOENT" });
  await assert.rejects(access(retiredSocialCard), { code: "ENOENT" });
  assert.doesNotMatch(component, /site-footer__identity|صاحب\s+العمل|ثلاثة\s+أيام\s+مكثفة/);
  assert.doesNotMatch(component, /type Density|حجم الواجهة|setDensity/);
  assert.doesNotMatch(layout, /data-dhad-density/);
});

test("showcase explains and demonstrates both layers of Dhad", async () => {
  const [component, layout] = await Promise.all([
    readFile(showcaseComponent, "utf8"),
    readFile(showcaseLayout, "utf8")
  ]);

  for (const phrase of [
    "واجهة عربية كاملة = تصميم عربي + صحة عربية",
    "ست حالات بدل مفرد وجمع",
    "«احمد» يجد «أحمد»",
    "التاريخ نفسه، عرضان صحيحان"
  ]) {
    assert.ok(component.includes(phrase), `missing Dhad concept: ${phrase}`);
  }
  assert.match(component, /new Intl\.PluralRules\('ar'\)/);
  assert.match(component, /new Intl\.Collator\('ar'/);
  assert.match(component, /ar-SA-u-nu-arab/);
  assert.match(component, /type="range"/);
  assert.match(component, /aria-live="polite"/);
  assert.match(layout, /تصميم RTL مع الجمع والبحث والترتيب والأرقام والتقويم المحلي/);
});

test("showcase contains the hero and restores the compact split creator contact", async () => {
  const [component, css] = await Promise.all([
    readFile(showcaseComponent, "utf8"),
    readFile(showcaseCss, "utf8")
  ]);

  assert.match(component, /<dt dir="rtl">SaaS<\/dt>/);
  assert.match(component, /<span dir="rtl">GitHub<\/span>/);
  assert.match(component, /className="creator-project-link" href="https:\/\/github\.com\/iiAMMAR11\/Dhad"/);
  assert.match(component, /ضاد مفتوح المصدر تحت MIT، وخطه العربي مضمّن بأوزانه الثمانية تحت OFL-1\.1 ويعمل بلا اتصال\./);
  assert.match(css, /\.hero h1\s*\{[^}]*max-inline-size:\s*100%;[^}]*font-size:\s*clamp\(2\.75rem, 7vw, 6rem\);[^}]*text-align:\s*center;[^}]*white-space:\s*normal;/);
  assert.match(css, /\.creator-section\s*\{[^}]*grid-template-columns:\s*minmax\(12rem, 0\.62fr\) minmax\(0, 1\.38fr\);[^}]*align-items:\s*center;[^}]*text-align:\s*start;/);
  assert.match(css, /\.creator-section__body > p\s*\{[^}]*font-size:\s*var\(--dhad-font-size-600\);[^}]*text-align:\s*start;/);
  assert.match(css, /\.creator-links\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);[^}]*text-align:\s*start;/);
  assert.match(css, /\.creator-links strong\s*\{[^}]*font-size:\s*var\(--dhad-font-size-200\);/);
  assert.match(css, /\.site-footer__policy\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*align-items:\s*center;[^}]*text-align:\s*center;/);
});

test("showcase and skill both render IBM Plex Sans Arabic only", async () => {
  const [layout, css, viteConfig, tokens, core] = await Promise.all([
    readFile(showcaseLayout, "utf8"),
    readFile(showcaseCss, "utf8"),
    readFile(new URL("../showcase/vite.config.ts", import.meta.url), "utf8"),
    readFile(tokenCss, "utf8"),
    readFile(coreCss, "utf8")
  ]);

  assert.match(layout, /import '@ibm\/plex-sans-arabic\/css\/ibm-plex-sans-arabic-all\.css';/);
  assert.match(css, /font-family:\s*var\(--dhad-font-body,/);
  for (const token of ["body", "display"]) {
    const stack = tokens.match(new RegExp(`--dhad-font-${token}:\\s*([^;]+);`))?.[1] ?? "";
    assert.ok(stack.trimStart().startsWith('"IBM Plex Sans Arabic"'), `IBM must lead the ${token} stack`);
    assert.ok(!stack.includes("Thmanyah"), `Thmanyah must not appear in the ${token} stack`);
  }
  assert.doesNotMatch(css, /Thmanyah/);
  assert.doesNotMatch(viteConfig, /THMANYAH|Thmanyah/);
  assert.match(core, /@import "\.\/dhad\.fonts\.css";/);
});

test("the installer showcase presents exactly two bundles for four named platforms", async () => {
  const component = await readFile(showcaseComponent, "utf8");
  const installerBlock = component.match(/const installers = \[([\s\S]*?)\n\] as const;/)?.[1] ?? "";

  assert.equal([...installerBlock.matchAll(/^\s+name:\s+'/gm)].length, 2);
  assert.match(installerBlock, /name: 'OpenAI Plugin'/);
  assert.match(installerBlock, /archive: 'Dhad-openai-plugin\.zip'/);
  assert.match(installerBlock, /platforms: 'ChatGPT \+ Codex'/);
  assert.match(installerBlock, /name: 'Agent Skill'/);
  assert.match(installerBlock, /archive: 'Dhad-agent-skill\.zip'/);
  assert.match(installerBlock, /platforms: 'Claude Chat \+ Claude Code'/);
  for (const platform of ["ChatGPT", "Codex", "Claude Chat", "Claude Code"]) {
    assert.match(installerBlock, new RegExp(`platform: '${platform}'`));
  }
  assert.match(component, />ملفان لأربع منصات</);
  assert.doesNotMatch(component, /Release\s+1/);
});

test("multiline display headings keep Arabic breathing room", async () => {
  const css = await readFile(showcaseCss, "utf8");

  for (const selector of [
    ".hero__statement",
    ".section-heading h2",
    ".type-board__display strong",
    ".font-policy h3",
    ".pattern-comparison h3",
    ".creator-section__heading h2"
  ]) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rule = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
    assert.ok(rule, `missing ${selector}`);
    assert.match(rule[1], /line-height:\s*var\(--dhad-line-tight\)/);
  }
});
