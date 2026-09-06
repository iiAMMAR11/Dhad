import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentUrl = new URL('../showcase/app/ShowcaseClient.tsx', import.meta.url);
const cssUrl = new URL('../showcase/app/globals.css', import.meta.url);
const layoutUrl = new URL('../showcase/app/layout.tsx', import.meta.url);
const packageUrl = new URL('../showcase/package.json', import.meta.url);

test('showcase is a live white-label demonstration across five outputs', async () => {
  const component = await readFile(componentUrl, 'utf8');

  for (const key of ["'site'", "'saas'", "'app'", "'slides'", "'document'"]) {
    assert.ok(component.includes(key), `missing output ${key}`);
  }
  assert.match(component, /مهارة وايت ليبل لتجربة أفضل/);
  assert.match(component, /هوية مشروعك هي الأصل/);
  assert.match(component, /role="tablist"/);
  assert.match(component, /moveOutputTab/);
});

test('showcase exposes all twenty approved patterns with concrete examples', async () => {
  const component = await readFile(componentUrl, 'utf8');
  const patterns = [...component.matchAll(/\{ id: '[^']+', title: '[^']+', summary: '[^']+', example: '[^']+' \}/g)];

  assert.equal(patterns.length, 20);
  for (const name of [
    'حزمة المطابقة', 'مدقّق RTL', 'دليل المكوّن', 'مسار التبنّي', 'فهرس ضاد',
    'وصفة المقال', 'بيانات المنطقة', 'محوّلات سلوكية', 'توكنز قابلة للنقل',
    'بوابة الاستقرار', 'دورة حياة الكيان', 'مركز الكيان', 'البحث المصنّف',
    'حفظ سياق العودة', 'وضع التجربة', 'بوابة الإتاحة', 'ثقة البيانات الحية',
    'التسليم بين الأجهزة', 'القيمة المحجوبة', 'متابعة السلسلة'
  ]) {
    assert.ok(component.includes(`title: '${name}'`), `missing pattern ${name}`);
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
  assert.match(component, /التطبيع للعثور فقط، وليس لدمج شخصين/);
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
  assert.match(css, /@media \(max-width: 370px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test('ownership wording and source acknowledgments are confined to the footer', async () => {
  const component = await readFile(componentUrl, 'utf8');
  const footerAt = component.indexOf('<footer');
  assert.ok(footerAt > 0);
  const body = component.slice(0, footerAt);
  const footer = component.slice(footerAt);

  assert.match(footer, /صاحب ضاد ومطوّرها/);
  assert.match(footer, />عمَّار</);
  assert.match(footer, /هذا الشكر لا يعني نقلًا أو اشتقاقًا أو شراكة أو ملكية مشتركة في ضاد/);
  assert.doesNotMatch(body, /شكرًا ل/);
});

test('metadata, release number, and install archives match Dhad 3.0', async () => {
  const [layout, component, pkg] = await Promise.all([
    readFile(layoutUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(packageUrl, 'utf8')
  ]);

  assert.equal(JSON.parse(pkg).version, '3.0.0');
  assert.match(layout, /lang="ar" dir="rtl"/);
  assert.match(layout, /تجربة وايت ليبل بعربية متفوّقة/);
  assert.match(component, />ضاد 3\.0</);
  assert.match(component, /Dhad-openai-plugin\.zip/);
  assert.match(component, /Dhad-agent-skill\.zip/);
});
