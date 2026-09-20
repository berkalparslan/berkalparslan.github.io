/* Editör: yatay ekran şeridi, kare bazlı katman paneli, sürükle-bırak, geri al, yakınlaştırma. */
(function () {
  const { $, el, esc, toast, download, slug } = window.UI;
  const { Store, Model, Render, Devices } = window;
  const RATIO = Devices.BASE.h / Devices.BASE.w;

  const E = { app: null, P: null, root: null, sel: -1, layer: null, zoom: 1, out: 'iphone-6.9', lang: 'en', undo: [], redo: [], drag: null, clip: null, layerOpen: {} };
  window.Editor = E;

  const out = () => Devices.byId(E.out) || Devices.OUTPUTS[0];
  const dims = () => { const o = out(); const land = E.P.orientation === 'landscape' || o.landscape; const w = land ? Math.max(o.w, o.h) : Math.min(o.w, o.h), h = land ? Math.min(o.w, o.h) : Math.max(o.w, o.h); return { W: w, H: h }; };
  const info = (i) => ({ lang: E.lang, defaultLang: E.P.languages.default, imageFor: Store.imageFor, shotSlot: Devices.slotForOutput(E.out), pan: E.P.screens[i].bg && E.P.screens[i].bg.panorama ? { i, n: E.P.screens.length } : null, project: E.P });
  const dispH = () => Math.round(640 * E.zoom);

  /* ---------- geri al ---------- */
  function snapshot(key) {
    const now = Date.now();
    if (key && E.lastKey === key && now - E.lastAt < 800) { E.lastAt = now; return; }
    E.lastKey = key; E.lastAt = now;
    E.undo.push(JSON.stringify(E.P.screens)); if (E.undo.length > 80) E.undo.shift(); E.redo.length = 0; syncUndo();
  }
  function undo() { if (!E.undo.length) return; E.redo.push(JSON.stringify(E.P.screens)); E.P.screens = JSON.parse(E.undo.pop()); E.lastKey = null; E.layer = null; commit(); }
  function redo() { if (!E.redo.length) return; E.undo.push(JSON.stringify(E.P.screens)); E.P.screens = JSON.parse(E.redo.pop()); E.lastKey = null; E.layer = null; commit(); }
  function syncUndo() { const u = $('#tbUndo'), r = $('#tbRedo'); if (u) u.disabled = !E.undo.length; if (r) r.disabled = !E.redo.length; }
  function commit() { E.app.save(); renderAll(); }

  /* ---------- kurulum ---------- */
  E.mount = function (root, app) {
    E.app = app; E.P = app.project; E.root = root; E.sel = -1; E.layer = null; E.undo = []; E.redo = [];
    E.lang = E.P.languages.default;
    if (!E.P.sizes.includes(E.out)) E.out = E.P.sizes[0] || 'iphone-6.9';
    root.innerHTML = '';
    const ed = el('div', 'ed');
    ed.appendChild(toolbar());
    const canvas = el('div', 'ed-canvas'); canvas.id = 'edCanvas';
    ed.appendChild(canvas);
    const z = el('div', 'ed-zoom', `<button id="zOut" title="${t('Zoom out')}">−</button><b id="zVal">100%</b><button id="zIn" title="${t('Zoom in')}">+</button><button id="zFit" title="Fit">⤢</button><button id="zKeys" title="${t('Keyboard shortcuts')}">⌨</button>`);
    ed.appendChild(z);
    root.appendChild(ed);
    $('#zOut').onclick = () => setZoom(E.zoom - 0.1); $('#zIn').onclick = () => setZoom(E.zoom + 0.1);
    $('#zFit').onclick = () => { const h = canvas.clientHeight - 60; setZoom(Math.max(0.3, Math.min(2, h / 640))); };
    $('#zKeys').onclick = () => window.Modals.shortcuts();
    bindKeys();
    bindDrop(canvas);
    renderAll();
    Render.ensureScreenFonts(E.P.screens, renderAll);
    if (document.fonts) document.fonts.ready.then(renderAll);
  };
  function setZoom(z) { E.zoom = Math.max(0.25, Math.min(2.5, Math.round(z * 100) / 100)); $('#zVal').textContent = Math.round(E.zoom * 100) + '%'; renderStrip(); }

  function toolbar() {
    const tb = el('div', 'ed-tools');
    const b = (id, label, cls, fn, title) => { const x = el('button', 'tb ' + (cls || ''), label); x.id = id; x.onclick = fn; if (title) x.title = title; tb.appendChild(x); return x; };
    b('tbBack', '←', '', () => { E.app.save(true).then(() => E.app.go('/projects')); }, t('Back to projects'));
    b('tbSave', '💾', '', () => { E.app.save(true); toast(t('Saved')); }, t('Save'));
    b('tbUndo', '↶', '', undo, t('Undo')); b('tbRedo', '↷', '', redo, t('Redo'));
    tb.appendChild(el('span', 'sep'));
    b('tbAI', '✨ ' + t('AI captions'), 'ai', () => window.Modals.ai());
    b('tbGlobals', '◎ ' + t('Globals'), '', (e) => globalsPopover(e.currentTarget));
    b('tbSetup', '⚙ ' + t('Setup'), '', () => window.Modals.setup('about'));
    b('tbBg', '▦ ' + t('Background'), '', (e) => bgPopover(e.currentTarget));
    b('tbLoc', '🌐 ' + t('Localize'), '', () => window.Modals.setup('languages'));
    b('tbShots', '📱 ' + t('App Screens'), '', () => window.Modals.screens(Math.max(0, E.sel)));
    tb.appendChild(el('span', 'grow'));
    tb.appendChild(el('span', 'saved', '')).id = 'savedAt';
    const lang = el('select'); lang.id = 'tbLang';
    const fillLang = () => { lang.innerHTML = ''; (E.P.languages.list || [E.P.languages.default]).forEach((l) => lang.appendChild(Object.assign(el('option', null, `${Model.LANG_FLAGS[l] || '🌐'} ${Model.LANG_NAMES[l] || l}`), { value: l }))); lang.value = E.lang; };
    fillLang(); lang.onchange = () => { E.lang = lang.value; renderAll(); };
    E.refreshLangs = fillLang;
    tb.appendChild(lang);
    const outSel = el('select'); outSel.id = 'tbOut';
    const fillOut = () => { outSel.innerHTML = ''; (E.P.sizes || []).forEach((id) => { const o = Devices.byId(id); if (o) outSel.appendChild(Object.assign(el('option', null, o.label), { value: id })); }); outSel.value = E.out; };
    fillOut(); outSel.onchange = () => { E.out = outSel.value; renderAll(); };
    E.refreshOuts = fillOut;
    tb.appendChild(outSel);
    b('tbExport', '⬇ ' + t('Preview & Export'), 'primary', () => window.Modals.exportModal('preview'));
    b('tbRefresh', '↻', '', () => renderAll(), 'Re-render');
    return tb;
  }

  /* ---------- şerit ---------- */
  function renderAll() { renderStrip(); syncUndo(); }
  function renderStrip() {
    const canvas = $('#edCanvas'); if (!canvas) return;
    const st = canvas.scrollLeft;
    canvas.innerHTML = '';
    const strip = el('div', 'ed-strip' + (E.P.screens.some((s) => s.bg && s.bg.panorama) ? ' pan' : ''));
    const { W, H } = dims();
    const h = dispH(), w = Math.round(h * (W / H));
    E.P.screens.forEach((s, i) => {
      const box = el('div', 'scr' + (i === E.sel ? ' sel' : '')); box.dataset.i = i; box.style.width = w + 'px'; box.style.height = h + 'px';
      const c = el('canvas'); c.width = Math.round(w * (window.devicePixelRatio > 1 ? 2 : 1)); c.height = Math.round(h * (window.devicePixelRatio > 1 ? 2 : 1)); c.style.width = w + 'px'; c.style.height = h + 'px';
      Render.renderScreen(c.getContext('2d'), c.width, c.height, s, info(i));
      box.appendChild(c);
      box.appendChild(el('span', 'num', String(i + 1)));
      const pen = el('button', 'pencil', i === E.sel ? '✓' : '✎'); pen.title = t('Edit screen');
      pen.onclick = (e) => { e.stopPropagation(); if (E.sel === i) { E.sel = -1; E.layer = null; } else { E.sel = i; E.layer = null; } renderStrip(); };
      box.appendChild(pen);
      box.onmousedown = (e) => onCanvasDown(e, i, box, w, h);
      box.onclick = () => { if (E.sel !== i && !E.moved) { E.sel = i; E.layer = null; renderStrip(); } E.moved = false; };
      if (i === E.sel && E.layer) { const L = s.layers.find((x) => x.id === E.layer); if (L) { const bb = Render.layerBox(w, h, L); const sb = el('div', 'sel-box'); sb.style.left = bb.x + 'px'; sb.style.top = bb.y + 'px'; sb.style.width = bb.w + 'px'; sb.style.height = bb.h + 'px'; if (L.type !== 'element') { const hd = el('div', 'h'); hd.onmousedown = (e) => onResizeDown(e, L, w, h); sb.appendChild(hd); } box.appendChild(sb); } }
      strip.appendChild(box);
      if (i === E.sel) strip.appendChild(panel(s, i));
    });
    const add = el('div', 'scr-add', '＋ ' + t('Add screen')); add.style.height = h + 'px';
    add.onclick = () => { snapshot('add'); const src = E.P.screens[E.P.screens.length - 1]; const ns = src ? Model.clone(src) : Model.newScreen(); ns.id = Model.uid('s'); ns.layers.forEach((L) => { L.id = Model.uid(); if (L.type === 'device') L.shots = {}; }); E.P.screens.push(ns); E.sel = E.P.screens.length - 1; commit(); };
    strip.appendChild(add);
    canvas.appendChild(strip);
    canvas.scrollLeft = st;
  }

  /* ---------- sürükleme ---------- */
  function hitLayer(s, x, y, w, h) {
    for (let i = s.layers.length - 1; i >= 0; i--) { const L = s.layers[i]; if (L.hidden || L.lock) continue; const b = Render.layerBox(w, h, L); if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return L; }
    return null;
  }
  function onCanvasDown(e, i, box, w, h) {
    if (e.target.classList.contains('pencil') || e.target.classList.contains('h')) return;
    const r = box.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    const s = E.P.screens[i];
    const L = hitLayer(s, x, y, w, h);
    if (E.sel !== i) { E.sel = i; E.layer = L ? L.id : null; renderStrip(); if (!L) return; }
    else if (!L) { if (E.layer) { E.layer = null; renderStrip(); } return; }
    if (E.layer !== L.id) { E.layer = L.id; renderStrip(); }
    const start = { x: e.clientX, y: e.clientY, lx: L.x, ly: L.y };
    E.moved = false;
    const box2 = $(`.scr[data-i="${i}"]`);
    const cv = box2 && box2.querySelector('canvas');
    const mv = (ev) => {
      const dx = (ev.clientX - start.x) / w * 100, dy = (ev.clientY - start.y) / h * 100;
      if (Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) > 3) { if (!E.moved) snapshot('drag'); E.moved = true; }
      L.x = Math.round((start.lx + dx) * 10) / 10; L.y = Math.round((start.ly + dy) * 10) / 10;
      if (cv) Render.renderScreen(cv.getContext('2d'), cv.width, cv.height, s, info(i));
      const sb = box2 && box2.querySelector('.sel-box'); if (sb) { const bb = Render.layerBox(w, h, L); sb.style.left = bb.x + 'px'; sb.style.top = bb.y + 'px'; }
    };
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); if (E.moved) { E.app.save(); refreshPanelFields(); } };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    e.preventDefault();
  }
  function onResizeDown(e, L, w, h) {
    e.stopPropagation(); e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, lw: L.w, lh: L.h || 0 };
    snapshot('resize');
    const mv = (ev) => { L.w = Math.max(5, Math.round((start.lw + (ev.clientX - start.x) / w * 100) * 10) / 10); if (L.type !== 'device') L.h = Math.max(2, Math.round((start.lh + (ev.clientY - start.y) / h * 100) * 10) / 10); renderStrip(); };
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); E.app.save(); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }

  /* ---------- panel ---------- */
  const ICON = { text: 'T', device: '📱', image: '🖼', element: '✦' };
  function panel(s, i) {
    const p = el('div', 'panel');
    const tools = el('div', 'panel-tools');
    const tb = (label, cls, fn, title) => { const b = el('button', 'tb ' + (cls || ''), label); b.onclick = fn; b.title = title || ''; tools.appendChild(b); };
    tb('✓', 'ok', () => { E.sel = -1; E.layer = null; renderStrip(); }, t('Done'));
    tb('⧉', '', () => { snapshot('dup'); const ns = Model.clone(s); ns.id = Model.uid('s'); ns.layers.forEach((L) => L.id = Model.uid()); E.P.screens.splice(i + 1, 0, ns); E.sel = i + 1; commit(); }, t('Duplicate'));
    tb('⬇', '', () => downloadScreen(i), t('Download this screen'));
    tb('◀', '', () => { if (i > 0) { snapshot('move'); const [x] = E.P.screens.splice(i, 1); E.P.screens.splice(i - 1, 0, x); E.sel = i - 1; commit(); } }, 'Move left');
    tb('▶', '', () => { if (i < E.P.screens.length - 1) { snapshot('move'); const [x] = E.P.screens.splice(i, 1); E.P.screens.splice(i + 1, 0, x); E.sel = i + 1; commit(); } }, 'Move right');
    tb('📋', '', () => { E.clip = Model.clone(s); toast(t('Copy screen')); }, t('Copy screen'));
    tb('📥', '', () => { if (!E.clip) return; snapshot('paste'); const c = Model.clone(E.clip); const keep = s.layers.filter((L) => L.type === 'device').map((L) => L.shots); s.bg = c.bg; s.layers = c.layers.map((L) => { L.id = Model.uid(); return L; }); s.layers.filter((L) => L.type === 'device').forEach((L, k) => { if (keep[k]) L.shots = keep[k]; }); commit(); }, t('Paste screen style'));
    tb('🗑', 'del', () => { if (E.P.screens.length <= 1) return; if (!confirm(t('Delete screen') + '?')) return; snapshot('del'); E.P.screens.splice(i, 1); E.sel = Math.max(0, i - 1); E.layer = null; commit(); }, t('Delete screen'));
    p.appendChild(tools);
    const body = el('div', 'panel-body');
    body.appendChild(accLayouts(s, i));
    body.appendChild(accBackground(s, i));
    s.layers.forEach((L) => body.appendChild(accLayer(s, i, L)));
    p.appendChild(body);
    return p;
  }
  function acc(title, icon, open, right) {
    const a = el('div', 'acc' + (open ? ' open' : ''));
    const h = el('div', 'acc-h', `<span class="ic">${icon}</span><span class="grow">${esc(title)}</span>`);
    if (right) right.forEach((b) => h.appendChild(b));
    h.appendChild(el('span', 'chev', '▼'));
    h.onclick = (e) => { if (e.target.closest('.mini')) return; a.classList.toggle('open'); if (a.dataset.layer) E.layerOpen[a.dataset.layer] = a.classList.contains('open'); };
    a.appendChild(h); const b = el('div', 'acc-b'); a.appendChild(b); a.body = b; return a;
  }
  const F = {
    text: (label, val, fn) => { const f = el('div', 'f', `<span>${esc(label)}</span>`); const i = el('input'); i.type = 'text'; i.value = val ?? ''; i.oninput = () => fn(i.value); f.appendChild(i); return f; },
    area: (label, val, fn) => { const f = el('div', 'f', `<span>${esc(label)}</span>`); const i = el('textarea'); i.value = val ?? ''; i.oninput = () => fn(i.value); f.appendChild(i); return f; },
    num: (label, val, fn, step, min, max) => { const f = el('div', 'f', `<span>${esc(label)}</span>`); const i = el('input'); i.type = 'number'; i.step = step || 0.5; if (min != null) i.min = min; if (max != null) i.max = max; i.value = val ?? 0; i.oninput = () => fn(parseFloat(i.value) || 0); f.appendChild(i); return f; },
    range: (label, val, fn, min, max, step, unit) => { const f = el('div', 'f', `<span>${esc(label)}</span>`); const r = el('div', 'rng'); const i = el('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step || 1; i.value = val ?? min; const b = el('b', null, (val ?? min) + (unit || '')); i.oninput = () => { fn(parseFloat(i.value)); b.textContent = i.value + (unit || ''); }; r.append(i, b); f.appendChild(r); return f; },
    sel: (label, val, opts, fn) => { const f = el('div', 'f', `<span>${esc(label)}</span>`); const s = el('select'); opts.forEach(([v, l]) => s.appendChild(Object.assign(el('option', null, t(l)), { value: v }))); s.value = val; s.onchange = () => fn(s.value); f.appendChild(s); return f; },
    color: (label, val, fn) => { const f = el('div', 'f', `<span>${esc(label)}</span>`); const i = el('input'); i.type = 'color'; i.value = /^#[0-9a-f]{6}$/i.test(val || '') ? val : '#ffffff'; i.oninput = () => fn(i.value); f.appendChild(i); return f; },
    check: (label, val, fn) => { const l = el('label', 'check'); const i = el('input'); i.type = 'checkbox'; i.checked = !!val; i.onchange = () => fn(i.checked); l.append(i, el('span', null, label)); return l; },
    btn: (label, fn, cls) => { const b = el('button', 'btn sm ' + (cls || ''), label); b.onclick = fn; return b; },
  };
  const row = (...fs) => { const r = el('div', 'row' + (fs.length === 1 ? ' one' : fs.length === 3 ? ' three' : '')); fs.forEach((f) => r.appendChild(f)); return r; };
  const upd = (key) => { snapshot(key); E.app.save(); repaint(); };
  function repaint() { const i = E.sel; if (i < 0) return; const box = $(`.scr[data-i="${i}"]`); const cv = box && box.querySelector('canvas'); if (cv) Render.renderScreen(cv.getContext('2d'), cv.width, cv.height, E.P.screens[i], info(i)); if (E.P.screens[i].bg && E.P.screens[i].bg.panorama) renderStripCanvasesOnly(); const sb = box && box.querySelector('.sel-box'); const L = E.layer && E.P.screens[i].layers.find((x) => x.id === E.layer); if (sb && L) { const bb = Render.layerBox(cv.clientWidth, cv.clientHeight, L); sb.style.left = bb.x + 'px'; sb.style.top = bb.y + 'px'; sb.style.width = bb.w + 'px'; sb.style.height = bb.h + 'px'; } }
  function renderStripCanvasesOnly() { document.querySelectorAll('.scr').forEach((box) => { const i = +box.dataset.i; const cv = box.querySelector('canvas'); Render.renderScreen(cv.getContext('2d'), cv.width, cv.height, E.P.screens[i], info(i)); }); }
  function refreshPanelFields() { renderStrip(); }

  function accLayouts(s, i) {
    const plus = el('button', 'mini', '＋'); plus.title = t('Add element');
    const a = acc(t('Layouts & Elements'), '⧉', true, [plus]);
    const list = el('div', 'layer-list');
    const { W, H } = dims();
    [...s.layers].reverse().forEach((L) => {
      const b = Render.layerBox(W, H, L);
      const r = el('div', 'layer' + (E.layer === L.id ? ' sel' : ''));
      r.innerHTML = `<span class="ic">${ICON[L.type] || '•'}</span><span class="nm">${esc(layerName(L))}</span><span class="dim">${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)}</span>`;
      const acts = el('div', 'acts');
      const mk = (lab, fn, title) => { const x = el('button', null, lab); x.title = title; x.onclick = (e) => { e.stopPropagation(); fn(); }; acts.appendChild(x); };
      mk(L.hidden ? '🙈' : '👁', () => { snapshot('vis'); L.hidden = !L.hidden; commit(); }, 'Show / hide');
      mk('▲', () => { snapshot('order'); const k = s.layers.indexOf(L); if (k < s.layers.length - 1) { s.layers.splice(k, 1); s.layers.splice(k + 1, 0, L); commit(); } }, 'Bring forward');
      mk('▼', () => { snapshot('order'); const k = s.layers.indexOf(L); if (k > 0) { s.layers.splice(k, 1); s.layers.splice(k - 1, 0, L); commit(); } }, 'Send backward');
      mk('⧉', () => { snapshot('dupL'); const c = Model.clone(L); c.id = Model.uid(); c.x = (c.x || 0) + 3; c.y = (c.y || 0) + 2; s.layers.push(c); E.layer = c.id; commit(); }, 'Duplicate');
      mk('🗑', () => { snapshot('delL'); s.layers.splice(s.layers.indexOf(L), 1); if (E.layer === L.id) E.layer = null; commit(); }, 'Delete');
      r.appendChild(acts);
      r.onclick = () => { E.layer = E.layer === L.id ? null : L.id; E.layerOpen[L.id] = true; renderStrip(); };
      list.appendChild(r);
    });
    a.body.appendChild(list);
    const addMenu = el('div', 'addmenu'); addMenu.hidden = true;
    const addBtn = (label, icon, fn) => { const b = el('button', null, `<span>${icon}</span>${esc(label)}`); b.onclick = fn; addMenu.appendChild(b); };
    const addL = (type, extra) => { snapshot('addL'); const L = Model.newLayer(type, extra); if (L.type === 'text') L.text = { [E.P.languages.default]: t('New text') }; if (L.type === 'element' && L.text && L.text.en && E.P.languages.default !== 'en') L.text[E.P.languages.default] = L.text.en; s.layers.push(L); E.layer = L.id; E.layerOpen[L.id] = true; commit(); };
    addBtn(t('Text'), 'T', () => addL('text', { role: 'title', size: 5, y: 40, h: 10 }));
    addBtn(t('Image'), '🖼', () => addL('image'));
    addBtn(t('Device'), '📱', () => addL('device', { w: 50, x: 25, y: 40 }));
    Model.ELEMENT_KINDS.forEach(([k, label]) => addBtn(t(label), { pill: '💊', rating: '⭐', stars: '✩', laurel: '🏆', note: '🔔', icon: '🅰', quote: '❝', text: 'Aa', sparkle: '✨', emoji: '😀', arrow: '↗', ring: '◯', shape: '◼' }[k] || '✦', () => addL('element', { kind: k })));
    a.body.appendChild(addMenu);
    plus.onclick = (e) => { e.stopPropagation(); addMenu.hidden = !addMenu.hidden; };
    const presets = el('div', 'preset-grid');
    Model.LAYOUT_PRESETS.forEach((p) => { const b = el('button', null, t(p.name)); b.onclick = () => { snapshot('preset'); p.apply(s); commit(); }; presets.appendChild(b); });
    a.body.appendChild(el('div', 'section-title', t('Pick a Preset')));
    a.body.appendChild(presets);
    const applyAll = F.btn(t('Apply this screen\'s layout to all screens'), () => { snapshot('applyAll'); E.P.screens.forEach((o) => { if (o === s) return; o.bg = Model.clone(s.bg); const keepShots = o.layers.filter((L) => L.type === 'device').map((L) => L.shots); const keepText = o.layers.filter((L) => L.type === 'text').map((L) => L.text); o.layers = s.layers.map((L) => Object.assign(Model.clone(L), { id: Model.uid() })); o.layers.filter((L) => L.type === 'device').forEach((L, k) => { if (keepShots[k]) L.shots = keepShots[k]; }); o.layers.filter((L) => L.type === 'text').forEach((L, k) => { if (keepText[k]) L.text = keepText[k]; }); }); commit(); toast(t('Applied to all screens')); }, 'wide');
    applyAll.style.marginTop = '8px';
    a.body.appendChild(applyAll);
    return a;
  }
  function layerName(L) { if (L.type === 'text') return Render.textOf(L.text, E.lang, E.P.languages.default).replace(/[\[\]\n]/g, ' ').slice(0, 26) || t('Text'); if (L.type === 'element') return (Model.ELEMENT_KINDS.find((e) => e[0] === L.kind) || [L.kind, L.kind])[1]; return L.name || L.type; }

  const BG_TYPES = [['solid', 'Solid'], ['linear', 'Gradient'], ['radial', 'Radial'], ['mesh', 'Mesh'], ['image', 'Image'], ['none', 'None']];
  const PATTERNS = [['none', 'None'], ['dots', 'Dots'], ['grid', 'Grid'], ['diagonal', 'Diagonal'], ['rings', 'Rings'], ['waves', 'Waves'], ['cross', 'Crosses'], ['blobs', 'Blobs'], ['circles', 'Circles'], ['stripe', 'Stripe'], ['sparkles', 'Sparkles']];
  const SWATCHES = ['#ffffff', '#f4f4f8', '#111214', '#000000', '#6d5ce7', '#1a1033', '#0f1b3d', '#0ea5e9', '#16a34a', '#58cc02', '#f97316', '#ef4444', '#ec4899', '#facc15', '#c8f542', '#fff4e6', '#ffd6e7', '#d6f5ea'];
  function bgFields(bg, onChange, isProject) {
    const wrap = el('div');
    wrap.appendChild(row(F.sel(t('Background style'), bg.type || 'solid', BG_TYPES, (v) => { bg.type = v; onChange('bgtype'); rebuild(); }), F.sel(t('Pattern'), bg.pattern || 'none', PATTERNS, (v) => { bg.pattern = v; onChange('pat'); })));
    const sw = el('div', 'swatches'); SWATCHES.forEach((c) => { const b = el('div', 'swatch'); b.style.background = c; b.onclick = () => { bg.c1 = c; if (bg.type === 'none') bg.type = 'solid'; onChange('sw'); rebuild(); }; sw.appendChild(b); });
    wrap.appendChild(sw);
    const dyn = el('div');
    function rebuild() {
      dyn.innerHTML = '';
      const ty = bg.type || 'solid';
      if (ty !== 'none' && ty !== 'image') dyn.appendChild(row(F.color(t('Colour') + ' 1', bg.c1, (v) => { bg.c1 = v; onChange('c1'); }), ['linear', 'radial', 'mesh'].includes(ty) ? F.color(t('Colour') + ' 2', bg.c2, (v) => { bg.c2 = v; onChange('c2'); }) : el('div'), ty === 'mesh' ? F.color(t('Colour') + ' 3', bg.c3, (v) => { bg.c3 = v; onChange('c3'); }) : el('div')));
      if (ty === 'linear') dyn.appendChild(row(F.range(t('Angle'), bg.angle ?? 160, (v) => { bg.angle = v; onChange('angle'); }, 0, 360, 1, '°')));
      if (ty === 'mesh') dyn.appendChild(row(F.range(t('Variant'), bg.variant ?? 0, (v) => { bg.variant = v; onChange('var'); }, 0, 3, 1)));
      if (ty === 'image') { const pick = F.btn('🖼 ' + t('Select Background'), () => pickAsset((id) => { bg.asset = id; onChange('bgimg'); rebuild(); }), 'wide'); dyn.appendChild(row(pick)); dyn.appendChild(row(F.range(t('Vertical position'), bg.vpos ?? 50, (v) => { bg.vpos = v; onChange('vpos'); }, 0, 100, 1, '%'), F.range(t('Blur'), bg.blur ?? 0, (v) => { bg.blur = v; onChange('blur'); }, 0, 100, 1), F.range(t('Dim'), bg.dim ?? 0, (v) => { bg.dim = v; onChange('dim'); }, 0, 90, 1, '%'))); }
      if (bg.pattern && bg.pattern !== 'none') dyn.appendChild(row(F.color(t('Pattern colour'), bg.patternColor || '#ffffff', (v) => { bg.patternColor = v; onChange('pc'); }), F.range(t('Pattern opacity'), bg.patternOpacity ?? 12, (v) => { bg.patternOpacity = v; onChange('po'); }, 0, 100, 1, '%'), F.range(t('Pattern scale'), bg.patternScale ?? 100, (v) => { bg.patternScale = v; onChange('ps'); }, 30, 300, 5, '%')));
      dyn.appendChild(row(F.range(t('Noise'), bg.noise ?? 0, (v) => { bg.noise = v; onChange('noise'); }, 0, 40, 1, '%'), F.range(t('Vignette'), bg.vignette ?? 0, (v) => { bg.vignette = v; onChange('vig'); }, 0, 80, 1, '%')));
    }
    rebuild(); wrap.appendChild(dyn);
    return wrap;
  }
  function accBackground(s, i) {
    const a = acc(t('Background'), '▦', false);
    s.bg = s.bg || Model.defaultBg();
    const pan = F.check(t('Panoramic background') + ' (' + t('project') + ')', s.bg.panorama, (v) => { snapshot('pan'); s.bg.panorama = v; commit(); });
    a.body.appendChild(pan);
    if (!s.bg.panorama) a.body.appendChild(bgFields(s.bg, (k) => upd('bg:' + k)));
    else a.body.appendChild(el('p', 'hint', t('This screen uses the project background. Edit it from the Background button in the toolbar.')));
    const applyAll = F.btn(t('Apply background to all screens'), () => { snapshot('bgall'); E.P.screens.forEach((o) => { o.bg = Model.clone(s.bg); }); commit(); }, 'wide'); applyAll.style.marginTop = '8px';
    a.body.appendChild(applyAll);
    return a;
  }

  function accLayer(s, i, L) {
    const vis = el('button', 'mini' + (L.hidden ? ' off' : ''), L.hidden ? '🙈' : '👁'); vis.onclick = (e) => { e.stopPropagation(); snapshot('vis'); L.hidden = !L.hidden; commit(); };
    const lock = el('button', 'mini' + (L.lock ? '' : ' off'), '🔒'); lock.onclick = (e) => { e.stopPropagation(); L.lock = !L.lock; E.app.save(); renderStrip(); };
    const a = acc(layerName(L), ICON[L.type] || '•', !!E.layerOpen[L.id] || E.layer === L.id, [vis, lock]);
    a.dataset.layer = L.id;
    const b = a.body;
    const u = (k) => upd(L.id + ':' + k);
    if (L.type === 'text') {
      const ta = F.area(t('Text') + ` (${(Model.LANG_NAMES[E.lang] || E.lang)})`, Render.textOf(L.text, E.lang, E.P.languages.default), (v) => { Model.setText(L, E.lang, v); u('txt'); const nm = a.querySelector('.acc-h .grow'); if (nm) nm.textContent = layerName(L); });
      b.appendChild(row(ta));
      b.appendChild(el('p', 'hint', t('Words in [brackets] take the accent colour. Enter = new line.')));
      b.appendChild(row(F.sel(t('Font family'), L.font || 'inter', Render.FONT_LIST, (v) => { L.font = v; Render.ensureFont(v, L.weight).then(() => repaint()); u('font'); }), F.sel(t('Weight'), String(L.weight || 700), [['400', 'Regular'], ['500', 'Medium'], ['600', 'Semibold'], ['700', 'Bold'], ['800', 'Extrabold'], ['900', 'Black']], (v) => { L.weight = +v; u('w'); })));
      b.appendChild(row(F.range(t('Size'), L.size ?? 6, (v) => { L.size = v; u('size'); }, 1.5, 16, 0.1, '%'), F.range(t('Line height'), L.lineHeight ?? 1.1, (v) => { L.lineHeight = v; u('lh'); }, 0.8, 2, 0.02), F.range(t('Letter spacing'), L.letterSpacing ?? 0, (v) => { L.letterSpacing = v; u('ls'); }, -8, 20, 0.5)));
      b.appendChild(row(F.color(t('Colour'), L.color, (v) => { L.color = v; u('col'); }), F.color(t('Accent colour'), L.accent, (v) => { L.accent = v; u('acc'); }), F.sel(t('Highlight style'), L.hlStyle || 'color', [['color', 'Colour'], ['marker', 'Marker'], ['underline', 'Underline'], ['squiggle', 'Squiggle']], (v) => { L.hlStyle = v; u('hl'); })));
      b.appendChild(row(F.sel(t('Align'), L.align || 'center', [['left', 'Left'], ['center', 'Center'], ['right', 'Right']], (v) => { L.align = v; u('al'); }), F.sel(t('Vertical align'), L.valign || 'top', [['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']], (v) => { L.valign = v; u('va'); }), F.sel(t('Decoration'), L.decoration || 'none', [['none', 'None'], ['squiggle', 'Squiggle'], ['line', 'Line']], (v) => { L.decoration = v; u('dec'); })));
      b.appendChild(row(F.sel(t('Text box'), L.box || 'none', [['none', 'None'], ['solid', 'Solid'], ['glass', 'Glass'], ['outline', 'Outline']], (v) => { L.box = v; u('box'); }), F.color(t('Box colour'), L.boxColor || '#ffffff', (v) => { L.boxColor = v; u('bc'); }), F.range(t('Opacity'), L.opacity ?? 100, (v) => { L.opacity = v; u('op'); }, 5, 100, 1, '%')));
      const flags = el('div', 'row three');
      flags.append(F.check(t('Uppercase'), L.uppercase, (v) => { L.uppercase = v; u('up'); }), F.check(t('Shadow'), L.shadow, (v) => { L.shadow = v; u('sh'); }), F.check(t('Auto-fit'), L.fitText !== false, (v) => { L.fitText = v; u('fit'); }));
      b.appendChild(flags);
    } else if (L.type === 'device') {
      const frames = Object.entries(window.Frames.FRAMES).filter(([k]) => k !== 'hidden').map(([k, v]) => [k, v.label]);
      b.appendChild(row(F.sel(t('Frame design'), L.frame, frames, (v) => { L.frame = v; u('fr'); }), F.sel(t('Body colour'), L.color || 'graphite', [['graphite', 'Graphite'], ['black', 'Black'], ['silver', 'Silver'], ['gold', 'Gold'], ['blue', 'Blue'], ['white', 'White']], (v) => { L.color = v; u('dc'); })));
      b.appendChild(row(F.sel(t('Fit'), L.fit || 'top', [['top', 'Top'], ['cover', 'Cover'], ['contain', 'Contain']], (v) => { L.fit = v; u('fit'); }), F.color(t('Screen background'), L.screenBg || '#000000', (v) => { L.screenBg = v; u('sbg'); })));
      b.appendChild(row(F.range(t('Shadow'), L.shadow ?? 45, (v) => { L.shadow = v; u('sh'); }, 0, 100, 1, '%'), F.range(t('Tilt'), L.rot ?? 0, (v) => { L.rot = v; u('rot'); }, -30, 30, 0.5, '°'), F.range(t('Opacity'), L.opacity ?? 100, (v) => { L.opacity = v; u('op'); }, 5, 100, 1, '%')));
      b.appendChild(row(F.range(t('Glow'), L.glowStrength ?? 0, (v) => { L.glowStrength = v; u('gl'); }, 0, 100, 1, '%'), F.color(t('Glow colour'), L.glow || '#22d3ee', (v) => { L.glow = v; u('glc'); })));
      const flags = el('div', 'row'); flags.append(F.check(t('Glare'), L.glare !== false, (v) => { L.glare = v; u('glare'); }), F.check(t('Home indicator'), L.homeIndicator !== false, (v) => { L.homeIndicator = v; u('hi'); })); b.appendChild(flags);
      const slot = Devices.slotForOutput(E.out);
      const shotsBtn = F.btn('🖼 ' + t('Add screenshots'), () => window.Modals.screens(i), 'primary wide');
      const quick = F.btn('⇪ ' + t('Upload for this size'), () => pickAsset((id) => { snapshot('shot'); Model.setShot(L, L.shots && L.shots.global ? slot : 'global', id); commit(); }), 'wide');
      b.appendChild(row(shotsBtn, quick));
    } else if (L.type === 'image') {
      b.appendChild(row(F.btn('🖼 ' + t('Choose image'), () => pickAsset((id) => { snapshot('img'); L.asset = id; commit(); }), 'wide')));
      b.appendChild(row(F.sel(t('Fit'), L.fit || 'cover', [['cover', 'Cover'], ['contain', 'Contain']], (v) => { L.fit = v; u('fit'); }), F.range(t('Corner rounding'), L.radius ?? 0, (v) => { L.radius = v; u('rad'); }, 0, 30, 0.5, '%'), F.range(t('Shadow'), L.shadow ?? 0, (v) => { L.shadow = v; u('sh'); }, 0, 100, 1, '%')));
      b.appendChild(row(F.range(t('Tilt'), L.rot ?? 0, (v) => { L.rot = v; u('rot'); }, -45, 45, 0.5, '°'), F.range(t('Opacity'), L.opacity ?? 100, (v) => { L.opacity = v; u('op'); }, 5, 100, 1, '%')));
    } else if (L.type === 'element') {
      const k = L.kind;
      b.appendChild(row(F.sel(t('Element'), k, Model.ELEMENT_KINDS, (v) => { snapshot('kind'); const d = Model.ELEMENT_DEFAULTS[v] || {}; Object.keys(d).forEach((kk) => { if (L[kk] == null) L[kk] = Model.clone(d[kk]); }); L.kind = v; commit(); })));
      if (['pill', 'rating', 'laurel', 'note', 'icon', 'text', 'quote', 'emoji'].includes(k)) b.appendChild(row(F.area(t('Text') + ` (${Model.LANG_NAMES[E.lang] || E.lang})`, Render.textOf(L.text, E.lang, E.P.languages.default), (v) => { Model.setText(L, E.lang, v); u('txt'); })));
      if (['laurel', 'note'].includes(k)) b.appendChild(row(F.text(k === 'laurel' ? t('Top label') : t('Secondary text'), L.sub || '', (v) => { L.sub = v; u('sub'); }), k === 'note' ? F.text(t('Time'), L.time || '', (v) => { L.time = v; u('time'); }) : el('div')));
      if (['pill', 'note', 'icon'].includes(k)) b.appendChild(row(F.text('Emoji', L.emoji || '', (v) => { L.emoji = v; u('em'); }), ['pill', 'note'].includes(k) ? F.color(t('Background'), L.bg || '#ffffff', (v) => { L.bg = v; u('bg'); }) : F.color(t('Icon colour'), L.iconBg || '#6d5ce7', (v) => { L.iconBg = v; u('ib'); })));
      if (k === 'rating') b.appendChild(row(F.color(t('Background'), L.bg || '#ffffff', (v) => { L.bg = v; u('bg'); }), F.color(t('Star colour'), L.starColor || '#f59e0b', (v) => { L.starColor = v; u('sc'); })));
      if (k === 'shape') b.appendChild(row(F.sel(t('Shape'), L.shape || 'blob', [['blob', 'Blob'], ['circle', 'Circle'], ['rect', 'Rectangle']], (v) => { L.shape = v; u('shape'); }), F.range(t('Width'), L.w ?? 30, (v) => { L.w = v; u('w'); }, 2, 150, 1, '%'), F.range(t('Height'), L.h ?? 12, (v) => { L.h = v; u('h'); }, 1, 150, 1, '%')));
      if (k === 'note' || k === 'quote') b.appendChild(row(F.range(t('Width'), L.w ?? 70, (v) => { L.w = v; u('w'); }, 20, 100, 1, '%')));
      if (k === 'stars') b.appendChild(row(F.range(t('Count'), L.count ?? 5, (v) => { L.count = v; u('cnt'); }, 1, 5, 1)));
      b.appendChild(row(F.color(t('Colour'), L.color || '#ffffff', (v) => { L.color = v; u('col'); }), F.range(t('Size'), L.size ?? 3, (v) => { L.size = v; u('size'); }, 0.5, 14, 0.1, '%'), F.range(t('Opacity'), L.opacity ?? 100, (v) => { L.opacity = v; u('op'); }, 5, 100, 1, '%')));
      b.appendChild(row(F.range(t('Tilt'), L.rot ?? 0, (v) => { L.rot = v; u('rot'); }, -45, 45, 0.5, '°'), F.sel(t('Font family'), L.font || 'inter', Render.FONT_LIST, (v) => { L.font = v; Render.ensureFont(v, 700).then(repaint); u('font'); })));
      if (k === 'pill') b.appendChild(F.check(t('Outline'), L.outline, (v) => { L.outline = v; u('ol'); }));
    }
    // konum (herkes)
    const pos = el('div', 'section-title', t('Exact Dimensions')); b.appendChild(pos);
    const posRow = L.type === 'element' ? row(F.num('X %', L.x, (v) => { L.x = v; u('x'); }), F.num('Y %', L.y, (v) => { L.y = v; u('y'); })) : L.type === 'device' ? row(F.num('X %', L.x, (v) => { L.x = v; u('x'); }), F.num('Y %', L.y, (v) => { L.y = v; u('y'); }), F.num(t('Width') + ' %', L.w, (v) => { L.w = v; u('w'); })) : row(F.num('X %', L.x, (v) => { L.x = v; u('x'); }), F.num('Y %', L.y, (v) => { L.y = v; u('y'); }), F.num(t('Width') + ' %', L.w, (v) => { L.w = v; u('w'); }));
    b.appendChild(posRow);
    if (L.type === 'text' || L.type === 'image') b.appendChild(row(F.num(t('Height') + ' %', L.h ?? 0, (v) => { L.h = v; u('h'); }), L.type === 'text' ? F.check(t('Flow under previous text'), L.flow, (v) => { L.flow = v; u('flow'); }) : el('div')));
    return a;
  }

  /* ---------- varlık seçimi ---------- */
  function pickAsset(cb) {
    const inp = $('#fileOne'); inp.value = '';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const url = await Store.fileToDataUrl(f); const id = await Store.putAsset(url, { name: f.name, type: f.type }); cb(id); };
    inp.click();
  }
  E.pickAsset = pickAsset;

  /* ---------- popover'lar ---------- */
  let pop = null;
  function openPop(anchor, build) {
    closePop();
    pop = el('div', 'popover');
    build(pop);
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.left = Math.min(r.left, window.innerWidth - 380) + 'px'; pop.style.top = (r.bottom + 6 + window.scrollY) + 'px';
    setTimeout(() => document.addEventListener('mousedown', outside), 0);
  }
  function outside(e) { if (pop && !pop.contains(e.target)) closePop(); }
  function closePop() { if (pop) { pop.remove(); pop = null; document.removeEventListener('mousedown', outside); } }
  function bgPopover(anchor) {
    openPop(anchor, (p) => {
      p.appendChild(el('h4', null, t('Project background') + ' · ' + t('Panoramic background')));
      p.appendChild(el('p', 'hint', t('Applies to every screen that has "Panoramic background" turned on; it flows across the whole set.')));
      E.P.background = E.P.background || Model.defaultBg();
      p.appendChild(bgFields(E.P.background, () => { E.app.save(); renderStripCanvasesOnly(); }, true));
      const all = F.btn(t('Use on all screens'), () => { snapshot('panall'); E.P.screens.forEach((s) => { s.bg = s.bg || Model.defaultBg(); s.bg.panorama = true; }); commit(); }, 'wide');
      const none = F.btn(t('Turn off on all screens'), () => { snapshot('panoff'); E.P.screens.forEach((s) => { if (s.bg) s.bg.panorama = false; }); commit(); }, 'wide');
      const r = el('div', 'row'); r.append(all, none); p.appendChild(r);
    });
  }
  function globalsPopover(anchor) {
    openPop(anchor, (p) => {
      p.appendChild(el('h4', null, t('Globals') + ' — ' + t('apply to every screen')));
      const titles = E.P.screens.flatMap((s) => s.layers.filter((L) => L.type === 'text' && L.role !== 'subtitle'));
      const subs = E.P.screens.flatMap((s) => s.layers.filter((L) => L.type === 'text' && L.role === 'subtitle'));
      const devs = E.P.screens.flatMap((s) => s.layers.filter((L) => L.type === 'device'));
      const first = titles[0] || {};
      const set = (arr, k, v) => { snapshot('glob:' + k); arr.forEach((L) => { L[k] = v; }); if (k === 'font') Render.ensureFont(v, 800).then(renderAll); commit(); };
      p.appendChild(row(F.sel(t('Title font'), first.font || 'inter', Render.FONT_LIST, (v) => set(titles, 'font', v)), F.sel(t('Subtitle font'), (subs[0] || {}).font || first.font || 'inter', Render.FONT_LIST, (v) => set(subs, 'font', v))));
      p.appendChild(row(F.color(t('Title colour'), first.color || '#111214', (v) => set(titles, 'color', v)), F.color(t('Accent colour'), first.accent || '#6d5ce7', (v) => { set(titles, 'accent', v); E.P.screens.forEach((s) => s.layers.forEach((L) => { if (L.type === 'element' && (L.kind === 'icon' || L.kind === 'note')) L.iconBg = v; })); }), F.color(t('Subtitle colour'), (subs[0] || {}).color || '#111214', (v) => set(subs, 'color', v))));
      p.appendChild(row(F.range(t('Title size'), first.size ?? 6, (v) => set(titles, 'size', v), 2, 14, 0.1, '%'), F.range(t('Subtitle size'), (subs[0] || {}).size ?? 3, (v) => set(subs, 'size', v), 1.5, 8, 0.1, '%')));
      const frames = Object.entries(window.Frames.FRAMES).filter(([k]) => k !== 'hidden').map(([k, v]) => [k, v.label]);
      p.appendChild(row(F.sel(t('Device frame'), (devs[0] || {}).frame || 'iphone-pro', frames, (v) => set(devs, 'frame', v)), F.sel(t('Body colour'), (devs[0] || {}).color || 'graphite', [['graphite', 'Graphite'], ['black', 'Black'], ['silver', 'Silver'], ['gold', 'Gold'], ['blue', 'Blue'], ['white', 'White']], (v) => set(devs, 'color', v))));
    });
  }

  /* ---------- ekran indir ---------- */
  async function downloadScreen(i) {
    const { W, H } = dims(); const c = document.createElement('canvas'); c.width = W; c.height = H;
    Render.renderScreen(c.getContext('2d'), W, H, E.P.screens[i], info(i));
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    download(blob, `${String(i + 1).padStart(2, '0')}-${slug(Render.textOf((E.P.screens[i].layers.find((L) => L.type === 'text') || {}).text, E.lang, E.P.languages.default))}-${W}x${H}.png`);
  }
  E.renderTo = (canvas, i, W, H, opts) => { canvas.width = W; canvas.height = H; const inf = info(i); if (opts) Object.assign(inf, opts); Render.renderScreen(canvas.getContext('2d'), W, H, E.P.screens[i], inf); };
  E.renderAll = renderAll; E.snapshot = snapshot; E.commit = commit; E.dims = dims; E.info = info;

  /* ---------- klavye & bırakma ---------- */
  function bindKeys() {
    if (E._keys) return; E._keys = true;
    window.addEventListener('keydown', (e) => {
      if (!E.P || !$('#edCanvas')) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); E.app.save(true); toast(t('Saved')); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && E.layer) { e.preventDefault(); const s = E.P.screens[E.sel]; const L = s.layers.find((x) => x.id === E.layer); if (L) { snapshot('dupL'); const c = Model.clone(L); c.id = Model.uid(); c.x += 3; c.y += 2; s.layers.push(c); E.layer = c.id; commit(); } return; }
      if (e.key === 'Escape') { E.layer = null; E.sel = -1; closePop(); renderStrip(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && E.layer) { const s = E.P.screens[E.sel]; snapshot('delL'); s.layers = s.layers.filter((x) => x.id !== E.layer); E.layer = null; commit(); return; }
      if (e.key.startsWith('Arrow') && E.layer) { const s = E.P.screens[E.sel]; const L = s.layers.find((x) => x.id === E.layer); if (!L) return; e.preventDefault(); snapshot('nudge'); const d = e.shiftKey ? 1 : 0.2; if (e.key === 'ArrowLeft') L.x -= d; if (e.key === 'ArrowRight') L.x += d; if (e.key === 'ArrowUp') L.y -= d; if (e.key === 'ArrowDown') L.y += d; E.app.save(); repaint(); return; }
      if (e.key === '+' || e.key === '=') setZoom(E.zoom + 0.1); if (e.key === '-') setZoom(E.zoom - 0.1);
    });
  }
  function bindDrop(canvas) {
    canvas.addEventListener('dragover', (e) => { e.preventDefault(); });
    canvas.addEventListener('drop', async (e) => {
      e.preventDefault();
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/')).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      if (!files.length) return;
      const box = e.target.closest('.scr');
      let idx = box ? +box.dataset.i : 0;
      snapshot('drop');
      for (const f of files) {
        while (idx >= E.P.screens.length) { const ns = Model.clone(E.P.screens[E.P.screens.length - 1]); ns.id = Model.uid('s'); ns.layers.forEach((L) => { L.id = Model.uid(); if (L.type === 'device') L.shots = {}; }); E.P.screens.push(ns); }
        const dev = E.P.screens[idx].layers.find((L) => L.type === 'device');
        const id = await Store.putAsset(await Store.fileToDataUrl(f), { name: f.name, type: f.type });
        if (dev) Model.setShot(dev, files.length === 1 && box ? Devices.slotForOutput(E.out) : 'global', id);
        idx++;
      }
      commit(); toast(t('{n} screenshots added', { n: files.length }));
    });
  }

  window.I18N.extend({ 'New text': 'Yeni metin', 'Apply this screen\'s layout to all screens': 'Bu ekranın düzenini tüm ekranlara uygula', 'Applied to all screens': 'Tüm ekranlara uygulandı', 'Apply background to all screens': 'Arka planı tüm ekranlara uygula', 'This screen uses the project background. Edit it from the Background button in the toolbar.': 'Bu ekran proje arka planını kullanıyor. Araç çubuğundaki Arka plan düğmesinden düzenle.', 'project': 'proje', 'Project background': 'Proje arka planı', 'Applies to every screen that has "Panoramic background" turned on; it flows across the whole set.': '"Panoramik arka plan" açık olan her ekrana uygulanır; set boyunca akar.', 'Use on all screens': 'Tüm ekranlarda kullan', 'Turn off on all screens': 'Tüm ekranlarda kapat', 'apply to every screen': 'tüm ekranlara uygula', 'Title font': 'Başlık fontu', 'Subtitle font': 'Alt başlık fontu', 'Title colour': 'Başlık rengi', 'Subtitle colour': 'Alt başlık rengi', 'Title size': 'Başlık boyutu', 'Subtitle size': 'Alt başlık boyutu', 'Device frame': 'Cihaz çerçevesi', 'Upload for this size': 'Bu boyut için yükle', 'Choose image': 'Görsel seç', 'Screen background': 'Ekran arka planı', 'Vertical align': 'Dikey hizalama', 'Middle': 'Orta', 'Decoration': 'Süs', 'Squiggle': 'Kıvrım', 'Line': 'Çizgi', 'Box colour': 'Kutu rengi', 'Auto-fit': 'Otomatik sığdır', 'Top label': 'Üst etiket', 'Secondary text': 'İkincil metin', 'Time': 'Saat', 'Icon colour': 'İkon rengi', 'Star colour': 'Yıldız rengi', 'Count': 'Adet', 'Flow under previous text': 'Önceki metnin altına aksın', 'Angle': 'Açı', 'Variant': 'Varyasyon', 'Blur': 'Bulanıklık', 'Dim': 'Karartma', 'Pattern colour': 'Desen rengi', 'Pattern opacity': 'Desen opaklığı', 'Pattern scale': 'Desen ölçeği', 'Noise': 'Grain', 'Vignette': 'Vinyet', 'Radial': 'Radyal', 'Dots': 'Noktalar', 'Grid': 'Izgara', 'Diagonal': 'Çapraz', 'Rings': 'Halkalar', 'Waves': 'Dalgalar', 'Crosses': 'Artılar', 'Blobs': 'Lekeler', 'Circles': 'Daireler', 'Stripe': 'Şerit', 'Sparkles': 'Işıltı', '{n} screenshots added': '{n} ekran görüntüsü eklendi', 'Chip': 'Çip', 'Rating badge': 'Puan rozeti', 'Stars': 'Yıldızlar', 'Laurel': 'Laurel', 'Notification': 'Bildirim', 'App icon + name': 'Uygulama ikonu + ad', 'Quote': 'Alıntı', 'Label': 'Etiket', 'Emoji': 'Emoji', 'Arrow': 'Ok', 'Ring': 'Halka', 'Blob': 'Leke', 'Circle': 'Daire', 'Rectangle': 'Dikdörtgen', 'Graphite': 'Grafit', 'Black': 'Siyah', 'Silver': 'Gümüş', 'Gold': 'Altın', 'Blue': 'Mavi', 'White': 'Beyaz', 'Text top': 'Metin üstte', 'Text bottom': 'Metin altta', 'Device bleed': 'Taşkın cihaz', 'Giant tilted': 'Dev eğik', 'Tilted': 'Eğik', 'Device right': 'Cihaz sağda', 'Device left': 'Cihaz solda', 'Small device': 'Küçük cihaz', 'Full bleed': 'Tam ekran', 'Span two frames · left': 'İki kareye yay · sol', 'Span two frames · right': 'İki kareye yay · sağ' });
})();
