/* Arka plan + metin + cihaz -> tek karede birleştiren render katmanı. */
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
    custom: 'CustomFont, sans-serif',
  };

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

  function drawBackground(ctx, W, H, bg, bgImg) {
    ctx.save();
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
      layout.forEach((p, i) => {
        const g = ctx.createRadialGradient(W * p[0], H * p[1], 0, W * p[0], H * p[1], Math.max(W, H) * p[2]);
        g.addColorStop(0, cols[i]);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      });
    } else if (bg.type === 'image') {
      ctx.fillStyle = bg.c1;
      ctx.fillRect(0, 0, W, H);
      if (bgImg) {
        const ir = bgImg.width / bgImg.height, br = W / H;
        let dw, dh;
        if (ir > br) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; }
        if (bg.blur > 0) ctx.filter = `blur(${(bg.blur / 100) * W * 0.05}px)`;
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
      const step = W * 0.05;
      if (bg.pattern === 'dots') {
        for (let x = step / 2; x < W; x += step)
          for (let y = step / 2; y < H; y += step) {
            ctx.beginPath();
            ctx.arc(x, y, W * 0.004, 0, Math.PI * 2);
            ctx.fill();
          }
      } else if (bg.pattern === 'grid') {
        ctx.lineWidth = Math.max(1, W * 0.0015);
        for (let x = 0; x <= W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y <= H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      } else if (bg.pattern === 'diagonal') {
        ctx.lineWidth = Math.max(1, W * 0.006);
        for (let i = -H; i < W + H; i += step * 1.6) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
        }
      } else if (bg.pattern === 'rings') {
        ctx.lineWidth = Math.max(1, W * 0.004);
        for (let r = W * 0.1; r < Math.max(W, H) * 1.2; r += W * 0.09) {
          ctx.beginPath(); ctx.arc(W / 2, H * 0.42, r, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.restore();
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

  function wrapLines(ctx, text, maxWidth) {
    const out = [];
    for (const para of String(text).split('\n')) {
      if (!para.trim()) { out.push(''); continue; }
      let line = '';
      for (const word of para.split(/\s+/)) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          out.push(line);
          line = word;
        } else line = test;
      }
      out.push(line);
    }
    return out;
  }

  /** Metin bloğunu çizer, kapladığı yüksekliği döner. measureOnly=true ise çizmez. */
  function drawText(ctx, W, H, t, measureOnly) {
    const pad = (W * (t.pad ?? 8)) / 100;
    const maxW = W - pad * 2;
    const family = FONTS[t.font] || FONTS.system;
    const x = t.align === 'left' ? pad : t.align === 'right' ? W - pad : W / 2;
    let y = (H * t.y) / 100;

    ctx.save();
    ctx.textAlign = t.align;
    ctx.textBaseline = 'top';
    if (t.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,.35)';
      ctx.shadowBlur = W * 0.012;
      ctx.shadowOffsetY = W * 0.004;
    }

    const startY = y;
    if (t.title) {
      const size = (W * t.titleSize) / 100;
      ctx.font = `${t.weight} ${size}px ${family}`;
      ctx.fillStyle = t.color;
      if (t.letterSpacing) ctx.letterSpacing = `${(size * t.letterSpacing) / 100}px`;
      const lines = wrapLines(ctx, t.title, maxW);
      for (const ln of lines) {
        if (!measureOnly) ctx.fillText(ln, x, y);
        y += size * (t.lineHeight ?? 1.15);
      }
      ctx.letterSpacing = '0px';
      y += size * 0.28;
    }
    if (t.sub) {
      const size = (W * t.subSize) / 100;
      ctx.font = `${t.subWeight ?? 400} ${size}px ${family}`;
      ctx.fillStyle = t.subColor || t.color;
      ctx.globalAlpha = (t.subOpacity ?? 85) / 100;
      const lines = wrapLines(ctx, t.sub, maxW);
      for (const ln of lines) {
        if (!measureOnly) ctx.fillText(ln, x, y);
        y += size * (t.lineHeight ?? 1.15);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return y - startY;
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

  /** slide render. images = { shot, shot2, bg } */
  function renderSlide(ctx, W, H, slide, images) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    drawBackground(ctx, W, H, slide.bg, images.bg);
    if (slide.device.above) {
      drawText(ctx, W, H, slide.text, false);
      drawDevices(ctx, W, H, slide, images);
    } else {
      drawDevices(ctx, W, H, slide, images);
      drawText(ctx, W, H, slide.text, false);
    }
    ctx.restore();
  }

  global.Render = { renderSlide, drawBackground, drawText, FONTS, deviceHeight };
})(window);
