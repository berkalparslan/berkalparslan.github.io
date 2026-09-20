#!/usr/bin/env node
/* sitemap.xml'i dosya sisteminden üretir. /lab/ ve şablonlar dışarıda.
   lastmod = dosyanın son git commit tarihi. Çalıştır: node scripts/sitemap.mjs */
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://berkalparslan.github.io";
const HARIC = /^(lab|node_modules|scripts|assets|\.git|\.claude)(\/|$)|\/_template\.html$|^web\/store-mockup\/(css|js|legacy|engine|mcp)\/|^google[0-9a-f]+\.html$|\/google[0-9a-f]+\.html$/;

function gez(dir, out = []) {
  for (const ad of readdirSync(dir)) {
    const yol = join(dir, ad), rel = relative(KOK, yol);
    if (HARIC.test(rel)) continue;
    if (statSync(yol).isDirectory()) gez(yol, out);
    else if (/\.html$/.test(ad) && ad !== "404.html") out.push(rel);
  }
  return out;
}

const url = rel => SITE + "/" + rel.replace(/index\.html$/, "");
const tarih = rel => {
  try { return execFileSync("git", ["log", "-1", "--format=%cs", "--", rel], { cwd: KOK, encoding: "utf8" }).trim() || null; }
  catch { return null; }
};
const oncelik = rel => rel === "index.html" ? "1.0" : /^(privacy|support)/.test(rel) || /privacy\/index\.html$/.test(rel) ? "0.4" : /^blog\//.test(rel) ? "0.6" : "0.8";

const sayfalar = gez(KOK).sort((a, b) => a.localeCompare(b));
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sayfalar.map(rel => `  <url><loc>${url(rel)}</loc>${tarih(rel) ? `<lastmod>${tarih(rel)}</lastmod>` : ""}<priority>${oncelik(rel)}</priority></url>`).join("\n")}
</urlset>
`;
writeFileSync(join(KOK, "sitemap.xml"), xml);
console.log(`sitemap.xml: ${sayfalar.length} sayfa`);
