(function (global) {
  "use strict";

  const symbolMap = Object.freeze({
    project: { emoji: "🎬" },
    segment: { emoji: "🎞️" },
    shot: { emoji: "🎥" },
    folder: { emoji: "📁" },
    done: { emoji: "✅" },
    pending: { emoji: "⏳" },
    view: { emoji: "👁️" },
    preparation: { emoji: "☑️" },
    kanban: { emoji: "⊟" },
    list: { emoji: "☰" },
    columns: { emoji: "⊞" },
    timecode: { emoji: "⏱️" },
    teleprompter: { emoji: "📜" },
    share: { emoji: "🔗" }
  });

  function activate(options) {
    if (!global.Dhad) {
      throw new Error("Load dhad.runtime.js before dhad.recipes-production.js");
    }
    const opts = options || {};
    return global.Dhad.configureSymbols({
      mode: opts.mode || "emoji",
      map: Object.assign({}, symbolMap, opts.map || {}),
      renderIcon: opts.renderIcon,
      root: opts.root || global.document,
      apply: opts.apply !== false
    });
  }

  global.DhadProduction = Object.freeze({ symbolMap, activate });

  const document = global.document;
  const root = document && document.documentElement;
  if (root && root.getAttribute("data-dhad-symbol-preset") === "production") {
    activate({ mode: root.getAttribute("data-dhad-symbol-mode") || "emoji" });
  }
})(window);
