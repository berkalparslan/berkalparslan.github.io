#!/usr/bin/env node
/**
 * Günlük App Store + Google Play verisini toplar.
 *
 *   node scripts/lab/collect.mjs [--days 30] [--force]
 *
 * Kimlik bilgisi tutmaz. App Store: ~/.ascelerate/config.<hesap>.json ile API
 * doğrudan (etkin config.json'a bakılmaz). Play: gplay CLI ve onun servis
 * hesabı. Firestore: Firebase CLI oturumu. Cloudflare: wrangler oturumu.
 * Repoda hiçbir anahtar yok ve GitHub Actions'a gerek yok.
 *
 * Ham çıktılar vault'a (private depo) yazılıyor:
 *   ~/dev/vault/metrikler/veri/ios-YYYY-MM-DD.json
 *   ~/dev/vault/metrikler/veri/android-durum.json
 *
 * Bir gün bir kez çekiliyor; ikinci çalıştırmada disktekiler atlanıyor
 * (--force bunu bozar). Apple raporları ~1 gün gecikmeli, satış olmayan günde
 * hiç rapor üretmiyor: "veri yok" ile "sıfır indirme" ayrı şeyler, ikisi ayrı
 * işaretleniyor.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

import { APPS, SKU_SLUG, PKG_SLUG } from "./apps.mjs";
import { satisAyristir } from "./satis.mjs";
import { vaultAyristir } from "./vaultmetin.mjs";
import { listele, indir, indirHam, kovaAdi } from "./gcs.mjs";
import { csvNesneler } from "./csv.mjs";
import { ascIstemci } from "./uzak/asc.mjs";
import { playSatir, playYorumlar, playYorumOzet, playApiCevap } from "./uzak/google.mjs";
import { telemetri } from "./telemetri.mjs";
import { web } from "./web.mjs";
import { framegrove } from "./framegrove.mjs";
import { tmpdir } from "node:os";
import { rmSync } from "node:fs";

const VERI = join(homedir(), "dev", "vault", "metrikler", "veri");
const args = process.argv.slice(2);
const DAYS = Number(args[args.indexOf("--days") + 1]) || 30;
const FORCE = args.includes("--force");

mkdirSync(VERI, { recursive: true });

/* Kova kimliği hesap kimliğini ele veriyor; public depoda durmasın diye
   vault'ta (private) tutuluyor. Ortam değişkeni onu geçersiz kılar. */
const KOVA_YOL = join(VERI, "gplay.json");
const KOVA = process.env.GPLAY_BUCKET_ID
  || (existsSync(KOVA_YOL) ? JSON.parse(readFileSync(KOVA_YOL, "utf8")).bucket : null);

const log = (...a) => console.log(...a);

function sh(cmd, argv) {
  try {
    return { ok: true, out: execFileSync(cmd, argv, { encoding: "utf8", maxBuffer: 64 << 20 }) };
  } catch (e) {
    return { ok: false, out: (e.stdout || "") + (e.stderr || e.message || "") };
  }
}

const iso = d => d.toISOString().slice(0, 10);

/* ── App Store Connect hesapları ─────────────────────────────────────────
   ascelerate'in etkin ayarı (~/.ascelerate/config.json) başka oturumlarca
   hesaptan hesaba çevriliyor; 24 Eyl 2026'da Oncopace hesabına dönük kaldı ve
   iOS verisi iki hafta boş geldi. O yüzden CLI yerine App Store Connect API
   doğrudan, hesap dosyası adıyla: config.aberk.json (Berk) ve config.page.json
   (Elif: Daily Whisper, Nubi). config.json'a hiç dokunulmuyor. */
