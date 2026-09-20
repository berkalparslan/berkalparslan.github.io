/* Store Mockup Studio — uygulama: projeler → (şablon | boş) → kurulum → metinler (AI) → görseller → indir.
   Proje gövdesi = editörün (../) serialize() biçimi; editör aynı kaydı açıp ince ayar yapar. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const { Model, Render, Store, Frames } = window;
  const TPL = window.TEMPLATES || [];
  const byKey = (k) => TPL.find((x) => x.key === k);
  const RATIO = 2796 / 1290;
  const mock = Model.mockShot();

  const CATS = {
    finans: ['Finans', 'Finance'], saglik: ['Sağlık', 'Health'], egitim: ['Eğitim', 'Education'],
    verimlilik: ['Verimlilik', 'Productivity'], sosyal: ['Sosyal', 'Social'], foto: ['Fotoğraf', 'Photo'],
    muzik: ['Müzik', 'Music'], spor: ['Spor', 'Sport'], oyun: ['Oyun', 'Games'], yasam: ['Yaşam', 'Lifestyle'],
    gunluk: ['Günlük', 'Journal'], seyahat: ['Seyahat', 'Travel'], arac: ['Araç / Dev', 'Utility / Dev'],
    hava: ['Hava', 'Weather'], yemek: ['Yemek', 'Food'], haber: ['Haber', 'News'], cocuk: ['Çocuk', 'Kids'],
  };
  const THEMES = { acik: ['Açık', 'Light'], koyu: ['Koyu', 'Dark'], renkli: ['Renkli', 'Colourful'] };
  const DEVS = [['', 'iPhone'], ['android', 'Android'], ['tablet', 'iPad']];
  const LANGS = [['tr', 'Türkçe'], ['en', 'English'], ['de', 'Deutsch'], ['es', 'Español'], ['fr', 'Français'], ['it', 'Italiano'],
    ['pt', 'Português'], ['nl', 'Nederlands'], ['ru', 'Русский'], ['ar', 'العربية'], ['hi', 'हिन्दी'], ['id', 'Bahasa Indonesia'],
    ['ja', '日本語'], ['ko', '한국어'], ['zh', '中文']];
  const LANG_NAME = { tr: 'Turkish', en: 'English', de: 'German', es: 'Spanish', fr: 'French', it: 'Italian', pt: 'Portuguese', nl: 'Dutch', ru: 'Russian', ar: 'Arabic', hi: 'Hindi', id: 'Indonesian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese' };
  const SIZES = [['1290x2796', 'App Store 6.9"'], ['1284x2778', 'App Store 6.7"'], ['1242x2688', 'App Store 6.5"'], ['1242x2208', 'App Store 5.5"'],
    ['1080x1920', 'Google Play 1080×1920'], ['1440x2560', 'Google Play 1440×2560'], ['2048x2732', 'iPad 12.9"']];
  const TONES = [['benefit', 'Fayda odaklı (varsayılan)'], ['playful', 'Oyunsu, samimi'], ['premium', 'Sade, premium'], ['direct', 'Kısa, emir kipi']];

  window.I18N.extend({
    'Projeler': 'Projects', 'Şablonlar': 'Templates', 'Editör ↗': 'Editor ↗', '⚙ Ayarlar': '⚙ Settings',
    'Anthropic API anahtarı (AI ile doldurma için)': 'Anthropic API key (for AI fill)',
    "Sadece bu tarayıcıda saklanır, hiçbir sunucuya gitmez; çağrılar doğrudan Anthropic'e gider. Anahtar yoksa \"Prompt'u kopyala\" yolu her zaman çalışır.":
      'Stored only in this browser, never sent to any server; calls go straight to Anthropic. Without a key the "Copy prompt" route always works.',
    'Model': 'Model', 'Veri': 'Data', 'Tüm projeleri dışa aktar (.json)': 'Export all projects (.json)', 'İçe aktar': 'Import',
    "Projeler tarayıcının IndexedDB'sinde. Hesapla senkron ileride; şimdilik yedeği buradan al.": 'Projects live in the browser (IndexedDB). Account sync comes later; take a backup here for now.',
    'Kaydet': 'Save', 'Kaydedildi': 'Saved',
    'Projelerin': 'Your projects', 'Her uygulama bir proje: şablon, metinler, ekran görüntüleri, çıktı boyutları. Bu tarayıcıda saklanır.': 'One project per app: template, copy, screenshots, output sizes. Stored in this browser.',
    '＋ Yeni proje': '＋ New project', 'Yeni proje': 'New project', 'Proje ya da paket (.json) içe aktar': 'Import a project or package (.json)',
    'Henüz proje yok': 'No projects yet', 'Şablon': 'Template', 'Boş': 'Blank', 'slayt': 'slides', 'güncellendi': 'updated',
    'Aç': 'Open', 'Ad': 'Rename', 'Kopyala': 'Duplicate', 'Sil': 'Delete', 'Silinsin mi: {name}?': 'Delete {name}?', 'Projenin adı?': 'Project name?',
    'Nasıl başlayalım?': 'How do you want to start?', 'Şablonla başla': 'Start from a template', '38 hazır set: seç, görselleri bırak, metinleri yaz.': '38 ready sets: pick one, drop the screenshots, write the copy.',
    'Sıfırdan başla': 'Start from scratch', 'Boş 6 slayt; arka planı, cihazı, metni sen kurarsın (editörde her şey açık).': 'Six blank slides; you set the background, device and copy (everything is open in the editor).',
    'Ekran görüntüsü şablonları': 'Screenshot templates', 'Store görselleri için': 'Ready-made templates for', 'hazır şablonlar': 'store screenshots',
    "Bir şablon seç, ekran görüntülerini bırak, başlıkları yaz, App Store / Google Play boyutunda zip al. 2026'da listeleri tutan uygulamaların kalıplarıyla kuruldu: kare başına tek fayda, tek vurgulu kelime, sosyal kanıt, tutarlı palet. Her şey tarayıcında kalır.":
      'Pick a template, drop your screenshots, write the headlines, download a zip at App Store / Google Play size. Built on the patterns of the apps topping the charts in 2026: one benefit per frame, one highlighted word, social proof, a consistent palette. Everything stays in your browser.',
    'şablon': 'templates', 'tamamen ücretsiz': 'completely free', 'Ara: finans, koyu, serif…': 'Search: finance, dark, serif…',
    'Kategori': 'Category', 'Tema': 'Theme', 'Cihaz': 'Device', 'Hepsi': 'All', 'Bu şablonla başla': 'Start with this template',
    'Bu filtreye uyan şablon yok.': 'No template matches this filter.', 'Cihaz çerçevesi ve çıktı boyutu şablondan bağımsız; seçtikten sonra değiştirilir.': 'Device frame and output size are independent of the template; change them after picking.',
    'Bu projeye uygula': 'Apply to this project',
    'Kurulum': 'Setup', 'Metinler': 'Copy', 'Görseller': 'Screenshots', 'İndir': 'Export', 'Editörde ince ayar ↗': 'Fine-tune in the editor ↗',
    'Uygulama': 'App', 'Uygulama adı': 'App name', 'Metin dili': 'Copy language', 'Marka rengi (vurgu)': 'Brand colour (accent)', 'Şablonun rengini kullan': "Use the template's colour",
    'Uygulama ikonu': 'App icon', 'İkon yükle': 'Upload icon', 'İkon yüklendi ✓': 'Icon loaded ✓', '1. slayta ikon + ad': 'Icon + name on slide 1',
    'Puan rozeti (1. slayt, boş = yok)': 'Rating badge (slide 1, empty = none)', 'Cihaz çerçevesi': 'Device frame', 'Şablonun kendi cihazı': "Template's own device",
    'Şablonu değiştir': 'Change template', 'Galeriden seç ↗': 'Pick from the gallery ↗', 'Çıktı boyutları': 'Output sizes', 'Önizleme': 'Preview',
    'İleri: Metinler →': 'Next: Copy →', 'İleri: Görseller →': 'Next: Screenshots →', 'İleri: İndir →': 'Next: Export →', '← Geri': '← Back',
    'Uygulamanı anlat': 'Describe your app', 'Ne yapar, kime, neyi farklı yapar? 2-4 cümle yeter.': 'What it does, for whom, what is different. 2-4 sentences is enough.',
    'Ekranlar (her satır bir slayt — ekranda ne var?)': 'Screens (one line per slide — what is on the screen?)', 'Görsellerin dosya adlarından doldurulur; düzeltebilirsin.': 'Filled from your screenshot file names; edit freely.',
    'Ton': 'Tone', 'Fayda odaklı (varsayılan)': 'Benefit-led (default)', 'Oyunsu, samimi': 'Playful, warm', 'Sade, premium': 'Minimal, premium', 'Kısa, emir kipi': 'Short, imperative',
    '✨ AI ile doldur': '✨ Fill with AI', "Prompt'u kopyala": 'Copy prompt', 'AI çıktısını yapıştır (JSON ya da "Başlık | Alt" satırları)': 'Paste the AI output (JSON or "Headline | Subtitle" lines)', 'Uygula': 'Apply',
    'Slayt metinleri': 'Slide copy', 'Başlık': 'Headline', 'Alt başlık': 'Subtitle', '+ Slayt': '+ Slide', '− Son slayt': '− Last slide', 'Şablon metinlerine dön': 'Reset to template copy',
    'Başlıkta [köşeli parantez] içindeki kelime vurgu rengiyle çizilir. \\n = satır sonu.': 'Words in [square brackets] get the accent colour. \\n = line break.',
    'AI yazıyor…': 'AI is writing…', 'Metinler dolduruldu': 'Copy filled in', 'API anahtarı gerekli — Ayarlar (⚙) bölümüne gir.': 'API key needed — open Settings (⚙).',
    'Prompt kopyalandı — bir AI sohbetine yapıştır, dönen JSON\'u aşağıya koy.': 'Prompt copied — paste it into an AI chat, put the returned JSON below.', 'Panoya erişilemedi': 'Clipboard unavailable',
    '{n} metin uygulandı': '{n} lines applied', 'Çözümlenemedi: JSON ya da "Başlık | Alt" satırları bekleniyor': 'Could not parse: expected JSON or "Headline | Subtitle" lines',
    'Ekran görüntülerini buraya bırak': 'Drop your screenshots here', 'dosya adına göre sıralanır, slaytlara sırayla oturur': 'sorted by file name, filled into slides in order', 'Dosya seç': 'Choose files',
    'Görsel seç': 'Pick image', 'Kaldır': 'Remove', '{n} görsel eklendi': '{n} images added', 'Slayt sil': 'Delete slide',
    'Simülatörden alınmış, gerçek veriyle dolu ekranlar en iyi sonucu verir. iPhone 16 Pro Max (1320×2868) ya da benzeri oran.': 'Simulator captures with real-looking data work best. iPhone 16 Pro Max (1320×2868) or a similar ratio.',
    'Tümünü indir (.zip)': 'Download all (.zip)', 'Seçili boyutların her biri zip içinde ayrı klasöre gider.': 'Each selected size goes into its own folder inside the zip.', "{n} görsel zip'lendi": '{n} images zipped',
    'En az bir boyut seç': 'Pick at least one size', 'Set önizleme (mağaza galerisi gibi)': 'Set preview (as the store gallery shows it)',
    'Proje bulunamadı': 'Project not found', 'Paket kuruldu: {name}': 'Package set up: {name}', 'Proje içe aktarıldı: {name}': 'Project imported: {name}',
    '{n} proje içe aktarıldı': '{n} projects imported', 'Yeni': 'New', 'Adsız': 'Untitled',
  });

  /* ------------------------------------------------------------------ */
  /* ortak                                                               */
  /* ------------------------------------------------------------------ */
  let lang = 'tr';
  function toast(msg) {
    const tt = $('#toast');
    tt.textContent = msg; tt.classList.add('on');
    clearTimeout(tt._t); tt._t = setTimeout(() => tt.classList.remove('on'), 2200);
  }
  function ensureFonts(slides, again) {
    const jobs = [];
    slides.forEach((s) => {
      jobs.push(Render.ensureFont(s.text.font, s.text.weight));
      jobs.push(Render.ensureFont(s.text.font, s.text.subWeight || 400));
      (s.stickers || []).forEach((st) => { if (st.font) jobs.push(Render.ensureFont(st.font, 700)); });
    });
    Promise.all(jobs).then((r) => { if (r.some(Boolean)) again(); });
  }
  const panFor = (slides, panorama) => (panorama && slides.length > 1 ? { n: slides.length, bg: slides[0].bg } : null);
  function drawSlide(c, w, s, i, slides, panorama, imgs) {
    const h = Math.round(w * RATIO);
    c.width = w; c.height = h;
    const pan = panFor(slides, panorama);
    Render.renderSlide(c.getContext('2d'), w, h, s, imgs, pan ? Object.assign({ i }, pan) : null);
  }
  const mockImgs = { shot: mock, shot2: mock, bg: null, icon: null };
  function renderTplStrip(tpl, canvases, w, frame) {
    const slides = [];
    Model.applyVariantToSlides(slides, { template: tpl.template, slides: tpl.slides }, {});
    if (frame) slides.forEach((s) => { if (s.device.frame !== 'none' && s.device.frame !== 'hidden') s.device.frame = frame; });
    canvases.forEach((c, i) => drawSlide(c, w, slides[i], i, slides, tpl.template.panorama, mockImgs));
    ensureFonts(slides, () => renderTplStrip(tpl, canvases, w, frame));
  }
  const slug = (x) => (x || 'ekran').toLowerCase().replace(/[ıİ]/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'ekran';
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const fmtDate = (ts) => new Date(ts || Date.now()).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'short' });

  /* ------------------------------------------------------------------ */
  /* proje modeli                                                        */
  /* ------------------------------------------------------------------ */
  let PID = null, P = null;
  const meta = () => (P.meta = P.meta || {});
  const imgsFor = (s) => ({ shot: Store.imageFor(s.shot) || null, shot2: Store.imageFor(s.device2 && s.device2.shot) || mock, bg: Store.imageFor(s.bg.img), icon: Store.imageFor(P.app.icon) });

  function baseBody(name) {
    return {
      exp: { w: 1290, h: 2796, format: 'png', quality: 0.95 }, cur: 0, slides: [],
      appDesc: '', screens: '', lang, panorama: false,
      app: { name: name || '', lang: lang, accent: '', icon: null }, appId: null,
      meta: { tpl: null, desc: '', screens: '', tone: 'benefit', rating: '', addIcon: true, sizes: ['1290x2796', '1080x1920'], frame: '', useAccent: false },
    };
  }
  function blankSlides(n) {
    const out = [];
    for (let i = 0; i < n; i++) { const s = Model.newSlide(); s.text.title = ''; out.push(s); }
    return out;
  }
  /** Şablonu projeye uygular: metinler ve görseller korunur (boş olanlar şablondan gelir). */
  function applyTemplateToProject(tplKey) {
    const tpl = byKey(tplKey);
    const old = P.slides;
    Model.textLang = P.app.lang;
    const n = Math.max(old.length, tpl ? tpl.slides.length : 0) || 6;
    const rows = [];
    for (let i = 0; i < n; i++) {
      const base = tpl ? tpl.slides[Math.min(i, tpl.slides.length - 1)] : {};
      const row = Object.assign({}, base);
      if (tpl && i >= tpl.slides.length) { row.title = ''; row.subtitle = ''; }
      rows.push(row);
    }
    const slides = [];
    if (tpl) Model.applyVariantToSlides(slides, { template: tpl.template, slides: rows }, { appName: P.app.name });
    else slides.push(...blankSlides(n));
    Model.textLang = null;
    slides.forEach((s, i) => {
      const o = old[i];
      if (o) {
        if (meta().customText && meta().customText[i]) { s.text.title = o.text.title; s.text.sub = o.text.sub; }
        s.shot = o.shot; s.name = o.name;
        if (o.device2 && o.device2.shot) s.device2.shot = o.device2.shot;
      }
    });
    P.slides = slides;
    P.panorama = !!(tpl && tpl.template.panorama);
    meta().tpl = tplKey || null;
    if (!meta().useAccent) P.app.accent = slides[0].text.accent || '#6366f1';
    applyBrand();
  }
  /** Marka: vurgu rengi, cihaz çerçevesi, 1. slayta ikon+ad ve puan. Slaytları yerinde günceller. */
  function applyBrand() {
    const m = meta();
    const accent = m.useAccent && P.app.accent ? P.app.accent : (P.slides[0] && P.slides[0].text.accent) || '#6366f1';
    P.slides.forEach((s) => {
      if (m.useAccent && P.app.accent) s.text.accent = P.app.accent;
      if (m.frame && s.device.frame !== 'none' && s.device.frame !== 'hidden') s.device.frame = m.frame;
      s.stickers.forEach((st) => { if (st.type === 'icon' || st.type === 'note') st.iconBg = accent; });
    });
    const first = P.slides[0];
    if (!first) return;
    const light = Render.contrastFor(first.text.color) === '#111214';
    const hadIcon = first.stickers.some((st) => st.type === 'icon');
    first.stickers = first.stickers.filter((st) => st.type !== 'icon' && st.type !== 'rating');
    if (m.addIcon && P.app.name) {
      if (!hadIcon && first.text.y <= 50 && !m.shifted) { first.text.y = Math.min(90, first.text.y + 6); m.shifted = true; }
      first.stickers.push(Object.assign({ type: 'icon', opacity: 100 }, Model.STICKER_DEFAULTS.icon, { text: P.app.name, y: first.text.y > 50 ? 4 : Math.max(2, first.text.y - 10), iconBg: accent, color: first.text.color }));
    } else if (hadIcon && m.shifted && first.text.y <= 60) { first.text.y = Math.max(0, first.text.y - 6); m.shifted = false; }
    if (m.rating) {
      let ry = first.text.y > 50 ? 6 : first.text.y + 13;
      const lau = first.stickers.find((st) => st.type === 'laurel' && Math.abs(st.y - ry) < 9);
      if (lau) ry = lau.y + 10;
      first.stickers.push(Object.assign({ type: 'rating', opacity: 100 }, Model.STICKER_DEFAULTS.rating, { text: m.rating, y: ry, bg: light ? '#ffffff' : '#111214', color: light ? '#111214' : '#ffffff' }));
    }
  }
  let saveTimer = null;
  function save(now) {
    clearTimeout(saveTimer);
    const run = () => Store.saveProject(PID, P, { name: P.app.name || t('Adsız'), tpl: meta().tpl, lang: P.app.lang }).catch(() => {});
    if (now) return run();
    saveTimer = setTimeout(run, 400);
  }
  async function createProject(name, tplKey) {
    const id = Store.newId();
    P = baseBody(name); PID = id; P.appId = id;
    P.slides = blankSlides(6);
    if (tplKey) applyTemplateToProject(tplKey); else applyBrand();
    await save(true);
    return id;
  }
  async function loadProject(id) {
    const body = await Store.getProject(id).catch(() => null);
    if (!body) return false;
    P = body; PID = id; P.appId = id;
    P.meta = Object.assign(baseBody('').meta, body.meta || {});
    P.app = Object.assign({ name: '', lang: lang, accent: '', icon: null }, body.app || {});
    P.slides = (body.slides || []).map(Model.upgradeSlide);
    if (!P.slides.length) P.slides = blankSlides(6);
    const urls = [];
    P.slides.forEach((s) => { if (s.shot) urls.push(s.shot); if (s.bg.img) urls.push(s.bg.img); if (s.device2 && s.device2.shot) urls.push(s.device2.shot); });
    if (P.app.icon) urls.push(P.app.icon);
    await Promise.all(urls.map((u) => Store.loadImage(u)));
    return true;
  }
  async function importFile(file) {
    const p = JSON.parse(await file.text());
    if (p.quick) { // paket
      const q = p.quick;
      const id = await createProject(q.name || t('Adsız'), q.template && byKey(q.template) ? q.template : 'indie');
      if (q.lang) P.app.lang = q.lang;
      if (q.accent) { P.app.accent = q.accent; meta().useAccent = true; }
      meta().rating = q.rating || ''; meta().addIcon = q.addIcon !== false;
      if (p.icon) { await Store.loadImage(p.icon); P.app.icon = p.icon; }
      const lines = (q.lines || []).map((x) => String(x).trim()).filter(Boolean);
      if (lines.length) applyLines(lines);
      const shots = (p.shots || []).map((s) => (typeof s === 'string' ? { data: s } : s));
      for (let i = 0; i < shots.length; i++) {
        await Store.loadImage(shots[i].data);
        while (P.slides.length <= i) P.slides.push(Model.newSlide(P.slides[P.slides.length - 1]));
        P.slides[i].shot = shots[i].data; P.slides[i].name = (shots[i].name || '').replace(/\.[^.]+$/, '');
      }
      applyBrand(); await save(true);
      toast(t('Paket kuruldu: {name}', { name: P.app.name }));
      return id;
    }
    if (Array.isArray(p.projects)) { // toplu yedek
      let n = 0;
      for (const row of p.projects) { if (row.body) { await Store.saveProject(row.id || Store.newId(), row.body, { name: row.name, tpl: row.tpl, lang: row.lang }); n++; } }
      toast(t('{n} proje içe aktarıldı', { n }));
      return null;
    }
    if (p.slides) { // editör projesi
      const id = Store.newId();
      p.appId = id;
      await Store.saveProject(id, p, { name: (p.app && p.app.name) || t('Adsız'), tpl: p.meta && p.meta.tpl, lang: p.app && p.app.lang });
      toast(t('Proje içe aktarıldı: {name}', { name: (p.app && p.app.name) || '' }));
      return id;
    }
    throw new Error('unknown');
  }

  /* ------------------------------------------------------------------ */
  /* metinler: satır / JSON uygula, prompt, AI                            */
  /* ------------------------------------------------------------------ */
  function applyLines(lines) {
    meta().customText = meta().customText || [];
    lines.forEach((ln, i) => {
      while (P.slides.length <= i) P.slides.push(Model.newSlide(P.slides[P.slides.length - 1]));
      const [a, b] = String(ln).split('|').map((x) => (x || '').trim());
      P.slides[i].text.title = a.replace(/\\n/g, '\n');
      P.slides[i].text.sub = b || '';
      meta().customText[i] = true;
    });
    return lines.length;
  }
  function parseCopy(txt) {
    let s = (txt || '').trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1].trim();
    if (s.startsWith('{') || s.startsWith('[')) {
      try {
        const j = JSON.parse(s);
        const arr = Array.isArray(j) ? j : j.slides || (j.variants && j.variants[0] && j.variants[0].slides);
        if (Array.isArray(arr)) return arr.map((r) => `${r.title || ''} | ${r.subtitle || r.sub || ''}`);
      } catch (e) { /* düz satırlara düş */ }
    }
    const lines = s.split('\n').map((x) => x.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
    return lines.length ? lines : null;
  }
  const screensList = () => (meta().screens || P.slides.map((s, i) => s.name || '').join('\n')).split('\n').map((x) => x.trim()).filter(Boolean);
  function copyPrompt() {
    const n = P.slides.length;
    const L = LANG_NAME[P.app.lang] || P.app.lang;
    const tone = { benefit: 'benefit-led, calm confidence', playful: 'playful and warm', premium: 'minimal, premium, understated', direct: 'short imperatives' }[meta().tone || 'benefit'];
    const screens = screensList().map((x, i) => `${i + 1}. ${x}`).join('\n') || '(not given — infer a typical flow)';
    return `You write App Store / Google Play screenshot copy. Output language: ${L}.

APP: ${P.app.name || '(name not given)'}
${meta().desc || '(no description given)'}

SCREENS, in order (one slide per line; the copy of slide i must describe what is actually visible on screen i):
${screens}

Write ${n} slides. Rules:
- Headline: max 30 characters, no full stop, benefit-first (${tone}). Two lines allowed with \\n in the middle.
- Wrap exactly ONE word or short phrase per headline in [square brackets] — the benefit word; it will be highlighted.
- Subtitle: max 55 characters; the concrete outcome, not the feature list.
- No hype words ("best", "revolutionary", "#1"), no price or discount claims, no repeated key word across headlines.
- Order: 1 core promise → 2-3 core features → differentiator → trust (privacy/offline/speed, whichever is true) → closing call to action. First two slides carry the strongest promises.

Return ONLY this JSON, nothing else:
{"slides":[{"title":"...","subtitle":"..."}]}`;
  }
  let sdkPromise = null;
  const loadSdk = () => (sdkPromise = sdkPromise || import('https://esm.sh/@anthropic-ai/sdk@0.90.0').then((m) => m.default || m.Anthropic));
  async function aiFill(btn) {
    let key = '';
    try { key = localStorage.getItem('sms-anthropic-key') || ''; } catch (e) { }
    if (!key) { toast(t('API anahtarı gerekli — Ayarlar (⚙) bölümüne gir.')); openSettings(); return; }
    const model = (() => { try { return localStorage.getItem('sms-model') || 'claude-opus-5'; } catch (e) { return 'claude-opus-5'; } })();
    btn.classList.add('busy'); btn.textContent = t('AI yazıyor…');
    try {
      const Anthropic = await loadSdk();
      const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
      const schema = {
        type: 'object', additionalProperties: false, required: ['slides'],
        properties: { slides: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'subtitle'], properties: { title: { type: 'string' }, subtitle: { type: 'string' } } } } },
      };
      const req = {
        model, max_tokens: 4000,
        system: 'You are a senior ASO copywriter. Follow the length limits exactly. Return only the JSON.',
        messages: [{ role: 'user', content: copyPrompt() }],
        output_config: { format: { type: 'json_schema', schema }, effort: 'medium' },
      };
      let res;
      try {
        res = await client.beta.messages.create(Object.assign({ betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }, req));
      } catch (e) {
        if (e && e.status === 400) res = await client.messages.create(req); else throw e;
      }
      if (res.stop_reason === 'refusal') throw new Error('refused');
      const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      const lines = parseCopy(text);
      if (!lines) throw new Error('parse');
      applyLines(lines);
      applyBrand(); save();
      toast(t('Metinler dolduruldu'));
      renderView();
    } catch (e) {
      toast('⚠︎ ' + (e && e.message ? e.message : e));
    } finally { btn.classList.remove('busy'); btn.textContent = t('✨ AI ile doldur'); }
  }

  /* ------------------------------------------------------------------ */
  /* ayarlar                                                             */
  /* ------------------------------------------------------------------ */
  function openSettings() {
    try { $('#sKey').value = localStorage.getItem('sms-anthropic-key') || ''; $('#sModel').value = localStorage.getItem('sms-model') || 'claude-opus-5'; } catch (e) { }
    $('#settingsModal').classList.add('open');
  }
  function bindSettings() {
    const m = $('#settingsModal');
    $('#btnSettings').onclick = openSettings;
    m.onclick = (e) => { if (e.target === m || e.target.hasAttribute('data-close')) m.classList.remove('open'); };
    $('#sSave').onclick = () => {
      try { localStorage.setItem('sms-anthropic-key', $('#sKey').value.trim()); localStorage.setItem('sms-model', $('#sModel').value); } catch (e) { }
      m.classList.remove('open'); toast(t('Kaydedildi'));
    };
    $('#sExport').onclick = async () => {
      const list = await Store.listProjects();
      const projects = [];
      for (const row of list) projects.push(Object.assign({}, row, { body: await Store.getProject(row.id) }));
      download(new Blob([JSON.stringify({ projects })], { type: 'application/json' }), 'store-mockup-projeler.json');
    };
    $('#sImport').onclick = () => $('#fImport').click();
    $('#fImport').onchange = async (e) => {
      const f = e.target.files[0];
      if (f) { try { await importFile(f); go('/'); } catch (err) { toast('⚠︎ ' + err.message); } }
      e.target.value = '';
    };
  }

  /* ------------------------------------------------------------------ */
  /* yönlendirme                                                         */
  /* ------------------------------------------------------------------ */
  const go = (path) => { location.hash = '#' + path; };
  let route = { path: '/', id: null, step: 'setup' };
  function parseRoute() {
    const h = location.hash.replace(/^#/, '') || '/';
    const m = h.match(/^\/p\/([a-z0-9]+)(?:\/(setup|copy|shots|export))?/i);
    if (m) return { path: '/p', id: m[1], step: m[2] || 'setup' };
    if (h.startsWith('/templates')) return { path: '/templates', id: null, step: null };
    if (h.startsWith('/new')) return { path: '/new', id: null, step: null };
    return { path: '/', id: null, step: null };
  }
  async function renderView() {
    route = parseRoute();
    document.querySelectorAll('.gnav a').forEach((a) => a.classList.toggle('on', a.dataset.route === route.path || (route.path === '/p' && a.dataset.route === '/')));
    const view = $('#view');
    view.innerHTML = '';
    if (route.path === '/') return viewDashboard(view);
    if (route.path === '/new') return viewNew(view);
    if (route.path === '/templates') return viewTemplates(view);
    if (route.path === '/p') {
      if (PID !== route.id) { P = null; PID = null; if (!(await loadProject(route.id))) { toast(t('Proje bulunamadı')); return go('/'); } }
      return viewProject(view, route.step);
    }
  }

  /* ------------------------------------------------------------------ */
  /* pano                                                                */
  /* ------------------------------------------------------------------ */
  async function viewDashboard(view) {
    const wrap = el('div', 'wrap');
    const head = el('div', 'page-head', `<div><h1>${t('Projelerin')}</h1><p>${t('Her uygulama bir proje: şablon, metinler, ekran görüntüleri, çıktı boyutları. Bu tarayıcıda saklanır.')}</p></div><div class="grow"></div>`);
    const imp = el('button', 'btn', t('Proje ya da paket (.json) içe aktar'));
    imp.onclick = () => $('#fImport').click();
    const nw = el('button', 'btn primary', t('＋ Yeni proje'));
    nw.onclick = () => go('/new');
    head.append(imp, nw);
    wrap.appendChild(head);
    const grid = el('div', 'pgrid');
    const newCard = el('div', 'pcard new', `<b>${t('＋ Yeni proje')}</b><span>${t('Şablonla başla')} · ${t('Sıfırdan başla')}</span>`);
    newCard.onclick = () => go('/new');
    grid.appendChild(newCard);
    const list = await Store.listProjects();
    for (const row of list) {
      const card = el('div', 'pcard');
      const cover = el('div', 'cover');
      card.appendChild(cover);
      const tpl = row.tpl ? byKey(row.tpl) : null;
      card.appendChild(el('b', null, esc(row.name || t('Adsız'))));
      card.appendChild(el('div', 'meta', `<span>${tpl ? esc(Model.txt(tpl.name)) : t('Boş')}</span><span>${(row.lang || '').toUpperCase()}</span><span>${t('güncellendi')} ${fmtDate(row.updated)}</span>`));
      const acts = el('div', 'acts');
      const mk = (label, fn, cls) => { const b = el('button', 'btn tiny' + (cls || ''), label); b.onclick = (e) => { e.stopPropagation(); fn(); }; return b; };
      acts.append(
        mk(t('Ad'), async () => { const n = prompt(t('Projenin adı?'), row.name); if (n) { const body = await Store.getProject(row.id); if (body) { body.app.name = n.trim(); await Store.saveProject(row.id, body, { name: n.trim() }); } renderView(); } }),
        mk(t('Kopyala'), async () => { const body = await Store.getProject(row.id); if (!body) return; const id = Store.newId(); body.appId = id; await Store.saveProject(id, body, { name: row.name + ' (2)', tpl: row.tpl, lang: row.lang }); renderView(); }),
        mk(t('Sil'), async () => { if (confirm(t('Silinsin mi: {name}?', { name: row.name }))) { await Store.deleteProject(row.id); if (PID === row.id) { PID = null; P = null; } renderView(); } }, ' danger'),
      );
      card.appendChild(acts);
      card.onclick = () => go('/p/' + row.id);
      grid.appendChild(card);
      // kapak: ilk 4 slayt
      Store.getProject(row.id).then(async (body) => {
        if (!body || !body.slides || !body.slides.length) { cover.classList.add('empty'); cover.textContent = t('Boş'); return; }
        const slides = body.slides.slice(0, 4).map(Model.upgradeSlide);
        const urls = slides.map((s) => s.shot).filter(Boolean); if (body.app && body.app.icon) urls.push(body.app.icon);
        await Promise.all(urls.map((u) => Store.loadImage(u)));
        const im = (s) => ({ shot: Store.imageFor(s.shot) || null, shot2: mock, bg: Store.imageFor(s.bg.img), icon: Store.imageFor(body.app && body.app.icon) });
        slides.forEach((s, i) => { const c = el('canvas'); drawSlide(c, 120, s, i, body.slides.map(Model.upgradeSlide), body.panorama, im(s)); cover.appendChild(c); });
      });
    }
    wrap.appendChild(grid);
    view.appendChild(wrap);
  }

  /* ------------------------------------------------------------------ */
  /* yeni                                                                */
  /* ------------------------------------------------------------------ */
  function viewNew(view) {
    const wrap = el('div', 'wrap');
    wrap.appendChild(el('div', 'page-head', `<div><h1>${t('Nasıl başlayalım?')}</h1></div>`));
    const ch = el('div', 'choice');
    const a = el('div', 'pcard', `<b>🗂 ${t('Şablonla başla')}</b><p>${t('38 hazır set: seç, görselleri bırak, metinleri yaz.')}</p>`);
    a.onclick = () => go('/templates');
    const b = el('div', 'pcard', `<b>✎ ${t('Sıfırdan başla')}</b><p>${t('Boş 6 slayt; arka planı, cihazı, metni sen kurarsın (editörde her şey açık).')}</p>`);
    b.onclick = async () => { const name = prompt(t('Projenin adı?')) || t('Adsız'); const id = await createProject(name.trim(), null); go('/p/' + id + '/setup'); };
    ch.append(a, b);
    wrap.appendChild(ch);
    view.appendChild(wrap);
  }

  /* ------------------------------------------------------------------ */
  /* şablon galerisi                                                     */
  /* ------------------------------------------------------------------ */
  const G = { cat: 'all', theme: 'all', q: '', frame: '' };
  function viewTemplates(view) {
    const applyMode = !!(PID && P); // bir proje açıkken: "Bu projeye uygula"
    const hero = el('section', 'hero', `
      <div class="hero-text">
        <small>${t('Ekran görüntüsü şablonları')}</small>
        <h1>${t('Store görselleri için')} <em>${t('hazır şablonlar')}</em></h1>
        <p>${t("Bir şablon seç, ekran görüntülerini bırak, başlıkları yaz, App Store / Google Play boyutunda zip al. 2026'da listeleri tutan uygulamaların kalıplarıyla kuruldu: kare başına tek fayda, tek vurgulu kelime, sosyal kanıt, tutarlı palet. Her şey tarayıcında kalır.")}</p>
        <p class="hero-meta"><b>${TPL.length}</b> ${t('şablon')} · 6 ${t('slayt')} · iPhone 6.9" / 6.5" · Play 1080×1920 · ${t('tamamen ücretsiz')}</p>
      </div>
      <div class="hero-art"><canvas id="heroCanvas"></canvas></div>`);
    view.appendChild(hero);
    const cat = el('div', 'catalog');
    const filters = el('aside', 'filters');
    const q = el('input'); q.type = 'search'; q.placeholder = t('Ara: finans, koyu, serif…'); q.value = G.q;
    q.oninput = () => { G.q = q.value.trim(); buildCards(); };
    filters.appendChild(q);
    filters.appendChild(el('h4', null, t('Kategori')));
    const catChips = el('div', 'chips'); filters.appendChild(catChips);
    filters.appendChild(el('h4', null, t('Tema')));
    const themeChips = el('div', 'chips'); filters.appendChild(themeChips);
    filters.appendChild(el('h4', null, t('Cihaz')));
    const devChips = el('div', 'chips'); filters.appendChild(devChips);
    filters.appendChild(el('p', 'hint', t('Cihaz çerçevesi ve çıktı boyutu şablondan bağımsız; seçtikten sonra değiştirilir.')));
    const cards = el('main', 'cards');
    cat.append(filters, cards);
    view.appendChild(cat);

    const chip = (label, on, fn, n) => { const c = el('span', 'chip' + (on ? ' on' : ''), label + (n != null ? `<span class="n">${n}</span>` : '')); c.onclick = fn; return c; };
    function buildFilters() {
      catChips.innerHTML = ''; themeChips.innerHTML = ''; devChips.innerHTML = '';
      catChips.appendChild(chip(t('Hepsi'), G.cat === 'all', () => { G.cat = 'all'; buildFilters(); buildCards(); }));
      Object.entries(CATS).forEach(([k, [tr, en]]) => { const n = TPL.filter((x) => (x.tags || []).includes(k)).length; if (n) catChips.appendChild(chip(lang === 'tr' ? tr : en, G.cat === k, () => { G.cat = G.cat === k ? 'all' : k; buildFilters(); buildCards(); }, n)); });
      themeChips.appendChild(chip(t('Hepsi'), G.theme === 'all', () => { G.theme = 'all'; buildFilters(); buildCards(); }));
      Object.entries(THEMES).forEach(([k, [tr, en]]) => themeChips.appendChild(chip(lang === 'tr' ? tr : en, G.theme === k, () => { G.theme = G.theme === k ? 'all' : k; buildFilters(); buildCards(); })));
      DEVS.forEach(([k, label]) => devChips.appendChild(chip(label, G.frame === k, () => { G.frame = k; buildFilters(); buildCards(); })));
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (!e.isIntersecting) return; io.unobserve(e.target); renderTplStrip(byKey(e.target.dataset.key), [...e.target.querySelectorAll('canvas')], 260, G.frame); });
    }, { rootMargin: '400px' });
    const matches = (tpl) => {
      const tags = tpl.tags || [];
      if (G.cat !== 'all' && !tags.includes(G.cat)) return false;
      if (G.theme !== 'all' && !tags.includes(G.theme)) return false;
      if (G.q) { const hay = [Model.txt(tpl.name), Model.txt(tpl.cat), tpl.key, ...tags.map((x) => (CATS[x] || THEMES[x] || [x]).join(' '))].join(' ').toLowerCase(); if (!hay.includes(G.q.toLowerCase())) return false; }
      return true;
    };
    async function start(key) {
      if (applyMode) { meta().shifted = false; applyTemplateToProject(key); if (G.frame) meta().frame = G.frame; applyBrand(); await save(true); go('/p/' + PID + '/setup'); return; }
      const id = await createProject('', key);
      if (G.frame) { meta().frame = G.frame; applyBrand(); await save(true); }
      go('/p/' + id + '/setup');
    }
    function buildCards() {
      cards.innerHTML = '';
      const list = TPL.filter(matches);
      if (!list.length) { cards.appendChild(el('div', 'empty', t('Bu filtreye uyan şablon yok.'))); return; }
      list.forEach((tpl) => {
        const card = el('article', 'card'); card.dataset.key = tpl.key;
        const head = el('div', 'card-head');
        head.appendChild(el('h3', null, esc(Model.txt(tpl.name))));
        head.appendChild(el('span', 'cat', esc(Model.txt(tpl.cat))));
        const tags = el('div', 'tags');
        (tpl.tags || []).forEach((tg) => { const m = CATS[tg] || THEMES[tg]; if (m) tags.appendChild(el('span', null, m[lang === 'tr' ? 0 : 1])); });
        head.append(tags, el('div', 'grow'));
        const b = el('button', 'btn primary', applyMode ? t('Bu projeye uygula') : t('Bu şablonla başla'));
        b.onclick = () => start(tpl.key);
        head.appendChild(b);
        card.appendChild(head);
        const strip = el('div', 'strip' + (tpl.template.panorama ? ' pan' : ''));
        tpl.slides.forEach(() => strip.appendChild(el('canvas')));
        strip.onclick = () => start(tpl.key);
        card.appendChild(strip);
        cards.appendChild(card);
        io.observe(card);
      });
    }
    buildFilters(); buildCards();
    // hero
    (function hero() {
      const c = $('#heroCanvas'); if (!c) return;
      const picks = ['indie', 'nysa', 'owl', 'innerglow'].map(byKey).filter(Boolean);
      const w = 220, h = Math.round(w * RATIO), gap = 10;
      c.width = picks.length * w + (picks.length - 1) * gap; c.height = h;
      const ctx = c.getContext('2d');
      picks.forEach((tpl, i) => {
        const slides = []; Model.applyVariantToSlides(slides, { template: tpl.template, slides: tpl.slides.slice(0, 1) }, {});
        const tmp = document.createElement('canvas'); drawSlide(tmp, w, slides[0], 0, slides, false, mockImgs);
        ctx.drawImage(tmp, i * (w + gap), 0);
      });
      if (document.fonts) document.fonts.ready.then(() => { if (!hero._again) { hero._again = true; hero(); } });
    })();
  }

  /* ------------------------------------------------------------------ */
  /* proje çalışma alanı                                                 */
  /* ------------------------------------------------------------------ */
  const STEPS = [['setup', 'Kurulum'], ['copy', 'Metinler'], ['shots', 'Görseller'], ['export', 'İndir']];
  function viewProject(view, step) {
    const wrap = el('div', 'wrap');
    const tpl = meta().tpl ? byKey(meta().tpl) : null;
    const head = el('div', 'page-head');
    const nameIn = el('input'); nameIn.type = 'text'; nameIn.value = P.app.name; nameIn.placeholder = t('Uygulama adı'); nameIn.className = 'name-in';
    nameIn.oninput = () => { P.app.name = nameIn.value.trim(); applyBrand(); save(); };
    head.appendChild(nameIn);
    head.appendChild(el('p', null, `${tpl ? esc(Model.txt(tpl.name)) : t('Boş')} · ${P.slides.length} ${t('slayt')} · ${(LANGS.find((l) => l[0] === P.app.lang) || [])[1] || P.app.lang}`));
    head.appendChild(el('div', 'grow'));
    const ed = el('a', 'btn', t('Editörde ince ayar ↗')); ed.href = '../?p=' + PID; ed.onclick = () => save(true);
    head.appendChild(ed);
    wrap.appendChild(head);
    const steps = el('nav', 'steps');
    STEPS.forEach(([k, label], i) => {
      const a = el('a', (k === step ? 'on' : '') + (STEPS.findIndex((x) => x[0] === step) > i ? ' done' : ''), `<span class="n">${i + 1}</span>${t(label)}`);
      a.href = `#/p/${PID}/${k}`;
      steps.appendChild(a);
    });
    wrap.appendChild(steps);
    const body = el('div');
    wrap.appendChild(body);
    view.appendChild(wrap);
    ({ setup: stepSetup, copy: stepCopy, shots: stepShots, export: stepExport }[step] || stepSetup)(body);
  }

  const navRow = (prev, next) => {
    const row = el('div', 'foot-nav');
    if (prev) { const a = el('a', 'btn', t('← Geri')); a.href = `#/p/${PID}/${prev}`; row.appendChild(a); }
    row.appendChild(el('div', 'grow'));
    if (next) { const a = el('a', 'btn primary', t(next[1])); a.href = `#/p/${PID}/${next[0]}`; row.appendChild(a); }
    return row;
  };
  function field(label, input, hint) {
    const f = el('label', 'field');
    f.appendChild(el('span', null, label));
    f.appendChild(input);
    if (hint) f.appendChild(el('p', 'hint', hint));
    return f;
  }
  const select = (opts, val, onchange) => { const s = el('select'); opts.forEach(([v, l]) => s.appendChild(Object.assign(el('option', null, t(l)), { value: v }))); s.value = val; s.onchange = () => onchange(s.value); return s; };

  /** Küçük canlı önizleme şeridi (ilk n slayt). */
  function previewStrip(n, w, cls) {
    const strip = el('div', (cls || 'strip') + (P.panorama ? ' pan' : ''));
    const slides = P.slides.slice(0, n || P.slides.length);
    const cs = slides.map(() => el('canvas'));
    cs.forEach((c) => strip.appendChild(c));
    const draw = () => cs.forEach((c, i) => drawSlide(c, w || 220, P.slides[i], i, P.slides, P.panorama, imgsFor(P.slides[i])));
    draw();
    ensureFonts(P.slides, draw);
    strip.redraw = draw;
    return strip;
  }

  function stepSetup(body) {
    const two = el('div', 'two');
    const left = el('div', 'panelbox');
    left.appendChild(el('h3', null, t('Uygulama')));
    const grid = el('div', 'dsettings');
    grid.style.padding = '0'; grid.style.border = '0'; grid.style.background = 'none';
    const nameIn = el('input'); nameIn.type = 'text'; nameIn.value = P.app.name; nameIn.placeholder = 'Wallet Coach';
    nameIn.oninput = () => { P.app.name = nameIn.value.trim(); $('.name-in').value = P.app.name; applyBrand(); save(); strip.redraw(); };
    grid.appendChild(field(t('Uygulama adı'), nameIn));
    grid.appendChild(field(t('Metin dili'), select(LANGS, P.app.lang, (v) => { P.app.lang = v; P.lang = ['tr', 'en'].includes(v) ? v : P.lang; save(); })));
    const accWrap = el('div', 'presets');
    const acc = el('input'); acc.type = 'color'; acc.value = P.app.accent || (P.slides[0] && P.slides[0].text.accent) || '#6366f1';
    acc.oninput = () => { P.app.accent = acc.value; meta().useAccent = true; useTpl.checked = false; applyBrand(); save(); strip.redraw(); };
    const useTplWrap = el('label', 'check'); const useTpl = el('input'); useTpl.type = 'checkbox'; useTpl.checked = !meta().useAccent;
    useTpl.onchange = () => { meta().useAccent = !useTpl.checked; if (useTpl.checked && meta().tpl) { applyTemplateToProject(meta().tpl); acc.value = P.app.accent; } else applyBrand(); save(); strip.redraw(); };
    useTplWrap.append(useTpl, el('span', null, t('Şablonun rengini kullan')));
    accWrap.append(el('div', 'colors').appendChild(acc).parentNode, useTplWrap);
    grid.appendChild(field(t('Marka rengi (vurgu)'), accWrap));
    const iconWrap = el('div', 'presets');
    const iconBtn = el('button', 'btn tiny', P.app.icon ? t('İkon yüklendi ✓') : t('İkon yükle'));
    iconBtn.onclick = (e) => { e.preventDefault(); $('#fIcon').click(); };
    $('#fIcon').onchange = async (e) => { const f = e.target.files[0]; if (f) { P.app.icon = await Store.fileToDataUrl(f); await Store.loadImage(P.app.icon); iconBtn.textContent = t('İkon yüklendi ✓'); applyBrand(); save(); strip.redraw(); } e.target.value = ''; };
    const addIconWrap = el('label', 'check'); const addIcon = el('input'); addIcon.type = 'checkbox'; addIcon.checked = meta().addIcon !== false;
    addIcon.onchange = () => { meta().addIcon = addIcon.checked; applyBrand(); save(); strip.redraw(); };
    addIconWrap.append(addIcon, el('span', null, t('1. slayta ikon + ad')));
    iconWrap.append(iconBtn, addIconWrap);
    grid.appendChild(field(t('Uygulama ikonu'), iconWrap));
    const rating = el('input'); rating.type = 'text'; rating.value = meta().rating || ''; rating.placeholder = '4.8 · 1.2K';
    rating.oninput = () => { meta().rating = rating.value.trim(); applyBrand(); save(); strip.redraw(); };
    grid.appendChild(field(t('Puan rozeti (1. slayt, boş = yok)'), rating));
    const frames = [['', 'Şablonun kendi cihazı'], ...Object.entries(Frames.FRAMES).map(([k, v]) => [k, v.label])];
    grid.appendChild(field(t('Cihaz çerçevesi'), select(frames, meta().frame || '', (v) => { meta().frame = v; if (!v && meta().tpl) applyTemplateToProject(meta().tpl); else applyBrand(); save(); strip.redraw(); })));
    left.appendChild(grid);

    left.appendChild(el('h3', null, t('Şablonu değiştir')).cloneNode(true)).style.marginTop = '14px';
    const tplRow = el('div', 'presets');
    const tsel = select([['', 'Boş'], ...TPL.map((x) => [x.key, `${Model.txt(x.name)} — ${Model.txt(x.cat)}`])], meta().tpl || '', (v) => { meta().shifted = false; applyTemplateToProject(v || null); save(); renderView(); });
    const gal = el('a', 'btn tiny', t('Galeriden seç ↗')); gal.href = '#/templates';
    tplRow.append(tsel, gal);
    left.appendChild(tplRow);

    left.appendChild(el('h3', null, t('Çıktı boyutları'))).style.marginTop = '14px';
    const sizes = el('div', 'sizes');
    SIZES.forEach(([v, l]) => {
      const lab = el('label'); const c = el('input'); c.type = 'checkbox'; c.checked = (meta().sizes || []).includes(v);
      c.onchange = () => { const set = new Set(meta().sizes || []); c.checked ? set.add(v) : set.delete(v); meta().sizes = [...set]; save(); };
      lab.append(c, el('span', null, l)); sizes.appendChild(lab);
    });
    left.appendChild(sizes);

    const right = el('div', 'panelbox');
    right.appendChild(el('h3', null, t('Önizleme')));
    const strip = previewStrip(3, 220);
    right.appendChild(strip);
    two.append(left, right);
    body.appendChild(two);
    body.appendChild(navRow(null, ['copy', 'İleri: Metinler →']));
  }

  function stepCopy(body) {
    const two = el('div', 'two');
    const left = el('div', 'panelbox');
    left.appendChild(el('h3', null, t('Uygulamanı anlat')));
    const desc = el('textarea'); desc.rows = 4; desc.value = meta().desc || ''; desc.placeholder = t('Ne yapar, kime, neyi farklı yapar? 2-4 cümle yeter.');
    desc.oninput = () => { meta().desc = desc.value; save(); };
    left.appendChild(el('div', 'row').appendChild(desc).parentNode);
    const scr = el('textarea'); scr.rows = 6; scr.value = meta().screens || P.slides.map((s) => s.name || '').join('\n');
    scr.oninput = () => { meta().screens = scr.value; save(); };
    left.appendChild(field(t('Ekranlar (her satır bir slayt — ekranda ne var?)'), scr, t('Görsellerin dosya adlarından doldurulur; düzeltebilirsin.')));
    const toneLang = el('div', 'dsettings'); toneLang.style.padding = '0'; toneLang.style.border = '0'; toneLang.style.background = 'none';
    toneLang.appendChild(field(t('Metin dili'), select(LANGS, P.app.lang, (v) => { P.app.lang = v; save(); })));
    toneLang.appendChild(field(t('Ton'), select(TONES, meta().tone || 'benefit', (v) => { meta().tone = v; save(); })));
    left.appendChild(toneLang);
    const btns = el('div', 'presets');
    const ai = el('button', 'btn primary', t('✨ AI ile doldur')); ai.onclick = () => aiFill(ai);
    const cp = el('button', 'btn', t("Prompt'u kopyala"));
    cp.onclick = async () => { try { await navigator.clipboard.writeText(copyPrompt()); toast(t('Prompt kopyalandı — bir AI sohbetine yapıştır, dönen JSON\'u aşağıya koy.')); } catch (e) { toast(t('Panoya erişilemedi')); } };
    btns.append(ai, cp);
    left.appendChild(btns);
    const paste = el('textarea'); paste.rows = 4; paste.style.fontFamily = 'ui-monospace, Menlo, monospace'; paste.style.fontSize = '11.5px';
    const ap = el('button', 'btn tiny wide', t('Uygula'));
    ap.onclick = () => { const lines = parseCopy(paste.value); if (!lines) return toast(t('Çözümlenemedi: JSON ya da "Başlık | Alt" satırları bekleniyor')); const n = applyLines(lines); applyBrand(); save(); toast(t('{n} metin uygulandı', { n })); renderView(); };
    const pw = field(t('AI çıktısını yapıştır (JSON ya da "Başlık | Alt" satırları)'), paste); pw.appendChild(ap); pw.style.marginTop = '12px';
    left.appendChild(pw);

    const right = el('div', 'panelbox');
    right.appendChild(el('h3', null, t('Slayt metinleri')));
    const table = el('div', 'copy-table', `<span></span><span class="h">${t('Başlık')}</span><span class="h">${t('Alt başlık')}</span>`);
    P.slides.forEach((s, i) => {
      table.appendChild(el('span', 'i', String(i + 1)));
      const ti = el('input'); ti.type = 'text'; ti.value = s.text.title.replace(/\n/g, '\\n');
      ti.oninput = () => { s.text.title = ti.value.replace(/\\n/g, '\n'); (meta().customText = meta().customText || [])[i] = true; save(); strip.redraw(); };
      const su = el('input'); su.type = 'text'; su.value = s.text.sub;
      su.oninput = () => { s.text.sub = su.value; (meta().customText = meta().customText || [])[i] = true; save(); strip.redraw(); };
      table.append(ti, su);
    });
    right.appendChild(table);
    right.appendChild(el('p', 'hint', t('Başlıkta [köşeli parantez] içindeki kelime vurgu rengiyle çizilir. \\n = satır sonu.')));
    const rowBtns = el('div', 'presets');
    const add = el('button', 'btn tiny', t('+ Slayt')); add.onclick = () => { P.slides.push(Model.newSlide(P.slides[P.slides.length - 1])); save(); renderView(); };
    const rm = el('button', 'btn tiny', t('− Son slayt')); rm.onclick = () => { if (P.slides.length > 1) { P.slides.pop(); save(); renderView(); } };
    const rs = el('button', 'btn tiny', t('Şablon metinlerine dön')); rs.onclick = () => { meta().customText = []; if (meta().tpl) applyTemplateToProject(meta().tpl); save(); renderView(); };
    rowBtns.append(add, rm, rs);
    right.appendChild(rowBtns);
    const strip = previewStrip(null, 160);
    strip.style.marginTop = '12px';
    right.appendChild(strip);
    two.append(left, right);
    body.appendChild(two);
    body.appendChild(navRow('setup', ['shots', 'İleri: Görseller →']));
  }

  let pickIndex = -1;
  async function addFiles(files) {
    const list = [...files];
    const json = list.find((f) => /\.json$/i.test(f.name));
    if (json) { try { const id = await importFile(json); if (id) go('/p/' + id); } catch (e) { toast('⚠︎ ' + e.message); } return; }
    const imgs = list.filter((f) => f.type.startsWith('image/')).sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));
    if (!imgs.length) return;
    let slot = 0;
    for (const f of imgs) {
      while (slot < P.slides.length && P.slides[slot].shot) slot++;
      const url = await Store.fileToDataUrl(f);
      await Store.loadImage(url);
      if (slot >= P.slides.length) P.slides.push(Model.newSlide(P.slides[P.slides.length - 1]));
      P.slides[slot].shot = url; P.slides[slot].name = f.name.replace(/\.[^.]+$/, '');
      slot++;
    }
    save(); renderView();
    toast(t('{n} görsel eklendi', { n: imgs.length }));
  }
  function stepShots(body) {
    const drop = el('div', 'ddrop', `<b>${t('Ekran görüntülerini buraya bırak')}</b><span>${t('dosya adına göre sıralanır, slaytlara sırayla oturur')}</span>`);
    const pick = el('button', 'btn tiny', t('Dosya seç')); pick.onclick = () => $('#fFiles').click();
    drop.appendChild(pick);
    drop.id = 'dDrop';
    body.appendChild(drop);
    body.appendChild(el('p', 'hint', t('Simülatörden alınmış, gerçek veriyle dolu ekranlar en iyi sonucu verir. iPhone 16 Pro Max (1320×2868) ya da benzeri oran.')));
    const grid = el('div', 'dslides');
    P.slides.forEach((s, i) => {
      const card = el('div', 'dslide');
      const num = el('div', 'num', `<span>${i + 1} / ${P.slides.length} · ${esc(s.text.title.split('\n')[0].replace(/[\[\]]/g, '')).slice(0, 26)}</span>`);
      const del = el('button', null, '✕'); del.title = t('Slayt sil');
      del.onclick = () => { if (P.slides.length > 1) { P.slides.splice(i, 1); save(); renderView(); } };
      num.appendChild(del); card.appendChild(num);
      const c = el('canvas'); drawSlide(c, 300, s, i, P.slides, P.panorama, imgsFor(s));
      c.onclick = () => { pickIndex = i; $('#fOne').click(); };
      card.appendChild(c);
      const acts = el('div', 'shot-actions');
      const pk = el('button', 'btn tiny', t('Görsel seç')); pk.onclick = () => { pickIndex = i; $('#fOne').click(); };
      acts.appendChild(pk);
      if (s.shot) { const rm = el('button', 'btn tiny danger', t('Kaldır')); rm.onclick = () => { s.shot = null; save(); renderView(); }; acts.appendChild(rm); }
      card.appendChild(acts);
      grid.appendChild(card);
    });
    body.appendChild(grid);
    ensureFonts(P.slides, () => renderView());
    body.appendChild(navRow('copy', ['export', 'İleri: İndir →']));
  }

  function stepExport(body) {
    const box = el('div', 'panelbox');
    box.appendChild(el('h3', null, t('Çıktı boyutları')));
    const sizes = el('div', 'sizes');
    SIZES.forEach(([v, l]) => {
      const lab = el('label'); const c = el('input'); c.type = 'checkbox'; c.checked = (meta().sizes || []).includes(v);
      c.onchange = () => { const set = new Set(meta().sizes || []); c.checked ? set.add(v) : set.delete(v); meta().sizes = [...set]; save(); };
      lab.append(c, el('span', null, l)); sizes.appendChild(lab);
    });
    box.appendChild(sizes);
    box.appendChild(el('p', 'hint', t('Seçili boyutların her biri zip içinde ayrı klasöre gider.')));
    const row = el('div', 'presets');
    const zip = el('button', 'btn primary', t('Tümünü indir (.zip)'));
    zip.onclick = () => exportZip(zip);
    const ed = el('a', 'btn', t('Editörde ince ayar ↗')); ed.href = '../?p=' + PID;
    row.append(zip, ed);
    box.appendChild(row);
    body.appendChild(box);
    const pv = el('div', 'panelbox'); pv.style.marginTop = '14px';
    pv.appendChild(el('h3', null, t('Set önizleme (mağaza galerisi gibi)')));
    pv.appendChild(previewStrip(null, 300, 'strip-big'));
    body.appendChild(pv);
    body.appendChild(navRow('shots', null));
  }
  async function exportZip(btn) {
    const sizes = meta().sizes || [];
    if (!sizes.length) return toast(t('En az bir boyut seç'));
    btn.classList.add('busy');
    try {
      const files = [];
      const pan = panFor(P.slides, P.panorama);
      for (const sz of sizes) {
        const [W, H] = sz.split('x').map(Number);
        for (let i = 0; i < P.slides.length; i++) {
          const c = document.createElement('canvas'); c.width = W; c.height = H;
          Render.renderSlide(c.getContext('2d'), W, H, P.slides[i], imgsFor(P.slides[i]), pan ? Object.assign({ i }, pan) : null);
          const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
          files.push({ name: `${sz}/${String(i + 1).padStart(2, '0')}-${slug(P.slides[i].text.title)}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
        }
      }
      download(window.makeZip(files), `${slug(P.app.name || 'store')}-screenshots.zip`);
      toast(t("{n} görsel zip'lendi", { n: files.length }));
    } finally { btn.classList.remove('busy'); }
  }

  /* ------------------------------------------------------------------ */
  function bind() {
    $('#btnLang').onclick = () => { lang = lang === 'tr' ? 'en' : 'tr'; window.I18N.set(lang); $('#btnLang').textContent = lang.toUpperCase(); try { localStorage.setItem('sms-lang', lang); } catch (e) { } renderView(); };
    $('#fFiles').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
    $('#fOne').onchange = async (e) => {
      const f = e.target.files[0];
      if (f && pickIndex >= 0 && P) { const url = await Store.fileToDataUrl(f); await Store.loadImage(url); P.slides[pickIndex].shot = url; P.slides[pickIndex].name = f.name.replace(/\.[^.]+$/, ''); save(); renderView(); }
      e.target.value = ''; pickIndex = -1;
    };
    let depth = 0;
    window.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; const d = $('#dDrop'); if (d) d.classList.add('on'); });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('dragleave', () => { if (--depth <= 0) { const d = $('#dDrop'); if (d) d.classList.remove('on'); } });
    window.addEventListener('drop', async (e) => {
      e.preventDefault(); depth = 0; const d = $('#dDrop'); if (d) d.classList.remove('on');
      const files = [...e.dataTransfer.files]; if (!files.length) return;
      if (P) addFiles(files);
      else { const json = files.find((f) => /\.json$/i.test(f.name)); if (json) { try { const id = await importFile(json); if (id) go('/p/' + id); else renderView(); } catch (err) { toast('⚠︎ ' + err.message); } } }
    });
    window.addEventListener('paste', (e) => {
      if (!P) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      const files = [...(e.clipboardData?.files || [])];
      if (files.length) addFiles(files);
    });
    window.addEventListener('hashchange', renderView);
    bindSettings();
  }

  window.SMS = { get P() { return P; }, get PID() { return PID; }, createProject, applyTemplateToProject, applyBrand, save };

  (async function init() {
    try { lang = localStorage.getItem('sms-lang') || window.I18N.detect(); } catch (e) { lang = window.I18N.detect(); }
    window.I18N.set(lang);
    $('#btnLang').textContent = lang.toUpperCase();
    bind();
    renderView();
  })();
})();
