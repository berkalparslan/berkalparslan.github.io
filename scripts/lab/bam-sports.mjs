/* Bam Sports yönetim paneli verisi: Firebase Analytics (GA4) özeti → Firestore panel/ga4.
 *
 *   node scripts/lab/bam-sports.mjs [--days 90] [--ham]
 *
 * Beş uygulama (Tenis, Pickleball, Voleybol, Badminton, Masa Tenisi) tek
 * Firebase projesinde (bam-tech-sports), tek GA4 mülkünde; her uygulama bir
 * "data stream". Bu yüzden günlük seriler ve olaylar streamName ile de
 * bölünür. Olaylarda isim, skor, metin yok (AnalyticsManager.swift).
 * Kimlik walletcoach.mjs ile aynı: gplay servis hesabı (GA4 Viewer) ve
 * Firebase CLI oturumu (Firestore yazımı). Çıktı: Firestore panel/ga4,
 * yalnız panelin yöneticisi okur.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { rs256Anahtar, jwtUret } from "./uzak/jwt.mjs";

const PID = "542859936";          // bam-tech-sports (ga4.mjs PROPERTIES)
const PROJE = "bam-tech-sports";
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

/* Stream adı → uygulama anahtarı (panelin uygulama filtresiyle aynı). */
function uygulama(stream = "") {
  const s = stream.toLowerCase();
  if (s.includes("pickle")) return "pickleball";
  if (s.includes("volley")) return "volleyball";
  if (s.includes("badminton")) return "badminton";
  if (s.includes("table")) return "tabletennis";
  if (s.includes("tennis") || s.includes("padel")) return "tennis";
  return "?";
}

/* Günlük: aktif, yeni, oturum, etkileşim süresi; uygulamaya (stream) göre. */
const gunluk = (await rapor({ dateRanges: aralik, dimensions: d("date", "streamName"),
  metrics: m("activeUsers", "newUsers", "sessions", "userEngagementDuration", "screenPageViews") }))
  .map(r => ({ t: tarih(r.date), a: uygulama(r.streamName), au: r.activeUsers, nu: r.newUsers,
    os: r.sessions, sure: r.userEngagementDuration, ekran: r.screenPageViews }))
  .sort((a, b) => a.t.localeCompare(b.t));

/* Olaylar: günlük sayı ve tekil kullanıcı, uygulamaya göre. */
const olaylar = (await rapor({ dateRanges: aralik, dimensions: d("date", "eventName", "streamName"),
  metrics: m("eventCount", "totalUsers") }))
  .map(r => ({ t: tarih(r.date), o: r.eventName, a: uygulama(r.streamName), n: r.eventCount, k: r.totalUsers }));

/* Dönem boyunca olay başına tekil kullanıcı (günlükler toplanamaz). */
const olayKisi = Object.fromEntries((await rapor({ dateRanges: aralik, dimensions: d("eventName"),
  metrics: m("totalUsers", "eventCount") })).map(r => [r.eventName, { k: r.totalUsers, n: r.eventCount }]));

/* Uygulama başına toplam (stream). */
const uygulamalar = (await rapor({ dateRanges: aralik, dimensions: d("streamName"),
  metrics: m("totalUsers", "newUsers", "activeUsers", "sessions", "engagedSessions", "userEngagementDuration") }))
  .map(r => ({ a: uygulama(r.streamName), ad: r.streamName, ...r }));

const ekranlar = (await rapor({ dateRanges: aralik, dimensions: d("unifiedScreenName", "streamName"),
  metrics: m("screenPageViews", "userEngagementDuration", "activeUsers") }))
  .map(r => ({ ad: r.unifiedScreenName, a: uygulama(r.streamName), g: r.screenPageViews,
    sure: r.userEngagementDuration, k: r.activeUsers }));

const toplam = (await rapor({ dateRanges: aralik, metrics: m("totalUsers", "newUsers", "activeUsers",
  "sessions", "userEngagementDuration", "engagedSessions") }))[0] || {};
const aktif = {};
for (const [ad, gun] of [["dau", 1], ["wau", 7], ["mau", 28]]) {
  aktif[ad] = (await rapor({ dateRanges: [{ startDate: `${gun}daysAgo`, endDate: "today" }],
    metrics: m("activeUsers") }))[0]?.activeUsers || 0;
}
const surumler = (await rapor({ dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
  dimensions: d("streamName", "appVersion"), metrics: m("activeUsers") }))
  .map(r => ({ a: uygulama(r.streamName), appVersion: r.appVersion, activeUsers: r.activeUsers }));
const ulkeler = await rapor({ dateRanges: aralik, dimensions: d("country"), metrics: m("totalUsers") });
const diller = await rapor({ dateRanges: aralik, dimensions: d("language"), metrics: m("totalUsers") });
const kaynaklar = await rapor({ dateRanges: aralik, dimensions: d("firstUserSource", "firstUserMedium"), metrics: m("totalUsers") });
const cihazlar = await rapor({ dateRanges: aralik, dimensions: d("mobileDeviceModel"), metrics: m("totalUsers") });
const isletim = await rapor({ dateRanges: aralik, dimensions: d("operatingSystemVersion"), metrics: m("totalUsers") });
const saatler = await rapor({ dateRanges: aralik, dimensions: d("hour"), metrics: m("activeUsers", "sessions") });
const kohort = await rapor({ dateRanges: aralik, dimensions: d("firstSessionDate", "date"),
  metrics: m("activeUsers") }).catch(() => []);

const paket = { uretim: new Date().toISOString(), gun: GUN, toplam, aktif, gunluk, olaylar, olayKisi, uygulamalar,
  ekranlar, surumler, ulkeler, diller, kaynaklar, cihazlar, isletim, saatler,
  kohort: kohort.map(r => ({ ilk: tarih(r.firstSessionDate), t: tarih(r.date), k: r.activeUsers })) };

/* Firestore'a: panel/ga4 belgesi. Firebase CLI oturumunun sahibi olarak yazılır. */
async function firestoreYaz() {
  const api = await import("/opt/homebrew/lib/node_modules/firebase-tools/lib/api.js");
  const c = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const t = await (await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: c.tokens.refresh_token,
      client_id: api.clientId(), client_secret: api.clientSecret() }) })).json();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJE}/databases/(default)/documents/panel/ga4`;
  const r = await fetch(url, { method: "PATCH", headers: { Authorization: `Bearer ${t.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(paket) }, uretim: { timestampValue: paket.uretim } } }) });
  if (!r.ok) throw new Error(`firestore ${r.status} ${(await r.text()).slice(0, 200)}`);
}

if (args.includes("--ham")) writeFileSync("/tmp/bam-sports-panel.json", JSON.stringify(paket, null, 2));
await firestoreYaz();
console.log(`bam-sports: ${toplam.totalUsers ?? 0} kullanıcı · ${uygulamalar.length} uygulama · ${olaylar.length} olay satırı · ${ekranlar.length} ekran · ${Math.round(JSON.stringify(paket).length / 1024)} KB → Firestore panel/ga4`);
