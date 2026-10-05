# Ürün ve yayın kararı — 6 Ekim 2026

Bu sürüm mevcut ücretsiz aracı geliştirir: yeni Apple creative assets, özgün Studio koleksiyonu ve doğru yatay önizlemeler. Canlı siteye gönderilmedi. Ödeme, bulut hesabı ve mağazaya doğrudan yükleme çalışır özellik olarak sunulmuyor.

## Konumlandırma

**Uygulamanın mağazadaki ilk izlenimi, tek editörde.** Hedef: kendi uygulamasını yayınlayan bağımsız geliştirici. Fark: telefon ekran görüntüsü serisi + yeni Header / Search artwork, yerelde saklanan projeler, gerçek UI görselleri, dil başına metin ve CLI/MCP ile aynı motor. Fotoğraf üretici, Figma klonu veya video editörü vaadi yok.

İlk reklam mesajı: “New App Store creative assets? Your launch kit is ready.” Türkçe: “Yeni App Store alanları için görsellerin hazır.” 20–30 saniyelik demo: creative şablonu seç → gerçek ekranı bırak → başlığı değiştir → tam ölçülü RGB PNG ZIP indir. Apple ile resmî ortaklık veya kabul garantisi ima edilmesin.

## Koleksiyon

32 set / 124 düzen: 16 telefon seti (6 kare), 12 creative asset seti (tek kare), 4 tablet seti (4 kare). Finans, üretkenlik, sağlık, yaşam, developer tools, araçlar, yemek, seyahat, iş, fotoğraf, oyun, eğitim, müzik, hava, alışveriş ve spor için örnek metinler. Metinler demo; kullanıcı desteklemediği özellikleri kaldırmalı. Özellikle örnek puan, ödül veya kullanıcı yorumu yeni setlerde eklenmez.

Paper / Clay / Ledger / Ruby: serif ve ince çizgiler. Midnight / Cobalt / Orchid / Ice: asimetrik alanlar. Lime / Peach / Signal / Apricot: büyük tipografi ve dairesel zemin. Mono / Tide / Sand / Ink: düz, sakin düzenler. Her seri farklı kare düzenleri kullanır; ekranlar esnetilmez.

Eski 195 anahtar uyumluluk için yüklenir, yeni katalogda gösterilmez. Mevcut proje dosyaları kendi katmanlarını sakladığından açılmaya devam eder. Ücretli pakette yalnız özgün yeni tasarımlar kullanılmalı; eski katalog ücretli ürünün kaynağı yapılmamalı.

## Gelir önerisi

| Seçenek | Önerilen fiyat | Satılacak değer | Karar |
|---|---:|---|---|
| Ücretsiz temel | $0 | Bugünkü editör, koleksiyon ve yerel export | Kullanıcı edinimi ve demo |
| Yeni Launch Pack | $19 tek sefer | Ek özgün koleksiyonlar, uyumlu screenshot/header/search kampanyaları, örnek proje dosyaları ve yayın rehberi | İlk satış denemesi |
| İsteğe bağlı destek | $5–10 veya kullanıcı seçimi | Ücretsiz araç için gönüllü destek | Yan kanal |
| Abonelik | İleride $5–9/ay hipotezi | Bulut yedekleme, ekip, sürüm geçmişi ve maliyeti sınırlı AI kredileri gerçekten geliştirilirse | Şimdi başlatma |

$19 araştırmadan çıkarılmış bir pazar garantisi değil, test fiyatıdır. Mevcut özellikleri sonradan kapatarak kullanıcı güvenini harcamak yerine yeni ek paket sat. Fiyat karşılığındaki dosyalar bitmeden checkout açma. Kalıcı “tüm gelecek özellikler” sözü verme; bir defalık paketin kapsamı ve sürümü açık olsun.

Hızlı ödeme yolu: Lemon Squeezy hosted checkout + indirilebilir `.sms.json` paketleri. Bu başlangıçta hesap/abonelik backend’i gerektirmez. HTML/JS içinde kart verisi veya ödeme gizli anahtarı tutma. Editöre erişim satılacaksa daha sonra sunucu tarafında doğrulanan haklar ve webhook gerekir; localStorage ile güvenilir ücretli erişim uygulanmaz. Merchant of Record modeli uluslararası satış vergisi tahsilatını kolaylaştırır; kendi işletme ve gelir yükümlülüklerinin yerine geçtiği varsayılmamalı.

