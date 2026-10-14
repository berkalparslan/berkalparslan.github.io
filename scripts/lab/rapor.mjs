#!/usr/bin/env node
/**
 * Günlük rapor: son verili gün + genel tablo.
 *
 *   node scripts/lab/rapor.mjs            üretir, vault'a yazar
 *   node scripts/lab/rapor.mjs --yazdir   üretir, yazar, metni de basar
 *   node scripts/lab/rapor.mjs --kuru     yalnız basar, dosya yazmaz
 *
 * Girdi build.mjs ile aynı ham veri (ham.mjs → ozet.mjs/panelOlustur).
 * Çıktı ~/dev/vault/metrikler/veri/raporlar/YYYY-MM-DD.json (private vault,
 * son 60 saklanır). build.mjs raporları şifreli pakete koyar; public depoya
 * düz metin rapor girmez. Telefona bildirim rapor-gonder.mjs'te.
 *
 * Kişisel veri yok: yorum sahibinin adı, e-posta, kullanıcı kimliği rapora
 * girmez; yalnız sayılar, uygulama adları ve yorumun kısa özeti.
 *
 * Rapor: { tarih, gun, uretim, baslik, ozet, bolumler: [{ baslik, ton?, satirlar?: [..], tablo?: { kolonlar, satirlar } }], ham }
 *   tarih  raporun günü (bildirimin geldiği sabah, TSİ)
 *   gun    mağaza verisinin son dolu günü (App Store genelde 1-2 gün geriden)
 *   ham    bir sonraki raporun kıyas yapması için ham sayılar (pakete girmez)
 */

