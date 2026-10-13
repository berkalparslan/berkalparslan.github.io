/* Panellerin ortak grafikleri. Hepsi SVG, hepsi uzerine gelince deger
 * gosterir, acik ve koyu temada ayni. Renkler panel.css'teki rollerden:
 * tek seri --accent, birden cok seri --s1..--s8 (sabit sirayla, asla
 * dongu yok), yazi hep --ink/--soft (veri rengi yaziya gecmez).
 *
 *   import { gunlukCubuk, cizgi, huni, yatayCubuk, saatIsi, kivilcim } from "/lab/assets/grafik.js?v=1";
 *
 *   gunlukCubuk(kutu, [{ t: "2026-10-12", v: 4 }, ...], { birim: "kurulum" })
 *   gunlukCubuk(kutu, gunler, { seriler: [{ ad: "iOS", alan: "ios" }, { ad: "Android", alan: "android" }] })  // yigilmis
 *   cizgi(kutu, gunler, { seriler: [{ ad: "Aktif", alan: "aktif" }, { ad: "Yeni", alan: "yeni" }] })
 *   huni(kutu, [["Paywall gördü", 120], ["Satın almaya bastı", 14], ["Aldı", 6]])
 *   yatayCubuk(kutu, { ios: 12, android: 30 }, { etiket: k => ..., limit: 12, tik: k => ... })
 *   saatIsi(kutu, matris7x24, { birim: "açılış" })    // gun (Pzt..Paz) x saat, Turkiye saati
 *   kivilcim([3,4,1,7])  -> SVG ogesi (kutucuk icin)
 *
 * Gun dizisi eksik gunleri doldurmaz; `gunleriDoldur(harita, bas, son)` ile
 * dolu diziye cevir (bos gun 0 cizilir, atlanmaz).
 */

const NS = "http://www.w3.org/2000/svg";
const AY = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const GUNLER = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const s = (tag, at = {}) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(at)) n.setAttribute(k, v); return n; };
const sayi = n => Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
const kisa = n => { const a = Math.abs(n); return a >= 1e6 ? sayi(n / 1e6) + " Mn" : a >= 1e4 ? sayi(Math.round(n / 1e3)) + " B" : sayi(n); };
export const gunEtiket = t => { const [y, a, g] = String(t).split("-"); return g ? `${Number(g)} ${AY[Number(a) - 1]}` : String(t); };
const RENK = i => `var(--s${(i % 8) + 1})`;

/** {"2026-10-01": 3, ...} ya da {gun: {alan: n}} -> bas..son arasi her gun (UTC gun metni). */
export function gunleriDoldur(harita, bas, son) {
  const l = [];
  const b = new Date(bas + "T00:00:00Z"), e = new Date(son + "T00:00:00Z");
  for (let d = b; d <= e; d = new Date(d.getTime() + 864e5)) {
    const t = d.toISOString().slice(0, 10);
    const v = harita?.[t];
    l.push(v && typeof v === "object" ? { t, ...v } : { t, v: v || 0 });
  }
  return l;
}

/* Ust uste binen tek bir ipucu kutusu; her grafik ayni kutuyu kullanir. */
let IPUCU = null;
function ipucu(e, html) {
  if (!IPUCU) { IPUCU = document.createElement("div"); IPUCU.className = "gr-ipucu"; document.body.appendChild(IPUCU); }
  if (html == null) { IPUCU.style.display = "none"; return; }
  IPUCU.innerHTML = html;
  IPUCU.style.display = "block";
  const w = IPUCU.offsetWidth, h = IPUCU.offsetHeight;
  let x = e.clientX + 14, y = e.clientY - h - 10;
  if (x + w > innerWidth - 8) x = e.clientX - w - 14;
  if (y < 8) y = e.clientY + 16;
  IPUCU.style.left = x + "px"; IPUCU.style.top = y + "px";
}
const esc = v => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const satir = (renk, ad, v) => `<div class="gr-s"><i style="background:${renk}"></i><span>${esc(ad)}</span><b>${v}</b></div>`;

function lejant(seriler) {
  const d = document.createElement("div");
  d.className = "gr-lejant";
  d.innerHTML = seriler.map((x, i) => `<span><i style="background:${x.renk || RENK(i)}"></i>${esc(x.ad)}</span>`).join("");
  return d;
}

/* Temiz eksen: 0, 1, 2, 5 x 10^n basamaklari. */
function eksen(max, adet = 4) {
  if (max <= 0) return { ust: 1, adim: [0, 1] };
  const kaba = max / adet, us = 10 ** Math.floor(Math.log10(kaba));
  const adim = [1, 2, 2.5, 5, 10].map(k => k * us).find(k => k >= kaba) || us * 10;
  const ust = Math.ceil(max / adim) * adim;
  const l = []; for (let v = 0; v <= ust + 1e-9; v += adim) l.push(Math.round(v * 1000) / 1000);
  return { ust, adim: l };
}

