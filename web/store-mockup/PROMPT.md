# Store görselleri için AI prompt'u

Aşağıdaki metni **olduğu gibi** kopyala, `{{UYGULAMA}}` kısmını doldurup uygulamanı bilen bir
yapay zekâya ver. Dönen JSON'u uygulamada **✨ AI metin** butonuna yapıştır → 6 slayt, metinleri
ve tasarımıyla birlikte otomatik kurulur.

> Uygulamanın içinde de aynı prompt hazır: **✨ AI metin → Prompt'u kopyala**. Uygulama, açık olan
> slaytların dosya adlarını ekran listesine otomatik doldurur; sen o satırları "ana ekran", "istatistik
> sayfası" gibi düzeltirsin.
>
> **Ekran görüntülerini AI üretmez, sen verirsin.** İstersen görselleri o sohbete dosya olarak da
> ekleyebilirsin — o zaman AI metinleri ekranda gerçekten görünene bakarak yazar; ekleyemiyorsan
> ekran listesindeki tek satırlık açıklamalar yeterli.

---

## PROMPT (buradan kopyala)

Sen kıdemli bir ASO uzmanı ve görsel yönetmenisin. App Store / Google Play için ekran görüntüsü
(screenshot) setinin metinlerini ve tasarım şablonunu hazırlıyorsun.

UYGULAMA:
{{UYGULAMA}}

EKRANLAR (elimdeki ekran görüntüleri, sırayla):
{{EKRANLAR}}

GÖREVİN: {{ADET}} store görseli için başlık + alt başlık yaz ve 3 farklı tasarım varyantı öner.
Ekran görüntülerini ben hazırlayıp yerleştireceğim; senden görsel değil, metin ve şablon istiyorum.

METİN KURALLARI
- Başlık: en fazla 30 karakter. Kısa, fayda odaklı, emir veya vaat kipinde. Sonuna nokta koyma.
  İki satır istersen tam ortadan `\n` ile böl.
- Alt başlık: en fazla 55 karakter. Başlığı somutlaştırır; özelliği değil kullanıcının kazandığı
  sonucu anlatır.
- Uygulamanın dili neyse o dilde yaz (belirtilmemişse Türkçe).
- Klişe ve abartı yok: "devrim niteliğinde", "en iyi", "1 numara", "tek tıkla her şey" gibi
  ifadeler kullanma. Fiyat/indirim iddiası yazma (store politikası).
- Aynı ana kelimeyi iki farklı başlıkta tekrarlama.
- `slides` dizisi EKRANLAR listesiyle **birebir aynı sırada** olmalı: 1. metin 1. ekranı anlatsın.
  Bir metin, ait olduğu ekranda gerçekten görünen şeyden bahsetsin; ekranda olmayan özelliği uydurma.
  Ekran listesi verilmemişse tipik bir akış kurgula ve her slaytın hangi ekrana ait olduğunu
  `"screen"` alanında kısaca belirt.
- Anlatım sırası ({{ADET}} slayt için orantıla):
  1. Ana vaat / uygulamanın tek cümlelik sebebi
  2. Çekirdek özellik 1
  3. Çekirdek özellik 2
  4. Farklılaştırıcı (rakipte olmayan taraf)
  5. Güven: veri güvenliği, çevrimdışı çalışma, topluluk, hız — hangisi doğruysa
  6. Kapanış + eyleme çağrı
- İlk 2 görsel en kritik: kullanıcıların çoğu sadece onları görür, en güçlü vaatleri oraya koy.

TASARIM KURALLARI
- 3 varyant üret; her biri **farklı font + farklı renk paleti + farklı yerleşim ritmi** kullansın
  (ör. A: koyu mesh + sistem fontu, B: açık/krem + serif, C: canlı gradyan + geniş harf aralığı).
- Bir varyantın içi tutarlı olsun: aynı font, aynı metin boyutları, aynı cihaz çerçevesi.
  Arka plan slayttan slayta değişebilir ama aynı renk ailesinde kalsın; yerleşim en fazla 2 çeşit
  olsun (ör. 1. slayt "bleed", diğerleri "text-top").
- Koyu arka planda metin rengi `#ffffff`, açık arka planda `#111214`.
- `titleSize` 5–7 arası, `subSize` 3–3.8 arası. Başlık uzunsa boyutu küçült.

ÇIKTI BİÇİMİ
Sadece aşağıdaki şemaya uyan tek bir JSON döndür. Açıklama, yorum, giriş cümlesi yazma.

```json
{
  "variants": [
    {
      "name": "A — Koyu mesh",
      "template": {
        "font": "system",
        "frame": "iphone-pro",
        "deviceColor": "graphite",
        "layout": "text-top",
        "background": "cyber-mesh",
        "titleSize": 6.2,
        "subSize": 3.4,
        "weight": 700,
        "letterSpacing": 0,
        "textColor": "#ffffff",
        "subColor": "#ffffff",
        "shadow": false
      },
      "slides": [
        { "title": "Başlık", "subtitle": "Alt başlık", "layout": "bleed", "background": "indigo" },
        { "title": "Başlık", "subtitle": "Alt başlık" }
      ]
    }
  ]
}
```

- `slides` tam {{ADET}} eleman içermeli. Her slaytta `title` ve `subtitle` zorunlu.
- Slayt içindeki `layout`, `background`, `frame`, `deviceColor` alanları isteğe bağlıdır;
  yazılmazsa varyantın `template` değeri kullanılır.

İZİN VERİLEN DEĞERLER
- `font`: system | helvetica-neue | avenir | futura | georgia | times | courier | impact
- `frame`: iphone-pro | iphone-notch | iphone-classic | android | tablet | watch | browser | none
- `deviceColor`: graphite | black | silver | gold | blue | white
- `layout`: text-top (metin üstte) | text-bottom (metin altta) | bleed (cihaz aşağı taşar) |
  tilt (eğik) | right (cihaz sağda, metin sola dayalı) | left | small (küçük cihaz) |
  full (çerçevesiz tam ekran)
- `background`: hazır palet anahtarı → indigo | sunset | purple-night | mint | ocean | fire |
  rose | night | dark | light | cyber-mesh | warm-mesh | ice-mesh | forest | cream | graphite-bg
  **veya** kendi tanımın:
  `{ "type": "linear", "c1": "#6366f1", "c2": "#22d3ee", "angle": 135 }`
  (`type`: solid | linear | radial | mesh — mesh için `c3` de ver; ayrıca isteğe bağlı
  `pattern`: none|dots|grid|diagonal|rings, `noise`: 0-40, `vignette`: 0-80)
- `weight`: 300 | 400 | 500 | 600 | 700 | 800 | 900
- `letterSpacing`: -4 ile 20 arası (harf aralığı, punto yüzdesi)

---

## Not

Uygulamada JSON'u yapıştırdığında 3 varyant buton olarak çıkar; birine tıkla → o tasarım tüm
slaytlara uygulanır. Beğenmezsen diğerine tıkla, ekran görüntülerin yerinde kalır, sadece
metin ve stil değişir.
