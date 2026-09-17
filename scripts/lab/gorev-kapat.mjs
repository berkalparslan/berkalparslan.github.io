#!/usr/bin/env node
/**
 * Paneldeki işaretleri vault'a yazar: görev satırını bulur, `[ ]` → `[x]` ve
 * sonuna `✅ YYYY-MM-DD` ekler. Panel "Vault'a yaz" düğmesi bu komutu üretir.
 *
 *   node scripts/lab/gorev-kapat.mjs <slug|kimlik> [<slug|kimlik> …]
 *   node scripts/lab/gorev-kapat.mjs --ac <slug|kimlik>     (geri aç)
 *
 * slug: uygulama notu (uygulamalar/<slug>.md) ya da konu:<ad> (konular/<ad>.md)
 * Kimlik, paneldeki kimlik() ile aynı: vaultmetin.mjs → kimlik(yazi).
 * Sonrasında: sh scripts/lab/gunluk.sh (panel yenilensin) ve vault'u push et.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { gorevSatiri, kimlik } from "./vaultmetin.mjs";

const KOK = join(homedir(), "dev", "vault");
const args = process.argv.slice(2);
const AC = args.includes("--ac");
const idler = args.filter(a => a !== "--ac");
if (!idler.length) { console.error("kullanım: gorev-kapat.mjs <slug|kimlik> …"); process.exit(1); }
const bugun = new Date().toISOString().slice(0, 10);

const dosyalar = new Map();
for (const id of idler) {
  const [slug, kim] = id.split("|");
  const yol = slug.startsWith("konu:") ? join(KOK, "konular", `${slug.slice(5)}.md`) : join(KOK, "uygulamalar", `${slug}.md`);
  if (!existsSync(yol)) { console.log(`✗ ${id}: not yok (${yol})`); continue; }
  (dosyalar.get(yol) || dosyalar.set(yol, []).get(yol)).push({ id, kim });
}

let toplam = 0;
for (const [yol, isler] of dosyalar) {
  const satirlar = readFileSync(yol, "utf8").split("\n");
  for (const { id, kim } of isler) {
    const ix = satirlar.findIndex(s => { const g = gorevSatiri(s); return g && kimlik(g.yazi) === kim; });
    if (ix < 0) { console.log(`✗ ${id}: satır bulunamadı (metin değişmiş olabilir)`); continue; }
    const s = satirlar[ix];
    if (AC) satirlar[ix] = s.replace(/\[[xX]\]/, "[ ]").replace(/\s*✅\s*\d{4}-\d{2}-\d{2}\s*$/, "");
    else if (/\[[xX]\]/.test(s)) { console.log(`= ${id}: zaten bitti`); continue; }
    else satirlar[ix] = s.replace(/\[ \]/, "[x]").replace(/\s*$/, "") + ` ✅ ${bugun}`;
    console.log(`${AC ? "↩" : "✓"} ${yol.replace(KOK + "/", "")}: ${satirlar[ix].trim().slice(0, 90)}`);
    toplam++;
  }
  /* guncelleme alanı bugüne */
  const fmIx = satirlar.findIndex((s, i) => i < 30 && /^guncelleme:/.test(s));
  if (fmIx >= 0 && toplam) satirlar[fmIx] = `guncelleme: ${bugun}`;
  writeFileSync(yol, satirlar.join("\n"));
}
console.log(`${toplam} görev ${AC ? "açıldı" : "kapatıldı"}. Sırada: sh scripts/lab/gunluk.sh · git -C ~/dev/vault add -A && git -C ~/dev/vault commit -m "görevler" && git -C ~/dev/vault push`);
