#!/usr/bin/env node
/* CLI: aynı motor, terminalden.
   node cli.mjs render --template indie --name "Wallet Coach" --lines lines.txt --shots ./ss [--icon icon.png]
        [--accent "#16a34a"] [--rating "4.8 · 1.2K"] [--lang tr] [--frame android] [--sizes 1290x2796,1080x1920] [--out ./out]
   node cli.mjs package  (aynı argümanlar, --out paket.json)  → tarayıcıya sürüklenecek paket
   node cli.mjs templates */
import fs from 'node:fs';
import path from 'node:path';
import { listTemplates, renderSet, buildPackage } from './render-node.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i++) {
  if (!rest[i].startsWith('--')) continue;
  const k = rest[i].slice(2);
  const v = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true;
  args[k] = v;
}
const IMG = /\.(png|jpe?g|webp)$/i;
function shotsFrom(arg) {
  if (!arg) return [];
  if (fs.statSync(arg, { throwIfNoEntry: false })?.isDirectory()) {
    return fs.readdirSync(arg).filter((f) => IMG.test(f)).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true })).map((f) => path.join(arg, f));
  }
  return String(arg).split(',').map((x) => x.trim()).filter(Boolean);
}
function spec() {
  return {
    template: args.template || 'indie', name: args.name || '', lang: args.lang || 'tr',
    lines: args.lines ? fs.readFileSync(args.lines, 'utf8').split('\n').map((x) => x.trim()).filter(Boolean) : [],
    shots: shotsFrom(args.shots), icon: args.icon, accent: args.accent, rating: args.rating,
    addIcon: !args['no-icon'], frame: args.frame,
    sizes: args.sizes ? String(args.sizes).split(',') : ['1290x2796'],
    outDir: args.out || './store-screenshots',
  };
}

if (cmd === 'templates') {
  for (const t of listTemplates()) console.log(`${t.key.padEnd(11)} ${(t.name.tr || '').padEnd(12)} ${(t.tags || []).join(',').padEnd(28)} ${t.description.tr || ''}`);
} else if (cmd === 'render') {
  const r = await renderSet(spec());
  console.log(`${r.files.length} PNG → ${r.outDir}`);
  r.files.forEach((f) => console.log('  ' + path.relative(process.cwd(), f)));
} else if (cmd === 'package') {
  const s = spec();
  const out = args.out && args.out.endsWith('.json') ? args.out : `${(s.name || 'store-mockup').toLowerCase().replace(/\s+/g, '-')}.paket.json`;
  fs.writeFileSync(out, JSON.stringify(buildPackage(s)));
  console.log(`paket → ${path.resolve(out)}  (sürükle: https://berkalparslan.github.io/ss)`);
} else {
  console.log('kullanım: node cli.mjs templates | render --template … --name … --lines … --shots … | package …');
  process.exit(1);
}
