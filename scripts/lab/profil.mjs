/* Uygulama profili — paneldeki "Uygulamalar", "Pazarlama" ve "Takip"
   sekmelerinin statik tarafı. Rakam yok; rakamlar şifreli pakette.
   Buradaki bilgi: para modeli, hangi servisler bağlı, sabit maliyet, kategori.

   Yeni uygulama çıkınca apps.mjs'e ek olarak buraya da bir satır eklenir.
   Eksik slug panelde "profil yok" diye görünür, sessizce atlanmaz.

   model:
     ucretli   — mağazada parayla satılıyor, uygulama içi satın alma yok
     abonelik  — bedava + abonelik/ömür boyu (RevenueCat ya da StoreKit 2)
     iap       — bedava + tek seferlik satın alma
     bedava    — para modeli yok
   reklam: AdMob reklamı var mı (gelir App Store raporunda GÖRÜNMEZ)
   maliyet: aylık USD, yalnız bu uygulamaya ait sabit gider (0 = ücretsiz katman)
   ikon: sitedeki ikon yolu ya da emoji (ikonu olmayan uygulama için)
   servisler: SERVISLER tablosundaki anahtarlar
   projeler: servis → proje kimliği (Firebase'de üç ayrı proje var; hangi
             uygulamanın hangisinde olduğu konsolda görünmüyor, burada dursun) */

export const SERVISLER = {
  asc: {
    ad: "App Store Connect",
    url: "https://appstoreconnect.apple.com/",
    bak: "Satış, indirme, ülke, yorum, sürüm durumu. Panel bunları çekiyor.",
    siklik: "Panel günlük · Console haftada bir",
    panel: "tam"
  },
  play: {
    ad: "Google Play Console",
    url: "https://play.google.com/console/",
    bak: "İndirme, kaldırma, gelir, yorum, çökme (vitals). Toplu raporlar şu an 403.",
    siklik: "Haftada bir elle · yetki açılınca panel",
    panel: "kismi"
  },
  revenuecat: {
    ad: "RevenueCat",
    url: "https://app.revenuecat.com/",
    bak: "MTR, aktif abonelik, deneme → ücretli dönüşüm, iade. Charts → Active Trials, Trial Conversion.",
    siklik: "Haftada bir",
    panel: "yok"
  },
  firebase: {
    ad: "Firebase Analytics",
    url: "https://console.firebase.google.com/",
    bak: "Üç ayrı proje: wallet-coach-87336 · bam-tech-sports (beş spor uygulaması) · bosyeryok-tycoon; O mu Bu mu thisone-ba533. Analytics → Events: in_app_purchase (iOS otomatik), purchase_completed, paywall_shown. Gelir/anomali bildirimleri (\"Insights\") Analytics ana sayfasında; ürün ve para birimi için Events → in_app_purchase → parametreler.",
    siklik: "Haftada bir",
    panel: "yok"
  },
  crashlytics: {
    ad: "Crashlytics",
    url: "https://console.firebase.google.com/",
    bak: "Çökmesiz kullanıcı oranı. %99'un altına düşerse öncelik.",
    siklik: "Sürümden sonraki 3 gün · sonra ayda bir",
    panel: "yok"
  },
  admob: {
    ad: "AdMob",
    url: "https://apps.admob.com/",
    bak: "Reklam geliri, eCPM, gösterim. Bu gelir App Store satış raporunda yok — panel görmüyor.",
    siklik: "Ayda bir · ödeme eşiği 100 USD",
    panel: "yok"
  },
  supabase: {
    ad: "Supabase",
    url: "https://supabase.com/dashboard/",
    bak: "Auth kullanıcı sayısı, DB boyutu, Edge Function hataları, ücretsiz katman kotası.",
    siklik: "Haftada bir · kota %80'de uyar",
    panel: "yok"
  },
  render: {
    ad: "Render",
    url: "https://dashboard.render.com/",
    bak: "Servis uyanık mı, ücretsiz katman saatleri, hata logu.",
    siklik: "Ayda bir",
    panel: "yok"
  },
  mongodb: {
    ad: "MongoDB Atlas",
    url: "https://cloud.mongodb.com/",
    bak: "Küme durumu, depolama (512 MB ücretsiz sınır), bağlantı hataları.",
    siklik: "Ayda bir",
    panel: "yok"
  },
  cloudkit: {
    ad: "iCloud / CloudKit",
    url: "https://icloud.developer.apple.com/dashboard/",
    bak: "Eşitleme hataları, kota. Nadiren bakılır.",
    siklik: "Sorun bildirilince",
    panel: "yok"
  },
  cloudflare: {
    ad: "Cloudflare",
    url: "https://dash.cloudflare.com/",
    bak: "CDN önbellek isabeti, istek sayısı, hata oranı (O mu Bu mu görselleri). Worker cron adayı: panel çekimini Mac yerine buradan yapmak.",
    siklik: "Ayda bir",
    panel: "yok"
  },
  gemini: {
    ad: "Gemini API",
    url: "https://aistudio.google.com/",
    bak: "İstek sayısı, ücretsiz katman kotası, maliyet.",
    siklik: "Kullanım açılınca haftada bir",
    panel: "yok"
  },
  appleads: {
    ad: "Apple Ads",
    url: "https://ads.apple.com/",
    bak: "Kampanya kapalı. Anahtar kelime Search Popularity puanı (1–5) ödeme yöntemi gerekmeden bakılabilir.",
    siklik: "ASO çalışırken",
    panel: "yok"
  },
  web: {
    ad: "Site analitiği",
    url: null,
    bak: "Kurulu değil. Tanıtım sayfası → mağaza tıklaması ölçülmüyor. Aday: GoatCounter (ücretsiz, çerezsiz).",
    siklik: "—",
    panel: "yok"
  }
};

