import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentUrl = new URL('../showcase/app/ShowcaseClient.tsx', import.meta.url);
const cssUrl = new URL('../showcase/app/globals.css', import.meta.url);
const layoutUrl = new URL('../showcase/app/layout.tsx', import.meta.url);
const packageUrl = new URL('../showcase/package.json', import.meta.url);

test('showcase demonstrates Dhad across seven familiar kinds of work', async () => {
  const component = await readFile(componentUrl, 'utf8');

  for (const key of ["'site'", "'saas'", "'app'", "'slides'", "'document'", "'image'", "'ad'"]) {
    assert.ok(component.includes(key), `missing output ${key}`);
  }
  assert.match(component, /مهارة تجعل أي عمل أوضح وأسهل/);
  assert.match(component, /تهتم بالعربية وتحافظ على هوية مشروعك/);
  assert.match(component, /ملف عربي يبقى مرتبًا بعد الحفظ والطباعة/);
  assert.match(component, /صورة تقول فكرتها بوضوح/);
  assert.match(component, /إعلان يعرف المشاهد ماذا يفعل/);
  assert.match(component, /role="tablist"/);
  assert.match(component, /moveOutputTab/);
});

test('showcase exposes all twenty approved patterns with concrete examples', async () => {
  const component = await readFile(componentUrl, 'utf8');
  const patterns = [...component.matchAll(/\{ id: '[^']+', title: '[^']+', summary: '[^']+', example: '[^']+' \}/g)];

  assert.equal(patterns.length, 20);
  for (const pattern of patterns) {
    assert.match(pattern[0], /summary: '[^']{12,}'/);
    assert.match(pattern[0], /example: '[^']{12,}'/);
  }
});

test('Arabic lab demonstrates plural, search, locale, and concealment behavior', async () => {
  const component = await readFile(componentUrl, 'utf8');

  assert.match(component, /new Intl\.PluralRules\('ar'\)/);
  assert.match(component, /new Intl\.Collator\('ar'/);
  assert.match(component, /ar-SA-u-nu-arab/);
  assert.match(component, /type="range"/);
  assert.match(component, /role="radiogroup"/);
  assert.match(component, /balanceVisible/);
  assert.doesNotMatch(component, /replace\(\/ة\/g/);
  assert.match(component, /اكتب «احمد» وسيجد «أحمد»، مع بقاء الاسم الأصلي كما هو/);
  assert.match(component, /مُحَمَّدٌ يَقْرَأُ الْعَرَبِيَّةَ بِوُضُوحٍ/);
});

test('interactive composites implement RTL keyboard navigation and live status', async () => {
  const component = await readFile(componentUrl, 'utf8');

  assert.match(component, /event\.key === 'ArrowRight' \? -1 : 1/);
  assert.match(component, /moveGroupTab/);
  assert.match(component, /moveRegion/);
  assert.match(component, /tabIndex=\{output === key \? 0 : -1\}/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /navigator\.clipboard\.writeText/);
});

test('visual system avoids generic slop defaults and keeps content visible', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.doesNotMatch(css, /linear-gradient|radial-gradient|background-clip:\s*text/i);
  assert.doesNotMatch(css, /box-shadow|drop-shadow/i);
  assert.doesNotMatch(css, /opacity:\s*0(?:\D|$)/);
  assert.doesNotMatch(css, /:hover\s*\{[^}]*transform:/s);
  assert.doesNotMatch(css, /border-radius:\s*(?:999|50%)/);
  assert.match(css, /min-block-size:\s*44px/);
  assert.match(css, /\.install-row > div \{[^}]*padding:\s*1\.75rem 2rem/s);
  assert.match(css, /\.pattern-detail h3 \{[^}]*line-height:\s*1\.22/s);
  assert.match(css, /\.lab-cell h3 \{[^}]*line-height:\s*1\.38/s);
  assert.match(css, /\.diacritic-sample \{[^}]*line-height:\s*2/s);
  assert.match(css, /@media \(max-width: 370px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test('semantic colors and living control states are visible in the showcase', async () => {
  const [component, css] = await Promise.all([
    readFile(componentUrl, 'utf8'),
    readFile(cssUrl, 'utf8')
  ]);

  for (const role of ['action', 'success', 'warning', 'danger', 'assistive', 'info']) {
    assert.match(css, new RegExp(`--${role}:\\s*#`));
  }
  assert.match(component, /معاني الألوان في ضاد/);
  assert.match(css, /\.output-tab--document:hover[^}]+var\(--success\)/s);
  assert.match(css, /\.toast--danger[^}]+var\(--danger/s);
  assert.match(css, /transition:\s*background-color/);
});

test('ownership wording and source acknowledgments are confined to the footer', async () => {
  const component = await readFile(componentUrl, 'utf8');
  const footerAt = component.indexOf('<footer');
  assert.ok(footerAt > 0);
  const body = component.slice(0, footerAt);
  const footer = component.slice(footerAt);

  assert.match(footer, /صاحبها ومطوّرها/);
  assert.match(footer, />عمَّار</);
  assert.match(footer, /هذا تقدير فقط؛ ضاد عمل مستقل، وليس نسخة من هذه الأعمال ولا مشروعًا مشتركًا معها/);
  assert.doesNotMatch(body, /شكرًا ل/);
});

test('metadata, release number, and install archives match Dhad 3.0.2', async () => {
  const [layout, component, pkg] = await Promise.all([
    readFile(layoutUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(packageUrl, 'utf8')
  ]);

  assert.equal(JSON.parse(pkg).version, '3.0.2');
  assert.match(layout, /lang="ar" dir="rtl"/);
  assert.match(layout, /عمل أوضح وعربية أفضل/);
  assert.match(component, />حمّل ضاد</);
  assert.match(component, /Dhad-openai-plugin\.zip/);
  assert.match(component, /Dhad-agent-skill\.zip/);
});
