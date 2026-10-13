/* Bam Sports yönetim paneli verisi:
 *   1. Firebase Analytics (GA4) özeti → Firestore panel/ga4
 *   2. Mağaza özeti (App Store satış raporu + Play kovası, beş uygulama) ve
 *      Pass ürünlerinin fiyat tablosu (ascelerate, haftada bir) → panel/magaza
 *      (panel/sales ayrı: panel-yaz.mjs yazar, burası ona dokunmaz)
 *
 *   node scripts/lab/bam-sports.mjs [--days 90] [--ham] [--fiyat]
 *
 * --fiyat fiyat tablosunu önbellek yeni olsa da yeniden çeker.
 *
 * Beş uygulama (Tenis, Pickleball, Voleybol, Badminton, Masa Tenisi) tek
 * Firebase projesinde (bam-tech-sports), tek GA4 mülkünde; her uygulama bir
 * "data stream". Bu yüzden günlük seriler ve olaylar streamName ile de
 * bölünür. Olaylarda isim, skor, metin yok (AnalyticsManager.swift).
 * Kimlik walletcoach.mjs ile aynı: gplay servis hesabı (GA4 Viewer) ve
 * Firebase CLI oturumu (Firestore yazımı). Çıktı: Firestore panel/ga4,
 * yalnız panelin yöneticisi okur.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
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
/* Stream adı → platform: Android akışının adında "Android" geçiyor. */
const platform = (stream = "") => /android/i.test(stream) ? "android" : "ios";
const ap = r => ({ a: uygulama(r.streamName), p: platform(r.streamName) });

/* Günlük: aktif, yeni, oturum, etkileşim süresi; uygulamaya (stream) göre. */
const gunluk = (await rapor({ dateRanges: aralik, dimensions: d("date", "streamName"),
  metrics: m("activeUsers", "newUsers", "sessions", "userEngagementDuration", "screenPageViews") }))
  .map(r => ({ t: tarih(r.date), ...ap(r), au: r.activeUsers, nu: r.newUsers,
    os: r.sessions, sure: r.userEngagementDuration, ekran: r.screenPageViews }))
  .sort((a, b) => a.t.localeCompare(b.t));

/* Olaylar: günlük sayı ve tekil kullanıcı, uygulamaya göre. */
const olaylar = (await rapor({ dateRanges: aralik, dimensions: d("date", "eventName", "streamName"),
  metrics: m("eventCount", "totalUsers") }))
  .map(r => ({ t: tarih(r.date), o: r.eventName, ...ap(r), n: r.eventCount, k: r.totalUsers }));

/* Dönem boyunca olay başına tekil kullanıcı (günlükler toplanamaz). */
const olayKisi = Object.fromEntries((await rapor({ dateRanges: aralik, dimensions: d("eventName"),
  metrics: m("totalUsers", "eventCount") })).map(r => [r.eventName, { k: r.totalUsers, n: r.eventCount }]));

/* Uygulama başına toplam (stream). */
const uygulamalar = (await rapor({ dateRanges: aralik, dimensions: d("streamName"),
  metrics: m("totalUsers", "newUsers", "activeUsers", "sessions", "engagedSessions", "userEngagementDuration") }))
  .map(r => ({ ...ap(r), ad: r.streamName, ...r }));

