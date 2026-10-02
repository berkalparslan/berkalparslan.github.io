/* Wallet Coach yönetim paneli verisi: Firebase Analytics (GA4) → şifreli paket.
 *
 *   node scripts/lab/walletcoach.mjs [--days 90]
 *
 * Uygulamanın sunucusu yok, kullanıcı verisi telefonda; panelin gördüğü tek
 * şey Analytics olayları. Tutar, ad, metin hiçbir olayda yok (Telemetry.swift).
 * Kimlik ve parola panel ile aynı: gplay servis hesabı (GA4 Viewer) ve
 * Keychain'deki bamtech-lab-panel. Çıktı: lab/wallet-coach/data.enc.json
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { rs256Anahtar, jwtUret } from "./uzak/jwt.mjs";
import { sifrele } from "./kripto.mjs";

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

/* Geri gelme: ilk açılış haftasına göre kaç kişi sonraki haftalarda döndü. */
const kohort = await rapor({ dateRanges: aralik, dimensions: d("firstSessionDate", "date"),
  metrics: m("activeUsers") }).catch(() => []);

const paket = { uretim: new Date().toISOString(), gun: GUN, toplam, aktif, gunluk, olaylar, olayKisi,
  ekranlar, surumler, ulkeler, diller,
  kohort: kohort.map(r => ({ ilk: tarih(r.firstSessionDate), t: tarih(r.date), k: r.activeUsers })) };

function parola() {
  return execFileSync("security", ["find-generic-password", "-s", "bamtech-lab-panel", "-w"],
    { encoding: "utf8" }).trim();
}

const hedef = join(KOK, "lab", "wallet-coach", "data.enc.json");
mkdirSync(dirname(hedef), { recursive: true });
if (args.includes("--ham")) writeFileSync("/tmp/wc-panel.json", JSON.stringify(paket, null, 2));
const { paket: sifreli, boyut } = await sifrele(paket, parola());
writeFileSync(hedef, JSON.stringify(sifreli));
console.log(`wallet-coach: ${toplam.totalUsers ?? 0} kullanıcı · ${olaylar.length} olay satırı · ${ekranlar.length} ekran · ${Math.round(boyut / 1024)} KB`);
