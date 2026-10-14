/* Boş Yer Yok (No Spaces: Tycoon) yönetim paneli verisi → bosyeryok-tycoon Firestore.
 *
 *   node scripts/lab/bosyeryok.mjs [--days 90] [--ham]
 *
 * Uygulamanın sunucusu ve telemetrisi yok; panelin gördüğü şey Firebase
 * Analytics (GA4 mülkü 552195878) olayları ve mağaza raporları. Olaylarda tutar,
 * kasa rakamı, ad yok (iOS Game/Telemetry.swift). Android'de Firebase yok:
 * GA4 verisi şimdilik yalnız iOS.
 *
 * panel/ga4     GA4 özeti: günlük aktif/yeni/oturum/etkileşim (platform ve sürüme
 *               göre), bütün olaylar (gün x sürüm), ekranlar, dönem başına kırılımlar
 *               (ülke ISO-2, dil, cihaz, OS, kaynak, saat x gün), kohort, satın alma
 *               geliri, çökme; özel boyut kayıtlıysa olay parametreleri ve kullanıcı
 *               özellikleri. { json: "<paket>", uretim }.
 * panel/magaza  Mağaza özeti: vault/metrikler/veri/ios-*.json (App Store Connect satış
 *               raporu) + android-kova.json (Play kovası), son 365 gün, platform ayrı.
 *               (panel/sales'i panel-yaz.mjs yazar; burası ona dokunmaz.)
 *
 * Kimlik walletcoach.mjs ile aynı: GA4 için gplay servis hesabı (Viewer),
 * Firestore yazımı için Firebase CLI oturumu (kurallar dışı; panel/ yalnız
 * yöneticiye okunur). --ham: paketleri /tmp/bosyeryok-*.json olarak da yazar.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { rs256Anahtar, jwtUret } from "./uzak/jwt.mjs";

const PID = "552195878";          // bosyeryok-tycoon (ga4.mjs PROPERTIES)
const PROJE = "bosyeryok-tycoon";
const SLUG = "bosyeryok";         // apps.mjs
const args = process.argv.slice(2);
const GUN = Number(args[args.indexOf("--days") + 1]) || 90;
const VERI = join(homedir(), "dev", "vault", "metrikler", "veri");

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
/* Hata veren tek bir sorgu bütün paketi düşürmesin; hatalar pakete yazılır. */
const hatalar = [];
const dene = async (ad, f, bos = []) => { try { return await f(); } catch (e) { hatalar.push(`${ad}: ${e.message}`); console.log(`  ${ad} atlandı: ${e.message}`); return bos; } };

const aralik = [{ startDate: `${GUN}daysAgo`, endDate: "today" }];
const tarih = d => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
const m = (...adlar) => adlar.map(name => ({ name }));
const d = m;
const pl = p => /ios/i.test(p) ? "ios" : /android/i.test(p) ? "android" : (p || "?").toLowerCase();
const sv = v => v && v !== "(not set)" ? v : "?";

/* Dönemler: panelin aralık düğmeleriyle aynı (1 = bugün, 0 = tümü). Her dönemin
   bir de önceki eşit dönemi var (▲▼). Tekil kullanıcı günlükten toplanamadığı
   için kırılımlar dönem başına ayrı sorgulanır. Gün sınırı mülkün saat dilimi. */
const DONEM = { 1: [0, 0], 7: [6, 0], 28: [27, 0], 90: [89, 0] };
const ARALIK = g => g === "0" ? { startDate: "2025-01-01", endDate: "today" } : { startDate: `${DONEM[g][0]}daysAgo`, endDate: "today" };
const ONCEKI = g => g === "0" ? null : { startDate: `${DONEM[g][0] * 2 + 1}daysAgo`, endDate: `${DONEM[g][0] + 1}daysAgo` };
const DONEMLER = ["1", "7", "28", "90", "0"];
async function donemli(ad, govde, cevir) {
  const o = {};
  for (const g of DONEMLER) o[g] = await dene(`${ad}/${g}`, async () => (await rapor({ ...govde, dateRanges: [ARALIK(g)] })).map(cevir));
  return o;
}