import { writeFileSync, mkdirSync, readdirSync, unlinkSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { panelOlustur } from "./ozet.mjs";
import { hamOku, raporlariOku, RAPOR_DIZIN, RAPOR_SAKLA } from "./ham.mjs";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const KURU = args.includes("--kuru");

/* ── yardımcılar ─────────────────────────────────────────── */
const TZ = "Europe/Istanbul";
const yerelGun = (d = new Date()) => d.toLocaleDateString("sv-SE", { timeZone: TZ });
const gunEkle = (t, n) => { const d = new Date(t + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const gunYazi = t => t ? `${+t.slice(8, 10)} ${AYLAR[+t.slice(5, 7) - 1]}` : "?";
const sayi = (n, b = 0) => Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: b, minimumFractionDigits: 0 });
const tlYazi = n => `${sayi(Math.round(n))} ₺`;
/* Tire yasağı: uzun/orta tire ve Türkçede şapkalı a yok (memory: tire-yasagi). */
const temiz = s => String(s ?? "")
  .replace(/\s*[—–]\s*/g, ", ").replace(/â/g, "a").replace(/Â/g, "A")
  .replace(/\*\*|__|`/g, "").replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, a, b) => b || a)
  .replace(/\s+/g, " ").trim();
const kisalt = (s, n) => { s = temiz(s); return s.length <= n ? s : s.slice(0, n - 1).replace(/[\s,.;:]+\S*$/, "") + "…"; };
const fark = (simdi, onceki) => {
  if (onceki === null || onceki === undefined) return "";
  if (!onceki) return simdi ? " (önceki 0)" : "";
  const y = Math.round((simdi - onceki) / onceki * 100);
  return y === 0 ? " (=)" : ` (${y > 0 ? "▲" : "▼"} ${Math.abs(y)}%)`;
};
const SURUM = {
  READY_FOR_DISTRIBUTION: "yayında", READY_FOR_SALE: "yayında", WAITING_FOR_REVIEW: "inceleme bekliyor", IN_REVIEW: "incelemede",
  PENDING_DEVELOPER_RELEASE: "onaylandı, yayın bekliyor", PENDING_APPLE_RELEASE: "onaylandı, Apple yayınlayacak", PROCESSING_FOR_DISTRIBUTION: "işleniyor",
  ACCEPTED: "kabul edildi", REJECTED: "reddedildi", METADATA_REJECTED: "metin reddi", INVALID_BINARY: "geçersiz build",
  DEVELOPER_REJECTED: "geri çekildi", PREPARE_FOR_SUBMISSION: "hazırlanıyor", REMOVED_FROM_SALE: "satıştan kaldırıldı",
  DEVELOPER_REMOVED_FROM_SALE: "satıştan kaldırıldı", REPLACED_WITH_NEW_VERSION: "eski sürüm"
};
const RET = new Set(["REJECTED", "METADATA_REJECTED", "INVALID_BINARY", "REMOVED_FROM_SALE"]);
const TRACK = { production: "üretim", beta: "açık test", alpha: "kapalı test", internal: "iç test" };
const trackAdi = t => TRACK[t] || (t.endsWith("production") ? `${t.split(":")[0]} üretim` : t);

/* ── veri ────────────────────────────────────────────────── */
const ham = hamOku();
const P = panelOlustur(ham);
const onceki = raporlariOku({ hamIle: true }).find(r => r.tarih < yerelGun()) || null;
const OH = onceki?.ham || null;

const tarih = yerelGun();
const dun = gunEkle(tarih, -1);
const n = P.gunler.length;
let gi = -1; for (let i = n - 1; i >= 0; i--) if (!P.iosVeriYok[i]) { gi = i; break; }
const gun = gi >= 0 ? P.gunler[gi] : null;
const di = P.gunler.indexOf(dun) >= 0 ? P.gunler.indexOf(dun) : n - 1;
const ai = P.androidSon ? P.gunler.lastIndexOf(P.androidSon) : -1;
const appAdi = slug => P.apps.find(a => a.slug === slug)?.ad || slug;

const oran = P.kur?.oran;
const tl = harita => { if (!oran?.TRY) return 0; let t = 0; for (const [p, v] of Object.entries(harita || {})) if (oran[p]) t += v / oran[p] * oran.TRY; return t; };
const h = (slug, ix) => (ix >= 0 && P.veri[slug]?.[ix]) || {};
const iosGun = ix => P.apps.reduce((t, a) => { const x = h(a.slug, ix); t.i += x.i || 0; t.s += x.s || 0; t.tl += tl(x.p); return t; }, { i: 0, s: 0, tl: 0 });
/* Önceki 7 verili App Store günü (rapor gününden önce). */
const onceki7 = []; for (let i = gi - 1; i >= 0 && onceki7.length < 7; i--) if (!P.iosVeriYok[i]) onceki7.push(i);
const ort = (dizi, f) => dizi.length ? dizi.reduce((t, ix) => t + f(ix), 0) / dizi.length : null;

const G = iosGun(gi);
const Gonc = gi > 0 && !P.iosVeriYok[gi - 1] ? iosGun(gi - 1) : null;
const G7 = { i: ort(onceki7, ix => iosGun(ix).i), s: ort(onceki7, ix => iosGun(ix).s), tl: ort(onceki7, ix => iosGun(ix).tl) };

/* Aktif: GA4'ün 1 günlük aktifi ile telemetrinin son 24 saati, büyük olan (panelin aktifApp'i). */
const aktifUyg = slug => Math.max(P.ga4Donem?.[1]?.apps?.[slug] || 0, P.telemetri?.apps?.[slug]?.aktif1 || 0);
const aktifler = Object.fromEntries(P.apps.map(a => [a.slug, aktifUyg(a.slug)]).filter(([, v]) => v));
const aktifTop = Object.values(aktifler).reduce((t, v) => t + v, 0);

/* Play: toplu rapor ~7-10 gün geriden; son dolu günü ayrı yazılır. */
const playGun = ix => P.apps.reduce((t, a) => { const x = h(a.slug, ix); t.a += x.a || 0; t.ps += x.ps || 0; t.tl += tl(x.pa); t.cr += (x.cr || 0) + (x.an || 0); t.ak += x.ak || 0; return t; }, { a: 0, ps: 0, tl: 0, cr: 0, ak: 0 });
const PL = ai >= 0 ? playGun(ai) : null;

/* Site */
const web = P.web?.gunluk || {};
const webGunler = Object.keys(web).sort();
const webSon = web[dun] ? dun : webGunler.at(-1) || null;
const W = webSon ? web[webSon] : null;
const W7 = (() => { const l = webGunler.filter(t => t < webSon).slice(-7); return l.length ? l.reduce((t, g) => t + (web[g].ziyaret || 0), 0) / l.length : null; })();
const Wonc = webSon ? web[gunEkle(webSon, -1)] : null;

/* ── bölümler ────────────────────────────────────────────── */
const bolumler = [];
const dikkat = [];

/* 1. Özet rakamlar */
{
  const s = [];
  s.push(`App Store, ${gunYazi(gun)}: ${sayi(G.i)} indirme${fark(G.i, Gonc?.i)}, 7 gün ortalaması ${sayi(G7.i, 1)}.`);
  s.push(`Satın alma: ${sayi(G.s)}${fark(G.s, Gonc?.s)}, gelir ≈ ${tlYazi(G.tl)}${fark(G.tl, Gonc?.tl)}; 7 gün ortalaması ${sayi(G7.s, 1)} satın alma, ≈ ${tlYazi(G7.tl || 0)}.`);
  if (PL) s.push(`Google Play, ${gunYazi(P.androidSon)} (rapor geriden gelir): ${sayi(PL.a)} kurulum, ${sayi(PL.ps)} satın alma, ≈ ${tlYazi(PL.tl)}, ${sayi(PL.ak)} aktif cihaz.`);
  s.push(`Aktif kullanıcı (son 24 saat, telemetri ve Analytics): ${sayi(aktifTop)}${OH ? fark(aktifTop, OH.aktifTop) : ""} · ${Object.keys(aktifler).length} uygulamada.`);
  if (W) s.push(`Site, ${gunYazi(webSon)}: ${sayi(W.ziyaret)} ziyaret, ${sayi(W.pv)} sayfa görüntüleme${fark(W.ziyaret, Wonc?.ziyaret)}; 7 gün ortalaması ${sayi(W7, 1)}.`);
  bolumler.push({ baslik: "Özet rakamlar", satirlar: s });
}

/* 2. Uygulama uygulama */
{
  const satirlar = P.apps.map(a => {
    const x = h(a.slug, gi), y = h(a.slug, ai);
    const ind = (x.i || 0), and = y.a || 0, sat = (x.s || 0), gel = tl(x.p), akt = aktifler[a.slug] || 0;
    return { a, ind, and, sat, gel, akt };
  }).filter(r => r.ind || r.and || r.sat || r.gel || r.akt)
    .sort((p, q) => (q.gel - p.gel) || (q.ind - p.ind) || (q.akt - p.akt));
  bolumler.push({
    baslik: `Uygulama uygulama (${gunYazi(gun)})`,
    not: `iOS indirme, satın alma ve gelir ${gunYazi(gun)}; Play kurulum ${gunYazi(P.androidSon)}; aktif son 24 saat.`,
    tablo: {
      kolonlar: ["Uygulama", "iOS indirme", "Play kurulum", "Satın alma", "Gelir ₺", "Aktif"],
      satirlar: satirlar.map(r => [r.a.ad, r.ind, r.and, r.sat, Math.round(r.gel), r.akt])
    }
  });
  /* Sıfır gün: normalde indirme alan uygulama bugün 0. */
  for (const a of P.apps) {
    const o = ort(onceki7, ix => h(a.slug, ix).i || 0);
    if (o >= 3 && !(h(a.slug, gi).i)) dikkat.push(`${a.ad}: ${gunYazi(gun)} App Store'da 0 indirme (7 gün ort. ${sayi(o, 1)}).`);
  }
  if (G7.i >= 10 && G.i < G7.i * 0.5) dikkat.push(`Toplam App Store indirmesi ortalamanın yarısının altında: ${sayi(G.i)} / ${sayi(G7.i, 1)}.`);
}

