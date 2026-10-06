/* Site trafiği: Cloudflare Web Analytics (RUM) → ana panel.
 *
 *   node scripts/lab/web.mjs        (tek başına dener, web.json yazar)
 *
 * Kimlik: wrangler'ın OAuth oturumu (~/Library/Preferences/.wrangler/config/
 * default.toml). Token ~1 saatte bir eskiyor; eskiyse diskteki bir wrangler
 * `whoami` ile yeniletiliyor (wrangler kendi dosyasını kendisi günceller, bu
 * betik token yazmaz). GraphQL `rumPageloadEventsAdaptiveGroups` hesap
 * düzeyinde okunuyor; yalnız bamstudio.dev ve berkalparslan.github.io.
 *
 * Umami (cloud.umami.is) de sitede ama API anahtarı yok; anahtar gelirse
 * buraya ikinci kaynak olarak eklenir.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";

const TOML = join(homedir(), "Library", "Preferences", ".wrangler", "config", "default.toml");
const WRANGLER = [
  join(homedir(), "dev", "thisOneApp", "worker-cdn", "node_modules", ".bin", "wrangler"),
  join(homedir(), "dev", "thisOneApp", "worker-upload", "node_modules", ".bin", "wrangler"),
  "/opt/homebrew/bin/wrangler"
];
const D1_ID = "56030b37-b496-4a0b-bfbc-bb8f14ee51bc"; // bamstudio: bülten, anket, indirim kodları
const HOSTLAR = /(^|\.)bamstudio\.dev$|berkalparslan\.github\.io$/;
const AYRI = /^framegrove\./; // Framegrove'un kendi kartı var (framegrove.mjs), site sayısına girmez

function tokenOku() {
  const t = readFileSync(TOML, "utf8");
  return { token: t.match(/oauth_token = "([^"]+)"/)?.[1], bitis: Date.parse(t.match(/expiration_time = "([^"]+)"/)?.[1] || 0) };
}
export function token() {
  if (!existsSync(TOML)) throw new Error("wrangler oturumu yok");
  let t = tokenOku();
  if (!t.token || t.bitis < Date.now() + 120_000) {
    const w = WRANGLER.find(existsSync);
    if (!w) throw new Error("token eski ve yenileyecek wrangler yok");
    try { execFileSync(w, ["whoami"], { stdio: "ignore", timeout: 60_000 }); } catch { /* yine de oku */ }
    t = tokenOku();
    if (t.bitis < Date.now()) throw new Error("wrangler token yenilenemedi (wrangler login)");
  }
  return t.token;
}

const gunYazi = d => d.toISOString().slice(0, 10);