function cerceve(kutu, H) {
  kutu.classList.add("gr");
  const W = Math.max(280, kutu.clientWidth || 640);
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: H, role: "img" });
  return { W, svg };
}

/**
 * Gunluk sutun grafigi. Tek seri `v` alanindan; `seriler` verilirse yigilmis.
 * secenek: { birim, seriler:[{ad, alan, renk}], H, ozet: true (en altta toplam/ort) }
 */
export function gunlukCubuk(kutu, gunler, secenek = {}) {
  kutu.innerHTML = "";
  const seriler = secenek.seriler || [{ ad: secenek.birim || "değer", alan: "v", renk: "var(--accent)" }];
  const H = secenek.H || 190, ALT = 22, SOL = 34, UST = 8;
  const top = g => seriler.reduce((t, x) => t + (Number(g[x.alan]) || 0), 0);
  const max = Math.max(0, ...gunler.map(top));
  const { ust, adim } = eksen(max);
  const { W, svg } = cerceve(kutu, H);
  const ic = W - SOL - 4, bant = ic / Math.max(1, gunler.length);
  const kal = Math.max(2, Math.min(24, bant - 2));
  const y = v => UST + (H - ALT - UST) * (1 - v / ust);
  for (const a of adim) {
    svg.appendChild(s("line", { x1: SOL, x2: W - 4, y1: y(a), y2: y(a), class: "gr-izgara" }));
    const t = s("text", { x: SOL - 6, y: y(a) + 4, "text-anchor": "end", class: "gr-eksen" }); t.textContent = kisa(a); svg.appendChild(t);
  }
  const etAdim = Math.max(1, Math.ceil(gunler.length / Math.floor(ic / 54)));
  gunler.forEach((g, i) => {
    const x = SOL + i * bant + (bant - kal) / 2;
    let taban = 0;
    seriler.forEach((sr, j) => {
      const v = Number(g[sr.alan]) || 0;
      if (!v) return;
      const y1 = y(taban + v), y0 = y(taban);
      const h = Math.max(1, y0 - y1 - (taban ? 2 : 0));
      const ustMu = seriler.slice(j + 1).every(z => !(Number(g[z.alan]) || 0));
      const r = ustMu ? Math.min(4, kal / 2, h) : 0;
      svg.appendChild(s("path", { d: yuvarlakUst(x, y1, kal, h, r), fill: sr.renk || RENK(j) }));
      taban += v;
    });
    if (i % etAdim === 0 || i === gunler.length - 1) {
      const t = s("text", { x: x + kal / 2, y: H - 6, "text-anchor": "middle", class: "gr-eksen" });
      t.textContent = gunEtiket(g.t); svg.appendChild(t);
    }
    const vur = s("rect", { x: SOL + i * bant, y: UST, width: bant, height: H - ALT - UST, fill: "transparent" });
    vur.addEventListener("mousemove", e => ipucu(e, `<div class="gr-b">${esc(gunEtiket(g.t))}${g.not ? " · " + esc(g.not) : ""}</div>` +
      seriler.map((sr, j) => satir(sr.renk || RENK(j), sr.ad, sayi(g[sr.alan]))).join("") +
      (seriler.length > 1 ? `<div class="gr-s gr-top"><span>Toplam</span><b>${sayi(top(g))}</b></div>` : "")));
    vur.addEventListener("mouseleave", () => ipucu(null));
    svg.appendChild(vur);
  });
  svg.appendChild(s("line", { x1: SOL, x2: W - 4, y1: y(0), y2: y(0), class: "gr-taban" }));
  if (seriler.length > 1) kutu.appendChild(lejant(seriler));
  kutu.appendChild(svg);
  if (secenek.ozet !== false && gunler.length) {
    const t = gunler.reduce((a, g) => a + top(g), 0);
    const o = document.createElement("div");
    o.className = "gr-ozet";
    o.textContent = `Toplam ${sayi(t)} · günlük ort. ${sayi(t / gunler.length)} · en çok ${sayi(max)}`;
    kutu.appendChild(o);
  }
  return kutu;
}

