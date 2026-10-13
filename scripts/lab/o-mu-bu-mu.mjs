/* O mu Bu mu? yönetim paneli verisi → thisone-ba533 Firestore panel/ga4 ve panel/sales.
 *
 *   node scripts/lab/o-mu-bu-mu.mjs [--days 90] [--ham]
 *
 * panel/ga4   Firebase Analytics (GA4, mülk 536872002) özeti: günlük aktif/yeni
 *             (platforma göre), olaylar (tournament_finish, dilemma_answer,
 *             friend_share, paywall_view, purchase_done, ad_shown ...), ekranlar,
 *             sürüm, ülke, dil, kaynak, cihaz, işletim sistemi, saat, kohort.
 *             bam-sports.mjs ile aynı biçim: { json: "<paket>", uretim }.
 * panel/sales Mağaza parası: vault/metrikler/veri/ios-*.json (App Store Connect)
 *             + android-kova.json (Play), son 90 gün; Play yorumları da burada.
 *             panel-yaz.mjs'in biçimi + yorumlar + ürün fiyat tablosu.
 *
 * Kimlik: GA4 için gplay servis hesabı (GA4 Viewer), Firestore yazımı için
 * Firebase CLI oturumu (kurallar dışı; panel/ yalnız yöneticiye okunur).
 * --ham: paketleri /tmp/omb-panel-*.json olarak da yazar.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { rs256Anahtar, jwtUret } from "./uzak/jwt.mjs";

const PID = "536872002";           // thisone-ba533 (ga4.mjs PROPERTIES)
const PROJE = "thisone-ba533";
const SLUG = "o-mu-bu-mu";         // apps.mjs
const args = process.argv.slice(2);
const GUN = Number(args[args.indexOf("--days") + 1]) || 90;
const VERI = join(homedir(), "dev", "vault", "metrikler", "veri");

/* Mağaza liste fiyatları (ASC). Satış raporu tutarı yoksa panel bunu
   "tahmini" diye kullanır. */
const URUNLER = {
  pro: { urun: "com.berkalparslan.thisOne.pro", ad: "Pro", fiyat: 4.99, para: "USD" },
  noads: { urun: "com.berkalparslan.thisOne.removeads", ad: "Reklamsız", fiyat: 1.99, para: "USD" },
};

// ── GA4 ─────────────────────────────────────────────────────────────────────
async function gaToken() {
  const cfg = JSON.parse(readFileSync(join(homedir(), ".gplay", "config.json"), "utf8"));
  const profil = cfg.profiles.find(p => p.name === (cfg.default_profile || "default")) || cfg.profiles[0];
  const sa = JSON.parse(readFileSync(profil.key_path, "utf8"));
  const simdi = Math.floor(Date.now() / 1000);
  const jwt = await jwtUret({ alg: "RS256", typ: "JWT" },
    { iss: sa.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token", iat: simdi, exp: simdi + 3600 },
    await rs256Anahtar(sa.private_key), "RS256");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`ga token: ${j.error_description || j.error}`);
  return j.access_token;
}

