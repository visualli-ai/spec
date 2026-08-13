(function () {
  var MERMAID_URL =
    "https://unpkg.com/mermaid@10.4.0/dist/mermaid.esm.min.mjs";

  function render() {
    var blocks = document.querySelectorAll(
      'pre.mermaid, pre > code.mermaid, div.mermaid'
    );
    if (!blocks.length) return;
    if (!("import" in window) && typeof window.importShim !== "function") return;
    var loader =
      typeof window.importShim === "function"
        ? window.importShim
        : function (u) {
            return import(u);
          };
    loader(MERMAID_URL)
      .then(function (mod) {
        var mermaid = mod.default || mod;
        mermaid.initialize({ startOnLoad: false, theme: "default" });
        mermaid.run({ querySelector: "pre.mermaid" }).catch(function (err) {
          if (typeof console !== "undefined" && console.error)
            console.error("[mermaid] render failed:", err);
        });
      })
      .catch(function (err) {
        if (typeof console !== "undefined" && console.error)
          console.error("[mermaid] failed to load:", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
