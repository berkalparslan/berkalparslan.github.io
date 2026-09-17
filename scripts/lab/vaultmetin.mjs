/* Vault notlarını metinden ayrıştırır. Saf: dosya sistemi yok.
   collect.mjs diskten, uzak/github.mjs GitHub API'den okuyup buraya verir.

   Girdi:
     uygulamalar: { slug: markdown }
     konular:     { ad: markdown }
     kampanyalar: markdown | null          (pazarlama/kampanyalar.md)
     gelen:       [{ ad, metin, t }]       (pazarlama/gelen/*.csv, t = mtime ms) */

/* Görev satırının paneldeki hâli. Etiketler (#ios #android #watch #wear #web
   #site #play #asc #pazarlama …) metinden ayrılır; "✅ 2026-09-17" bitiş tarihi
   olarak okunur. Başlığında "kalıp" ya da "şablon" geçen bölümlerdeki kutular
   görev değil, kontrol listesi — panele girmez. */
export const ETIKETLER = ["ios", "android", "watch", "wear", "web", "site", "play", "asc", "pazarlama", "karar", "berk"];
const etiketRe = new RegExp(`(?:^|\\s)#(${ETIKETLER.join("|")})\\b`, "gi");

export function gorevSatiri(satir) {
  const g = satir.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
  if (!g) return null;
  let ham = g[2];
  const etiket = [];
  ham = ham.replace(etiketRe, (_, e) => { etiket.push(e.toLowerCase()); return ""; });
  let tarih = null;
  ham = ham.replace(/\s*✅\s*(\d{4}-\d{2}-\d{2})\s*$/, (_, t) => { tarih = t; return ""; });
  const yazi = ham.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, "$1").replace(/\s+/g, " ").trim();
  if (!yazi || /^_?\(doldurulmadı\)_?$/.test(yazi)) return null;
  return { bitti: g[1].toLowerCase() === "x", yazi, etiket, tarih };
}

export function gorevAyikla(metin) {
  const gorevler = [];
  let bolum = "", kalip = false;
  for (const satir of metin.split("\n")) {
    const b = satir.match(/^#{2,3}\s+(.+?)\s*$/);
    if (b) { bolum = b[1].replace(/\[\[|\]\]/g, ""); kalip = /kalıp|şablon|template/i.test(bolum); continue; }
    if (kalip) continue;
    const g = gorevSatiri(satir);
    if (!g) continue;
    gorevler.push({ ...g, bolum });
  }
  return gorevler;
}

/* Paneldeki görev kimliği: slug + metnin kısa özeti. gorev-kapat.mjs aynı
   fonksiyonla satırı bulur; tarayıcıdaki kimlik() ile birebir aynı olmalı. */
export function kimlik(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); }

