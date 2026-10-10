/*
 Panellerin ortak dili. Her uygulamanin paneli ayri bir sayfa ama ayni
 bicimde calissin diye biçimlendirme, kart, kutucuk ve tablo buradan gelir.
 Tablolarin tamami siralanabilir ve filtrelenebilir: bir panelde ogrendigin
 hareket digerinde de ayni isi yapar.

   <link rel="stylesheet" href="/lab/assets/panel.css">
   import { kart, tiles, veriTablo, sayi } from "/lab/assets/panel.js";
*/

export const $ = s => document.querySelector(s);

export function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

// Bicimlendirme. Panellerde sayi hep Turkce ayracli, sure hep ayni kisaltma.
export const sayi = n => (n == null || n === "" ? "0" : Number(n).toLocaleString("tr-TR"));
export const yuzde = (pay, toplam, basamak = 0) =>
  toplam ? `%${(pay / toplam * 100).toFixed(basamak)}` : "-";
export const para = (n, kod = "USD") =>
  n == null ? "-" : Number(n).toLocaleString("tr-TR", { style: "currency", currency: kod, maximumFractionDigits: 2 });
export const sure = s => s == null ? "" :
  s >= 3600 ? `${Math.round(s / 360) / 10} sa` : s >= 60 ? `${Math.round(s / 6) / 10} dk` : `${Math.round(s)} sn`;
export const gun = d => { const t = zaman(d); return t ? t.toISOString().slice(0, 10) : ""; };

/* Her seyi Date'e cevirir: Firestore Timestamp'i ({toDate}), REST'ten gelen
   {seconds,nanoseconds}, ISO metni, milisaniye ya da Date. Okunamayani null
   doner.
   Firestore'dan gelen bir belgeyi dogrudan `new Date(...)` icine vermek
   "Invalid Date" uretir ve bu tabloda goze carpar ama filtrede carpmaz:
   NaN her karsilastirmada false'tur, yani "son 7 gunde aktif" sessizce sifir
   olur. Panelde tarih okunan her yer buradan gecsin. */
export function zaman(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === "object") {
    if (typeof v.toDate === "function") { const d = v.toDate(); return isNaN(d) ? null : d; }
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
    if (typeof v._seconds === "number") return new Date(v._seconds * 1000);
    return null;
  }
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

/* Siralama ve karsilastirma icin: okunamayan tarih 0, boylece en alta duser
   ve hicbir filtreyi NaN ile bozmaz. */
export const ms = v => { const d = zaman(v); return d ? d.getTime() : 0; };

export const tarih = v => {
  const d = zaman(v);
  return d ? d.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
};

export function kart(baslik, ...cocuklar) {
  const c = el("div", "card");
  if (baslik) c.appendChild(el("h2", null, baslik));
  cocuklar.forEach(x => x && c.appendChild(x));
  return c;
}

/** [ad, deger, alt] uclulerinden kutucuk izgarasi. */
export function tiles(pairs) {
  const wrap = el("div", "tiles");
  for (const [ad, deger, alt] of pairs) {
    const t = el("div", "tile");
    t.appendChild(el("b", null, String(deger)));
    t.appendChild(el("span", null, alt ? `${ad} · ${alt}` : ad));
    wrap.appendChild(t);
  }
  return wrap;
}

/* Bir hucre dugme ya da baska bir ogeyse metni bos kalir: arama, siralama ve
   Kopyala onu gormez, zaten gormemeli. */
const ogeMi = h => h instanceof Node || (h != null && typeof h === "object" && h.d instanceof Node);
const oge = h => (h instanceof Node ? h : h.d);
const metin = h => (h == null || ogeMi(h) ? "" : typeof h === "object" ? String(h.d ?? "") : String(h));
const anahtar = h => (h != null && typeof h === "object" && "s" in h ? h.s : h);

/* Sayi gibi duran her seyi sayi gibi sirala: "1.234", "%12,5", "$3.40",
   "12 gun" hepsi tablolarda geciyor ve metin sirasi bunlarda yaniltici. */