/* 3. Telemetri: dün aktif, yeni kurulum, paywall ve satın alma */
const telem = {};
{
  const kol = ["Uygulama", "Aktif 24s", "Yeni kurulum", "Aktif 7g", "Pro", "Paywall", "Satın alma"];
  const satir = [];
  const slugs = new Set([...Object.keys(P.telemetri?.apps || {}), ...P.apps.filter(a => a.ga4).map(a => a.slug)]);
  for (const slug of slugs) {
    const t = P.telemetri?.apps?.[slug], e = h(slug, di).e || {};
    const yeni = Math.max(t?.gunlukYeni?.[dun] || 0, h(slug, di).nu || 0);
    const pw = (e.paywall_viewed || 0) + (e.paywall_shown || 0);
    const sa = (e.in_app_purchase || 0) + (e.purchase_completed || 0);
    const r = { akt: aktifler[slug] || 0, yeni, a7: t?.aktif7 ?? null, pro: t?.pro ?? null, pw, sa };
    telem[slug] = r;
    if (!r.akt && !r.yeni && !r.pw && !r.sa) continue;
    satir.push([appAdi(slug), r.akt, r.yeni, r.a7 ?? "·", r.pro ?? "·", r.pw, r.sa]);
    const ok = OH?.telem?.[slug];
    if (ok && ok.akt >= 8 && r.akt < ok.akt * 0.5) dikkat.push(`${appAdi(slug)}: aktif kullanıcı ${sayi(ok.akt)} → ${sayi(r.akt)}.`);
  }
  satir.sort((p, q) => q[1] - p[1]);
  const yeniTop = satir.reduce((t, r) => t + r[2], 0), pwTop = satir.reduce((t, r) => t + r[5], 0), saTop = satir.reduce((t, r) => t + r[6], 0);
  bolumler.push({
    baslik: `Telemetri (${gunYazi(dun)})`,
    not: `Toplam ${sayi(yeniTop)} yeni kurulum, ${sayi(pwTop)} paywall gösterimi, ${sayi(saTop)} satın alma olayı. Paywall ve satın alma Firebase Analytics olaylarından.`,
    tablo: { kolonlar: kol, satirlar: satir }
  });
  for (const hh of P.telemetri ? [] : ["Uygulama telemetrisi okunamadı."]) dikkat.push(hh);
}

