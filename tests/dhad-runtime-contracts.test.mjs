import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../src/dhad/assets/starter/", import.meta.url);
const runtimeUrl = new URL("js/dhad.runtime.js", root);
const coreUrl = new URL("css/dhad.core.css", root);
const patternsUrl = new URL("css/dhad.patterns.css", root);
const recipesUrl = new URL("css/dhad.recipes-production.css", root);

class FakeElement {
  constructor(tagName = "div") {
    this.attributes = new Map();
    this.classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => this.classes.add(name)),
      toggle: (name, force) => {
        const next = force === undefined ? !this.classes.has(name) : Boolean(force);
        if (next) this.classes.add(name);
        else this.classes.delete(name);
        return next;
      },
      contains: (name) => this.classes.has(name)
    };
    this.style = { values: new Map(), setProperty: (name, value) => this.style.values.set(name, value) };
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1;
    this.children = [];
    this.parentNode = null;
    this._textContent = "";
    this.hidden = false;
    this.disabled = false;
    this.readOnly = false;
    this.type = "text";
  }

  get childNodes() { return this.children; }
  get firstChild() { return this.children[0] || null; }
  get textContent() {
    return this.children.length ? this.children.map((child) => child.textContent || "").join("") : this._textContent;
  }
  set textContent(value) {
    this.children.forEach((child) => { child.parentNode = null; });
    this.children = [];
    this._textContent = String(value);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    this._textContent = "";
    this.children.push(child);
    child.parentNode = this;
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  cloneNode(deep = false) {
    const clone = new FakeElement(this.tagName);
    this.attributes.forEach((value, name) => clone.setAttribute(name, value));
    this.classes.forEach((name) => clone.classList.add(name));
    clone.hidden = this.hidden;
    clone.disabled = this.disabled;
    clone.readOnly = this.readOnly;
    clone.type = this.type;
    clone._textContent = this._textContent;
    if (deep) this.children.forEach((child) => clone.appendChild(child.cloneNode(true)));
    return clone;
  }
  matches(selector) { return selector === "[data-dhad-symbol]" && this.hasAttribute("data-dhad-symbol"); }
  closest() { return null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  dispatchEvent() { return true; }
}

async function loadRuntime(options = {}) {
  const source = await readFile(runtimeUrl, "utf8");
  const html = new FakeElement();
  if (options.declaredTheme) html.setAttribute("data-dhad-theme", options.declaredTheme);
  const listeners = new Map();
  const document = {
    documentElement: html,
    readyState: "loading",
    body: null,
    activeElement: null,
    hidden: false,
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    addEventListener(name, handler) { listeners.set(name, handler); },
    removeEventListener() {},
    dispatchEvent() { return true; }
  };
  const localValues = new Map();
  if (options.savedTheme) localValues.set("dhad-theme", options.savedTheme);
  const window = {
    document,
    localStorage: {
      getItem(key) { return localValues.get(key) || null; },
      setItem(key, value) { localValues.set(key, value); }
    },
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    setTimeout,
    clearTimeout,
    queueMicrotask,
    Promise,
    Date,
    performance,
    innerWidth: 1280
  };
  vm.runInNewContext(source, { window, Set, Map, WeakMap, Object, Array, Number, String, Boolean, Math, Date, Promise, TypeError });
  return { api: window.Dhad, html, localValues, source };
}

test("runtime exposes only the renamed Dhad contract", async () => {
  const { api } = await loadRuntime();
  assert.ok(api);
  assert.equal(typeof api.configureSymbols, "function");
  assert.equal(typeof api.setSyncState, "function");
  assert.equal(typeof api.setProgress, "function");
  assert.equal(typeof api.openDialog, "function");
  assert.equal(typeof api.moveKanbanCard, "function");
});

test("theme storage is guarded and uses the dhad root attribute", async () => {
  const { api, html, localValues } = await loadRuntime();
  assert.equal(html.getAttribute("data-dhad-theme"), "dark");
  assert.equal(api.setTheme("light"), "light");
  assert.equal(html.getAttribute("data-dhad-theme"), "light");
  assert.equal(localValues.get("dhad-theme"), "light");
});

test("declarative theme survives startup when no saved choice exists", async () => {
  const { html } = await loadRuntime({ declaredTheme: "light" });
  assert.equal(html.getAttribute("data-dhad-theme"), "light");
});

test("failed sync stays visible until a recovery or successful state", async () => {
  const { api } = await loadRuntime();
  const status = new FakeElement();
  assert.equal(api.setSyncState(status, "failed"), "failed");
  assert.equal(status.textContent, "تعذّر الحفظ أو المزامنة");
  assert.equal(api.setSyncState(status, "offline"), "failed");
  assert.equal(status.getAttribute("data-state"), "failed");
  assert.equal(api.setSyncState(status, "reconnecting"), "failed");
  assert.equal(status.getAttribute("data-state"), "failed");
  assert.equal(api.setSyncState(status, "synced"), "synced");
});

test("loading only restores state captured by a prior loading transition", async () => {
  const { api } = await loadRuntime();
  const button = new FakeElement("button");
  button.disabled = true;
  button.setAttribute("aria-label", "الإجراء الأصلي");

  assert.equal(api.setButtonLoading(button, false), false);
  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute("aria-label"), "الإجراء الأصلي");

  assert.equal(api.setButtonLoading(button, true, { label: "جارٍ التنفيذ" }), true);
  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute("aria-busy"), "true");
  assert.equal(api.setButtonLoading(button, false), false);
  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute("aria-label"), "الإجراء الأصلي");
  assert.equal(button.hasAttribute("aria-busy"), false);
});