function sayisal(v) {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s) return null;
  const t = s.replace(/[^\d,.\-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!t || !/\d/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Siralanabilir, filtrelenebilir tablo.
 *
 * @param kolonlar  ["Ad", ...] ya da [{ad, num, filtre, sirala:false}, ...]
 * @param satirlar  [[hucre, ...], ...]; hucre ilkel deger ya da {d, s}
 *                  (d ekranda gorunen, s siralama ve filtre degeri)
 * @param secenek   {ara, bos, satirTik, sirala:[kolon, "asc"|"desc"], kopyala}
 */
export function veriTablo(kolonlar, satirlar, secenek = {}) {
  const kol = kolonlar.map(k => (typeof k === "string" ? { ad: k } : k));
  const ara = secenek.ara !== false && satirlar.length > 7;
  const kutu = el("div", "vt");
  const bar = el("div", "bar2");
  const kaydir = el("div", "kaydir");
  const sayac = el("span", "say");
  let q = "";
  const filtreler = {};
  let sirali = secenek.sirala ? secenek.sirala[0] : null;
  let yon = secenek.sirala ? secenek.sirala[1] || "desc" : "desc";

  if (ara) {
    const inp = el("input");
    inp.type = "search";
    inp.placeholder = secenek.araYazi || "Ara";
    inp.oninput = () => { q = inp.value.trim().toLowerCase(); ciz(); };
    bar.appendChild(inp);
  }
  kol.forEach((k, i) => {
    if (!k.filtre) return;
    const degerler = [...new Set(satirlar.map(s => metin(s[i])).filter(Boolean))].sort();
    if (degerler.length < 2 || degerler.length > 40) return;
    const s = el("select");
    s.innerHTML = `<option value="">${k.ad}: hepsi</option>` +
      degerler.map(v => `<option>${v.replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]))}</option>`).join("");
    s.onchange = () => { filtreler[i] = s.value; ciz(); };
    bar.appendChild(s);
  });
  if (bar.children.length) { bar.appendChild(sayac); kutu.appendChild(bar); }
  kutu.appendChild(kaydir);

  if (secenek.kopyala !== false && satirlar.length) {
    const alt = el("div", "alt");
    const b = el("button", "ghost", "Kopyala");
    b.onclick = () => {
      const liste = suzulmus();
      const metinler = [kol.map(k => k.ad).join("\t"), ...liste.map(s => s.map(metin).join("\t"))].join("\n");
      navigator.clipboard?.writeText(metinler).then(() => { b.textContent = "Kopyalandi"; setTimeout(() => (b.textContent = "Kopyala"), 1400); });
    };
    alt.appendChild(b);
    kutu.appendChild(alt);
  }

  function suzulmus() {
    let liste = satirlar.filter(s =>
      Object.entries(filtreler).every(([i, v]) => !v || metin(s[i]) === v) &&
      (!q || s.map(metin).join(" ").toLowerCase().includes(q)));
    if (sirali != null) {
      const yonu = yon === "asc" ? 1 : -1;
      liste = liste.slice().sort((a, b) => {
        const x = anahtar(a[sirali]), y = anahtar(b[sirali]);
        const sx = sayisal(x), sy = sayisal(y);
        if (sx != null && sy != null) return (sx - sy) * yonu;
        return String(x ?? "").localeCompare(String(y ?? ""), "tr") * yonu;
      });
    }
    return liste;
  }

  function ciz() {
    const liste = suzulmus();
    kaydir.innerHTML = "";
    sayac.textContent = liste.length === satirlar.length ? `${sayi(satirlar.length)} satir` : `${sayi(liste.length)} / ${sayi(satirlar.length)}`;
    if (!liste.length) {
      kaydir.appendChild(el("p", "bos", secenek.bos || "Kayit yok."));
      return;
    }
    const t = el("table");
    const bas = el("tr");
    kol.forEach((k, i) => {
      const th = el("th", k.num ? "num" : "");
      th.innerHTML = `${k.ad}<span class="ok">${sirali === i && yon === "asc" ? "▲" : "▼"}</span>`;
      if (k.sirala === false) th.classList.add("sabit");
      else {
        if (sirali === i) th.classList.add("sirali");
        th.onclick = () => {
          if (sirali === i) yon = yon === "asc" ? "desc" : "asc";
          else { sirali = i; yon = k.num ? "desc" : "asc"; }
          ciz();
        };
      }
      bas.appendChild(th);
    });
    t.appendChild(bas);
    const govde = el("tbody");
    liste.forEach(s => {
      const tr = el("tr");
      kol.forEach((k, i) => {
        const td = el("td", k.num ? "num" : "");
        if (ogeMi(s[i])) td.appendChild(oge(s[i])); else td.textContent = metin(s[i]);
        tr.appendChild(td);
      });
      if (secenek.satirTik) { tr.classList.add("tiklanir"); tr.onclick = () => secenek.satirTik(s, satirlar.indexOf(s)); }
      govde.appendChild(tr);
    });
    t.appendChild(govde);
    kaydir.appendChild(t);
  }

  ciz();
  return kutu;
}

/** Ad/adet haritasindan siralanabilir tablo: panellerde en sik gereken sey. */
export function dagilimTablo(harita, basliklar = ["Deger", "Adet"], secenek = {}) {
  const satirlar = Object.entries(harita || {}).map(([k, v]) => [k, sayi(v)]);
  return veriTablo([{ ad: basliklar[0], filtre: satirlar.length > 5 }, { ad: basliklar[1], num: true }],
                   satirlar, { sirala: [1, "desc"], ...secenek });
}
