#!/usr/bin/env node
/**
 * Sabah raporunun kısa özetini Panel iOS uygulamasına push olarak gönderir.
 *
 *   node scripts/lab/rapor-gonder.mjs           bugünkü raporu gönderir (günde bir kez)
 *   node scripts/lab/rapor-gonder.mjs --kuru    jetonları ve yükü yazdırır, göndermez
 *   node scripts/lab/rapor-gonder.mjs --test    son raporu "Test" başlığıyla hemen gönderir
 *   node scripts/lab/rapor-gonder.mjs --zorla   bugün gönderildiyse de yeniden gönderir
 *
 * Jetonlar site Worker'ında (GET https://bamstudio.dev/api/panel-device,
 * x-live-key = Keychain bamtech-lab-live). Uygulama açılışta kendi jetonunu
 * POST eder. APNs: Berk takımının tek .p8 anahtarı (~/dev/p8, Key 2972UYSCQ2),
 * ES256 JWT, HTTP/2. Geliştirme imzalı kurulum sandbox'a, dağıtım imzalı
 * production'a gider. 410 / BadDeviceToken / Unregistered dönen jeton Worker'dan
 * silinir. Yükte `rapor: "YYYY-MM-DD"`: dokununca uygulama o raporu açar.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createSign } from "node:crypto";
import http2 from "node:http2";

import { raporlariOku, RAPOR_DIZIN } from "./ham.mjs";

const args = process.argv.slice(2);
const KURU = args.includes("--kuru"), TEST = args.includes("--test"), ZORLA = args.includes("--zorla");
const UC = "https://bamstudio.dev/api/panel-device";
const TOPIC = "dev.bamstudio.panel";
const TEAM = "949JRVJB94", KEY_ID = "2972UYSCQ2";
const P8 = join(homedir(), "dev", "p8", `AuthKey_${KEY_ID}.p8`);
const HOST = { development: "https://api.sandbox.push.apple.com", production: "https://api.push.apple.com" };
const GONDERILDI = join(RAPOR_DIZIN, ".gonderildi.json");

const bugun = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });

function anahtar() {
  if (process.env.LAB_LIVE_KEY) return process.env.LAB_LIVE_KEY;
  try { return execFileSync("security", ["find-generic-password", "-s", "bamtech-lab-live", "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
}

function jwt() {
  const b64u = o => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
  const govde = `${b64u({ alg: "ES256", kid: KEY_ID })}.${b64u({ iss: TEAM, iat: Math.floor(Date.now() / 1000) })}`;
  const imza = createSign("SHA256").update(govde).sign({ key: readFileSync(P8, "utf8"), dsaEncoding: "ieee-p1363" });
  return `${govde}.${imza.toString("base64url")}`;
}

function apnsGonder(oturum, token, yuk, tok) {
  return new Promise(res => {
    const r = oturum.request({
      ":method": "POST", ":path": `/3/device/${token}`,
      authorization: `bearer ${tok}`, "apns-topic": TOPIC, "apns-push-type": "alert", "apns-priority": "10",
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 12 * 3600), "apns-collapse-id": `rapor-${yuk.rapor}`,
      "content-type": "application/json"
    });
    let durum = 0, govde = "";
    r.on("response", h => { durum = h[":status"]; });
    r.on("data", d => { govde += d; });
    r.on("end", () => { let neden = null; try { neden = JSON.parse(govde || "{}").reason || null; } catch { } res({ durum, neden }); });
    r.on("error", e => res({ durum: 0, neden: e.message }));
    r.end(JSON.stringify(yuk));
  });
}

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
const K = anahtar();
if (!K) { console.error("LIVE anahtarı yok (Keychain: bamtech-lab-live)"); process.exit(1); }
const jr = await fetch(UC, { headers: { "x-live-key": K } });
if (!jr.ok) { console.error(`jeton listesi alınamadı: HTTP ${jr.status}`); process.exit(1); }
const cihazlar = (await jr.json()).devices || [];

if (KURU) {
  console.log(`[kuru] ${cihazlar.length} cihaz: ${cihazlar.map(c => `${c.token.slice(0, 8)}… (${c.env})`).join(", ") || "yok"}`);
  console.log(`[kuru] başlık (${yuk.aps.alert.title.length}): ${yuk.aps.alert.title}`);
  console.log(`[kuru] gövde (${yuk.aps.alert.body.length}): ${yuk.aps.alert.body}`);
  console.log(`[kuru] yük: ${JSON.stringify(yuk)}`);
  process.exit(0);
}
if (!cihazlar.length) { console.log("kayıtlı cihaz yok: Panel uygulamasını aç, bildirim iznine İzin ver"); process.exit(0); }
if (!existsSync(P8)) { console.error(`APNs anahtarı yok: ${P8}`); process.exit(1); }

const tok = jwt();
const oturumlar = {};
let basarili = 0;
for (const c of cihazlar) {
  const host = HOST[c.env] || HOST.production;
  const o = oturumlar[host] ||= http2.connect(host);
  const { durum, neden } = await apnsGonder(o, c.token, yuk, tok);
  if (durum === 200) { basarili++; console.log(`  ✓ ${c.token.slice(0, 8)}… (${c.env})`); continue; }
  console.log(`  ✗ ${c.token.slice(0, 8)}… (${c.env}) HTTP ${durum} ${neden || ""}`);
  if (durum === 410 || ["BadDeviceToken", "Unregistered", "DeviceTokenNotForTopic"].includes(neden)) {
    const d = await fetch(`${UC}?token=${c.token}`, { method: "DELETE", headers: { "x-live-key": K } });
    console.log(`    ölü jeton silindi (${d.status})`);
  }
}
for (const o of Object.values(oturumlar)) o.close();
console.log(`rapor bildirimi: ${basarili}/${cihazlar.length} cihaz · ${yuk.aps.alert.body}`);
if (basarili && !TEST) { gonderildi[rapor.tarih] = new Date().toISOString(); writeFileSync(GONDERILDI, JSON.stringify(Object.fromEntries(Object.entries(gonderildi).sort().slice(-60)), null, 1) + "\n"); }