/* 4. Site */
if (W) {
  const s = [`${gunYazi(webSon)}: ${sayi(W.ziyaret)} ziyaret, ${sayi(W.pv)} sayfa görüntüleme${fark(W.ziyaret, Wonc?.ziyaret)}.`];
  const ul = Object.entries(W.ulke || {}).filter(([k]) => k !== "??").sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (ul.length) s.push(`Ülkeler: ${ul.map(([k, v]) => `${k} ${v}`).join(", ")}.`);
  const top7 = webGunler.slice(-7).reduce((t, g) => t + (web[g].ziyaret || 0), 0);
  s.push(`Son 7 gün ${sayi(top7)} ziyaret.`);
  const A = P.web?.arkaUc;
  if (A?.abone) s.push(`Bülten: ${sayi(A.abone.active || 0)} onaylı abone${A.abone.pending ? `, ${A.abone.pending} onay bekliyor` : ""}.`);
  bolumler.push({ baslik: "Site (bamstudio.dev)", satirlar: s });
}

/* 5. Yeni yorumlar: önceki rapordan sonra gelenler (ilk raporda son 3 gün). */
const yorumEsik = onceki?.uretim || new Date(Date.now() - 3 * 864e5).toISOString();
const yeniYorum = [];
for (const a of P.apps) for (const [mag, y] of [["App Store", a.yorum], ["Play", a.androidYorum]])
  for (const r of y?.liste || []) if (r.tarih && Date.parse(r.tarih) > Date.parse(yorumEsik)) yeniYorum.push({ a, mag, r });
yeniYorum.sort((p, q) => (p.r.puan || 5) - (q.r.puan || 5));
const cevapsizTop = P.apps.reduce((t, a) => t + (a.yorum?.cevapsiz || 0) + (a.androidYorum?.cevapsiz || 0), 0);
{
  const s = yeniYorum.slice(0, 10).map(({ a, mag, r }) => {
    const ozet = kisalt([r.baslik, r.metin].filter(Boolean).join(": "), 110);
    return `${r.puan ?? "?"}★ ${a.ad} (${mag})${r.cevap ? "" : ", cevapsız"}: ${ozet}`;
  });
  if (!s.length) s.push("Yeni yorum yok.");
  s.push(`Toplam cevapsız yorum: ${sayi(cevapsizTop)}.`);
  bolumler.push({ baslik: `Yeni yorumlar${yeniYorum.length ? ` (${yeniYorum.length})` : ""}`, satirlar: s });
  for (const { a, r } of yeniYorum) if ((r.puan || 5) <= 2) dikkat.push(`${a.ad}: yeni ${r.puan}★ yorum${r.cevap ? "" : ", cevap bekliyor"}.`);
}