/* ── Günlük seriler ─────────────────────────────────────────────────────── */
const gunluk = (await rapor({ dateRanges: aralik, dimensions: d("date", "platform"),
  metrics: m("activeUsers", "newUsers", "sessions", "engagedSessions", "userEngagementDuration", "screenPageViews", "eventCount") }))
  .map(r => ({ t: tarih(r.date), p: pl(r.platform), au: r.activeUsers, nu: r.newUsers, os: r.sessions, eos: r.engagedSessions,
    sure: r.userEngagementDuration, ekran: r.screenPageViews, olay: r.eventCount }))
  .sort((a, b) => a.t.localeCompare(b.t));
/* Sürüm x gün: sürüm filtresi ve "bir sürümden sonra ne değişti". */
const surumGunluk = (await rapor({ dateRanges: aralik, dimensions: d("date", "platform", "appVersion"),
  metrics: m("activeUsers", "newUsers", "sessions", "engagedSessions", "userEngagementDuration") }))
  .map(r => ({ t: tarih(r.date), p: pl(r.platform), s: sv(r.appVersion), au: r.activeUsers, nu: r.newUsers, os: r.sessions,
    eos: r.engagedSessions, sure: r.userEngagementDuration }))
  .sort((a, b) => a.t.localeCompare(b.t));
/* Bütün olaylar gün x sürüm: oyun olayları, satın alma, oturum. */
const olaylar = (await rapor({ dateRanges: aralik, dimensions: d("date", "eventName", "platform", "appVersion"),
  metrics: m("eventCount", "totalUsers") }))
  .map(r => ({ t: tarih(r.date), o: r.eventName, p: pl(r.platform), s: sv(r.appVersion), n: r.eventCount, k: r.totalUsers }));

/* ── Dönem toplamları (tekil kullanıcı) ─────────────────────────────────── */
const TOPLAM_M = m("totalUsers", "activeUsers", "newUsers", "sessions", "engagedSessions", "userEngagementDuration", "eventCount", "screenPageViews");
const topl = r => ({ p: pl(r.platform), s: sv(r.appVersion), tu: r.totalUsers, au: r.activeUsers, nu: r.newUsers, os: r.sessions,
  eos: r.engagedSessions, sure: r.userEngagementDuration, olay: r.eventCount, ekran: r.screenPageViews });
const donemToplam = {};
for (const g of DONEMLER) {
  const simdi = await dene(`toplam/${g}`, async () => (await rapor({ dateRanges: [ARALIK(g)], dimensions: d("platform", "appVersion"), metrics: TOPLAM_M })).map(topl));
  const hepsi = await dene(`toplamHepsi/${g}`, async () => (await rapor({ dateRanges: [ARALIK(g)], metrics: TOPLAM_M }))[0] || {}, {});
  const onc = ONCEKI(g);
  const once = onc ? await dene(`once/${g}`, async () => (await rapor({ dateRanges: [onc], dimensions: d("platform", "appVersion"), metrics: TOPLAM_M })).map(topl)) : null;
  const onceHepsi = onc ? await dene(`onceHepsi/${g}`, async () => (await rapor({ dateRanges: [onc], metrics: TOPLAM_M }))[0] || {}, {}) : null;
  /* Olay başına tekil kullanıcı (dönemde), sürüme göre de. */
  const olayKisi = await dene(`olayKisi/${g}`, async () => (await rapor({ dateRanges: [ARALIK(g)], dimensions: d("eventName", "appVersion"),
    metrics: m("eventCount", "totalUsers") })).map(r => ({ o: r.eventName, s: sv(r.appVersion), n: r.eventCount, k: r.totalUsers })));
  const olayKisiHepsi = await dene(`olayKisiHepsi/${g}`, async () => (await rapor({ dateRanges: [ARALIK(g)], dimensions: d("eventName"),
    metrics: m("eventCount", "totalUsers") })).map(r => ({ o: r.eventName, n: r.eventCount, k: r.totalUsers })));
  const olayKisiOnce = onc ? await dene(`olayKisiOnce/${g}`, async () => (await rapor({ dateRanges: [onc], dimensions: d("eventName"),
    metrics: m("eventCount", "totalUsers") })).map(r => ({ o: r.eventName, n: r.eventCount, k: r.totalUsers }))) : null;
  donemToplam[g] = { simdi, hepsi, once, onceHepsi, olayKisi, olayKisiHepsi, olayKisiOnce };
}
const aktif = {};
for (const [ad, gun] of [["dau", 0], ["wau", 6], ["mau", 27]]) {
  aktif[ad] = (await rapor({ dateRanges: [{ startDate: `${gun}daysAgo`, endDate: "today" }], metrics: m("activeUsers") }))[0]?.activeUsers || 0;
}

