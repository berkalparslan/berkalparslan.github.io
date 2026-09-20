/* Arka plan + metin + cihaz + öğeler (sticker) -> tek karede birleştiren render katmanı. */
(function (global) {
  const { drawDevice, deviceHeight, roundRect } = global.Frames;

  const FONTS = {
    system: '-apple-system, "SF Pro Display", system-ui, "Helvetica Neue", Arial, sans-serif',
    'helvetica-neue': '"Helvetica Neue", Helvetica, Arial, sans-serif',
    avenir: '"Avenir Next", Avenir, "Helvetica Neue", sans-serif',
    futura: 'Futura, "Trebuchet MS", sans-serif',
    georgia: 'Georgia, "Times New Roman", serif',
    times: '"Times New Roman", Times, serif',
    courier: '"Courier New", Courier, monospace',
    impact: 'Impact, "Arial Black", sans-serif',
    /* web fontları (Google Fonts, index.html'de yüklenir) */
    inter: '"Inter", -apple-system, system-ui, sans-serif',
    manrope: '"Manrope", -apple-system, system-ui, sans-serif',
    'plus-jakarta': '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
    'space-grotesk': '"Space Grotesk", -apple-system, system-ui, sans-serif',
    outfit: '"Outfit", -apple-system, system-ui, sans-serif',
    sora: '"Sora", -apple-system, system-ui, sans-serif',
    nunito: '"Nunito", -apple-system, system-ui, sans-serif',
    bricolage: '"Bricolage Grotesque", -apple-system, system-ui, sans-serif',
    unbounded: '"Unbounded", -apple-system, system-ui, sans-serif',
    bebas: '"Bebas Neue", Impact, sans-serif',
    playfair: '"Playfair Display", Georgia, serif',
    fraunces: '"Fraunces", Georgia, serif',
    'dm-serif': '"DM Serif Display", Georgia, serif',
    'instrument-serif': '"Instrument Serif", Georgia, serif',
    custom: 'CustomFont, sans-serif',
  };
  /* Google Fonts'ta yalnız tek ağırlığı olanlar */
  const SINGLE_WEIGHT = { bebas: 400, 'dm-serif': 400, 'instrument-serif': 400 };

  let noiseTile = null;
  function getNoiseTile() {
    if (noiseTile) return noiseTile;
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const cx = c.getContext('2d');
    const d = cx.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 120 + Math.random() * 135;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    cx.putImageData(d, 0, 0);
    noiseTile = c;
    return c;
  }

  const MESH_LAYOUTS = [
    [[0.15, 0.15, 0.75], [0.85, 0.3, 0.7], [0.5, 0.9, 0.85]],
    [[0.8, 0.12, 0.65], [0.12, 0.55, 0.8], [0.7, 0.92, 0.7]],
    [[0.5, 0.1, 0.8], [0.1, 0.85, 0.7], [0.95, 0.7, 0.75]],
    [[0.25, 0.35, 0.9], [0.9, 0.2, 0.6], [0.55, 0.85, 0.65]],
  ];

  /** Gradyan / düz renk / görsel tabanı. unit = tek slaytın uzun kenarı (panoramada ölçek bunu korur). */
  function drawBase(ctx, W, H, bg, bgImg, unit) {
    unit = unit || Math.max(W, H);
    if (bg.type === 'solid') {
      ctx.fillStyle = bg.c1;
      ctx.fillRect(0, 0, W, H);
    } else if (bg.type === 'linear') {
      const a = ((bg.angle || 0) - 90) * (Math.PI / 180);
      const r = Math.abs(W * Math.cos(a)) / 2 + Math.abs(H * Math.sin(a)) / 2;
      const g = ctx.createLinearGradient(
        W / 2 - Math.cos(a) * r, H / 2 - Math.sin(a) * r,
        W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r
      );
      g.addColorStop(0, bg.c1);
      g.addColorStop(1, bg.c2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else if (bg.type === 'radial') {
      ctx.fillStyle = bg.c2;
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, Math.max(W, H) * 0.75);
      g.addColorStop(0, bg.c1);
      g.addColorStop(1, bg.c2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else if (bg.type === 'mesh') {
      ctx.fillStyle = bg.c3 || bg.c2;
      ctx.fillRect(0, 0, W, H);
      const layout = MESH_LAYOUTS[(bg.variant || 0) % MESH_LAYOUTS.length];
      const cols = [bg.c1, bg.c2, bg.c3 || bg.c1];
      const wide = W / H > 1.2; // panorama: lekeleri yatayda tekrarla
      const reps = wide ? Math.ceil(W / (H * 0.7)) : 1;
      for (let k = 0; k < reps; k++) {
        layout.forEach((p, i) => {
          const px = wide ? (k + p[0]) * (W / reps) : W * p[0];
          const g = ctx.createRadialGradient(px, H * p[1], 0, px, H * p[1], unit * p[2]);
          g.addColorStop(0, cols[(i + k) % 3]);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
        });
      }
    } else if (bg.type === 'image') {
      ctx.fillStyle = bg.c1;
      ctx.fillRect(0, 0, W, H);
      if (bgImg) {
        const ir = bgImg.width / bgImg.height, br = W / H;
        let dw, dh;
        if (ir > br) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; }
        if (bg.blur > 0) ctx.filter = `blur(${(bg.blur / 100) * unit * 0.03}px)`;
        ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
        ctx.filter = 'none';
      }
      if (bg.dim > 0) {
        ctx.fillStyle = `rgba(0,0,0,${bg.dim / 100})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // desen
    if (bg.pattern && bg.pattern !== 'none') {
      ctx.save();
      ctx.globalAlpha = (bg.patternOpacity ?? 12) / 100;
      ctx.strokeStyle = ctx.fillStyle = bg.patternColor || '#ffffff';
      const u = Math.min(unit, W);
      const step = u * 0.05;
      if (bg.pattern === 'dots') {
        for (let x = step / 2; x < W; x += step)
          for (let y = step / 2; y < H; y += step) {
            ctx.beginPath();
            ctx.arc(x, y, u * 0.004, 0, Math.PI * 2);
            ctx.fill();
          }
      } else if (bg.pattern === 'grid') {
        ctx.lineWidth = Math.max(1, u * 0.0015);
        for (let x = 0; x <= W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y <= H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      } else if (bg.pattern === 'diagonal') {
        ctx.lineWidth = Math.max(1, u * 0.006);
        for (let i = -H; i < W + H; i += step * 1.6) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
        }
      } else if (bg.pattern === 'rings') {
        ctx.lineWidth = Math.max(1, u * 0.004);
        for (let r = u * 0.1; r < Math.max(W, H) * 1.2; r += u * 0.09) {
          ctx.beginPath(); ctx.arc(W / 2, H * 0.42, r, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (bg.pattern === 'waves') {
        ctx.lineWidth = Math.max(1, u * 0.004);
        for (let y = -step; y < H + step; y += step * 1.4) {
          ctx.beginPath();
          for (let x = 0; x <= W; x += 6) ctx.lineTo(x, y + Math.sin((x / u) * 14) * step * 0.5);
          ctx.stroke();
        }
      } else if (bg.pattern === 'blobs') {
        // yumuşak organik lekeler (appscreens "blob" havası) — köşelerde büyük, ortada yok
        const seeds = [[0.05, 0.12, 0.34], [0.95, 0.28, 0.26], [0.1, 0.78, 0.3], [0.9, 0.9, 0.36], [0.55, 1.02, 0.22]];
        const reps = Math.max(1, Math.round(W / u));
        for (let k = 0; k < reps; k++) seeds.forEach(([px, py, r], i) => {
          const cx = (k + px) * (W / reps), cy = H * py, rr = u * r;
          ctx.beginPath();
          for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 24) {
            const wob = 1 + 0.12 * Math.sin(a * 3 + i) + 0.06 * Math.cos(a * 5 + k);
            const x = cx + Math.cos(a) * rr * wob, y = cy + Math.sin(a) * rr * wob;
            a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.closePath(); ctx.fill();
        });
      } else if (bg.pattern === 'circles') {
        // büyük, kaymış iç içe daireler
        ctx.lineWidth = Math.max(1, u * 0.012);
        for (let r = u * 0.12; r < u * 0.9; r += u * 0.14) {
          ctx.beginPath(); ctx.arc(W * 0.78, H * 0.28, r, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (bg.pattern === 'stripe') {
        // alt üçte birde kalın çapraz şerit
        ctx.save();
        ctx.translate(W / 2, H * 0.62); ctx.rotate(-0.28);
        ctx.fillRect(-W * 1.2, -u * 0.09, W * 2.4, u * 0.18);
        ctx.restore();
      } else if (bg.pattern === 'cross') {
        ctx.lineWidth = Math.max(1, u * 0.002);
        const s = step * 1.3, a = u * 0.008;
        for (let x = s / 2; x < W; x += s)
          for (let y = s / 2; y < H; y += s) {
            ctx.beginPath(); ctx.moveTo(x - a, y); ctx.lineTo(x + a, y); ctx.moveTo(x, y - a); ctx.lineTo(x, y + a); ctx.stroke();
          }
      }
      ctx.restore();
    }
  }

  /**
   * pan = { i, n } verilirse arka plan n slayt genişliğinde çizilip i. dilimi gösterilir
   * (panoramik / kareler arası akan arka plan).
   */
  function drawBackground(ctx, W, H, bg, bgImg, pan) {
    ctx.save();
    if (pan && pan.n > 1 && bg.type !== 'image') {
      ctx.save();
      ctx.translate(-pan.i * W, 0);
      drawBase(ctx, W * pan.n, H, bg, bgImg, Math.max(W, H));
      ctx.restore();
    } else {
      drawBase(ctx, W, H, bg, bgImg, Math.max(W, H));
    }

    if (bg.vignette > 0) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${bg.vignette / 100})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    if (bg.noise > 0) {
      ctx.save();
      ctx.globalAlpha = bg.noise / 100;
      ctx.globalCompositeOperation = 'overlay';
      const pat = ctx.createPattern(getNoiseTile(), 'repeat');
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* metin: [köşeli parantez] içindeki kelimeler vurgu rengiyle çizilir  */
  /* ------------------------------------------------------------------ */
  function tokenize(para) {
    const out = [];
    let hl = false;
    for (let w of para.split(/\s+/).filter(Boolean)) {
      let end = false;
      const a = w.indexOf('[');
      if (a >= 0) { w = w.slice(0, a) + w.slice(a + 1); hl = true; }
      const b = w.indexOf(']');
      if (b >= 0) { w = w.slice(0, b) + w.slice(b + 1); end = true; }
      if (w) out.push({ w, hl });
      if (end) hl = false;
    }
    return out;
  }

  /** Kelimeleri satırlara böler; her satır { words:[{w,hl,width}], width } */
  function wrapWords(ctx, text, maxWidth) {
    const lines = [];
    const space = ctx.measureText(' ').width;
    for (const para of String(text).split('\n')) {
      const words = tokenize(para);
      if (!words.length) { lines.push({ words: [], width: 0, space }); continue; }
      let line = [], width = 0;
      for (const wd of words) {
        wd.width = ctx.measureText(wd.w).width;
        const add = line.length ? space + wd.width : wd.width;
        if (width + add > maxWidth && line.length) {
          lines.push({ words: line, width, space });
          line = [wd]; width = wd.width;
        } else { line.push(wd); width += add; }
      }
      lines.push({ words: line, width, space });
    }
    return lines;
  }

  function fontFor(t, size, weight) {
    const family = FONTS[t.font] || FONTS.system;
    const w = SINGLE_WEIGHT[t.font] || weight;
    return `${w} ${size}px ${family}`;
  }

  /** Bloğun yerleşimini hesaplar (çizmez). */
  function layoutText(ctx, W, H, t) {
    const pad = (W * (t.pad ?? 8)) / 100;
    const boxPad = t.box && t.box !== 'none' ? W * 0.035 : 0;
    const maxW = W - pad * 2 - boxPad * 2;
    const rows = [];
    let y = 0;
    if (t.title) {
      const size = (W * t.titleSize) / 100;
      ctx.font = fontFor(t, size, t.weight);
      ctx.letterSpacing = t.letterSpacing ? `${(size * t.letterSpacing) / 100}px` : '0px';
      for (const ln of wrapWords(ctx, t.title, maxW)) {
        rows.push({ kind: 'title', size, y, ...ln, font: ctx.font, ls: ctx.letterSpacing });
        y += size * (t.lineHeight ?? 1.15);
      }
      ctx.letterSpacing = '0px';
      y += size * 0.28;
    }
    if (t.sub) {
      const size = (W * t.subSize) / 100;
      ctx.font = fontFor(t, size, t.subWeight ?? 400);
      for (const ln of wrapWords(ctx, t.sub, maxW)) {
        rows.push({ kind: 'sub', size, y, ...ln, font: ctx.font, ls: '0px' });
        y += size * (t.lineHeight ?? 1.15);
      }
    }
    const blockW = rows.reduce((m, r) => Math.max(m, r.width), 0);
    return { rows, height: y, width: blockW, pad, boxPad, maxW };
  }

  /** Metin bloğunu çizer, kapladığı yüksekliği döner. measureOnly=true ise çizmez. */
  function drawText(ctx, W, H, t, measureOnly) {
    if (!t.title && !t.sub) return 0;
    ctx.save();
    const L = layoutText(ctx, W, H, t);
    if (measureOnly) { ctx.restore(); return L.height; }

    const align = t.align || 'center';
    const anchorX = align === 'left' ? L.pad + L.boxPad : align === 'right' ? W - L.pad - L.boxPad : W / 2;
    const top = (H * t.y) / 100;

    // kutu (metnin arkasında)
    if (t.box && t.box !== 'none' && L.rows.length) {
      const bw = L.width + L.boxPad * 2;
      const bh = L.height + L.boxPad * 1.6;
      const bx = align === 'left' ? L.pad : align === 'right' ? W - L.pad - bw : W / 2 - bw / 2;
      const by = top - L.boxPad * 0.8;
      const r = W * (t.boxRadius ?? 3) / 100;
      ctx.save();
      const op = (t.boxOpacity ?? 100) / 100;
      if (t.box === 'glass') {
        ctx.globalAlpha = op * 0.16;
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, bx, by, bw, bh, r); ctx.fill();
        ctx.globalAlpha = op * 0.35;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, W * 0.0015);
        roundRect(ctx, bx, by, bw, bh, r); ctx.stroke();
      } else if (t.box === 'outline') {
        ctx.globalAlpha = op;
        ctx.strokeStyle = t.boxColor || t.color; ctx.lineWidth = Math.max(1, W * 0.003);
        roundRect(ctx, bx, by, bw, bh, r); ctx.stroke();
      } else {
        ctx.globalAlpha = op;
        ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = W * 0.03; ctx.shadowOffsetY = W * 0.01;
        ctx.fillStyle = t.boxColor || '#ffffff';
        roundRect(ctx, bx, by, bw, bh, r); ctx.fill();
      }
      ctx.restore();
    }

    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    if (t.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,.35)';
      ctx.shadowBlur = W * 0.012;
      ctx.shadowOffsetY = W * 0.004;
    }
    const accent = t.accent || '#ffd60a';
    const hlStyle = t.hlStyle || 'color';

    for (const row of L.rows) {
      ctx.font = row.font;
      ctx.letterSpacing = row.ls;
      const isTitle = row.kind === 'title';
      const y = top + row.y;
      let x = align === 'left' ? anchorX : align === 'right' ? anchorX - row.width : anchorX - row.width / 2;
      ctx.globalAlpha = isTitle ? 1 : (t.subOpacity ?? 85) / 100;
      // vurgu arka planları (marker) önce
      if (isTitle && hlStyle === 'marker') {
        let mx = x;
        for (const wd of row.words) {
          if (wd.hl) {
            ctx.save();
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = accent;
            const px = row.size * 0.12, py = row.size * 0.06;
            roundRect(ctx, mx - px, y - py, wd.width + px * 2, row.size * 1.08 + py * 2, row.size * 0.18);
            ctx.fill();
            ctx.restore();
          }
          mx += wd.width + row.space;
        }
      }
      for (const wd of row.words) {
        let color = isTitle ? t.color : (t.subColor || t.color);
        if (isTitle && wd.hl) {
          if (hlStyle === 'marker') color = t.hlTextColor || contrastFor(accent);
          else color = accent;
        }
        ctx.fillStyle = color;
        ctx.fillText(wd.w, x, y);
        if (isTitle && wd.hl && hlStyle === 'underline') {
          ctx.save();
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = accent; ctx.lineWidth = row.size * 0.09; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, y + row.size * 1.02); ctx.lineTo(x + wd.width, y + row.size * 1.02); ctx.stroke();
          ctx.restore();
        }
        x += wd.width + row.space;
      }
      ctx.letterSpacing = '0px';
    }
    ctx.restore();
    return L.height;
  }

  function contrastFor(hex) {
    const h = (hex || '#000').replace('#', '');
    if (h.length < 6) return '#111214';
    const r = parseInt(h.substr(0, 2), 16) / 255, g = parseInt(h.substr(2, 2), 16) / 255, b = parseInt(h.substr(4, 2), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? '#111214' : '#ffffff';
  }

  /* ------------------------------------------------------------------ */
  /* öğeler: çip, puan, laurel, bildirim kartı, uygulama ikonu           */
  /* ------------------------------------------------------------------ */
  function star(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  function leafBranch(ctx, cx, cy, R, dir, color, lw) {
    // dir = -1 sol, +1 sağ; alttan başlayıp yukarı doğru yaprak dizisi
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, R, dir < 0 ? Math.PI * 0.55 : Math.PI * 0.45, dir < 0 ? Math.PI * 1.25 : -Math.PI * 0.25, dir < 0);
    ctx.stroke();
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = dir < 0
        ? Math.PI * 0.55 + (i / (n - 1)) * Math.PI * 0.7
        : Math.PI * 0.45 - (i / (n - 1)) * Math.PI * 0.7;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      const len = R * 0.28, wid = R * 0.11;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + side * 0.9 + (dir < 0 ? Math.PI : 0));
        ctx.beginPath();
        ctx.ellipse(len / 2, 0, len / 2, wid, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawSticker(ctx, W, H, s, images) {
    const cx = W / 2 + (W * (s.x ?? 0)) / 100;
    const cy = (H * (s.y ?? 50)) / 100;
    const sz = (W * (s.size ?? 4)) / 100; // temel ölçü (yazı boyutu)
    const family = FONTS[s.font] || FONTS.system;
    ctx.save();
    ctx.translate(cx, cy);
    if (s.rot) ctx.rotate((s.rot * Math.PI) / 180);
    ctx.globalAlpha = (s.opacity ?? 100) / 100;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const bg = s.bg || '#ffffff';
    const fg = s.color || contrastFor(bg);
    const shadow = () => { ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = sz * 0.9; ctx.shadowOffsetY = sz * 0.25; };

    if (s.type === 'pill') {
      const label = [s.emoji, s.text].filter(Boolean).join('  ');
      ctx.font = `700 ${sz}px ${family}`;
      const tw = ctx.measureText(label).width;
      const ph = sz * 1.9, pw = tw + sz * 1.6;
      shadow();
      ctx.fillStyle = bg;
      roundRect(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
      ctx.shadowColor = 'transparent';
      if (s.outline) { ctx.strokeStyle = fg; ctx.lineWidth = sz * 0.08; roundRect(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2); ctx.stroke(); }
      ctx.fillStyle = fg;
      ctx.fillText(label, -tw / 2, sz * 0.05);
    } else if (s.type === 'rating') {
      ctx.font = `700 ${sz}px ${family}`;
      const label = s.text || '4.9';
      const tw = ctx.measureText(label).width;
      const starR = sz * 0.5, gap = sz * 0.18;
      const starsW = 5 * starR * 2 + 4 * gap;
      const pw = starsW + sz * 0.7 + tw + sz * 1.6, ph = sz * 1.9;
      shadow();
      ctx.fillStyle = bg;
      roundRect(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
      ctx.shadowColor = 'transparent';
      let x = -pw / 2 + sz * 0.8 + starR;
      ctx.fillStyle = s.starColor || '#f59e0b';
      for (let i = 0; i < 5; i++) { star(ctx, x, 0, starR); x += starR * 2 + gap; }
      ctx.fillStyle = fg;
      ctx.fillText(label, x - starR + sz * 0.5, sz * 0.05);
    } else if (s.type === 'laurel') {
      const col = s.color || '#ffffff';
      const R = sz * 2.6;
      leafBranch(ctx, -R * 0.55, R * 0.15, R, -1, col, sz * 0.08);
      leafBranch(ctx, R * 0.55, R * 0.15, R, 1, col, sz * 0.08);
      ctx.textAlign = 'center';
      ctx.fillStyle = col;
      if (s.sub) {
        ctx.font = `600 ${sz * 0.62}px ${family}`;
        ctx.letterSpacing = `${sz * 0.08}px`;
        ctx.fillText(String(s.sub).toUpperCase(), 0, -sz * 0.55);
        ctx.letterSpacing = '0px';
      }
      ctx.font = `800 ${sz * 1.05}px ${family}`;
      const lines = String(s.text || '').split('\n');
      lines.forEach((ln, i) => ctx.fillText(ln, 0, sz * 0.45 + i * sz * 1.1));
    } else if (s.type === 'note') {
      // bildirim kartı: ikon + başlık + alt metin
      const w = (W * (s.w ?? 70)) / 100, h = sz * 3.6, r = sz * 0.9;
      shadow();
      ctx.fillStyle = bg;
      roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.fill();
      ctx.shadowColor = 'transparent';
      const ic = h * 0.62, ix = -w / 2 + sz * 0.9, iy = -ic / 2;
      const img = images && images.icon;
      ctx.save();
      roundRect(ctx, ix, iy, ic, ic, ic * 0.24); ctx.clip();
      if (img) ctx.drawImage(img, ix, iy, ic, ic);
      else {
        ctx.fillStyle = s.iconBg || '#6366f1'; ctx.fillRect(ix, iy, ic, ic);
        ctx.fillStyle = '#fff'; ctx.font = `700 ${ic * 0.5}px ${family}`; ctx.textAlign = 'center';
        ctx.fillText(s.emoji || '✓', ix + ic / 2, iy + ic / 2 + ic * 0.04);
      }
      ctx.restore();
      const tx = ix + ic + sz * 0.7;
      ctx.fillStyle = fg;
      ctx.font = `700 ${sz * 0.95}px ${family}`;
      ctx.fillText(s.text || '', tx, -sz * 0.62);
      ctx.globalAlpha *= 0.65;
      ctx.font = `400 ${sz * 0.85}px ${family}`;
      ctx.fillText(s.sub || '', tx, sz * 0.5);
      ctx.globalAlpha = (s.opacity ?? 100) / 100;
      if (s.time) {
        ctx.globalAlpha *= 0.5;
        ctx.textAlign = 'right';
        ctx.font = `500 ${sz * 0.7}px ${family}`;
        ctx.fillText(s.time, w / 2 - sz * 0.9, -sz * 0.62);
      }
    } else if (s.type === 'icon') {
      // uygulama ikonu + ad
      const ic = sz * 2.4;
      const img = images && images.icon;
      ctx.font = `700 ${sz}px ${family}`;
      const tw = s.text ? ctx.measureText(s.text).width : 0;
      const total = ic + (tw ? sz * 0.6 + tw : 0);
      const ix = -total / 2;
      shadow();
      ctx.fillStyle = s.iconBg || '#6366f1';
      roundRect(ctx, ix, -ic / 2, ic, ic, ic * 0.23); ctx.fill();
      ctx.shadowColor = 'transparent';
      if (img) {
        ctx.save(); roundRect(ctx, ix, -ic / 2, ic, ic, ic * 0.23); ctx.clip();
        ctx.drawImage(img, ix, -ic / 2, ic, ic); ctx.restore();
      } else {
        ctx.fillStyle = '#fff'; ctx.font = `700 ${ic * 0.5}px ${family}`; ctx.textAlign = 'center';
        ctx.fillText(s.emoji || (s.text || 'A')[0], ix + ic / 2, ic * 0.04);
        ctx.textAlign = 'left';
      }
      if (tw) {
        ctx.fillStyle = s.color || '#ffffff';
        ctx.font = `700 ${sz}px ${family}`;
        ctx.fillText(s.text, ix + ic + sz * 0.6, sz * 0.05);
      }
    } else if (s.type === 'arrow') {
      // kavisli ok: bir noktaya dikkat çeker
      const L = sz * 4;
      ctx.strokeStyle = s.color || '#ffffff';
      ctx.lineWidth = sz * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-L / 2, L * 0.3);
      ctx.quadraticCurveTo(-L * 0.1, -L * 0.5, L / 2, -L * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(L / 2 - sz * 0.9, -L * 0.55); ctx.lineTo(L / 2, -L * 0.1); ctx.lineTo(L / 2 - sz * 1.1, sz * 0.25);
      ctx.stroke();
    } else if (s.type === 'ring') {
      // vurgu halkası
      const r = sz * 2;
      ctx.strokeStyle = s.color || '#ffffff';
      ctx.lineWidth = sz * 0.2;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    } else if (s.type === 'text') {
      // serbest metin
      ctx.textAlign = 'center';
      ctx.fillStyle = s.color || '#ffffff';
      ctx.font = `${s.weight || 700} ${sz}px ${family}`;
      String(s.text || '').split('\n').forEach((ln, i) => ctx.fillText(ln, 0, i * sz * 1.15));
    }
    ctx.restore();
  }

  function drawStickers(ctx, W, H, slide, images) {
    (slide.stickers || []).forEach((s) => drawSticker(ctx, W, H, s, images));
  }

  function drawDeviceLayer(ctx, W, H, d, img) {
    const bodyW = (W * d.w) / 100;
    const bodyH = deviceHeight(global.Frames.FRAMES[d.frame] || global.Frames.FRAMES['iphone-pro'], bodyW);
    const cx = W / 2 + (W * d.x) / 100;
    const top = (H * d.y) / 100;

    ctx.save();
    if (d.rot) {
      ctx.translate(cx, top + bodyH / 2);
      ctx.rotate((d.rot * Math.PI) / 180);
      ctx.translate(-cx, -(top + bodyH / 2));
    }
    if (d.glow && d.glowStrength > 0 && d.frame !== 'hidden') {
      // cihazın arkasında renkli ışıma
      ctx.save();
      ctx.shadowColor = d.glow;
      ctx.shadowBlur = bodyW * 0.35 * (d.glowStrength / 50);
      ctx.fillStyle = d.glow;
      ctx.globalAlpha = Math.min(1, d.glowStrength / 60);
      roundRect(ctx, cx - bodyW / 2 + bodyW * 0.04, top + bodyW * 0.04, bodyW * 0.92, bodyH - bodyW * 0.08, bodyW * 0.14);
      ctx.fill();
      ctx.restore();
    }
    drawDevice(ctx, {
      x: cx - bodyW / 2,
      y: top,
      w: bodyW,
      frame: d.frame,
      color: d.color,
      img,
      fit: d.fit,
      glare: d.glare,
      homeIndicator: d.homeIndicator,
      shadow: d.shadow,
      screenBg: d.screenBg,
    });
    ctx.restore();
  }

  /** Ana cihaz + (varsa) ikinci cihaz; ikincisi önde ya da arkada olabilir. */
  function drawDevices(ctx, W, H, slide, images) {
    const d2 = slide.device2;
    const second = () => drawDeviceLayer(ctx, W, H, d2, images.shot2);
    if (d2 && d2.on && !d2.front) second();
    if (slide.device.frame !== 'hidden') drawDeviceLayer(ctx, W, H, slide.device, images.shot);
    if (d2 && d2.on && d2.front) second();
  }

  /**
   * slide render. images = { shot, shot2, bg, icon }
   * pan = { i, n, bg } → panoramik arka plan (bg verilirse slaytınki yerine o kullanılır)
   */
  function renderSlide(ctx, W, H, slide, images, pan) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    const bg = pan && pan.bg ? pan.bg : slide.bg;
    drawBackground(ctx, W, H, bg, images.bg, pan);
    if (slide.device.above) {
      drawText(ctx, W, H, slide.text, false);
      drawDevices(ctx, W, H, slide, images);
    } else {
      drawDevices(ctx, W, H, slide, images);
      drawText(ctx, W, H, slide.text, false);
    }
    drawStickers(ctx, W, H, slide, images);
    ctx.restore();
  }

  /** Web fontunu yükler; yüklenince true döner (çağıran yeniden çizmeli). */
  const loadedFonts = new Set();
  function ensureFont(key, weight) {
    const fam = FONTS[key];
    if (!fam || !document.fonts || key === 'custom') return Promise.resolve(false);
    const w = SINGLE_WEIGHT[key] || weight || 700;
    const id = key + ':' + w;
    if (loadedFonts.has(id)) return Promise.resolve(false);
    const spec = `${w} 20px ${fam.split(',')[0]}`;
    return document.fonts.load(spec).then(() => { loadedFonts.add(id); return true; }).catch(() => false);
  }

  global.Render = { renderSlide, drawBackground, drawText, drawSticker, FONTS, SINGLE_WEIGHT, deviceHeight, ensureFont, contrastFor };
})(window);
