# /lab/assets — panellerin ortak dili

Her uygulamanın paneli ayrı bir sayfa, ama hepsi aynı biçimde çalışsın diye
görünüm ve bileşenler buradan gelir. Bir panelde öğrendiğin hareket
diğerinde de aynı işi yapar.

```html
<link rel="stylesheet" href="/lab/assets/panel.css?v=1">
```
```js
import { kart, tiles, veriTablo, dagilimTablo, sayi, sure, tarih, yuzde, para }
  from "/lab/assets/panel.js?v=1";
```

## Kurallar

- **Her tablo `veriTablo`.** Başlığa tıklayınca sıralanır (sayı gibi duran
  sütunlar sayı gibi sıralanır), 7 satırdan uzunsa arama kutusu çıkar,
  `filtre: true` verilen sütun açılır kutuya döner, "Kopyala" tabloyu
  panoya TSV olarak alır. Boş liste `bos` metnini yazar; dışarıda
  `liste.length ? ... : ...` kurmaya gerek yok.
- **Sayılar `sayi()`, süreler `sure()`, tarihler `tarih()`, oranlar
  `yuzde()`, para `para()`.** Panelden panele aynı görünsün diye.
- **Kutucuk satırı `tiles()`, kutu `kart()`.**

```js
veriTablo(
  ["Kurulum", { ad: "Platform", filtre: true }, { ad: "Bitki", num: true }, "Son"],
  satirlar,                       // hücre: ilkel değer ya da { d: görünen, s: sıralama }
  { sirala: [3, "desc"], satirTik: s => ..., bos: "Kayıt yok." },
);
```

`{ d, s }` biçimi, görünenle sıralananın ayrıştığı yerler için: tarih
"8 Eki 10:00" görünür ama zaman damgasına göre sıralanır.

## Satış sayfası

Mağaza parası App Store Connect ve Play raporlarından gelir; anahtarları
statik sayfada tutamayız. `scripts/lab/panel-yaz.mjs` her sabah özeti her
uygulamanın kendi Firestore'unda `panel/sales` belgesine yazar, panel
yalnızca onu okur.

## Referans panel

`lab/leafbook/` bu katmanın tam uygulanmış hali. Yeni bir panel ya da
mevcut birini taşırken ona bak.