/* ── Kırılımlar, dönem başına, sürüm ve platformla ─────────────────────── */
const ps = r => ({ p: pl(r.platform), s: sv(r.appVersion) });
const ekranlar = await donemli("ekranlar", { dimensions: d("unifiedScreenName", "platform", "appVersion"),
  metrics: m("screenPageViews", "userEngagementDuration", "activeUsers") }, r => ({ ad: r.unifiedScreenName, ...ps(r), g: r.screenPageViews, sure: r.userEngagementDuration, k: r.activeUsers }));
const ulkeler = await donemli("ulkeler", { dimensions: d("countryId", "country", "platform", "appVersion"), metrics: m("totalUsers", "newUsers", "sessions") },
  r => ({ iso: r.countryId, ad: r.country, ...ps(r), k: r.totalUsers, nu: r.newUsers, os: r.sessions }));
const diller = await donemli("diller", { dimensions: d("language", "platform", "appVersion"), metrics: m("totalUsers") },
  r => ({ ad: r.language, ...ps(r), k: r.totalUsers }));
const cihazlar = await donemli("cihazlar", { dimensions: d("mobileDeviceModel", "deviceCategory", "platform", "appVersion"), metrics: m("totalUsers") },
  r => ({ ad: r.mobileDeviceModel, tur: r.deviceCategory, ...ps(r), k: r.totalUsers }));
const isletim = await donemli("isletim", { dimensions: d("operatingSystem", "operatingSystemVersion", "platform", "appVersion"), metrics: m("totalUsers") },
  r => ({ os: r.operatingSystem, ad: r.operatingSystemVersion, ...ps(r), k: r.totalUsers }));
const kaynaklar = await donemli("kaynaklar", { dimensions: d("firstUserSource", "firstUserMedium", "platform", "appVersion"), metrics: m("totalUsers", "newUsers") },
  r => ({ kaynak: r.firstUserSource, medium: r.firstUserMedium, ...ps(r), k: r.totalUsers, nu: r.newUsers }));
/* Gün x saat (GA4 dayOfWeek: 0 = Pazar; saat mülkün saat diliminde). */
const saatGun = await donemli("saatGun", { dimensions: d("dayOfWeek", "hour", "appVersion"), metrics: m("sessions", "activeUsers") },
  r => ({ g: Number(r.dayOfWeek), h: Number(r.hour), s: sv(r.appVersion), os: r.sessions, k: r.activeUsers }));
/* Sürüm benimseme: sürüm başına kullanıcı, ilk/son görülen gün. */
const surumler = (await rapor({ dateRanges: [{ startDate: "2025-01-01", endDate: "today" }], dimensions: d("platform", "appVersion"),
  metrics: m("totalUsers", "newUsers", "sessions") })).map(r => ({ ...ps(r), tu: r.totalUsers, nu: r.newUsers, os: r.sessions }));
const surum7 = (await rapor({ dateRanges: [{ startDate: "6daysAgo", endDate: "today" }], dimensions: d("platform", "appVersion"),
  metrics: m("activeUsers") })).map(r => ({ ...ps(r), au: r.activeUsers }));
const surum28 = (await rapor({ dateRanges: [{ startDate: "27daysAgo", endDate: "today" }], dimensions: d("platform", "appVersion"),
  metrics: m("activeUsers") })).map(r => ({ ...ps(r), au: r.activeUsers }));

