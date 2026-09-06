import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repository = fileURLToPath(new URL("..", import.meta.url));
const cssFiles = [
  "src/dhad/assets/starter/css/dhad.core.css",
  "src/dhad/assets/starter/css/dhad.patterns.css",
  "src/dhad/assets/starter/css/dhad.recipes-production.css",
  "src/dhad/assets/starter/css/dhad.recipes-shared-expenses.css"
];
const publicRoots = [
  "README.md",
  "README.en.md",
  "CONTRIBUTING.md",
  "NOTICE.md",
  "src/dhad"
];

async function filesUnder(relative) {
  const absolute = path.join(repository, relative);
  const info = await stat(absolute);
  if (info.isFile()) return [absolute];
  const result = [];
  for (const entry of await readdir(absolute, { withFileTypes: true })) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(child));
    else if (/\.(?:md|html|ya?ml|json)$/.test(entry.name)) result.push(path.join(repository, child));
  }
  return result;
}

test("public documentation only names classes implemented by the shipped CSS", async () => {
  const css = (await Promise.all(cssFiles.map((file) => readFile(path.join(repository, file), "utf8")))).join("\n");
  const defined = new Set(Array.from(css.matchAll(/\.((?:dhad-)[a-z0-9_-]+)/gi), (match) => match[1]));
  const documents = (await Promise.all(publicRoots.map(filesUnder))).flat();
  const missing = new Map();

  for (const file of documents) {
    const contents = await readFile(file, "utf8");
    for (const match of contents.matchAll(/\.((?:dhad-)[a-z0-9_-]+)/gi)) {
      const className = match[1];
      if (className === "dhad-" || defined.has(className)) continue;
      if (!missing.has(className)) missing.set(className, []);
      missing.get(className).push(path.relative(repository, file));
    }
  }

  assert.deepEqual(Object.fromEntries(missing), {});
});

