import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repository = fileURLToPath(new URL("..", import.meta.url));
const skillRoot = path.join(repository, "src/dhad");

async function textFiles(root) {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const child = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...await textFiles(child));
    else if (/\.(?:md|html|css|js|json|ya?ml|ts|dart|swift|kt|py)$/.test(entry.name)) result.push(child);
  }
  return result;
}

test("skill entrypoint stays concise and routes every maintained reference", async () => {
  const skill = await readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  assert.ok(skill.split("\n").length <= 45, "SKILL.md should stay short");
  const references = [...skill.matchAll(/\]\(references\/([^)]+)\)/g)].map((match) => match[1]);
  assert.deepEqual(references.sort(), ["arabic.md", "foundation.md", "outputs.md", "patterns.md", "quality.md"]);
  for (const reference of references) await access(path.join(skillRoot, "references", reference));
});

test("operational files contain no study attribution or imposed identity", async () => {
  const files = await textFiles(skillRoot);
  const combined = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(combined, /only typeface|single typeface|الخط الوحيد|dark is the default|الوضع الداكن هو الافتراضي/i);
  assert.match(combined, /هوية المشروع وعرف المنصة تتقدم/);
  assert.match(combined, /لا تفرض خطًا أو لونًا أو وضعًا/);
});

test("approved patterns and output adapters are present", async () => {
  const patterns = await readFile(path.join(skillRoot, "references/patterns.md"), "utf8");
  for (const value of [
    "حزمة المطابقة", "مدقّق RTL", "دليل المكوّن", "مسار التبنّي", "فهرس ضاد",
    "وصفة المقال", "بيانات المنطقة", "محوّلات سلوكية", "توكنز قابلة للنقل", "بوابة الاستقرار",
    "entity-lifecycle", "entity-hub", "typed-search", "return-context", "experience-mode",
    "availability-gate", "live-data-trust", "cross-device-handoff", "concealed-value", "series-following"
  ]) assert.match(patterns, new RegExp(value));

  const outputs = await readFile(path.join(skillRoot, "references/outputs.md"), "utf8");
  for (const value of ["الويب وSaaS", "تطبيقات الجوال", "العروض التقديمية", "المستندات وPDF", "التصاميم الثابتة"]) {
    assert.match(outputs, new RegExp(value));
  }
});

test("search normalization is never reused as record identity", async () => {
  const arabic = await readFile(path.join(skillRoot, "references/arabic.md"), "utf8");
  assert.match(arabic, /البحث ليس الهوية/);
  assert.match(arabic, /مطابقة `ة` مع `ه` توسعة بحث اختيارية/);
  assert.match(arabic, /لا تدمج سجلين/);
});

test("package names, versions, tokens and exports stay synchronized", async () => {
  const version = (await readFile(path.join(repository, "VERSION"), "utf8")).trim();
  const starterRoot = path.join(skillRoot, "assets/starter");
  const starter = JSON.parse(await readFile(path.join(starterRoot, "package.json"), "utf8"));
  const plugin = JSON.parse(await readFile(path.join(repository, "platforms/chatgpt/dhad/.codex-plugin/plugin.json"), "utf8"));
  const tokens = JSON.parse(await readFile(path.join(skillRoot, "assets/tokens/dhad.tokens.json"), "utf8"));
  const runtime = await readFile(path.join(starterRoot, "js/dhad.runtime.js"), "utf8");

  assert.equal(starter.version, version);
  assert.equal(plugin.version, version);
  assert.equal(tokens.$extensions["com.dhad"].version, version);
  assert.equal(tokens.$extensions["com.dhad"].defaultTheme, "host");
  assert.equal(tokens.$extensions["com.dhad"].direction, "locale");
  assert.equal(tokens.primitive.font.family.sans.$value[0], "system-ui");
  assert.match(runtime, new RegExp(`version:\\s*["']${version.replaceAll(".", "\\.")}["']`));
  for (const target of Object.values(starter.exports)) {
    assert.equal((await stat(path.resolve(starterRoot, target))).isFile(), true, target);
  }
});

test("discovery metadata remains portable and Arabic-capable", async () => {
  const skill = await readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  const plugin = JSON.parse(await readFile(path.join(repository, "platforms/chatgpt/dhad/.codex-plugin/plugin.json"), "utf8"));
  const description = skill.match(/^description:\s*(.+)$/m)?.[1] ?? "";
  assert.ok(description.length > 0 && description.length <= 200);
  for (const capability of ["Arabic", "RTL", "plurals", "sorting", "search", "Hijri", "week"]) {
    assert.ok(description.includes(capability), capability);
    assert.ok(plugin.description.includes(capability), capability);
  }
  assert.match(plugin.interface.longDescription, /المواقع والتطبيقات والعروض والمستندات/);
});

test("optional offline font profile remains complete and opt-in", async () => {
  const starterRoot = path.join(skillRoot, "assets/starter");
  const weights = ["Thin", "ExtraLight", "Light", "Regular", "Text", "Medium", "SemiBold", "Bold"];
  for (const weight of weights) await access(path.join(starterRoot, `fonts/IBMPlexSansArabic-${weight}.woff2`));
  await access(path.join(starterRoot, "fonts/OFL-LICENSE.txt"));
  const fontsCss = await readFile(path.join(starterRoot, "css/dhad.fonts.css"), "utf8");
  assert.equal([...fontsCss.matchAll(/@font-face/g)].length, 8);
  assert.match(fontsCss, /\[data-dhad-font="plex"\]/);
  assert.doesNotMatch(fontsCss, /https?:\/\//);
});
