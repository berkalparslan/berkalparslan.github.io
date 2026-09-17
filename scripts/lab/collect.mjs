#!/usr/bin/env node
/**
 * Günlük App Store + Google Play verisini toplar.
 *
 *   node scripts/lab/collect.mjs [--days 30] [--force]
 *
 * Kimlik bilgisi tutmaz: bütün istekleri `ascelerate` ve `gplay` CLI'larına
 * devrediyor, onlar kendi yapılandırmalarını kullanıyor. Bu yüzden repoda
 * hiçbir anahtar yok ve GitHub Actions'a gerek yok.
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
import { listele, indir, kovaAdi } from "./gcs.mjs";
import { csvNesneler } from "./csv.mjs";

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

/* ── iOS: Sales & Trends günlük raporu ─────────────────────────────────
   Ayrıştırma satis.mjs'te (uzak çalıştırıcıyla ortak). Burada yalnız CLI. */
function iosGunuCek(tarih) {
  const r = sh("ascelerate", ["reports", "sales", "--frequency", "DAILY", "--date", tarih, "--raw"]);
  if (!r.ok) {
    const yok = /404|not found|no report|no data/i.test(r.out);
    return { tarih, veri: false, sebep: yok ? "apple-rapor-yok" : r.out.trim().slice(0, 300), apps: {} };
  }
  return satisAyristir(r.out, tarih);
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
  const cikti = { uretim: new Date().toISOString(), gunluk: {}, yorumlar: {}, hata: null };
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
        g[app.slug] = {
          indirme:   Number(r["Daily Device Installs"]) || 0,
          kaldirma:  Number(r["Daily Device Uninstalls"]) || 0,
          guncelleme: Number(r["Daily Device Upgrades"]) || 0,
          aktif:     Number(r["Active Device Installs"]) || 0
        };
      }
      log(`  kova indirme ${app.slug} ${a} ✓`);
    }
  }

  /* Yorumlar: reviews/reviews_<paket>_<YYYYMM>.csv — tüm geçmiş burada. */
  for (const app of APPS.filter(a => a.android)) {
    let hepsi = [];
    for (const a of aylar(24)) {
      const ad = `reviews/reviews_${app.android}_${a}.csv`;
      try { hepsi = hepsi.concat(csvNesneler(await indir(KOVA, ad))); }
      catch { /* o ay yorum yok */ }
    }
    const puanlar = hepsi.map(r => Number(r["Star Rating"])).filter(Number.isFinite);
    cikti.yorumlar[app.slug] = {
      adet: hepsi.length,
      ortalama: puanlar.length
        ? +(puanlar.reduce((x, y) => x + y, 0) / puanlar.length).toFixed(2) : null,
      cevapsiz: hepsi.filter(r => !(r["Developer Reply Text"] || "").trim()).length,
      son: hepsi.map(r => r["Review Last Update Date and Time"]).filter(Boolean).sort().at(-1) || null
    };
    log(`  kova yorum ${app.slug} ${hepsi.length}`);
  }

  return cikti;
}

/* ── iOS yorumları ───────────────────────────────────────────────────── */