/* Kohort: ilk oturum günü x gün aktif kullanıcı (tüm zamanlar). D1/D7/D30 panelde. */
const kohort = await dene("kohort", async () => (await rapor({ dateRanges: [{ startDate: "2025-01-01", endDate: "today" }],
  dimensions: d("firstSessionDate", "date", "appVersion"), metrics: m("activeUsers") }))
  .map(r => ({ ilk: tarih(r.firstSessionDate), t: tarih(r.date), s: sv(r.appVersion), k: r.activeUsers })));
const kohortHepsi = await dene("kohortHepsi", async () => (await rapor({ dateRanges: [{ startDate: "2025-01-01", endDate: "today" }],
  dimensions: d("firstSessionDate", "date"), metrics: m("activeUsers") }))
  .map(r => ({ ilk: tarih(r.firstSessionDate), t: tarih(r.date), k: r.activeUsers })));

/* Gelir: in_app_purchase (StoreKit otomatik) ve GA4'ün gelir metrikleri. RevenueCat'li
   iOS'ta in_app_purchase gelmeyebilir; oyunun kendi purchase_* olayları olaylar'da. */
const gelir = await dene("gelir", async () => (await rapor({ dateRanges: aralik, dimensions: d("date", "platform", "appVersion"),
  metrics: m("totalRevenue", "purchaseRevenue", "totalPurchasers", "transactions") }))
  .filter(r => r.totalRevenue || r.purchaseRevenue || r.totalPurchasers || r.transactions)
  .map(r => ({ t: tarih(r.date), ...ps(r), gelir: r.totalRevenue, satin: r.purchaseRevenue, alan: r.totalPurchasers, islem: r.transactions })));
/* Çökme (Crashlytics olmadan da GA4 app_exception'dan). */
const cokme = await dene("cokme", async () => (await rapor({ dateRanges: aralik, dimensions: d("platform", "appVersion"),
  metrics: m("crashAffectedUsers", "crashFreeUsersRate", "activeUsers") })).map(r => ({ ...ps(r), k: r.crashAffectedUsers, oran: r.crashFreeUsersRate, au: r.activeUsers })));

/* Olay parametreleri ve kullanıcı özellikleri: yalnız GA4'te özel boyut olarak
   kayıtlıysa sorgulanabilir (Admin → Custom definitions). Kayıtlı olanlar
   kendiliğinden gelir; liste pakete yazılır, panel eksikleri söyler. */
