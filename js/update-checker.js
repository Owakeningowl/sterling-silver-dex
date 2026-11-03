(function () {
  if (!window.fetch || !window.DOMParser) return;

  var CHECK_INTERVAL = 60 * 1000;
  var INITIAL_DELAY = 15 * 1000;
  var currentSignature = getAssetSignature(document);
  var lastPromptedSignature = "";
  var checkInFlight = false;

  if (!currentSignature) return;

  function collectAssetValues(doc, selector, attribute, prefix, parts) {
    var nodes = doc.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) {
      var value = nodes[i].getAttribute(attribute);
      if (value) parts.push(prefix + value);
    }
  }

  function getAssetSignature(doc) {
    var parts = [];
    collectAssetValues(doc, "base[href]", "href", "base:", parts);
    collectAssetValues(
      doc,
      'meta[name="nulldex-build"]',
      "content",
      "build:",
      parts
    );
    collectAssetValues(
      doc,
      'link[rel="stylesheet"][href]',
      "href",
      "style:",
      parts
    );
    collectAssetValues(doc, "script[src]", "src", "script:", parts);
    return parts.join("\n");
  }

  function getRootPath() {
    var appRoot = window.pokedex && window.pokedex.root;
    if (appRoot) return appRoot;
    var base = document.querySelector("base[href]");
    return (base && base.getAttribute("href")) || "/";
  }

  function getCheckUrl() {
    var root = getRootPath() || "/";
    var separator = root.indexOf("?") >= 0 ? "&" : "?";
    return root + separator + "nulldex-update-check=" + Date.now();
  }

  function promptForUpdate(signature) {
    if (signature === currentSignature || signature === lastPromptedSignature) {
      return;
    }
    lastPromptedSignature = signature;
    if (window.confirm("A newer version of the Sterling Silver Dex is available. Refresh now?")) {
      window.location.reload();
    }
  }

  function parseRemoteSignature(html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, "text/html");
    return getAssetSignature(doc);
  }

  function checkForUpdate() {
    if (checkInFlight || document.visibilityState === "hidden") return;
    checkInFlight = true;

    window
      .fetch(getCheckUrl(), {
        cache: "no-store",
        credentials: "same-origin"
      })
      .then(function (response) {
        if (!response.ok) throw new Error("Update check failed");
        return response.text();
      })
      .then(function (html) {
        var remoteSignature = parseRemoteSignature(html);
        if (remoteSignature) promptForUpdate(remoteSignature);
      })
      .catch(function () {})
      .then(function () {
        checkInFlight = false;
      });
  }

  window.setTimeout(checkForUpdate, INITIAL_DELAY);
  window.setInterval(checkForUpdate, CHECK_INTERVAL);
  window.addEventListener("focus", checkForUpdate);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") checkForUpdate();
  });
})();
