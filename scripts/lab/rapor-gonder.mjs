#!/usr/bin/env node
/**
 * Sabah raporunun kısa özetini Panel iOS uygulamasına push olarak gönderir.
 *
 *   node scripts/lab/rapor-gonder.mjs           bugünkü raporu gönderir (günde bir kez)
 *   node scripts/lab/rapor-gonder.mjs --kuru    jetonları ve yükü yazdırır, göndermez
 *   node scripts/lab/rapor-gonder.mjs --test    son raporu "Test" başlığıyla hemen gönderir
 *   node scripts/lab/rapor-gonder.mjs --zorla   bugün gönderildiyse de yeniden gönderir
 *
 * Jetonlar ve APNs gönderimi apns.mjs'te (uyari.mjs de kullanır). Yükte `rapor: "YYYY-MM-DD"`: dokununca uygulama o raporu açar.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { raporlariOku, RAPOR_DIZIN } from "./ham.mjs";
import { liveAnahtar, cihazlar as cihazListesi, apnsGonder } from "./apns.mjs";

const args = process.argv.slice(2);
const KURU = args.includes("--kuru"), TEST = args.includes("--test"), ZORLA = args.includes("--zorla");
const GONDERILDI = join(RAPOR_DIZIN, ".gonderildi.json");

const bugun = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });

/* ── rapor ── */
const rapor = raporlariOku({ adet: 1 })[0];
if (!rapor) { console.log("rapor yok (önce rapor.mjs)"); process.exit(0); }
if (!TEST && rapor.tarih !== bugun) { console.log(`bugünün raporu yok (son: ${rapor.tarih}), gönderilmedi`); process.exit(0); }
const gonderildi = existsSync(GONDERILDI) ? JSON.parse(readFileSync(GONDERILDI, "utf8")) : {};
if (!TEST && !KURU && !ZORLA && gonderildi[rapor.tarih]) { console.log(`${rapor.tarih} raporu zaten gönderildi (${gonderildi[rapor.tarih]}), --zorla ile yeniden`); process.exit(0); }

const yuk = {
  aps: { alert: { title: TEST ? `Test · ${rapor.baslik}`.slice(0, 50) : rapor.baslik, body: rapor.ozet }, sound: "default", "thread-id": "rapor" },
  rapor: rapor.tarih
};

/* ── jetonlar ── */
const K = liveAnahtar();
if (!K) { console.error("LIVE anahtarı yok (Keychain: bamtech-lab-live)"); process.exit(1); }
let cihazlar;
try { cihazlar = await cihazListesi(K); } catch (e) { console.error(e.message); process.exit(1); }

if (KURU) {
  console.log(`[kuru] ${cihazlar.length} cihaz: ${cihazlar.map(c => `${c.token.slice(0, 8)}… (${c.env})`).join(", ") || "yok"}`);
  console.log(`[kuru] başlık (${yuk.aps.alert.title.length}): ${yuk.aps.alert.title}`);
  console.log(`[kuru] gövde (${yuk.aps.alert.body.length}): ${yuk.aps.alert.body}`);
  console.log(`[kuru] yük: ${JSON.stringify(yuk)}`);
  process.exit(0);
}
if (!cihazlar.length) { console.log("kayıtlı cihaz yok: Panel uygulamasını aç, bildirim iznine İzin ver"); process.exit(0); }

let basarili = 0;
try { ({ basarili } = await apnsGonder(yuk, { collapse: `rapor-${yuk.rapor}`, K, liste: cihazlar })); }
catch (e) { console.error(e.message); process.exit(1); }
console.log(`rapor bildirimi: ${basarili}/${cihazlar.length} cihaz · ${yuk.aps.alert.body}`);
if (basarili && !TEST) { gonderildi[rapor.tarih] = new Date().toISOString(); writeFileSync(GONDERILDI, JSON.stringify(Object.fromEntries(Object.entries(gonderildi).sort().slice(-60)), null, 1) + "\n"); }
