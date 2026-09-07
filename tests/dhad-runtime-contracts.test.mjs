import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../src/dhad/assets/starter/", import.meta.url);
const runtimeUrl = new URL("js/dhad.runtime.js", root);
const coreUrl = new URL("css/dhad.core.css", root);
const patternsUrl = new URL("css/dhad.patterns.css", root);

/* The runtime only ever reads a compound of tag, .class and [attr] / [attr='value'],
   optionally behind a ":scope > " prefix. ponytail: no :not() support — the one
   selector that needs it (focusableElements) is not on any path these tests drive. */
function matchesCompound(element, compound) {
  const tag = compound.match(/^[a-zA-Z][\w-]*/);
  if (tag && element.tagName !== tag[0].toUpperCase()) return false;
  const tokens = (tag ? compound.slice(tag[0].length) : compound).match(/\.[\w-]+|\[[^\]]+\]/g) || [];
  return tokens.every((token) => {
    if (token[0] === ".") return element.classes.has(token.slice(1));
    const [name, raw] = token.slice(1, -1).split("=");
    if (raw === undefined) return element.hasAttribute(name);
    return element.getAttribute(name) === raw.replace(/^['"]|['"]$/g, "");
  });
}

/* ponytail: one shared focus cell — node:test runs these files' tests sequentially. */
let focused = null;

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
    this.listeners = [];
    this._textContent = "";
    this.hidden = false;
    this.disabled = false;
    this.readOnly = false;
    this.type = "text";
    this.direction = "rtl";
  }

  get className() { return Array.from(this.classes).join(" "); }
  set className(value) {
    this.classes.clear();
    String(value).split(/\s+/).filter(Boolean).forEach((name) => this.classes.add(name));
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
  append(...nodes) { nodes.forEach((node) => this.appendChild(node)); }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  focus() { focused = this; }
  contains(node) {
    for (let current = node; current; current = current.parentNode) if (current === this) return true;
    return false;
  }
  get descendants() {
    return this.children.flatMap((child) => [child, ...child.descendants]);
  }
  matches(selector) {
    return selector.split(",").some((compound) => matchesCompound(this, compound.trim()));
  }
  closest(selector) {
    for (let current = this; current; current = current.parentNode) if (current.matches(selector)) return current;
    return null;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const found = new Set();
    selector.split(",").forEach((raw) => {
      const compound = raw.trim();
      const scoped = compound.startsWith(":scope >");
      const pool = scoped ? this.children : this.descendants;
      const target = scoped ? compound.slice(":scope >".length).trim() : compound;
      pool.forEach((node) => { if (matchesCompound(node, target)) found.add(node); });
    });
    return Array.from(found);
  }
  addEventListener(type, handler, options) {
    this.listeners.push({ type, handler, once: Boolean(options && options.once) });
  }
  removeEventListener(type, handler) {
    const index = this.listeners.findIndex((entry) => entry.type === type && entry.handler === handler);
    if (index >= 0) this.listeners.splice(index, 1);
  }
  dispatchEvent(event) {
    if (!event.target) event.target = this;
    if (typeof event.preventDefault !== "function") event.preventDefault = () => {};
    for (let node = this; node; node = node.parentNode) {
      const current = node;
      current.listeners.filter((entry) => entry.type === event.type).forEach((entry) => {
        if (entry.once) current.removeEventListener(entry.type, entry.handler);
        entry.handler.call(current, event);
      });
    }
    return true;
  }
}

function keydown(key, extra) {
  return Object.assign({ type: "keydown", key, shiftKey: false, altKey: false, preventDefault() {} }, extra);
}

/* wire() sweeps a dozen selectors; a stub scope answers only the one under test. */
function scopeFor(selector, elements) {
  return { querySelectorAll: (query) => (query === selector ? elements : []) };
}

function element(tagName, attributes, parent) {
  const node = new FakeElement(tagName);
  Object.entries(attributes || {}).forEach(([name, value]) => {
    if (name === "class") node.className = value;
    else node.setAttribute(name, value);
  });
  if (parent) parent.appendChild(node);
  return node;
}

