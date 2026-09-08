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

test('first section explains the idea, method, advantages, and a concrete result', async () => {
  const component = await readFile(componentUrl, 'utf8');

  assert.match(component, /العربية أولًا/);
  assert.match(component, /يفهم المطلوب/);
  assert.match(component, /يضبط التفاصيل/);
  assert.match(component, /يختبر النتيجة/);
  assert.match(component, /أبرز ما يضيفه ضاد/);
  assert.match(component, /مثال واقعي: إعلان دورة/);
  assert.match(component, /الأحد، ٢٠ سبتمبر/);
  assert.match(component, /example\.com\/arabic-ui/);
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

test('visual system is vivid, role-based, readable, and avoids generic effects', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /--blue:\s*#1557d5/);
  assert.match(css, /--yellow:\s*#ffd43b/);
  assert.match(css, /--green:\s*#167739/);
  assert.match(css, /--red:\s*#b4232c/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|background-clip:\s*text/i);
  assert.doesNotMatch(css, /box-shadow|drop-shadow|backdrop-filter/i);
  assert.doesNotMatch(css, /opacity:\s*0(?:\D|$)/);
  assert.doesNotMatch(css, /:hover[^{}]*\{[^}]*transform:/s);
  assert.doesNotMatch(css, /border-radius:\s*(?:999|50%)/);
  assert.match(css, /min-block-size:\s*44px/);
  assert.match(css, /body\s*\{[^}]*font-size:\s*1rem[^}]*line-height:\s*1\.8/s);
  assert.match(css, /\.hero h1\s*\{[^}]*line-height:\s*1\.12/s);
  assert.match(css, /\.brief p\s*\{[^}]*line-height:\s*1\.8/s);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
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