test("public documentation contains no retired project, class, token or API namespace", async () => {
  const documents = (await Promise.all(publicRoots.map(filesUnder))).flat();
  const combined = (await Promise.all(documents.map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(combined, /\.an-|--an-|data-an-/);
  assert.doesNotMatch(combined, /Dhad-[^\s)]*-v\d+\.\d+\.\d+\.zip/);
  assert.doesNotMatch(combined, /\.dhad-sheet\b|\.dhad-shot\b|\.dhad-segment\b/);
  assert.doesNotMatch(combined, /dhad\.components\.css/);
});

test("documented web entry files and native starters exist", async () => {
  const expected = [
    "src/dhad/assets/starter/css/dhad.tokens.css",
    ...cssFiles,
    "src/dhad/assets/starter/js/dhad.runtime.js",
    "src/dhad/assets/starter/js/dhad.recipes-production.js",
    "src/dhad/assets/examples/react-native/dhad-theme.ts",
    "src/dhad/assets/examples/flutter/dhad_theme.dart",
    "src/dhad/assets/examples/swiftui/DhadTheme.swift",
    "src/dhad/assets/examples/android-compose/DhadTheme.kt"
  ];
  for (const file of expected) assert.equal((await stat(path.join(repository, file))).isFile(), true, file);
});

test("documented Dhad methods are exported by the runtime", async () => {
  const documents = (await Promise.all(publicRoots.map(filesUnder))).flat();
  const combined = (await Promise.all(documents.map((file) => readFile(file, "utf8")))).join("\n");
  const documented = new Set(Array.from(combined.matchAll(/Dhad\.([A-Za-z][A-Za-z0-9]*)/g), (match) => match[1]));
  const runtime = await readFile(path.join(repository, "src/dhad/assets/starter/js/dhad.runtime.js"), "utf8");
  const apiBlock = runtime.match(/const api = Object\.freeze\(\{([\s\S]*?)\n\s*\}\);/);
  assert.ok(apiBlock, "runtime API export block is missing");
  const exported = new Set(Array.from(apiBlock[1].matchAll(/^\s*([A-Za-z][A-Za-z0-9]*)(?=[:,])/gm), (match) => match[1]));
  const missing = [...documented].filter((method) => !exported.has(method));
  assert.deepEqual(missing, []);
});

test("package names, versions and export targets stay synchronized", async () => {
  const version = (await readFile(path.join(repository, "VERSION"), "utf8")).trim();
  const starterRoot = path.join(repository, "src/dhad/assets/starter");
  const starter = JSON.parse(await readFile(path.join(starterRoot, "package.json"), "utf8"));
  const plugin = JSON.parse(await readFile(path.join(repository, "platforms/chatgpt/dhad/.codex-plugin/plugin.json"), "utf8"));
  const tokens = JSON.parse(await readFile(path.join(repository, "src/dhad/assets/tokens/dhad.tokens.json"), "utf8"));
  const runtime = await readFile(path.join(starterRoot, "js/dhad.runtime.js"), "utf8");

  assert.equal(starter.name, "dhad");
  assert.equal(plugin.name, "dhad");
  assert.equal(starter.version, version);
  assert.equal(plugin.version, version);
  assert.equal(tokens.$extensions["com.dhad"].version, version);
  assert.match(runtime, new RegExp(`version:\\s*["']${version.replaceAll(".", "\\.")}["']`));

  for (const target of Object.values(starter.exports)) {
    assert.equal((await stat(path.resolve(starterRoot, target))).isFile(), true, target);
  }
});

test("skill discovery and plugin metadata describe both Dhad layers", async () => {
  const skill = await readFile(path.join(repository, "src/dhad/SKILL.md"), "utf8");
  const plugin = JSON.parse(await readFile(path.join(repository, "platforms/chatgpt/dhad/.codex-plugin/plugin.json"), "utf8"));
  const description = skill.match(/^description:\s*(.+)$/m)?.[1] ?? "";

  assert.ok(description.length > 0 && description.length <= 200, "skill description must stay Claude-compatible");
  for (const capability of ["Arabic", "RTL", "plurals", "sorting", "search", "Hijri", "week"]) {
    assert.ok(description.includes(capability), `skill description lost ${capability}`);
    assert.ok(plugin.description.includes(capability), `plugin description lost ${capability}`);
  }
  assert.match(plugin.interface.shortDescription, /تصميم وصحّة عربية RTL/);
  assert.match(plugin.interface.longDescription, /الجمع والترتيب والبحث والأرقام والتواريخ والتقويم الهجري/);
});

test("font contracts bundle IBM Plex Sans Arabic as the single skill typeface", async () => {
  const tokens = JSON.parse(await readFile(path.join(repository, "src/dhad/assets/tokens/dhad.tokens.json"), "utf8"));
  const starterRoot = path.join(repository, "src/dhad/assets/starter");
  const families = tokens.primitive.font.family;

  assert.equal(families.sans.$value[0], "IBM Plex Sans Arabic");
  assert.equal(families.display.$value[0], "IBM Plex Sans Arabic");
  assert.ok(!JSON.stringify(families).includes("Thmanyah"), "Thmanyah must not appear in any font stack");

  const generated = await Promise.all([
    "src/dhad/assets/starter/css/dhad.tokens.css",
    "src/dhad/assets/examples/react-native/dhad-theme.ts",
    "src/dhad/assets/examples/flutter/dhad_theme.dart",
    "src/dhad/assets/examples/swiftui/DhadTheme.swift",
    "src/dhad/assets/examples/android-compose/DhadTheme.kt"
  ].map((file) => readFile(path.join(repository, file), "utf8")));
  for (const output of generated) assert.match(output, /IBM Plex Sans Arabic/);

  const weights = ["Thin", "ExtraLight", "Light", "Regular", "Text", "Medium", "SemiBold", "Bold"];
  for (const w of weights) {
    assert.ok((await stat(path.join(starterRoot, `fonts/IBMPlexSansArabic-${w}.woff2`))).isFile(), w);
  }
  assert.ok((await stat(path.join(starterRoot, "fonts/OFL-LICENSE.txt"))).isFile());

  const fontsCss = await readFile(path.join(starterRoot, "css/dhad.fonts.css"), "utf8");
  assert.equal([...fontsCss.matchAll(/@font-face/g)].length, 8);
  for (const weight of [100, 200, 300, 400, 450, 500, 600, 700]) {
    assert.match(fontsCss, new RegExp(`font-weight: ${weight};`));
  }
  assert.match(fontsCss, /font-display: swap/);
  assert.doesNotMatch(fontsCss, /https?:\/\//);

  const core = await readFile(path.join(starterRoot, "css/dhad.core.css"), "utf8");
  assert.match(core, /@import "\.\/dhad\.fonts\.css";/);
});
