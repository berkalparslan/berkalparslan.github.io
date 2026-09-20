# Store Mockup Studio — diğer oturumlar için akış

Üç giriş:
- **Uygulama** — https://berkalparslan.github.io/ss (→ `/web/store-mockup/app/`): projeler → şablon ya da boş →
  kurulum → metinler (AI ile doldur / prompt) → görseller → indir. Paket (.json) buraya bırakılabilir.
- **Editör** — https://berkalparslan.github.io/web/store-mockup/?p=<proje> : ince ayar, öğeler; aynı kayıt.
- **MCP / CLI** — `web/store-mockup/mcp/` (bkz. `mcp/README.md`): bir Claude oturumu PNG'leri **doğrudan üretebilir**:
  `node mcp/cli.mjs render --template indie --name … --lines lines.txt --shots ./ss --sizes 1290x2796,1080x1920 --out ./out`
  (ya da MCP aracı `render_screenshots`). Paket yolu hâlâ geçerli: `make-package.mjs` / `cli.mjs package`.
(yerel: `/Users/aberk/dev/web-githubpages/berkalparslan.github.io/web/store-mockup/`).

## Claude oturumunda yapılacaklar (uygulama projesinin içinde)

1. **Ekran görüntüleri** — iPhone 16 Pro Max simülatöründe (6.9", 1320×2868 / 1290×2796), her slayt
   için bir ekran, aydınlık mod, gerçekçi veri (Lorem yok, boş liste yok). Sırayla `01.png, 02.png…`:
   ```bash
   mkdir -p store/screenshots/src && xcrun simctl io booted screenshot store/screenshots/src/01.png
   ```
   (Android: `adb exec-out screencap -p > store/screenshots/src/01.png`, 1080×1920 ya da 1440×3120.)
   İlk 2-3 ekran en güçlü olanlar: ana vaat → çekirdek özellik → farklılaştırıcı.

2. **Metinler** — `store/screenshots/lines.txt`, her satır bir slayt, ss sırasıyla birebir:
   ```
   Paranı [gör] | Tüm hesapların tek ekranda
   Harcamanı [çöz] | Kategoriler kendiliğinden ayrılır
   ```
   Kurallar: başlık ≤ 30 karakter, alt başlık ≤ 55; başlıkta **tek** `[vurgu]` kelimesi (fayda
   kelimesi); iki satır için `\n`; nokta yok, abartı/fiyat iddiası yok; aynı ana kelime iki
   başlıkta tekrarlanmaz; uygulamanın dili neyse o dil. Ekranda görünmeyen özelliği yazma.

3. **Paket** — şablon anahtarını uygulamanın karakterine göre seç (aşağıda), marka rengini
   uygulamanın accent'inden al:
   ```bash
   node /Users/aberk/dev/web-githubpages/berkalparslan.github.io/web/store-mockup/make-package.mjs \
     --app "Wallet Coach" --lang tr --accent "#16a34a" --template indie \
     --shots store/screenshots/src --lines store/screenshots/lines.txt \
     --rating "4.8 · 1.2K değerlendirme" --icon ios/Assets.xcassets/AppIcon.appiconset/icon-1024.png \
     --out store/screenshots/wallet-coach.paket.json
   ```
   `--rating` yalnız gerçek puan varsa (App Store Connect'ten); yoksa verme. `--no-icon` ile
   1. slayttaki ikon+ad kapanır.

4. **Doğrudan PNG istiyorsa:** `node <yol>/mcp/cli.mjs render …` (ilk seferde `cd mcp && npm install && npm run fonts`).
   **Tarayıcıda düzenleyecekse:** paketin yolunu ver → /ss'e sürükle-bırak → proje olarak kurulur → "İndir".

## Şablon anahtarları

| anahtar | karakter |
|---|---|
| `indie` | beyaz, dev siyah başlık, vurgulu kelime, eğik dev telefon, puan rozeti — genel amaçlı, en güvenli |
| `ledger` | fintech: tek koyu mor, mor vurgu, özellik çipleri, bildirim kartı |
| `owl` | eğitim/oyunsu: canlı düz renkler, yuvarlak font, metin altta kutuda |
| `calm` | sağlık/uyku: panoramik mavi-yeşil gradyan, laurel |
| `neutral` | verimlilik: kâğıt beyazı, sıkı Inter, alt çizgi vurgu |
| `track` | spor: siyah + turuncu, Bebas büyük harf |
| `glass` | alışkanlık/takip: aurora mesh, cam kart, bildirim kartı, telefon + saat karesi |
| `strip` | fotoğraf/yaratıcı: panoramik sıcak gradyan, dönüşümlü eğik telefon |
| `lux` | premium: siyah + altın, Playfair serif |
| `paper` | günlük/yazı: krem, Instrument Serif, fosforlu vurgu |
| `lime` | gen-z/sosyal: limon sarısı, Unbounded, siyah çipler |
| `kova` | mor düz zemin, çerçevesiz kart (eğitim/verimlilik) |
| `nysa` | lacivert + mavi lekeler, çift laurel (hava/araç) |
| `vela` | koyu lacivert, büyük harf, sarı vurgu, laurel (eğitim) |
| `innerglow` | siyah, cihaz arkasında renkli ışıma (sağlık/spor) |
| `photoedit` | çerçevesiz tam ekran, serif; fotoğrafın kendisi zemin (foto) |
| `blast` | oyun: turuncu-pembe, tam ekran, alt kutu |
| `bank` | siyah + limon, dönüşümlü eğik, laurel (fintech) |
| `pastel` | pembe-nane-lavanta dönüşümlü, yuvarlak font (yaşam) |
| `terminal` | geliştirici: koyu ızgara, yeşil |
| `sky` | açık mavi, beyaz daireler (hava/seyahat) |
| `travel` | turkuaz-turuncu, çapraz şerit, eğik |
| `food` | krem, turuncu, emoji çipler |
| `news` | beyaz, serif manşet, kırmızı alt çizgi |
| `kids` | sarı, turuncu lekeler, kalın yuvarlak |
| `split` | panorama, cihaz iki kareye yayılır (3 çift) |
| `court` `lingo` `pluto` `astra` `mono` `editorial` `neon` `sunset` `duo` `grid` `ocean` `night` | v1 şablonları |

## Paket biçimi (elle üretmek istersen)

```json
{
  "quick": { "name": "Uygulama", "lang": "tr", "accent": "#16a34a", "template": "indie",
             "lines": ["Başlık [vurgu] | Alt başlık", "..."], "rating": "4.8 · 1.2K değerlendirme", "addIcon": true },
  "shots": [ { "name": "01.png", "data": "data:image/png;base64,..." } ],
  "icon": "data:image/png;base64,..."
}
```

AI'ya metin yazdırmak için prompt: `PROMPT.md` (TR) / `PROMPT.en.md` (EN) — dönen JSON araçta
✨ AI metin'e yapıştırılır; bu yol şablonu da AI'ya seçtirir.
