/* Tarayıcı render motorunu (../js) Node'da çalıştırır: @napi-rs/canvas + küçük window/document shim.
   Tek giriş: renderSet(spec) → PNG dosyaları. */
import { createCanvas, loadImage, GlobalFonts, Image } from '@napi-rs/canvas';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const JS = path.join(here, '..', 'js');
const FONTS_DIR = path.join(here, 'fonts');

let ctx = null;
function engine() {
  if (ctx) return ctx;
  // fontlar (npm run fonts ile indirilir; yoksa sistem fontlarına düşer)
  if (fs.existsSync(FONTS_DIR)) {
    for (const f of fs.readdirSync(FONTS_DIR)) {
      if (/\.(ttf|otf)$/i.test(f)) { try { GlobalFonts.registerFromPath(path.join(FONTS_DIR, f)); } catch (e) { /* atla */ } }
    }
  }
  const win = {};
  win.window = win;
  win.console = console;
  win.Image = Image;
  win.document = {
    createElement: (tag) => { if (tag !== 'canvas') throw new Error('shim: ' + tag); return createCanvas(1, 1); },
    fonts: null,
  };
  win.navigator = { language: 'tr' };
  win.localStorage = { getItem: () => null, setItem: () => {} };
  vm.createContext(win);
  for (const f of ['i18n.js', 'frames.js', 'model.js', 'render.js', 'templates.js']) {
    vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), win, { filename: f });
  }
  ctx = win;
  return win;
}

export function listTemplates() {
  const w = engine();
  return w.TEMPLATES.map((t) => ({
    key: t.key, name: t.name, description: t.cat, tags: t.tags || [], slides: t.slides.length,
    panorama: !!t.template.panorama, font: t.template.font, accent: t.template.accent || null,
  }));
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
async function img(p) {
  if (!p) return null;
  if (/^data:/.test(p)) return loadImage(Buffer.from(p.split(',')[1], 'base64'));
  return loadImage(fs.readFileSync(p));
}

/**
 * spec = {
 *   template: 'indie', name, lang: 'tr', accent?: '#hex', lines: ['Başlık [vurgu] | Alt', ...],
 *   shots: ['01.png', ...] (dosya yolu ya da data URL), icon?, rating?, addIcon?: true, frame?: 'android',
 *   sizes: ['1290x2796'], outDir: './out'
 * }
 * → { files: [...], slides: n }
 */
export async function renderSet(spec) {
  const w = engine();
  const { Model, Render, TEMPLATES } = w;
  const tpl = TEMPLATES.find((t) => t.key === (spec.template || 'indie'));
  if (!tpl) throw new Error('unknown template: ' + spec.template);
  const lines = (spec.lines || []).map((x) => String(x).trim()).filter(Boolean);
  const shots = spec.shots || [];
  const n = Math.max(lines.length, shots.length, spec.count || 0) || tpl.slides.length;

  Model.textLang = ['tr', 'en'].includes(spec.lang) ? spec.lang : 'en';
  const rows = [];
  for (let i = 0; i < n; i++) {
    const base = tpl.slides[Math.min(i, tpl.slides.length - 1)];
    const row = Object.assign({}, base);
    if (i >= tpl.slides.length) { row.title = ''; row.subtitle = ''; }
    rows.push(row);
  }
  const slides = [];
  Model.applyVariantToSlides(slides, { template: tpl.template, slides: rows }, { appName: spec.name || '' });
  Model.textLang = null;

  lines.forEach((ln, i) => {
    const [a, b] = ln.split('|').map((x) => (x || '').trim());
    slides[i].text.title = a.replace(/\\n/g, '\n');
    slides[i].text.sub = b || '';
  });
  const accent = spec.accent || slides[0].text.accent;
  const images = [];
  for (let i = 0; i < slides.length; i++) {
    slides[i].shot = shots[i] || null;
    images[i] = { shot: await img(shots[i]), shot2: null, bg: null, icon: await img(spec.icon) };
    if (spec.accent) slides[i].text.accent = spec.accent;
    if (spec.frame && slides[i].device.frame !== 'none' && slides[i].device.frame !== 'hidden') slides[i].device.frame = spec.frame;
    slides[i].stickers.forEach((st) => { if (st.type === 'icon' || st.type === 'note') st.iconBg = accent; });
  }
  // 1. slayt: ikon + ad, puan
  const first = slides[0];
  const light = Render.contrastFor(first.text.color) === '#111214';
  first.stickers = first.stickers.filter((st) => st.type !== 'rating' && st.type !== 'icon'); // şablonun yer tutucu puanı/ikonu değil, gerçek olan
  if (spec.addIcon !== false && spec.name) {
    if (first.text.y <= 50) first.text.y = Math.min(90, first.text.y + 6);
    first.stickers.push(Object.assign({ type: 'icon', opacity: 100 }, Model.STICKER_DEFAULTS.icon, { text: spec.name, y: first.text.y > 50 ? 4 : Math.max(2, first.text.y - 10), iconBg: accent, color: first.text.color }));
  }
  if (spec.rating) {
    let ry = first.text.y > 50 ? 6 : first.text.y + 13;
    const lau = first.stickers.find((st) => st.type === 'laurel' && Math.abs(st.y - ry) < 9);
    if (lau) ry = lau.y + 10;
    first.stickers.push(Object.assign({ type: 'rating', opacity: 100 }, Model.STICKER_DEFAULTS.rating, { text: spec.rating, y: ry, bg: light ? '#ffffff' : '#111214', color: light ? '#111214' : '#ffffff' }));
  }

  const sizes = spec.sizes && spec.sizes.length ? spec.sizes : ['1290x2796'];
  const outDir = path.resolve(spec.outDir || './store-screenshots');
  const pan = tpl.template.panorama && slides.length > 1 ? { n: slides.length, bg: slides[0].bg } : null;
  const slug = (x) => (x || 'ekran').toLowerCase().replace(/[ıİ]/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'ekran';
  const files = [];
  for (const sz of sizes) {
    const [W, H] = sz.split('x').map(Number);
    const dir = sizes.length > 1 ? path.join(outDir, sz) : outDir;
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < slides.length; i++) {
      const c = createCanvas(W, H);
      Render.renderSlide(c.getContext('2d'), W, H, slides[i], images[i], pan ? Object.assign({ i }, pan) : null);
      const file = path.join(dir, `${String(i + 1).padStart(2, '0')}-${slug(slides[i].text.title)}.png`);
      fs.writeFileSync(file, await c.encode('png'));
      files.push(file);
    }
  }
  return { files, slides: slides.length, outDir, template: tpl.key };
}

/** Tarayıcı aracına sürüklenebilen paket (.json) — render etmeden. */
export function buildPackage(spec) {
  const toData = (p) => (/^data:/.test(p) ? p : `data:${MIME[path.extname(p).toLowerCase()] || 'image/png'};base64,${fs.readFileSync(p).toString('base64')}`);
  const pkg = {
    quick: { name: spec.name || '', lang: spec.lang || 'tr', accent: spec.accent || '#6366f1', template: spec.template || 'indie', lines: spec.lines || [], rating: spec.rating || '', addIcon: spec.addIcon !== false },
    shots: (spec.shots || []).map((p) => ({ name: path.basename(p), data: toData(p) })),
  };
  if (spec.icon) pkg.icon = toData(spec.icon);
  return pkg;
}
