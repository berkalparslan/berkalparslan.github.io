/* Store Mockup Studio — uygulama katmanı */
(function () {
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  /* ------------------------------------------------------------------ */
  /* sabitler                                                            */
  /* ------------------------------------------------------------------ */
  const EXPORT_PRESETS = [
    ['App Store 6.9" (iPhone 16 Pro Max)', 1290, 2796],
    ['App Store 6.7"', 1284, 2778],
    ['App Store 6.5"', 1242, 2688],
    ['App Store 5.5"', 1242, 2208],
    ['iPad Pro 12.9"', 2048, 2732],
    ['Play Store telefon', 1080, 1920],
    ['Play Store 1440×2560', 1440, 2560],
    ['Play Store feature graphic', 1024, 500],
    ['Apple Watch', 422, 514],
    ['Wear OS', 475, 475],
    ['Mac App Store', 2880, 1800],
  ];

  const BG_PRESETS = [
    { k: 'indigo', n: 'Indigo', t: 'linear', c1: '#6366f1', c2: '#22d3ee', a: 135 },
    { k: 'sunset', n: 'Gün batımı', t: 'linear', c1: '#ff7e5f', c2: '#feb47b', a: 160 },
    { k: 'purple-night', n: 'Mor gece', t: 'linear', c1: '#241b4b', c2: '#7b2ff7', a: 150 },
    { k: 'mint', n: 'Nane', t: 'linear', c1: '#11998e', c2: '#38ef7d', a: 140 },
    { k: 'ocean', n: 'Okyanus', t: 'linear', c1: '#2193b0', c2: '#6dd5ed', a: 135 },
    { k: 'fire', n: 'Ateş', t: 'linear', c1: '#f12711', c2: '#f5af19', a: 145 },
    { k: 'rose', n: 'Gül', t: 'linear', c1: '#ee9ca7', c2: '#ffdde1', a: 135 },
    { k: 'night', n: 'Gece', t: 'linear', c1: '#0f2027', c2: '#2c5364', a: 160 },
    { k: 'dark', n: 'Koyu', t: 'solid', c1: '#111214', c2: '#111214' },
    { k: 'light', n: 'Açık', t: 'solid', c1: '#f2f2f5', c2: '#f2f2f5' },
    { k: 'cyber-mesh', n: 'Siber mesh', t: 'mesh', c1: '#7c3aed', c2: '#06b6d4', c3: '#0b1020' },
    { k: 'warm-mesh', n: 'Sıcak mesh', t: 'mesh', c1: '#f59e0b', c2: '#ef4444', c3: '#1f1147' },
    { k: 'ice-mesh', n: 'Buz mesh', t: 'mesh', c1: '#38bdf8', c2: '#a78bfa', c3: '#0b1220' },
    { k: 'forest', n: 'Orman', t: 'radial', c1: '#134e4a', c2: '#052e2b' },
    { k: 'cream', n: 'Krem', t: 'linear', c1: '#fdfcfb', c2: '#e2d1c3', a: 140 },
    { k: 'graphite-bg', n: 'Grafit', t: 'radial', c1: '#3a3f4b', c2: '#15171d' },
    { k: 'white', n: 'Beyaz', t: 'solid', c1: '#ffffff', c2: '#ffffff' },
    { k: 'paper', n: 'Kâğıt', t: 'solid', c1: '#f7f6f3', c2: '#f7f6f3' },
    { k: 'black', n: 'Siyah', t: 'solid', c1: '#000000', c2: '#000000' },
    { k: 'deep-violet', n: 'Derin mor', t: 'solid', c1: '#1a1033', c2: '#1a1033' },
    { k: 'lime', n: 'Limon', t: 'solid', c1: '#c8f542', c2: '#c8f542' },
    { k: 'coral', n: 'Mercan', t: 'linear', c1: '#ff4d6d', c2: '#ff8a5b', a: 150 },
    { k: 'aurora', n: 'Aurora', t: 'mesh', c1: '#22d3ee', c2: '#a3e635', c3: '#0f172a' },
    { k: 'peach-mesh', n: 'Şeftali mesh', t: 'mesh', c1: '#fdba74', c2: '#f9a8d4', c3: '#fff7ed' },
  ];

  const LAYOUT_PRESETS = [
    { k: 'text-top', n: 'Metin üstte', p: { 'text.y': 6, 'text.align': 'center', 'device.y': 27, 'device.w': 66, 'device.x': 0, 'device.rot': 0, 'device.above': false } },
    { k: 'text-bottom', n: 'Metin altta', p: { 'text.y': 76, 'text.align': 'center', 'device.y': 4, 'device.w': 62, 'device.x': 0, 'device.rot': 0 } },
    { k: 'bleed', n: 'Taşkın cihaz', p: { 'text.y': 6, 'device.y': 32, 'device.w': 84, 'device.x': 0, 'device.rot': 0 } },
    { k: 'tilt', n: 'Eğik', p: { 'text.y': 6, 'device.y': 30, 'device.w': 64, 'device.x': 0, 'device.rot': -8 } },
    { k: 'right', n: 'Sağa yaslı', p: { 'text.y': 8, 'text.align': 'left', 'device.x': 24, 'device.y': 34, 'device.w': 62, 'device.rot': 7 } },
    { k: 'left', n: 'Sola yaslı', p: { 'text.y': 8, 'text.align': 'right', 'device.x': -24, 'device.y': 34, 'device.w': 62, 'device.rot': -7 } },
    { k: 'small', n: 'Küçük cihaz', p: { 'text.y': 7, 'device.y': 40, 'device.w': 52, 'device.x': 0, 'device.rot': 0 } },
    { k: 'full', n: 'Çerçevesiz tam', p: { 'text.y': 4, 'device.frame': 'none', 'device.w': 100, 'device.x': 0, 'device.y': 0, 'device.rot': 0, 'device.shadow': 0, 'device.fit': 'cover' } },
    { k: 'hero', n: 'Dev cihaz (eğik)', p: { 'text.y': 5, 'text.align': 'center', 'device.y': 30, 'device.w': 96, 'device.x': 6, 'device.rot': -7 } },
    { k: 'span-left', n: 'İki kareye yay · sol', p: { 'text.y': 6, 'text.align': 'center', 'device.y': 30, 'device.w': 92, 'device.x': 46, 'device.rot': 0 } },
    { k: 'span-right', n: 'İki kareye yay · sağ', p: { 'text.y': 6, 'text.align': 'center', 'device.y': 30, 'device.w': 92, 'device.x': -46, 'device.rot': 0 } },
    { k: 'text-only', n: 'Sadece metin', p: { 'text.y': 40, 'text.align': 'center', 'device.frame': 'hidden' } },
  ];

  const FRAME_OPTS = Object.entries(window.Frames.FRAMES).map(([k, v]) => [k, v.label]);
  const COLOR_OPTS = [
    ['graphite', 'Grafit'], ['black', 'Siyah'], ['silver', 'Gümüş'],
    ['gold', 'Altın'], ['blue', 'Mavi'], ['white', 'Beyaz'],
  ];
  const FONT_OPTS = [
    ['system', 'Sistem (SF Pro)'], ['inter', 'Inter'], ['manrope', 'Manrope'], ['plus-jakarta', 'Plus Jakarta Sans'],
    ['outfit', 'Outfit'], ['sora', 'Sora'], ['space-grotesk', 'Space Grotesk'], ['bricolage', 'Bricolage Grotesque'],
    ['nunito', 'Nunito (yuvarlak)'], ['unbounded', 'Unbounded (geniş)'], ['bebas', 'Bebas Neue (dar, büyük harf)'],
    ['playfair', 'Playfair Display (serif)'], ['fraunces', 'Fraunces (serif)'], ['dm-serif', 'DM Serif Display'],
    ['instrument-serif', 'Instrument Serif'], ['georgia', 'Georgia'], ['helvetica-neue', 'Helvetica Neue'],
    ['avenir', 'Avenir Next'], ['futura', 'Futura'], ['times', 'Times'], ['courier', 'Courier'], ['impact', 'Impact'],
    ['custom', 'Yüklenen font'],
  ];

  const STICKER_TYPES = [
    ['pill', 'Çip (emoji + metin)'], ['rating', 'Puan (yıldızlar)'], ['laurel', 'Laurel (ödül)'],
    ['note', 'Bildirim kartı'], ['icon', 'Uygulama ikonu + ad'], ['text', 'Serbest metin'],
    ['arrow', 'Ok'], ['ring', 'Halka'],
  ];
  const STICKER_DEFAULTS = {
    pill: { text: '7 gün seri', emoji: '🔥', x: 28, y: 46, size: 3.2, rot: -6, bg: '#ffffff', color: '' },
    rating: { text: '4.9 · 12K değerlendirme', x: 0, y: 21, size: 2.6, rot: 0, bg: '#ffffff', color: '' },
    laurel: { text: 'Günün\nUygulaması', sub: 'App Store', x: 0, y: 12, size: 2.4, rot: 0, color: '' },
    note: { text: 'Hedefe ulaştın', sub: 'Bugün 2.400 adım fazla', time: 'şimdi', x: 0, y: 84, size: 2.6, w: 74, rot: 0, bg: '#ffffff', color: '' },
    icon: { text: 'Uygulama', emoji: '', x: 0, y: 8, size: 3, rot: 0, iconBg: '#6366f1', color: '#ffffff' },
    text: { text: 'Yeni', x: 0, y: 50, size: 4, rot: 0, color: '', weight: 800 },
    arrow: { x: 20, y: 40, size: 3, rot: 0, color: '' },
    ring: { x: 0, y: 50, size: 4, rot: 0, color: '' },
  };

  const DEFAULT_TITLES = ['Başlığını buraya yaz', 'Write your headline here'];
  const defaultTitle = () => t('Başlığını buraya yaz');
  const isDefaultTitle = (x) => DEFAULT_TITLES.includes(x);

  const newSlide = (style) => {
    const base = {
      id: 's' + Math.random().toString(36).slice(2, 9),
      name: '',
      shot: null,
      bg: { type: 'linear', c1: '#6366f1', c2: '#22d3ee', c3: '#0b1020', angle: 135, variant: 0, img: null, blur: 0, dim: 25, pattern: 'none', patternOpacity: 12, patternColor: '#ffffff', noise: 0, vignette: 0 },
      device: { frame: 'iphone-pro', color: 'graphite', w: 66, x: 0, y: 27, rot: 0, shadow: 45, glare: true, homeIndicator: true, fit: 'top', screenBg: '#000000', above: false },
      device2: { on: false, shot: null, frame: 'watch', color: 'silver', w: 24, x: 20, y: 52, rot: 0, shadow: 45, glare: true, homeIndicator: false, fit: 'cover', screenBg: '#000000', front: true },
      text: { title: defaultTitle(), sub: '', align: 'center', color: '#ffffff', subColor: '#ffffff', subOpacity: 85, font: 'system', weight: 700, subWeight: 400, titleSize: 6.2, subSize: 3.4, y: 6, pad: 9, lineHeight: 1.15, letterSpacing: 0, shadow: false, accent: '#ffd60a', hlStyle: 'color', box: 'none', boxColor: '#ffffff', boxOpacity: 100, boxRadius: 3 },
      stickers: [],
    };
    if (style) {
      base.bg = JSON.parse(JSON.stringify(style.bg));
      base.device = JSON.parse(JSON.stringify(style.device));
      base.text = JSON.parse(JSON.stringify(style.text));
      base.text.title = '';
      base.text.sub = '';
    }
    return base;
  };
  /* eski kayıtlarla uyum: yeni alanları tamamla */
  const upgradeSlide = (s) => {
    const fresh = newSlide();
    const out = Object.assign(fresh, s);
    out.text = Object.assign(fresh.text, s.text || {});
    out.device = Object.assign(fresh.device, s.device || {});
    out.device2 = Object.assign(fresh.device2, s.device2 || {});
    out.bg = Object.assign(fresh.bg, s.bg || {});
    if (!Array.isArray(out.stickers)) out.stickers = [];
    return out;
  };

  /* ------------------------------------------------------------------ */
  /* durum                                                               */
  /* ------------------------------------------------------------------ */
  const state = {
    exp: { w: 1290, h: 2796, format: 'png', quality: 0.95 },
    slides: [newSlide()],
    cur: 0,
    tab: 'layout',
    appDesc: '',
    lang: 'tr',
    screens: '',
    customFont: null,
    panorama: false,
    setView: false,
    sticker: 0,          // seçili öğe indeksi
    app: { name: '', lang: 'tr', accent: '#6366f1', icon: null }, // uygulama profili
    appId: null,         // kayıtlı uygulama anahtarı
  };
  const pan = (i) => (state.panorama && state.slides.length > 1 ? { i, n: state.slides.length, bg: state.slides[0].bg } : null);

  const cur = () => state.slides[state.cur];

  /* ---- geçmiş: dizeler referansla taşınır, dataURL'ler kopyalanmaz ---- */
  function clone(v) {
    if (Array.isArray(v)) return v.map(clone);
    if (v && typeof v === 'object') {
      const o = {};
      for (const k in v) o[k] = clone(v[k]);
      return o;
    }
    return v;
  }

  const HISTORY_MAX = 60;
  const undoStack = [];
  const redoStack = [];
  let lastKey = null, lastAt = 0;

  /** Değişiklikten ÖNCE çağrılır. Aynı anahtar 900 ms içinde tekrar gelirse tek adım sayılır. */
  function snapshot(key) {
    const now = Date.now();
    if (key && key === lastKey && now - lastAt < 900) { lastAt = now; return; }
    lastKey = key; lastAt = now;
    undoStack.push({ slides: clone(state.slides), cur: state.cur });
    if (undoStack.length > HISTORY_MAX) undoStack.shift();
    redoStack.length = 0;
    updateHistoryUI();
  }

  function restore(entry) {
    state.slides = clone(entry.slides);
    state.cur = Math.max(0, Math.min(entry.cur, state.slides.length - 1));
    lastKey = null;
    refreshAll();
    updateHistoryUI();
  }

  function undo() {
    if (!undoStack.length) return toast(t('Geri alınacak bir şey yok'));
    redoStack.push({ slides: clone(state.slides), cur: state.cur });
    restore(undoStack.pop());
    toast(t('Geri alındı'));
  }

  function redo() {
    if (!redoStack.length) return toast(t('İleri alınacak bir şey yok'));
    undoStack.push({ slides: clone(state.slides), cur: state.cur });
    restore(redoStack.pop());
    toast(t('İleri alındı'));
  }

  function updateHistoryUI() {
    const u = document.getElementById('btnUndo'), r = document.getElementById('btnRedo');
    if (u) u.disabled = !undoStack.length;
    if (r) r.disabled = !redoStack.length;
  }
  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setP = (o, p, v) => {
    const ks = p.split('.');
    const last = ks.pop();
    ks.reduce((a, k) => a[k], o)[last] = v;
  };

  /* ------------------------------------------------------------------ */
  /* render                                                              */
  /* ------------------------------------------------------------------ */
  const PREVIEW_W = 640;
  const previewCanvas = $('#preview');
  let rafId = null;

  function imagesFor(s) {
    return {
      shot: window.Store.imageFor(s.shot),
      shot2: window.Store.imageFor(s.device2 && s.device2.shot),
      bg: window.Store.imageFor(state.panorama ? state.slides[0].bg.img : s.bg.img),
      icon: window.Store.imageFor(state.app.icon),
    };
  }

  /** Slaytta kullanılan web fontlarını yükler; yeni yüklenen olursa yeniden çizer. */
  function ensureFonts(s) {
    const jobs = [window.Render.ensureFont(s.text.font, s.text.weight), window.Render.ensureFont(s.text.font, s.text.subWeight || 400)];
    (s.stickers || []).forEach((st) => { if (st.font) jobs.push(window.Render.ensureFont(st.font, 700)); });
    Promise.all(jobs).then((r) => { if (r.some(Boolean)) schedule(); });
  }

  const setCanvas = $('#setPreview');
  function renderSet() {
    const n = state.slides.length;
    const gap = 8, cw = 210;
    const ch = Math.round((cw * state.exp.h) / state.exp.w);
    setCanvas.width = n * cw + (n - 1) * gap;
    setCanvas.height = ch;
    const ctx = setCanvas.getContext('2d');
    ctx.clearRect(0, 0, setCanvas.width, ch);
    state.slides.forEach((s, i) => {
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      window.Render.renderSlide(c.getContext('2d'), cw, ch, s, imagesFor(s), pan(i));
      ctx.drawImage(c, i * (cw + gap), 0);
      if (i === state.cur) {
        ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 4;
        ctx.strokeRect(i * (cw + gap) + 2, 2, cw - 4, ch - 4);
      }
    });
  }

  function renderPreview() {
    const s = cur();
    if (!s) return;
    ensureFonts(s);
    previewCanvas.hidden = state.setView;
    setCanvas.hidden = !state.setView;
    if (state.setView) renderSet();
    else {
      const ratio = state.exp.h / state.exp.w;
      const w = Math.min(PREVIEW_W, state.exp.w);
      const h = Math.round(w * ratio);
      previewCanvas.width = w;
      previewCanvas.height = h;
      window.Render.renderSlide(previewCanvas.getContext('2d'), w, h, s, imagesFor(s), pan(state.cur));
    }
    const frame = window.Frames.FRAMES[s.device.frame] || window.Frames.FRAMES['iphone-pro'];
    $('#stageInfo').textContent = `${state.exp.w} × ${state.exp.h} px · ${t(frame.label)}${state.panorama ? ' · ' + t('panorama') : ''}`;
    $('#stageCount').textContent = `${state.cur + 1} / ${state.slides.length}`;
    $('#btnSetView').classList.toggle('active', state.setView);
  }

  function renderThumbs() {
    const list = $('#slideList');
    list.innerHTML = '';
    state.slides.forEach((s, i) => {
      const item = el('div', 'slide-item' + (i === state.cur ? ' sel' : ''));
      const c = el('canvas');
      const w = 148;
      const h = Math.round((w * state.exp.h) / state.exp.w);
      c.width = w; c.height = h;
      window.Render.renderSlide(c.getContext('2d'), w, h, s, imagesFor(s), pan(i));
      item.appendChild(c);
      item.appendChild(el('span', 'num', String(i + 1)));
      const mv = el('div', 'mv');
      const up = el('button', null, '↑');
      const dn = el('button', null, '↓');
      up.onclick = (e) => { e.stopPropagation(); move(i, -1); };
      dn.onclick = (e) => { e.stopPropagation(); move(i, 1); };
      mv.append(up, dn);
      item.appendChild(mv);
      item.onclick = () => { state.cur = i; refreshAll(); };
      list.appendChild(item);
    });
  }

  function schedule() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      renderPreview();
      renderThumbs();
      autosave();
    });
  }

  function refreshAll() {
    renderPreview();
    renderThumbs();
    buildPanel();
    autosave();
  }

  function move(i, d) {
    const j = i + d;
    if (j < 0 || j >= state.slides.length) return;
    snapshot('move');
    const [x] = state.slides.splice(i, 1);
    state.slides.splice(j, 0, x);
    state.cur = j;
    refreshAll();
  }

  /* ------------------------------------------------------------------ */
  /* kontrol paneli (şema tabanlı)                                       */
  /* ------------------------------------------------------------------ */
  const SCHEMA = {
    layout: [
      { type: 'section', label: 'Hazır düzenler' },
      { type: 'layoutPresets' },
      { type: 'section', label: 'Cihaz' },
      { k: 'device.frame', type: 'select', label: 'Çerçeve', opts: FRAME_OPTS },
      { k: 'device.color', type: 'select', label: 'Gövde rengi', opts: COLOR_OPTS, when: (s) => s.device.frame !== 'none' },
      { type: 'section', label: 'Yerleşim' },
      { k: 'device.w', type: 'range', label: 'Cihaz boyutu', min: 20, max: 130, step: 0.5, unit: '%' },
      { k: 'device.y', type: 'range', label: 'Cihaz dikey konum', min: -30, max: 100, step: 0.5, unit: '%' },
      { k: 'device.x', type: 'range', label: 'Cihaz yatay konum', min: -60, max: 60, step: 0.5, unit: '%' },
      { k: 'device.rot', type: 'range', label: 'Eğim', min: -30, max: 30, step: 0.5, unit: '°' },
      { k: 'text.y', type: 'range', label: 'Metin dikey konum', min: 0, max: 95, step: 0.5, unit: '%' },
      { k: 'text.pad', type: 'range', label: 'Kenar boşluğu', min: 0, max: 25, step: 0.5, unit: '%' },
      { k: 'device.above', type: 'check', label: 'Cihaz metnin üstünde çizilsin' },
      { type: 'section', label: 'Set' },
      { type: 'globalCheck', k: 'panorama', label: 'Panoramik arka plan (1. slaytın arka planı tüm kareler boyunca akar)' },
      { type: 'hint', label: 'Panorama için cihazı bir karede sağa, sonrakinde sola taşır ("İki kareye yay" düzenleri) — App Store galerisinde tek parça görünür.' },
    ],
    bg: [
      { type: 'section', label: 'Hazır arka planlar' },
      { type: 'bgPresets' },
      { type: 'section', label: 'Ayarlar' },
      { k: 'bg.type', type: 'select', label: 'Tür', opts: [['solid', 'Düz renk'], ['linear', 'Doğrusal gradyan'], ['radial', 'Radyal gradyan'], ['mesh', 'Mesh gradyan'], ['image', 'Görsel']] },
      { k: 'bg.c1', type: 'color', label: 'Renk 1', when: (s) => s.bg.type !== 'image' },
      { k: 'bg.c2', type: 'color', label: 'Renk 2', when: (s) => ['linear', 'radial', 'mesh'].includes(s.bg.type) },
      { k: 'bg.c3', type: 'color', label: 'Renk 3', when: (s) => s.bg.type === 'mesh' },
      { k: 'bg.angle', type: 'range', label: 'Açı', min: 0, max: 360, step: 1, unit: '°', when: (s) => s.bg.type === 'linear' },
      { k: 'bg.variant', type: 'range', label: 'Mesh varyasyonu', min: 0, max: 3, step: 1, when: (s) => s.bg.type === 'mesh' },
      { type: 'button', label: 'Arka plan görseli seç', act: 'pick-bg', when: (s) => s.bg.type === 'image' },
      { type: 'button', label: 'Arka plan görselini kaldır', act: 'clear-bg', when: (s) => s.bg.type === 'image' && !!s.bg.img },
      { k: 'bg.blur', type: 'range', label: 'Bulanıklık', min: 0, max: 100, step: 1, when: (s) => s.bg.type === 'image' },
      { k: 'bg.dim', type: 'range', label: 'Karartma', min: 0, max: 90, step: 1, unit: '%', when: (s) => s.bg.type === 'image' },
      { type: 'section', label: 'Doku' },
      { k: 'bg.pattern', type: 'select', label: 'Desen', opts: [['none', 'Yok'], ['dots', 'Noktalar'], ['grid', 'Izgara'], ['diagonal', 'Çapraz çizgi'], ['rings', 'Halkalar'], ['waves', 'Dalgalar'], ['cross', 'Artılar']] },
      { k: 'bg.patternColor', type: 'color', label: 'Desen rengi', when: (s) => s.bg.pattern !== 'none' },
      { k: 'bg.patternOpacity', type: 'range', label: 'Desen opaklığı', min: 0, max: 60, step: 1, unit: '%', when: (s) => s.bg.pattern !== 'none' },
      { k: 'bg.noise', type: 'range', label: 'Grain / kumlanma', min: 0, max: 40, step: 1, unit: '%' },
      { k: 'bg.vignette', type: 'range', label: 'Vinyet', min: 0, max: 80, step: 1, unit: '%' },
    ],
    device: [
      { type: 'section', label: 'Ekran görüntüsü' },
      { type: 'button', label: 'Görsel seç / değiştir', act: 'pick-shot', primary: true },
      { type: 'button', label: 'Görseli kaldır', act: 'clear-shot', when: (s) => !!s.shot },
      { k: 'device.fit', type: 'seg', label: 'Sığdırma', opts: [['top', 'Üstten'], ['cover', 'Doldur'], ['contain', 'Sığdır']] },
      { k: 'device.screenBg', type: 'color', label: 'Ekran arka planı (boşluk rengi)' },
      { type: 'section', label: 'Çerçeve' },
      { k: 'device.frame', type: 'select', label: 'Model', opts: FRAME_OPTS },
      { k: 'device.color', type: 'select', label: 'Gövde rengi', opts: COLOR_OPTS, when: (s) => s.device.frame !== 'none' },
      { k: 'device.shadow', type: 'range', label: 'Gölge', min: 0, max: 100, step: 1, unit: '%' },
      { k: 'device.glare', type: 'check', label: 'Cam parlaması', when: (s) => s.device.frame !== 'none' },
      { k: 'device.homeIndicator', type: 'check', label: 'Alt çubuk (home indicator)' },
      { type: 'section', label: 'Konum' },
      { k: 'device.w', type: 'range', label: 'Boyut', min: 20, max: 130, step: 0.5, unit: '%' },
      { k: 'device.y', type: 'range', label: 'Dikey', min: -30, max: 100, step: 0.5, unit: '%' },
      { k: 'device.x', type: 'range', label: 'Yatay', min: -60, max: 60, step: 0.5, unit: '%' },
      { k: 'device.rot', type: 'range', label: 'Eğim', min: -30, max: 30, step: 0.5, unit: '°' },
      { type: 'section', label: 'İkinci cihaz' },
      { k: 'device2.on', type: 'check', label: 'İkinci cihaz ekle (ör. telefon + saat)' },
      { type: 'button', label: 'İkinci cihazın görselini seç', act: 'pick-shot2', when: (s) => s.device2.on },
      { type: 'button', label: 'İkinci görseli kaldır', act: 'clear-shot2', when: (s) => s.device2.on && !!s.device2.shot },
      { k: 'device2.frame', type: 'select', label: 'Model', opts: FRAME_OPTS, when: (s) => s.device2.on },
      { k: 'device2.color', type: 'select', label: 'Gövde rengi', opts: COLOR_OPTS, when: (s) => s.device2.on && s.device2.frame !== 'none' },
      { k: 'device2.fit', type: 'seg', label: 'Sığdırma', opts: [['top', 'Üstten'], ['cover', 'Doldur'], ['contain', 'Sığdır']], when: (s) => s.device2.on },
      { k: 'device2.front', type: 'check', label: 'Ana cihazın önünde dursun', when: (s) => s.device2.on },
      { k: 'device2.w', type: 'range', label: 'Boyut', min: 8, max: 90, step: 0.5, unit: '%', when: (s) => s.device2.on },
      { k: 'device2.y', type: 'range', label: 'Dikey', min: -20, max: 100, step: 0.5, unit: '%', when: (s) => s.device2.on },
      { k: 'device2.x', type: 'range', label: 'Yatay', min: -60, max: 60, step: 0.5, unit: '%', when: (s) => s.device2.on },
      { k: 'device2.rot', type: 'range', label: 'Eğim', min: -30, max: 30, step: 0.5, unit: '°', when: (s) => s.device2.on },
      { k: 'device2.shadow', type: 'range', label: 'Gölge', min: 0, max: 100, step: 1, unit: '%', when: (s) => s.device2.on },
    ],
    text: [
      { type: 'section', label: 'İçerik' },
      { k: 'text.title', type: 'textarea', label: 'Başlık (Enter = alt satır)' },
      { k: 'text.sub', type: 'textarea', label: 'Alt başlık' },
      { type: 'section', label: 'Tipografi' },
      { k: 'text.font', type: 'select', label: 'Font', opts: FONT_OPTS },
      { type: 'button', label: 'Kendi fontunu yükle (.ttf/.otf/.woff2)', act: 'pick-font' },
      { k: 'text.align', type: 'seg', label: 'Hizalama', opts: [['left', 'Sol'], ['center', 'Orta'], ['right', 'Sağ']] },
      { k: 'text.weight', type: 'select', label: 'Başlık kalınlığı', opts: [[300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semibold'], [700, 'Bold'], [800, 'Extrabold'], [900, 'Black']] },
      { k: 'text.titleSize', type: 'range', label: 'Başlık boyutu', min: 1, max: 16, step: 0.1, unit: '%' },
      { k: 'text.subSize', type: 'range', label: 'Alt başlık boyutu', min: 1, max: 12, step: 0.1, unit: '%' },
      { k: 'text.lineHeight', type: 'range', label: 'Satır aralığı', min: 0.85, max: 2, step: 0.01 },
      { k: 'text.letterSpacing', type: 'range', label: 'Harf aralığı', min: -6, max: 20, step: 0.5, unit: '%' },
      { type: 'section', label: 'Renk' },
      { k: 'text.color', type: 'color', label: 'Başlık rengi' },
      { k: 'text.subColor', type: 'color', label: 'Alt başlık rengi' },
      { k: 'text.subOpacity', type: 'range', label: 'Alt başlık opaklığı', min: 10, max: 100, step: 1, unit: '%' },
      { k: 'text.shadow', type: 'check', label: 'Metin gölgesi' },
      { type: 'section', label: 'Vurgu' },
      { type: 'hint', label: 'Başlıkta [köşeli parantez] içine aldığın kelimeler vurgu rengiyle çizilir: "Paranı [gör]"' },
      { k: 'text.accent', type: 'color', label: 'Vurgu rengi' },
      { k: 'text.hlStyle', type: 'seg', label: 'Vurgu biçimi', opts: [['color', 'Renk'], ['marker', 'Fosforlu'], ['underline', 'Alt çizgi']] },
      { type: 'section', label: 'Metin kutusu' },
      { k: 'text.box', type: 'seg', label: 'Kutu', opts: [['none', 'Yok'], ['solid', 'Dolu'], ['glass', 'Cam'], ['outline', 'Çerçeve']] },
      { k: 'text.boxColor', type: 'color', label: 'Kutu rengi', when: (s) => ['solid', 'outline'].includes(s.text.box) },
      { k: 'text.boxOpacity', type: 'range', label: 'Kutu opaklığı', min: 10, max: 100, step: 1, unit: '%', when: (s) => s.text.box && s.text.box !== 'none' },
      { k: 'text.boxRadius', type: 'range', label: 'Köşe yuvarlaklığı', min: 0, max: 12, step: 0.5, unit: '%', when: (s) => s.text.box && s.text.box !== 'none' },
    ],
    items: [
      { type: 'section', label: 'Öğeler' },
      { type: 'hint', label: 'Sosyal kanıt ve dikkat çekiciler: puan rozeti, ödül laureli, özellik çipi, bildirim kartı. Her slaytta 1-2 tane yeter.' },
      { type: 'stickerAdd' },
      { type: 'stickerList' },
      { type: 'stickerEditor' },
    ],
  };

  const STICKER_SCHEMA = (st) => {
    const T = st.type;
    const rows = [];
    const has = (...k) => k.includes(T);
    if (has('pill', 'rating', 'laurel', 'note', 'icon', 'text')) rows.push({ k: 'text', type: has('laurel', 'text') ? 'textarea' : 'text', label: T === 'rating' ? 'Puan metni' : T === 'icon' ? 'Uygulama adı' : 'Metin' });
    if (has('laurel', 'note')) rows.push({ k: 'sub', type: 'text', label: T === 'laurel' ? 'Üst etiket (küçük)' : 'Alt metin' });
    if (has('note')) rows.push({ k: 'time', type: 'text', label: 'Saat (sağ üst)' });
    if (has('pill', 'note', 'icon')) rows.push({ k: 'emoji', type: 'text', label: 'Emoji' });
    if (has('pill', 'rating', 'note')) rows.push({ k: 'bg', type: 'color', label: 'Arka plan' });
    if (has('icon', 'note')) rows.push({ k: 'iconBg', type: 'color', label: 'İkon rengi (görsel yoksa)' });
    if (has('pill', 'rating', 'note', 'laurel', 'icon', 'text', 'arrow', 'ring')) rows.push({ k: 'color', type: 'color', label: 'Metin / çizgi rengi' });
    if (has('rating')) rows.push({ k: 'starColor', type: 'color', label: 'Yıldız rengi' });
    if (has('pill')) rows.push({ k: 'outline', type: 'check', label: 'Kenarlık' });
    if (has('note')) rows.push({ k: 'w', type: 'range', label: 'Genişlik', min: 30, max: 100, step: 1, unit: '%' });
    rows.push({ k: 'size', type: 'range', label: 'Boyut', min: 1, max: 12, step: 0.1, unit: '%' });
    rows.push({ k: 'x', type: 'range', label: 'Yatay', min: -60, max: 60, step: 0.5, unit: '%' });
    rows.push({ k: 'y', type: 'range', label: 'Dikey', min: -10, max: 110, step: 0.5, unit: '%' });
    rows.push({ k: 'rot', type: 'range', label: 'Eğim', min: -45, max: 45, step: 0.5, unit: '°' });
    rows.push({ k: 'opacity', type: 'range', label: 'Opaklık', min: 10, max: 100, step: 1, unit: '%' });
    rows.push({ k: 'font', type: 'select', label: 'Font', opts: FONT_OPTS });
    return rows;
  };

  let panelRows = [];

  function buildPanel() {
    const body = $('#panelBody');
    body.innerHTML = '';
    panelRows = [];
    const s = cur();

    // öğe düzenleyici: seçili öğenin alanlarını şemaya genişlet
    const defs = [];
    for (const d of SCHEMA[state.tab]) {
      if (d.type === 'stickerEditor') {
        const st = (s.stickers || [])[state.sticker];
        if (st) {
          defs.push({ type: 'section', label: 'Seçili öğe' });
          STICKER_SCHEMA(st).forEach((r) => defs.push(Object.assign({}, r, { k: `stickers.${state.sticker}.${r.k}` })));
          defs.push({ type: 'stickerActions' });
        }
      } else defs.push(d);
    }

    for (const def of defs) {
      let node;
      if (def.type === 'section') {
        node = el('div', 'section-title', t(def.label));
      } else if (def.type === 'hint') {
        node = el('p', 'hint', t(def.label));
      } else if (def.type === 'globalCheck') {
        const wrap = el('label', 'check');
        const c = el('input');
        c.type = 'checkbox';
        c.checked = !!state[def.k];
        c.onchange = () => { state[def.k] = c.checked; refreshAll(); };
        wrap.append(c, el('span', null, t(def.label)));
        node = el('div', 'row');
        node.appendChild(wrap);
      } else if (def.type === 'stickerAdd') {
        node = el('div', 'presets');
        STICKER_TYPES.forEach(([k, l]) => {
          const b = el('button', 'btn tiny', t(l));
          b.onclick = () => { addSticker(k); };
          node.appendChild(b);
        });
      } else if (def.type === 'stickerList') {
        node = el('div', 'sticker-list');
        (s.stickers || []).forEach((st, i) => {
          const b = el('button', 'sticker-item' + (i === state.sticker ? ' sel' : ''));
          const label = STICKER_TYPES.find(([k]) => k === st.type);
          b.innerHTML = `<b>${t(label ? label[1] : st.type).split(' (')[0]}</b><span>${(st.text || st.sub || '').toString().replace(/\n/g, ' ').slice(0, 26)}</span>`;
          b.onclick = () => { state.sticker = i; buildPanel(); };
          node.appendChild(b);
        });
      } else if (def.type === 'stickerActions') {
        node = el('div', 'presets');
        const dup = el('button', 'btn tiny', t('Öğeyi kopyala'));
        dup.onclick = () => {
          snapshot('sticker-dup');
          const c = JSON.parse(JSON.stringify(s.stickers[state.sticker]));
          c.x = (c.x || 0) + 6; c.y = (c.y || 0) + 4;
          s.stickers.splice(state.sticker + 1, 0, c);
          state.sticker++;
          refreshAll();
        };
        const all = el('button', 'btn tiny', t('Tüm slaytlara ekle'));
        all.onclick = () => {
          snapshot('sticker-all');
          const c = s.stickers[state.sticker];
          state.slides.forEach((sl) => { if (sl !== s) sl.stickers.push(JSON.parse(JSON.stringify(c))); });
          refreshAll();
          toast(t('Öğe tüm slaytlara eklendi'));
        };
        const del = el('button', 'btn tiny danger', t('Öğeyi sil'));
        del.onclick = () => {
          snapshot('sticker-del');
          s.stickers.splice(state.sticker, 1);
          state.sticker = Math.max(0, state.sticker - 1);
          refreshAll();
        };
        node.append(dup, all, del);
      } else if (def.type === 'layoutPresets') {
        node = el('div', 'presets');
        LAYOUT_PRESETS.forEach((p) => {
          const b = el('button', 'btn tiny', t(p.n));
          b.onclick = () => {
            snapshot('layout:' + p.k);
            Object.entries(p.p).forEach(([k, v]) => setP(cur(), k, v));
            refreshAll();
          };
          node.appendChild(b);
        });
      } else if (def.type === 'bgPresets') {
        node = el('div', 'swatches');
        BG_PRESETS.forEach((p) => {
          const b = el('div', 'swatch');
          b.title = t(p.n);
          b.style.background =
            p.t === 'solid' ? p.c1
              : p.t === 'mesh' ? `radial-gradient(circle at 20% 20%, ${p.c1}, transparent 60%), radial-gradient(circle at 80% 70%, ${p.c2}, transparent 60%), ${p.c3}`
                : p.t === 'radial' ? `radial-gradient(circle at 50% 35%, ${p.c1}, ${p.c2})`
                  : `linear-gradient(${p.a || 135}deg, ${p.c1}, ${p.c2})`;
          b.onclick = () => {
            snapshot('bgpreset');
            const bg = cur().bg;
            bg.type = p.t; bg.c1 = p.c1; bg.c2 = p.c2 || p.c1;
            if (p.c3) bg.c3 = p.c3;
            if (p.a != null) bg.angle = p.a;
            const light = luminance(p.c1) > 0.62;
            cur().text.color = light ? '#111214' : '#ffffff';
            cur().text.subColor = light ? '#111214' : '#ffffff';
            refreshAll();
          };
          node.appendChild(b);
        });
      } else if (def.type === 'button') {
        node = el('div', 'row');
        const b = el('button', 'btn tiny wide' + (def.primary ? ' primary' : ''), t(def.label));
        b.onclick = () => actions[def.act]();
        node.appendChild(b);
      } else {
        node = el('div', 'row');
        const val = getP(s, def.k);
        const lbl = el('label', 'lbl');
        lbl.appendChild(el('span', null, t(def.label)));
        const valSpan = el('span', 'val');
        lbl.appendChild(valSpan);
        if (def.type !== 'check') node.appendChild(lbl);

        let input;
        if (def.type === 'range') {
          input = el('input');
          input.type = 'range';
          input.min = def.min; input.max = def.max; input.step = def.step;
          input.value = val;
          valSpan.textContent = fmt(val) + (def.unit || '');
          input.oninput = () => {
            snapshot('ctl:' + def.k);
            setP(cur(), def.k, parseFloat(input.value));
            valSpan.textContent = fmt(input.value) + (def.unit || '');
            schedule();
            refreshVisibility();
          };
        } else if (def.type === 'select') {
          input = el('select');
          def.opts.forEach(([v, l]) => {
            const o = el('option', null, t(l));
            o.value = v;
            input.appendChild(o);
          });
          input.value = val;
          input.onchange = () => {
            snapshot('ctl:' + def.k + ':' + input.value);
            const raw = input.value;
            setP(cur(), def.k, isNaN(raw) || raw === '' ? raw : Number(raw));
            schedule();
            refreshVisibility();
          };
        } else if (def.type === 'seg') {
          input = el('div', 'seg');
          def.opts.forEach(([v, l]) => {
            const b = el('button', getP(s, def.k) === v ? 'on' : '', t(l));
            b.onclick = () => {
              snapshot('ctl:' + def.k + ':' + v);
              setP(cur(), def.k, v);
              [...input.children].forEach((c) => c.classList.remove('on'));
              b.classList.add('on');
              schedule();
              refreshVisibility();
            };
            input.appendChild(b);
          });
        } else if (def.type === 'color') {
          input = el('div', 'colors');
          const c = el('input');
          c.type = 'color';
          c.value = val || '#000000';
          c.oninput = () => { snapshot('ctl:' + def.k); setP(cur(), def.k, c.value); schedule(); };
          input.appendChild(c);
        } else if (def.type === 'textarea') {
          input = el('textarea');
          input.value = val || '';
          input.oninput = () => { snapshot('ctl:' + def.k); setP(cur(), def.k, input.value); schedule(); };
        } else if (def.type === 'text') {
          input = el('input');
          input.type = 'text';
          input.value = val || '';
          input.oninput = () => { snapshot('ctl:' + def.k); setP(cur(), def.k, input.value); schedule(); };
        } else if (def.type === 'check') {
          const wrap = el('label', 'check');
          const c = el('input');
          c.type = 'checkbox';
          c.checked = !!val;
          c.onchange = () => { snapshot('ctl:' + def.k); setP(cur(), def.k, c.checked); schedule(); refreshVisibility(); };
          wrap.append(c, el('span', null, t(def.label)));
          input = wrap;
        }
        node.appendChild(input);
      }
      body.appendChild(node);
      panelRows.push({ def, node });
    }
    refreshVisibility();
  }

  function refreshVisibility() {
    const s = cur();
    panelRows.forEach(({ def, node }) => {
      if (def.when) node.classList.toggle('hidden', !def.when(s));
    });
  }

  const fmt = (v) => {
    const n = parseFloat(v);
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
  };

  function luminance(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substr(0, 2), 16) / 255;
    const g = parseInt(h.substr(2, 2), 16) / 255;
    const b = parseInt(h.substr(4, 2), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /* ------------------------------------------------------------------ */
  /* eylemler                                                            */
  /* ------------------------------------------------------------------ */
  let pickTarget = null;

  function addSticker(type, extra, slide) {
    const sl = slide || cur();
    snapshot('sticker-add');
    const st = Object.assign({ type, opacity: 100 }, JSON.parse(JSON.stringify(STICKER_DEFAULTS[type] || {})), extra || {});
    if (type === 'icon' && state.app.name && !extra) st.text = state.app.name;
    if (!st.color && ['laurel', 'text', 'arrow', 'ring'].includes(type)) st.color = sl.text.color;
    sl.stickers.push(st);
    if (!slide) { state.sticker = sl.stickers.length - 1; refreshAll(); }
    return st;
  }

  const actions = {
    'pick-shot': () => { pickTarget = 'shot'; $('#shotPick').click(); },
    'clear-shot': () => { snapshot('clear-shot'); cur().shot = null; refreshAll(); },
    'pick-shot2': () => { $('#shot2Pick').click(); },
    'clear-shot2': () => { snapshot('clear-shot2'); cur().device2.shot = null; refreshAll(); },
    'pick-bg': () => { pickTarget = 'bg'; $('#bgPick').click(); },
    'clear-bg': () => { snapshot('clear-bg'); cur().bg.img = null; refreshAll(); },
    'pick-font': () => $('#fontPick').click(),
  };

  async function addSlidesFromFiles(files) {
    const imgs = [...files].filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    imgs.sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));
    snapshot('add-slides');
    const style = cur();
    const emptySlots = state.slides.filter((sl) => !sl.shot);
    for (const f of imgs) {
      const url = await window.Store.fileToDataUrl(f);
      await window.Store.loadImage(url);
      let target = emptySlots.shift();
      if (!target) {
        target = newSlide(style);
        state.slides.push(target);
      }
      target.shot = url;
      target.name = f.name.replace(/\.[^.]+$/, '');
      if (isDefaultTitle(target.text.title)) target.text.title = '';
      state.cur = state.slides.indexOf(target);
    }
    refreshAll();
    toast(t('{n} görsel eklendi', { n: imgs.length }));
  }

  /* ------------------------------------------------------------------ */
  /* dışa aktarma                                                        */
  /* ------------------------------------------------------------------ */
  function renderToCanvas(slide, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    window.Render.renderSlide(c.getContext('2d'), w, h, slide, imagesFor(slide), pan(state.slides.indexOf(slide)));
    return c;
  }

  const toBlob = (canvas) =>
    new Promise((res) => canvas.toBlob(res, 'image/' + state.exp.format, state.exp.quality));

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  const fileName = (i, s) => {
    const slug = (s.name || s.text.title || 'ekran')
      .toLowerCase()
      .replace(/[ıİ]/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'ekran';
    const ext = state.exp.format === 'jpeg' ? 'jpg' : 'png';
    return `${String(i + 1).padStart(2, '0')}-${slug}-${state.exp.w}x${state.exp.h}.${ext}`;
  };

  async function exportOne() {
    const s = cur();
    const blob = await toBlob(renderToCanvas(s, state.exp.w, state.exp.h));
    download(blob, fileName(state.cur, s));
    toast(t('İndirildi'));
  }

  async function exportAll() {
    const files = [];
    for (let i = 0; i < state.slides.length; i++) {
      const blob = await toBlob(renderToCanvas(state.slides[i], state.exp.w, state.exp.h));
      files.push({ name: fileName(i, state.slides[i]), data: new Uint8Array(await blob.arrayBuffer()) });
    }
    download(window.makeZip(files), `store-${state.exp.w}x${state.exp.h}.zip`);
    toast(t("{n} görsel zip'lendi", { n: files.length }));
  }

  /* ------------------------------------------------------------------ */
  /* kalıcılık                                                           */
  /* ------------------------------------------------------------------ */
  let saveTimer = null;
  function serialize() {
    return { exp: state.exp, cur: state.cur, slides: state.slides, appDesc: state.appDesc, screens: state.screens, lang: state.lang, panorama: state.panorama, app: state.app, appId: state.appId };
  }
  function autosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const data = serialize();
      window.Store.set('project', data).catch(() => {});
      if (state.appId) window.Store.set('app:' + state.appId, data).then(touchApp).catch(() => {});
    }, 500);
  }
  function hydrate(p) {
    state.exp = Object.assign(state.exp, p.exp || {});
    state.slides = (p.slides || []).map(upgradeSlide);
    if (!state.slides.length) state.slides = [newSlide()];
    state.cur = Math.min(p.cur || 0, state.slides.length - 1);
    state.sticker = 0;
    state.appDesc = p.appDesc || '';
    state.screens = p.screens || '';
    state.panorama = !!p.panorama;
    state.app = Object.assign({ name: '', lang: 'tr', accent: '#6366f1', icon: null }, p.app || {});
    state.appId = p.appId || null;
    if (p.lang) state.lang = p.lang;
  }
  async function loadSaved() {
    const p = await window.Store.get('project').catch(() => null);
    if (!p || !p.slides || !p.slides.length) return false;
    hydrate(p);
    await preloadImages();
    return true;
  }
  async function preloadImages() {
    const urls = [];
    state.slides.forEach((s) => {
      if (s.shot) urls.push(s.shot);
      if (s.device2 && s.device2.shot) urls.push(s.device2.shot);
      if (s.bg.img) urls.push(s.bg.img);
    });
    if (state.app.icon) urls.push(state.app.icon);
    await Promise.all(urls.map((u) => window.Store.loadImage(u)));
  }

  /* ---- uygulama profilleri: her uygulama ayrı kayıt ---- */
  async function listApps() {
    return (await window.Store.get('apps').catch(() => null)) || [];
  }
  async function touchApp() {
    if (!state.appId) return;
    const apps = await listApps();
    const a = apps.find((x) => x.id === state.appId);
    const name = state.app.name || t('Adsız');
    if (a) { if (a.name === name && Date.now() - a.updated < 60000) return; a.name = name; a.updated = Date.now(); }
    else apps.push({ id: state.appId, name, updated: Date.now() });
    await window.Store.set('apps', apps);
    refreshAppSelect(apps);
  }
  async function refreshAppSelect(apps) {
    apps = apps || (await listApps());
    const sel = $('#appSelect');
    sel.innerHTML = '';
    sel.appendChild(Object.assign(el('option', null, t('— uygulama seç —')), { value: '' }));
    apps.sort((a, b) => b.updated - a.updated).forEach((a) => {
      sel.appendChild(Object.assign(el('option', null, a.name), { value: a.id }));
    });
    sel.appendChild(Object.assign(el('option', null, t('＋ Yeni uygulama…')), { value: '__new' }));
    sel.value = state.appId || '';
  }
  async function switchApp(id) {
    if (state.appId === id) return;
    clearTimeout(saveTimer);
    if (state.appId) await window.Store.set('app:' + state.appId, serialize()).catch(() => {});
    const p = await window.Store.get('app:' + id).catch(() => null);
    if (!p) return toast(t('Kayıt bulunamadı'));
    hydrate(p);
    state.appId = id;
    await preloadImages();
    window.I18N.set(state.lang);
    $('#btnLang').textContent = state.lang === 'tr' ? 'TR' : 'EN';
    syncExportUI();
    undoStack.length = 0; redoStack.length = 0;
    refreshAll();
    refreshAppSelect();
    toast(t('{name} açıldı', { name: state.app.name }));
  }
  async function createApp(name, fresh) {
    clearTimeout(saveTimer);
    if (state.appId) await window.Store.set('app:' + state.appId, serialize()).catch(() => {});
    const id = 'a' + Date.now().toString(36);
    if (fresh) {
      state.slides = [newSlide()];
      state.slides[0].text.title = defaultTitle();
      state.cur = 0; state.panorama = false; state.appDesc = ''; state.screens = '';
      state.app = { name, lang: state.lang, accent: '#6366f1', icon: null };
    } else state.app.name = name;
    state.appId = id;
    await window.Store.set('app:' + id, serialize());
    await touchApp();
    refreshAll();
  }
  async function deleteApp(id) {
    const apps = (await listApps()).filter((a) => a.id !== id);
    await window.Store.set('apps', apps);
    await window.Store.set('app:' + id, null);
    if (state.appId === id) state.appId = null;
    refreshAppSelect(apps);
  }

  /* ------------------------------------------------------------------ */
  /* AI metin & şablon içe aktarma                                       */
  /* ------------------------------------------------------------------ */
  function resolveBg(v, bg) {
    if (!v) return null;
    if (typeof v === 'string') {
      const p = BG_PRESETS.find((x) => x.k === v || x.n.toLowerCase() === v.toLowerCase());
      if (!p) return null;
      bg.type = p.t; bg.c1 = p.c1; bg.c2 = p.c2 || p.c1;
      if (p.c3) bg.c3 = p.c3;
      if (p.a != null) bg.angle = p.a;
      return p;
    }
    if (typeof v === 'object') {
      ['type', 'c1', 'c2', 'c3', 'angle', 'variant', 'pattern', 'patternColor', 'patternOpacity',
        'noise', 'vignette', 'blur', 'dim'].forEach((k) => { if (v[k] != null) bg[k] = v[k]; });
      return v;
    }
    return null;
  }

  function applyLayoutKey(slide, key) {
    const p = LAYOUT_PRESETS.find((x) => x.k === key || x.n === key);
    if (p) Object.entries(p.p).forEach(([k, v]) => setP(slide, k, v));
    return !!p;
  }

  const TEXT_MAP = {
    font: 'font', titleSize: 'titleSize', subSize: 'subSize', weight: 'weight',
    subWeight: 'subWeight', letterSpacing: 'letterSpacing', lineHeight: 'lineHeight',
    align: 'align', textColor: 'color', subColor: 'subColor', subOpacity: 'subOpacity',
    shadow: 'shadow', textY: 'y', pad: 'pad',
  };

  /** Şablon metinleri {tr,en} olabilir. */
  function txt(v) {
    if (v && typeof v === 'object') return v[window.I18N.lang] ?? v.tr ?? v.en ?? '';
    return v;
  }

  function applyTemplate(slide, t, autoColor) {
    if (!t) return;
    if (t.layout) applyLayoutKey(slide, t.layout);
    if (t.frame) slide.device.frame = t.frame;
    if (t.deviceColor) slide.device.color = t.deviceColor;
    if (t.deviceSize != null) slide.device.w = t.deviceSize;
    ['deviceX:x', 'deviceY:y', 'deviceRot:rot', 'fit:fit', 'deviceShadow:shadow', 'glare:glare']
      .forEach((pair) => {
        const [src, dst] = pair.split(':');
        if (t[src] != null) slide.device[dst] = t[src];
      });
    if (t.device2) Object.assign(slide.device2, t.device2);
    if (t.background) {
      resolveBg(t.background, slide.bg);
      if (t.textColor == null && autoColor !== false) {
        const base = slide.bg.type === 'mesh' ? slide.bg.c3 : slide.bg.c1;
        const light = luminance(base) > 0.62;
        slide.text.color = slide.text.subColor = light ? '#111214' : '#ffffff';
      }
    }
    Object.entries(TEXT_MAP).forEach(([src, dst]) => { if (t[src] != null) slide.text[dst] = t[src]; });
    if (t.accent) slide.text.accent = t.accent;
    if (t.hlStyle) slide.text.hlStyle = t.hlStyle;
    if (t.box) slide.text.box = t.box;
    if (t.boxColor) slide.text.boxColor = t.boxColor;
    if (t.boxOpacity != null) slide.text.boxOpacity = t.boxOpacity;
    if (t.boxRadius != null) slide.text.boxRadius = t.boxRadius;
    if (Array.isArray(t.stickers)) {
      slide.stickers = t.stickers.map((st) => {
        const o = Object.assign({ opacity: 100 }, JSON.parse(JSON.stringify(STICKER_DEFAULTS[st.type] || {})), st);
        if (st.text != null) o.text = txt(st.text);
        if (st.sub != null) o.sub = txt(st.sub);
        if (o.type === 'icon' && state.app.name && st.text == null) o.text = state.app.name;
        if (!o.color && ['laurel', 'text', 'arrow', 'ring', 'icon'].includes(o.type)) o.color = slide.text.color;
        return o;
      });
    }
  }

  function applyVariant(v) {
    snapshot('import');
    const rows = v.slides || [];
    while (state.slides.length < rows.length) {
      state.slides.push(newSlide(state.slides[state.slides.length - 1]));
    }
    if (v.template) state.panorama = !!v.template.panorama; // şablon bütün bir stil: panorama da onun parçası
    rows.forEach((row, i) => {
      const s = state.slides[i];
      if (v.template) {
        // şablon bütün bir stil: önceki şablonun kutu/renk/öğe kalıntıları temizlenir
        const fresh = newSlide();
        s.bg = Object.assign(fresh.bg, { img: s.bg.img });
        s.device = Object.assign(fresh.device, { fit: s.device.fit });
        s.device2 = Object.assign(fresh.device2, { shot: s.device2 && s.device2.shot });
        s.text = Object.assign(fresh.text, { title: s.text.title, sub: s.text.sub });
        if (!v.template.stickers) s.stickers = [];
      }
      applyTemplate(s, v.template);
      applyTemplate(s, row, !(v.template && v.template.textColor));
      if (row.title != null) s.text.title = String(txt(row.title)).replace(/\\n/g, '\n');
      if (row.subtitle != null) s.text.sub = String(txt(row.subtitle)).replace(/\\n/g, '\n');
    });
    state.cur = 0;
    refreshAll();
    return rows.length;
  }

  function parseImport(txt) {
    let t = (txt || '').trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) t = fence[1];
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a < 0 || b < 0) throw new Error(t('İçeride JSON bulunamadı'));
    const data = JSON.parse(t.slice(a, b + 1));
    const variants = data.variants
      || (data.slides ? [{ name: data.name || 'Şablon', template: data.template, slides: data.slides }] : null);
    if (!variants || !variants.length) throw new Error(t('"variants" ya da "slides" alanı yok'));
    variants.forEach((v, i) => {
      if (!Array.isArray(v.slides) || !v.slides.length) throw new Error(t('{i}. varyantta slaytlar boş', { i: i + 1 }));
    });
    return variants;
  }

  function refreshImportUI() {
    const box = $('#variantPick');
    const msg = $('#importMsg');
    const txt = $('#importJson').value;
    box.innerHTML = '';
    if (!txt.trim()) { msg.textContent = ''; return; }
    let variants;
    try { variants = parseImport(txt); }
    catch (e) { msg.textContent = '⚠︎ ' + e.message; return; }
    msg.textContent = t('{n} varyant bulundu — uygulamak için birine tıkla.', { n: variants.length });
    variants.forEach((v) => {
      const b = el('button', 'btn tiny', `${v.name || 'Varyant'}<br><span class="hint">${t('{n} slayt', { n: v.slides.length })}</span>`);
      b.onclick = () => {
        [...box.children].forEach((c) => c.classList.remove('active'));
        b.classList.add('active');
        const n = applyVariant(v);
        toast(t('{n} slayt "{name}" ile güncellendi', { n, name: v.name || 'varyant' }));
      };
      box.appendChild(b);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hazır şablon galerisi                                               */
  /* ------------------------------------------------------------------ */
  let mockShotCanvas = null;
  /** Önizlemelerde kullanılan sahte ekran görüntüsü. */
  function mockShot() {
    if (mockShotCanvas) return mockShotCanvas;
    const c = document.createElement('canvas');
    c.width = 600; c.height = 1300;
    const x = c.getContext('2d');
    x.fillStyle = '#f6f7f9'; x.fillRect(0, 0, 600, 1300);
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 600, 150);
    x.fillStyle = '#d9dde4';
    x.fillRect(48, 78, 250, 26);
    x.fillStyle = '#e9ecf1';
    for (let i = 0; i < 5; i++) x.fillRect(40, 210 + i * 150, 520, 120);
    x.fillStyle = '#c9d2de';
    for (let i = 0; i < 5; i++) { x.fillRect(70, 240 + i * 150, 60, 60); x.fillRect(150, 250 + i * 150, 240, 18); x.fillRect(150, 285 + i * 150, 150, 14); }
    x.fillStyle = '#4f6bed'; x.fillRect(40, 990, 520, 74);
    x.fillStyle = '#ffffff'; x.fillRect(1000, 0, 0, 0);
    x.fillStyle = '#ffffff'; x.fillRect(0, 1180, 600, 120);
    x.fillStyle = '#cbd3de';
    for (let i = 0; i < 4; i++) x.fillRect(70 + i * 130, 1220, 60, 40);
    mockShotCanvas = c;
    return c;
  }

  /** Şablonun i. slaytını geçici bir slayt nesnesine uygular. */
  function tplSlide(tpl, i) {
    const sl = newSlide();
    applyTemplate(sl, tpl.template);
    applyTemplate(sl, tpl.slides[i], !tpl.template.textColor);
    sl.text.title = String(txt(tpl.slides[i].title) || '');
    sl.text.sub = String(txt(tpl.slides[i].subtitle) || '');
    return sl;
  }

  function buildTemplateGrid() {
    const grid = $('#tplGrid');
    grid.innerHTML = '';
    const mock = mockShot();
    (window.TEMPLATES || []).forEach((tpl) => {
      const card = el('button', 'tpl-card');
      const shots = el('div', 'tpl-shots');
      [0, 1, 2].forEach((i) => {
        const c = el('canvas');
        const w = 150, h = Math.round((w * state.exp.h) / state.exp.w);
        c.width = w; c.height = h;
        window.Render.renderSlide(c.getContext('2d'), w, h, tplSlide(tpl, i), { shot: mock, shot2: mock, bg: null });
        shots.appendChild(c);
      });
      card.appendChild(shots);
      card.appendChild(el('div', 'tpl-name', txt(tpl.name)));
      card.appendChild(el('div', 'tpl-cat', txt(tpl.cat)));
      card.onclick = () => {
        const n = applyVariant({ template: tpl.template, slides: tpl.slides });
        $('#tplModal').classList.remove('open');
        toast(t('{name} şablonu uygulandı — {n} slayt', { name: txt(tpl.name), n }));
      };
      grid.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------ */
  /* UI bağlantıları                                                     */
  /* ------------------------------------------------------------------ */
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('on'), 1800);
  }

  function initExportSelect() {
    const sel = $('#exportPreset');
    sel.innerHTML = '';
    EXPORT_PRESETS.forEach(([n, w, h], i) => {
      const o = el('option', null, `${t(n)} — ${w}×${h}`);
      o.value = i;
      sel.appendChild(o);
    });
    sel.appendChild(Object.assign(el('option', null, t('Özel')), { value: 'custom' }));
    syncExportUI();
    sel.onchange = () => {
      if (sel.value === 'custom') return;
      const [, w, h] = EXPORT_PRESETS[+sel.value];
      state.exp.w = w; state.exp.h = h;
      $('#expW').value = w; $('#expH').value = h;
      refreshAll();
    };
    const upd = () => {
      state.exp.w = Math.max(50, +$('#expW').value || 50);
      state.exp.h = Math.max(50, +$('#expH').value || 50);
      syncExportUI();
      refreshAll();
    };
    $('#expW').onchange = upd;
    $('#expH').onchange = upd;
    $('#exportFormat').onchange = () => { state.exp.format = $('#exportFormat').value; };
  }

  function syncExportUI() {
    $('#expW').value = state.exp.w;
    $('#expH').value = state.exp.h;
    $('#exportFormat').value = state.exp.format;
    const i = EXPORT_PRESETS.findIndex(([, w, h]) => w === state.exp.w && h === state.exp.h);
    $('#exportPreset').value = i >= 0 ? String(i) : 'custom';
  }

  function setLang(l) {
    state.lang = l;
    window.I18N.set(l);
    $('#btnLang').textContent = l === 'tr' ? 'TR' : 'EN';
    state.slides.forEach((sl) => { if (isDefaultTitle(sl.text.title)) sl.text.title = defaultTitle(); });
    initExportSelect();
    refreshAll();
  }

  /* ------------------------------------------------------------------ */
  /* hızlı kurulum — modal ve paket (.json) yükleme aynı yolu kullanır    */
  /* q = { name, lang, accent, template, lines[], rating, addIcon, icon } ; shots = File[] | dataURL[] */
  /* ------------------------------------------------------------------ */
  async function applyQuick(q, shots) {
    const lines = (q.lines || []).map((x) => String(x).trim()).filter(Boolean);
    snapshot('quick');
    if (q.name) state.app.name = q.name;
    if (q.lang) state.app.lang = q.lang;
    if (q.accent) state.app.accent = q.accent;
    if (q.icon) { await window.Store.loadImage(q.icon); state.app.icon = q.icon; }

    const tpl = (window.TEMPLATES || []).find((x) => x.key === q.template);
    const parsed = lines.map((ln) => {
      const [a, b] = ln.split('|').map((x) => (x || '').trim());
      return { title: a.replace(/\\n/g, '\n'), subtitle: b || '' };
    });
    if (tpl) {
      const rows = (parsed.length ? parsed : tpl.slides).map((r, i) => {
        const base = tpl.slides[Math.min(i, tpl.slides.length - 1)] || {};
        const extra = Object.assign({}, base);
        delete extra.title; delete extra.subtitle;
        return Object.assign(extra, parsed.length ? r : { title: txt(base.title), subtitle: txt(base.subtitle) });
      });
      applyVariant({ template: tpl.template, slides: rows });
    } else if (parsed.length) {
      while (state.slides.length < parsed.length) state.slides.push(newSlide(state.slides[state.slides.length - 1]));
      parsed.forEach((r, i) => { state.slides[i].text.title = r.title; state.slides[i].text.sub = r.subtitle; });
    }
    // metin sayısından fazla olan ve görseli olmayan slaytları kaldır
    if (parsed.length) state.slides = state.slides.filter((sl, i) => i < parsed.length || sl.shot);
    // vurgu rengi tüm slaytlara
    state.slides.forEach((sl) => { sl.text.accent = state.app.accent; sl.stickers.forEach((st) => { if (st.type === 'icon' || st.type === 'note') st.iconBg = state.app.accent; }); });
    // sosyal kanıt 1. slayta
    const first = state.slides[0];
    if (q.addIcon !== false && state.app.name) {
      const hadIcon = first.stickers.some((st) => st.type === 'icon');
      first.stickers = first.stickers.filter((st) => st.type !== 'icon');
      if (!hadIcon && first.text.y <= 50) first.text.y = Math.min(90, first.text.y + 6);
      addSticker('icon', { text: state.app.name, y: first.text.y > 50 ? 4 : Math.max(2, first.text.y - 10), iconBg: state.app.accent, color: first.text.color }, first);
    }
    if (q.rating) {
      first.stickers = first.stickers.filter((st) => st.type !== 'rating');
      const light = window.Render.contrastFor(first.text.color) === '#111214'; // metin açıksa arka plan koyu
      addSticker('rating', { text: q.rating, y: first.text.y > 50 ? 6 : first.text.y + 13, bg: light ? '#ffffff' : '#111214', color: light ? '#111214' : '#ffffff' }, first);
    }
    state.cur = 0;
    refreshAll();
    if (shots && shots.length) {
      if (shots[0] instanceof File) await addSlidesFromFiles(shots);
      else await addSlidesFromDataUrls(shots);
    }
    if (!state.appId && state.app.name) await createApp(state.app.name, false);
    else touchApp();
  }

  /** Paketten gelen data URL'leri boş slaytlara sırayla oturtur. */
  async function addSlidesFromDataUrls(urls) {
    const style = cur();
    const emptySlots = state.slides.filter((sl) => !sl.shot);
    for (const u of urls) {
      const url = typeof u === 'string' ? u : u.data;
      await window.Store.loadImage(url);
      let target = emptySlots.shift();
      if (!target) { target = newSlide(style); state.slides.push(target); }
      target.shot = url;
      if (u && u.name) target.name = String(u.name).replace(/\.[^.]+$/, '');
      if (isDefaultTitle(target.text.title)) target.text.title = '';
    }
    refreshAll();
  }

  function bind() {
    $('#btnLang').onclick = () => setLang(state.lang === 'tr' ? 'en' : 'tr');
    const tplModal = $('#tplModal');
    $('#btnTemplates').onclick = () => { buildTemplateGrid(); tplModal.classList.add('open'); };
    tplModal.onclick = (e) => {
      if (e.target === tplModal || e.target.hasAttribute('data-close')) tplModal.classList.remove('open');
    };
    $('#btnUndo').onclick = undo;
    $('#btnRedo').onclick = redo;
    document.querySelectorAll('.tabs button').forEach((b) => {
      b.onclick = () => {
        document.querySelectorAll('.tabs button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        state.tab = b.dataset.tab;
        buildPanel();
      };
    });

    $('#btnAdd').onclick = () => { pickTarget = 'new'; $('#filePick').click(); };
    $('#filePick').onchange = (e) => { addSlidesFromFiles(e.target.files); e.target.value = ''; };

    $('#shotPick').onchange = async (e) => {
      const f = e.target.files[0];
      if (f) {
        const url = await window.Store.fileToDataUrl(f);
        await window.Store.loadImage(url);
        snapshot('pick-shot');
        cur().shot = url;
        cur().name = f.name.replace(/\.[^.]+$/, '');
        refreshAll();
      }
      e.target.value = '';
    };

    $('#shot2Pick').onchange = async (e) => {
      const f = e.target.files[0];
      if (f) {
        const url = await window.Store.fileToDataUrl(f);
        await window.Store.loadImage(url);
        snapshot('pick-shot2');
        cur().device2.shot = url;
        refreshAll();
      }
      e.target.value = '';
    };

    $('#bgPick').onchange = async (e) => {
      const f = e.target.files[0];
      if (f) {
        const url = await window.Store.fileToDataUrl(f);
        await window.Store.loadImage(url);
        snapshot('pick-bg');
        cur().bg.img = url;
        cur().bg.type = 'image';
        refreshAll();
      }
      e.target.value = '';
    };

    $('#fontPick').onchange = async (e) => {
      const f = e.target.files[0];
      if (f) {
        const buf = await f.arrayBuffer();
        const face = new FontFace('CustomFont', buf);
        await face.load();
        document.fonts.add(face);
        cur().text.font = 'custom';
        refreshAll();
        toast(t('Font yüklendi: {name}', { name: f.name }));
      }
      e.target.value = '';
    };

    $('#btnDup').onclick = () => {
      snapshot('dup');
      const copy = JSON.parse(JSON.stringify(cur()));
      copy.id = 's' + Math.random().toString(36).slice(2, 9);
      state.slides.splice(state.cur + 1, 0, copy);
      state.cur++;
      refreshAll();
    };

    $('#btnDel').onclick = () => {
      snapshot('del');
      if (state.slides.length === 1) { state.slides[0] = newSlide(); }
      else state.slides.splice(state.cur, 1);
      state.cur = Math.max(0, Math.min(state.cur, state.slides.length - 1));
      refreshAll();
    };

    $('#btnPrev').onclick = () => { state.cur = (state.cur - 1 + state.slides.length) % state.slides.length; refreshAll(); };
    $('#btnNext').onclick = () => { state.cur = (state.cur + 1) % state.slides.length; refreshAll(); };

    $('#btnApplyAll').onclick = () => {
      snapshot('apply-all');
      const src = cur();
      state.slides.forEach((s) => {
        if (s === src) return;
        s.bg = JSON.parse(JSON.stringify(src.bg));
        const keepShotOpts = { fit: s.device.fit };
        s.device = Object.assign(JSON.parse(JSON.stringify(src.device)), keepShotOpts);
        const t = JSON.parse(JSON.stringify(src.text));
        t.title = s.text.title;
        t.sub = s.text.sub;
        s.text = t;
      });
      refreshAll();
      toast(t('Stil tüm slaytlara uygulandı'));
    };

    $('#btnExportOne').onclick = exportOne;
    $('#btnExportAll').onclick = exportAll;
    $('#btnSetView').onclick = () => { state.setView = !state.setView; renderPreview(); };
    setCanvas.onclick = (e) => {
      const r = setCanvas.getBoundingClientRect();
      const scale = setCanvas.width / r.width;
      const i = Math.floor(((e.clientX - r.left) * scale) / (210 + 8));
      if (i >= 0 && i < state.slides.length) { state.cur = i; refreshAll(); }
    };

    // uygulama profilleri
    $('#appSelect').onchange = async () => {
      const v = $('#appSelect').value;
      if (v === '__new') {
        const name = prompt(t('Uygulamanın adı?'));
        $('#appSelect').value = state.appId || '';
        if (!name) return;
        await createApp(name.trim(), true);
        openQuick();
      } else if (v) await switchApp(v);
    };
    $('#iconPick').onchange = async (e) => {
      const f = e.target.files[0];
      if (f) {
        const url = await window.Store.fileToDataUrl(f);
        await window.Store.loadImage(url);
        state.app.icon = url;
        refreshAll();
        toast(t('Uygulama ikonu yüklendi'));
      }
      e.target.value = '';
    };

    // hızlı kurulum
    const quick = $('#quickModal');
    const fillTplSelect = () => {
      const sel = $('#qTemplate');
      sel.innerHTML = '';
      sel.appendChild(Object.assign(el('option', null, t('Mevcut stili koru')), { value: 'keep' }));
      (window.TEMPLATES || []).forEach((tp) => sel.appendChild(Object.assign(el('option', null, `${txt(tp.name)} — ${txt(tp.cat)}`), { value: tp.key })));
    };
    function openQuick() {
      fillTplSelect();
      $('#qName').value = state.app.name || '';
      $('#qLang').value = state.app.lang || 'tr';
      $('#qAccent').value = state.app.accent || '#6366f1';
      const existing = state.slides.filter((sl) => sl.text.title && !isDefaultTitle(sl.text.title));
      $('#qLines').value = existing.map((sl) => sl.text.title.replace(/\n/g, '\\n') + (sl.text.sub ? ' | ' + sl.text.sub : '')).join('\n');
      $('#qIconState').textContent = state.app.icon ? t('ikon yüklü ✓') : t('ikon yok');
      quick.classList.add('open');
      $('#qName').focus();
    }
    $('#btnQuick').onclick = openQuick;
    quick.onclick = (e) => { if (e.target === quick || e.target.hasAttribute('data-close')) quick.classList.remove('open'); };
    $('#qIconBtn').onclick = () => $('#iconPick').click();
    $('#qShotsBtn').onclick = () => $('#qShots').click();
    $('#qShots').onchange = (e) => { $('#qShotsState').textContent = t('{n} görsel seçildi', { n: e.target.files.length }); };
    $('#qApply').onclick = async () => {
      const files = [...($('#qShots').files || [])];
      await applyQuick({
        name: $('#qName').value.trim(),
        lang: $('#qLang').value,
        accent: $('#qAccent').value,
        template: $('#qTemplate').value,
        lines: $('#qLines').value.split('\n'),
        rating: $('#qRating').value.trim(),
        addIcon: $('#qAddIcon').checked,
      }, files);
      $('#qShots').value = ''; $('#qShotsState').textContent = '';
      quick.classList.remove('open');
      toast(t('Kuruldu — şimdi görselleri ve metinleri ince ayarla'));
    };

    $('#btnMore').onclick = (e) => { e.stopPropagation(); $('#moreMenu').classList.toggle('open'); };
    document.addEventListener('click', () => $('#moreMenu').classList.remove('open'));
    $('#moreMenu').onclick = (e) => {
      const act = e.target.dataset.act;
      if (act === 'save-proj') {
        download(new Blob([JSON.stringify(serialize())], { type: 'application/json' }), (state.app.name ? state.app.name.replace(/\s+/g, '-').toLowerCase() : 'store-mockup') + '-projesi.json');
      } else if (act === 'copy-copy') {
        const lines = state.slides.map((sl, i) => `${i + 1}. ${sl.text.title.replace(/\n/g, ' / ')}${sl.text.sub ? ' | ' + sl.text.sub : ''}`).join('\n');
        navigator.clipboard.writeText(lines).then(() => toast(t('Metinler kopyalandı'))).catch(() => toast(t('Panoya erişilemedi')));
      } else if (act === 'pick-icon') {
        $('#iconPick').click();
      } else if (act === 'rename-app') {
        const name = prompt(t('Uygulamanın adı?'), state.app.name || '');
        if (name) { state.app.name = name.trim(); if (!state.appId) createApp(state.app.name, false); else { autosave(); touchApp(); } }
      } else if (act === 'delete-app') {
        if (state.appId && confirm(t('"{name}" kaydı silinsin mi? Slaytlar ekranda kalır.', { name: state.app.name }))) deleteApp(state.appId);
      } else if (act === 'load-proj') {
        $('#projPick').click();
      } else if (act === 'reset') {
        if (confirm(t('Tüm slaytlar silinsin mi?'))) {
          snapshot('reset');
          state.slides = [newSlide()];
          state.slides[0].text.title = defaultTitle();
          state.cur = 0; state.panorama = false; state.sticker = 0;
          refreshAll();
        }
      }
    };

    async function loadProjectFile(f) {
      try {
        const p = JSON.parse(await f.text());
        if (p.quick) {
          // paket: { quick: {...}, shots: [dataURL | {name,data}], icon? } → temiz projede hızlı kurulum
          if (p.icon) p.quick.icon = p.icon;
          clearTimeout(saveTimer);
          if (state.appId) await window.Store.set('app:' + state.appId, serialize()).catch(() => {});
          const existing = (await listApps()).find((a) => a.name === p.quick.name);
          state.slides = [newSlide()]; state.cur = 0; state.sticker = 0; state.panorama = false;
          state.app = { name: '', lang: 'tr', accent: '#6366f1', icon: null };
          state.appId = existing ? existing.id : null;
          undoStack.length = 0; redoStack.length = 0;
          await applyQuick(p.quick, p.shots || []);
          refreshAppSelect();
          toast(t('Paket kuruldu: {name}', { name: state.app.name }));
          return;
        }
        hydrate(p);
        state.cur = 0;
        await preloadImages();
        syncExportUI();
        refreshAll();
        toast(t('Proje yüklendi'));
      } catch (err) { toast(t('Proje okunamadı')); }
    }
    $('#projPick').onchange = async (e) => {
      const f = e.target.files[0];
      if (f) await loadProjectFile(f);
      e.target.value = '';
    };

    // AI metin & şablon
    const modal = $('#importModal');
    const screenLines = () => $('#screenList').value.split('\n').map((x) => x.trim()).filter(Boolean);
    const syncPrompt = () => {
      $('#promptText').value = window.buildPrompt($('#appDesc').value, screenLines(), state.slides.length);
    };
    const fillScreens = () => {
      $('#screenList').value = state.slides.map((s, i) => s.name || t('slayt {n}', { n: i + 1 })).join('\n');
    };
    $('#btnFillScreens').onclick = () => { fillScreens(); state.screens = $('#screenList').value; syncPrompt(); autosave(); };
    $('#screenList').oninput = () => { state.screens = $('#screenList').value; syncPrompt(); autosave(); };
    $('#btnImport').onclick = () => {
      $('#appDesc').value = state.appDesc || '';
      $('#screenList').value = state.screens || '';
      if (!$('#screenList').value.trim()) fillScreens();
      syncPrompt();
      modal.classList.add('open');
      refreshImportUI();
    };
    modal.onclick = (e) => {
      if (e.target === modal || e.target.hasAttribute('data-close')) modal.classList.remove('open');
    };
    $('#appDesc').oninput = () => { state.appDesc = $('#appDesc').value; syncPrompt(); autosave(); };
    $('#btnCopyPrompt').onclick = async () => {
      const ta = $('#promptText');
      syncPrompt();
      try {
        await navigator.clipboard.writeText(ta.value);
        toast(t('Prompt kopyalandı — AI\'ya yapıştır'));
        return;
      } catch (e) { /* izin yok, eski yönteme düş */ }
      $('#promptBox').open = true;
      ta.focus(); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      toast(ok ? t('Prompt kopyalandı — AI\'ya yapıştır') : t('Panoya erişilemedi — metin seçili, ⌘C ile kopyala'));
    };
    $('#importJson').oninput = refreshImportUI;

    // sürükle-bırak
    let dragDepth = 0;
    window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; $('#dropzone').classList.add('on'); });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('dragleave', () => { if (--dragDepth <= 0) $('#dropzone').classList.remove('on'); });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragDepth = 0;
      $('#dropzone').classList.remove('on');
      const files = [...e.dataTransfer.files];
      const json = files.find((f) => /\.json$/i.test(f.name));
      if (json) loadProjectFile(json);
      else if (files.length) addSlidesFromFiles(files);
    });

    // panodan yapıştır
    window.addEventListener('paste', (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      const files = [...(e.clipboardData?.files || [])];
      if (files.length) addSlidesFromFiles(files);
    });

    // klavye
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (e.key === 'Escape') { $('#tplModal').classList.remove('open'); $('#importModal').classList.remove('open'); }
      if (e.key === 'ArrowLeft') $('#btnPrev').click();
      if (e.key === 'ArrowRight') $('#btnNext').click();
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); exportAll(); }
    });
  }

  /* ------------------------------------------------------------------ */
  (async function init() {
    const saved = await loadSaved();
    if (!saved) state.lang = window.I18N.detect();
    window.I18N.set(state.lang);
    initExportSelect();
    bind();
    $('#btnLang').textContent = state.lang === 'tr' ? 'TR' : 'EN';
    if (!saved) state.slides.forEach((sl) => { sl.text.title = defaultTitle(); });
    syncExportUI();
    updateHistoryUI();
    refreshAppSelect();
    refreshAll();
    // font yüklenince yeniden çiz
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  })();
})();
