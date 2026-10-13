/* Daily Whisper yönetim paneli için Mac tarafı özet: yapay zekâ ve Analytics.
 *
 *   node scripts/lab/daily-whisper.mjs [--days 90] [--ham] [--kuru]
 *   (--ham: /tmp/dw-panel.json, --kuru: Firestore'a yazmaz)
 *
 * Panelin kendi başına göremediği üç kaynak:
 *  1. Bam AI proxy (ai.bamstudio.dev, D1 `usage`): gün gün Daily Whisper'ın
 *     geçirdiği çağrı, çağrı yapan cihaz sayısı, cihaz başına en çok çağrı ve
 *     sınıra takılan (429) tahmini. Metin, istem, cihaz kimliği yazılmaz; yalnız sayı.
 *  2. Google Cloud Monitoring (kit-app-a91b5): Gemini API'nin gün gün istek
 *     sayısı yanıt koduna ve anahtara göre (200, 429, 400, 500...).
 *  3. GA4 (mülk 358139846, Android'de Firebase Analytics): günlük aktif/yeni,
 *     olaylar, ekranlar, sürüm, ülke, dil, cihaz, saat.
 *
 * Çıktı: Firestore `panel/ai` ve `panel/ga4` belgeleri (alan `json`, metin).
 * Kurallar o belgeleri yalnız yöneticiye okutur, kimseye yazdırmaz; buradaki
 * yazma Firebase CLI oturumunun kimliğiyle, kurallar ona uygulanmaz.
 * Kimlikler Mac'te: Firebase CLI oturumu, wrangler oturumu (D1), gplay servis
 * hesabı (GA4 Viewer). Bir kaynak gelmezse atlanır, ötekiler yine yazılır.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { rs256Anahtar, jwtUret } from "./uzak/jwt.mjs";

const PROJE = "kit-app-a91b5";
const GA4 = "358139846";
const APP = "dailywhisper";              // ai-proxy APPS anahtarı
const PROXY_DIR = join(homedir(), "dev", "ai-proxy");
const args = process.argv.slice(2);
const GUN = Number(args[args.indexOf("--days") + 1]) || 90;
const log = m => console.log(m);

async function firebaseToken() {
  const api = await import("/opt/homebrew/lib/node_modules/firebase-tools/lib/api.js");
  const c = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: c.tokens.refresh_token,
      client_id: api.clientId(), client_secret: api.clientSecret() }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`firebase token: ${j.error_description || j.error}`);
  return j.access_token;
}

// ── 1. Bam AI proxy, D1 ─────────────────────────────────────────────────────
function proxy() {
  try {
    const sinir = new Date(Date.now() - GUN * 864e5).toISOString().slice(0, 10);
    const sql = `SELECT day, CASE WHEN scope LIKE 'dev:${APP}:%' THEN 'dev' ELSE scope END AS s,
      COUNT(*) AS cihaz, SUM(n) AS n, MAX(n) AS mx FROM usage
      WHERE day >= '${sinir}' AND (scope = 'global' OR scope = 'app:${APP}' OR scope LIKE 'dev:${APP}:%')
      GROUP BY day, s ORDER BY day`;
    const cikti = execFileSync("npx", ["wrangler", "d1", "execute", "bam-ai-proxy", "--remote", "--json", "--command", sql],
      { cwd: PROXY_DIR, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120e3 });
    const satirlar = JSON.parse(cikti.slice(cikti.indexOf("[")))[0]?.results || [];
    const toml = readFileSync(join(PROXY_DIR, "wrangler.toml"), "utf8");
    const sayiAl = ad => Number((toml.match(new RegExp(`${ad}\\s*=\\s*"(\\d+)"`)) || [])[1]) || null;
    const sinirlar = { app: sayiAl("LIMIT_APP_DAILYWHISPER"), cihaz: sayiAl("LIMIT_DEVICE_DAILYWHISPER"), genel: sayiAl("LIMIT_GLOBAL") };
    const gunler = {};
    for (const r of satirlar) {
      const g = gunler[r.day] ||= { t: r.day, cagri: 0, cihaz: 0, enCok: 0, genel: 0 };
      if (r.s === "app:" + APP) g.cagri = r.n;
      else if (r.s === "dev") { g.cihaz = r.cihaz; g.enCok = r.mx; }
      else if (r.s === "global") g.genel = r.n;
    }
    // Sayaç sınırdan önce artıyor: sınırı aşan her çağrı 429 aldı.
    for (const g of Object.values(gunler)) g.sinirda = Math.max(0, g.cagri - (sinirlar.app || Infinity));
    return { gunluk: Object.values(gunler).sort((a, b) => a.t.localeCompare(b.t)), sinirlar };
  } catch (e) { log(`  proxy atlandı: ${String(e.message || e).split("\n")[0]}`); return null; }
}

// ── 2. Gemini, Cloud Monitoring ─────────────────────────────────────────────
async function gemini(t) {
  try {
    const anahtarlar = Object.fromEntries(((await (await fetch(
      `https://apikeys.googleapis.com/v2/projects/${PROJE}/locations/global/keys`,
      { headers: { Authorization: `Bearer ${t}` } })).json()).keys || []).map(k => [k.uid, k.displayName]));
    const u = new URL(`https://monitoring.googleapis.com/v3/projects/${PROJE}/timeSeries`);
    u.searchParams.set("filter", 'metric.type="serviceruntime.googleapis.com/api/request_count" AND resource.labels.service="generativelanguage.googleapis.com"');
    u.searchParams.set("interval.startTime", new Date(Date.now() - GUN * 864e5).toISOString());
    u.searchParams.set("interval.endTime", new Date().toISOString());
    u.searchParams.set("aggregation.alignmentPeriod", "86400s");
    u.searchParams.set("aggregation.perSeriesAligner", "ALIGN_SUM");
    u.searchParams.set("aggregation.crossSeriesReducer", "REDUCE_SUM");
    u.searchParams.append("aggregation.groupByFields", "metric.labels.response_code");
    u.searchParams.append("aggregation.groupByFields", "resource.labels.credential_id");
    u.searchParams.append("aggregation.groupByFields", "resource.labels.method");
    const j = await (await fetch(u, { headers: { Authorization: `Bearer ${t}` } })).json();
    if (j.error) throw new Error(j.error.message);
    const satir = [];
    for (const s of j.timeSeries || []) {
      const kimlik = (s.resource.labels.credential_id || "").replace(/^apikey:/, "");
      const yontem = String(s.resource.labels.method || "").split(".").pop();
      for (const p of s.points) satir.push({ t: p.interval.endTime.slice(0, 10), kod: s.metric.labels.response_code,
        anahtar: anahtarlar[kimlik] || (kimlik ? "anahtar " + kimlik.slice(0, 6) : "?"), yontem, n: Number(p.value.int64Value || 0) });
    }
    return { satir };
  } catch (e) { log(`  gemini atlandı: ${e.message}`); return null; }
}

// ── 3. GA4 ──────────────────────────────────────────────────────────────────
async function ga4() {
  try {
    const cfg = JSON.parse(readFileSync(join(homedir(), ".gplay", "config.json"), "utf8"));
    const profil = cfg.profiles.find(p => p.name === (cfg.default_profile || "default")) || cfg.profiles[0];
    const sa = JSON.parse(readFileSync(profil.key_path, "utf8"));
    const simdi = Math.floor(Date.now() / 1000);
    const jwt = await jwtUret({ alg: "RS256", typ: "JWT" },
      { iss: sa.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly",
        aud: "https://oauth2.googleapis.com/token", iat: simdi, exp: simdi + 3600 },
      await rs256Anahtar(sa.private_key), "RS256");
    const tj = await (await fetch("https://oauth2.googleapis.com/token", { method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) })).json();
    if (!tj.access_token) throw new Error(tj.error_description || tj.error);
    const rapor = async body => {
      const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4}:runReport`, {
        method: "POST", headers: { Authorization: `Bearer ${tj.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100000, ...body }) });
      const j = await r.json();
      if (!r.ok) throw new Error(`${r.status} ${j.error?.message || ""}`);
      const dk = (j.dimensionHeaders || []).map(x => x.name), mk = (j.metricHeaders || []).map(x => x.name);
      return (j.rows || []).map(row => {
        const o = {};
        (row.dimensionValues || []).forEach((v, i) => o[dk[i]] = v.value);
        (row.metricValues || []).forEach((v, i) => o[mk[i]] = Number(v.value));
        return o;
      });
    };
    const aralik = [{ startDate: `${GUN}daysAgo`, endDate: "today" }];
    const tarih = x => `${x.slice(0, 4)}-${x.slice(4, 6)}-${x.slice(6, 8)}`;
    const m = (...a) => a.map(name => ({ name })), d = m;
    const gunluk = (await rapor({ dateRanges: aralik, dimensions: d("date", "platform"),
      metrics: m("activeUsers", "newUsers", "sessions", "userEngagementDuration", "screenPageViews") }))
      .map(r => ({ t: tarih(r.date), p: r.platform.toLowerCase(), au: r.activeUsers, nu: r.newUsers, os: r.sessions, sure: r.userEngagementDuration, ekran: r.screenPageViews }))
      .sort((a, b) => a.t.localeCompare(b.t));
    const olaylar = (await rapor({ dateRanges: aralik, dimensions: d("date", "eventName", "platform"), metrics: m("eventCount", "totalUsers") }))
      .map(r => ({ t: tarih(r.date), o: r.eventName, p: r.platform.toLowerCase(), n: r.eventCount, k: r.totalUsers }));
    const ekranlar = (await rapor({ dateRanges: aralik, dimensions: d("unifiedScreenName", "platform"),
      metrics: m("screenPageViews", "userEngagementDuration", "activeUsers") }))
      .map(r => ({ ad: r.unifiedScreenName, p: r.platform.toLowerCase(), g: r.screenPageViews, sure: r.userEngagementDuration, k: r.activeUsers }));
    const toplam = (await rapor({ dateRanges: aralik, metrics: m("totalUsers", "newUsers", "activeUsers", "sessions", "userEngagementDuration", "engagedSessions") }))[0] || {};
    const aktif = {};
    for (const [ad, g] of [["dau", 1], ["wau", 7], ["mau", 28]]) aktif[ad] = (await rapor({ dateRanges: [{ startDate: `${g}daysAgo`, endDate: "today" }], metrics: m("activeUsers") }))[0]?.activeUsers || 0;
    const surumler = await rapor({ dateRanges: aralik, dimensions: d("platform", "appVersion"), metrics: m("activeUsers", "newUsers") });
    const ulkeler = await rapor({ dateRanges: aralik, dimensions: d("country", "countryId"), metrics: m("totalUsers", "newUsers") });
    const diller = await rapor({ dateRanges: aralik, dimensions: d("language"), metrics: m("totalUsers") });
    const cihazlar = await rapor({ dateRanges: aralik, dimensions: d("platform", "mobileDeviceModel"), metrics: m("totalUsers") });
    const isletim = await rapor({ dateRanges: aralik, dimensions: d("platform", "operatingSystemVersion"), metrics: m("totalUsers") });
    const saatler = await rapor({ dateRanges: aralik, dimensions: d("dayOfWeek", "hour"), metrics: m("activeUsers", "sessions") });
    const kaynaklar = await rapor({ dateRanges: aralik, dimensions: d("platform", "firstUserSource", "firstUserMedium"), metrics: m("totalUsers") });
    return { uretim: new Date().toISOString(), gun: GUN, toplam, aktif, gunluk, olaylar, ekranlar, surumler, ulkeler, diller, cihazlar, isletim, saatler, kaynaklar };
  } catch (e) { log(`  ga4 atlandı: ${e.message}`); return null; }
}

async function yaz(t, yol, paket) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJE}/databases/(default)/documents/${yol}`;
  const r = await fetch(url, { method: "PATCH", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(paket) }, uretim: { timestampValue: paket.uretim } } }) });
  if (!r.ok) throw new Error(`firestore ${yol} ${r.status} ${(await r.text()).slice(0, 200)}`);
}

const t = await firebaseToken();
const ai = { uretim: new Date().toISOString(), gun: GUN, proxy: proxy(), gemini: await gemini(t) };
const ga = await ga4();
if (args.includes("--ham")) writeFileSync("/tmp/dw-panel.json", JSON.stringify({ ai, ga }, null, 2));
if (!args.includes("--kuru")) {
  await yaz(t, "panel/ai", ai);
  if (ga) await yaz(t, "panel/ga4", ga);
}
const pc = ai.proxy?.gunluk?.reduce((a, g) => a + g.cagri, 0) ?? 0;
const gc = ai.gemini?.satir?.reduce((a, s) => a + s.n, 0) ?? 0;
log(`daily-whisper: proxy ${pc} çağrı · gemini ${gc} istek · ga4 ${ga ? (ga.toplam.totalUsers ?? 0) + " kullanıcı" : "yok"} → ${args.includes("--kuru") ? "yazılmadı (kuru)" : "Firestore panel/ai" + (ga ? ", panel/ga4" : "")}`);
