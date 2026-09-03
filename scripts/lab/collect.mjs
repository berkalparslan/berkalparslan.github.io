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
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

import { APPS, SKU_SLUG, PKG_SLUG } from "./apps.mjs";
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

/* ── iOS: Sales & Trends günlük raporu ───────────────────────────────────
   Ürün tipi ayrımı kritik: "1" ile başlayanlar yeni indirme, "3" ve "7" ile
   başlayanlar güncelleme. Karıştırılırsa indirme sayısı iki katı görünür. */

function indirmeMi(tip) { return /^1/.test(tip) || /^F1/.test(tip) || /^IA1/.test(tip); }
function guncellemeMi(tip) { return /^3/.test(tip) || /^7/.test(tip); }

function iosGunuCek(tarih) {
  const r = sh("ascelerate", ["reports", "sales", "--frequency", "DAILY", "--date", tarih, "--raw"]);
  if (!r.ok) {
    /* Apple o gün için rapor üretmemişse 404 döner — hata değil, veri yokluğu. */
    const yok = /404|not found|no report|no data/i.test(r.out);
    return { tarih, veri: false, sebep: yok ? "apple-rapor-yok" : r.out.trim().slice(0, 300), apps: {} };
  }

  const satirlar = r.out.split("\n").filter(s => s.includes("\t"));
  const bas = satirlar.findIndex(s => s.startsWith("Provider\t"));
  if (bas < 0) return { tarih, veri: false, sebep: "baslik-yok", apps: {} };

  const kolon = satirlar[bas].split("\t").map(s => s.trim());
  const ix = ad => kolon.indexOf(ad);
  const [iSku, iTip, iAdet, iGelir, iUlke, iPara, iCihaz] =
    ["SKU", "Product Type Identifier", "Units", "Developer Proceeds",
     "Country Code", "Currency of Proceeds", "Device"].map(ix);

  const apps = {};
  for (const satir of satirlar.slice(bas + 1)) {
    const h = satir.split("\t");
    const sku = (h[iSku] || "").trim();
    const slug = SKU_SLUG.get(sku);
    if (!slug) continue;

    const adet  = Number(h[iAdet]) || 0;
    const tip   = (h[iTip] || "").trim();
    const ulke  = (h[iUlke] || "").trim() || "??";
    const para  = (h[iPara] || "").trim();
    const gelir = Number(h[iGelir]) || 0;

    const a = apps[slug] ||= { indirme: 0, guncelleme: 0, gelir: {}, ulkeler: {}, cihazlar: {} };
    if (indirmeMi(tip)) {
      a.indirme += adet;
      a.ulkeler[ulke] = (a.ulkeler[ulke] || 0) + adet;
      const c = (h[iCihaz] || "").trim() || "?";
      a.cihazlar[c] = (a.cihazlar[c] || 0) + adet;
    } else if (guncellemeMi(tip)) {
      a.guncelleme += adet;
    }
    /* Gelir para birimine göre ayrı toplanıyor — tek kura çevirmek için
       kur verisi yok, uydurmaktansa ayrı gösteriliyor. */
    if (gelir && para) a.gelir[para] = +((a.gelir[para] || 0) + gelir * adet).toFixed(4);
  }
  return { tarih, veri: true, apps };
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
    const r = sh("ascelerate", ["reviews", "list", app.ios.bundle, "--json"]);
    let adet = null, ortalama = null, cevapsiz = null, son = null;
    if (r.ok) {
      try {
        const j = JSON.parse(r.out);
        const liste = Array.isArray(j) ? j : (j.reviews || j.data || []);
        adet = liste.length;
        cevapsiz = liste.filter(x => x.response?.state !== "PUBLISHED").length;
        const puanlar = liste.map(x => x.rating).filter(Number.isFinite);
        if (puanlar.length) ortalama = +(puanlar.reduce((a, b) => a + b, 0) / puanlar.length).toFixed(2);
        son = liste.map(x => x.createdDate).sort().at(-1) || null;
      } catch { /* json değilse atla */ }
    }
    cikti[app.slug] = { adet, ortalama, cevapsiz, son };
    log(`  yorum ${app.slug} ${adet ?? "?"}${cevapsiz ? ` (${cevapsiz} cevapsız)` : ""}`);
  }
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

log("iOS yorumları");
writeFileSync(join(VERI, "ios-yorumlar.json"), JSON.stringify(iosYorumlar(), null, 2));

log("Android toplu raporlar (Cloud Storage)");
const kovaVeri = await androidKova(3);
writeFileSync(join(VERI, "android-kova.json"), JSON.stringify(kovaVeri, null, 2));
if (kovaVeri.hata) log(`  ! ${kovaVeri.hata}`);

log(`\nBitti. Ham veri: ${VERI}`);
log("Sırada: node scripts/lab/build.mjs");
