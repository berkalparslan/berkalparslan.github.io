/* Wallet Coach yönetim paneli verisi: Firebase Analytics (GA4) → şifreli paket.
 *
 *   node scripts/lab/walletcoach.mjs [--days 90]
 *
 * Uygulamanın sunucusu yok, kullanıcı verisi telefonda; panelin gördüğü tek
 * şey Analytics olayları. Tutar, ad, metin hiçbir olayda yok (Telemetry.swift).
 * Kimlik ve parola panel ile aynı: gplay servis hesabı (GA4 Viewer) ve
 * Keychain'deki bamtech-lab-panel. Çıktı: lab/wallet-coach/data.enc.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { rs256Anahtar, jwtUret } from "./uzak/jwt.mjs";

const PID = "548857497";          // wallet-coach-87336
const KOK = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const GUN = Number(args[args.indexOf("--days") + 1]) || 90;

const cfg = JSON.parse(readFileSync(join(homedir(), ".gplay", "config.json"), "utf8"));
const profil = cfg.profiles.find(p => p.name === (cfg.default_profile || "default")) || cfg.profiles[0];
const sa = JSON.parse(readFileSync(profil.key_path, "utf8"));

async function token() {
  const simdi = Math.floor(Date.now() / 1000);
  const jwt = await jwtUret({ alg: "RS256", typ: "JWT" },
    { iss: sa.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token", iat: simdi, exp: simdi + 3600 },
    await rs256Anahtar(sa.private_key), "RS256");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`token: ${j.error_description || j.error}`);
  return j.access_token;
}
const TOKEN = await token();

async function rapor(body) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PID}:runReport`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ limit: 100000, ...body }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${j.error?.message || ""}`);
  const dk = (j.dimensionHeaders || []).map(d => d.name), mk = (j.metricHeaders || []).map(m => m.name);
  return (j.rows || []).map(row => {
    const o = {};
    (row.dimensionValues || []).forEach((v, i) => o[dk[i]] = v.value);
    (row.metricValues || []).forEach((v, i) => o[mk[i]] = Number(v.value));
    return o;
  });
}

const aralik = [{ startDate: `${GUN}daysAgo`, endDate: "today" }];
const tarih = d => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
const m = (...adlar) => adlar.map(name => ({ name }));
const d = m;

/* Günlük: aktif, yeni, oturum, etkileşim süresi; platforma göre. */
const gunluk = (await rapor({ dateRanges: aralik, dimensions: d("date", "platform"),
  metrics: m("activeUsers", "newUsers", "sessions", "userEngagementDuration", "screenPageViews") }))
  .map(r => ({ t: tarih(r.date), p: r.platform.toLowerCase(), au: r.activeUsers, nu: r.newUsers,
    os: r.sessions, sure: r.userEngagementDuration, ekran: r.screenPageViews }))
  .sort((a, b) => a.t.localeCompare(b.t));

/* Olaylar: günlük sayı ve tekil kullanıcı. value = ai_* olaylarında token. */
const olaylar = (await rapor({ dateRanges: aralik, dimensions: d("date", "eventName", "platform"),
  metrics: m("eventCount", "totalUsers", "eventValue") }))
  .map(r => ({ t: tarih(r.date), o: r.eventName, p: r.platform.toLowerCase(), n: r.eventCount,
    k: r.totalUsers, v: r.eventValue }));

/* Dönem boyunca olay başına tekil kullanıcı (günlükler toplanamaz). */
const olayKisi = Object.fromEntries((await rapor({ dateRanges: aralik, dimensions: d("eventName"),
  metrics: m("totalUsers", "eventCount") })).map(r => [r.eventName, { k: r.totalUsers, n: r.eventCount }]));

/* Ekranlar: nerede ne kadar vakit. */
const ekranlar = (await rapor({ dateRanges: aralik, dimensions: d("unifiedScreenName", "platform"),
  metrics: m("screenPageViews", "userEngagementDuration", "activeUsers") }))
  .map(r => ({ ad: r.unifiedScreenName, p: r.platform.toLowerCase(), g: r.screenPageViews,
    sure: r.userEngagementDuration, k: r.activeUsers }));

/* Toplamlar, sürüm, ülke, dil. */
const toplam = (await rapor({ dateRanges: aralik, metrics: m("totalUsers", "newUsers", "activeUsers",
  "sessions", "userEngagementDuration", "engagedSessions") }))[0] || {};
const aktif = {};
for (const [ad, gun] of [["dau", 1], ["wau", 7], ["mau", 28]]) {
  aktif[ad] = (await rapor({ dateRanges: [{ startDate: `${gun}daysAgo`, endDate: "today" }],
    metrics: m("activeUsers") }))[0]?.activeUsers || 0;
}
const surumler = await rapor({ dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
  dimensions: d("platform", "appVersion"), metrics: m("activeUsers") });
const ulkeler = await rapor({ dateRanges: aralik, dimensions: d("country"), metrics: m("totalUsers") });
const diller = await rapor({ dateRanges: aralik, dimensions: d("language"), metrics: m("totalUsers") });

/* Platform karşılaştırması: dönemin tamamı. */
const platformlar = await rapor({ dateRanges: aralik, dimensions: d("platform"),
  metrics: m("totalUsers", "newUsers", "activeUsers", "sessions", "engagedSessions", "userEngagementDuration") });
const olayPlatform = await rapor({ dateRanges: aralik, dimensions: d("eventName", "platform"),
  metrics: m("totalUsers", "eventCount") });
