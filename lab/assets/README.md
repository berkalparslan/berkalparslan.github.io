# /lab/assets: panellerin ortak dili

Her uygulamanın paneli ayrı bir sayfa, ama hepsi aynı biçimde çalışsın diye
kabuk, görünüm ve bileşenler buradan gelir. Bir panelde öğrendiğin hareket
diğerinde de aynı işi yapar. Standart: vault `konular/panel-standardi.md`.
Referans panel: `lab/leafbook/`.

```html
<link rel="stylesheet" href="/lab/assets/panel.css?v=5">
```
```js
import { panelKabuk } from "/lab/assets/shell.js?v=1";
import { kart, tiles, veriTablo, dagilimTablo, sayi, sure, tarih, tarihTam, tarihHucre,
         yuzde, para, kullaniciCekmecesi } from "/lab/assets/panel.js?v=5";
import { pushSayfasi, gonderilenlerSayfasi, kisiyeBildirim } from "/lab/assets/push.js?v=2";
import { dunyaHaritasi } from "/lab/assets/harita.js?v=1";
```

Bir dosya değişince `?v=` numarasını artır, onu içe aktaran her yerde de
(`shell.js` ve `push.js` `panel.js?v=5`'i içe aktarır).

## Kabuk: `shell.js`

```js
const kabuk = await panelKabuk({
  ad: "Leafbook",
  ikon: "/assets/lab-icons/leafbook-180.png",
  firebaseConfig,                       // Firebase Auth ile Google girişi
  yonetici: "yonetici@ornek.com",       // tek yerde
  araliklar: [1, 7, 30, 90], aralik: 7, // üst satırdaki gün düğmeleri (isteğe bağlı)
  yukle: async kabuk => { ... },        // girişten sonra, Yenile'de ve aralık değişince
  gruplar: [
    { baslik: "ANALİZ", sayfalar: [{ id: "genel", ad: "Genel bakış", ciz: (icerik, kabuk) => ... }, ...] },
    { baslik: "SOSYAL", sayfalar: [...] },   // yalnız sosyal uygulamalarda
    { baslik: "YÖNET",  sayfalar: [...] },
  ],
});
```

Döner: `app`, `auth`, `kullanici`, `oturum`, `token()` (ID token),
`aralik`, `sayfa`, `git(id)`, `ciz()`, `yenile()`, `durum(metin)`, `demo`.

- Menü sırası standarttaki gibi: ANALİZ (Genel bakış, Canlı, Ekranlar,
  Paywall ve satın alma, Kullanım, Kullanıcılar, uygulamaya özel, Analytics),
  SOSYAL, YÖNET (Bildirim gönder, Gönderilenler, içerik, Ayarlar).
- Yönlendirme `#sayfa-id` ile; geri tuşu çalışır. `?demo` girişi atlar.
- **Giriş yalnız Google ile.** E-posta bağlantısı, şifre, kod yok.
  Firebase'li panelde Firebase Auth açılır penceresi; e-posta `yonetici`
  olmalı ve doğrulanmış olmalı, değilse oturum kapatılır.
- **Firebase'siz panel (nika gibi Worker arkalı):** `firebaseConfig` yerine
  `googleIstemci` (OAuth Web istemci kimliği) ve `girisDogrula(idToken)` ver.
  Google Identity Services ID token'ı alır, `girisDogrula` onu Worker'a
  yollar; Worker token'ı Google'ın anahtarlarıyla
  (`https://www.googleapis.com/oauth2/v3/certs`) doğrular: `iss` Google,
  `aud` istemci kimliği, `email` yönetici, `email_verified` true, `exp`
  geçmemiş. Dönen değer `kabuk.oturum` olur (ör. kısa ömürlü oturum
  anahtarı). `kabuk.token()` bu durumda Google ID token'ını verir.
  Firebase'li panelde de `girisDogrula` verilirse Firebase ID token'ıyla
  ikinci kapı olarak çalışır.
- Asıl kapı her zaman sunucu tarafı: Firestore kuralları ya da Worker.
- Kabuk çağrısını betiğin **en sonuna** koy: sayfa fonksiyonlarının
  kullandığı `let`/`const` tanımları hazır olsun (yoksa TDZ hatası).

## Biçim ve tablo: `panel.js`

- **Her tablo `veriTablo`.** Başlığa tıklayınca sıralanır, 7 satırdan uzunsa
  arama kutusu çıkar, `filtre: true` sütunu açılır kutuya döner, "Kopyala"
  tabloyu TSV olarak alır. `satirTik(satir, index)` index özgün dizideki sıra.
- **Sayılar `sayi()`, süreler `sure()`, oranlar `yuzde()`, para `para()`.**
- **Tarih:** tablolarda ve çekmecede `tarihTam(v)` →
  `10 Eki 2026 14:03:27` (Türkiye saati, saniyeli; yalnız gün olan metin
  saatsiz). Tablo hücresi için `tarihHucre(v)` = `{ d: tarihTam(v), s: ms(v) }`.
  Kısa `tarih()` eski kullanım için duruyor.
- **Kutucuk satırı `tiles()`, kutu `kart()`.**
- **Kullanıcı çekmecesi** `kullaniciCekmecesi(kayit, alanlar, secenek)`:

```js
kullaniciCekmecesi(kurulum, [
  ["Platform", kurulum.platform],
  ["Son görülme", tarihTam(kurulum.lastSeen)],
  { baslik: "Kullanım" },                 // ara başlık
  ["Bitki", sayi(kurulum.n_plants)],
], {
  baslik: "Kurulum ab12cd34", alt: "ios · 1.1 · TR",
  eylemler: [{ ad: "Bu kişiye bildirim gönder", kapali: !ulasir,
               tik: kapat => { kapat(); kisiyeBildirim(kurulum.id); kabuk.git("bildirim"); } }],
  hamAlanlar: true,                       // en altta "Bütün alanlar"
  ek: async kutu => { /* zaman çizelgesi */ },
});
```

## Bildirim: `push.js`

`pushSayfasi(icerik, cfg)` bam-sports'taki sayfanın aynısı:

- **Konular** ve **Kitle** modları; Kitle'de dil, Pro, hesap, son görülme
  filtreleri ve **tek kişi** seçici (kullanıcı adı, ad ya da kurulum kimliği).
- Kitle sayısı önce panel verisinden anında, sonra Worker'ın `/audience`
  sayımıyla **canlı** gelir.
- Dil başına **iPhone kilit ekranı önizlemesi**, uygulama ikonu ve adıyla.
- **Şablonlar**: `sablon: { db, F }` verilirse Firestore `pushTemplates`
  koleksiyonu (kurallarda yöneticiye okuma/yazma gerekir), yoksa bu tarayıcı.
- **Zamanlama Türkiye saatiyle** (Europe/Istanbul, tarayıcının saat
  diliminden bağımsız), en az birkaç dakika, en fazla 60 gün sonrası.
- **Test cihazlarına** gönder (filtre ne olursa olsun yalnız `tester` kurulumlar).
- **Emoji** çubuğu, dil başına **başlık/metin sayacı** (varsayılan 60/180,
  `sinir: { baslik, metin }` ile Worker'ın sınırına eşitle).
- **Uzun tire (— –) ve Türkçede "â"** varsa düğmeler kapanır.
- Ek diller (İngilizce dışında en fazla 4), **dokununca açılacak sekme**
  (deep link, `sekmeler`), taslak bu tarayıcıda saklanır.
- Her gönderimden önce kendi onay kartımız (window.confirm yok).

```js
pushSayfasi(icerik, {
  worker: "https://leafbook-push.kittapcom.workers.dev",
  token: () => kabuk.token(),
  uygulama: { ad: "Leafbook", ikon: "/leafbook/assets/icon.png", renk: "#2e9e63" },
  diller: ["en", "tr", "de", ...], anaDiller: ["tr", "en"],
  sinir: { baslik: 50, metin: 160 },
  sekmeler: [{ id: "plants", ad: "Bitkiler" }, ...],
  kurulumlar: () => veri.installs,   // yerel kitle tahmini, tek kişi seçici
  kisiAdi: i => i.handle && "@" + i.handle,
  sablon: { db, F },                 // isteğe bağlı
  anahtar: "leafbook",               // taslak/yerel şablon anahtarı
  gonderilenler: "gonderilenler",    // Gönderilenler sayfasının kimliği
});

gonderilenlerSayfasi(icerik, {
  worker, token,
  gecmis: async () => [...],         // pushes, en yeni önce (pid alanıyla)
  gunluk: async ilkGun => [{ day: "2026-10-10", ev: { "push_open_<pid>": 3 } }],
  kurulumlar: () => veri.installs,   // kişi sayısı için (i.ev.push_open_<pid>)
});
```

**Gönderilenler**: zaman, durum, mod, hedef, başlık, giden, **açılma** ve
oran sütunları; zamanlanmışı iptal, yarım kalan Kitle gönderimini sürdürme,
satıra dokununca ayrıntı. Açılma günlük kayıtlardaki `push_open_<pid>`
sayacından: Kitle'de açılma / giden cihaz, Konular'da açılma / tahmini kitle.

### Worker sözleşmesi

Referans: `~/dev/All Sport Apps/push-worker/src/index.mjs` (bam-sports-push)
ve `~/dev/leafbook/push-worker` (aynısı, konu öneki `lb_`). Yeni bir
uygulamanın Worker'ı bu uç noktaları aynı biçimde sunarsa sayfa olduğu gibi
çalışır. Her POST `Authorization: Bearer <ID token>` ister; token yöneticinin
(`email == ADMIN_EMAIL`, `email_verified == true`) olmalı, değilse 403.
CORS: `*`, `POST, GET, OPTIONS`, `Authorization, Content-Type`.

| Uç | Gövde | Yanıt |
|---|---|---|
| `GET /health[?deep=1]` | | `{ ok, ready, version, features[], maxDevices, firestore? }`; `ready` false ise FCM_SA yok |
| `POST /push` Konular | `{ mode:"topics", texts:{ en:{title,body}, tr:{...} }, tab, test?, validate?, sendAt?, estimate?, summary? }` | `{ pid, mode, sent, results:[{app,lang,condition,ok,id,error}], counts:{targeted,sent,failed,removedTokens}, status, stored }` |
| `POST /push` Kitle | `{ mode:"devices", filter:{ langs[], pro:"any"\|"pro"\|"free", activeWithinDays?, inactiveForDays?, signedIn?, installIds?[] }, texts, tab, test?, validate?, sendAt?, summary? }` | `{ pid, mode, status:"sending"\|"sent"\|"failed", counts, byLang, remaining, sent, errors, failures }`; `validate` ise `{ validate:true, results, counts:{targeted}, byLang, tooMany }` |
| `POST /push` zamanlı | `sendAt` (ISO, en az 1 dk, en fazla 60 gün sonra) | `{ pid, status:"scheduled", sendAt, stored:true }` |
| `POST /continue` | `{ pid }` | Kitle gönderiminin sonraki dilimi; `remaining` 0 olana dek; `busy:true` ise biraz bekle |
| `POST /audience` | `{ filter }` | `{ total, withToken, noToken, notifOff, byApp, byLang, maxDevices, cachedAt }` |
| `POST /cancel` | `{ pid }` | `{ pid, status, cancelled }` (yalnız `scheduled` iptal olur) |

Kurallar (Worker da uygular, panel yazarken gösterir): İngilizce metin şart;
İngilizce dışında en fazla 4 dil; başlık ve metin birlikte; uzun tire yok;
uzunluk sınırı grafem sayısıyla. `test` her zaman cihaz cihaz yalnız
`tester == true` kurulumlara gider. Gerçek her gönderim (validate değil)
`pushes/{pid}` belgesini yazar: `mode, texts, tab, test, filter, estimate,
summary, at, by, status, sendAt?, sentAt, sent, counts, results|byLang|errors`.
Ücretsiz planda çağrı başına 50 dış istek sınırı yüzünden Kitle 40'arlı
dilimlerle gider; panel kapanırsa Worker'ın beş dakikalık cron'u sürdürür ve
zamanlanmışları gönderir. Uygulama bildirime dokunulunca telemetriye
`push_open` olayını `pid` ile yazar; günlük kayıtta `ev.push_open_<pid>` artar.
Kurulum alanları: `language, pro, lastSeen, fcm, notif, tester, signedIn`.

## Dünya haritası: `harita.js`

```js
await dunyaHaritasi(kutu, { TR: 96, US: 42, DE: 21 }, { birim: "kurulum", tik: iso2 => ... });
```

ISO-2 ülke kodu alır (sayısal atlas kimliğine kendisi çevirir), logaritmik
beş basamakla `--accent` renginde boyar, üzerine gelince Türkçe ülke adı ve
sayı, altında lejant. Sınırlar `world-atlas@2.0.2` (Natural Earth 1:110m)
dosyasından, `cdn.jsdelivr.net`'ten tam sürümle bir kez indirilir; TopoJSON
çözümü dosyanın içinde. Koyu ve açık temada çalışır.

## Satış sayfası

Mağaza parası App Store Connect ve Play raporlarından gelir; anahtarları
statik sayfada tutamayız. `scripts/lab/panel-yaz.mjs` her sabah özeti her
uygulamanın kendi Firestore'unda `panel/sales` belgesine yazar, panel
yalnızca onu okur.