/* Portföy geneli sabit giderler (aylık USD). Uygulamaya bölünmüyor. */
export const SABIT_GIDER = [
  { ad: "Apple Developer Program", aylik: 99 / 12, not: "99 USD/yıl" },
  { ad: "Google Play Developer", aylik: 0, not: "25 USD tek seferlik, ödendi" },
  { ad: "GitHub Pages", aylik: 0, not: "public repo, ücretsiz" },
  { ad: "RevenueCat", aylik: 0, not: "2.500 USD MTR'a kadar ücretsiz" },
  { ad: "Firebase / Supabase / Render / Atlas", aylik: 0, not: "hepsi ücretsiz katman" }
];

export const PROFIL = {
  "walletcoach": {
    ikon: "/walletcoach/assets/icon-180.png",
    kategori: "Finans",
    model: "abonelik",
    fiyat: "Aylık · Yıllık · Ömür boyu 49 USD",
    servisler: ["asc", "play", "revenuecat", "firebase"],
    reklam: false,
    maliyet: 0,
    sayfa: "/walletcoach/",
    diller: 7,
    projeler: { firebase: "wallet-coach-87336" },
    not: "Onboarding + bağlama göre paywall var. Yedi dilde listeleme; ekran görüntüleri yalnız TR/EN. Shipaton girişi #1."
  },
  "tennis-padel": {
    ikon: "/tennis-padel/assets/icon.webp",
    kategori: "Spor",
    model: "abonelik",
    fiyat: "Bedava + All-Sports Pass (aylık/yıllık/ömür boyu)",
    servisler: ["asc", "play", "revenuecat", "admob", "cloudkit", "firebase"],
    reklam: true,
    maliyet: 0,
    sayfa: "/tennis-padel/",
    diller: 1,
    projeler: { firebase: "bam-tech-sports" },
    not: "Portföyün gelir tabanı. Birleştirmede taban bu olur, kapatılmaz. Anahtar kelime alanının yarısı boş."
  },
  "pickleball": {
    ikon: "/pickleball/assets/icon.webp",
    kategori: "Spor",
    model: "abonelik",
    fiyat: "Bedava + All-Sports Pass",
    servisler: ["asc", "admob", "cloudkit", "firebase"],
    reklam: true,
    maliyet: 0,
    sayfa: "/pickleball/",
    diller: 1,
    projeler: { firebase: "bam-tech-sports" },
    not: "Pass'i tenis satıyor, bu uygulama trafiği pass'e çeviremiyor. Galibiyet hatası kodda düzeltildi, sürüm 4.3'ü bekliyor."
  },
  "volleyball": {
    ikon: "/volleyball/assets/icon.webp",
    kategori: "Spor",
    model: "abonelik",
    fiyat: "Bedava + All-Sports Pass",
    servisler: ["asc", "admob", "cloudkit", "firebase"],
    reklam: true,
    maliyet: 0,
    sayfa: "/volleyball/",
    diller: 1,
    projeler: { firebase: "bam-tech-sports" },
    not: "Paylaşım ekranında bilinen çökme (Save/Stories). Sürüm 4.3'ü bekliyor."
  },
  "rally-badminton": {
    ikon: "/rally-badminton/assets/icon.webp",
    kategori: "Spor",
    model: "abonelik",
    fiyat: "—",
    servisler: ["asc", "admob", "cloudkit", "firebase"],
    reklam: true,
    maliyet: 0,
    sayfa: "/rally-badminton/",
    diller: 1,
    projeler: { firebase: "bam-tech-sports" },
    not: "30 Ağustos'ta satıştan kaldırıldı (4.3 işaretini kırmak için). Pazarlama yapılmaz."
  },
  "rally-table-tennis": {
    ikon: "/rally-table-tennis/assets/icon.webp",
    kategori: "Spor",
    model: "abonelik",
    fiyat: "—",
    servisler: ["asc", "admob", "cloudkit", "firebase"],
    reklam: true,
    maliyet: 0,
    sayfa: "/rally-table-tennis/",
    diller: 1,
    projeler: { firebase: "bam-tech-sports" },
    not: "30 Ağustos'ta satıştan kaldırıldı. Pazarlama yapılmaz."
  },
  "tasbih-tally": {
    ikon: "/tasbih-tally/assets/icon.webp",
    kategori: "Araç",
    model: "ucretli",
    fiyat: "0,99 USD · IAP yok",
    servisler: ["asc", "play"],
    reklam: false,
    maliyet: 0,
    sayfa: "/tasbih-tally/",
    diller: 1,
    not: "★1,0 — iki yorum da Double Tap eksikliği. Bedava+abonelik adayı ama önce puan düzelmeli."
  },
  "orbix-roulette": {
    ikon: "/orbix-roulette/assets/icon.webp",
    kategori: "Eğlence",
    model: "ucretli",
    fiyat: "1,99 USD · IAP yok",
    servisler: ["asc", "play"],
    reklam: false,
    maliyet: 0,
    sayfa: "/orbix-roulette/",
    diller: 1,
    not: "iOS 1.1'de dondu (simulated gambling reddi). Android yeniden gönderildi. Bedava+abonelik adayı."
  },
  "o-mu-bu-mu": {
    ikon: "/o-mu-bu-mu/assets/icon.webp",
    kategori: "Eğlence",
    model: "bedava",
    fiyat: "Satın alma yok",
    servisler: ["asc", "admob", "render", "mongodb", "firebase", "cloudflare"],
    reklam: true,
    maliyet: 0,
    sayfa: "/o-mu-bu-mu/",
    diller: 1,
    projeler: { firebase: "thisone-ba533" },
    not: "Sunucusu olan tek uygulama (Render ücretsiz katman uyuyor). İndirme var, para modeli yok — karar bekliyor."
  },
  "kit-qr": {
    ikon: "/kit-qr/assets/icon.webp",
    kategori: "Araç",
    model: "iap",
    fiyat: "Bedava + Kit Pro (ömür boyu)",
    servisler: ["asc"],
    reklam: false,
    maliyet: 0,
    sayfa: "/kit-qr/",
    diller: 1,
    not: "Bakım modunda. Not neredeyse boş, ASO hiç yapılmadı."
  },
  "yonca": {
    ikon: "🍀",
    kategori: "Araç",
    model: "abonelik",
    fiyat: "Yonca Pro 1,99 / 9,99 / 24,99 USD",
    servisler: ["asc", "revenuecat"],
    reklam: false,
    maliyet: 0,
    sayfa: "/yonca/",
    diller: 1,
    not: "1.1 (çekiliş yapma + Pro) incelemede. Yılbaşı çekiliş sezonu için Türkçe ASO fırsatı. Shipaton girişi #3."
  },
  "bodybook": {
    ikon: "🩺",
    kategori: "Sağlık",
    model: "abonelik",
    fiyat: "BodyBook Pro aylık / yıllık / ömür boyu (Play)",
    servisler: ["asc", "play", "revenuecat"],
    reklam: false,
    maliyet: 0,
    sayfa: "/bodybook/",
    diller: 7,
    not: "Play'de yayında, iOS 4.3(a) ile kilitli. En yüksek RLTV kategorisindeki tek varlık. Shipaton girişi #2."
  },
  "bosyeryok": {
    ikon: "/bosyeryok/assets/icon-180.png",
    kategori: "Oyun",
    model: "iap",
    fiyat: "9 IAP (Patron, nakit, altın)",
    servisler: ["asc", "play", "revenuecat", "firebase", "crashlytics"],
    reklam: false,
    maliyet: 0,
    sayfa: "/bosyeryok/",
    diller: 2,
    projeler: { firebase: "bosyeryok-tycoon" },
    not: "iOS 4.3(a) ile reddedildi, itiraz sürüyor. Android kapalı testte. Ekşi/Türkçe forumlar için doğal aday."
  },
  "daily-whisper": {
    ikon: "/daily-whisper/assets/icon.webp",
    kategori: "Yaşam",
    model: "bedava",
    fiyat: "Satın alma yok",
    servisler: ["play"],
    reklam: false,
    maliyet: 0,
    sayfa: "/daily-whisper/",
    diller: 1,
    not: "iOS tarafı başka hesapta — buradan ölçülemiyor. Bakım modunda."
  },
  "leafbook": {
    ikon: "/leafbook/assets/icon.png",
    kategori: "Yaşam",
    model: "abonelik",
    fiyat: "Aylık / yıllık (1 hafta deneme)",
    servisler: ["revenuecat", "gemini"],
    reklam: false,
    maliyet: 0,
    sayfa: "/leafbook/",
    diller: 2,
    not: "Yayınlanmadı. Plant identifier kalıbı 4.3 için ekstra riskli. Play kapalı testi açılabilir."
  },
  "kirk-hafta": {
    ikon: "/bumpline/assets/icon.webp",
    kategori: "Sağlık",
    model: "bedava",
    fiyat: "Henüz yok",
    servisler: [],
    reklam: false,
    maliyet: 0,
    sayfa: "/bumpline/",
    diller: 2,
    not: "Yayınlanmadı (Bumpline). Analitik yok, ağ yok."
  },
  "oncopace": {
    ikon: "🎗️",
    kategori: "Sağlık",
    model: "bedava",
    fiyat: "Henüz yok (RevenueCat sonra)",
    servisler: ["supabase", "gemini"],
    reklam: false,
    maliyet: 0,
    sayfa: null,
    diller: 2,
    not: "TestFlight'ta. Supabase ücretsiz katman. Yönetim paneli /lab/oncopace/."
  },
  "loomi": {
    ikon: "🧶",
    kategori: "—",
    model: "bedava",
    fiyat: "—",
    servisler: [],
    reklam: false,
    maliyet: 0,
    sayfa: null,
    diller: 0,
    not: "Rafta, ortak proje."
  },
  "viral-sounds": {
    ikon: "🔊",
    kategori: "—",
    model: "bedava",
    fiyat: "—",
    servisler: ["asc"],
    reklam: false,
    maliyet: 0,
    sayfa: null,
    diller: 0,
    not: "Vault notu yok. Mağazada değil."
  }
};