const ASC_DIR = join(homedir(), ".ascelerate");
function ascHesap(ad) {
  const yol = join(ASC_DIR, `config.${ad}.json`);
  if (!existsSync(yol)) return null;
  const c = JSON.parse(readFileSync(yol, "utf8"));
  const pem = readFileSync(String(c.privateKeyPath).replace(/^~/, homedir()), "utf8");
  return { ad, vendor: c.vendorNumber || null,
    api: ascIstemci({ ASC_KEY_ID: c.keyId, ASC_ISSUER_ID: c.issuerId, ASC_PRIVATE_KEY: pem, ASC_VENDOR: c.vendorNumber }) };
}
const HESAPLAR = Object.fromEntries(["aberk", "page"].map(a => [a, ascHesap(a)]).filter(([, h]) => h));
const hesapAdi = app => app.ios?.hesap || "aberk";
const NOTLAR = [];
if (!HESAPLAR.aberk) NOTLAR.push("~/.ascelerate/config.aberk.json yok: Berk'in iOS verisi çekilemedi.");
if (HESAPLAR.page && !HESAPLAR.page.vendor)
  NOTLAR.push("Elif hesabının (Daily Whisper, Nubi iOS) vendor numarası yok: ~/.ascelerate/config.page.json içine vendorNumber yazılınca iOS indirmeleri de gelir (App Store Connect → Payments and Financial Reports, sol üst).");

/* ── iOS: Sales & Trends günlük raporu ─────────────────────────────────
   Ayrıştırma satis.mjs'te. Vendor numarası olan her hesap çekilip uygulamalar
   birleştiriliyor (slug'lar çakışmıyor). Bir hesap rapor verirse gün "veri var". */
async function iosGunuCek(tarih) {
  const sonuc = { tarih, veri: false, apps: {} };
  const sebepler = [];
  for (const h of Object.values(HESAPLAR).filter(h => h.vendor)) {
    try {
      const g = await h.api.satisGunu(tarih);
      if (g.veri) { sonuc.veri = true; Object.assign(sonuc.apps, g.apps); }
      else sebepler.push(g.sebep);
    } catch (e) { sebepler.push(e.message.slice(0, 200)); }
  }
  if (!sonuc.veri) sonuc.sebep = sebepler.every(s => s === "apple-rapor-yok") && sebepler.length ? "apple-rapor-yok" : sebepler.join(" · ") || "hesap yok";
  return sonuc;
}

/* ── Android: sürüm/track durumu ve vitals ───────────────────────────────
   İndirme ve gelir Play Developer API'da YOK; onlar Cloud Storage'daki toplu
   rapor kovasından geliyor ve --bucket-id gerektiriyor. Kova kimliği
   yapılandırılmışsa aşağıda kullanılıyor, yoksa alan boş bırakılıyor. */

function androidDurum() {
  const cikti = { uretim: new Date().toISOString(), apps: {}, kova: KOVA ? "tanımlı" : null, notlar: [] };

  const kova = KOVA;
  if (!kova) {
    cikti.notlar.push(
      "Android indirme/gelir verisi yok: Play Console → Download reports → " +
      "Copy Cloud Storage URI ile alınan kova kimliği GPLAY_BUCKET_ID olarak tanımlanmalı.");
  }

  for (const app of APPS.filter(a => a.android)) {
    const kayit = { paket: app.android };

    /* `gplay status` her çağrıda yeni bir edit açıyor; arka arkaya sekiz
       uygulamada zaman zaman boş dönüyor. Bir kez tekrar denemek yetiyor. */
    for (let deneme = 0; deneme < 2; deneme++) {
      const s = sh("gplay", ["status", "--package", app.android]);
      if (!s.ok) { kayit.hata = s.out.trim().slice(0, 200); continue; }
      try {
        const j = JSON.parse(s.out);
        kayit.tracks = (j.tracks?.tracks || [])
          .filter(t => t.releases?.length)
          .map(t => ({ track: t.track, surum: t.releases[0].name, durum: t.releases[0].status }));
        kayit.saglik = j.status;
        delete kayit.hata;
      } catch { kayit.hata = "status ayrıştırılamadı"; }
      if (kayit.tracks?.length) break;
    }

    const rv = sh("gplay", ["reviews", "list", "--package", app.android]);
    if (rv.ok) {
      try {
        const j = JSON.parse(rv.out);
        kayit.yorum = (j.reviews || []).length;
      } catch { /* boş yanıt {} — yorum yok */ kayit.yorum = 0; }
    }

    cikti.apps[app.slug] = kayit;
    log(`  android ${app.slug} ${kayit.hata ? "✗" : "✓"}`);
  }
  return cikti;
}

