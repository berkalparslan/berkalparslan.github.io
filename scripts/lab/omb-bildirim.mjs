/* O mu Bu mu? duyuru bildirimi: FCM konularına, dile göre ayrı metin.
 *
 *   node scripts/lab/omb-bildirim.mjs --dosya bildirim.json [--test] [--dogrula|--gonder]
 *
 * --gonder olmadan yalnız ne gideceğini yazar. --test yalnız test cihazlarına
 * (omb_test) gönderir; herkese göndermeden önce bununla dene. Kişiye değil
 * konuya gider. Konular (Push.swift / Push.kt):
 *   omb_all · omb_lang_tr · omb_lang_en · omb_test
 *
 * bildirim.json:
 *   { "rota": "daily",                 // dokununca açılacak: daily | tournament:<id> | category:<ad>
 *     "metinler": { "tr": { "baslik": "...", "metin": "..." },
 *                   "en": { "baslik": "...", "metin": "..." } } }
 *
 * Kimlik: Firebase CLI oturumu (firebase login). Blaze planı gerekmez; FCM
 * gönderimi ücretsiz katmanda da çalışır, Blaze yalnız Cloud Functions için
 * gerekiyor. Gönderilenler vault'a yazılır, panel oradan okur.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const PROJE = "thisone-ba533";
const DILLER = ["tr", "en"];
const args = process.argv.slice(2);
const dosya = args[args.indexOf("--dosya") + 1];
if (!dosya || args.indexOf("--dosya") < 0) { console.error("kullanım: --dosya bildirim.json [--test] [--dogrula|--gonder]"); process.exit(1); }
const gonder = args.includes("--gonder") || args.includes("--dogrula");
const yalnizDogrula = args.includes("--dogrula");
const test = args.includes("--test");
const b = JSON.parse(readFileSync(dosya, "utf8"));

for (const [dil, m] of Object.entries(b.metinler)) {
  if (!DILLER.includes(dil)) throw new Error(`bilinmeyen dil: ${dil}`);
  for (const alan of [m.baslik, m.metin]) {
    if (!alan) throw new Error(`${dil}: başlık ve metin şart`);
    if (/[—–]/.test(alan)) throw new Error(`${dil}: uzun tire kullanma`);
    if (dil === "tr" && /â/.test(alan)) throw new Error("tr: â kullanma");
  }
  if (m.baslik.length > 50) throw new Error(`${dil}: başlık 50 karakteri geçmesin`);
  if (m.metin.length > 140) throw new Error(`${dil}: metin 140 karakteri geçmesin`);
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
  const kosul = test ? "'omb_test' in topics" : `'omb_lang_${dil}' in topics`;
  const mesaj = { message: { condition: kosul,
    notification: { title: m.baslik, body: m.metin },
    data: b.rota ? { route: b.rota } : {},
    apns: { payload: { aps: { sound: "default" } } },
    android: { notification: { channel_id: "omb_duyuru" } } } };
  if (!gonder) { console.log(`[deneme] ${kosul}\n  ${m.baslik}\n  ${m.metin}`); continue; }
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJE}/messages:send`, { method: "POST",
    headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...mesaj, validate_only: yalnizDogrula }) });
  const j = await r.json();
  if (!r.ok) { console.error(`${dil} ✗ ${j.error?.message}`); continue; }
  console.log(`${dil} ✓ ${yalnizDogrula ? "doğrulandı, gönderilmedi" : j.name}`);
  if (yalnizDogrula) continue;
  if (!test) kayit.push({ zaman: new Date().toISOString(), dil, kosul, baslik: m.baslik, metin: m.metin, rota: b.rota || null, id: j.name });
}

if (kayit.length) {
  const yol = join(homedir(), "dev", "vault", "metrikler", "veri", "omb-bildirimler.json");
  let eski = [];
  try { eski = JSON.parse(readFileSync(yol, "utf8")); } catch { }
  writeFileSync(yol, JSON.stringify(eski.concat(kayit), null, 2));
  console.log(`${kayit.length} gönderim kaydedildi: ${yol}`);
}