/* 6. Mağaza durumu: önceki raporla kıyas (ilk raporda son 2 günde değişenler). */
const durum = {};
for (const a of P.apps) {
  const v = a.iosSurum?.[0];
  durum[a.slug] = { ios: v ? `${v.surum}|${v.durum}` : null, iosTarih: v?.tarih || null, play: Object.fromEntries((a.play || []).map(t => [t.track, `${t.surum}|${t.durum}`])) };
}
const degisen = [];
{
  const yakin = t => t && Date.now() - Date.parse(t) < 2 * 864e5;
  for (const a of P.apps) {
    const d = durum[a.slug], od = OH?.durum?.[a.slug];
    if (d.ios && (od ? od.ios !== d.ios : yakin(d.iosTarih))) {
      const [s, k] = d.ios.split("|");
      const [os, ok] = (od?.ios || "|").split("|");
      const ne = SURUM[k] || k;
      degisen.push({ a, yazi: `${a.ad} iOS ${s}: ${ne}${od?.ios && os === s && ok ? ` (önceden ${SURUM[ok] || ok})` : ""}`, ret: RET.has(k), kisa: `${a.ad} ${s} ${ne}`,
        sessiz: ["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REPLACED_WITH_NEW_VERSION"].includes(k) });
    }
    if (od) for (const [tr, val] of Object.entries(d.play)) if (od.play?.[tr] !== val) {
      const [s] = val.split("|");
      degisen.push({ a, yazi: `${a.ad} Play ${trackAdi(tr)}: ${s}`, kisa: `${a.ad} Play ${s} ${trackAdi(tr)}` });
    }
  }
  const s = degisen.map(x => x.yazi + ".");
  /* Bekleyen ve reddedilenler, değişmese de. */
  const bekleyen = P.apps.filter(a => ["WAITING_FOR_REVIEW", "IN_REVIEW", "PENDING_DEVELOPER_RELEASE", ...RET].includes(a.iosSurum?.[0]?.durum) && !degisen.some(x => x.a === a && x.yazi.includes("iOS")));
  for (const a of bekleyen) s.push(`${a.ad} iOS ${a.iosSurum[0].surum}: ${SURUM[a.iosSurum[0].durum]} (değişmedi).`);
  if (!s.length) s.push("Değişiklik yok.");
  bolumler.push({ baslik: "Mağaza durumu", satirlar: s });
  for (const a of P.apps) if (RET.has(a.iosSurum?.[0]?.durum)) dikkat.push(`${a.ad} iOS ${a.iosSurum[0].surum}: ${SURUM[a.iosSurum[0].durum]}.`);
}

/* 7. Yeni sürüm notları (lab/assets/surumler.json): önceki rapordan sonra görülenler. */
{
  const dosya = join(KOK, "lab", "assets", "surumler.json");
  const sj = existsSync(dosya) ? JSON.parse(readFileSync(dosya, "utf8")) : { apps: {} };
  const gorulen = new Set(OH?.surumler || []);
  const anahtarlar = [];
  const s = [];
  for (const [slug, l] of Object.entries(sj.apps || {})) for (const x of l) {
    const k = `${slug}|${x.platform}|${x.surum}`;
    anahtarlar.push(k);
    if (s.some(y => y.k === `${slug}|${x.surum}`)) continue;
    const yeni = OH ? !gorulen.has(k) : (x.tarih && Date.now() - Date.parse(x.tarih) < 2 * 864e5);
    if (yeni && x.notlar?.length) s.push({ k: `${slug}|${x.surum}`, yazi: `${appAdi(slug)} ${x.surum} (${x.platform === "ios" ? "iOS" : "Android"}, ${x.durum}): ${kisalt(x.notlar.join(" "), 140)}` });
  }
  durum.__surumler = anahtarlar;
  bolumler.push({ baslik: "Yeni sürüm notları", satirlar: s.length ? s.slice(0, 8).map(x => x.yazi) : ["Yeni sürüm notu yok."] });
}

