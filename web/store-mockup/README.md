# Store Mockup Studio — diğer oturumlar için akış

appscreens.com tarzı, satılabilir bir App Store / Google Play screenshot ürünü. Üç giriş:

- **Vitrin** — https://berkalparslan.github.io/ss (→ `/web/store-mockup/`), EN/TR.
- **Şablonlar** — `/web/store-mockup/templates/` (kategori, mağaza/cihaz, tema filtreleri; `#/t/<anahtar>` detay).
  "Şablonla başla" → proje oluşturur → **editör** `/web/store-mockup/app/#/project/<id>`.
  Deneme modu (kaydetmeden): `app/#/sandbox`.
- **Uygulama** — `/web/store-mockup/app/#/projects`: kayıtlı projeler (IndexedDB), yeniden adlandır / kopyala /
  dışa aktar (`.sms.json`) / içe aktar / sil.
- **MCP / CLI** — `web/store-mockup/mcp/` (bkz. `mcp/README.md`): bir Claude oturumu PNG'leri **doğrudan üretir**
  ya da tarayıcıda açılacak `.sms.json` projesi yazar.

Yerel: `/Users/aberk/dev/web-githubpages/berkalparslan.github.io/web/store-mockup/`.

## Editör (appscreens düzeni)

Araç çubuğu: **AI ile doldur** (açıklama → tüm ekranların başlık/alt başlıkları, her dilde; Anthropic anahtarı
tarayıcıda kalır, ya da prompt kopyala) · **Genel** (font/renk/cihaz çerçevesi, tüm ekranlara) · **Kurulum**
(Hakkında: ad, ikon · Çıktı boyutları · Diller · Gelişmiş) · **Arka plan** (projeye yayılan panorama) ·
**Yerelleştir** · **Uygulama ekranları** (ekran başına cihaz ailesi slotları: global / iPhone / iPad / Watch /
Android telefon / tablet / masaüstü; toplu yükleme) · **Önizle ve dışa aktar** (boyut × dil önizleme, zip:
`<dil>/<boyut>/NN-slug.png`). Yatay ekran şeridi; ekrana tıklayınca katman paneli (metin, cihaz, görsel, öğe:
çip, puan, yıldız, laurel, bildirim kartı, ikon+ad, ok, halka, ışıltı, emoji, alıntı, şekil). Sürükle/boyutlandır/ok
tuşları, geri al/yinele, kısayollar `?`.

Metin sözdizimi: başlıkta **tek** `[vurgu]` kelimesi (fayda kelimesi); `\n` satır kırar; alt başlık başlığın
altına "akar". Konumlar tuvalin yüzdesi → her çıktı boyutunda aynı düzen.

## Claude oturumunda yapılacaklar (uygulama projesinin içinde)

1. **Ekran görüntüleri** — iPhone 16 Pro Max simülatöründe (6.9", 1320×2868), her slayt için bir ekran, aydınlık
   mod, gerçekçi veri (Lorem yok, boş liste yok). Sırayla `01.png, 02.png…`:
   ```bash
   mkdir -p store/screenshots/src && xcrun simctl io booted screenshot store/screenshots/src/01.png
   ```
   (Android: `adb exec-out screencap -p > store/screenshots/src/01.png`. iPad varsa ayrı klasör: `src-ipad/`.)
   İlk 2-3 ekran en güçlü olanlar: ana vaat → çekirdek özellik → farklılaştırıcı.

2. **Metinler** — `store/screenshots/lines.txt` (uygulamanın dili), her satır bir slayt, ss sırasıyla birebir;
   diğer diller `lines.<dil>.txt` aynı sırayla:
   ```
   Paranı [gör] | Tüm hesapların tek ekranda
   Harcamanı [çöz] | Kategoriler kendiliğinden ayrılır
   ```
   Kurallar: başlık ≤ 30 karakter, alt başlık ≤ 55; başlıkta **tek** `[vurgu]`; nokta yok, abartı/fiyat iddiası yok;
   aynı ana kelime iki başlıkta tekrarlanmaz. Ekranda görünmeyen özelliği yazma.

3. **Üret** — şablonu uygulamanın karakterine göre seç (`node mcp/cli.mjs templates` listeler), marka rengini
   uygulamanın accent'inden al. İlk seferde `cd mcp && npm install && npm run fonts`.
   ```bash
   M=/Users/aberk/dev/web-githubpages/berkalparslan.github.io/web/store-mockup/mcp
   # doğrudan PNG (dil × boyut klasörleri)
   node $M/cli.mjs render --template pluto --name "Wallet Coach" --lang tr --lines store/screenshots/lines.txt \
     --captions-en store/screenshots/lines.en.txt --shots store/screenshots/src \
     --icon ios/Assets.xcassets/AppIcon.appiconset/icon-1024.png --accent "#16a34a" \
     --rating "4.8 · 1.2K değerlendirme" --sizes iphone-6.9,iphone-6.5,android-phone --out store/screenshots/out
   # ya da tarayıcıda ince ayar için proje dosyası
   node $M/cli.mjs project --template pluto --name "Wallet Coach" --lang tr --lines … --shots … --out store/screenshots/wallet-coach.sms.json
   ```
   `--rating` yalnız gerçek puan varsa (App Store Connect'ten). `--no-icon` 1. slayttaki ikon+adı kapatır.
   `--frame android|iphone-notch|none` çerçeveyi değiştirir. MCP aracı olarak: `render_screenshots` / `build_project`
   (`shots` ailelere göre de verilebilir: `{"iphone":[…],"ipad":[…]}`).

4. **Tarayıcıda düzenleyecekse:** `.sms.json` → `/ss` → Projeler → İçe aktar → editörde aç → Önizle ve dışa aktar.

## Şablonlar

`engine/templates/`: `legacy.js` (38 eski şablon, anahtar `v2-*`), `set-a.js` (appscreens'ten yeniden yapılan
24: kova, photo-editor, pluto, astra, vela, planner, orin, roy-story, current-banking, inner-glow, bevel, nordvpn,
sive, triton, zeus, eira, stripe, alora, jshealth, runa, brain-training, vanta, seed, claude-ai). Her şablon 8 ekran,
EN+TR örnek metin. Yeni şablon: `Tpl.defineTemplate({...})` DSL'i (`engine/tpl-dsl.js`), dosyayı
`templates/index.js` listesine ekle. appscreens kataloğu/önizlemeleri: bu oturumun scratchpad'inde
(`appscreens/catalog.txt`, `previews/`).

## Yapı

```
index.html  site.css  fonts.css  common.js     vitrin + ortak tasarım sistemi + nav
templates/  index.html catalog.js catalog.css   şablon kataloğu + detay
app/        index.html app.js editor.js modals.js app.css   projeler + editör + modallar
engine/     devices.js store.js i18n.js render.js model.js tpl-dsl.js frames.js templates/
mcp/        server.mjs cli.mjs render-node.mjs fonts.mjs   aynı motor Node'da
legacy/     eski v2/v3 editör (referans)
```
Veri: IndexedDB `sms-v3` (projects/assets/kv). Proje dosyası `sms-project-v3`. Kullanıcı girişi/senkron ileride;
proje şekli buna göre (id, meta, screens[layers], assets ayrı).
