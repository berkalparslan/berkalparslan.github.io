/* Şablon DSL: kısa spec → katman tabanlı şablon.
   spec = {
     key, name, desc:{en,tr}, tags:[style etiketleri], cats:[app store kategorileri], theme:'light|dark|colourful', skill:'simple|advanced', free?:bool, orientation?:'portrait|landscape',
     style: { font, weight, size, color, accent, hlStyle, align, letterSpacing, lineHeight, uppercase, decoration, box, boxColor,
              subFont, subWeight, subSize, subColor, subOpacity, titleH, subGap },
     bg: {...ekran arka planı varsayılanı}, pbg: {...proje panoramik arka planı}, panorama: bool,
     device: { frame, color, shadow, glare, fit, glow, glowStrength, homeIndicator },
     screens: [ { layout, title, sub, bg, dev, titleStyle, subStyle, under:[metnin altına çizilen öğeler], els:[ {kind, x, y, size, text, ...} ], extra:[ham katmanlar] } ]
   } */
(function (global) {
  const { newLayer } = global.Model;
  const clone = (v) => JSON.parse(JSON.stringify(v));

  /* düzenler: başlık/alt başlık kutuları ve cihaz kutusu (yüzde) */
  const LAYOUTS = {
    'text-top': { title: { x: 6, y: 5, w: 88, h: 21, align: 'center' }, sub: { x: 8, y: 18.5, w: 84, h: 6, align: 'center' }, dev: { x: 17, y: 27, w: 66, rot: 0 } },
    'text-top-left': { title: { x: 6, y: 5, w: 88, h: 21, align: 'left' }, sub: { x: 6, y: 18.5, w: 84, h: 6, align: 'left' }, dev: { x: 17, y: 27, w: 66, rot: 0 } },
    'text-bottom': { title: { x: 6, y: 68, w: 88, h: 21, align: 'center' }, sub: { x: 8, y: 87.5, w: 84, h: 6, align: 'center' }, dev: { x: 19, y: 4, w: 62, rot: 0 } },
    'text-bottom-left': { title: { x: 6, y: 68, w: 88, h: 21, align: 'left' }, sub: { x: 6, y: 87.5, w: 84, h: 6, align: 'left' }, dev: { x: 19, y: 4, w: 62, rot: 0 } },
    'bleed': { title: { x: 6, y: 5, w: 88, h: 21, align: 'center' }, sub: { x: 8, y: 18.5, w: 84, h: 6, align: 'center' }, dev: { x: 8, y: 30, w: 84, rot: 0 } },
    'bleed-left': { title: { x: 6, y: 5, w: 88, h: 21, align: 'left' }, sub: { x: 6, y: 18.5, w: 84, h: 6, align: 'left' }, dev: { x: 8, y: 30, w: 84, rot: 0 } },
    'hero': { title: { x: 6, y: 5, w: 88, h: 21, align: 'center' }, sub: { x: 8, y: 18.5, w: 84, h: 6, align: 'center' }, dev: { x: 10, y: 31, w: 96, rot: -7 } },
    'tilt': { title: { x: 6, y: 5, w: 88, h: 21, align: 'center' }, sub: { x: 8, y: 18.5, w: 84, h: 6, align: 'center' }, dev: { x: 18, y: 29, w: 64, rot: -8 } },
    'tilt-r': { title: { x: 6, y: 5, w: 88, h: 21, align: 'center' }, sub: { x: 8, y: 18.5, w: 84, h: 6, align: 'center' }, dev: { x: 18, y: 29, w: 64, rot: 8 } },
    'right': { title: { x: 6, y: 6, w: 80, h: 21, align: 'left' }, sub: { x: 6, y: 19.5, w: 78, h: 6, align: 'left' }, dev: { x: 42, y: 33, w: 64, rot: 7 } },
    'left': { title: { x: 14, y: 6, w: 80, h: 21, align: 'right' }, sub: { x: 16, y: 19.5, w: 78, h: 6, align: 'right' }, dev: { x: -6, y: 33, w: 64, rot: -7 } },
    'small': { title: { x: 6, y: 7, w: 88, h: 21, align: 'center' }, sub: { x: 8, y: 20.5, w: 84, h: 6, align: 'center' }, dev: { x: 24, y: 38, w: 52, rot: 0 } },
    'full': { title: { x: 6, y: 4, w: 88, h: 21, align: 'center' }, sub: { x: 8, y: 17.5, w: 84, h: 6, align: 'center' }, dev: { x: 0, y: 0, w: 100, rot: 0, frame: 'none', fit: 'cover', shadow: 0 } },
    'full-bottom': { title: { x: 6, y: 68, w: 88, h: 21, align: 'center' }, sub: { x: 8, y: 87.5, w: 84, h: 6, align: 'center' }, dev: { x: 0, y: 0, w: 100, rot: 0, frame: 'none', fit: 'cover', shadow: 0 } },
    'span-left': { title: { x: 6, y: 5, w: 88, h: 21, align: 'center' }, sub: { x: 8, y: 18.5, w: 84, h: 6, align: 'center' }, dev: { x: 50, y: 30, w: 92, rot: 0 } },
    'span-right': { title: { x: 6, y: 5, w: 88, h: 21, align: 'center' }, sub: { x: 8, y: 18.5, w: 84, h: 6, align: 'center' }, dev: { x: -42, y: 30, w: 92, rot: 0 } },
    'text-only': { title: { x: 6, y: 36, w: 88, h: 20, align: 'center' }, sub: { x: 8, y: 52, w: 84, h: 6, align: 'center' }, dev: null },
    'card': { title: { x: 8, y: 5, w: 84, h: 16, align: 'left' }, sub: { x: 8, y: 18, w: 84, h: 6, align: 'left' }, dev: { x: 8, y: 27, w: 84, rot: 0, frame: 'none', fit: 'top', shadow: 50 } },
    'mid': { title: { x: 6, y: 5, w: 88, h: 21, align: 'center' }, sub: { x: 8, y: 18.5, w: 84, h: 6, align: 'center' }, dev: { x: 14, y: 30, w: 72, rot: 0 } },
    'landscape': { title: { x: 5, y: 8, w: 40, h: 30, align: 'left' }, sub: { x: 5, y: 40, w: 40, h: 12, align: 'left' }, dev: { x: 50, y: 12, w: 40, rot: 0 } },
  };

  function expand(spec) {
    const st = Object.assign({ font: 'inter', weight: 800, size: 6.2, color: '#111214', accent: '#6c5ce7', hlStyle: 'color', letterSpacing: -1.5, lineHeight: 1.1, subSize: 3.1, subWeight: 500, subOpacity: 70 }, spec.style || {});
    const dev = Object.assign({ frame: 'iphone-pro', color: 'graphite', shadow: 45, glare: true, fit: 'top', homeIndicator: true }, spec.device || {});
    const screens = (spec.screens || []).map((sc, i) => {
      const lay = LAYOUTS[sc.layout || spec.layout || 'text-top'] || LAYOUTS['text-top'];
      const layers = [];
      const titleBox = Object.assign({}, lay.title, st.titleBox || {}, sc.titleBox || {});
      const subBox = Object.assign({}, lay.sub, st.subBox || {}, sc.subBox || {});
      (sc.under || []).forEach((e) => layers.push(newLayer('element', Object.assign({}, e, { text: e.text == null ? undefined : (typeof e.text === 'string' ? { en: e.text } : e.text) }))));
      if (sc.title != null) layers.push(newLayer('text', Object.assign({ role: 'title', name: 'Title', text: typeof sc.title === 'string' ? { en: sc.title } : sc.title },
        { font: st.font, weight: st.weight, size: st.size, color: st.color, accent: st.accent, hlStyle: st.hlStyle, letterSpacing: st.letterSpacing, lineHeight: st.lineHeight, uppercase: !!st.uppercase, decoration: st.decoration || 'none', box: st.box || 'none', boxColor: st.boxColor || '#ffffff', boxOpacity: st.boxOpacity ?? 100, boxRadius: st.boxRadius ?? 3, shadow: !!st.shadow, hlTextColor: st.hlTextColor, gradient: st.gradient },
        titleBox, sc.titleStyle || {})));
      if (sc.sub != null && sc.sub !== false) layers.push(newLayer('subtitle', Object.assign({ role: 'subtitle', name: 'Subtitle', text: typeof sc.sub === 'string' ? { en: sc.sub } : sc.sub },
        { font: st.subFont || st.font, weight: st.subWeight, size: st.subSize, color: st.subColor || st.color, opacity: st.subOpacity, letterSpacing: st.subLetterSpacing ?? 0, lineHeight: 1.2, uppercase: !!st.subUppercase, flow: st.subFlow !== false, flowGap: st.subGap ?? 1.2 },
        subBox, sc.subStyle || {})));
      const d = sc.dev === null ? null : Object.assign({}, lay.dev || {}, dev, sc.dev || {});
      if (d && lay.dev !== null && sc.dev !== null) layers.push(newLayer('device', Object.assign({ name: 'Device' }, d)));
      (sc.els || []).forEach((e) => layers.push(newLayer('element', Object.assign({}, e, { text: e.text == null ? undefined : (typeof e.text === 'string' ? { en: e.text } : e.text) }))));
      (sc.extra || []).forEach((L) => layers.push(newLayer(L.type, L)));
      // katman sırası: device önce (arka) mı? spec.deviceAbove → cihaz metnin üstünde
      if (spec.deviceAbove || sc.deviceAbove) { const di = layers.findIndex((L) => L.type === 'device'); if (di >= 0) { const [D] = layers.splice(di, 1); layers.push(D); } }
      else { const di = layers.findIndex((L) => L.type === 'device'); if (di >= 0) { const [D] = layers.splice(di, 1); layers.unshift(D); } }
      // elementler en üstte kalsın; metinler cihazın üstünde (bleed/full düzenlerde okunabilirlik)
      const bg = Object.assign({}, spec.bg || {}, sc.bg || {});
      if (spec.panorama && sc.bg == null) bg.panorama = true;
      return { name: sc.name || '', bg, layers };
    });
    return {
      key: spec.key, name: spec.name, desc: spec.desc || {}, tags: spec.tags || [], cats: spec.cats || [], theme: spec.theme || 'light', skill: spec.skill || 'simple', free: !!spec.free,
      orientation: spec.orientation || 'portrait', devices: spec.devices || ['iphone', 'ipad', 'android'], background: spec.panorama ? Object.assign({}, spec.pbg || spec.bg || {}) : null,
      screens, spec,
    };
  }

  global.TplDSL = { LAYOUTS, expand };
  global.TEMPLATES = global.TEMPLATES || [];
  global.defineTemplate = (spec) => { const t = expand(spec); const i = global.TEMPLATES.findIndex((x) => x.key === t.key); if (i >= 0) global.TEMPLATES[i] = t; else global.TEMPLATES.push(t); return t; };
})(typeof window !== 'undefined' ? window : globalThis);
