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
const gunluk = dosyalar
  .filter(d => /^ios-\d{4}-\d{2}-\d{2}\.json$/.test(d)).sort()
  .map(d => JSON.parse(readFileSync(join(VERI, d), "utf8")));

const android  = existsSync(join(VERI, "android-durum.json"))
  ? JSON.parse(readFileSync(join(VERI, "android-durum.json"), "utf8")) : { apps: {}, notlar: [] };
const yorumlar = existsSync(join(VERI, "ios-yorumlar.json"))
  ? JSON.parse(readFileSync(join(VERI, "ios-yorumlar.json"), "utf8")) : {};
const kova = existsSync(join(VERI, "android-kova.json"))
  ? JSON.parse(readFileSync(join(VERI, "android-kova.json"), "utf8")) : { gunluk: {}, yorumlar: {} };

const androidGun = kova.gunluk || {};
const androidVar = Object.keys(androidGun).length > 0;

/* ── Günlük matris ────────────────────────────────────────────────────
   Panel artık pencereleri (7/30/tümü) ve platform filtresini tarayıcıda
   hesaplıyor, o yüzden burada özet değil **ham günlük matris** üretiliyor.
   Yalnız dolu günler yazılıyor: 17 uygulama × 45 gün çoğunlukla sıfır,
   seyrek nesne olarak tutmak dosyayı küçük tutuyor.

   gun indeksi = `gunler` dizisindeki sıra. Kısa anahtarlar bilinçli:
   i=iOS indirme, g=iOS güncelleme, a=Android indirme, k=Android kaldırma,
   u=ülkeler, p=gelir (para birimi → tutar). */

const gunler = gunluk.map(g => g.tarih);
const iosVeriYok = gunluk.map(g => !g.veri);

const veri = {};
gunluk.forEach((g, ix) => {
  if (g.veri) {
    for (const [slug, a] of Object.entries(g.apps)) {
      if (!a.indirme && !a.guncelleme && !Object.keys(a.gelir || {}).length) continue;
      const h = (veri[slug] ||= {})[ix] ||= {};
      if (a.indirme)    h.i = a.indirme;
      if (a.guncelleme) h.g = a.guncelleme;
      if (Object.keys(a.ulkeler || {}).length) h.u = a.ulkeler;
      if (Object.keys(a.gelir   || {}).length) h.p = a.gelir;
    }
  }
  for (const [slug, a] of Object.entries(androidGun[g.tarih] || {})) {
    if (!a.indirme && !a.kaldirma) continue;
    const h = (veri[slug] ||= {})[ix] ||= {};
    if (a.indirme)  h.a = a.indirme;
    if (a.kaldirma) h.k = a.kaldirma;
  }
});

const apps = APPS.map(app => ({
  slug: app.slug,
  ad: app.ad,
  ios: app.ios?.bundle || null,
  android: app.android || null,
  yorum: yorumlar[app.slug] || null,
  androidYorum: kova.yorumlar?.[app.slug] || null,
  play: android.apps?.[app.slug]?.tracks || null
}));

const notlar = [...(android.notlar || [])];
if (kova.hata) notlar.push(`Play toplu raporları: ${kova.hata}`);
else if (!androidVar && KOVA_TANIMLI) notlar.push(
  "Cloud Storage kovası tanımlı ama hiç indirme verisi gelmedi.");
const veriYokGun = iosVeriYok.filter(Boolean).length;
if (veriYokGun) notlar.push(
  `${veriYokGun} gün için Apple raporu yok — grafikte boşluk, ortalamada paydadan düşük.`);

const panel = {
  surum: 3,
  uretim: new Date().toISOString(),
  gunler,
  iosVeriYok,
  apps,
  veri,
  androidVeriVar: androidVar,
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

const son7 = (n, alan) => gunler.slice(-n).reduce((t, _, j) => {
  const ix = gunler.length - n + j;
  return t + Object.values(veri).reduce((x, g) => x + (g[ix]?.[alan] || 0), 0);
}, 0);

console.log(`${CIKTI}`);
console.log(`  ${gunler.length} gün · ${apps.length} uygulama · ${(kapali.length / 1024).toFixed(1)} KB şifreli`);
console.log(`  son 7 gün: ${son7(7, "i")} iOS + ${son7(7, "a")} Android`);
if (notlar.length) notlar.forEach(n => console.log(`  ! ${n}`));