/* 8. Dikkat: çökme, veri kaynağı uyarıları, takvim. */
{
  for (const a of P.apps) { const x = h(a.slug, ai); const c = (x.cr || 0) + (x.an || 0); if (c) dikkat.push(`${a.ad}: Play'de ${c} çökme/ANR (${gunYazi(P.androidSon)}).`); }
  for (const nt of P.notlar || []) if (/^UYARI/.test(nt)) dikkat.push(kisalt(nt.replace(/^UYARI:\s*/, ""), 160));
  for (const k of P.kaynaklar || []) if (k.durum === "engel") dikkat.push(`Veri kaynağı: ${k.ad}, ${kisalt(k.not, 100)}`);
  if (P.iosVeriYok[n - 1] && gun) dikkat.push(`App Store ${gunYazi(P.gunler[n - 1])} raporu henüz gelmedi, rakamlar ${gunYazi(gun)} günü.`);
  bolumler.push({ baslik: "Dikkat", ton: dikkat.length ? "uyari" : undefined, satirlar: dikkat.length ? dikkat.map(temiz) : ["Dikkat gerektiren bir şey yok."] });
}

/* 9. Bugün için öneri: takvimde yaklaşanlar + açık #berk görevlerinden en önemlileri. */
{
  const oneri = [];
  for (const t of (P.takvim || []).map(t => ({ ...t, kalan: Math.round((Date.parse(t.tarih) - Date.parse(tarih)) / 864e5) })).filter(t => t.kalan >= 0 && t.kalan <= 2))
    oneri.push({ p: 100 - t.kalan, yazi: `${t.kalan ? `${t.kalan} gün kaldı` : "Bugün"}: ${kisalt(t.ne, 130)}` });
  const durumPuan = { "yayında": 3, "incelemede": 2, "test": 1 };
  for (const a of P.apps) for (const g of a.vault?.gorevler || []) {
    if (g.bitti || !g.etiket?.includes("berk")) continue;
    /* Vault geride kalmış olabilir: sürüm zaten incelemedeyse "Review'a gönder" önerilmez. */
    if (/review'?a gönder|app review/i.test(g.yazi) && ["WAITING_FOR_REVIEW", "IN_REVIEW", "PENDING_DEVELOPER_RELEASE", "READY_FOR_DISTRIBUTION"].includes(a.iosSurum?.[0]?.durum)
        && g.yazi.includes(a.iosSurum[0].surum)) continue;
    const prod = (a.play || []).find(t => t.track === "production")?.surum;
    if (prod && /production|üretim/i.test(g.yazi) && /android|play/i.test(g.yazi + g.etiket.join(" ")) && g.yazi.includes(prod.split(" ")[0])) continue;
    let p = (durumPuan[a.vault?.durum] || 0);
    if (g.etiket.some(e => e === "asc" || e === "play")) p += 3;
    if (/gönder|production|üretim|yayınla|onay/i.test(g.yazi)) p += 3;
    if (/^(Sonraki|Sıradaki)/i.test(g.bolum || "")) p += 2;
    if (g.etiket.includes("karar")) p -= 1;
    p += Math.min(3, (aktifler[a.slug] || 0) / 10);
    oneri.push({ p, yazi: `${a.ad}: ${kisalt(g.yazi, 130)}` });
  }
  for (const g of P.genelGorevler || []) if (!g.bitti && g.etiket?.includes("berk"))
    oneri.push({ p: 1 + (/gönder|production|yayınla|onay/i.test(g.yazi) ? 3 : 0), yazi: `${g.konu || "Genel"}: ${kisalt(g.yazi, 130)}` });
  /* Cevapsız düşük puanlı yorum her zaman öneriye girer. */
  const kotu = yeniYorum.filter(x => (x.r.puan || 5) <= 3 && !x.r.cevap);
  if (kotu.length) oneri.push({ p: 50, yazi: `${kotu[0].a.ad}: ${kotu[0].r.puan}★ yoruma cevap yaz.` });
  const sec = oneri.sort((p, q) => q.p - p.p).slice(0, 3).map(o => o.yazi);
  bolumler.push({ baslik: "Bugün için öneri", satirlar: sec.length ? sec : ["Açık #berk görevi yok."] });
}

