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
  ];

  const FRAME_OPTS = Object.entries(window.Frames.FRAMES).map(([k, v]) => [k, v.label]);
  const COLOR_OPTS = [
    ['graphite', 'Grafit'], ['black', 'Siyah'], ['silver', 'Gümüş'],
    ['gold', 'Altın'], ['blue', 'Mavi'], ['white', 'Beyaz'],
  ];
  const FONT_OPTS = [
    ['system', 'Sistem (SF Pro)'], ['helvetica-neue', 'Helvetica Neue'], ['avenir', 'Avenir Next'],
    ['futura', 'Futura'], ['georgia', 'Georgia'], ['times', 'Times'],
    ['courier', 'Courier'], ['impact', 'Impact'], ['custom', 'Yüklenen font'],
  ];

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
      text: { title: defaultTitle(), sub: '', align: 'center', color: '#ffffff', subColor: '#ffffff', subOpacity: 85, font: 'system', weight: 700, subWeight: 400, titleSize: 6.2, subSize: 3.4, y: 6, pad: 9, lineHeight: 1.15, letterSpacing: 0, shadow: false },
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
  };

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
    return { shot: window.Store.imageFor(s.shot), bg: window.Store.imageFor(s.bg.img) };
  }

  function renderPreview() {
    const s = cur();
    if (!s) return;
    const ratio = state.exp.h / state.exp.w;
    const w = Math.min(PREVIEW_W, state.exp.w);
    const h = Math.round(w * ratio);
    previewCanvas.width = w;
    previewCanvas.height = h;
    window.Render.renderSlide(previewCanvas.getContext('2d'), w, h, s, imagesFor(s));
    $('#stageInfo').textContent = `${state.exp.w} × ${state.exp.h} px · ${t(window.Frames.FRAMES[s.device.frame].label)}`;
    $('#stageCount').textContent = `${state.cur + 1} / ${state.slides.length}`;
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
      window.Render.renderSlide(c.getContext('2d'), w, h, s, imagesFor(s));
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
      { k: 'bg.pattern', type: 'select', label: 'Desen', opts: [['none', 'Yok'], ['dots', 'Noktalar'], ['grid', 'Izgara'], ['diagonal', 'Çapraz çizgi'], ['rings', 'Halkalar']] },
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
    ],
  };

  let panelRows = [];

  function buildPanel() {
    const body = $('#panelBody');
    body.innerHTML = '';
    panelRows = [];
    const s = cur();

    for (const def of SCHEMA[state.tab]) {
      let node;
      if (def.type === 'section') {
        node = el('div', 'section-title', t(def.label));
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

  const actions = {
    'pick-shot': () => { pickTarget = 'shot'; $('#shotPick').click(); },
    'clear-shot': () => { snapshot('clear-shot'); cur().shot = null; refreshAll(); },
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
    for (const f of imgs) {
      const url = await window.Store.fileToDataUrl(f);
      await window.Store.loadImage(url);
      let target;
      if (state.slides.length === 1 && !state.slides[0].shot && !state.slides[0].text.sub && isDefaultTitle(state.slides[0].text.title)) {
        target = state.slides[0];
      } else {
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
    window.Render.renderSlide(c.getContext('2d'), w, h, slide, imagesFor(slide));
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
    return { exp: state.exp, cur: state.cur, slides: state.slides, appDesc: state.appDesc, screens: state.screens, lang: state.lang };
  }
  function autosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => window.Store.set('project', serialize()).catch(() => {}), 500);
  }
  async function loadSaved() {
    const p = await window.Store.get('project').catch(() => null);
    if (!p || !p.slides || !p.slides.length) return false;
    state.exp = Object.assign(state.exp, p.exp || {});
    state.slides = p.slides.map((s) => Object.assign(newSlide(), s));
    state.cur = Math.min(p.cur || 0, state.slides.length - 1);
    state.appDesc = p.appDesc || '';
    state.screens = p.screens || '';
    if (p.lang) state.lang = p.lang;
    await preloadImages();
    return true;
  }
  async function preloadImages() {
    const urls = [];
    state.slides.forEach((s) => { if (s.shot) urls.push(s.shot); if (s.bg.img) urls.push(s.bg.img); });
    await Promise.all(urls.map((u) => window.Store.loadImage(u)));
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

  function applyTemplate(slide, t) {
    if (!t) return;
    if (t.layout) applyLayoutKey(slide, t.layout);
    if (t.frame) slide.device.frame = t.frame;
    if (t.deviceColor) slide.device.color = t.deviceColor;
    if (t.deviceSize != null) slide.device.w = t.deviceSize;
    if (t.background) {
      resolveBg(t.background, slide.bg);
      if (t.textColor == null) {
        const base = slide.bg.type === 'mesh' ? slide.bg.c3 : slide.bg.c1;
        const light = luminance(base) > 0.62;
        slide.text.color = slide.text.subColor = light ? '#111214' : '#ffffff';
      }
    }
    Object.entries(TEXT_MAP).forEach(([src, dst]) => { if (t[src] != null) slide.text[dst] = t[src]; });
  }

  function applyVariant(v) {
    snapshot('import');
    const rows = v.slides || [];
    while (state.slides.length < rows.length) {
      state.slides.push(newSlide(state.slides[state.slides.length - 1]));
    }
    rows.forEach((row, i) => {
      const s = state.slides[i];
      applyTemplate(s, v.template);
      applyTemplate(s, row);
      if (row.title != null) s.text.title = String(row.title).replace(/\\n/g, '\n');
      if (row.subtitle != null) s.text.sub = String(row.subtitle).replace(/\\n/g, '\n');
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

  function bind() {
    $('#btnLang').onclick = () => setLang(state.lang === 'tr' ? 'en' : 'tr');
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

    $('#btnMore').onclick = (e) => { e.stopPropagation(); $('#moreMenu').classList.toggle('open'); };
    document.addEventListener('click', () => $('#moreMenu').classList.remove('open'));
    $('#moreMenu').onclick = (e) => {
      const act = e.target.dataset.act;
      if (act === 'save-proj') {
        download(new Blob([JSON.stringify(serialize())], { type: 'application/json' }), 'store-mockup-projesi.json');
      } else if (act === 'load-proj') {
        $('#projPick').click();
      } else if (act === 'reset') {
        if (confirm(t('Tüm slaytlar silinsin mi?'))) {
          snapshot('reset');
          state.slides = [newSlide()];
          state.cur = 0;
          refreshAll();
        }
      }
    };

    $('#projPick').onchange = async (e) => {
      const f = e.target.files[0];
      if (f) {
        try {
          const p = JSON.parse(await f.text());
          state.exp = Object.assign(state.exp, p.exp || {});
          state.slides = (p.slides || []).map((s) => Object.assign(newSlide(), s));
          if (!state.slides.length) state.slides = [newSlide()];
          state.cur = 0;
          await preloadImages();
          syncExportUI();
          refreshAll();
          toast(t('Proje yüklendi'));
        } catch (err) { toast(t('Proje okunamadı')); }
      }
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
      if (e.dataTransfer.files.length) addSlidesFromFiles(e.dataTransfer.files);
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
    refreshAll();
    // font yüklenince yeniden çiz
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  })();
})();
