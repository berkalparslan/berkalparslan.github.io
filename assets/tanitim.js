/* Tanıtım sayfalarının ortak davranışı: dil, kayan bant, temalı çıkartmalar,
   dönen ekranlar, beliren bölümler, QR kartları. */
(function () {
  "use strict";
  var root = document.documentElement;
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTr = function () { return root.getAttribute("data-lang") === "tr"; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  /* Dil */
  var langBtns = document.querySelectorAll(".lang");
  function paintLang() {
    langBtns.forEach(function (b) { b.textContent = isTr() ? "EN" : "TR"; });
    var t = root.getAttribute(isTr() ? "data-title-tr" : "data-title-en"); if (t) document.title = t;
  }
  langBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var next = isTr() ? "en" : "tr";
      root.setAttribute("data-lang", next); root.setAttribute("lang", next);
      try { localStorage.setItem("bb-lang", next); } catch (e) { }
      paintLang();
    });
  });
  paintLang();

  /* Kayan bant */
  document.querySelectorAll(".mq").forEach(function (m) {
    var items = []; try { items = JSON.parse(m.dataset.items || "[]"); } catch (e) { }
    items = items.concat(["iOS · Android · watchOS · Wear OS", "Bam Studio"]);
    var one = items.map(function (t) { return "<span>" + esc(t) + "</span><i>✦</i>"; }).join("");
    m.innerHTML = one + one + one + one;
  });

  /* Mağaza şeridi: kendiliğinden akar, sona gelince başa sarar; üstüne gelince durur,
     basılı tutup sağa sola sürüklenir (dokunmatikte parmakla kaydırılır). */
  document.querySelectorAll(".promo").forEach(function (strip) {
    var pos = 0, hover = false, until = 0, down = false, moved = false, sx = 0, sl = 0;
    var hold = function (ms) { until = Math.max(until, performance.now() + ms); };
    strip.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hover = true; });
    strip.addEventListener("pointerleave", function () { hover = false; hold(500); });
    strip.addEventListener("touchstart", function () { hold(4000); }, { passive: true });
    strip.addEventListener("wheel", function () { hold(2500); }, { passive: true });
    strip.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      down = true; moved = false; sx = e.clientX; sl = strip.scrollLeft; e.preventDefault();
    });
    addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; strip.classList.add("dragging"); }
      if (moved) { var half = strip.scrollWidth / 2, v = sl - dx; if (v < 0) { v += half; sl += half; } if (v >= half) { v -= half; sl -= half; } strip.scrollLeft = v; pos = v; }
    });
    addEventListener("pointerup", function () { if (!down) return; down = false; hold(1500); setTimeout(function () { strip.classList.remove("dragging"); }, 0); });
    function loop(now) {
      var half = strip.scrollWidth / 2;
      if (half > strip.clientWidth) {
        if (Math.abs(pos - strip.scrollLeft) > 3) pos = strip.scrollLeft;
        if (!still && !hover && !down && now > until && strip.offsetParent) pos += .5;
        if (pos >= half) pos -= half;
        if (pos < 0) pos += half;
        if (Math.abs(strip.scrollLeft - pos) >= .5) strip.scrollLeft = pos;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });

  /* Temalı çıkartmalar: hero'da uçuşur, sürüklenir */
  var hero = document.querySelector(".hero");
  if (hero) {
    var em = []; try { em = JSON.parse(hero.dataset.emoji || "[]"); } catch (e) { }
    var spots = [[6, 18], [86, 14], [12, 66], [82, 62], [30, 84], [66, 86], [61, 13]];
    var cols = ["#ffd731", "#e9ccff", "#55db9c", "#ffb3d9", "#dceeff", "#c8f560", "#fff"];
    var narrow = innerWidth < 640;
    em.slice(0, narrow ? 2 : 7).forEach(function (g, i) {
      var s = document.createElement("span");
      s.className = "fly"; s.textContent = g; s.setAttribute("aria-hidden", "true");
      var p = spots[i % spots.length];
      s.style.left = (narrow ? [4, 80][i] : p[0]) + "%"; s.style.top = (narrow ? [9, 10][i] : p[1]) + "%";
      s.style.setProperty("--c", cols[i % cols.length]); s.style.setProperty("--r", ((i % 2 ? 1 : -1) * (6 + i * 2)) + "deg");
      s.style.setProperty("--d", (5 + i * .7) + "s");
      hero.appendChild(s); drag(s);
    });
  }
  function drag(el) {
    var sx, sy, ox = 0, oy = 0, down = false;
    el.addEventListener("pointerdown", function (e) { down = true; sx = e.clientX; sy = e.clientY; el.setPointerCapture(e.pointerId); el.classList.add("drag"); });
    el.addEventListener("pointermove", function (e) { if (!down) return; el.style.translate = (ox + e.clientX - sx) + "px " + (oy + e.clientY - sy) + "px"; });
    function up(e) { if (!down) return; down = false; ox += e.clientX - sx; oy += e.clientY - sy; el.classList.remove("drag"); }
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  }

  /* Birden fazla ekranı olan cihazlar kendiliğinden döner, dokununca ilerler */
  var devs = [];
  document.querySelectorAll("[data-cycle]").forEach(function (box) {
    var list = []; try { list = JSON.parse(box.dataset.cycle); } catch (e) { }
    if (list.length < 2) return;
    var dev = box.closest(".dev"), img = box.querySelector("img"), i = 0;
    var d = { box: box, step: function () {
      i = (i + 1) % list.length;
      var src = list[i], pre = new Image();
      pre.onload = function () { img.classList.add("off"); setTimeout(function () { img.src = src; img.classList.remove("off"); }, 260); };
      pre.src = src;
      if (dev) dev.querySelectorAll(".dots i").forEach(function (dot, j) { dot.classList.toggle("on", j === i); });
    }, visible: false };
    devs.push(d);
    if (dev) dev.addEventListener("click", d.step);
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { devs.forEach(function (d) { if (d.box === e.target) d.visible = e.isIntersecting; }); });
    }, { threshold: .4 });
    devs.forEach(function (d) { io.observe(d.box); });
    if (!still) setInterval(function () { devs.forEach(function (d) { if (d.visible && d.box.offsetParent) d.step(); }); }, 2600);

    var rv = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); } });
    }, { threshold: .15 });
    document.querySelectorAll(".reveal").forEach(function (el) { rv.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  /* QR kartları */
  document.querySelectorAll("[data-qr]").forEach(function (a) {
    var box = a.querySelector(".q"); if (!box || !window.qrcode) return;
    var q = qrcode(0, "M"); q.addData(a.dataset.qr); q.make();
    box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  });
})();