export function onYuz(metin) {
  const m = metin.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const o = {};
  for (const satir of m[1].split("\n")) {
    const k = satir.match(/^([a-zA-ZğüşıöçĞÜŞİÖÇ_]+):\s*(.*)$/);
    if (k) o[k[1]] = k[2].trim().replace(/^["']|["']$/g, "");
  }
  return o;
}

/* Tırnaklı CSV satırı (Apple Ads / Meta dışa aktarımları). */
function csvSatir(satir) {
  const h = []; let s = "", q = false;
  for (const c of satir) {
    if (c === '"') q = !q;
    else if (c === "," && !q) { h.push(s); s = ""; }
    else s += c;
  }
  h.push(s); return h.map(x => x.trim());
}

export function reklamAyristir(gelen) {
  const gorulen = new Map();
  for (const { ad: d, metin: ham } of [...gelen].sort((a, b) => a.t - b.t)) {
    const metin = ham.replace(/^﻿/, "");
    const satirlar = metin.split(/\r?\n/).filter(Boolean);
    const bas = satirlar.findIndex(x => /^"?Campaign ID"?,|^"?Reporting starts"?,/.test(x));
    if (bas < 0) continue;
    const kolon = csvSatir(satirlar[bas]);
    const ix = ad => kolon.indexOf(ad);
    const apple = kolon.includes("Campaign ID");
    const kur = (metin.match(/^Currency:\s*(\w+)/m) || [])[1]
      || (kolon.find(k => /Amount spent \((\w+)\)/.test(k))?.match(/\((\w+)\)/)?.[1]) || "";
    for (const satir of satirlar.slice(bas + 1)) {
      const h = csvSatir(satir);
      const ad = h[ix("Campaign Name") >= 0 ? ix("Campaign Name") : ix("Campaign name")];
      if (!ad) continue;
      const n = k => Number(String(h[ix(k)] ?? "").replace(/,/g, "")) || 0;
      const kayit = apple ? {
        kaynak: "apple-ads", ad, uygulamaAdi: h[ix("App Name")] || "", ulke: h[ix("Country or Region")] || "",
        durum: h[ix("Status")] || "", bas: h[ix("Start Date")] || "", son: h[ix("End Date")] || "",
        gunluk: n("Daily Budget"), harcama: n("Spend"), para: kur, gosterim: n("Impressions"), tik: n("Taps"),
        kurulum: n("Installs (Total)"), cpa: n("Avg CPA (Total)"), cpt: n("Average CPT"), donusum: n("CR (Total)")
      } : {
        kaynak: "meta-ads", ad, uygulamaAdi: "", ulke: "", durum: h[ix("Campaign delivery")] || "",
        bas: h[ix("Reporting starts")] || "", son: h[ix("Reporting ends")] || "",
        gunluk: n("Ad set budget"), harcama: n(kolon.find(k => k.startsWith("Amount spent")) || ""), para: kur,
        gosterim: n("Impressions"), tik: 0, kurulum: h[ix("Results")] ? n("Results") : null, erisim: n("Reach"),
        cpa: null, cpt: null, donusum: null
      };
      gorulen.set(`${kayit.kaynak}|${ad}`, { ...kayit, dosya: d });
    }
  }
  return [...gorulen.values()];
}

export function kampanyaAyristir(metin) {
  const kampanyalar = [];
  if (!metin) return { kampanyalar, sorular: [] };
  for (const satir of metin.split("\n")) {
    const h = satir.match(/^\|\s*(\d{4}-\d{2}-\d{2}[^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|/);
    if (!h) continue;
    const t = x => x.trim().replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, "$1");
    kampanyalar.push({ tarih: t(h[1]), kanal: t(h[2]), uygulama: t(h[3]), harcama: t(h[4]), sonuc: t(h[5]), not: t(h[6]) });
  }
  return { kampanyalar, sorular: gorevAyikla(metin).filter(g => !g.bitti).map(g => g.yazi) };
}

export function vaultAyristir({ uygulamalar = {}, konular = {}, kampanyalar = null, gelen = [] }) {
  const cikti = { apps: {}, genel: [] };
  for (const [slug, metin] of Object.entries(uygulamalar)) {
    const fm = onYuz(metin);
    const ozet = (metin.match(/^#\s+.+\n+((?:>\s?.*\n)+)/m)?.[1] || "")
      .split("\n").map(x => x.replace(/^>\s?/, "").trim()).join(" ").trim();
    cikti.apps[slug] = {
      durum: fm.durum || null, platform: fm.platform || null, sayfa: fm.sayfa || null,
      store: fm.store || null, repo: fm.repo || null, guncelleme: fm.guncelleme || null,
      ozet: ozet || null, gorevler: gorevAyikla(metin)
    };
  }
  const k = kampanyaAyristir(kampanyalar);
  cikti.kampanyalar = k.kampanyalar; cikti.kampanyaSorular = k.sorular;
  cikti.reklam = reklamAyristir(gelen);
  for (const [konu, metin] of Object.entries(konular))
    for (const g of gorevAyikla(metin)) cikti.genel.push({ ...g, konu });
  return cikti;
}