/* Nereden geldiler: ilk kurulum kaynağı (Play yönlendiricisi, App Store). */
const kaynaklar = await rapor({ dateRanges: aralik, dimensions: d("platform", "firstUserSource", "firstUserMedium"),
  metrics: m("totalUsers") });
const cihazlar = await rapor({ dateRanges: aralik, dimensions: d("platform", "mobileDeviceModel"), metrics: m("totalUsers") });
const isletim = await rapor({ dateRanges: aralik, dimensions: d("platform", "operatingSystemVersion"), metrics: m("totalUsers") });
/* Saat dağılımı: ne zaman açıyorlar. */
const saatler = await rapor({ dateRanges: aralik, dimensions: d("hour"), metrics: m("activeUsers", "sessions") });

/* Geri gelme: ilk açılış haftasına göre kaç kişi sonraki haftalarda döndü. */
const kohort = await rapor({ dateRanges: aralik, dimensions: d("firstSessionDate", "date"),
  metrics: m("activeUsers") }).catch(() => []);

/* Gemini, Google tarafından: günlük istek, yanıt koduna ve anahtara göre.
   Firebase CLI'ın oturumuyla (cloud-platform kapsamı); yoksa atlanır. */
async function gemini() {
  try {
    const api = await import("/opt/homebrew/lib/node_modules/firebase-tools/lib/api.js");
    const c = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
    const t = await (await fetch("https://oauth2.googleapis.com/token", { method: "POST",
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: c.tokens.refresh_token,
        client_id: api.clientId(), client_secret: api.clientSecret() }) })).json();
    const proje = "wallet-coach-87336";
    const anahtarlar = Object.fromEntries(((await (await fetch(
      `https://apikeys.googleapis.com/v2/projects/${proje}/locations/global/keys`,
      { headers: { Authorization: `Bearer ${t.access_token}` } })).json()).keys || [])
      .map(k => [k.uid, k.displayName]));
    const u = new URL(`https://monitoring.googleapis.com/v3/projects/${proje}/timeSeries`);
    u.searchParams.set("filter", 'metric.type="serviceruntime.googleapis.com/api/request_count" AND resource.labels.service="generativelanguage.googleapis.com"');
    u.searchParams.set("interval.startTime", new Date(Date.now() - GUN * 864e5).toISOString());
    u.searchParams.set("interval.endTime", new Date().toISOString());
    u.searchParams.set("aggregation.alignmentPeriod", "86400s");
    u.searchParams.set("aggregation.perSeriesAligner", "ALIGN_SUM");
    u.searchParams.set("aggregation.crossSeriesReducer", "REDUCE_SUM");
    u.searchParams.append("aggregation.groupByFields", "metric.labels.response_code");
    u.searchParams.append("aggregation.groupByFields", "resource.labels.credential_id");
    const j = await (await fetch(u, { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
    if (j.error) throw new Error(j.error.message);
    const satir = [];
    for (const s of j.timeSeries || []) {
      const kimlik = (s.resource.labels.credential_id || "").replace(/^apikey:/, "");
      for (const p of s.points) satir.push({ t: p.interval.endTime.slice(0, 10), kod: s.metric.labels.response_code,
        anahtar: anahtarlar[kimlik] || kimlik || "?", n: Number(p.value.int64Value || 0) });
    }
    return { satir, faturalandirma: false };
  } catch (e) { console.log(`  gemini atlandı: ${e.message}`); return null; }
}

const paket = { uretim: new Date().toISOString(), gun: GUN, toplam, aktif, gunluk, olaylar, olayKisi,
  ekranlar, surumler, ulkeler, diller, platformlar, olayPlatform, kaynaklar, cihazlar, isletim, saatler, gemini: await gemini(),
  bildirimler: (() => { try { return JSON.parse(readFileSync(join(homedir(), "dev", "vault", "metrikler", "veri", "wc-bildirimler.json"), "utf8")); } catch { return []; } })(),
  kohort: kohort.map(r => ({ ilk: tarih(r.firstSessionDate), t: tarih(r.date), k: r.activeUsers })) };

/* Firestore'a: panel/ga4 belgesi, yalnız panelin yöneticisi okur (kurallar).
   Firebase CLI oturumunun sahibi olarak yazılır, kurallar sahibe uygulanmaz. */
async function firestoreYaz() {
  const api = await import("/opt/homebrew/lib/node_modules/firebase-tools/lib/api.js");
  const c = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const t = await (await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: c.tokens.refresh_token,
      client_id: api.clientId(), client_secret: api.clientSecret() }) })).json();
  const url = "https://firestore.googleapis.com/v1/projects/wallet-coach-87336/databases/(default)/documents/panel/ga4";
  const r = await fetch(url, { method: "PATCH", headers: { Authorization: `Bearer ${t.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(paket) }, uretim: { timestampValue: paket.uretim } } }) });
  if (!r.ok) throw new Error(`firestore ${r.status} ${(await r.text()).slice(0, 200)}`);
}

if (args.includes("--ham")) writeFileSync("/tmp/wc-panel.json", JSON.stringify(paket, null, 2));
await firestoreYaz();
console.log(`wallet-coach: ${toplam.totalUsers ?? 0} kullanıcı · ${olaylar.length} olay satırı · ${ekranlar.length} ekran · ${Math.round(JSON.stringify(paket).length / 1024)} KB → Firestore panel/ga4`);