function yuvarlakUst(x, y, w, h, r) {
  if (!r) return `M${x},${y}h${w}v${h}h${-w}z`;
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}z`;
}

/** Cok serili cizgi; ustune gelince dikey cizgi ve butun serilerin degeri. */
export function cizgi(kutu, gunler, secenek = {}) {
  kutu.innerHTML = "";
  const seriler = secenek.seriler || [{ ad: secenek.birim || "değer", alan: "v" }];
  const H = secenek.H || 190, ALT = 22, SOL = 34, UST = 10, SAG = 8;
  const max = Math.max(0, ...gunler.flatMap(g => seriler.map(x => Number(g[x.alan]) || 0)));
  const { ust, adim } = eksen(max);
  const { W, svg } = cerceve(kutu, H);
  const ic = W - SOL - SAG;
  const x = i => SOL + (gunler.length < 2 ? ic / 2 : (ic * i) / (gunler.length - 1));
  const y = v => UST + (H - ALT - UST) * (1 - v / ust);
  for (const a of adim) {
    svg.appendChild(s("line", { x1: SOL, x2: W - SAG, y1: y(a), y2: y(a), class: "gr-izgara" }));
    const t = s("text", { x: SOL - 6, y: y(a) + 4, "text-anchor": "end", class: "gr-eksen" }); t.textContent = kisa(a); svg.appendChild(t);
  }
  const etAdim = Math.max(1, Math.ceil(gunler.length / Math.floor(ic / 54)));
  gunler.forEach((g, i) => {
    if (i % etAdim && i !== gunler.length - 1) return;
    const t = s("text", { x: x(i), y: H - 6, "text-anchor": "middle", class: "gr-eksen" }); t.textContent = gunEtiket(g.t); svg.appendChild(t);
  });
  seriler.forEach((sr, j) => {
    const renk = sr.renk || (seriler.length === 1 ? "var(--accent)" : RENK(j));
    const d = gunler.map((g, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(Number(g[sr.alan]) || 0).toFixed(1)}`).join("");
    if (seriler.length === 1) svg.appendChild(s("path", { d: `${d}L${x(gunler.length - 1)},${y(0)}L${x(0)},${y(0)}z`, fill: renk, opacity: ".1" }));
    svg.appendChild(s("path", { d, fill: "none", stroke: renk, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    const son = gunler.length - 1;
    if (son >= 0) svg.appendChild(s("circle", { cx: x(son), cy: y(Number(gunler[son][sr.alan]) || 0), r: 4, fill: renk, class: "gr-nokta" }));
  });
  const imlec = s("line", { y1: UST, y2: H - ALT, class: "gr-imlec", visibility: "hidden" });
  svg.appendChild(imlec);
  const vur = s("rect", { x: SOL, y: 0, width: ic, height: H - ALT, fill: "transparent" });
  vur.addEventListener("mousemove", e => {
    const r = svg.getBoundingClientRect();
    const px = (e.clientX - r.left) * (W / r.width);
    const i = Math.max(0, Math.min(gunler.length - 1, Math.round(((px - SOL) / ic) * (gunler.length - 1))));
    imlec.setAttribute("x1", x(i)); imlec.setAttribute("x2", x(i)); imlec.setAttribute("visibility", "visible");
    const g = gunler[i];
    ipucu(e, `<div class="gr-b">${esc(gunEtiket(g.t))}</div>` + seriler.map((sr, j) => satir(sr.renk || (seriler.length === 1 ? "var(--accent)" : RENK(j)), sr.ad, sayi(g[sr.alan]))).join(""));
  });
  vur.addEventListener("mouseleave", () => { imlec.setAttribute("visibility", "hidden"); ipucu(null); });
  svg.appendChild(vur);
  if (seriler.length > 1) kutu.appendChild(lejant(seriler.map((x, j) => ({ ...x, renk: x.renk || RENK(j) }))));
  kutu.appendChild(svg);
  return kutu;
}

/**
 * Huni: [[ad, sayi], ...]. Her adimda bir oncekine ve ilk adima gore oran.
 * Cubuklar tek renk (sirali adimlar ayni seyin azalmasi).
 */
export function huni(kutu, adimlar, secenek = {}) {
  kutu.innerHTML = "";
  kutu.classList.add("gr-huni");
  const ilk = adimlar[0]?.[1] || 0;
  adimlar.forEach(([ad, n, not], i) => {
    const onceki = i ? adimlar[i - 1][1] : null;
    const r = document.createElement("div");
    r.className = "gr-h";
    const gen = ilk ? Math.max(0.6, (n / ilk) * 100) : 0;
    r.innerHTML = `<div class="gr-h-ad">${esc(ad)}</div>
      <div class="gr-h-ray"><span style="width:${gen}%"></span></div>
      <div class="gr-h-n"><b>${sayi(n)}</b><small>${i ? (onceki ? `%${((n / onceki) * 100).toFixed(1)} öncekinin` : "-") : secenek.birim || ""}${i && ilk ? ` · %${((n / ilk) * 100).toFixed(1)} ilkin` : ""}</small></div>`;
    if (not) r.title = not;
    kutu.appendChild(r);
  });
  return kutu;
}

