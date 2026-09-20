/* Şablon galerisi + direkt mod: şablonu seç → ss bırak → metinleri yaz → zip. */
(function () {
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const { Model, Render, Store, Frames } = window;
  const TPL = window.TEMPLATES || [];
  const byKey = (k) => TPL.find((x) => x.key === k);

  const CATS = {
    finans: ['Finans', 'Finance'], saglik: ['Sağlık', 'Health'], egitim: ['Eğitim', 'Education'],
    verimlilik: ['Verimlilik', 'Productivity'], sosyal: ['Sosyal', 'Social'], foto: ['Fotoğraf', 'Photo'],
    muzik: ['Müzik', 'Music'], spor: ['Spor', 'Sport'], oyun: ['Oyun', 'Games'], yasam: ['Yaşam', 'Lifestyle'],
    gunluk: ['Günlük', 'Journal'], seyahat: ['Seyahat', 'Travel'], arac: ['Araç / Dev', 'Utility / Dev'],
    hava: ['Hava', 'Weather'], yemek: ['Yemek', 'Food'], haber: ['Haber', 'News'], cocuk: ['Çocuk', 'Kids'],
  };
  const THEMES = { acik: ['Açık', 'Light'], koyu: ['Koyu', 'Dark'], renkli: ['Renkli', 'Colourful'] };

  window.I18N.extend({
    'şablonlar': 'templates', 'Editörü aç ↗': 'Open the editor ↗',
    'Ekran görüntüsü şablonları': 'Screenshot templates',
    'Store görselleri için': 'Ready-made templates for', 'hazır şablonlar': 'store screenshots',
    "Bir şablon seç, ekran görüntülerini bırak, başlıkları yaz, App Store / Google Play boyutunda zip al. 2026'da listeleri tutan uygulamaların kalıplarıyla kuruldu: kare başına tek fayda, tek vurgulu kelime, sosyal kanıt, tutarlı palet. Her şey tarayıcında kalır.":
      'Pick a template, drop your screenshots, write the headlines, download a zip at App Store / Google Play size. Built on the patterns of the apps topping the charts in 2026: one benefit per frame, one highlighted word, social proof, a consistent palette. Everything stays in your browser.',
    'şablon': 'templates', 'slayt': 'slides', 'tamamen ücretsiz': 'completely free',
    'Ara: finans, koyu, serif…': 'Search: finance, dark, serif…', 'Kategori': 'Category', 'Tema': 'Theme', 'Cihaz': 'Device',
    'Cihaz çerçevesi ve çıktı boyutu şablondan bağımsız; seçtikten sonra değiştirilir.': 'Device frame and output size are independent of the template; change them after picking.',
    'Hepsi': 'All', 'Bu şablonla başla': 'Start with this template', 'Bu filtreye uyan şablon yok.': 'No template matches this filter.',
    '← Şablonlar': '← Templates', 'Çıktı': 'Output', 'Editörde ince ayar ↗': 'Fine-tune in the editor ↗', 'Tümünü indir (.zip)': 'Download all (.zip)',
    'Uygulama adı': 'App name', 'Vurgu rengi': 'Accent color', 'Puan rozeti (1. slayt)': 'Rating badge (slide 1)', 'Uygulama ikonu': 'App icon',
    'İkon yükle': 'Upload icon', 'ikon + ad': 'icon + name', 'Örnek metin dili': 'Sample copy language',
    'Ekran görüntülerini buraya bırak': 'Drop your screenshots here',
    'dosya adına göre sıralanır, slaytlara sırayla oturur · ya da bir .paket.json': 'sorted by file name, filled into slides in order · or a .paket.json',
    'Dosya seç': 'Choose files', '+ Slayt ekle': '+ Add slide', 'Metinleri şablona döndür': 'Reset copy to template',
    'Başlıkta [köşeli parantez] içindeki kelime vurgu rengiyle çizilir. Enter = yeni satır.': 'Words in [square brackets] in the headline get the accent color. Enter = new line.',
    'Görsel seç': 'Pick image', 'Kaldır': 'Remove', 'Başlık': 'Headline', 'Alt başlık': 'Subtitle',
    '{n} görsel eklendi': '{n} images added', 'İndirildi': 'Downloaded', "{n} görsel zip'lendi": '{n} images zipped',
    'Paket kuruldu: {name}': 'Package set up: {name}', 'Şablon: {name}': 'Template: {name}', 'Şablonun kendi rengi': "Template's own color",
    'Slayt sil': 'Delete slide', 'Şablonun kendi cihazı': "Template's own device", 'İkon yüklendi ✓': 'Icon loaded ✓',
  });

  /* ------------------------------------------------------------------ */
  /* durum                                                               */
  /* ------------------------------------------------------------------ */
  const G = { cat: 'all', theme: 'all', q: '', frame: '' }; // frame: '' = şablonun kendi cihazı
  const DEVS = [['', 'iPhone'], ['android', 'Android'], ['tablet', 'iPad']];
  const D = { key: null, name: '', accent: '', rating: '', icon: null, addIcon: true, lang: 'tr', frame: '', texts: [], shots: [], count: null };
  let lang = 'tr';
  const mock = Model.mockShot();
  const RATIO = 2796 / 1290;

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 1800);
  }

  function setLang(l) {
    lang = l;
    window.I18N.set(l);
    Model.textLang = null;
    $('#btnLang').textContent = l === 'tr' ? 'TR' : 'EN';
    try { localStorage.setItem('sms-lang', l); } catch (e) { }
    buildFilters();
    buildCards();
    fillTemplateSelect();
    if (!$('#viewDirect').hidden) renderDirect();
  }

  /* ------------------------------------------------------------------ */
  /* galeri                                                              */
  /* ------------------------------------------------------------------ */
  function renderTplStrip(tpl, canvases, w, ctx) {
    const h = Math.round(w * RATIO);
    const slides = [];
    Model.applyVariantToSlides(slides, { template: tpl.template, slides: tpl.slides }, ctx || {});
    if (G.frame) slides.forEach((s) => { if (s.device.frame !== 'none' && s.device.frame !== 'hidden') s.device.frame = G.frame; });
    const pan = tpl.template.panorama ? { n: slides.length, bg: slides[0].bg } : null;
    canvases.forEach((c, i) => {
      c.width = w; c.height = h;
      Render.renderSlide(c.getContext('2d'), w, h, slides[i], { shot: mock, shot2: mock, bg: null, icon: null }, pan ? Object.assign({ i }, pan) : null);
    });
    ensureFonts(slides, () => renderTplStrip(tpl, canvases, w, ctx));
  }

  const fontJobs = new Set();
  function ensureFonts(slides, again) {
    const jobs = [];
    slides.forEach((s) => {
      jobs.push(Render.ensureFont(s.text.font, s.text.weight));
      jobs.push(Render.ensureFont(s.text.font, s.text.subWeight || 400));
      (s.stickers || []).forEach((st) => { if (st.font) jobs.push(Render.ensureFont(st.font, 700)); });
    });
    Promise.all(jobs).then((r) => { if (r.some(Boolean)) again(); });
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const card = e.target;
      io.unobserve(card);
      const tpl = byKey(card.dataset.key);
      renderTplStrip(tpl, [...card.querySelectorAll('canvas')], 260);
    });
  }, { rootMargin: '400px' });

  function matches(tpl) {
    const tags = tpl.tags || [];
    if (G.cat !== 'all' && !tags.includes(G.cat)) return false;
    if (G.theme !== 'all' && !tags.includes(G.theme)) return false;
    if (G.q) {
      const hay = [Model.txt(tpl.name), Model.txt(tpl.cat), tpl.key, ...tags.map((t) => (CATS[t] || THEMES[t] || [t]).join(' '))].join(' ').toLowerCase();
      if (!hay.includes(G.q.toLowerCase())) return false;
    }
    return true;
  }

  function buildCards() {
    const root = $('#cards');
    root.innerHTML = '';
    const list = TPL.filter(matches);
    $('#tplCount').textContent = TPL.length;
    if (!list.length) { root.appendChild(el('div', 'empty', t('Bu filtreye uyan şablon yok.'))); return; }
    list.forEach((tpl) => {
      const card = el('article', 'card');
      card.dataset.key = tpl.key;
      const head = el('div', 'card-head');
      head.appendChild(el('h3', null, Model.txt(tpl.name)));
      head.appendChild(el('span', 'cat', Model.txt(tpl.cat)));
      const tags = el('div', 'tags');
      (tpl.tags || []).forEach((tg) => { const m = CATS[tg] || THEMES[tg]; if (m) tags.appendChild(el('span', null, m[lang === 'tr' ? 0 : 1])); });
      head.appendChild(tags);
      head.appendChild(el('div', 'grow'));
      const start = el('button', 'btn primary', t('Bu şablonla başla'));
      start.onclick = () => openDirect(tpl.key);
      head.appendChild(start);
      card.appendChild(head);
      const strip = el('div', 'strip' + (tpl.template.panorama ? ' pan' : ''));
      tpl.slides.forEach(() => strip.appendChild(el('canvas')));
      strip.onclick = () => openDirect(tpl.key);
      card.appendChild(strip);
      root.appendChild(card);
      io.observe(card);
    });
  }

  function chip(label, on, onclick, n) {
    const c = el('span', 'chip' + (on ? ' on' : ''), label + (n != null ? `<span class="n">${n}</span>` : ''));
    c.onclick = onclick;
    return c;
  }

  function buildFilters() {
    const cats = $('#catChips');
    cats.innerHTML = '';
    cats.appendChild(chip(t('Hepsi'), G.cat === 'all', () => { G.cat = 'all'; buildFilters(); buildCards(); }));
    Object.entries(CATS).forEach(([k, [tr, en]]) => {
      const n = TPL.filter((x) => (x.tags || []).includes(k)).length;
      if (!n) return;
      cats.appendChild(chip(lang === 'tr' ? tr : en, G.cat === k, () => { G.cat = G.cat === k ? 'all' : k; buildFilters(); buildCards(); }, n));
    });
    const dv = $('#devChips');
    dv.innerHTML = '';
    DEVS.forEach(([k, label]) => dv.appendChild(chip(label, G.frame === k, () => { G.frame = k; buildFilters(); buildCards(); })));
    const th = $('#themeChips');
    th.innerHTML = '';
    th.appendChild(chip(t('Hepsi'), G.theme === 'all', () => { G.theme = 'all'; buildFilters(); buildCards(); }));
    Object.entries(THEMES).forEach(([k, [tr, en]]) => {
      th.appendChild(chip(lang === 'tr' ? tr : en, G.theme === k, () => { G.theme = G.theme === k ? 'all' : k; buildFilters(); buildCards(); }));
    });
  }

  function renderHero() {
    const c = $('#heroCanvas');
    const picks = ['indie', 'nysa', 'owl', 'innerglow'].map(byKey).filter(Boolean);
    const w = 220, h = Math.round(w * RATIO), gap = 10;
    c.width = picks.length * w + (picks.length - 1) * gap; c.height = h;
    const ctx = c.getContext('2d');
    picks.forEach((tpl, i) => {
      const slides = [];
      Model.applyVariantToSlides(slides, { template: tpl.template, slides: tpl.slides.slice(0, 1) }, {});
      const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
      Render.renderSlide(tmp.getContext('2d'), w, h, slides[0], { shot: mock, shot2: mock, bg: null, icon: null }, null);
      ctx.save();
      ctx.translate(i * (w + gap), 0);
      ctx.drawImage(tmp, 0, 0);
      ctx.restore();
    });
    document.fonts && document.fonts.ready.then(() => { if (!renderHero._again) { renderHero._again = true; renderHero(); } });
  }

  /* ------------------------------------------------------------------ */
  /* direkt mod                                                          */
  /* ------------------------------------------------------------------ */
  function fillTemplateSelect() {
    const sel = $('#dTemplate');
    sel.innerHTML = '';
    TPL.forEach((tp) => sel.appendChild(Object.assign(el('option', null, `${Model.txt(tp.name)} — ${Model.txt(tp.cat)}`), { value: tp.key })));
    if (D.key) sel.value = D.key;
    const fr = $('#dFrame');
    fr.innerHTML = '';
    fr.appendChild(Object.assign(el('option', null, t('Şablonun kendi cihazı')), { value: '' }));
    Object.entries(Frames.FRAMES).forEach(([k, v]) => fr.appendChild(Object.assign(el('option', null, t(v.label)), { value: k })));
    fr.value = D.frame || '';
  }

  function tpl() { return byKey(D.key) || TPL[0]; }
  function slideCount() { return D.count || tpl().slides.length; }

  /** Kullanıcı verisi + şablon → render edilebilir slayt dizisi */
  function buildSlides() {
    const T = tpl();
    Model.textLang = D.lang;
    const n = slideCount();
    const rows = [];
    for (let i = 0; i < n; i++) {
      const base = T.slides[Math.min(i, T.slides.length - 1)];
      const row = Object.assign({}, base);
      if (i >= T.slides.length) { row.title = ''; row.subtitle = ''; }
      rows.push(row);
    }
    const slides = [];
    Model.applyVariantToSlides(slides, { template: T.template, slides: rows }, { appName: D.name });
    Model.textLang = null;
    const accent = D.accent || slides[0].text.accent;
    slides.forEach((s, i) => {
      const ut = D.texts[i];
      if (ut && ut.title != null) s.text.title = ut.title;
      if (ut && ut.sub != null) s.text.sub = ut.sub;
      s.shot = D.shots[i] || null;
      if (D.frame && s.device.frame !== 'none' && s.device.frame !== 'hidden') s.device.frame = D.frame;
      if (D.accent) s.text.accent = D.accent;
      s.stickers.forEach((st) => { if (st.type === 'icon' || st.type === 'note') st.iconBg = accent; });
    });
    // sosyal kanıt 1. slayta
    const first = slides[0];
    const light = Render.contrastFor(first.text.color) === '#111214';
    if (D.addIcon && D.name && !first.stickers.some((st) => st.type === 'icon')) {
      if (first.text.y <= 50) first.text.y = Math.min(90, first.text.y + 6);
      first.stickers.push(Object.assign({ type: 'icon', opacity: 100 }, Model.STICKER_DEFAULTS.icon, { text: D.name, y: first.text.y > 50 ? 4 : Math.max(2, first.text.y - 10), iconBg: accent, color: first.text.color }));
    }
    if (D.rating) {
      first.stickers = first.stickers.filter((st) => st.type !== 'rating');
      let ry = first.text.y > 50 ? 6 : first.text.y + 13;
      const lau = first.stickers.find((st) => st.type === 'laurel' && Math.abs(st.y - ry) < 9); // laurel ile çakışmasın
      if (lau) ry = lau.y + 10;
      first.stickers.push(Object.assign({ type: 'rating', opacity: 100 }, Model.STICKER_DEFAULTS.rating, { text: D.rating, y: ry, bg: light ? '#ffffff' : '#111214', color: light ? '#111214' : '#ffffff' }));
    }
    return slides;
  }

  const images = (s) => ({ shot: Store.imageFor(s.shot) || null, shot2: mock, bg: null, icon: Store.imageFor(D.icon) });
  const panFor = (slides) => (tpl().template.panorama && slides.length > 1 ? { n: slides.length, bg: slides[0].bg } : null);

  let dSlides = [];
  function renderDirect() {
    dSlides = buildSlides();
    const pan = panFor(dSlides);
    const root = $('#dSlides');
    root.innerHTML = '';
    const w = 300, h = Math.round(w * RATIO);
    dSlides.forEach((s, i) => {
      const card = el('div', 'dslide');
      const num = el('div', 'num', `<span>${i + 1} / ${dSlides.length}</span>`);
      const del = el('button', null, '✕');
      del.title = t('Slayt sil');
      del.onclick = () => { D.texts.splice(i, 1); D.shots.splice(i, 1); D.count = dSlides.length - 1; save(); renderDirect(); };
      num.appendChild(del);
      card.appendChild(num);
      const c = el('canvas');
      c.width = w; c.height = h;
      Render.renderSlide(c.getContext('2d'), w, h, s, images(s), pan ? Object.assign({ i }, pan) : null);
      c.onclick = () => pickOne(i);
      card.appendChild(c);
      const ta = el('textarea');
      ta.placeholder = t('Başlık');
      ta.value = s.text.title;
      ta.rows = 2;
      ta.oninput = () => { (D.texts[i] = D.texts[i] || {}).title = ta.value; save(); repaint(i); };
      card.appendChild(ta);
      const sub = el('input');
      sub.type = 'text'; sub.placeholder = t('Alt başlık'); sub.value = s.text.sub;
      sub.oninput = () => { (D.texts[i] = D.texts[i] || {}).sub = sub.value; save(); repaint(i); };
      card.appendChild(sub);
      const acts = el('div', 'shot-actions');
      const pick = el('button', 'btn tiny', t('Görsel seç'));
      pick.onclick = () => pickOne(i);
      acts.appendChild(pick);
      if (D.shots[i]) {
        const rm = el('button', 'btn tiny danger', t('Kaldır'));
        rm.onclick = () => { D.shots[i] = null; save(); renderDirect(); };
        acts.appendChild(rm);
      }
      card.appendChild(acts);
      root.appendChild(card);
    });
    ensureFonts(dSlides, renderDirect);
  }

  /** Tek slaytı yeniden çiz (metin yazarken). Panoramada arka plan değişmez, tek kare yeter. */
  function repaint(i) {
    dSlides = buildSlides();
    const pan = panFor(dSlides);
    const c = $('#dSlides').children[i] && $('#dSlides').children[i].querySelector('canvas');
    if (!c) return;
    Render.renderSlide(c.getContext('2d'), c.width, c.height, dSlides[i], images(dSlides[i]), pan ? Object.assign({ i }, pan) : null);
    if (i === 0) return; // ikon/puan sadece 1. slaytta; diğerleri değişmez
  }

  let pickIndex = -1;
  function pickOne(i) { pickIndex = i; $('#dOneFile').click(); }

  async function addFiles(files) {
    const list = [...files];
    const json = list.find((f) => /\.json$/i.test(f.name));
    if (json) return loadPackage(json);
    const imgs = list.filter((f) => f.type.startsWith('image/')).sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));
    if (!imgs.length) return;
    let slot = 0;
    for (const f of imgs) {
      while (slot < slideCount() && D.shots[slot]) slot++;
      const url = await Store.fileToDataUrl(f);
      await Store.loadImage(url);
      if (slot >= slideCount()) D.count = slot + 1;
      D.shots[slot] = url;
      slot++;
    }
    save();
    renderDirect();
    toast(t('{n} görsel eklendi', { n: imgs.length }));
  }

  async function loadPackage(file) {
    try {
      const p = JSON.parse(await file.text());
      const q = p.quick || {};
      if (q.template && byKey(q.template)) D.key = q.template;
      if (q.name) D.name = q.name;
      if (q.accent) D.accent = q.accent;
      if (q.rating != null) D.rating = q.rating;
      if (q.addIcon != null) D.addIcon = !!q.addIcon;
      if (q.lang && ['tr', 'en'].includes(q.lang)) D.lang = q.lang;
      if (p.icon) { await Store.loadImage(p.icon); D.icon = p.icon; }
      const lines = (q.lines || []).map((x) => String(x).trim()).filter(Boolean);
      if (lines.length) {
        D.texts = lines.map((ln) => { const [a, b] = ln.split('|').map((x) => (x || '').trim()); return { title: a.replace(/\\n/g, '\n'), sub: b || '' }; });
        D.count = lines.length;
      }
      const shots = (p.shots || []).map((s) => (typeof s === 'string' ? s : s.data));
      for (let i = 0; i < shots.length; i++) { await Store.loadImage(shots[i]); D.shots[i] = shots[i]; }
      if (shots.length > slideCount()) D.count = shots.length;
      syncSettingsUI();
      save();
      renderDirect();
      toast(t('Paket kuruldu: {name}', { name: D.name }));
    } catch (e) { toast('⚠︎ ' + e.message); }
  }

  function syncSettingsUI() {
    $('#dTemplate').value = D.key;
    $('#dName').value = D.name;
    $('#dAccent').value = D.accent || (buildSlides()[0].text.accent || '#6366f1');
    $('#dRating').value = D.rating;
    $('#dAddIcon').checked = D.addIcon;
    $('#dLang').value = D.lang;
    $('#dFrame').value = D.frame || '';
    $('#dIconBtn').textContent = D.icon ? t('İkon yüklendi ✓') : t('İkon yükle');
  }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => Store.set('direct', JSON.parse(JSON.stringify(D))).catch(() => { }), 400);
  }

  async function openDirect(key, keepHash) {
    D.key = key;
    if (!keepHash && G.frame) D.frame = G.frame;
    if (!keepHash) location.hash = 't=' + key;
    $('#viewGallery').hidden = true;
    $('#viewDirect').hidden = false;
    window.scrollTo(0, 0);
    syncSettingsUI();
    renderDirect();
    save();
  }

  function closeDirect() {
    $('#viewDirect').hidden = true;
    $('#viewGallery').hidden = false;
    if (location.hash) history.replaceState(null, '', location.pathname);
  }

  const size = () => $('#dSize').value.split('x').map(Number);
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const slug = (x) => (x || 'ekran').toLowerCase().replace(/[ıİ]/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'ekran';

  async function exportAll() {
    const [W, H] = size();
    const slides = buildSlides();
    const pan = panFor(slides);
    const files = [];
    for (let i = 0; i < slides.length; i++) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      Render.renderSlide(c.getContext('2d'), W, H, slides[i], images(slides[i]), pan ? Object.assign({ i }, pan) : null);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      files.push({ name: `${String(i + 1).padStart(2, '0')}-${slug(slides[i].text.title)}-${W}x${H}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    download(window.makeZip(files), `${slug(D.name || tpl().key)}-store-${W}x${H}.zip`);
    toast(t("{n} görsel zip'lendi", { n: files.length }));
  }

  async function openInEditor() {
    const [W, H] = size();
    const slides = buildSlides();
    slides.forEach((s, i) => { s.name = D.shots[i] ? `slayt-${i + 1}` : ''; });
    const project = {
      exp: { w: W, h: H, format: 'png', quality: 0.95 }, cur: 0, slides,
      appDesc: '', screens: '', lang, panorama: !!tpl().template.panorama,
      app: { name: D.name, lang: D.lang, accent: D.accent || slides[0].text.accent, icon: D.icon }, appId: null,
    };
    await Store.set('project', project);
    location.href = '../';
  }

  /* ------------------------------------------------------------------ */
  function bind() {
    $('#btnLang').onclick = () => setLang(lang === 'tr' ? 'en' : 'tr');
    $('#q').oninput = () => { G.q = $('#q').value.trim(); buildCards(); };
    $('#backToGallery').onclick = (e) => { e.preventDefault(); closeDirect(); };
    $('#dTemplate').onchange = () => { D.key = $('#dTemplate').value; location.hash = 't=' + D.key; syncSettingsUI(); renderDirect(); save(); };
    $('#dName').oninput = () => { D.name = $('#dName').value.trim(); save(); renderDirect(); };
    $('#dAccent').oninput = () => { D.accent = $('#dAccent').value; save(); renderDirect(); };
    $('#dRating').oninput = () => { D.rating = $('#dRating').value.trim(); save(); renderDirect(); };
    $('#dAddIcon').onchange = () => { D.addIcon = $('#dAddIcon').checked; save(); renderDirect(); };
    $('#dLang').onchange = () => { D.lang = $('#dLang').value; save(); renderDirect(); };
    $('#dFrame').onchange = () => { D.frame = $('#dFrame').value; save(); renderDirect(); };
    $('#dIconBtn').onclick = () => $('#dIcon').click();
    $('#dIcon').onchange = async (e) => {
      const f = e.target.files[0];
      if (f) { D.icon = await Store.fileToDataUrl(f); await Store.loadImage(D.icon); syncSettingsUI(); save(); renderDirect(); }
      e.target.value = '';
    };
    $('#dPick').onclick = () => $('#dFiles').click();
    $('#dFiles').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
    $('#dOneFile').onchange = async (e) => {
      const f = e.target.files[0];
      if (f && pickIndex >= 0) {
        const url = await Store.fileToDataUrl(f);
        await Store.loadImage(url);
        D.shots[pickIndex] = url; save(); renderDirect();
      }
      e.target.value = ''; pickIndex = -1;
    };
    $('#dAddSlide').onclick = () => { D.count = slideCount() + 1; save(); renderDirect(); };
    $('#dReset').onclick = () => { D.texts = []; save(); renderDirect(); };
    $('#dExport').onclick = exportAll;
    $('#dOpenEditor').onclick = openInEditor;

    // sürükle-bırak (direkt modda her yere)
    let depth = 0;
    window.addEventListener('dragenter', (e) => { e.preventDefault(); if ($('#viewDirect').hidden) return; depth++; $('#dDrop').classList.add('on'); });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('dragleave', () => { if (--depth <= 0) $('#dDrop').classList.remove('on'); });
    window.addEventListener('drop', (e) => {
      e.preventDefault(); depth = 0; $('#dDrop').classList.remove('on');
      if ($('#viewDirect').hidden) return;
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
    window.addEventListener('paste', (e) => {
      if ($('#viewDirect').hidden) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      const files = [...(e.clipboardData?.files || [])];
      if (files.length) addFiles(files);
    });
    window.addEventListener('hashchange', route);
  }

  function route() {
    const m = location.hash.match(/t=([a-z0-9-]+)/i);
    if (m && byKey(m[1])) openDirect(m[1], true);
    else if (!$('#viewDirect').hidden) closeDirect();
  }

  window.SMS = { D, buildSlides };

  (async function init() {
    try { lang = localStorage.getItem('sms-lang') || window.I18N.detect(); } catch (e) { lang = window.I18N.detect(); }
    window.I18N.set(lang);
    $('#btnLang').textContent = lang === 'tr' ? 'TR' : 'EN';
    const saved = await Store.get('direct').catch(() => null);
    if (saved && saved.key && byKey(saved.key)) {
      Object.assign(D, saved);
      const urls = [...D.shots.filter(Boolean), D.icon].filter(Boolean);
      await Promise.all(urls.map((u) => Store.loadImage(u)));
    }
    buildFilters();
    buildCards();
    fillTemplateSelect();
    renderHero();
    bind();
    route();
  })();
})();