/* Tarihli işler — panelin "Özet" sekmesinde geri sayımla görünür.
   Geçmiş tarihler otomatik düşer. Kaynak vault notları; burası aynası. */
export const TAKVIM = [
  { tarih: "2026-09-23", ne: "Shipaton: RevenueCat 'bu tarihe kadar yayında ol' diyor — Yonca 1.1 onayı bu tarihe yetişmeli", konu: "shipaton-2026" },
  { tarih: "2026-09-25", ne: "Apple 4.3 itirazı: cevap yoksa Developer Support'u ara (vaka 102959709295)", konu: "apple-4-3-sorunu" },
  { tarih: "2026-10-01", ne: "Shipaton son gün 09:45 TSİ — Devpost girişleri kilitlenir", konu: "shipaton-2026" },
  { tarih: "2026-10-15", ne: "Wallet Coach DEVPOST1 offer code'un süresi biter", konu: "walletcoach" },
  { tarih: "2026-11-01", ne: "Google Play Billing 8 zorunluluğu — Tennis Padel Android güncel, diğer Play uygulamalarını kontrol et", konu: "android-play" }
];

/* Aylık hedef — "şirket" panosunun ölçüsü. Berk değiştirir; panel bu aya
   göre ilerleme çubuğu çizer. USD, panelde kurla ₺'ye çevrilir. */
export const HEDEF = { aylikGelirUsd: 100, aylikIndirme: 250, aylikSatinAlma: 25 };
