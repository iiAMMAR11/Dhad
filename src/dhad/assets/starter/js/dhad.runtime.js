(function (global) {
  "use strict";

  const document = global.document;
  if (!document) return;

  const THEME_KEY = "dhad-theme";
  const VALID_THEMES = new Set(["auto", "dark", "light"]);
  const VALID_SYMBOL_MODES = new Set(["inherit", "emoji", "icon", "none"]);
  const SYNC_LABELS = Object.freeze({
    idle: "جاهز",
    saving: "جارٍ الحفظ",
    saved: "تم الحفظ",
    syncing: "جارٍ المزامنة",
    synced: "تمت المزامنة",
    failed: "تعذّر الحفظ أو المزامنة",
    offline: "دون اتصال - العمل محفوظ محليًا",
    reconnecting: "جارٍ استعادة الاتصال",
    "local-pending": "محفوظ محليًا وبانتظار المزامنة"
  });

  const settings = {
    toastDuration: 2800,
    symbolMode: "inherit",
    symbolMap: Object.create(null),
    renderIcon: null
  };

  const toastControllers = new Set();
  const symbolState = new WeakMap();
  const buttonLoadingState = new WeakMap();
  const readonlyControlState = new WeakMap();
  const readonlyRegionState = new WeakMap();
  const dialogQueue = [];
  let activeDialog = null;
  let activeMenu = null;
  let dialogSequence = 0;
  let fieldSequence = 0;
  let tabSequence = 0;
  let visibilityWired = false;

  function dispatch(name, detail, target) {
    const destination = target || document;
    if (!destination || typeof destination.dispatchEvent !== "function") return;
    const EventConstructor = global.CustomEvent;
    if (typeof EventConstructor !== "function") return;
    destination.dispatchEvent(new EventConstructor("dhad:" + name, { bubbles: true, detail }));
  }

  function safeStorageGet(key) {
    try {
      return global.localStorage ? global.localStorage.getItem(key) : null;
    } catch (_error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      if (global.localStorage) global.localStorage.setItem(key, value);
    } catch (_error) {
      // Storage can be unavailable in privacy modes or sandboxed embeds.
    }
  }

  function root() {
    return document.documentElement;
  }

  function preferredTheme() {
    const saved = safeStorageGet(THEME_KEY);
    if (VALID_THEMES.has(saved)) return saved;
    const declared = root().getAttribute("data-dhad-theme");
    return VALID_THEMES.has(declared) ? declared : "auto";
  }

  function setTheme(theme, options) {
    const opts = options || {};
    const next = VALID_THEMES.has(theme) ? theme : "auto";
    root().setAttribute("data-dhad-theme", next);
    if (opts.persist !== false) safeStorageSet(THEME_KEY, next);

    document.querySelectorAll("[data-dhad-theme-label]").forEach((element) => {
      element.textContent = next === "light" ? "استخدام الوضع الداكن" : "استخدام الوضع الفاتح";
    });
    document.querySelectorAll("[data-dhad-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(next === "light"));
    });

    dispatch("themechange", { theme: next });
    return next;
  }

  function toggleTheme() {
    const current = root().getAttribute("data-dhad-theme");
    return setTheme(current === "light" ? "dark" : "light");
  }

  /* Symbols are opt-in and consumer-controlled. Core never assumes a domain. */
  function configureSymbols(options) {
    const opts = options || {};
    if (opts.mode !== undefined) {
      if (!VALID_SYMBOL_MODES.has(opts.mode)) {
        throw new TypeError("Dhad.configureSymbols: invalid mode");
      }
      settings.symbolMode = opts.mode;
    }
    if (opts.map && typeof opts.map === "object") {
      settings.symbolMap = Object.assign(Object.create(null), settings.symbolMap, opts.map);
    }
    if (opts.renderIcon !== undefined) {
      if (opts.renderIcon !== null && typeof opts.renderIcon !== "function") {
        throw new TypeError("Dhad.configureSymbols: renderIcon must be a function or null");
      }
      settings.renderIcon = opts.renderIcon;
    }
    if (opts.apply !== false) applySymbols(opts.root || document);
    return { mode: settings.symbolMode, map: Object.assign({}, settings.symbolMap) };
  }

  function closestSymbolMode(element) {
    if (settings.symbolMode !== "inherit") return settings.symbolMode;
    const owner = element.closest ? element.closest("[data-dhad-symbol-mode]") : null;
    const inherited = owner && owner.getAttribute("data-dhad-symbol-mode");
    return VALID_SYMBOL_MODES.has(inherited) && inherited !== "inherit" ? inherited : "inherit";
  }

  function clearSymbol(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  function captureAttribute(element, name) {
    return {
      present: element.hasAttribute(name),
      value: element.getAttribute(name)
    };
  }

  function restoreAttribute(element, name, state) {
    if (state.present) element.setAttribute(name, state.value === null ? "" : state.value);
    else element.removeAttribute(name);
  }

  function rememberSymbol(element) {
    let state = symbolState.get(element);
    if (state) return state;
    state = {
      children: Array.from(element.childNodes),
      hidden: Boolean(element.hidden),
      emojiClass: element.classList.contains("dhad-emoji"),
      iconClass: element.classList.contains("dhad-icon"),
      ariaHidden: captureAttribute(element, "aria-hidden"),
      ariaLabel: captureAttribute(element, "aria-label"),
      role: captureAttribute(element, "role"),
      iconName: captureAttribute(element, "data-dhad-icon-name")
    };
    symbolState.set(element, state);
    return state;
  }

  function restoreSymbol(element, release) {
    const state = symbolState.get(element);
    if (!state) return false;
    clearSymbol(element);
    state.children.forEach((child) => element.appendChild(child));
    element.hidden = state.hidden;
    element.classList.toggle("dhad-emoji", state.emojiClass);
    element.classList.toggle("dhad-icon", state.iconClass);
    restoreAttribute(element, "aria-hidden", state.ariaHidden);
    restoreAttribute(element, "aria-label", state.ariaLabel);
    restoreAttribute(element, "role", state.role);
    restoreAttribute(element, "data-dhad-icon-name", state.iconName);
    if (release) symbolState.delete(element);
    return true;
  }

  function symbolValueFor(role, mode) {
    const entry = settings.symbolMap[role];
    if (entry && typeof entry === "object" && !entry.nodeType) {
      return entry[mode];
    }
    return entry;
  }

  function accessibleSymbolOwner(element) {
    return element.closest ? element.closest("button, a, [role='button'], [role='link'], [data-dhad-symbol-owner]") : null;
  }

  function applySymbolAccessibility(element, mode, label, owner) {
    if (mode === "none" || owner) {
      element.setAttribute("aria-hidden", "true");
      return;
    }
    const informative = Boolean(
      label ||
      element.hasAttribute("aria-label") ||
      element.hasAttribute("aria-labelledby") ||
      element.getAttribute("role") === "img" ||
      element.hasAttribute("data-dhad-symbol-informative")
    );
    if (!informative) {
      element.setAttribute("aria-hidden", "true");
      return;
    }
    element.removeAttribute("aria-hidden");
    if (!element.hasAttribute("role")) element.setAttribute("role", "img");
    if (label && !element.hasAttribute("aria-label") && !element.hasAttribute("aria-labelledby")) {
      element.setAttribute("aria-label", label);
    }
  }

  function renderIconValue(value, role, element) {
    let rendered = value;
    if (typeof value === "string") {
      if (typeof settings.renderIcon !== "function") return null;
      rendered = settings.renderIcon(value, role, element);
      element.setAttribute("data-dhad-icon-name", value);
    } else if (typeof value === "function") {
      rendered = value(role, element);
    }
    return rendered && rendered.nodeType ? rendered : null;
  }

  function applySymbol(element) {
    const role = element.getAttribute("data-dhad-symbol");
    const mode = closestSymbolMode(element);
    const label = element.getAttribute("data-dhad-symbol-label");
    const owner = accessibleSymbolOwner(element);

    if (mode === "inherit") {
      restoreSymbol(element, true);
      return;
    }

    if (mode === "none") {
      rememberSymbol(element);
      restoreSymbol(element, false);
      element.hidden = true;
      applySymbolAccessibility(element, mode, label, owner);
      return;
    }

    const value = symbolValueFor(role, mode);
    if (value === undefined || value === null) {
      restoreSymbol(element, true);
      return;
    }

    rememberSymbol(element);
    restoreSymbol(element, false);
    element.hidden = false;
    element.classList.toggle("dhad-emoji", mode === "emoji");
    element.classList.toggle("dhad-icon", mode === "icon");

    if (mode === "emoji") {
      clearSymbol(element);
      element.textContent = String(value);
      applySymbolAccessibility(element, mode, label, owner);
      return;
    }

    if (mode === "icon") {
      const node = renderIconValue(value, role, element);
      if (!node) {
        restoreSymbol(element, true);
        return;
      }
      clearSymbol(element);
      element.appendChild(node.cloneNode ? node.cloneNode(true) : node);
      applySymbolAccessibility(element, mode, label, owner);
    }
  }

  function applySymbols(scope) {
    const container = scope || document;
    if (container.matches && container.matches("[data-dhad-symbol]")) applySymbol(container);
    container.querySelectorAll("[data-dhad-symbol]").forEach(applySymbol);
  }

  function ensureToastStack() {
    let stack = document.querySelector(".dhad-toast-stack");
    if (stack) return stack;
    if (!document.body) return null;
    stack = document.createElement("section");
    stack.className = "dhad-toast-stack";
    stack.setAttribute("aria-label", "الإشعارات");
    stack.setAttribute("aria-live", "off");
    document.body.appendChild(stack);
    return stack;
  }

  function normalizeToastOptions(typeOrOptions, duration) {
    if (typeOrOptions && typeof typeOrOptions === "object") return Object.assign({}, typeOrOptions);
    return { type: typeOrOptions || "neutral", duration };
  }

  function toast(message, typeOrOptions, duration) {
    const opts = normalizeToastOptions(typeOrOptions, duration);
    const stack = ensureToastStack();
    if (!stack) {
      return { close() {}, pause() {}, resume() {}, element: null };
    }

    const element = document.createElement("article");
    const messageElement = document.createElement("p");
    const closeButton = document.createElement("button");
    const type = ["success", "error", "warning", "neutral"].includes(opts.type) ? opts.type : "neutral";
    const timeoutDuration = opts.persistent ? 0 : Number(opts.duration) || (type === "error" ? 6000 : settings.toastDuration);
    let remaining = Math.max(0, timeoutDuration);
    let startedAt = 0;
    let timer = null;
    let closed = false;

    element.className = "dhad-toast";
    element.setAttribute("data-type", type);
    element.setAttribute("data-paused", "false");
    messageElement.className = "dhad-toast__message";
    messageElement.setAttribute("role", type === "error" ? "alert" : "status");
    messageElement.setAttribute("aria-atomic", "true");
    messageElement.textContent = String(message || "");
    closeButton.className = "dhad-toast__close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", opts.closeLabel || "إغلاق الإشعار");
    closeButton.textContent = "×";
    element.append(messageElement, closeButton);
    stack.appendChild(element);

    function now() {
      return global.performance && typeof global.performance.now === "function" ? global.performance.now() : Date.now();
    }

    function close(reason) {
      if (closed) return;
      closed = true;
      if (timer !== null) global.clearTimeout(timer);
      element.setAttribute("data-closing", "true");
      toastControllers.delete(controller);
      dispatch("toastclose", { reason: reason || "programmatic", type, message: String(message || "") }, element);
      global.setTimeout(() => {
        if (element.parentNode) element.remove();
        if (stack && !stack.children.length) stack.remove();
      }, 220);
    }

    function pause() {
      if (closed || timer === null) return;
      remaining = Math.max(0, remaining - (now() - startedAt));
      global.clearTimeout(timer);
      timer = null;
      element.setAttribute("data-paused", "true");
    }

    function resume() {
      if (closed || timeoutDuration <= 0 || timer !== null) return;
      if (remaining <= 0) {
        close("timeout");
        return;
      }
      startedAt = now();
      timer = global.setTimeout(() => close("timeout"), remaining);
      element.setAttribute("data-paused", "false");
    }

    const controller = { close, pause, resume, element };
    toastControllers.add(controller);
    closeButton.addEventListener("click", () => close("dismiss"));
    element.addEventListener("mouseenter", pause);
    element.addEventListener("mouseleave", resume);
    element.addEventListener("focusin", pause);
    element.addEventListener("focusout", () => {
      global.setTimeout(() => {
        if (!element.contains(document.activeElement)) resume();
      }, 0);
    });
    if (timeoutDuration > 0) resume();

    while (stack.children.length > (Number(opts.maxVisible) || 4)) {
      const oldest = stack.firstElementChild;
      const oldController = Array.from(toastControllers).find((item) => item.element === oldest);
      if (oldController) oldController.close("overflow");
      else oldest.remove();
    }

    if (!visibilityWired) {
      visibilityWired = true;
      document.addEventListener("visibilitychange", () => {
        toastControllers.forEach((item) => {
          if (document.hidden) item.pause();
          else item.resume();
        });
      });
    }

    dispatch("toastopen", { type, message: String(message || "") }, element);
    return controller;
  }

  function captureControlState(control) {
    return {
      disabled: "disabled" in control ? Boolean(control.disabled) : undefined,
      readOnly: "readOnly" in control ? Boolean(control.readOnly) : undefined,
      ariaDisabled: captureAttribute(control, "aria-disabled"),
      ariaReadonly: captureAttribute(control, "aria-readonly"),
      contentEditable: captureAttribute(control, "contenteditable"),
      tabIndex: captureAttribute(control, "tabindex")
    };
  }

  function restoreControlState(control, state) {
    if (state.disabled !== undefined) control.disabled = state.disabled;
    if (state.readOnly !== undefined) control.readOnly = state.readOnly;
    restoreAttribute(control, "aria-disabled", state.ariaDisabled);
    restoreAttribute(control, "aria-readonly", state.ariaReadonly);
    restoreAttribute(control, "contenteditable", state.contentEditable);
    restoreAttribute(control, "tabindex", state.tabIndex);
  }

  function supportsNativeReadOnly(control) {
    const tag = String(control.tagName || "").toLowerCase();
    if (tag === "textarea") return true;
    if (tag !== "input") return false;
    const type = String(control.getAttribute("type") || control.type || "text").toLowerCase();
    return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(type);
  }

  function enforceControlLocks(control, record) {
    restoreControlState(control, record.baseline);
    const kinds = new Set(record.reasons.values());
    if (!kinds.size) return;

    if (kinds.has("action")) {
      if ("disabled" in control) control.disabled = true;
      else control.setAttribute("tabindex", "-1");
      control.setAttribute("aria-disabled", "true");
      return;
    }

    if (supportsNativeReadOnly(control)) {
      control.readOnly = true;
      control.setAttribute("aria-readonly", "true");
    } else if (control.hasAttribute("contenteditable")) {
      control.setAttribute("contenteditable", "false");
      control.setAttribute("aria-readonly", "true");
    } else if ("disabled" in control) {
      control.disabled = true;
      control.setAttribute("aria-disabled", "true");
    } else {
      control.setAttribute("aria-disabled", "true");
      control.setAttribute("tabindex", "-1");
    }
  }

  function setControlLock(control, reason, kind, active) {
    if (!control) return;
    let record = readonlyControlState.get(control);
    if (active) {
      if (!record) {
        record = { baseline: captureControlState(control), reasons: new Map() };
        readonlyControlState.set(control, record);
      }
      const previousKind = record.reasons.get(reason);
      record.reasons.set(reason, previousKind === "action" || kind === "action" ? "action" : "field");
      enforceControlLocks(control, record);
      return;
    }
    if (!record || !record.reasons.has(reason)) return;
    record.reasons.delete(reason);
    if (record.reasons.size) enforceControlLocks(control, record);
    else {
      restoreControlState(control, record.baseline);
      readonlyControlState.delete(control);
    }
  }

  function setButtonLoading(button, loading, options) {
    if (!button) return false;
    const opts = options || {};
    const isLoading = Boolean(loading);
    if (isLoading) {
      if (!buttonLoadingState.has(button)) {
        buttonLoadingState.set(button, {
          reason: {},
          ariaLabel: captureAttribute(button, "aria-label"),
          ariaBusy: captureAttribute(button, "aria-busy"),
          dataLoading: captureAttribute(button, "data-loading")
        });
      }
      const state = buttonLoadingState.get(button);
      setControlLock(button, state.reason, "action", true);
      button.setAttribute("aria-busy", "true");
      button.setAttribute("data-loading", "true");
      if (opts.label) button.setAttribute("aria-label", opts.label);
    } else {
      const previous = buttonLoadingState.get(button);
      if (!previous) return false;
      restoreAttribute(button, "aria-busy", previous.ariaBusy);
      restoreAttribute(button, "data-loading", previous.dataLoading);
      setControlLock(button, previous.reason, "action", false);
      if (opts.restoreLabel) button.setAttribute("aria-label", opts.restoreLabel);
      else restoreAttribute(button, "aria-label", previous.ariaLabel);
      buttonLoadingState.delete(button);
    }
    dispatch("buttonloading", { loading: isLoading }, button);
    return isLoading;
  }

  function setSyncState(target, state, options) {
    if (!target) return null;
    const opts = options || {};
    const next = Object.prototype.hasOwnProperty.call(SYNC_LABELS, state) ? state : "idle";
    const previous = target.getAttribute("data-state") || "idle";
    const isSuccessfulState = next === "saved" || next === "synced";
    if (previous === "failed" && !isSuccessfulState && opts.force !== true) return previous;

    target.classList.add("dhad-sync");
    target.setAttribute("data-state", next);
    target.setAttribute("role", next === "failed" ? "alert" : "status");
    target.setAttribute("aria-live", next === "failed" ? "assertive" : "polite");
    target.setAttribute("aria-atomic", "true");
    const label = target.querySelector("[data-dhad-sync-label]");
    const text = opts.label || SYNC_LABELS[next];
    if (label) label.textContent = text;
    else target.textContent = text;
    if (opts.timestamp) target.setAttribute("data-timestamp", String(opts.timestamp));
    dispatch("syncchange", { state: next, previous, label: text }, target);
    return next;
  }

  function setProgress(target, valueOrOptions, maxValue) {
    if (!target) return null;
    const opts = valueOrOptions && typeof valueOrOptions === "object"
      ? valueOrOptions
      : { value: valueOrOptions, max: maxValue };
    const max = Math.max(0, Number(opts.max === undefined ? 100 : opts.max));
    const value = Math.min(max, Math.max(0, Number(opts.value) || 0));
    const ratio = max > 0 ? value / max : 0;
    const valueText = opts.valueText || value + " / " + max;

    target.setAttribute("role", "progressbar");
    target.setAttribute("aria-valuemin", "0");
    target.setAttribute("aria-valuemax", String(max));
    target.setAttribute("aria-valuenow", String(value));
    target.setAttribute("aria-valuetext", valueText);
    if (opts.label) target.setAttribute("aria-label", opts.label);
    target.style.setProperty("--dhad-progress", String(ratio));
    const count = target.querySelector(".dhad-progress__count, [data-dhad-progress-count]");
    if (count) count.textContent = valueText;
    dispatch("progresschange", { value, max, ratio, valueText }, target);
    return { value, max, ratio, valueText };
  }

  function appendDescribedBy(control, id) {
    const ids = new Set((control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    ids.add(id);
    control.setAttribute("aria-describedby", Array.from(ids).join(" "));
  }

  function removeDescribedBy(control, id) {
    const ids = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter((value) => value && value !== id);
    if (ids.length) control.setAttribute("aria-describedby", ids.join(" "));
    else control.removeAttribute("aria-describedby");
  }

  function setFieldState(field, state, options) {
    if (!field) return null;
    const opts = options || {};
    const next = ["default", "error", "success", "readonly"].includes(state) ? state : "default";
    const control = field.querySelector(".dhad-input, .dhad-select, .dhad-textarea, input, select, textarea");
    let error = field.querySelector(".dhad-field__error");
    field.setAttribute("data-state", next);
    field.setAttribute("data-readonly", String(next === "readonly"));

    if (control) {
      if (next === "error") {
        control.setAttribute("aria-invalid", "true");
        if (!error && opts.message) {
          error = document.createElement("p");
          error.className = "dhad-field__error";
          field.appendChild(error);
        }
        if (error) {
          if (!error.id) {
            fieldSequence += 1;
            error.id = "dhad-field-error-" + fieldSequence.toString(36);
          }
          if (opts.message) error.textContent = String(opts.message);
          error.hidden = false;
          if (opts.announce) error.setAttribute("role", "alert");
          appendDescribedBy(control, error.id);
        }
      } else {
        control.removeAttribute("aria-invalid");
        if (error) {
          error.hidden = true;
          error.removeAttribute("role");
          if (error.id) removeDescribedBy(control, error.id);
        }
      }
      setControlLock(control, field, "field", next === "readonly");
    }
    dispatch("fieldstatechange", { state: next, control, message: opts.message || "" }, field);
    return next;
  }

  function focusableElements(container) {
    const selector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
      "[contenteditable='true']"
    ].join(",");
    return Array.from(container.querySelectorAll(selector)).filter((element) => {
      return element.getAttribute("aria-hidden") !== "true" && !element.hidden;
    });
  }

  function isolateDocument(overlay) {
    const records = [];
    Array.from(document.body.children).forEach((element) => {
      if (element === overlay) return;
      const record = {
        element,
        hadInert: "inert" in element,
        inert: element.inert,
        ariaHidden: element.getAttribute("aria-hidden")
      };
      records.push(record);
      if (record.hadInert) element.inert = true;
      else element.setAttribute("aria-hidden", "true");
    });
    return records;
  }

  function restoreIsolation(records) {
    records.forEach((record) => {
      if (record.hadInert) record.element.inert = record.inert;
      if (!record.hadInert) {
        if (record.ariaHidden === null) record.element.removeAttribute("aria-hidden");
        else record.element.setAttribute("aria-hidden", record.ariaHidden);
      }
    });
  }

  function lockScroll() {
    const html = document.documentElement;
    const body = document.body;
    const record = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPaddingInlineEnd: body.style.paddingInlineEnd
    };
    const scrollbar = Math.max(0, global.innerWidth - html.clientWidth);
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingInlineEnd = scrollbar + "px";
    return record;
  }

  function unlockScroll(record) {
    document.documentElement.style.overflow = record.htmlOverflow;
    document.body.style.overflow = record.bodyOverflow;
    document.body.style.paddingInlineEnd = record.bodyPaddingInlineEnd;
  }

  function nextDialogId() {
    dialogSequence += 1;
    return "dhad-dialog-" + Date.now().toString(36) + "-" + dialogSequence.toString(36);
  }

  function defaultDialogTitle(type) {
    if (type === "alert") return "تنبيه";
    if (type === "prompt") return "إدخال قيمة";
    return "تأكيد الإجراء";
  }

  function enqueueDialog(options) {
    const opts = Object.assign({ type: "confirm", dismissible: true, closeOnBackdrop: true }, options || {});
    return new Promise((resolve) => {
      const request = { opts, resolve, settled: false };
      if (opts.signal && opts.signal.aborted) {
        request.settled = true;
        resolve(opts.type === "prompt" ? null : false);
        return;
      }
      dialogQueue.push(request);
      if (opts.signal && typeof opts.signal.addEventListener === "function") {
        opts.signal.addEventListener("abort", () => {
          const index = dialogQueue.indexOf(request);
          if (index >= 0) {
            dialogQueue.splice(index, 1);
            request.settled = true;
            resolve(opts.type === "prompt" ? null : false);
          } else if (activeDialog && activeDialog.request === request) {
            closeDialog(opts.type === "prompt" ? null : false, "abort");
          }
        }, { once: true });
      }
      openNextDialog();
    });
  }

  function openNextDialog() {
    if (activeDialog || !dialogQueue.length) return;
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", openNextDialog, { once: true });
      return;
    }

    const request = dialogQueue.shift();
    if (!request || request.settled) {
      openNextDialog();
      return;
    }
    const opts = request.opts;
    const id = nextDialogId();
    const titleId = id + "-title";
    const descriptionId = id + "-description";
    const inputId = id + "-input";
    const errorId = id + "-error";
    const overlay = document.createElement("div");
    const dialog = document.createElement("section");
    const form = document.createElement("form");
    const header = document.createElement("header");
    const title = document.createElement("h2");
    const description = document.createElement("p");
    const actions = document.createElement("div");
    const previousFocus = document.activeElement;
    let body = null;
    let input = null;
    let cancelButton = null;
    let closeButton = null;

    overlay.className = "dhad-dialog-overlay";
    overlay.setAttribute("data-dhad-dialog-id", id);
    dialog.className = "dhad-dialog";
    if (opts.variant === "task-form") {
      overlay.classList.add("dhad-dialog-overlay--task-form");
      dialog.classList.add("dhad-dialog--task-form");
      dialog.setAttribute("data-variant", "task-form");
    }
    dialog.setAttribute("role", opts.role || "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", titleId);
    dialog.setAttribute("aria-describedby", descriptionId);
    dialog.tabIndex = -1;
    form.className = "dhad-dialog__form";
    form.noValidate = true;
    header.className = "dhad-dialog__header";
    title.className = "dhad-dialog__title";
    title.id = titleId;
    title.textContent = String(opts.title || defaultDialogTitle(opts.type));
    description.className = "dhad-dialog__description";
    description.id = descriptionId;
    description.textContent = String(opts.message || "");
    actions.className = "dhad-dialog__actions";
    if (opts.headerClose === true || opts.variant === "task-form") {
      header.classList.add("dhad-dialog__header--with-action");
      closeButton = document.createElement("button");
      closeButton.className = "dhad-dialog__close";
      closeButton.type = "button";
      closeButton.setAttribute("data-dhad-dialog-close", "");
      closeButton.setAttribute("aria-label", String(opts.closeLabel || "إغلاق"));
      closeButton.textContent = "×";
      header.append(title, closeButton, description);
    } else {
      header.append(title, description);
    }
    form.appendChild(header);
    if (opts.variant === "task-form") {
      body = document.createElement("div");
      body.className = "dhad-dialog__body dhad-dialog__body--scroll";
      form.appendChild(body);
    }

    if (opts.type === "prompt") {
      const field = document.createElement("div");
      const label = document.createElement("label");
      const error = document.createElement("p");
      field.className = "dhad-field dhad-dialog__field";
      label.className = "dhad-field__label";
      label.htmlFor = inputId;
      label.textContent = String(opts.inputLabel || "القيمة");
      input = opts.multiline ? document.createElement("textarea") : document.createElement("input");
      input.id = inputId;
      input.className = opts.multiline ? "dhad-textarea" : "dhad-input";
      input.value = opts.value === undefined ? "" : String(opts.value);
      if (!opts.multiline) input.type = opts.inputType || "text";
      if (opts.placeholder) input.placeholder = String(opts.placeholder);
      if (opts.required) input.required = true;
      input.setAttribute("aria-describedby", descriptionId + " " + errorId);
      error.className = "dhad-field__error";
      error.id = errorId;
      error.hidden = true;
      error.textContent = String(opts.requiredMessage || "أدخل قيمة قبل المتابعة");
      input.addEventListener("input", () => {
        input.removeAttribute("aria-invalid");
        error.hidden = true;
      });
      field.append(label, input, error);
      (body || form).appendChild(field);
    }

    if (opts.type !== "alert") {
      cancelButton = document.createElement("button");
      cancelButton.className = "dhad-btn dhad-btn--quiet";
      cancelButton.type = "button";
      cancelButton.textContent = String(opts.cancelLabel || "إلغاء");
      actions.appendChild(cancelButton);
    } else {
      actions.style.setProperty("--dhad-dialog-action-count", "1");
    }

    const confirmButton = document.createElement("button");
    confirmButton.className = "dhad-btn " + (opts.destructive ? "dhad-btn--danger" : "dhad-btn--primary");
    confirmButton.type = "submit";
    confirmButton.textContent = String(opts.confirmLabel || (opts.type === "alert" ? "حسنًا" : "تأكيد"));
    actions.appendChild(confirmButton);
    form.appendChild(actions);
    dialog.appendChild(form);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const isolation = isolateDocument(overlay);
    const scrollRecord = lockScroll();
    activeDialog = {
      id,
      request,
      overlay,
      dialog,
      body,
      input,
      cancelButton,
      closeButton,
      confirmButton,
      previousFocus,
      isolation,
      scrollRecord,
      closing: false,
      keydown: null
    };

    function cancel(reason) {
      const value = opts.type === "prompt" ? null : false;
      closeDialog(value, reason || "cancel");
    }

    function onKeydown(event) {
      if (!activeDialog || activeDialog.id !== id) return;
      if (event.key === "Escape" && opts.dismissible !== false) {
        event.preventDefault();
        cancel("escape");
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableElements(dialog);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    activeDialog.keydown = onKeydown;
    document.addEventListener("keydown", onKeydown, true);
    if (cancelButton) cancelButton.addEventListener("click", () => cancel("cancel"));
    if (closeButton) closeButton.addEventListener("click", () => cancel("close"));
    overlay.addEventListener("pointerdown", (event) => {
      if (event.target === overlay && opts.dismissible !== false && opts.closeOnBackdrop !== false) cancel("backdrop");
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (input && opts.required && !input.value.trim()) {
        const error = document.getElementById(errorId);
        input.setAttribute("aria-invalid", "true");
        if (error) error.hidden = false;
        input.focus();
        return;
      }
      closeDialog(input ? input.value : true, "confirm");
    });

    const initial = input || (opts.destructive && cancelButton ? cancelButton : confirmButton);
    const requestFrame = global.requestAnimationFrame || ((callback) => global.setTimeout(callback, 0));
    initial.focus({ preventScroll: true });
    requestFrame(() => {
      if (activeDialog && activeDialog.id === id && !dialog.contains(document.activeElement)) {
        initial.focus({ preventScroll: true });
      }
    });
    dispatch("dialogopen", { id, type: opts.type, variant: opts.variant || "default", destructive: Boolean(opts.destructive) }, dialog);
  }

  function closeDialog(value, reason) {
    const state = activeDialog;
    if (!state || state.closing) return false;
    state.closing = true;
    state.overlay.setAttribute("data-closing", "true");
    document.removeEventListener("keydown", state.keydown, true);
    dispatch("dialogclose", { id: state.id, reason: reason || "programmatic", value }, state.dialog);

    let finalized = false;
    function finalize() {
      if (finalized || activeDialog !== state) return;
      finalized = true;
      restoreIsolation(state.isolation);
      unlockScroll(state.scrollRecord);
      if (state.overlay.parentNode) state.overlay.remove();
      state.request.settled = true;
      state.request.resolve(value);
      activeDialog = null;
      if (state.previousFocus && state.previousFocus.isConnected && typeof state.previousFocus.focus === "function") {
        state.previousFocus.focus();
      }
      const schedule = global.queueMicrotask || ((callback) => Promise.resolve().then(callback));
      schedule(openNextDialog);
    }

    state.overlay.addEventListener("animationend", finalize, { once: true });
    global.setTimeout(finalize, 260);
    return true;
  }

  function openDialog(options) {
    return enqueueDialog(options);
  }

  function confirmDialog(message, options) {
    return enqueueDialog(Object.assign({}, options, { type: "confirm", message }));
  }

  function promptDialog(message, options) {
    return enqueueDialog(Object.assign({}, options, { type: "prompt", message }));
  }

  function alertDialog(message, options) {
    return enqueueDialog(Object.assign({}, options, { type: "alert", message }));
  }

  function closeMenu(options) {
    if (!activeMenu) return;
    const state = activeMenu;
    activeMenu = null;
    state.menu.hidden = true;
    state.menu.removeAttribute("data-open");
    state.trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", state.onOutside, true);
    document.removeEventListener("keydown", state.onKeydown, true);
    if (!options || options.restoreFocus !== false) state.trigger.focus();
    dispatch("menuclose", { id: state.menu.id }, state.menu);
  }

  function openMenu(trigger, menu) {
    if (!trigger || !menu) return false;
    if (activeMenu && activeMenu.menu === menu) {
      closeMenu();
      return false;
    }
    if (activeMenu) closeMenu({ restoreFocus: false });
    const items = () => focusableElements(menu).filter((item) => item.getAttribute("role") === "menuitem" || item.classList.contains("dhad-menu__item"));
    const onOutside = (event) => {
      if (!menu.contains(event.target) && !trigger.contains(event.target)) closeMenu({ restoreFocus: false });
    };
    const onKeydown = (event) => {
      if (!activeMenu || activeMenu.menu !== menu) return;
      const available = items();
      const index = available.indexOf(document.activeElement);
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        available[(index + 1 + available.length) % available.length]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        available[(index - 1 + available.length) % available.length]?.focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        available[0]?.focus();
      } else if (event.key === "End") {
        event.preventDefault();
        available[available.length - 1]?.focus();
      } else if (event.key === "Tab") {
        closeMenu({ restoreFocus: false });
      }
    };

    activeMenu = { trigger, menu, onOutside, onKeydown };
    menu.hidden = false;
    menu.setAttribute("data-open", "true");
    trigger.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", onOutside, true);
    document.addEventListener("keydown", onKeydown, true);
    items()[0]?.focus();
    dispatch("menuopen", { id: menu.id }, menu);
    return true;
  }

  function setView(switcher, button) {
    if (!switcher || !button || !switcher.contains(button) || isControlDisabled(button)) return false;
    const view = button.getAttribute("data-dhad-view");
    switcher.querySelectorAll("[data-dhad-view]").forEach((item) => {
      const active = item === button;
      item.setAttribute("aria-pressed", String(active));
      item.setAttribute("data-active", String(active));
      const panelId = item.getAttribute("aria-controls");
      if (panelId) {
        const panel = document.getElementById(panelId);
        if (panel) panel.hidden = !active;
      }
    });
    switcher.setAttribute("data-view", view || "");
    dispatch("viewchange", { view }, switcher);
    return true;
  }

  function ownedItems(container, selector, ownerSelector) {
    return Array.from(container.querySelectorAll(selector)).filter((item) => item.closest(ownerSelector) === container);
  }

  function tabItems(tabs) {
    return ownedItems(tabs, "[data-dhad-tab], .dhad-tabs__tab", "[data-dhad-tabs], .dhad-tabs");
  }

  function isControlDisabled(control) {
    return Boolean(control && (control.disabled || control.getAttribute("aria-disabled") === "true"));
  }

  function tabPanel(tabs, tab) {
    const panelId = tab && tab.getAttribute("aria-controls");
    if (panelId) return document.getElementById(panelId);
    const value = tab && tab.getAttribute("data-dhad-tab");
    if (!value) return null;
    return Array.from(tabs.querySelectorAll("[data-dhad-tab-panel]")).find((panel) => panel.getAttribute("data-dhad-tab-panel") === value) || null;
  }

  function setTab(tabs, tab, options) {
    if (!tabs || !tab || isControlDisabled(tab) || !tabs.contains(tab)) return false;
    const opts = options || {};
    const items = tabItems(tabs);
    if (!items.includes(tab)) return false;
    const value = tab.getAttribute("data-dhad-tab") || tab.id || "";
    let changed = false;

    items.forEach((item) => {
      const selected = item === tab;
      if ((item.getAttribute("aria-selected") === "true") !== selected) changed = true;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
      const panel = tabPanel(tabs, item);
      if (panel) {
        panel.hidden = !selected;
        panel.setAttribute("role", "tabpanel");
        if (!item.id) {
          tabSequence += 1;
          item.id = "dhad-tab-" + tabSequence.toString(36);
        }
        panel.setAttribute("aria-labelledby", item.id);
        if (!panel.hasAttribute("tabindex")) panel.tabIndex = 0;
      }
    });

    tabs.setAttribute("data-tab", value);
    if (opts.focus === true) tab.focus();
    if (changed && opts.emit !== false) dispatch("tabchange", { value, tab, panel: tabPanel(tabs, tab) }, tabs);
    return changed;
  }

  function segmentItems(group) {
    return ownedItems(group, "[data-dhad-segment], .dhad-segmented__item", "[data-dhad-segmented], .dhad-segmented");
  }

  function segmentInput(item) {
    if (!item) return null;
    if (item.matches && item.matches("input[type='radio']")) return item;
    return item.querySelector ? item.querySelector("input[type='radio']") : null;
  }

  function isSegmentDisabled(item) {
    const input = segmentInput(item);
    return isControlDisabled(item) || Boolean(input && input.disabled);
  }

  function segmentValue(item) {
    const input = segmentInput(item);
    return item.getAttribute("data-dhad-segment") || (input && input.value) || item.getAttribute("value") || "";
  }

  function setSegment(group, item, options) {
    if (!group || !item || !group.contains(item) || isSegmentDisabled(item)) return false;
    const opts = options || {};
    const items = segmentItems(group);
    if (!items.includes(item)) return false;
    const value = segmentValue(item);
    let changed = false;

    items.forEach((candidate) => {
      const selected = candidate === item;
      const input = segmentInput(candidate);
      const wasSelected = input ? input.checked : candidate.getAttribute("aria-checked") === "true";
      if (wasSelected !== selected) changed = true;
      if (input) {
        input.checked = selected;
      } else {
        candidate.setAttribute("aria-checked", String(selected));
        candidate.tabIndex = selected ? 0 : -1;
      }
    });

    group.setAttribute("data-value", value);
    if (opts.focus === true) (segmentInput(item) || item).focus();
    if (changed && opts.emit !== false) dispatch("segmentchange", { value, segment: item, input: segmentInput(item) }, group);
    return changed;
  }

  function kanbanColumns(board) {
    return Array.from(board.querySelectorAll(":scope > [data-dhad-kanban-column], :scope > .dhad-kanban__column"));
  }

  function updateKanbanCounts(board) {
    kanbanColumns(board).forEach((column) => {
      const count = column.querySelectorAll("[data-dhad-kanban-card]").length;
      const output = column.querySelector("[data-dhad-kanban-count]");
      if (output) output.textContent = String(count);
    });
  }

  function announceKanban(board, text) {
    let live = board.querySelector("[data-dhad-kanban-live]");
    if (!live) {
      live = document.createElement("p");
      live.className = "dhad-sr-only";
      live.setAttribute("data-dhad-kanban-live", "");
      live.setAttribute("aria-live", "polite");
      live.setAttribute("aria-atomic", "true");
      board.appendChild(live);
    }
    live.textContent = "";
    global.setTimeout(() => { live.textContent = text; }, 0);
  }

  function moveKanbanCard(card, target) {
    if (!card) return false;
    const board = card.closest("[data-dhad-kanban], .dhad-kanban");
    const source = card.closest("[data-dhad-kanban-column], .dhad-kanban__column");
    if (!board || !source) return false;
    const columns = kanbanColumns(board);
    const sourceIndex = columns.indexOf(source);
    let targetColumn = null;

    if (typeof target === "number") targetColumn = columns[target];
    else if (target === "next") targetColumn = columns[sourceIndex + 1];
    else if (target === "previous") targetColumn = columns[sourceIndex - 1];
    else if (typeof target === "string") {
      targetColumn = document.getElementById(target) || columns.find((column) => column.getAttribute("data-dhad-stage") === target);
    }
    else if (target && target.nodeType) targetColumn = target;
    if (!targetColumn || targetColumn === source) return false;

    const cards = targetColumn.querySelector("[data-dhad-kanban-cards], .dhad-kanban__cards") || targetColumn;
    cards.appendChild(card);
    if (targetColumn.getAttribute("data-dhad-stage")) card.setAttribute("data-dhad-stage", targetColumn.getAttribute("data-dhad-stage"));
    updateKanbanCounts(board);
    card.focus();
    const cardName = card.getAttribute("data-dhad-card-name") || card.querySelector(".dhad-kanban__card-title")?.textContent || "العنصر";
    const columnName = targetColumn.getAttribute("data-dhad-column-name") || targetColumn.querySelector(".dhad-kanban__header")?.textContent?.trim() || "العمود الجديد";
    announceKanban(board, "نُقل " + cardName + " إلى " + columnName);
    dispatch("kanbanmove", { card, source, target: targetColumn, sourceIndex, targetIndex: columns.indexOf(targetColumn) }, board);
    return true;
  }

  function setReadOnly(container, readOnly) {
    if (!container) return false;
    const state = Boolean(readOnly);
    container.setAttribute("data-dhad-readonly", String(state));

    let region = readonlyRegionState.get(container);
    if (!state) {
      if (region) {
        region.controls.forEach((_kind, control) => setControlLock(control, region.reason, "field", false));
        readonlyRegionState.delete(container);
      }
      dispatch("readonlychange", { readOnly: false }, container);
      return false;
    }

    if (!region) {
      region = { reason: {}, controls: new Map() };
      readonlyRegionState.set(container, region);
    }

    const current = new Map();
    const collect = (selector) => {
      const elements = [];
      if (container.matches && container.matches(selector)) elements.push(container);
      container.querySelectorAll(selector).forEach((element) => elements.push(element));
      return elements;
    };

    collect("[data-dhad-write-action]").forEach((control) => current.set(control, "action"));
    collect("[data-dhad-write-field]").forEach((control) => {
      if (!current.has(control)) current.set(control, "field");
    });

    region.controls.forEach((_kind, control) => {
      if (!current.has(control)) setControlLock(control, region.reason, "field", false);
    });
    current.forEach((kind, control) => setControlLock(control, region.reason, kind, true));
    region.controls = current;
    dispatch("readonlychange", { readOnly: state }, container);
    return true;
  }

  function markWired(element, name) {
    const attribute = "data-dhad-wired-" + name;
    if (element.hasAttribute(attribute)) return false;
    element.setAttribute(attribute, "true");
    return true;
  }

  function wireDisclosure(trigger) {
    if (!markWired(trigger, "disclosure")) return;
    const panelId = trigger.getAttribute("aria-controls");
    const panel = panelId && document.getElementById(panelId);
    if (!panel) return;
    if (!trigger.hasAttribute("aria-expanded")) trigger.setAttribute("aria-expanded", String(!panel.hidden));
    trigger.addEventListener("click", () => {
      const expanded = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!expanded));
      panel.hidden = expanded;
      dispatch("disclosure", { expanded: !expanded, panel }, trigger);
    });
  }

  function wireMenu(trigger) {
    if (!markWired(trigger, "menu")) return;
    const menuId = trigger.getAttribute("aria-controls");
    const menu = menuId && document.getElementById(menuId);
    if (!menu) return;
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    menu.setAttribute("role", "menu");
    menu.querySelectorAll(".dhad-menu__item").forEach((item) => {
      if (!item.hasAttribute("role")) item.setAttribute("role", "menuitem");
    });
    menu.hidden = true;
    trigger.addEventListener("click", () => openMenu(trigger, menu));
    trigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openMenu(trigger, menu);
      }
    });
    menu.addEventListener("click", (event) => {
      if (event.target.closest("[role='menuitem'], .dhad-menu__item")) closeMenu({ restoreFocus: false });
    });
  }

  function wireViewSwitcher(switcher) {
    if (!markWired(switcher, "view")) return;
    switcher.setAttribute("role", switcher.getAttribute("role") || "group");
    switcher.addEventListener("click", (event) => {
      const button = event.target.closest("[data-dhad-view]");
      if (!button || !switcher.contains(button)) return;
      if (isControlDisabled(button)) {
        event.preventDefault();
        return;
      }
      setView(switcher, button);
    });
    const items = Array.from(switcher.querySelectorAll("[data-dhad-view]"));
    const selected = items.find((item) => !isControlDisabled(item) && (item.getAttribute("aria-pressed") === "true" || item.getAttribute("data-active") === "true"))
      || items.find((item) => !isControlDisabled(item));
    if (selected) setView(switcher, selected);
  }

  function wireTabs(tabs) {
    if (!markWired(tabs, "tabs")) return;
    const list = tabs.querySelector(".dhad-tabs__list, [role='tablist']");
    const items = tabItems(tabs);
    if (!list || !items.length) return;
    list.setAttribute("role", "tablist");

    items.forEach((tab) => {
      tab.setAttribute("role", "tab");
      if (!tab.hasAttribute("aria-selected")) tab.setAttribute("aria-selected", "false");
      tab.tabIndex = -1;
      if (tab.tagName === "BUTTON" && !tab.hasAttribute("type")) tab.type = "button";
      const panel = tabPanel(tabs, tab);
      if (panel) {
        if (!panel.id) {
          tabSequence += 1;
          panel.id = "dhad-tab-panel-" + tabSequence.toString(36);
        }
        tab.setAttribute("aria-controls", panel.id);
        panel.setAttribute("role", "tabpanel");
      }
    });

    const enabled = () => tabItems(tabs).filter((tab) => !isControlDisabled(tab));
    const declared = items.find((tab) => tab.getAttribute("aria-selected") === "true");
    const initial = declared && !isControlDisabled(declared) ? declared : enabled()[0];
    if (initial) setTab(tabs, initial, { emit: false });

    list.addEventListener("click", (event) => {
      const tab = event.target.closest && event.target.closest("[data-dhad-tab], .dhad-tabs__tab");
      if (!tab || !items.includes(tab)) return;
      event.preventDefault();
      if (isControlDisabled(tab)) return;
      setTab(tabs, tab);
    });

    list.addEventListener("keydown", (event) => {
      const tab = event.target.closest && event.target.closest("[data-dhad-tab], .dhad-tabs__tab");
      if (!tab) return;
      const available = enabled();
      const index = available.indexOf(tab);
      if (index < 0) return;
      const orientation = list.getAttribute("aria-orientation") || "horizontal";
      const isRtl = global.getComputedStyle ? global.getComputedStyle(list).direction === "rtl" : true;
      let nextIndex = -1;

      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = available.length - 1;
      if (orientation === "vertical" && event.key === "ArrowDown") nextIndex = (index + 1) % available.length;
      if (orientation === "vertical" && event.key === "ArrowUp") nextIndex = (index - 1 + available.length) % available.length;
      if (orientation !== "vertical" && event.key === "ArrowRight") nextIndex = (index + (isRtl ? -1 : 1) + available.length) % available.length;
      if (orientation !== "vertical" && event.key === "ArrowLeft") nextIndex = (index + (isRtl ? 1 : -1) + available.length) % available.length;

      if (nextIndex >= 0) {
        event.preventDefault();
        const next = available[nextIndex];
        next.focus();
        const activation = list.getAttribute("data-dhad-activation") || tabs.getAttribute("data-dhad-activation") || "automatic";
        if (activation === "manual") {
          items.forEach((item) => { item.tabIndex = item === next ? 0 : -1; });
        } else {
          setTab(tabs, next);
        }
        return;
      }

      const activation = list.getAttribute("data-dhad-activation") || tabs.getAttribute("data-dhad-activation") || "automatic";
      if ((event.key === "Enter" || event.key === " ") && activation === "manual") {
        event.preventDefault();
        setTab(tabs, tab);
      }
    });
  }

  function wireSegmented(group) {
    if (!markWired(group, "segmented")) return;
    group.setAttribute("role", group.getAttribute("role") || "radiogroup");
    const items = segmentItems(group);
    if (!items.length) return;

    items.forEach((item) => {
      const input = segmentInput(item);
      if (!input) {
        item.setAttribute("role", "radio");
        if (!item.hasAttribute("aria-checked")) item.setAttribute("aria-checked", "false");
        item.tabIndex = -1;
        if (item.tagName === "BUTTON" && !item.hasAttribute("type")) item.type = "button";
      }
    });

    const enabled = () => segmentItems(group).filter((item) => !isSegmentDisabled(item));
    const declared = items.find((item) => {
      const input = segmentInput(item);
      return (input && input.checked) || item.getAttribute("aria-checked") === "true";
    });
    const initial = declared && !isSegmentDisabled(declared) ? declared : enabled()[0];
    if (initial) setSegment(group, initial, { emit: false });

    group.addEventListener("click", (event) => {
      const item = event.target.closest && event.target.closest("[data-dhad-segment], .dhad-segmented__item");
      if (!item || !items.includes(item)) return;
      if (isSegmentDisabled(item)) {
        event.preventDefault();
        return;
      }
      if (segmentInput(item)) return;
      setSegment(group, item);
    });

    group.addEventListener("change", (event) => {
      if (!event.target.matches || !event.target.matches("input[type='radio']") || !event.target.checked) return;
      const item = event.target.closest("[data-dhad-segment], .dhad-segmented__item");
      if (!item || !items.includes(item)) return;
      setSegment(group, item, { emit: false });
      dispatch("segmentchange", { value: segmentValue(item), segment: item, input: event.target }, group);
    });

    group.addEventListener("keydown", (event) => {
      const item = event.target.closest && event.target.closest("[data-dhad-segment], .dhad-segmented__item");
      if (!item) return;
      if (segmentInput(item)) return;
      const available = enabled();
      const index = available.indexOf(item);
      if (index < 0) return;
      const isRtl = global.getComputedStyle ? global.getComputedStyle(group).direction === "rtl" : true;
      let nextIndex = -1;

      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = available.length - 1;
      if (event.key === "ArrowDown") nextIndex = (index + 1) % available.length;
      if (event.key === "ArrowUp") nextIndex = (index - 1 + available.length) % available.length;
      if (event.key === "ArrowRight") nextIndex = (index + (isRtl ? -1 : 1) + available.length) % available.length;
      if (event.key === "ArrowLeft") nextIndex = (index + (isRtl ? 1 : -1) + available.length) % available.length;

      if (nextIndex >= 0) {
        event.preventDefault();
        setSegment(group, available[nextIndex], { focus: true });
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setSegment(group, item);
      }
    });
  }

  function wireKanban(board) {
    if (!markWired(board, "kanban")) return;
    if (!board.hasAttribute("role")) board.setAttribute("role", "region");
    board.querySelectorAll("[data-dhad-kanban-card]").forEach((card) => {
      if (!card.hasAttribute("tabindex")) card.tabIndex = 0;
      card.setAttribute("aria-keyshortcuts", "Alt+Shift+ArrowLeft Alt+Shift+ArrowRight");
    });
    kanbanColumns(board).forEach((column) => {
      if (!column.hasAttribute("role")) column.setAttribute("role", "group");
      const name = column.getAttribute("data-dhad-column-name");
      if (name && !column.hasAttribute("aria-label")) column.setAttribute("aria-label", name);
    });
    board.addEventListener("keydown", (event) => {
      const card = event.target.closest && event.target.closest("[data-dhad-kanban-card]");
      if (!card || event.target !== card || !event.altKey || !event.shiftKey) return;
      const columns = kanbanColumns(board);
      const source = card.closest("[data-dhad-kanban-column], .dhad-kanban__column");
      const index = columns.indexOf(source);
      const isRtl = global.getComputedStyle ? global.getComputedStyle(board).direction === "rtl" : true;
      let targetIndex = -1;
      if (event.key === "ArrowLeft") targetIndex = index + (isRtl ? 1 : -1);
      if (event.key === "ArrowRight") targetIndex = index + (isRtl ? -1 : 1);
      if (targetIndex >= 0 && targetIndex < columns.length) {
        event.preventDefault();
        moveKanbanCard(card, targetIndex);
      }
    });
    board.addEventListener("click", (event) => {
      const action = event.target.closest("[data-dhad-kanban-move]");
      if (!action || !board.contains(action)) return;
      const card = action.closest("[data-dhad-kanban-card]");
      const target = action.getAttribute("data-dhad-kanban-move");
      moveKanbanCard(card, target);
    });
    updateKanbanCounts(board);
  }

  function wire(scope) {
    const container = scope || document;
    applySymbols(container);

    container.querySelectorAll("[data-dhad-theme-toggle]").forEach((button) => {
      if (!markWired(button, "theme")) return;
      button.addEventListener("click", toggleTheme);
    });

    container.querySelectorAll("[data-dhad-toast]").forEach((button) => {
      if (!markWired(button, "toast")) return;
      button.addEventListener("click", () => toast(button.getAttribute("data-dhad-toast"), {
        type: button.getAttribute("data-dhad-toast-type") || "neutral",
        persistent: button.hasAttribute("data-dhad-toast-persistent")
      }));
    });

    container.querySelectorAll("[data-dhad-confirm], [data-dhad-prompt], [data-dhad-alert]").forEach((button) => {
      if (!markWired(button, "dialog")) return;
      button.addEventListener("click", () => {
        const common = {
          title: button.getAttribute("data-dhad-dialog-title") || undefined,
          confirmLabel: button.getAttribute("data-dhad-confirm-label") || undefined,
          cancelLabel: button.getAttribute("data-dhad-cancel-label") || undefined,
          destructive: button.hasAttribute("data-dhad-destructive")
        };
        if (button.hasAttribute("data-dhad-prompt")) {
          promptDialog(button.getAttribute("data-dhad-prompt"), Object.assign(common, {
            inputLabel: button.getAttribute("data-dhad-input-label") || undefined,
            required: button.hasAttribute("data-dhad-required")
          }));
        } else if (button.hasAttribute("data-dhad-alert")) {
          alertDialog(button.getAttribute("data-dhad-alert"), common);
        } else {
          confirmDialog(button.getAttribute("data-dhad-confirm"), common);
        }
      });
    });

    container.querySelectorAll("[data-dhad-disclosure]").forEach(wireDisclosure);
    container.querySelectorAll("[data-dhad-menu-trigger]").forEach(wireMenu);
    container.querySelectorAll("[data-dhad-view-switcher]").forEach(wireViewSwitcher);
    container.querySelectorAll("[data-dhad-tabs], .dhad-tabs").forEach(wireTabs);
    container.querySelectorAll("[data-dhad-segmented], .dhad-segmented").forEach(wireSegmented);
    container.querySelectorAll("[data-dhad-kanban], .dhad-kanban").forEach(wireKanban);

    container.querySelectorAll("[data-dhad-progress]").forEach((progress) => {
      setProgress(progress, {
        value: progress.getAttribute("data-dhad-progress"),
        max: progress.getAttribute("data-dhad-progress-max") || 100,
        label: progress.getAttribute("data-dhad-progress-label") || undefined
      });
    });

    container.querySelectorAll(".dhad-field[data-dhad-field-state]").forEach((field) => {
      setFieldState(field, field.getAttribute("data-dhad-field-state"), {
        message: field.getAttribute("data-dhad-field-message") || undefined
      });
    });

    container.querySelectorAll(".dhad-state[data-state]").forEach((stateRegion) => {
      const state = stateRegion.getAttribute("data-state");
      if (state === "loading") stateRegion.setAttribute("aria-busy", "true");
      if (state === "error" && !stateRegion.hasAttribute("role")) stateRegion.setAttribute("role", "alert");
    });

    container.querySelectorAll("[data-dhad-sync-state]").forEach((status) => {
      setSyncState(status, status.getAttribute("data-dhad-sync-state"), {
        label: status.getAttribute("data-dhad-sync-label") || undefined,
        force: true
      });
    });

    container.querySelectorAll("[data-dhad-readonly='true']").forEach((region) => {
      setReadOnly(region, true);
    });
  }

  const api = Object.freeze({
    version: "3.0.2",
    setTheme,
    toggleTheme,
    configureSymbols,
    applySymbols,
    toast,
    setButtonLoading,
    setFieldState,
    setSyncState,
    setProgress,
    openDialog,
    closeDialog,
    alert: alertDialog,
    confirm: confirmDialog,
    prompt: promptDialog,
    openMenu,
    closeMenu,
    setView,
    setTab,
    setSegment,
    moveKanbanCard,
    setReadOnly,
    wire
  });

  global.Dhad = api;
  setTheme(preferredTheme(), { persist: false });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => wire(document), { once: true });
  } else {
    wire(document);
  }
})(window);