/* ── Android: toplu rapor kovası ─────────────────────────────────────────
   Play Developer API indirme vermiyor, yorumların da yalnız son 7 gününü
   veriyor. İkisinin tamamı Cloud Storage'daki aylık CSV'lerde. Kova hesap
   genelinde ortak — uygulama başına ayrı kova yok, dosya adı ayırıyor. */

function aylar(sayi) {
  const l = [], d = new Date();
  for (let i = 0; i < sayi; i++) {
    l.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return l;
}

async function androidKova(ay = 3) {
  const cikti = { uretim: new Date().toISOString(), gunluk: {}, yorumlar: {}, puan: {}, hata: null };
  if (!KOVA) { cikti.hata = "kova tanımsız"; return cikti; }

  const ayListesi = aylar(ay);

  /* Yetki yoksa 200 istek boşa gitmesin — tek denemeyle anla ve çık. */
  try { await listele(KOVA, "stats/installs/"); }
  catch (e) {
    cikti.hata = /403|denied|forbidden/i.test(e.message)
      ? "Servis hesabında hesap geneli \"toplu raporları indir\" yetkisi yok (403). " +
        "Play Console → Kullanıcılar ve izinler → servis hesabı → hesap izinleri."
      : e.message;
    return cikti;
  }

  /* İndirme: stats/installs/installs_<paket>_<YYYYMM>_overview.csv */
  for (const app of APPS.filter(a => a.android)) {
    for (const a of ayListesi) {
      const ad = `stats/installs/installs_${app.android}_${a}_overview.csv`;
      let metin;
      try { metin = await indir(KOVA, ad); }
      catch (e) {
        if (!/404/.test(e.message)) { cikti.hata ||= e.message; }
        continue;   /* o ay için rapor yok — normal */
      }
      for (const r of csvNesneler(metin)) {
        const tarih = (r["Date"] || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) continue;
        const g = cikti.gunluk[tarih] ||= {};
        g[app.slug] = { ...(g[app.slug] || {}), ...playSatir(r) };
      }
      /* Ülke: günlük kurulum ve aktif cihaz (o günün anlık sayısı). */
      try {
        for (const r of csvNesneler(await indir(KOVA, `stats/installs/installs_${app.android}_${a}_country.csv`))) {
          const tarih = (r["Date"] || "").trim(), u = (r["Country"] || "").trim() || "??";
          if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) continue;
          const p = playSatir(r);
          const g = (cikti.gunluk[tarih] ||= {})[app.slug] ||= {};
          if (p.indirme) (g.ulke ||= {})[u] = (g.ulke?.[u] || 0) + p.indirme;
          if (p.aktif) (g.aktifUlke ||= {})[u] = p.aktif;
        }
      } catch { /* ülke dosyası yok */ }
      /* Çökme ve ANR: günlük adet. */
      try {
        for (const r of csvNesneler(await indir(KOVA, `stats/crashes/crashes_${app.android}_${a}_overview.csv`))) {
          const tarih = (r["Date"] || "").trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) continue;
          const g = (cikti.gunluk[tarih] ||= {})[app.slug] ||= {};
          g.cokme = (g.cokme || 0) + (Number(r["Daily Crashes"]) || 0);
          g.anr = (g.anr || 0) + (Number(r["Daily ANRs"]) || 0);
        }
      } catch { /* çökme dosyası yok */ }
      /* Puan: mağazadaki toplam ortalama (yorum CSV'si yalnız metinli yorumları taşır). */
      try {
        const son = csvNesneler(await indir(KOVA, `stats/ratings/ratings_${app.android}_${a}_overview.csv`))
          .filter(r => Number(r["Total Average Rating"]) > 0).sort((x, y) => String(x.Date).localeCompare(String(y.Date))).at(-1);
        if (son && !(cikti.puan[app.slug]?.tarih > son.Date)) cikti.puan[app.slug] = { ortalama: +Number(son["Total Average Rating"]).toFixed(2), tarih: son.Date };
      } catch { /* puan dosyası yok */ }
      log(`  kova indirme ${app.slug} ${a} ✓`);
    }
  }

  /* Gelir: sales/salesreport_<YYYYMM>.zip, sipariş başına satır, günlük ve
     güncel (earnings/ ayda bir, ay bitince geliyor). Item Price vergisiz liste
     fiyatı; Google payı %15 düşülerek Apple'ın "Developer Proceeds"ine denk
     getiriliyor. İade eksi. Ücretli uygulama satışı zaten kurulumda sayılı,
     satın alma adedine yalnız uygulama içi ürün ve abonelik giriyor. */
  for (const a of ayListesi) {
    const zip = join(tmpdir(), `lab-play-satis-${a}.zip`);
    try { writeFileSync(zip, await indirHam(KOVA, `sales/salesreport_${a}.zip`)); }
    catch { continue; }
    try {
      const metin = execFileSync("unzip", ["-p", zip], { encoding: "utf8", maxBuffer: 64 << 20 });
      for (const r of csvNesneler(metin)) {
        const slug = PKG_SLUG.get((r["Package ID"] || "").trim()); if (!slug) continue;
        const tarih = (r["Order Charged Date"] || "").trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) continue;
        const iade = /refund/i.test(r["Financial Status"] || "");
        const tutar = Number(String(r["Item Price"] || "0").replace(/,/g, "")) * 0.85 * (iade ? -1 : 1);
        const para = (r["Currency of Sale"] || "").trim(); if (!para || !tutar) continue;
        const g = (cikti.gunluk[tarih] ||= {})[slug] ||= {};
        (g.gelir ||= {})[para] = +((g.gelir[para] || 0) + tutar).toFixed(4);
        if (!/paid app/i.test(r["Product Type"] || "")) g.satis = (g.satis || 0) + (iade ? -1 : 1);
        const u = (r["Country of Buyer"] || "").trim(); if (u && !iade) (g.satisUlke ||= {})[u] = (g.satisUlke[u] || 0) + 1;
      }
      log(`  kova satış ${a} ✓`);
    } catch (e) { log(`  kova satış ${a} ✗ ${e.message.slice(0, 80)}`); }
    finally { try { rmSync(zip); } catch { } }
  }

  /* Yorumlar: reviews/reviews_<paket>_<YYYYMM>.csv — tüm geçmiş burada. */
  for (const app of APPS.filter(a => a.android)) {
    let hepsi = [];
    for (const a of aylar(24)) {
      const ad = `reviews/reviews_${app.android}_${a}.csv`;
      try { hepsi = hepsi.concat(csvNesneler(await indir(KOVA, ad))); }
      catch { /* o ay yorum yok */ }
    }
    const y = playYorumlar(hepsi);
    /* CSV günde bir yenileniyor; cevapsız görünenleri Play API'dan teyit et. */
    for (const x of y.liste) if (!x.cevap && x.metin && !/\|/.test(x.kimlik)) {
      const r = sh("gplay", ["reviews", "get", "--package", app.android, "--review", x.kimlik]);
      if (r.ok) { try { x.cevap = playApiCevap(JSON.parse(r.out)); } catch { } }
    }
    cikti.yorumlar[app.slug] = playYorumOzet(y.liste);
    log(`  kova yorum ${app.slug} ${y.liste.length}${cikti.yorumlar[app.slug].cevapsiz ? ` (${cikti.yorumlar[app.slug].cevapsiz} cevapsız)` : ""}`);
  }

  return cikti;
}

