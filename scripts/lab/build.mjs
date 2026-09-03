#!/usr/bin/env node
/**
 * Ham günlük dosyaları tek bir panele dönüştürür ve şifreleyip yayınlar.
 *
 *   node scripts/lab/build.mjs
 *
 * Çıktı: lab/panel/data.enc.json — AES-256-GCM ile şifreli. Sayfa public bir
 * URL'de duruyor, dosya da GitHub'da; parola olmadan içindeki rakamlar
 * okunamıyor. Anahtar PBKDF2-SHA256 (250.000 tur) ile paroladan türetiliyor,
 * tarayıcıda aynı şekilde çözülüyor.
 *
 * Parola macOS Keychain'de duruyor. Bir kez kurmak için:
 *   security add-generic-password -a "$USER" -s bamtech-lab-panel -w
 * (komut parolayı sorar; -w'den sonra bir şey yazma ki geçmişe düşmesin)
 *
 * Ortam değişkeni LAB_PASSPHRASE tanımlıysa Keychain yerine o kullanılır.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { webcrypto as crypto } from "node:crypto";

import { APPS, SLUG_APP } from "./apps.mjs";

const KOK  = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERI = join(homedir(), "dev", "vault", "metrikler", "veri");
const CIKTI = join(KOK, "lab", "panel", "data.enc.json");

const SERVIS = "bamtech-lab-panel";
const TUR = 250_000;

function parolaAl() {
  if (process.env.LAB_PASSPHRASE) return process.env.LAB_PASSPHRASE;
  try {
    return execFileSync("security",
      ["find-generic-password", "-s", SERVIS, "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { /* Keychain'de yok — ilk çalıştırma, aşağıda sorulur. */ }

  if (!process.stdin.isTTY) {
    console.error(
      `Parola yok. Terminalden bir kez çalıştır:\n` +
      `  security add-generic-password -a "$USER" -s ${SERVIS} -w`);
    process.exit(1);
  }

  /* Ekrana yazdırmadan sor, sonra Keychain'e koy — bir daha sorulmaz. */
  console.log("Panel parolası kurulmamış. Bir tane belirle (aynısını sayfaya gireceksin).");
  const p1 = execFileSync("/bin/sh", ["-c", 'stty -echo; printf "parola: " >&2; read v; stty echo; echo >&2; printf %s "$v"'],
    { encoding: "utf8", stdio: ["inherit", "pipe", "inherit"] });
  const p2 = execFileSync("/bin/sh", ["-c", 'stty -echo; printf "tekrar: " >&2; read v; stty echo; echo >&2; printf %s "$v"'],
    { encoding: "utf8", stdio: ["inherit", "pipe", "inherit"] });
  if (!p1 || p1 !== p2) { console.error("Parolalar eşleşmedi."); process.exit(1); }

  execFileSync("security", ["add-generic-password", "-U", "-a", process.env.USER || "aberk",
    "-s", SERVIS, "-w", p1]);
  console.log(`Keychain'e kaydedildi (servis: ${SERVIS}).\n`);
  return p1;
}

/* ── Ham dosyaları topla ─────────────────────────────────────────────── */

if (!existsSync(VERI)) { console.error(`Ham veri yok: ${VERI}\nÖnce collect.mjs çalıştır.`); process.exit(1); }

const KOVA_TANIMLI = !!(process.env.GPLAY_BUCKET_ID || existsSync(join(VERI, "gplay.json")));

const dosyalar = readdirSync(VERI);
const gunler = dosyalar.filter(d => /^ios-\d{4}-\d{2}-\d{2}\.json$/.test(d)).sort();

const gunluk = [];        // { tarih, veri, apps: { slug: {...} } }
for (const d of gunler) {
  gunluk.push(JSON.parse(readFileSync(join(VERI, d), "utf8")));
}

const android  = existsSync(join(VERI, "android-durum.json"))
  ? JSON.parse(readFileSync(join(VERI, "android-durum.json"), "utf8")) : { apps: {}, notlar: [] };
const yorumlar = existsSync(join(VERI, "ios-yorumlar.json"))
  ? JSON.parse(readFileSync(join(VERI, "ios-yorumlar.json"), "utf8")) : {};
const kova = existsSync(join(VERI, "android-kova.json"))
  ? JSON.parse(readFileSync(join(VERI, "android-kova.json"), "utf8")) : { gunluk: {}, yorumlar: {} };

/* Android indirmesi gün+uygulama olarak geliyor; iOS'un gün listesine
   hizalanıyor. Kova yetkisi yoksa hepsi boş kalıyor ve panel bunu
   "eksik" olarak yazıyor — sıfır göstermiyor. */
const androidGun = kova.gunluk || {};
const androidVar = Object.keys(androidGun).length > 0;

/* ── Özet ─────────────────────────────────────────────────────────────
   Pencere toplamlarında "veri yok" günler paydadan düşülüyor. Apple bazı
   günler hiç rapor üretmiyor; onları sıfır saymak ortalamayı aşağı çeker. */