/* ── kısa özet (bildirim) ────────────────────────────────── */
const baslik = kisalt(`Günaydın · ${gunYazi(tarih)} raporu`, 50);
const parcalar = [`${gunYazi(gun)}: ${sayi(G.i)} indirme, ${sayi(G.s)} satın alma${G.tl >= 1 ? ` (≈ ${tlYazi(G.tl)})` : ""}, ${sayi(aktifTop)} aktif.`];
for (const d of degisen.filter(x => x.ret).concat(degisen.filter(x => !x.ret && !x.sessiz)).slice(0, 2)) parcalar.push(`${d.kisa}.`);
if (yeniYorum.length) {
  const dusuk = yeniYorum.filter(x => (x.r.puan || 5) <= 2);
  parcalar.push(dusuk.length ? `${yeniYorum.length} yeni yorum, ${dusuk.length} tanesi ${dusuk[0].r.puan}★.` : `${yeniYorum.length} yeni yorum.`);
}
if (dikkat.length) parcalar.push(`${dikkat.length} uyarı.`);
let ozet = "";
for (const p of parcalar) { const s = temiz(ozet ? `${ozet} ${p}` : p); if (s.length <= 170) ozet = s; }
ozet = ozet || kisalt(parcalar[0], 170);

const rapor = {
  tarih, gun, uretim: new Date().toISOString(),
  baslik: temiz(baslik), ozet,
  bolumler: bolumler.map(b => ({ ...b, baslik: temiz(b.baslik), ...(b.not ? { not: temiz(b.not) } : {}), ...(b.satirlar ? { satirlar: b.satirlar.map(temiz) } : {}),
    ...(b.tablo ? { tablo: { kolonlar: b.tablo.kolonlar.map(temiz), satirlar: b.tablo.satirlar.map(r => r.map(c => typeof c === "string" ? temiz(c) : c)) } } : {}) })),
  ham: { iosGun: G, aktifTop, aktifler, telem, durum: Object.fromEntries(Object.entries(durum).filter(([k]) => k !== "__surumler")), surumler: durum.__surumler, web: W ? { gun: webSon, ziyaret: W.ziyaret } : null }
};

/* ── çıktı ───────────────────────────────────────────────── */
if (KURU || args.includes("--yazdir")) {
  console.log(`${rapor.baslik}\n${rapor.ozet}  [${rapor.ozet.length} karakter]\n`);
  for (const b of rapor.bolumler) {
    console.log(`## ${b.baslik}`);
    if (b.not) console.log(`  (${b.not})`);
    for (const s of b.satirlar || []) console.log(`  · ${s}`);
    if (b.tablo) { console.log(`  ${b.tablo.kolonlar.join(" | ")}`); for (const r of b.tablo.satirlar) console.log(`  ${r.join(" | ")}`); }
    console.log("");
  }
}
if (!KURU) {
  mkdirSync(RAPOR_DIZIN, { recursive: true });
  writeFileSync(join(RAPOR_DIZIN, `${tarih}.json`), JSON.stringify(rapor, null, 1) + "\n");
  const tum = readdirSync(RAPOR_DIZIN).filter(d => /^\d{4}-\d{2}-\d{2}\.json$/.test(d)).sort();
  for (const d of tum.slice(0, Math.max(0, tum.length - RAPOR_SAKLA))) unlinkSync(join(RAPOR_DIZIN, d));
  console.log(`rapor: ${join(RAPOR_DIZIN, `${tarih}.json`)}`);
  console.log(`  ${rapor.baslik} · ${rapor.ozet}`);
}
