/* Paylaşılan model: slayt yapısı, ön ayarlar, şablon uygulama. Hem editör (app.js) hem galeri (templates/) kullanır. */
(function (global) {
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

  const newSlide = (style) => {
    const base = {
      id: 's' + Math.random().toString(36).slice(2, 9),
      name: '',
      shot: null,
      bg: { type: 'linear', c1: '#6366f1', c2: '#22d3ee', c3: '#0b1020', angle: 135, variant: 0, img: null, blur: 0, dim: 25, pattern: 'none', patternOpacity: 12, patternColor: '#ffffff', noise: 0, vignette: 0 },
      device: { frame: 'iphone-pro', color: 'graphite', w: 66, x: 0, y: 27, rot: 0, shadow: 45, glare: true, homeIndicator: true, fit: 'top', screenBg: '#000000', above: false, glow: '#22d3ee', glowStrength: 0 },
      device2: { on: false, shot: null, frame: 'watch', color: 'silver', w: 24, x: 20, y: 52, rot: 0, shadow: 45, glare: true, homeIndicator: false, fit: 'cover', screenBg: '#000000', front: true },
      text: { title: '', sub: '', align: 'center', color: '#ffffff', subColor: '#ffffff', subOpacity: 85, font: 'system', weight: 700, subWeight: 400, titleSize: 6.2, subSize: 3.4, y: 6, pad: 9, lineHeight: 1.15, letterSpacing: 0, shadow: false, accent: '#ffd60a', hlStyle: 'color', box: 'none', boxColor: '#ffffff', boxOpacity: 100, boxRadius: 3 },
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

  function luminance(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substr(0, 2), 16) / 255;
    const g = parseInt(h.substr(2, 2), 16) / 255;
    const b = parseInt(h.substr(4, 2), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

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

  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setP = (o, p, v) => {
    const ks = p.split('.');
    const last = ks.pop();
    ks.reduce((a, k) => a[k], o)[last] = v;
  };

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

  function txt(v) {
    // {tr,en} → arayüz dili
    if (v && typeof v === 'object') return v[global.Model.textLang || (global.I18N ? global.I18N.lang : 'tr')] ?? v.tr ?? v.en ?? '';
    return v;
  }

  /** ctx.appName: ikon öğesine ad yazmak için */
  function applyTemplate(slide, t, autoColor, ctx) {
    if (!t) return;
    if (t.layout) applyLayoutKey(slide, t.layout);
    if (t.frame) slide.device.frame = t.frame;
    if (t.deviceColor) slide.device.color = t.deviceColor;
    if (t.deviceSize != null) slide.device.w = t.deviceSize;
    ['deviceX:x', 'deviceY:y', 'deviceRot:rot', 'fit:fit', 'deviceShadow:shadow', 'glare:glare', 'glow:glow', 'glowStrength:glowStrength', 'homeIndicator:homeIndicator']
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
    if (t.hlTextColor) slide.text.hlTextColor = t.hlTextColor;
    if (t.box) slide.text.box = t.box;
    if (t.boxColor) slide.text.boxColor = t.boxColor;
    if (t.boxOpacity != null) slide.text.boxOpacity = t.boxOpacity;
    if (t.boxRadius != null) slide.text.boxRadius = t.boxRadius;
    if (Array.isArray(t.stickers)) {
      slide.stickers = t.stickers.map((st) => {
        const o = Object.assign({ opacity: 100 }, JSON.parse(JSON.stringify(STICKER_DEFAULTS[st.type] || {})), st);
        if (st.text != null) o.text = txt(st.text);
        if (st.sub != null) o.sub = txt(st.sub);
        if (o.type === 'icon' && ctx && ctx.appName && st.text == null) o.text = ctx.appName;
        if (!o.color && ['laurel', 'text', 'arrow', 'ring', 'icon'].includes(o.type)) o.color = slide.text.color;
        return o;
      });
    }
  }

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

  /**
   * Bir şablonu (template + slides satırları) slayt dizisine uygular; şablonun bütün stil olduğu
   * varsayılır: önceki kutu/renk/öğe kalıntıları temizlenir. Metinler satırdan alınır.
   * ctx = { appName, lang }
   */
  function applyVariantToSlides(slides, v, ctx) {
    const rows = v.slides || [];
    while (slides.length < rows.length) slides.push(newSlide(slides[slides.length - 1]));
    rows.forEach((row, i) => {
      const s = slides[i];
      if (v.template) {
        const fresh = newSlide();
        s.bg = Object.assign(fresh.bg, { img: s.bg.img });
        s.device = Object.assign(fresh.device, { fit: s.device.fit });
        s.device2 = Object.assign(fresh.device2, { shot: s.device2 && s.device2.shot });
        s.text = Object.assign(fresh.text, { title: s.text.title, sub: s.text.sub });
        if (!v.template.stickers) s.stickers = [];
      }
      applyTemplate(s, v.template, true, ctx);
      applyTemplate(s, row, !(v.template && v.template.textColor), ctx);
      if (row.title != null) s.text.title = String(txt(row.title)).replace(/\\n/g, '\n');
      if (row.subtitle != null) s.text.sub = String(txt(row.subtitle)).replace(/\\n/g, '\n');
    });
    return rows.length;
  }

  /** Şablonun i. slaytını bağımsız bir slayt nesnesi olarak üretir (galeri önizlemesi). */
  function tplSlide(tpl, i, ctx) {
    const sl = newSlide();
    applyTemplate(sl, tpl.template, true, ctx);
    applyTemplate(sl, tpl.slides[i], !tpl.template.textColor, ctx);
    sl.text.title = String(txt(tpl.slides[i].title) || '');
    sl.text.sub = String(txt(tpl.slides[i].subtitle) || '');
    return sl;
  }

  global.Model = { getP, setP, BG_PRESETS, LAYOUT_PRESETS, STICKER_DEFAULTS, newSlide, upgradeSlide, luminance, resolveBg, applyLayoutKey, TEXT_MAP, txt, applyTemplate, applyVariantToSlides, tplSlide, mockShot };
})(window);