test("symbol modes preserve host content, partial fallbacks and informative names", async () => {
  const { api } = await loadRuntime();
  const symbol = new FakeElement("span");
  const original = new FakeElement("svg");
  original.textContent = "original";
  symbol.appendChild(original);
  symbol.setAttribute("data-dhad-symbol", "warning");
  symbol.setAttribute("role", "img");
  symbol.setAttribute("aria-label", "تحذير");

  api.configureSymbols({ mode: "emoji", map: { warning: "⚠️" }, root: symbol });
  assert.equal(symbol.textContent, "⚠️");
  assert.equal(symbol.hasAttribute("aria-hidden"), false);

  api.configureSymbols({
    mode: "icon",
    map: { warning: { icon: "warning" } },
    renderIcon: (name) => new FakeElement(name === "warning" ? "svg" : "span"),
    root: symbol
  });
  assert.equal(symbol.firstChild.tagName, "SVG");
  assert.equal(symbol.getAttribute("data-dhad-icon-name"), "warning");

  api.configureSymbols({ mode: "none", root: symbol });
  assert.equal(symbol.hidden, true);
  api.configureSymbols({ mode: "inherit", root: symbol });
  assert.equal(symbol.hidden, false);
  assert.equal(symbol.firstChild, original);
  assert.equal(symbol.getAttribute("role"), "img");
  assert.equal(symbol.getAttribute("aria-label"), "تحذير");
  assert.equal(symbol.hasAttribute("data-dhad-icon-name"), false);

  const fallback = new FakeElement("span");
  const fallbackIcon = new FakeElement("svg");
  fallback.appendChild(fallbackIcon);
  fallback.setAttribute("data-dhad-symbol", "unmapped");
  api.configureSymbols({ mode: "emoji", map: { warning: "⚠️" }, root: fallback });
  assert.equal(fallback.firstChild, fallbackIcon);
});

test("read-only preserves original action, field, select and contenteditable state", async () => {
  const { api } = await loadRuntime();
  const region = new FakeElement("section");
  const action = new FakeElement("button");
  const input = new FakeElement("input");
  const select = new FakeElement("select");
  const editor = new FakeElement("div");
  action.disabled = true;
  input.readOnly = true;
  editor.setAttribute("contenteditable", "true");
  region.querySelectorAll = (selector) => selector === "[data-dhad-write-action]" ? [action] : [input, select, editor];

  api.setReadOnly(region, false);
  assert.equal(action.disabled, true);
  assert.equal(input.readOnly, true);
  assert.equal(select.disabled, false);
  assert.equal(editor.getAttribute("contenteditable"), "true");

  api.setReadOnly(region, true);
  assert.equal(action.disabled, true);
  assert.equal(input.readOnly, true);
  assert.equal(select.disabled, true);
  assert.equal(editor.getAttribute("contenteditable"), "false");

  api.setReadOnly(region, false);
  assert.equal(action.disabled, true);
  assert.equal(input.readOnly, true);
  assert.equal(select.disabled, false);
  assert.equal(editor.getAttribute("contenteditable"), "true");
});

test("progress publishes numeric and textual semantics in RTL", async () => {
  const { api } = await loadRuntime();
  const progress = new FakeElement();
  const result = api.setProgress(progress, { value: 17, max: 25, label: "تقدم المشاهد" });
  assert.equal(result.ratio, 17 / 25);
  assert.equal(progress.getAttribute("role"), "progressbar");
  assert.equal(progress.getAttribute("aria-valuenow"), "17");
  assert.equal(progress.getAttribute("aria-valuetext"), "17 / 25");
  assert.equal(progress.style.values.get("--dhad-progress"), String(17 / 25));
});

test("dialog source contains queue, focus trap, inert isolation and scroll lock", async () => {
  const { source } = await loadRuntime();
  assert.match(source, /dialogQueue/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /element\.inert = true/);
  assert.match(source, /aria-modal/);
  assert.match(source, /body\.style\.overflow = "hidden"/);
  assert.match(source, /previousFocus\.focus/);
});

test("split CSS keeps the dhad namespace, touch target and required breakpoints", async () => {
  const [core, patterns, recipes, runtime] = await Promise.all([
    readFile(coreUrl, "utf8"),
    readFile(patternsUrl, "utf8"),
    readFile(recipesUrl, "utf8"),
    readFile(runtimeUrl, "utf8")
  ]);
  const css = core + patterns + recipes;
  assert.doesNotMatch(css, /\.an-/);
  assert.match(core, /--dhad-size-touch, 44px/);
  assert.match(css, /max-width: 600px/);
  assert.match(css, /max-width: 390px/);
  assert.match(core, /prefers-reduced-motion: reduce/);
  assert.match(core, /forced-colors: active/);
  assert.match(core, /--dhad-progress-color:\s*var\(--dhad-color-accent-text\)/);
  assert.match(patterns, /border-inline-end-color:\s*var\(--dhad-color-accent-text\)/);
  assert.match(runtime, /data-dhad-kanban-move/);
  assert.match(recipes, /dhad-production-teleprompter/);
});