async function ga4Paket() {
  const TOKEN = await gaToken();
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
  const pl = p => /ios/i.test(p) ? "ios" : /android/i.test(p) ? "android" : (p || "?").toLowerCase();

  const gunluk = (await rapor({ dateRanges: aralik, dimensions: d("date", "platform"),
    metrics: m("activeUsers", "newUsers", "sessions", "userEngagementDuration", "screenPageViews") }))
    .map(r => ({ t: tarih(r.date), a: pl(r.platform), au: r.activeUsers, nu: r.newUsers, os: r.sessions,
      sure: r.userEngagementDuration, ekran: r.screenPageViews }))
    .sort((a, b) => a.t.localeCompare(b.t));
  const olaylar = (await rapor({ dateRanges: aralik, dimensions: d("date", "eventName", "platform"),
    metrics: m("eventCount", "totalUsers") }))
    .map(r => ({ t: tarih(r.date), o: r.eventName, a: pl(r.platform), n: r.eventCount, k: r.totalUsers }));
  const olayKisi = Object.fromEntries((await rapor({ dateRanges: aralik, dimensions: d("eventName"),
    metrics: m("totalUsers", "eventCount") })).map(r => [r.eventName, { k: r.totalUsers, n: r.eventCount }]));
  const platformlar = (await rapor({ dateRanges: aralik, dimensions: d("platform"),
    metrics: m("totalUsers", "newUsers", "activeUsers", "sessions", "engagedSessions", "userEngagementDuration") }))
    .map(r => ({ a: pl(r.platform), ...r }));
  const ekranlar = (await rapor({ dateRanges: aralik, dimensions: d("unifiedScreenName", "platform"),
    metrics: m("screenPageViews", "userEngagementDuration", "activeUsers") }))
    .map(r => ({ ad: r.unifiedScreenName, a: pl(r.platform), g: r.screenPageViews, sure: r.userEngagementDuration, k: r.activeUsers }));
  const toplam = (await rapor({ dateRanges: aralik, metrics: m("totalUsers", "newUsers", "activeUsers",
    "sessions", "userEngagementDuration", "engagedSessions") }))[0] || {};
  const aktif = {};
  for (const [ad, gun] of [["dau", 1], ["wau", 7], ["mau", 28]]) {
    aktif[ad] = (await rapor({ dateRanges: [{ startDate: `${gun}daysAgo`, endDate: "today" }], metrics: m("activeUsers") }))[0]?.activeUsers || 0;
  }
  const surumler = (await rapor({ dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
    dimensions: d("platform", "appVersion"), metrics: m("activeUsers") }))
    .map(r => ({ a: pl(r.platform), appVersion: r.appVersion, activeUsers: r.activeUsers }));
  const ulkeler = await rapor({ dateRanges: aralik, dimensions: d("countryId"), metrics: m("totalUsers") });
  const diller = await rapor({ dateRanges: aralik, dimensions: d("language"), metrics: m("totalUsers") });
  const kaynaklar = await rapor({ dateRanges: aralik, dimensions: d("firstUserSource", "firstUserMedium"), metrics: m("totalUsers") });
  const cihazlar = await rapor({ dateRanges: aralik, dimensions: d("mobileDeviceModel"), metrics: m("totalUsers") });
  const isletim = await rapor({ dateRanges: aralik, dimensions: d("operatingSystemVersion"), metrics: m("totalUsers") });
  const saatler = await rapor({ dateRanges: aralik, dimensions: d("hour"), metrics: m("activeUsers", "sessions") });
  const kohort = await rapor({ dateRanges: aralik, dimensions: d("firstSessionDate", "date"), metrics: m("activeUsers") }).catch(() => []);
  return { uretim: new Date().toISOString(), gun: GUN, toplam, aktif, gunluk, olaylar, olayKisi, platformlar,
    ekranlar, surumler, ulkeler: ulkeler.map(r => ({ ulke: r.countryId, k: r.totalUsers })), diller, kaynaklar, cihazlar, isletim, saatler,
    kohort: kohort.map(r => ({ ilk: tarih(r.firstSessionDate), t: tarih(r.date), k: r.activeUsers })) };
}