Lemon Squeezy resmî listesinde Türkiye’ye banka ödemesi var. Hesabın aktivasyonu/onboarding’i ayrıca gerekir. Resmî ücret örneği: $0.50 + %5, uluslararası işlemde +%1.5; ABD dışı banka payout’unda %1. $19 satıştan vergi yok varsayımıyla yaklaşık $17.55, payout öncesi kalır; 20% VAT olan müşteri örneğinde yaklaşık $17.02. Gerçek net tutar müşteri/ödeme/vergiye göre değişir. $3 gibi çok düşük fiyat sabit ücretten daha çok etkilenir.

Buy Me a Coffee de 24 Ağustos 2026 resmî listesinde Türkiye’yi Stripe Express altında sayıyor. %5 platform ücreti, ayrıca ödeme işlem ücretleri var. Destek için uygun; ürünün ana gelir modeli için ölçülebilir paket satışı daha net. Ödeme hesabı bağlantısı henüz eklenmedi; sahte destek URL’si yok.

## İsim

Çalışma önerisi: **Bam Launch Studio**. Var olan Bam markasını korur, screenshot dışındaki creative alanlara da uygundur. Bağımsız isim seçimi kullanıcıyla yapılacak; domain ve marka hakları doğrulanmadı.

Storeframe aynı screenshot kategorisinde kullanılıyor. Launchfolio da birden fazla ürünce kullanılıyor; Storeloom tasarım paketleri ve MCP bağlamında mevcut. Bu üç ismi seçmemek daha iyi. Web aramasında sonuç çıkmaması hiçbir adayın müsait olduğunun kanıtı değildir.

## Yayın öncesi kalan kararlar

1. Yeni koleksiyonun gerçek bir kullanıcı uygulamasıyla tasarım değerlendirmesi; demo ekranların gerçek ekranlarla değiştirilmesi.
2. İsim/domain kararı, gerekiyorsa ayrı repo/domain’e taşıma; mevcut `/web/store-mockup/` için yönlendirme.
3. Satılacak ek paketin gerçek içerik kapsamı ve fiyatı; mevcut ücretsiz koleksiyondan ayrı üretim.
4. Ödeme sağlayıcısı hesabı ve test checkout/refund/delivery akışı.
5. Kullanıcıya uygun destek, gizlilik, ticari kullanım ve iade metinleri.
6. Final tasarım değerlendirmesinden sonra mevcut statik hosting’e deploy. Bu değişiklikte push veya deploy yapılmadı.

Reklamı ilk başarılı export ve ödeme teslimi doğrulandıktan sonra küçük bütçeyle test et. Ölçüm: katalog → proje başlatma → başarılı export → paket checkout → satın alma. Screenshot veya API anahtarı telemetriye gönderilmesin. Trafik varken export dönüşümü düşükse reklam bütçesinden önce kullanılabilirliği düzelt.

## Kaynaklar (6 Ekim 2026 kontrolü)

- [Apple creative assets ölçüleri](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications)
- [Apple creative assets yönetimi](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-your-app-store-assets)
- [Apple asset best practices](https://developer.apple.com/app-store/asset-best-practices/)
- [Rakip AppScreens planları](https://appscreens.com/pricing): ücretsiz/ücretli ayrımı ve direct-upload değer önerisi; canlı fiyat tutarı doğrulanmadığından rakip fiyatı kullanılmadı.
- [Lemon Squeezy ülkeleri](https://docs.lemonsqueezy.com/help/getting-started/supported-countries)
- [Lemon Squeezy ücretleri](https://docs.lemonsqueezy.com/help/getting-started/fees)
- [Buy Me a Coffee ülkeleri](https://help.buymeacoffee.com/en/articles/6258038-supported-countries-for-payouts-on-buy-me-a-coffee)
- [Buy Me a Coffee ücretleri](https://help.buymeacoffee.com/en/articles/8105744-how-to-calculate-charges-on-your-payment)
- [Storeframe](https://storeframe.fixou.app/), [Launchfolio](https://www.launch-folio.tech/), [Storeloom Studio](https://www.storeloomstudio.com/)