/** Ad -> sayi haritasindan yatay cubuk listesi (en buyuk ustte). */
export function yatayCubuk(kutu, harita, secenek = {}) {
  kutu.innerHTML = "";
  kutu.classList.add("gr-yatay");
  const l = (Array.isArray(harita) ? harita : Object.entries(harita || {})).filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
  const top = l.reduce((t, [, v]) => t + v, 0);
  const limit = secenek.limit || 12;
  const gorunen = l.slice(0, limit);
  const kalan = l.slice(limit).reduce((t, [, v]) => t + v, 0);
  if (kalan) gorunen.push(["Diğer", kalan, true]);
  const max = gorunen[0]?.[1] || 1;
  if (!gorunen.length) { kutu.innerHTML = `<p class="muted">Veri yok.</p>`; return kutu; }
  for (const [k, v, diger] of gorunen) {
    const r = document.createElement("div");
    r.className = "gr-y" + (secenek.tik && !diger ? " tiklanir" : "");
    const ad = diger ? "Diğer" : secenek.etiket ? secenek.etiket(k) : k;
    r.innerHTML = `<span class="gr-y-ad" title="${esc(ad)}">${esc(ad)}</span><span class="gr-y-ray"><span style="width:${(v / max) * 100}%"></span></span><span class="gr-y-n">${sayi(v)}<small>${top ? ` %${((v / top) * 100).toFixed(0)}` : ""}</small></span>`;
    if (secenek.tik && !diger) r.onclick = () => secenek.tik(k);
    kutu.appendChild(r);
  }
  return kutu;
}

/** 7x24 isi haritasi (satir Pzt..Paz, sutun 0..23 saat). Tek renk, acik->koyu. */
export function saatIsi(kutu, matris, secenek = {}) {
  kutu.innerHTML = "";
  kutu.classList.add("gr-isi");
  const max = Math.max(1, ...matris.flat());
  let html = `<div class="gr-isi-g"><span></span>${Array.from({ length: 24 }, (_, h) => `<span class="gr-isi-s">${h % 3 ? "" : h}</span>`).join("")}`;
  matris.forEach((sat, g) => {
    html += `<span class="gr-isi-gun">${GUNLER[g]}</span>`;
    sat.forEach((v, h) => {
      const o = v ? 0.12 + 0.88 * (v / max) : 0;
      html += `<span class="gr-isi-h" data-i="${g}-${h}" style="--o:${o.toFixed(3)}"></span>`;
    });
  });
  html += `</div><div class="gr-ozet">${esc(secenek.not || "Türkiye saati")} · en yoğun ${sayi(max)} ${esc(secenek.birim || "")}</div>`;
  kutu.innerHTML = html;
  kutu.querySelectorAll(".gr-isi-h").forEach(c => {
    const [g, h] = c.dataset.i.split("-").map(Number);
    c.addEventListener("mousemove", e => ipucu(e, `<div class="gr-b">${GUNLER[g]} ${String(h).padStart(2, "0")}:00</div><div class="gr-s"><span>${esc(secenek.birim || "adet")}</span><b>${sayi(matris[g][h])}</b></div>`));
    c.addEventListener("mouseleave", () => ipucu(null));
  });
  return kutu;
}

/** Zaman dizisinden Turkiye saatine gore 7x24 matris. */
export function saatMatrisi(zamanlar) {
  const m = Array.from({ length: 7 }, () => Array(24).fill(0));
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", weekday: "short", hour: "2-digit", hourCycle: "h23" });
  const GI = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  for (const z of zamanlar) {
    if (!z || isNaN(z)) continue;
    const p = Object.fromEntries(f.formatToParts(z).map(x => [x.type, x.value]));
    m[GI[p.weekday]][Number(p.hour)]++;
  }
  return m;
}

/** Kucuk egilim cizgisi (kutucuk icin); son nokta vurgulu. */
export function kivilcim(degerler, secenek = {}) {
  const W = secenek.W || 90, H = secenek.H || 24;
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "gr-kivilcim" });
  if (!degerler?.length) return svg;
  const max = Math.max(1, ...degerler);
  const x = i => (degerler.length < 2 ? W / 2 : 2 + ((W - 4) * i) / (degerler.length - 1));
  const y = v => H - 3 - (H - 6) * (v / max);
  svg.appendChild(s("path", { d: degerler.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(""), fill: "none", stroke: "var(--soft)", "stroke-width": 1.5, "stroke-linejoin": "round" }));
  const son = degerler.length - 1;
  svg.appendChild(s("circle", { cx: x(son), cy: y(degerler[son]), r: 2.5, fill: "var(--accent)" }));
  return svg;
}
