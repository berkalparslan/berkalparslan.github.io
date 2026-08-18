/* TR ↔ EN. Anahtar = Türkçe metnin kendisi; TR modunda sözlüğe hiç bakılmaz. */
(function (global) {
  const EN = {
    /* üst bar */
    'Çıktı': 'Output',
    'Format': 'Format',
    '✨ AI metin': '✨ AI copy',
    'Bu slayt': 'This slide',
    'Tümünü indir (.zip)': 'Download all (.zip)',
    'Geri al (⌘Z)': 'Undo (⌘Z)',
    'İleri al (⌘⇧Z)': 'Redo (⌘⇧Z)',
    'Projeyi kaydet (.json)': 'Save project (.json)',
    'Proje yükle': 'Load project',
    'Her şeyi sıfırla': 'Reset everything',

    /* sol/alt paneller */
    'Slaytlar': 'Slides',
    '+ Ekle': '+ Add',
    'Kopyala': 'Duplicate',
    'Sil': 'Delete',
    'Düzen': 'Layout',
    'Arka plan': 'Background',
    'Cihaz': 'Device',
    'Metin': 'Text',
    'Stili tüm slaytlara uygula': 'Apply style to all slides',
    'Ekran görüntülerini bırak': 'Drop your screenshots',
    'Ekran görüntüsü ekle': 'Add a screenshot',
    'Başlığını buraya yaz': 'Write your headline here',

    /* bölüm başlıkları */
    'Hazır düzenler': 'Layout presets',
    'Yerleşim': 'Placement',
    'Hazır arka planlar': 'Background presets',
    'Ayarlar': 'Settings',
    'Doku': 'Texture',
    'Ekran görüntüsü': 'Screenshot',
    'Çerçeve': 'Frame',
    'Konum': 'Position',
    'İçerik': 'Content',
    'Tipografi': 'Typography',
    'Renk': 'Color',

    /* kontroller */
    'Gövde rengi': 'Body color',
    'Cihaz boyutu': 'Device size',
    'Cihaz dikey konum': 'Device vertical',
    'Cihaz yatay konum': 'Device horizontal',
    'Eğim': 'Tilt',
    'Metin dikey konum': 'Text vertical',
    'Kenar boşluğu': 'Side padding',
    'Cihaz metnin üstünde çizilsin': 'Draw device above text',
    'Tür': 'Type',
    'Düz renk': 'Solid color',
    'Doğrusal gradyan': 'Linear gradient',
    'Radyal gradyan': 'Radial gradient',
    'Mesh gradyan': 'Mesh gradient',
    'Görsel': 'Image',
    'Renk 1': 'Color 1',
    'Renk 2': 'Color 2',
    'Renk 3': 'Color 3',
    'Açı': 'Angle',
    'Mesh varyasyonu': 'Mesh variation',
    'Arka plan görseli seç': 'Choose background image',
    'Arka plan görselini kaldır': 'Remove background image',
    'Bulanıklık': 'Blur',
    'Karartma': 'Dim',
    'Desen': 'Pattern',
    'Yok': 'None',
    'Noktalar': 'Dots',
    'Izgara': 'Grid',
    'Çapraz çizgi': 'Diagonal lines',
    'Halkalar': 'Rings',
    'Desen rengi': 'Pattern color',
    'Desen opaklığı': 'Pattern opacity',
    'Grain / kumlanma': 'Grain',
    'Vinyet': 'Vignette',
    'Görsel seç / değiştir': 'Choose / replace image',
    'Görseli kaldır': 'Remove image',
    'Sığdırma': 'Fit',
    'Üstten': 'Top',
    'Doldur': 'Fill',
    'Sığdır': 'Contain',
    'Ekran arka planı (boşluk rengi)': 'Screen background (letterbox color)',
    'Model': 'Model',
    'Gölge': 'Shadow',
    'Cam parlaması': 'Glass glare',
    'Alt çubuk (home indicator)': 'Home indicator',
    'Boyut': 'Size',
    'Dikey': 'Vertical',
    'Yatay': 'Horizontal',
    'Başlık (Enter = alt satır)': 'Headline (Enter = new line)',
    'Alt başlık': 'Subtitle',
    'Font': 'Font',
    'Kendi fontunu yükle (.ttf/.otf/.woff2)': 'Load your own font (.ttf/.otf/.woff2)',
    'Hizalama': 'Align',
    'Sol': 'Left',
    'Orta': 'Center',
    'Sağ': 'Right',
    'Başlık kalınlığı': 'Headline weight',
    'Başlık boyutu': 'Headline size',
    'Alt başlık boyutu': 'Subtitle size',
    'Satır aralığı': 'Line height',
    'Harf aralığı': 'Letter spacing',
    'Başlık rengi': 'Headline color',
    'Alt başlık rengi': 'Subtitle color',
    'Alt başlık opaklığı': 'Subtitle opacity',
    'Metin gölgesi': 'Text shadow',

    /* çerçeveler, renkler, fontlar */
    'iPhone (Çentik)': 'iPhone (Notch)',
    'iPhone (Home tuşlu)': 'iPhone (Home button)',
    'Tarayıcı penceresi': 'Browser window',
    'Çerçevesiz (sadece görsel)': 'No frame (image only)',
    'Grafit': 'Graphite',
    'Siyah': 'Black',
    'Gümüş': 'Silver',
    'Altın': 'Gold',
    'Mavi': 'Blue',
    'Beyaz': 'White',
    'Sistem (SF Pro)': 'System (SF Pro)',
    'Yüklenen font': 'Loaded font',

    /* düzen ön ayarları */
    'Metin üstte': 'Text on top',
    'Metin altta': 'Text below',
    'Taşkın cihaz': 'Bleeding device',
    'Eğik': 'Tilted',
    'Sağa yaslı': 'Device right',
    'Sola yaslı': 'Device left',
    'Küçük cihaz': 'Small device',
    'Çerçevesiz tam': 'Full bleed',

    /* arka plan ön ayarları */
    'Gün batımı': 'Sunset',
    'Mor gece': 'Purple night',
    'Nane': 'Mint',
    'Okyanus': 'Ocean',
    'Ateş': 'Fire',
    'Gül': 'Rose',
    'Gece': 'Night',
    'Koyu': 'Dark',
    'Açık': 'Light',
    'Siber mesh': 'Cyber mesh',
    'Sıcak mesh': 'Warm mesh',
    'Buz mesh': 'Ice mesh',
    'Orman': 'Forest',
    'Krem': 'Cream',

    /* çıktı boyutları */
    'Play Store telefon': 'Play Store phone',
    'Özel': 'Custom',

    /* AI modalı */
    '✨ AI metin & şablon': '✨ AI copy & template',
    '1 · Uygulamanı 1-2 cümleyle anlat': '1 · Describe your app in a sentence or two',
    'Örn: Halı saha maçı kuran, kadro toplayan ve skor tutan uygulama. Hedef kitle: 20-40 yaş amatör futbolcular.':
      'e.g. An app that organises five-a-side football matches, gathers the squad and keeps the score. Audience: amateur players aged 20-40.',
    '2 · Ekranların (her satır = bir ekran, slayt sırasıyla)': '2 · Your screens (one per line, in slide order)',
    'Dosya adlarından doldur': 'Fill from file names',
    'ana ekran — haftanın maçları listesi\nmaç kurma formu\nkadro / davet ekranı':
      'home — this week\'s matches\ncreate match form\nsquad / invite screen',
    'Ekran görüntülerini AI üretmiyor, sen yerleştiriyorsun. Bu liste sadece hangi metnin hangi ekrana yazılacağını bilmesi için. Boş bırakırsan genel bir akış kurar.':
      'The AI does not create screenshots — you place them yourself. This list only tells it which copy belongs to which screen. Leave it empty and it will invent a generic flow.',
    '3 · Prompt\'u al': '3 · Get the prompt',
    'Prompt\'u panoya kopyala': 'Copy prompt to clipboard',
    'Kopyaladığın prompt\'u ChatGPT / Claude\'a yapıştır, dönen JSON\'u aşağıya koy.':
      'Paste the prompt into ChatGPT / Claude, then paste the JSON it returns below.',
    'Prompt\'u göster / elle kopyala': 'Show prompt / copy manually',
    '4 · JSON çıktısını yapıştır': '4 · Paste the JSON output',
    'Ekran görüntülerin korunur, sadece metin ve stil değişir.':
      'Your screenshots stay in place — only copy and styling change.',
    'Kapat': 'Close',

    /* mesajlar */
    '{n} görsel eklendi': '{n} screenshots added',
    'İndirildi': 'Downloaded',
    '{n} görsel zip\'lendi': '{n} images zipped',
    'Font yüklendi: {name}': 'Font loaded: {name}',
    'Stil tüm slaytlara uygulandı': 'Style applied to all slides',
    'Proje yüklendi': 'Project loaded',
    'Proje okunamadı': 'Could not read the project',
    'Prompt kopyalandı — AI\'ya yapıştır': 'Prompt copied — paste it into your AI chat',
    'Panoya erişilemedi — metin seçili, ⌘C ile kopyala': 'Clipboard blocked — text is selected, press ⌘C',
    '{n} varyant bulundu — uygulamak için birine tıkla.': '{n} variants found — click one to apply.',
    '{n} slayt': '{n} slides',
    '{n} slayt "{name}" ile güncellendi': '{n} slides updated with "{name}"',
    'Geri alındı': 'Undone',
    'İleri alındı': 'Redone',
    'Geri alınacak bir şey yok': 'Nothing to undo',
    'İleri alınacak bir şey yok': 'Nothing to redo',
    'İçeride JSON bulunamadı': 'No JSON found in there',
    '"variants" ya da "slides" alanı yok': 'No "variants" or "slides" field',
    '{i}. varyantta slaytlar boş': 'Variant {i} has no slides',
    'Tüm slaytlar silinsin mi?': 'Delete all slides?',
    'slayt {n}': 'slide {n}',
  };

  let lang = 'tr';

  /** t('Türkçe metin', { n: 3 }) */
  function t(key, vars) {
    let out = (lang === 'en' && EN[key]) || key;
    if (vars) for (const k in vars) out = out.split('{' + k + '}').join(vars[k]);
    return out;
  }

  function applyStatic(root) {
    (root || document).querySelectorAll('[data-i18n]').forEach((el) => {
      if (el.dataset.i18nOrig == null) el.dataset.i18nOrig = el.textContent.trim();
      el.textContent = t(el.dataset.i18nOrig);
    });
    (root || document).querySelectorAll('[data-i18n-ph]').forEach((el) => {
      if (el.dataset.i18nPhOrig == null) el.dataset.i18nPhOrig = el.placeholder;
      el.placeholder = t(el.dataset.i18nPhOrig);
    });
    (root || document).querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.documentElement.lang = lang;
  }

  global.t = t;
  global.I18N = {
    get lang() { return lang; },
    set(l) { lang = l === 'en' ? 'en' : 'tr'; applyStatic(); },
    applyStatic,
    detect: () => (navigator.language || 'tr').toLowerCase().startsWith('tr') ? 'tr' : 'en',
  };
})(window);
