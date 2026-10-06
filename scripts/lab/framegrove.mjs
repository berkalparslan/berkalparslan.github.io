/* Framegrove (açık kaynak araç) → ana panelin Framegrove kartı.
 *
 *   node scripts/lab/framegrove.mjs     (tek başına dener, framegrove.json yazar)
 *
 * Kaynaklar:
 * - npm günlük indirme: api.npmjs.org (anahtarsız)
 * - GitHub repo + trafik (görüntüleme, klon, yönlendiren): `gh api`, yerel gh oturumu.
 *   Trafik yalnız son 14 günü veriyor; eski günler önceki framegrove.json'dan korunur.
 * - Site ziyareti: Cloudflare Web Analytics, yalnız framegrove.bamstudio.dev (web.mjs token'ı)
 * - MCP Registry kaydı: registry.modelcontextprotocol.io (anahtarsız)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { token } from "./web.mjs";

const PAKET = "framegrove";
const REPO = "tech-bam/framegrove";
const HOST = "framegrove.bamstudio.dev";
const REGISTRY_AD = "io.github.tech-bam/framegrove";
const DOSYA = join(homedir(), "dev", "vault", "metrikler", "veri", "framegrove.json");

const gunYazi = d => d.toISOString().slice(0, 10);
const gh = yol => JSON.parse(execFileSync("gh", ["api", yol], { encoding: "utf8", timeout: 30_000 }));

export async function framegrove(log = () => {}) {
  const once = existsSync(DOSYA) ? JSON.parse(readFileSync(DOSYA, "utf8")) : {};
  const c = { uretim: new Date().toISOString(), npm: { gunluk: {} }, github: { gunluk: once.github?.gunluk || {} }, site: { gunluk: {} }, registry: null, hatalar: [] };
  const bit = new Date(), bas = new Date(bit - 89 * 864e5);

  try {
    const r = await (await fetch(`https://api.npmjs.org/downloads/range/${gunYazi(bas)}:${gunYazi(bit)}/${PAKET}`)).json();
    if (r.error && !/not found/.test(r.error)) throw new Error(r.error); // yeni paket: npm istatistiği ~1 gün geriden başlar
    for (const d of r.downloads || []) c.npm.gunluk[d.day] = d.downloads;
    const v = await (await fetch(`https://registry.npmjs.org/${PAKET}/latest`)).json();
    c.npm.surum = v.version || null;
    log(`  npm ✓ ${Object.values(c.npm.gunluk).reduce((t, n) => t + n, 0)} indirme (90 gün) · ${c.npm.surum}`);
  } catch (e) { c.hatalar.push(`npm: ${e.message}`); log(`  npm ✗ ${e.message}`); }

  try {
    const r = gh(`repos/${REPO}`);
    Object.assign(c.github, { yildiz: r.stargazers_count, fork: r.forks_count, izleyen: r.subscribers_count, acikIssue: r.open_issues_count });
    const g = c.github.gunluk;
    for (const x of gh(`repos/${REPO}/traffic/views`).views || []) (g[x.timestamp.slice(0, 10)] ||= {}).goruntuleme = x.count, g[x.timestamp.slice(0, 10)].tekil = x.uniques;
    for (const x of gh(`repos/${REPO}/traffic/clones`).clones || []) (g[x.timestamp.slice(0, 10)] ||= {}).klon = x.count;
    c.github.yonlendiren = gh(`repos/${REPO}/traffic/popular/referrers`).map(x => [x.referrer, x.count, x.uniques]);
    c.github.yildizGecmis = { ...(once.github?.yildizGecmis || {}), [gunYazi(bit)]: r.stargazers_count };
    log(`  github ✓ ${r.stargazers_count} yıldız · ${c.github.yonlendiren.length} yönlendiren`);
  } catch (e) { c.hatalar.push(`github: ${e.message.slice(0, 160)}`); log(`  github ✗ ${e.message.slice(0, 160)}`); }

  try {
    const H = { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" };
    const hesap = (await (await fetch("https://api.cloudflare.com/client/v4/accounts", { headers: H })).json()).result?.[0]?.id;
    if (!hesap) throw new Error("hesap okunamadı");
    const gql = async (f, boyut) => {
      const q = `query { viewer { accounts(filter:{accountTag:"${hesap}"}) { rumPageloadEventsAdaptiveGroups(limit:5000, filter:{${f}, requestHost:"${HOST}"}) { count sum { visits } dimensions { ${boyut} } } } } }`;
      const j = await (await fetch("https://api.cloudflare.com/client/v4/graphql", { method: "POST", headers: H, body: JSON.stringify({ query: q }) })).json();
      if (j.errors?.length) throw new Error(j.errors[0].message.slice(0, 160));
      return j.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups || [];
    };
    const ref = {}, sayfa = {};
    for (let s = 0; s < 30; s += 7) {
      const f = `date_geq:"${gunYazi(new Date(bit - Math.min(29, s + 6) * 864e5))}", date_leq:"${gunYazi(new Date(bit - s * 864e5))}"`;
      for (const x of await gql(f, "date")) { const g = c.site.gunluk[x.dimensions.date] ||= { pv: 0, ziyaret: 0 }; g.pv += x.count; g.ziyaret += x.sum?.visits || 0; }
      for (const x of await gql(f, "date refererHost")) { const h = x.dimensions.refererHost || "(doğrudan)"; if (h !== HOST) ref[h] = (ref[h] || 0) + (x.sum?.visits || 0); }
      for (const x of await gql(f, "date requestPath")) sayfa[x.dimensions.requestPath] = (sayfa[x.dimensions.requestPath] || 0) + x.count;
    }
    c.site.yonlendiren = Object.entries(ref).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).slice(0, 10);
    c.site.sayfa = Object.entries(sayfa).filter(([p]) => !p.startsWith("/cdn-cgi")).sort((a, b) => b[1] - a[1]).slice(0, 10);
    log(`  site ✓ ${Object.values(c.site.gunluk).reduce((t, g) => t + g.ziyaret, 0)} ziyaret (30 gün)`);
  } catch (e) { c.hatalar.push(`site: ${e.message}`); log(`  site ✗ ${e.message}`); }

  try {
    const r = await (await fetch(`https://registry.modelcontextprotocol.io/v0/servers?search=${encodeURIComponent(REGISTRY_AD)}`)).json();
    const s = (r.servers || []).map(x => x.server || x).find(x => x.name === REGISTRY_AD);
    c.registry = { kayitli: !!s, surum: s?.version || null };
    log(`  mcp registry ${s ? `✓ ${s.version}` : "· kayıt yok"}`);
  } catch (e) { c.hatalar.push(`registry: ${e.message}`); }

  return c;
}

if (process.argv[1]?.endsWith("framegrove.mjs")) {
  const f = await framegrove(m => console.log(m));
  writeFileSync(DOSYA, JSON.stringify(f, null, 2));
}
