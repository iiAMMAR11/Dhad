import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentUrl = new URL('../showcase/app/ShowcaseClient.tsx', import.meta.url);
const cssUrl = new URL('../showcase/app/globals.css', import.meta.url);
const layoutUrl = new URL('../showcase/app/layout.tsx', import.meta.url);
const packageUrl = new URL('../showcase/package.json', import.meta.url);
const versionUrl = new URL('../VERSION', import.meta.url);

test('showcase is the story, the journey, the abilities, the install, and a compact owner footer', async () => {
  const component = await readFile(componentUrl, 'utf8');
  const main = component.slice(component.indexOf('<main'), component.indexOf('</main>'));

  assert.equal((main.match(/<section\b/g) ?? []).length, 4);
  assert.match(main, /className="story"/);
  assert.match(main, /className="journey"/);
  assert.match(main, /className="abilities"/);
  assert.match(main, /className="install"/);
  assert.match(component, /<footer className="owner">/);
});

test('the abilities section lets the visitor operate three working examples', async () => {
  const component = await readFile(componentUrl, 'utf8');
  const abilities = component.slice(component.indexOf('className="abilities"'), component.indexOf('className="install"'));

  assert.equal((abilities.match(/<article className="ability">/g) ?? []).length, 3);
  // A tolerant Arabic search the visitor types into.
  assert.match(abilities, /htmlFor="ability-search"/);
  assert.match(abilities, /id="ability-search"/);
  // A control that reports waiting, success, and failure.
  assert.match(abilities, /aria-busy=\{saveState === 'working'\}/);
  assert.match(abilities, /disabled=\{saveState === 'working'\}/);
  for (const ending of ['تم الحفظ', 'أعد المحاولة', 'جارٍ الحفظ']) assert.ok(component.includes(ending), ending);
  // A list that explains every state instead of showing a blank screen.
  assert.match(abilities, /aria-pressed=\{listState === state\.id\}/);
  assert.equal((abilities.match(/aria-live="polite"/g) ?? []).length, 3);
});

