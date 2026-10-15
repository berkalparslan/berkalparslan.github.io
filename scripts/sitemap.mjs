#!/usr/bin/env node
/* sitemap.xml'i dosya sisteminden üretir. /lab/ ve şablonlar dışarıda.
   lastmod = dosyanın son git commit tarihi. Çalıştır: node scripts/sitemap.mjs
   Aynı çalıştırmada blog/posts.json'dan feed.xml (RSS 2.0) de yazılır. */
import { readdirSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://bamstudio.dev";
const HARIC = /^(lab|neden|data|daily-whisper|node_modules|scripts|assets|\.git|\.claude)(\/|$)|\/_template\.html$|^web\/store-mockup(\/|$)|^google[0-9a-f]+\.html$|\/google[0-9a-f]+\.html$|^(ss|wc|leafbook\/s)(\/|$)/;
/* noindex isteyen sayfalar (paylaşım, turnuva, maç bağlantıları) sitemap'e girmez. */
const NOINDEX = /<meta[^>]+name=["']robots["'][^>]+noindex/i;

function gez(dir, out = []) {
  for (const ad of readdirSync(dir)) {
    const yol = join(dir, ad), rel = relative(KOK, yol);
    if (HARIC.test(rel)) continue;
    if (statSync(yol).isDirectory()) gez(yol, out);
    else if (/\.html$/.test(ad) && ad !== "404.html" && !NOINDEX.test(readFileSync(yol, "utf8"))) out.push(rel);
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

/* Blog RSS: /feed.xml */
const esc = t => String(t ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
const posts = JSON.parse(readFileSync(join(KOK, "blog/posts.json"), "utf8")).sort((a, b) => b.date.localeCompare(a.date));
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Bam Studio · Notes</title>
  <link>${SITE}/blog/</link>
  <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
  <description>Notes on building and shipping small apps.</description>
  <language>en</language>
${posts.map(p => `  <item>
    <title>${esc(p.title)}</title>
    <link>${SITE}${p.url}</link>
    <guid>${SITE}${p.url}</guid>
    <pubDate>${new Date(p.date + "T09:00:00Z").toUTCString()}</pubDate>
    <description>${esc(p.summary)}</description>
  </item>`).join("\n")}
</channel>
</rss>
`;
writeFileSync(join(KOK, "feed.xml"), rss);
console.log(`feed.xml: ${posts.length} yazı`);