/* ── iOS yorumları ve sürüm durumu (App Store Connect API) ─────────────── */

async function iosKimlikler() {
  const h = {};
  for (const [ad, hs] of Object.entries(HESAPLAR)) {
    try { h[ad] = await hs.api.uygulamalar(); }
    catch (e) { h[ad] = {}; NOTLAR.push(`App Store Connect (${ad}) uygulama listesi okunamadı: ${e.message.slice(0, 120)}`); }
  }
  return h;
}

async function iosYorumlar(kimlik) {
  const cikti = {};
  for (const app of APPS.filter(a => a.ios)) {
    const hs = HESAPLAR[hesapAdi(app)], id = kimlik[hesapAdi(app)]?.[app.ios.bundle]?.id;
    if (!hs || !id) { log(`  yorum ${app.slug}: hesapta yok`); continue; }
    try {
      const y = await hs.api.yorumlar(id);
      /* Tam metin panelde okunuyor; kırpılmış yorumdan cevap yazılmaz. */
      cikti[app.slug] = { ...y, cevapsiz: y.liste.filter(x => !x.cevap).length };
      log(`  yorum ${app.slug} ${y.adet}${cikti[app.slug].cevapsiz ? ` (${cikti[app.slug].cevapsiz} cevapsız)` : ""}`);
    } catch (e) { log(`  yorum ${app.slug} ✗ ${e.message.slice(0, 100)}`); }
  }
  return cikti;
}