export async function web(log = () => {}, gun = 90) {
  const cikti = { uretim: new Date().toISOString(), kaynak: "cloudflare-rum", gunluk: {}, ulke: {}, ulke7: {}, sayfa: [], kaynakSite: [], hata: null };
  try {
    const tk = token();
    const H = { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" };
    const hesap = (await (await fetch("https://api.cloudflare.com/client/v4/accounts", { headers: H })).json()).result?.[0]?.id;
    if (!hesap) throw new Error("hesap okunamadı");
    const gql = async (alan, filtre, boyut, limit = 5000) => {
      const q = `query { viewer { accounts(filter:{accountTag:"${hesap}"}) { rumPageloadEventsAdaptiveGroups(limit:${limit}, filter:{${filtre}}) { count sum { visits } dimensions { ${boyut} requestHost } } } } }`;
      const r = await fetch("https://api.cloudflare.com/client/v4/graphql", { method: "POST", headers: H, body: JSON.stringify({ query: q }) });
      const j = await r.json();
      if (j.errors?.length) throw new Error(j.errors[0].message.slice(0, 160));
      return (j.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups || []).filter(x => HOSTLAR.test(x.dimensions.requestHost || "") && !AYRI.test(x.dimensions.requestHost || ""));
    };
    /* Adaptif örnekleme geniş aralıkta kaba sonuç veriyor (30 günlük tek sorgu
       7 günlükten az ülke döndürdü): 7 günlük parçalar, gün boyutuyla. */
    const bit = new Date();
    const parcalar = n => { const l = []; for (let s = 0; s < n; s += 7) l.push([gunYazi(new Date(bit - Math.min(n - 1, s + 6) * 864e5)), gunYazi(new Date(bit - s * 864e5))]); return l; };
    const sayfa = {}, ref = {};
    for (const [bas, son] of parcalar(gun)) {
      const f = `date_geq:"${bas}", date_leq:"${son}"`;
      for (const x of await gql("", f, "date countryName")) {
        const t = x.dimensions.date, u = x.dimensions.countryName || "??", v = x.sum?.visits || 0;
        const g = cikti.gunluk[t] ||= { pv: 0, ziyaret: 0, ulke: {} };
        g.pv += x.count; g.ziyaret += v; g.ulke[u] = (g.ulke[u] || 0) + v;
        const yas = (bit - Date.parse(t)) / 864e5;
        if (yas < 30) cikti.ulke[u] = (cikti.ulke[u] || 0) + v;
        if (yas < 7) cikti.ulke7[u] = (cikti.ulke7[u] || 0) + v;
      }
    }
    for (const [bas, son] of parcalar(30)) {
      const f = `date_geq:"${bas}", date_leq:"${son}"`;
      for (const x of await gql("", f, "date requestPath")) sayfa[x.dimensions.requestPath] = (sayfa[x.dimensions.requestPath] || 0) + x.count;
      for (const x of await gql("", f, "date refererHost")) { const h = x.dimensions.refererHost || "(doğrudan)"; if (!HOSTLAR.test(h)) ref[h] = (ref[h] || 0) + (x.sum?.visits || 0); }
    }
    cikti.sayfa = Object.entries(sayfa).filter(([p]) => !p.startsWith("/lab") && !p.startsWith("/cdn-cgi")).sort((a, b) => b[1] - a[1]).slice(0, 15);
    cikti.kaynakSite = Object.entries(ref).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const top = Object.values(cikti.gunluk).reduce((t, g) => t + g.ziyaret, 0);
    /* Site arka ucu (D1): bülten aboneleri, anket oyları, indirim kodları. E-posta panele gelmez. */
    try {
      const q = async sql => {
        const r = await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${hesap}/d1/database/${D1_ID}/query`, { method: "POST", headers: H, body: JSON.stringify({ sql }) })).json();
        if (!r.success) throw new Error((r.errors?.[0]?.message || "d1").slice(0, 120));
        return r.result?.[0]?.results || [];
      };
      const abone = Object.fromEntries((await q("SELECT status, COUNT(*) n FROM subscribers GROUP BY status")).map(x => [x.status, x.n]));
      const oy = await q("SELECT apps, platform, lang, created_at FROM votes");
      const uyg = {}, plat = {}, gunO = {};
      for (const v of oy) {
        for (const a of JSON.parse(v.apps || "[]")) uyg[a] = (uyg[a] || 0) + 1;
        plat[v.platform] = (plat[v.platform] || 0) + 1;
        const g = (v.created_at || "").slice(0, 10); gunO[g] = (gunO[g] || 0) + 1;
      }
      const kod = Object.fromEntries((await q("SELECT app, SUM(assigned_to IS NULL) kalan, SUM(assigned_to IS NOT NULL) verilen FROM codes GROUP BY app")).map(x => [x.app, { kalan: x.kalan, verilen: x.verilen }]));
      const aboneGun = Object.fromEntries((await q("SELECT substr(confirmed_at,1,10) g, COUNT(*) n FROM subscribers WHERE status='active' GROUP BY g")).map(x => [x.g, x.n]));
      cikti.arkaUc = { abone, aboneGun, anket: { toplam: oy.length, uygulama: uyg, platform: plat, gunluk: gunO }, kod };
      log(`  site arka ucu ✓ ${abone.active || 0} abone · ${oy.length} anket`);
    } catch (e) { cikti.arkaUcHata = e.message; log(`  site arka ucu ✗ ${e.message}`); }
    log(`  web ✓ ${Object.keys(cikti.gunluk).length} gün · ${top} ziyaret · ${Object.keys(cikti.ulke).length} ülke`);
  } catch (e) { cikti.hata = e.message; log(`  web ✗ ${e.message}`); }
  return cikti;
}

if (process.argv[1]?.endsWith("web.mjs")) {
  const w = await web(m => console.log(m));
  writeFileSync(join(homedir(), "dev", "vault", "metrikler", "veri", "web.json"), JSON.stringify(w, null, 2));
}
