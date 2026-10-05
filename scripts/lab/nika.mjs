/* Nika paneli altyapı özeti: Cloudflare GraphQL Analytics → Nika D1 (admin_kv 'infra_cf').
 *
 *   node scripts/lab/nika.mjs [--days 30] [--dry]
 *
 * Nika Firebase değil Cloudflare'de (Worker nika-api + D1 nika + R2 nika-media).
 * Panelin "Altyapı" sayfası ücretsiz plan sınırlarını (Workers 100k istek/gün,
 * 10 ms CPU; D1 5M okuma, 100k yazma/gün, 5 GB; R2 10 GB) bu özetle karşılaştırır.
 * Sınırlar hesap genelinde olduğu için hem hesabın toplamı hem Nika'nın payı çekilir.
 *
 * Kimlik: wrangler'ın OAuth oturumu (~/Library/Preferences/.wrangler/config/default.toml).
 * Süresi dolmuşsa wrangler gibi refresh token ile yenilenir ve dosyaya geri yazılır.
 * Yazma: D1 HTTP API (aynı token, d1:write). Panel aynı belgeyi PUT /v1/admin/infra
 * ile de alabilir; burada oturum gerekmesin diye doğrudan D1'e yazılır.
 * Token analytics iznini taşımıyorsa bunu yazar, panel tablo sayılarıyla yetinir.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const ACCOUNT = "63d95f944aa0ebee2c6be97d5ce5f46b";
const DB_ID = "f3161bfe-3f88-471e-a146-144cd3db19f3";
const SCRIPT = "nika-api";
const BUCKET = "nika-media";
const WRANGLER_CLIENT = "54d11594-84e4-41aa-b438-e81b8fa78ee7";
const TOML = join(homedir(), "Library", "Preferences", ".wrangler", "config", "default.toml");

const args = process.argv.slice(2);
const GUN = Number(args[args.indexOf("--days") + 1]) || 30;
const DRY = args.includes("--dry");

function tomlOku() {
  const t = readFileSync(TOML, "utf8");
  const al = k => (new RegExp(`^${k}\\s*=\\s*"([^"]*)"`, "m").exec(t) || [])[1];
  return { metin: t, token: al("oauth_token"), bitis: al("expiration_time"), yenile: al("refresh_token") };
}

async function token() {
  const c = tomlOku();
  if (c.token && c.bitis && Date.parse(c.bitis) - Date.now() > 5 * 60e3) return c.token;
  if (!c.yenile) throw new Error("wrangler oturumu yok: npx wrangler login");
  const r = await fetch("https://dash.cloudflare.com/oauth2/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: c.yenile, client_id: WRANGLER_CLIENT }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`wrangler token yenilenemedi (${r.status} ${j.error || ""}); npx wrangler login`);
  const bitis = new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString();
  let t = c.metin
    .replace(/^oauth_token\s*=.*$/m, `oauth_token = "${j.access_token}"`)
    .replace(/^expiration_time\s*=.*$/m, `expiration_time = "${bitis}"`);
  if (j.refresh_token) t = t.replace(/^refresh_token\s*=.*$/m, `refresh_token = "${j.refresh_token}"`);
  writeFileSync(TOML, t);
  return j.access_token;
}

const TOKEN = await token();
const gun = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const BUGUN = gun(0), BASLA = gun(GUN - 1), AY = BUGUN.slice(0, 8) + "01";

async function gql(query, variables) {
  const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors?.length) throw new Error(`${r.status} ${(j.errors || []).map(e => e.message).join("; ")}`);
  return j.data.viewer.accounts[0];
}

const hatalar = [];
async function dene(ad, f) {
  try { return await f(); } catch (e) { hatalar.push(`${ad}: ${e.message}`); return null; }
}

const V = { a: ACCOUNT, d: BASLA, m: AY };
const workers = await dene("workers", () => gql(`query($a:String!,$d:Date!){viewer{accounts(filter:{accountTag:$a}){
  workersInvocationsAdaptive(limit:5000,filter:{date_geq:$d}){sum{requests errors subrequests} quantiles{cpuTimeP50 cpuTimeP99} dimensions{date scriptName}}}}}`, V));
const d1 = await dene("d1", () => gql(`query($a:String!,$d:Date!){viewer{accounts(filter:{accountTag:$a}){
  d1AnalyticsAdaptiveGroups(limit:5000,filter:{date_geq:$d}){sum{readQueries writeQueries rowsRead rowsWritten} dimensions{date databaseId}}
  d1StorageAdaptiveGroups(limit:5000,filter:{date_geq:$d}){max{databaseSizeBytes} dimensions{date databaseId}}}}}`, V));
const r2 = await dene("r2", () => gql(`query($a:String!,$d:Date!,$m:Date!){viewer{accounts(filter:{accountTag:$a}){
  r2StorageAdaptiveGroups(limit:5000,filter:{date_geq:$d}){max{objectCount payloadSize metadataSize} dimensions{date bucketName}}
  r2OperationsAdaptiveGroups(limit:5000,filter:{date_geq:$m}){sum{requests} dimensions{actionType bucketName}}}}}`, V));

// ---------- özet ----------
const gunler = [];
for (let i = GUN - 1; i >= 0; i--) gunler.push(gun(i));
const bos = () => Object.fromEntries(gunler.map(g => [g, {}]));

const wHesap = bos(), wNika = bos();
for (const r of workers?.workersInvocationsAdaptive || []) {
  const g = r.dimensions.date; if (!wHesap[g]) continue;
  const h = wHesap[g]; h.requests = (h.requests || 0) + r.sum.requests; h.errors = (h.errors || 0) + r.sum.errors;
  h.cpuP99 = Math.max(h.cpuP99 || 0, r.quantiles.cpuTimeP99 / 1000);
  if (r.dimensions.scriptName === SCRIPT)
    wNika[g] = { requests: r.sum.requests, errors: r.sum.errors, subrequests: r.sum.subrequests, cpuP50: r.quantiles.cpuTimeP50 / 1000, cpuP99: r.quantiles.cpuTimeP99 / 1000 };
}
const dHesap = bos(), dNika = bos();
for (const r of d1?.d1AnalyticsAdaptiveGroups || []) {
  const g = r.dimensions.date; if (!dHesap[g]) continue;
  for (const [hedef, kosul] of [[dHesap, true], [dNika, r.dimensions.databaseId === DB_ID]]) {
    if (!kosul) continue;
    const h = hedef[g];
    for (const k of ["readQueries", "writeQueries", "rowsRead", "rowsWritten"]) h[k] = (h[k] || 0) + r.sum[k];
  }
}
const sonBoyut = (rows, f) => {
  const son = {};
  for (const r of rows || []) { const k = f(r); if (!son[k] || son[k].dimensions.date < r.dimensions.date) son[k] = r; }
  return Object.values(son);
};
const d1Boyut = sonBoyut(d1?.d1StorageAdaptiveGroups, r => r.dimensions.databaseId);
const r2Son = sonBoyut(r2?.r2StorageAdaptiveGroups, r => r.dimensions.bucketName);
const A = /^(Put|Copy|List|Create|Upload|Complete|Abort)/, B = /^(Get|Head)/;
let classA = 0, classB = 0, nikaA = 0, nikaB = 0;
for (const r of r2?.r2OperationsAdaptiveGroups || []) {
  const t = r.dimensions.actionType, n = r.sum.requests, nika = r.dimensions.bucketName === BUCKET;
  if (A.test(t)) { classA += n; if (nika) nikaA += n; } else if (B.test(t)) { classB += n; if (nika) nikaB += n; }
}
const dizi = m => gunler.map(g => ({ date: g, ...m[g] }));

const ozet = {
  source: "cloudflare-graphql", generatedAt: new Date().toISOString(), days: GUN, today: BUGUN,
  errors: hatalar,
  account: {
    workers: workers ? dizi(wHesap) : null,
    d1: d1 ? dizi(dHesap) : null,
    d1StorageBytes: d1 ? d1Boyut.reduce((a, r) => a + r.max.databaseSizeBytes, 0) : null,
    r2StorageBytes: r2 ? r2Son.reduce((a, r) => a + r.max.payloadSize + r.max.metadataSize, 0) : null,
    r2Objects: r2 ? r2Son.reduce((a, r) => a + r.max.objectCount, 0) : null,
    r2ClassAMonth: r2 ? classA : null, r2ClassBMonth: r2 ? classB : null,
    r2Buckets: r2 ? r2Son.map(r => ({ bucket: r.dimensions.bucketName, bytes: r.max.payloadSize + r.max.metadataSize, objects: r.max.objectCount })) : null,
  },
  nika: {
    workers: workers ? dizi(wNika) : null,
    d1: d1 ? dizi(dNika) : null,
    d1SizeBytes: d1 ? (d1Boyut.find(r => r.dimensions.databaseId === DB_ID)?.max.databaseSizeBytes ?? null) : null,
    r2: r2 ? (() => { const b = r2Son.find(r => r.dimensions.bucketName === BUCKET); return b ? { bytes: b.max.payloadSize + b.max.metadataSize, objects: b.max.objectCount, classAMonth: nikaA, classBMonth: nikaB } : null; })() : null,
  },
};

const bugunW = ozet.account.workers?.at(-1), bugunD = ozet.account.d1?.at(-1);
console.log(`nika: bugün hesap ${bugunW?.requests ?? "?"} istek, D1 ${bugunD?.rowsRead ?? "?"} okuma / ${bugunD?.rowsWritten ?? "?"} yazma, R2 ${((ozet.account.r2StorageBytes ?? 0) / 1e9).toFixed(2)} GB`);
if (hatalar.length) console.log("nika: analytics hataları (token izni?): " + hatalar.join(" | "));

if (DRY) { console.log(JSON.stringify(ozet, null, 2).slice(0, 3000)); process.exit(0); }

const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${DB_ID}/query`, {
  method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    sql: "INSERT INTO admin_kv (key, value, updated_at) VALUES ('infra_cf', ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    params: [JSON.stringify(ozet), new Date().toISOString()],
  }),
});
const j = await r.json().catch(() => ({}));
if (!r.ok || !j.success) { console.error(`nika: D1'e yazılamadı ${r.status} ${JSON.stringify(j.errors || j).slice(0, 300)}`); process.exit(1); }
console.log("nika: altyapı özeti D1'e yazıldı (admin_kv infra_cf)");
