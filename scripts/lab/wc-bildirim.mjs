/* Wallet Coach'a duyuru bildirimi: FCM konularına, dile göre ayrı metin.
 *
 *   node scripts/lab/wc-bildirim.mjs --dosya bildirim.json [--test] [--dogrula|--gonder]
 *
 * --gonder olmadan yalnız ne gideceğini yazar. --test yalnız test cihazlarına
 * (wc_test) gönderir; herkese göndermeden önce bununla dene. Kişiye değil konuya gider;
 * uygulamada hesap yok, sunucu kimseyi tanımıyor. Konular (Push.swift):
 *   wc_all · wc_lang_<en|tr|de|es|fr|pt|ru> · wc_try (bütçe TL ise)
 *
 * bildirim.json:
 *   { "sekme": "analysis",            // dokununca açılacak: panel|month|analysis|wallet
 *     "yalnizTL": true,               // yalnız wc_try (TCMB/TÜİK haberleri)
 *     "metinler": { "tr": { "baslik": "...", "metin": "..." }, "en": { ... } } }
 *
 * Kimlik: Firebase CLI oturumu (firebase login). Gönderilenler
 * ~/dev/vault/metrikler/veri/wc-bildirimler.json'a yazılır, panel okur.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const PROJE = "wallet-coach-87336";
const args = process.argv.slice(2);
const dosya = args[args.indexOf("--dosya") + 1];
if (!dosya || args.indexOf("--dosya") < 0) { console.error("kullanım: --dosya bildirim.json [--gonder]"); process.exit(1); }
const gonder = args.includes("--gonder") || args.includes("--dogrula");
/* --dogrula: Google mesajı kabul ediyor mu, kimseye gitmeden (validate_only). */
const yalnizDogrula = args.includes("--dogrula");
/* --test: yalnız wc_test konusuna, ilk dildeki metinle. TestFlight sürümleri
   bu konuya kendiliğinden girer; diğerleri Ayarlar'da sürüme 7 kez dokunarak. */
const test = args.includes("--test");
const b = JSON.parse(readFileSync(dosya, "utf8"));

for (const [dil, m] of Object.entries(b.metinler)) {
  if (!["en", "tr", "de", "es", "fr", "pt", "ru"].includes(dil)) throw new Error(`bilinmeyen dil: ${dil}`);
  for (const alan of [m.baslik, m.metin]) {
    if (!alan) throw new Error(`${dil}: başlık ve metin şart`);
    if (/[—–]/.test(alan)) throw new Error(`${dil}: uzun tire kullanma`);
  }
}

async function token() {
  const api = await import("/opt/homebrew/lib/node_modules/firebase-tools/lib/api.js");
  const c = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: c.tokens.refresh_token,
      client_id: api.clientId(), client_secret: api.clientSecret() }) });
  const j = await r.json();
  if (!j.access_token) throw new Error("Firebase oturumu yok: firebase login");
  return j.access_token;
}

const T = gonder ? await token() : null;
const kayit = [];
const hedefler = test ? Object.entries(b.metinler).slice(0, 1) : Object.entries(b.metinler);
for (const [dil, m] of hedefler) {
  const kosul = test ? "'wc_test' in topics"
    : `'wc_lang_${dil}' in topics` + (b.yalnizTL ? " && 'wc_try' in topics" : "");
  const mesaj = { message: { condition: kosul,
    notification: { title: m.baslik, body: m.metin },
    data: b.sekme ? { tab: b.sekme } : {},
    apns: { payload: { aps: { sound: "default" } } },
    android: { notification: { channel_id: "news" } } } };
  if (!gonder) { console.log(`[deneme] ${kosul}\n  ${m.baslik}\n  ${m.metin}`); continue; }
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJE}/messages:send`, { method: "POST",
    headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...mesaj, validate_only: yalnizDogrula }) });
  const j = await r.json();
  if (!r.ok) { console.error(`${dil} ✗ ${j.error?.message}`); continue; }
  console.log(`${dil} ✓ ${yalnizDogrula ? "doğrulandı, gönderilmedi" : j.name}`);
  if (yalnizDogrula) continue;
  if (!test) kayit.push({ zaman: new Date().toISOString(), dil, kosul, baslik: m.baslik, metin: m.metin, sekme: b.sekme || null, id: j.name });
}

if (kayit.length) {
  const yol = join(homedir(), "dev", "vault", "metrikler", "veri", "wc-bildirimler.json");
  let eski = [];
  try { eski = JSON.parse(readFileSync(yol, "utf8")); } catch { }
  writeFileSync(yol, JSON.stringify(eski.concat(kayit), null, 2));
  console.log(`${kayit.length} gönderim kaydedildi; panele yansıması için: node scripts/lab/walletcoach.mjs`);
}
