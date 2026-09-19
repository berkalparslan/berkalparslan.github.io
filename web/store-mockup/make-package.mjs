#!/usr/bin/env node
/*
  Store Mockup Studio için paket üretir: ekran görüntüleri + metinler + profil → tek .json.
  Çıkan dosyayı araca sürükle-bırak (ya da ⋯ → Proje yükle): set kurulur, zip alınır.

  Kullanım:
    node make-package.mjs --app "Wallet Coach" --shots ./ss --lines ./lines.txt \
      [--template indie] [--accent "#16a34a"] [--lang tr] [--rating "4.8 · 1.2K değerlendirme"] \
      [--icon ./icon.png] [--no-icon] [--out ./wallet-coach.paket.json]

  lines.txt: her satır bir slayt → "Başlık | Alt başlık". Başlıkta tek vurgu: [köşeli].
             İki satırlı başlık için \n yaz. Satır sayısı = slayt sayısı; ss'ler sırayla oturur.
  --shots: klasör (png/jpg, dosya adına göre sıralanır) ya da virgülle ayrılmış dosya listesi.
  Şablon anahtarları: indie ledger owl calm neutral track glass strip lux paper lime
                      court lingo pluto astra mono editorial neon sunset duo grid ocean night
*/
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) continue;
  const k = a.slice(2);
  const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  args[k] = v;
}

const need = (k) => { if (!args[k]) { console.error(`--${k} gerekli`); process.exit(1); } return args[k]; };
const app = need('app');
const shotsArg = need('shots');

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const toDataUrl = (file) => {
  const ext = extname(file).toLowerCase();
  const mime = MIME[ext];
  if (!mime) throw new Error(`desteklenmeyen görsel: ${file}`);
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`;
};

let shotFiles;
if (statSync(shotsArg, { throwIfNoEntry: false })?.isDirectory()) {
  shotFiles = readdirSync(shotsArg)
    .filter((f) => MIME[extname(f).toLowerCase()])
    .sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }))
    .map((f) => join(shotsArg, f));
} else {
  shotFiles = shotsArg.split(',').map((x) => x.trim()).filter(Boolean);
}
if (!shotFiles.length) { console.error('ekran görüntüsü bulunamadı'); process.exit(1); }

const lines = args.lines
  ? readFileSync(args.lines, 'utf8').split('\n').map((x) => x.trim()).filter(Boolean)
  : [];
if (lines.length && lines.length !== shotFiles.length) {
  console.warn(`uyarı: ${lines.length} metin satırı, ${shotFiles.length} ekran görüntüsü — sırayla eşleşir, fazlası boş kalır`);
}

const pkg = {
  quick: {
    name: app,
    lang: args.lang || 'tr',
    accent: args.accent || '#6366f1',
    template: args.template || 'indie',
    lines,
    rating: args.rating || '',
    addIcon: !args['no-icon'],
  },
  shots: shotFiles.map((f) => ({ name: basename(f), data: toDataUrl(f) })),
};
if (args.icon) pkg.icon = toDataUrl(args.icon);

const out = resolve(args.out || `${app.toLowerCase().replace(/\s+/g, '-')}.paket.json`);
writeFileSync(out, JSON.stringify(pkg));
console.log(`paket yazıldı: ${out}  (${shotFiles.length} ss, ${lines.length} metin, şablon: ${pkg.quick.template})`);
console.log('→ https://berkalparslan.github.io/web/store-mockup/ sayfasına sürükle-bırak, sonra "Tümünü indir (.zip)".');