async function loadRuntime(options = {}) {
  const source = await readFile(runtimeUrl, "utf8");
  focused = null;
  const html = new FakeElement("html");
  html.clientWidth = 1280;
  html.style.overflow = "";
  if (options.declaredTheme) html.setAttribute("data-dhad-theme", options.declaredTheme);
  const body = options.withBody ? new FakeElement("body") : null;
  const listeners = new Map();
  const selectors = [];
  const document = {
    documentElement: html,
    readyState: options.readyState || "loading",
    body,
    get activeElement() { return focused; },
    hidden: false,
    createElement(tagName) { return new FakeElement(tagName); },
    querySelector(selector) { return body ? body.querySelector(selector) : null; },
    querySelectorAll(selector) {
      selectors.push(selector);
      return body ? body.querySelectorAll(selector) : [];
    },
    getElementById(id) { return body ? body.descendants.find((node) => node.id === id) || null : null; },
    addEventListener(name, handler) { listeners.set(name, handler); },
    removeEventListener() {},
    dispatchEvent() { return true; }
  };
  const localValues = new Map();
  if (options.savedTheme) localValues.set("dhad-theme", options.savedTheme);
  const window = {
    document,
    localStorage: {
      getItem(key) {
        if (options.storageThrows) throw new Error("SecurityError: storage is disabled");
        return localValues.get(key) || null;
      },
      setItem(key, value) {
        if (options.storageThrows) throw new Error("SecurityError: storage is disabled");
        localValues.set(key, value);
      }
    },
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    /* Explicit direction: the runtime falls back to RTL when getComputedStyle is missing,
       which would make an inverted mapping look correct by accident. */
    getComputedStyle(element) { return { direction: element.direction || "rtl" }; },
    setTimeout,
    clearTimeout,
    queueMicrotask,
    Promise,
    Date,
    performance,
    innerWidth: 1280
  };
  vm.runInNewContext(source, { window, Set, Map, WeakMap, Object, Array, Number, String, Boolean, Math, Date, Promise, TypeError });
  return { api: window.Dhad, html, body, localValues, selectors, source };
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
  assert.equal(html.getAttribute("data-dhad-theme"), "auto");
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

test("progress publishes numeric and textual semantics", async () => {
  const { api } = await loadRuntime();
  const progress = new FakeElement();
  const result = api.setProgress(progress, { value: 17, max: 25, label: "تقدم المشاهد" });
  assert.equal(result.ratio, 17 / 25);
  assert.equal(progress.getAttribute("role"), "progressbar");
  assert.equal(progress.getAttribute("aria-valuenow"), "17");
  assert.equal(progress.getAttribute("aria-valuetext"), "17 / 25");
  assert.equal(progress.style.values.get("--dhad-progress"), String(17 / 25));
});

test("tab arrows follow reading order in both directions", async () => {
  const { api } = await loadRuntime();
  const tabs = element("div", { "data-dhad-tabs": "" });
  const list = element("div", { class: "dhad-tabs__list" }, tabs);
  const items = ["one", "two", "three"].map((value) =>
    element("button", { "data-dhad-tab": value, class: "dhad-tabs__tab" }, list));

  api.wire(scopeFor("[data-dhad-tabs], .dhad-tabs", [tabs]));
  assert.equal(tabs.getAttribute("data-tab"), "one");

  list.direction = "rtl";
  items[0].dispatchEvent(keydown("ArrowLeft"));
  assert.equal(tabs.getAttribute("data-tab"), "two", "ArrowLeft advances in Arabic");
  items[1].dispatchEvent(keydown("ArrowRight"));
  assert.equal(tabs.getAttribute("data-tab"), "one", "ArrowRight retreats in Arabic");

  list.direction = "ltr";
  items[0].dispatchEvent(keydown("ArrowRight"));
  assert.equal(tabs.getAttribute("data-tab"), "two", "ArrowRight advances in Latin");
  items[1].dispatchEvent(keydown("ArrowLeft"));
  assert.equal(tabs.getAttribute("data-tab"), "one", "ArrowLeft retreats in Latin");
});

test("segmented arrows follow reading order in both directions", async () => {
  const { api } = await loadRuntime();
  const group = element("div", { "data-dhad-segmented": "" });
  const items = ["day", "week", "month"].map((value) =>
    element("button", { "data-dhad-segment": value, class: "dhad-segmented__item" }, group));

  api.wire(scopeFor("[data-dhad-segmented], .dhad-segmented", [group]));
  assert.equal(group.getAttribute("data-value"), "day");

  group.direction = "rtl";
  items[0].dispatchEvent(keydown("ArrowLeft"));
  assert.equal(group.getAttribute("data-value"), "week", "ArrowLeft advances in Arabic");
  items[1].dispatchEvent(keydown("ArrowRight"));
  assert.equal(group.getAttribute("data-value"), "day", "ArrowRight retreats in Arabic");

  group.direction = "ltr";
  items[0].dispatchEvent(keydown("ArrowRight"));
  assert.equal(group.getAttribute("data-value"), "week", "ArrowRight advances in Latin");
  items[1].dispatchEvent(keydown("ArrowLeft"));
  assert.equal(group.getAttribute("data-value"), "day", "ArrowLeft retreats in Latin");
});

test("kanban arrows move a card along reading order in both directions", async () => {
  const { api } = await loadRuntime();
  const board = element("div", { "data-dhad-kanban": "" });
  const columns = ["todo", "doing", "done"].map((stage) =>
    element("div", { "data-dhad-kanban-column": "", "data-dhad-stage": stage }, board));
  const card = element("article", { "data-dhad-kanban-card": "", "data-dhad-card-name": "مهمة" }, columns[0]);

  api.wire(scopeFor("[data-dhad-kanban], .dhad-kanban", [board]));

  board.direction = "rtl";
  card.dispatchEvent(keydown("ArrowLeft", { altKey: true, shiftKey: true }));
  assert.equal(card.parentNode, columns[1], "ArrowLeft advances in Arabic");
  card.dispatchEvent(keydown("ArrowRight", { altKey: true, shiftKey: true }));
  assert.equal(card.parentNode, columns[0], "ArrowRight retreats in Arabic");

  board.direction = "ltr";
  card.dispatchEvent(keydown("ArrowRight", { altKey: true, shiftKey: true }));
  assert.equal(card.parentNode, columns[1], "ArrowRight advances in Latin");
  card.dispatchEvent(keydown("ArrowLeft", { altKey: true, shiftKey: true }));
  assert.equal(card.parentNode, columns[0], "ArrowLeft retreats in Latin");
});

test("closing a dialog gives the page back its inertness and scroll", async () => {
  const { api, html, body } = await loadRuntime({ withBody: true, readyState: "complete" });
  const page = element("main", {}, body);

  const settled = api.openDialog({ message: "هل تريد المتابعة؟" });
  assert.equal(page.getAttribute("aria-hidden"), "true");
  assert.equal(html.style.overflow, "hidden");

  const overlay = body.children[1];
  assert.equal(api.closeDialog(true, "test"), true);
  overlay.dispatchEvent({ type: "animationend" });

  assert.equal(await settled, true);
  assert.equal(page.hasAttribute("aria-hidden"), false, "the page is interactive again");
  assert.equal(html.style.overflow, "", "the page scrolls again");
  assert.equal(overlay.parentNode, null);
});

test("runtime still wires the page when storage access throws", async () => {
  const { api, selectors } = await loadRuntime({ storageThrows: true, readyState: "complete" });
  assert.ok(api, "the module survives a storage exception");
  assert.ok(selectors.includes("[data-dhad-toast]"), "wire(document) ran");
});

test("a saved theme choice outranks the declared root theme", async () => {
  const { html } = await loadRuntime({ savedTheme: "dark", declaredTheme: "light" });
  assert.equal(html.getAttribute("data-dhad-theme"), "dark");
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
  const [core, patterns, runtime] = await Promise.all([
    readFile(coreUrl, "utf8"),
    readFile(patternsUrl, "utf8"),
    readFile(runtimeUrl, "utf8")
  ]);
  const css = core + patterns;
  assert.doesNotMatch(css, /\.an-/);
  assert.match(core, /--dhad-size-touch, 44px/);
  assert.match(css, /max-width: 600px/);
  assert.match(css, /max-width: 390px/);
  assert.match(core, /prefers-reduced-motion: reduce/);
  assert.match(core, /forced-colors: active/);
  assert.match(core, /--dhad-progress-color:\s*var\(--dhad-color-accent-text\)/);
  assert.match(patterns, /border-inline-end-color:\s*var\(--dhad-color-accent-text\)/);
  assert.match(runtime, /data-dhad-kanban-move/);
  assert.match(core, /:dir\(rtl\) \.dhad-progress__fill/);
});