function iosYorumlar() {
  const cikti = {};
  for (const app of APPS.filter(a => a.ios)) {
    const r = sh("ascelerate", ["reviews", "list", app.ios.bundle, "--json", "--limit", "200"]);
    let liste = [];
    if (r.ok) {
      try {
        const j = JSON.parse(r.out);
        liste = Array.isArray(j) ? j : (j.reviews || j.data || []);
      } catch { /* json değilse atla */ }
    }
    const puanlar = liste.map(x => x.rating).filter(Number.isFinite);
    /* PENDING_PUBLISH: cevap yazılmış, Apple henüz yayınlamamış — cevapsız değil. */
    const cevapli = x => ["PUBLISHED", "PENDING_PUBLISH"].includes(x.response?.state);
    const cevapsiz = liste.filter(x => !cevapli(x)).length;
    cikti[app.slug] = {
      adet: r.ok ? liste.length : null,
      ortalama: puanlar.length ? +(puanlar.reduce((a, b) => a + b, 0) / puanlar.length).toFixed(2) : null,
      cevapsiz,
      son: liste.map(x => x.createdDate).sort().at(-1) || null,
      /* Tam metin panelde okunuyor. Yeniden eskiye; uzun metinler kırpılmıyor,
         asıl iş cevap yazmak ve kırpılmış yorumdan cevap yazılmaz. */
      liste: liste
        .sort((a, b) => String(b.createdDate).localeCompare(String(a.createdDate)))
        .map(x => ({
          puan: x.rating ?? null,
          baslik: x.title || "",
          metin: x.body || "",
          kisi: x.reviewerNickname || "",
          ulke: x.territory || "",
          tarih: x.createdDate || "",
          cevap: cevapli(x)
            ? { metin: x.response.body || "", tarih: x.response.lastModifiedDate || "",
                bekliyor: x.response.state === "PENDING_PUBLISH" || undefined } : null
        }))
    };
    log(`  yorum ${app.slug} ${liste.length}${cevapsiz ? ` (${cevapsiz} cevapsız)` : ""}`);
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
   Hangi uygulama incelemede, hangisi reddedildi, hangisi yayın bekliyor.
   Panelde "şirket" görünümünün mağaza sağlığı satırı. */
function iosDurum() {
  const cikti = { uretim: new Date().toISOString(), apps: {} };
  for (const app of APPS.filter(a => a.ios)) {
    const r = sh("ascelerate", ["apps", "versions", app.ios.bundle, "--json"]);
    if (!r.ok) { log(`  sürüm ${app.slug} okunamadı`); continue; }
    try {
      const l = JSON.parse(r.out);
      cikti.apps[app.slug] = (Array.isArray(l) ? l : []).slice(0, 4)
        .map(v => ({ surum: v.version, durum: v.state, tarih: v.createdDate, platform: v.platform }));
      log(`  sürüm ${app.slug} ${cikti.apps[app.slug][0]?.surum || "?"} ${cikti.apps[app.slug][0]?.durum || ""}`);
    } catch { /* json değilse atla */ }
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
    /* Veri yok diye kaydedilmiş son 3 gün tekrar denenir — Apple geç yayınlıyor. */
    if (eski.veri || i > 3) continue;
  }
  const g = iosGunuCek(tarih);
  writeFileSync(yol, JSON.stringify(g, null, 2));
  const toplam = Object.values(g.apps).reduce((a, x) => a + x.indirme, 0);
  log(`  ${tarih} ${g.veri ? `${toplam} indirme` : `veri yok (${g.sebep})`}`);
}

log("Android durum");
writeFileSync(join(VERI, "android-durum.json"), JSON.stringify(androidDurum(), null, 2));
log("iOS sürüm durumu");
writeFileSync(join(VERI, "ios-durum.json"), JSON.stringify(iosDurum(), null, 2));

log("iOS yorumları");
writeFileSync(join(VERI, "ios-yorumlar.json"), JSON.stringify(iosYorumlar(), null, 2));

log("Döviz kurları");
writeFileSync(join(VERI, "kurlar.json"), JSON.stringify(await kurlar(), null, 2));

log("Vault notları");
writeFileSync(join(VERI, "vault.json"), JSON.stringify(vaultNotlari(), null, 2));

log("Android toplu raporlar (Cloud Storage)");
const kovaVeri = await androidKova(3);
writeFileSync(join(VERI, "android-kova.json"), JSON.stringify(kovaVeri, null, 2));
if (kovaVeri.hata) log(`  ! ${kovaVeri.hata}`);

log("Firebase Analytics (GA4)");
try {
  const { googleIstemci } = await import("./uzak/google.mjs");
  const { PROPERTIES, OLAYLAR } = await import("./ga4.mjs");
  const cfg = JSON.parse(readFileSync(join(homedir(), ".gplay", "config.json"), "utf8"));
  const profil = cfg.profiles.find(p => p.name === (cfg.default_profile || "default")) || cfg.profiles[0];
  const ga = await googleIstemci({ GPLAY_SA_JSON: readFileSync(profil.key_path, "utf8") }).ga4(PROPERTIES, OLAYLAR, 45, log);
  writeFileSync(join(VERI, "ga4.json"), JSON.stringify(ga, null, 2));
} catch (e) { log(`  ga4 ✗ ${e.message}`); }

log(`\nBitti. Ham veri: ${VERI}`);
log("Sırada: node scripts/lab/build.mjs");