// ── Mağaza ──────────────────────────────────────────────────────────────────
function satisPaketi() {
  const sinir = new Date(Date.now() - GUN * 864e5).toISOString().slice(0, 10);
  const ios = existsSync(VERI) ? readdirSync(VERI)
    .filter(f => /^ios-\d{4}-\d{2}-\d{2}\.json$/.test(f) && f.slice(4, 14) >= sinir).sort()
    .map(f => ({ tarih: f.slice(4, 14), ...JSON.parse(readFileSync(join(VERI, f), "utf8")) })) : [];
  const kova = existsSync(join(VERI, "android-kova.json")) ? JSON.parse(readFileSync(join(VERI, "android-kova.json"), "utf8")) : { gunluk: {} };
  // android-kova.json gunluk'u { gun: { slug: {...} } } biçiminde.
  const gunler = [...new Set([...ios.map(g => g.tarih), ...Object.keys(kova.gunluk || {}).filter(t => t >= sinir)])].sort();
  const satirlar = [];
  for (const t of gunler) {
    const a = ios.find(g => g.tarih === t)?.apps?.[SLUG];
    const p = kova.gunluk?.[t]?.[SLUG];
    if (!a && !p) continue;
    satirlar.push({
      tarih: t,
      indirme: (a?.indirme || 0) + (p?.indirme || 0),
      iosIndirme: a?.indirme || 0, androidIndirme: p?.indirme || 0,
      guncelleme: (a?.guncelleme || 0) + (p?.guncelleme || 0),
      kaldirma: p?.kaldirma || 0, androidAktif: p?.aktif || 0,
      iap: (a?.iap || 0) + (p?.iap || 0),
      gelir: a?.gelir || {},
      ulkeler: { ...(a?.ulkeler || {}) },
    });
  }
  const paralar = {}, ulkeler = {};
  for (const s of satirlar) {
    for (const [k, v] of Object.entries(s.gelir)) paralar[k] = (paralar[k] || 0) + Number(v);
    for (const [u, n] of Object.entries(s.ulkeler)) ulkeler[u] = (ulkeler[u] || 0) + n;
  }
  const yorum = kova.yorumlar?.[SLUG] || null;
  const topla = k => satirlar.reduce((x, s) => x + (s[k] || 0), 0);
  return {
    uretim: new Date().toISOString(), gun: satirlar.length,
    indirme: topla("indirme"), iosIndirme: topla("iosIndirme"), androidIndirme: topla("androidIndirme"),
    guncelleme: topla("guncelleme"), kaldirma: topla("kaldirma"), iap: topla("iap"),
    gelir: paralar, ulkeler, gunluk: satirlar.slice(-90),
    urunler: URUNLER,
    yorumlar: yorum ? { adet: yorum.adet || 0, ortalama: yorum.ortalama ?? null, cevapsiz: yorum.cevapsiz || 0,
      liste: (yorum.liste || []).slice(0, 50) } : null,
    puan: kova.puan?.[SLUG] || null,
  };
}

// ── Firestore ───────────────────────────────────────────────────────────────
function alan(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(alan) } };
  if (typeof v === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, alan(x)])) } };
  return { stringValue: String(v) };
}
async function fbToken() {
  const api = await import("/opt/homebrew/lib/node_modules/firebase-tools/lib/api.js");
  const c = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: c.tokens.refresh_token,
      client_id: api.clientId(), client_secret: api.clientSecret() }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`firebase token: ${j.error_description || j.error}`);
  return j.access_token;
}
async function yaz(t, belge, alanlar) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJE}/databases/(default)/documents/panel/${belge}`, {
    method: "PATCH", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: alanlar }) });
  if (!r.ok) throw new Error(`panel/${belge} ${r.status} ${(await r.text()).slice(0, 200)}`);
}

const satis = satisPaketi();
let ga = null;
try { ga = await ga4Paket(); } catch (e) { console.log(`  o-mu-bu-mu ga4 ✗ ${e.message}`); }
if (args.includes("--ham")) {
  writeFileSync("/tmp/omb-panel-sales.json", JSON.stringify(satis, null, 2));
  if (ga) writeFileSync("/tmp/omb-panel-ga4.json", JSON.stringify(ga, null, 2));
}
if (!args.includes("--kuru")) {
  const t = await fbToken();
  await yaz(t, "sales", Object.fromEntries(Object.entries(satis).map(([k, v]) => [k, alan(v)])));
  if (ga) await yaz(t, "ga4", { json: { stringValue: JSON.stringify(ga) }, uretim: { timestampValue: ga.uretim } });
}
console.log(`o-mu-bu-mu: ${satis.gun} gün mağaza · ${satis.indirme} indirme · ${satis.iap} iap` +
  (ga ? ` · GA4 ${ga.toplam.totalUsers ?? 0} kullanıcı, ${ga.olaylar.length} olay satırı, ${Math.round(JSON.stringify(ga).length / 1024)} KB` : "") +
  (args.includes("--kuru") ? " (kuru, yazılmadı)" : " → Firestore panel/sales, panel/ga4"));