test('every journey stage compares a labelled before against a labelled after', async () => {
  const component = await readFile(componentUrl, 'utf8');
  const stages = component.match(/<Stage\b/g) ?? [];

  assert.ok(stages.length >= 7, 'the journey needs at least seven stages');
  assert.equal((component.match(/بدون ضاد/g) ?? []).length, 1, 'the label belongs to the shared Stage component');
  assert.equal((component.match(/مع ضاد/g) ?? []).length, 1);
  assert.equal((component.match(/without=\{/g) ?? []).length, stages.length);
  assert.equal((component.match(/withDhad=\{/g) ?? []).length, stages.length);
});

test('the corrected side is computed, never typed by hand', async () => {
  const component = await readFile(componentUrl, 'utf8');

  for (const api of [
    'Intl.PluralRules', 'Intl.Collator', 'Intl.DateTimeFormat',
    'Intl.NumberFormat', 'Intl.RelativeTimeFormat', 'Intl.ListFormat',
  ]) {
    assert.ok(component.includes(api), `missing ${api}`);
  }
  assert.match(component, /islamic-umalqura/);
  assert.match(component, /ar-SA-u-nu-arab/);
  // A fixed instant keeps the server and the browser agreeing on the date.
  assert.match(component, /Date\.UTC\(/);
  assert.doesNotMatch(component, /new Date\(\)/);
});

test('the direction stage shows a real failure, not a claimed one', async () => {
  const component = await readFile(componentUrl, 'utf8');

  // Without a direction the Arabic sentence starts from the left and its
  // punctuation lands on the wrong edge. That difference is observable.
  assert.match(component, /className="demo demo--ltr" dir="ltr"/);
  assert.match(component, /<bdi dir="ltr">/);
});

test('the showcase demonstrates rules, and never invents client work', async () => {
  const component = await readFile(componentUrl, 'utf8');

  assert.doesNotMatch(component, /إعلان-الدورة\.pdf|example\.com\/arabic-ui|شركة [أا]/);
  assert.doesNotMatch(component, /عميل سعيد|قال عنّا|دراسة حالة/);
});

test('first section explains the idea, method, and advantages without a fake example', async () => {
  const component = await readFile(componentUrl, 'utf8');

  assert.match(component, /عملك يستحق/);
  assert.match(component, /عربية تليق به/);
  assert.match(component, /يفهم المطلوب/);
  assert.match(component, /يضبطه/);
  assert.match(component, /يفحص النتيجة/);
  assert.match(component, /العربية أولًا/);
  assert.match(component, /هويتك تبقى لك/);
  assert.match(component, /كل أنواع العمل/);
  assert.match(component, /يفهم جمهورك/);
  assert.match(component, /يراجعها بعد التصدير/);
  assert.match(component, /لا ينسى الحالات الصعبة/);
});

test('installation section uses real archives and gives live copy feedback', async () => {
  const component = await readFile(componentUrl, 'utf8');

  assert.match(component, /Dhad-openai-plugin\.zip/);
  assert.match(component, /Dhad-agent-skill\.zip/);
  assert.match(component, /navigator\.clipboard\.writeText/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /تعذّر النسخ/);
});

test('ownership and acknowledgments stay in the footer', async () => {
  const component = await readFile(componentUrl, 'utf8');
  const footerAt = component.indexOf('<footer');
  const body = component.slice(0, footerAt);
  const footer = component.slice(footerAt);

  assert.match(footer, /صاحبها ومطوّرها/);
  assert.match(footer, />عمَّار</);
  assert.match(footer, /شكرًا لمرصاد، وثمانية، ورياضة ثمانية/);
  assert.doesNotMatch(body, /مرصاد|ثمانية|رياضة ثمانية/);
});

test('visual system uses a quiet product canvas with meaningful color and readable Arabic', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /--action:\s*#1557d5/);
  assert.match(css, /--success:\s*#15803d/);
  assert.match(css, /--warning:\s*#b66a00/);
  assert.match(css, /--assistive:\s*#7446b8/);
  assert.match(css, /--danger:\s*#b4232c/);
  assert.match(css, /\.hero\s*\{[^}]*background-image:[^}]*linear-gradient/s);
  assert.match(css, /\.quality-report\s*\{[^}]*background-image:[^}]*linear-gradient/s);
  assert.doesNotMatch(css, /radial-gradient|background-clip:\s*text|drop-shadow/i);
  assert.doesNotMatch(css, /opacity:\s*0(?:\D|$)/);
  assert.doesNotMatch(css, /:hover[^{}]*\{[^}]*transform:/s);
  assert.doesNotMatch(css, /border-radius:\s*999/);
  assert.match(css, /min-block-size:\s*44px/);
  assert.match(css, /body\s*\{[^}]*font-size:\s*1rem[^}]*line-height:\s*1\.8/s);
  assert.match(css, /\.hero h1\s*\{[^}]*line-height:\s*1\.22/s);
  assert.match(css, /\.hero-lead\s*\{[^}]*line-height:\s*1\.9/s);
  assert.match(css, /\.pane\s*\{[^}]*border:/s);
  assert.match(css, /\.ability\s*\{[^}]*border:/s);
  assert.match(css, /\.ability input\s*\{[^}]*min-block-size:\s*48px/s);
  assert.match(css, /\.ability-tabs button\s*\{[^}]*min-block-size:\s*44px/s);
  assert.match(css, /\.demo--cramped\s*\{[^}]*line-height:\s*\.9/s);
  assert.match(css, /\.demo--roomy\s*\{[^}]*line-height:\s*1\.95/s);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test('every visible control has a state', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /\.primary-action:hover\s*\{[^}]*background:/s);
  assert.match(css, /\.downloads a:hover\s*\{[^}]*background:/s);
  assert.match(css, /\.command button:hover\s*\{[^}]*background:/s);
  assert.match(css, /\.ability-button:hover\s*\{[^}]*background:/s);
  assert.match(css, /\.ability-tabs button:hover\s*\{[^}]*color:/s);
  assert.match(css, /\.ability-tabs button\[aria-pressed="true"\]\s*\{[^}]*background:/s);
});

test('metadata, release number, and language match the released skill', async () => {
  const [layout, pkg, version] = await Promise.all([
    readFile(layoutUrl, 'utf8'),
    readFile(packageUrl, 'utf8'),
    readFile(versionUrl, 'utf8')
  ]);

  assert.equal(JSON.parse(pkg).version, version.trim());
  assert.match(layout, /lang="ar" dir="rtl"/);
  assert.match(layout, /عمل أوضح وعربية أفضل/);
  assert.match(layout, /#1557d5/);
});
