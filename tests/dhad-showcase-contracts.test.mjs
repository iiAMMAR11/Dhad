import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentUrl = new URL('../showcase/app/ShowcaseClient.tsx', import.meta.url);
const cssUrl = new URL('../showcase/app/globals.css', import.meta.url);
const layoutUrl = new URL('../showcase/app/layout.tsx', import.meta.url);
const packageUrl = new URL('../showcase/package.json', import.meta.url);
const versionUrl = new URL('../VERSION', import.meta.url);

test('showcase is exactly two sections and a compact owner footer', async () => {
  const component = await readFile(componentUrl, 'utf8');
  const main = component.slice(component.indexOf('<main'), component.indexOf('</main>'));

  assert.equal((main.match(/<section\b/g) ?? []).length, 2);
  assert.match(main, /className="story"/);
  assert.match(main, /className="install"/);
  assert.match(component, /<footer className="owner">/);
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
  assert.doesNotMatch(component, /مثال واقعي|إعلان-الدورة\.pdf|example\.com\/arabic-ui/);
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
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test('every visible control has a state', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /\.primary-action:hover\s*\{[^}]*background:/s);
  assert.match(css, /\.downloads a:hover\s*\{[^}]*background:/s);
  assert.match(css, /\.command button:hover\s*\{[^}]*background:/s);
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