const meta = await (await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PID}/metadata`,
  { headers: { Authorization: `Bearer ${TOKEN}` } })).json();
const ozelOlay = (meta.dimensions || []).filter(x => x.apiName?.startsWith("customEvent:")).map(x => x.apiName);
const ozelKisi = (meta.dimensions || []).filter(x => x.apiName?.startsWith("customUser:")).map(x => x.apiName);
const parametreler = {};
for (const boyut of ozelOlay) {
  parametreler[boyut.slice(12)] = await donemli(`param ${boyut}`, { dimensions: d("eventName", boyut, "appVersion"), metrics: m("eventCount", "totalUsers") },
    r => ({ o: r.eventName, v: r[boyut], s: sv(r.appVersion), n: r.eventCount, k: r.totalUsers }));
  for (const g of DONEMLER) parametreler[boyut.slice(12)][g] = parametreler[boyut.slice(12)][g].filter(x => x.v && x.v !== "(not set)");
}
const kisiOzellik = {};
for (const boyut of ozelKisi) {
  kisiOzellik[boyut.slice(11)] = await donemli(`kisi ${boyut}`, { dimensions: d(boyut, "appVersion"), metrics: m("activeUsers") },
    r => ({ v: r[boyut], s: sv(r.appVersion), k: r.activeUsers }));
}

const paket = { uretim: new Date().toISOString(), gun: GUN, mulk: PID, proje: PROJE, aktif, gunluk, surumGunluk, olaylar,
  donemToplam, ekranlar, ulkeler, diller, cihazlar, isletim, kaynaklar, saatGun, surumler, surum7, surum28,
  kohort, kohortHepsi, gelir, cokme, parametreler, kisiOzellik, ozelBoyut: { olay: ozelOlay, kisi: ozelKisi }, hatalar };

/* ── Mağaza özeti: satis.mjs'in vault'a yazdığı günlük dosyalar ──────────── */
function magaza() {
  if (!existsSync(VERI)) return null;
  const sinir = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const gunluk = [];
  let veriGun = 0;
  for (const f of readdirSync(VERI).filter(f => /^ios-\d{4}-\d{2}-\d{2}\.json$/.test(f) && f.slice(4, 14) >= sinir).sort()) {
    const j = JSON.parse(readFileSync(join(VERI, f), "utf8"));
    if (!j.veri) continue;
    veriGun++;
    const x = j.apps?.[SLUG];
    if (!x) continue;
    gunluk.push({ t: f.slice(4, 14), p: "ios", indirme: x.indirme || 0, guncelleme: x.guncelleme || 0, iap: x.iap || 0,
      gelir: x.gelir || {}, ulkeler: x.ulkeler || {}, cihazlar: x.cihazlar || {} });
  }
  const kova = existsSync(join(VERI, "android-kova.json")) ? JSON.parse(readFileSync(join(VERI, "android-kova.json"), "utf8")) : { gunluk: {} };
  for (const [t, g] of Object.entries(kova.gunluk || {})) {
    const x = g[SLUG];
    if (!x || t < sinir) continue;
    gunluk.push({ t, p: "android", indirme: x.indirme || 0, guncelleme: x.guncelleme || 0, kaldirma: x.kaldirma || 0, aktif: x.aktif || 0,
      iap: x.iap || 0, gelir: x.gelir || {}, ulkeler: x.ulke || x.satisUlke || {}, aktifUlke: x.aktifUlke || {} });
  }
  gunluk.sort((a, b) => a.t.localeCompare(b.t));
  const kur = existsSync(join(VERI, "kurlar.json")) ? JSON.parse(readFileSync(join(VERI, "kurlar.json"), "utf8")) : null;
  return { uretim: new Date().toISOString(), gunluk, veriGun, kur: kur ? { taban: kur.taban, tarih: kur.tarih, oran: kur.oran } : null };
}
const satis = magaza() || { uretim: new Date().toISOString(), gunluk: [], veriGun: 0, kur: null };

/* Firestore'a: Firebase CLI oturumunun sahibi olarak (kurallar sahibe uygulanmaz). */
async function firestoreYaz(belge, veri) {
  const api = await import("/opt/homebrew/lib/node_modules/firebase-tools/lib/api.js");
  const c = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const t = await (await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: c.tokens.refresh_token,
      client_id: api.clientId(), client_secret: api.clientSecret() }) })).json();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJE}/databases/(default)/documents/panel/${belge}`;
  const r = await fetch(url, { method: "PATCH", headers: { Authorization: `Bearer ${t.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(veri) }, uretim: { timestampValue: veri.uretim } } }) });
  if (!r.ok) throw new Error(`firestore ${belge} ${r.status} ${(await r.text()).slice(0, 200)}`);
}

if (args.includes("--ham")) {
  writeFileSync("/tmp/bosyeryok-ga4.json", JSON.stringify(paket, null, 2));
  writeFileSync("/tmp/bosyeryok-magaza.json", JSON.stringify(satis, null, 2));
}
await firestoreYaz("ga4", paket);
await firestoreYaz("magaza", satis);
const kb = Math.round(JSON.stringify(paket).length / 1024);
console.log(`bosyeryok: ${donemToplam["0"]?.hepsi?.totalUsers ?? 0} kullanıcı (tümü) · ${gunluk.length} gün satırı · ${olaylar.length} olay satırı · ${ozelOlay.length} özel olay boyutu · ${kb} KB → panel/ga4 · mağaza ${satis.gunluk.length} satır → panel/magaza${hatalar.length ? ` · ${hatalar.length} hata` : ""}`);
