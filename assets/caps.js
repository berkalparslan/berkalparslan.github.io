/* Sayfa Türkçeyken büyük harfe çevrilen yerlerde İngilizce kelimeler ve marka adları
   "İ" ile yazılmasın (STUDİO, THİS OR THAT). Bu kelimeleri lang="en" ile işaretler. */
(function () {
  "use strict";
  var WORDS = ("iPhone iPad iPadOS iOS watchOS macOS Apple Watch Android Wear OS Google Play App Store Studio Bam " +
    "This That Daily Whisper Kit QR Scanner Wallet Coach Tennis Padel Pickleball Volleyball Rally Badminton Table " +
    "Orbix Roulette Leafbook Nubi Virtual Pet Tasbih Tally BodyBook Matchday Five side Bumpline Premium Pro Pass " +
    "All-Sports Sports Score Keeper Plant Tracker Mockup Affirmations Monthly Budget Health Parking Tycoon Digital " +
    "Counter Pregnancy Estimator Widget Widgets Web Showcase Wi-Fi Gemini Firebase Instagram TikTok Excel Siri iCloud " +
    "Live Activity Activities Bluetooth Lifetime Free Plus New Beta TestFlight Spotify YouTube Shipaton Mihenk " +
    "Kit Pro Premium This or That Wear OS").split(" ");
  var L = "A-Za-zÇĞİÖŞÜçğıöşü0-9";
  var re = new RegExp("(^|[^" + L + "])(" + WORDS.map(function (w) { return w.replace(/[-]/g, "\\-"); }).join("|") + ")(?=$|[^" + L + "])", "g");
  function fixNode(t) {
    var s = t.nodeValue; if (!s || !re.test(s)) return; re.lastIndex = 0;
    var frag = document.createDocumentFragment(), last = 0, m;
    while ((m = re.exec(s))) {
      var start = m.index + m[1].length;
      frag.appendChild(document.createTextNode(s.slice(last, start)));
      var sp = document.createElement("span"); sp.lang = "en"; sp.textContent = m[2]; frag.appendChild(sp);
      last = start + m[2].length;
    }
    frag.appendChild(document.createTextNode(s.slice(last)));
    t.parentNode.replaceChild(frag, t);
  }
  function fix() {
    if ((document.documentElement.getAttribute("lang") || "") !== "tr") return;
    var els = document.body.querySelectorAll("*");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest('[lang="en"]') || /^(SCRIPT|STYLE|SVG|IMG)$/.test(el.tagName)) continue;
      if (getComputedStyle(el).textTransform !== "uppercase") continue;
      var texts = [];
      for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) texts.push(n);
      texts.forEach(fixNode);
    }
  }
  var timer = 0;
  function later() { clearTimeout(timer); timer = setTimeout(fix, 120); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", later); else later();
  new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["lang"] });
})();