const ekranlar = (await rapor({ dateRanges: aralik, dimensions: d("unifiedScreenName", "streamName"),
  metrics: m("screenPageViews", "userEngagementDuration", "activeUsers") }))
  .map(r => ({ ad: r.unifiedScreenName, ...ap(r), g: r.screenPageViews,
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
  .map(r => ({ ...ap(r), appVersion: r.appVersion, activeUsers: r.activeUsers }));
/* Kırılımlar uygulamaya (stream) göre de: panelin uygulama filtresi bunlara da uygulanır.
   Satırlarda `a` (uygulama) ve `p` (platform) var; panel hepsini toplayınca eski toplamı bulur. */
const ulkeler = (await rapor({ dateRanges: aralik, dimensions: d("countryId", "country", "streamName"), metrics: m("totalUsers", "newUsers") }))
  .map(r => ({ ...ap(r), iso: r.countryId, country: r.country, totalUsers: r.totalUsers, newUsers: r.newUsers }));
const diller = (await rapor({ dateRanges: aralik, dimensions: d("language", "streamName"), metrics: m("totalUsers") }))
  .map(r => ({ ...ap(r), language: r.language, totalUsers: r.totalUsers }));
const kaynaklar = (await rapor({ dateRanges: aralik, dimensions: d("firstUserSource", "firstUserMedium", "streamName"), metrics: m("totalUsers") }))
  .map(r => ({ ...ap(r), firstUserSource: r.firstUserSource, firstUserMedium: r.firstUserMedium, totalUsers: r.totalUsers }));
const cihazlar = (await rapor({ dateRanges: aralik, dimensions: d("mobileDeviceModel", "streamName"), metrics: m("totalUsers") }))
  .map(r => ({ ...ap(r), mobileDeviceModel: r.mobileDeviceModel, totalUsers: r.totalUsers }));
const isletim = (await rapor({ dateRanges: aralik, dimensions: d("operatingSystem", "operatingSystemVersion", "streamName"), metrics: m("totalUsers") }))
  .map(r => ({ ...ap(r), operatingSystem: r.operatingSystem, operatingSystemVersion: r.operatingSystemVersion, totalUsers: r.totalUsers }));
const saatler = (await rapor({ dateRanges: aralik, dimensions: d("hour", "streamName"), metrics: m("activeUsers", "sessions") }))
  .map(r => ({ ...ap(r), hour: r.hour, activeUsers: r.activeUsers, sessions: r.sessions }));
/* Gün x saat ısı haritası için (GA4 dayOfWeek: 0 = Pazar; saat mülkün saat diliminde). */
const saatGun = (await rapor({ dateRanges: aralik, dimensions: d("dayOfWeek", "hour", "streamName"), metrics: m("sessions") }))
  .map(r => ({ ...ap(r), g: Number(r.dayOfWeek), h: Number(r.hour), os: r.sessions }));
const kohort = (await rapor({ dateRanges: aralik, dimensions: d("firstSessionDate", "date", "streamName"),
  metrics: m("activeUsers") }).catch(() => [])).map(r => ({ ...ap(r), ilk: tarih(r.firstSessionDate), t: tarih(r.date), k: r.activeUsers }));
/* Sürüm günlük: "bir sürümden sonra ne değişti" için gün gün aktif kullanıcı. */
const surumGunluk = (await rapor({ dateRanges: aralik, dimensions: d("date", "streamName", "appVersion"), metrics: m("activeUsers", "newUsers") }))
  .map(r => ({ t: tarih(r.date), ...ap(r), v: r.appVersion, au: r.activeUsers, nu: r.newUsers }));
/* Çökme: Crashlytics olmadan da GA4 app_exception'dan sayılır (crashAffectedUsers). */
const cokme = (await rapor({ dateRanges: aralik, dimensions: d("streamName", "appVersion"), metrics: m("crashAffectedUsers", "activeUsers") }).catch(() => []))
  .map(r => ({ ...ap(r), v: r.appVersion, k: r.crashAffectedUsers, au: r.activeUsers }));
/* Ekran x platform ayrımı ve olay parametresi yok: AnalyticsManager olay adlarını sabit yazıyor. */
const akislar = [...new Set(uygulamalar.map(r => r.ad))];

const paket = { uretim: new Date().toISOString(), gun: GUN, toplam, aktif, gunluk, olaylar, olayKisi, uygulamalar,
  ekranlar, surumler, ulkeler, diller, kaynaklar, cihazlar, isletim, saatler, saatGun, kohort, surumGunluk, cokme, akislar };

/* ── Mağaza özeti: scripts/lab/satis.mjs'in vault'a yazdığı günlük dosyalar ─────────
   ios-<gün>.json: App Store satış raporu (Developer Proceeds, yani Apple'ın kesintisinden
   sonra bize kalan), android-kova.json: Play kovası. Beş uygulamanın slug'ları apps.mjs'teki. */
const VERI = join(homedir(), "dev", "vault", "metrikler", "veri");
const SLUG = { "tennis-padel": "tennis", pickleball: "pickleball", volleyball: "volleyball", "rally-badminton": "badminton", "rally-table-tennis": "tabletennis" };
function satisOzeti() {
  if (!existsSync(VERI)) return null;
  const sinir = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const dosyalar = readdirSync(VERI).filter(f => /^ios-\d{4}-\d{2}-\d{2}\.json$/.test(f) && f.slice(4, 14) >= sinir).sort();
  const gunluk = [];
  let veriGun = 0;
  for (const f of dosyalar) {
    const j = JSON.parse(readFileSync(join(VERI, f), "utf8"));
    if (!j.veri) continue;
    veriGun++;
    for (const [slug, a] of Object.entries(SLUG)) {
      const x = j.apps?.[slug];
      if (!x) continue;
      gunluk.push({ t: f.slice(4, 14), a, p: "ios", indirme: x.indirme || 0, guncelleme: x.guncelleme || 0, iap: x.iap || 0,
        gelir: x.gelir || {}, ulkeler: x.ulkeler || {} });
    }
  }
  const kova = existsSync(join(VERI, "android-kova.json")) ? JSON.parse(readFileSync(join(VERI, "android-kova.json"), "utf8")) : { gunluk: {} };
  for (const [t, g] of Object.entries(kova.gunluk || {})) {
    for (const [slug, a] of Object.entries(SLUG)) {
      const x = g[slug];
      if (!x || t < sinir) continue;
      gunluk.push({ t, a, p: "android", indirme: x.indirme || 0, guncelleme: x.guncelleme || 0, kaldirma: x.kaldirma || 0, aktif: x.aktif || 0,
        iap: 0, gelir: x.gelir || {}, ulkeler: x.satisUlke || {} });
    }
  }
  gunluk.sort((a, b) => a.t.localeCompare(b.t));
  const kur = existsSync(join(VERI, "kurlar.json")) ? JSON.parse(readFileSync(join(VERI, "kurlar.json"), "utf8")) : null;
  return { gunluk, veriGun, kur: kur ? { taban: kur.taban, tarih: kur.tarih, oran: kur.oran } : null };
}

/* Pass fiyatları (App Store Connect, ascelerate): ürün başına birkaç ülkenin fiyatı ve
   taban fiyat. Haftada bir yenilenir; önbellek ~/.cache, depoya girmez. Panel bunu
   "tahmini ödenen" için kullanır (kurulumun ülkesi + planı). */
const BUNDLE = { tennis: "com.aberk.TennisPadelScoreKeeper", pickleball: "com.aberk.Pickleball-Score-Keeper",
  volleyball: "com.aberk.Volleyball-Score-Keeper", badminton: "com.aberk.BadmintonScoreKeeper", tabletennis: "com.aberk.TableTennisScoreKeeper" };
const ULKE = ["USA", "TUR", "GBR", "DEU", "FRA", "ESP", "ITA", "NLD", "CAN", "AUS", "BRA", "MEX", "JPN", "IND", "HUN", "DNK", "ARE", "ZAF", "PHL", "SWE", "NOR", "POL", "CHE", "BEL", "AUT", "IRL", "PRT", "KOR"];
const ONBELLEK = join(homedir(), ".cache", "bam-sports-fiyat.json");
function asc(...a) { return JSON.parse(execFileSync("ascelerate", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120000 })); }
function fiyatlar() {
  const eski = existsSync(ONBELLEK) ? JSON.parse(readFileSync(ONBELLEK, "utf8")) : null;
  if (eski && !args.includes("--fiyat") && Date.now() - statSync(ONBELLEK).mtimeMs < 7 * 864e5) return eski;
  try {
    const urunler = {};
    for (const [a, bundle] of Object.entries(BUNDLE)) {
      const abone = asc("sub", "list", bundle, "--json").map(x => ({ id: x.productID, tur: x.period === "ONE_YEAR" ? "yearly" : "monthly", sub: true }));
      const tek = asc("iap", "list", bundle, "--json").map(x => ({ id: x.productID, tur: "lifetime", sub: false }));
      for (const u of [...abone, ...tek]) {
        const j = u.sub ? asc("sub", "pricing", "show", bundle, u.id, "--json") : asc("iap", "pricing", "show", bundle, u.id, "--json");
        const l = (j.prices || []).filter(x => ULKE.includes(x.territory) || x.territory === j.baseTerritory);
        const taban = l.find(x => x.territory === (j.baseTerritory || "USA")) || l.find(x => x.territory === "USA");
        urunler[u.id] = { a, tur: u.tur, taban: taban ? { c: taban.currency, p: Number(taban.price), u: taban.territory } : null,
          ulke: Object.fromEntries(l.map(x => [x.territory, { c: x.currency, p: Number(x.price) }])) };
      }
    }
    const paket = { uretim: new Date().toISOString(), urunler };
    mkdirSync(join(homedir(), ".cache"), { recursive: true });
    writeFileSync(ONBELLEK, JSON.stringify(paket));
    return paket;
  } catch (e) {
    console.log("  fiyat tablosu alınamadı (" + (e.message || e).toString().slice(0, 80) + ")" + (eski ? ", eskisi kullanılıyor" : ""));
    return eski;
  }
}
const satis = { uretim: new Date().toISOString(), ...(satisOzeti() || { gunluk: [], veriGun: 0, kur: null }), fiyat: fiyatlar() };

/* Firestore'a: panel/ga4 belgesi. Firebase CLI oturumunun sahibi olarak yazılır. */
async function firestoreYaz(belge = "ga4", veri = paket) {
  const api = await import("/opt/homebrew/lib/node_modules/firebase-tools/lib/api.js");
  const c = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const t = await (await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: c.tokens.refresh_token,
      client_id: api.clientId(), client_secret: api.clientSecret() }) })).json();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJE}/databases/(default)/documents/panel/${belge}`;
  const r = await fetch(url, { method: "PATCH", headers: { Authorization: `Bearer ${t.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(veri) }, uretim: { timestampValue: veri.uretim } } }) });
  if (!r.ok) throw new Error(`firestore ${r.status} ${(await r.text()).slice(0, 200)}`);
}

if (args.includes("--ham")) {
  writeFileSync("/tmp/bam-sports-panel.json", JSON.stringify(paket, null, 2));
  writeFileSync("/tmp/bam-sports-satis.json", JSON.stringify(satis, null, 2));
}
await firestoreYaz("ga4", paket);
await firestoreYaz("magaza", satis);
console.log(`bam-sports: ${toplam.totalUsers ?? 0} kullanıcı · ${uygulamalar.length} uygulama · ${olaylar.length} olay satırı · ${ekranlar.length} ekran · ${Math.round(JSON.stringify(paket).length / 1024)} KB → Firestore panel/ga4 · satış ${satis.gunluk.length} satır, ${Object.keys(satis.fiyat?.urunler || {}).length} ürün fiyatı → panel/magaza`);