/* ── Döviz kurları ───────────────────────────────────────────────────────
   Apple geliri sekiz para biriminde ödüyor ve elimizde kur yok. Panelde tek
   bir "yaklaşık TL" görebilmek için günlük ücretsiz bir kaynaktan çekiliyor.
   Çekilemezse alan boş kalıyor — panel o zaman para birimlerini ayrı gösterip
   "kur yok" diyor, uydurma bir kurla toplam üretmiyor. */

async function kurlar() {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(15000) });
    const j = await r.json();
    if (j.result !== "success" || !j.rates?.TRY) throw new Error("beklenmeyen yanıt");
    log(`  kur ✓ 1 USD = ${j.rates.TRY.toFixed(2)} TRY (${j.time_last_update_utc})`);
    return { taban: "USD", tarih: j.time_last_update_utc || null, kaynak: "open.er-api.com", oran: j.rates };
  } catch (e) {
    log(`  kur ✗ ${e.message}`);
    return null;
  }
}

/* ── iOS: App Store sürüm durumu ─────────────────────────────────────────
   Hangi uygulama incelemede, hangisi reddedildi, hangisi yayın bekliyor. */
async function iosDurum(kimlik) {
  const cikti = { uretim: new Date().toISOString(), apps: {} };
  for (const app of APPS.filter(a => a.ios)) {
    const hs = HESAPLAR[hesapAdi(app)], id = kimlik[hesapAdi(app)]?.[app.ios.bundle]?.id;
    if (!hs || !id) continue;
    try {
      cikti.apps[app.slug] = await hs.api.surumler(id);
      log(`  sürüm ${app.slug} ${cikti.apps[app.slug][0]?.surum || "?"} ${cikti.apps[app.slug][0]?.durum || ""}`);
    } catch (e) { log(`  sürüm ${app.slug} okunamadı: ${e.message.slice(0, 80)}`); }
  }
  return cikti;
}

/* ── Vault notları ───────────────────────────────────────────────────────
   Ayrıştırma vaultmetin.mjs'te (uzak çalıştırıcı GitHub API'den aynı
   fonksiyona verir). Burada yalnız diskten okuma. */
function vaultNotlari() {
  const kok = join(homedir(), "dev", "vault");
  if (!existsSync(join(kok, "uygulamalar"))) return { apps: {}, genel: [] };
  const md = dir => Object.fromEntries(readdirSync(join(kok, dir))
    .filter(d => d.endsWith(".md") && !d.startsWith("_"))
    .map(d => [d.replace(/\.md$/, ""), readFileSync(join(kok, dir, d), "utf8")]));
  const kd = join(kok, "pazarlama", "kampanyalar.md");
  const gd = join(kok, "pazarlama", "gelen");
  const cikti = vaultAyristir({
    uygulamalar: md("uygulamalar"),
    konular: md("konular"),
    kampanyalar: existsSync(kd) ? readFileSync(kd, "utf8") : null,
    gelen: existsSync(gd) ? readdirSync(gd).filter(d => d.endsWith(".csv"))
      .map(d => ({ ad: d, metin: readFileSync(join(gd, d), "utf8"), t: statSync(join(gd, d)).mtimeMs })) : []
  });
  const acik = Object.values(cikti.apps).reduce((t, a) => t + a.gorevler.filter(g => !g.bitti).length, 0);
  log(`  vault ${Object.keys(cikti.apps).length} not · ${acik} açık görev · ${cikti.genel.filter(g => !g.bitti).length} genel · ` +
      `${cikti.kampanyalar.length} kampanya · ${cikti.reklam.length} reklam`);
  return cikti;
}