function pencere(gunSayisi) {
  const secili = gunluk.slice(-gunSayisi);
  const veriliGun = secili.filter(g => g.veri).length;
  const toplam = {
    indirme: 0, guncelleme: 0, gelir: {}, ulkeler: {}, apps: {},
    android: 0, androidKaldirma: 0
  };
  for (const g of secili) {
    if (g.veri) {
      for (const [slug, a] of Object.entries(g.apps)) {
        const t = toplam.apps[slug] ||= { indirme: 0, guncelleme: 0, android: 0 };
        t.indirme += a.indirme; t.guncelleme += a.guncelleme;
        toplam.indirme += a.indirme; toplam.guncelleme += a.guncelleme;
        for (const [u, n] of Object.entries(a.ulkeler || {})) toplam.ulkeler[u] = (toplam.ulkeler[u] || 0) + n;
        for (const [p, v] of Object.entries(a.gelir || {})) toplam.gelir[p] = +((toplam.gelir[p] || 0) + v).toFixed(2);
      }
    }
    /* Android günü iOS raporundan bağımsız — Apple o gün rapor üretmese de
       Play verisi olabilir, o yüzden `g.veri` kontrolünün dışında. */
    for (const [slug, a] of Object.entries(androidGun[g.tarih] || {})) {
      const t = toplam.apps[slug] ||= { indirme: 0, guncelleme: 0, android: 0 };
      t.android += a.indirme;
      toplam.android += a.indirme;
      toplam.androidKaldirma += a.kaldirma || 0;
    }
  }
  return { gun: gunSayisi, veriliGun, ...toplam };
}

const seri = gunluk.map(g => {
  const and = androidGun[g.tarih];
  return {
    tarih: g.tarih,
    veri: g.veri,
    indirme: g.veri ? Object.values(g.apps).reduce((a, x) => a + x.indirme, 0) : null,
    android: and ? Object.values(and).reduce((a, x) => a + x.indirme, 0) : null,
    apps: g.veri ? Object.fromEntries(Object.entries(g.apps).map(([s, a]) => [s, a.indirme])) : {}
  };
});

const son7  = pencere(7);
const son30 = pencere(30);
const onceki7 = (() => {
  const secili = gunluk.slice(-14, -7).filter(g => g.veri);
  return secili.reduce((a, g) => a + Object.values(g.apps).reduce((b, x) => b + x.indirme, 0), 0);
})();

const satirlar = APPS.map(app => ({
  slug: app.slug,
  ad: app.ad,
  ios: app.ios?.bundle || null,
  android: app.android || null,
  indirme7:  son7.apps[app.slug]?.indirme  ?? 0,
  indirme30: son30.apps[app.slug]?.indirme ?? 0,
  androidIndirme7:  son7.apps[app.slug]?.android  ?? 0,
  androidIndirme30: son30.apps[app.slug]?.android ?? 0,
  guncelleme30: son30.apps[app.slug]?.guncelleme ?? 0,
  seri: seri.map(g => (g.veri ? (g.apps[app.slug] || 0) : null)),
  yorum: yorumlar[app.slug] || null,
  androidYorum: kova.yorumlar?.[app.slug] || null,
  play: android.apps?.[app.slug] || null
})).sort((a, b) => (b.indirme30 + b.androidIndirme30) - (a.indirme30 + a.androidIndirme30)
                || a.ad.localeCompare(b.ad, "tr"));

const notlar = [...(android.notlar || [])];
if (kova.hata) notlar.push(`Play toplu raporları: ${kova.hata}`);
else if (!androidVar && KOVA_TANIMLI) notlar.push(
  "Cloud Storage kovası tanımlı ama hiç indirme verisi gelmedi.");
const veriYokGun = gunluk.filter(g => !g.veri).length;
if (veriYokGun) notlar.push(`${veriYokGun} gün için Apple raporu yok — o günler ortalamaya katılmadı.`);

const panel = {
  surum: 2,
  uretim: new Date().toISOString(),
  aralik: { bas: gunluk[0]?.tarih || null, son: gunluk.at(-1)?.tarih || null },
  ozet: { son7, son30, onceki7 },
  seri,
  apps: satirlar,
  android: { kova: android.kova, uretim: android.uretim, veriVar: androidVar },
  notlar
};

/* ── Şifrele ─────────────────────────────────────────────────────────── */

const parola = parolaAl();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv   = crypto.getRandomValues(new Uint8Array(12));

const temel = await crypto.subtle.importKey(
  "raw", new TextEncoder().encode(parola), "PBKDF2", false, ["deriveKey"]);
const anahtar = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: TUR, hash: "SHA-256" },
  temel, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);

const acik = new TextEncoder().encode(JSON.stringify(panel));
const kapali = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, anahtar, acik));

const b64 = u8 => Buffer.from(u8).toString("base64");

mkdirSync(dirname(CIKTI), { recursive: true });
writeFileSync(CIKTI, JSON.stringify({
  v: 1,
  kdf: { ad: "PBKDF2-SHA256", tur: TUR, salt: b64(salt) },
  iv: b64(iv),
  ct: b64(kapali)
}, null, 0) + "\n");

console.log(`${CIKTI}`);
console.log(`  ${gunluk.length} gün · ${satirlar.length} uygulama · ${(kapali.length / 1024).toFixed(1)} KB şifreli`);
console.log(`  son 7 gün ${son7.indirme} iOS + ${son7.android} Android (önceki 7 iOS: ${onceki7})`);
if (notlar.length) notlar.forEach(n => console.log(`  ! ${n}`));