/* ── Akış ────────────────────────────────────────────────────────────── */

const bugun = new Date();
log(`iOS satış raporları — son ${DAYS} gün`);
for (let i = 1; i <= DAYS; i++) {
  const d = new Date(bugun); d.setDate(d.getDate() - i);
  const tarih = iso(d);
  const yol = join(VERI, `ios-${tarih}.json`);
  if (existsSync(yol) && !FORCE) {
    const eski = JSON.parse(readFileSync(yol, "utf8"));
    /* Veri yok diye kaydedilmiş son 3 gün tekrar denenir (Apple geç yayınlıyor).
       Hata yüzünden boş kalan gün (sebep "apple-rapor-yok" değil: kimlik,
       vendor numarası, ağ) her çalıştırmada yeniden denenir; boşluk kendini onarır. */
    if (eski.veri || (i > 3 && eski.sebep === "apple-rapor-yok")) continue;
  }
  const g = await iosGunuCek(tarih);
  writeFileSync(yol, JSON.stringify(g, null, 2));
  const toplam = Object.values(g.apps).reduce((a, x) => a + x.indirme, 0);
  log(`  ${tarih} ${g.veri ? `${toplam} indirme` : `veri yok (${g.sebep})`}`);
}

log("Android durum");
writeFileSync(join(VERI, "android-durum.json"), JSON.stringify(androidDurum(), null, 2));
const iosId = await iosKimlikler();
log("iOS sürüm durumu");
writeFileSync(join(VERI, "ios-durum.json"), JSON.stringify(await iosDurum(iosId), null, 2));

log("iOS yorumları");
writeFileSync(join(VERI, "ios-yorumlar.json"), JSON.stringify(await iosYorumlar(iosId), null, 2));

log("Döviz kurları");
writeFileSync(join(VERI, "kurlar.json"), JSON.stringify(await kurlar(), null, 2));

log("Vault notları");
writeFileSync(join(VERI, "vault.json"), JSON.stringify(vaultNotlari(), null, 2));

log("Android toplu raporlar (Cloud Storage)");
const kovaVeri = await androidKova(4);
writeFileSync(join(VERI, "android-kova.json"), JSON.stringify(kovaVeri, null, 2));
if (kovaVeri.hata) log(`  ! ${kovaVeri.hata}`);

log("Firebase Analytics (GA4)");
try {
  const { googleIstemci } = await import("./uzak/google.mjs");
  const { PROPERTIES, OLAYLAR } = await import("./ga4.mjs");
  const cfg = JSON.parse(readFileSync(join(homedir(), ".gplay", "config.json"), "utf8"));
  const profil = cfg.profiles.find(p => p.name === (cfg.default_profile || "default")) || cfg.profiles[0];
  const ga = await googleIstemci({ GPLAY_SA_JSON: readFileSync(profil.key_path, "utf8") }).ga4(PROPERTIES, OLAYLAR, 90, log);
  writeFileSync(join(VERI, "ga4.json"), JSON.stringify(ga, null, 2));
} catch (e) { log(`  ga4 ✗ ${e.message}`); }

log("Uygulama telemetrisi (Firestore installs)");
writeFileSync(join(VERI, "telemetri.json"), JSON.stringify(await telemetri(log), null, 2));

log("Site trafiği (Cloudflare Web Analytics)");
writeFileSync(join(VERI, "web.json"), JSON.stringify(await web(log), null, 2));

log("Framegrove (npm, GitHub, site, MCP Registry)");
writeFileSync(join(VERI, "framegrove.json"), JSON.stringify(await framegrove(log), null, 2));

writeFileSync(join(VERI, "toplama-notlar.json"), JSON.stringify(NOTLAR, null, 2));
NOTLAR.forEach(n => log(`  ! ${n}`));

log(`\nBitti. Ham veri: ${VERI}`);
log("Sırada: node scripts/lab/build.mjs");
