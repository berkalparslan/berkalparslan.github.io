# /lab/panel/ — günlük mağaza verisi

App Store Connect ve Google Play verisini tek panelde toplar. Sunucu yok,
Supabase yok, GitHub Actions yok: bütün istekleri `ascelerate` ve `gplay`
CLI'larına devrediyor, onlar kendi kimlik bilgilerini kullanıyor. **Bu depoda
hiçbir anahtar durmuyor.**

## Parola

Mac'in **login keychain**'inde duruyor, servis adı `bamtech-lab-panel`.
Bu iPhone ile paylaşılmıyor — `security` yerel keychain'i okuyor, iCloud
Keychain ayrı bir depo. Telefonda ilk girişte parolayı elle yaz; Safari
kaydetmeyi teklif eder, sonrası otomatik doldurur.

Terminalde okumak için:

```
security find-generic-password -s bamtech-lab-panel -w
```

Değiştirmek için:

```
security add-generic-password -U -a "$USER" -s bamtech-lab-panel -w
```

(parolayı sorar; `-w`'den sonra bir şey yazma ki kabuk geçmişine düşmesin).
Parola değişince `node scripts/lab/build.mjs` ile dosya yeniden üretilmeli —
eski dosya eski parolayla açılıyor.

Keychain boşsa `build.mjs` ilk çalıştırmada sorup kendisi kaydediyor.

## Her çekimde

```
node scripts/lab/collect.mjs --days 45
node scripts/lab/build.mjs
git add lab/panel/data.enc.json && git commit -m "panel verisi" && git push
```

`collect.mjs` diskte olan günü tekrar çekmiyor; son 3 gün Apple gecikmeli
yayınladığı için yeniden deneniyor. `--force` hepsini baştan çeker.

## Neden şifreli

`berkalparslan.github.io` public bir depo ve `/lab/` `noindex` olsa da açık bir
URL'de duruyor. İndirme ve gelir rakamları düz JSON olarak dursa herkes okur.
`data.enc.json` **AES-256-GCM** ile şifreli; anahtar paroladan PBKDF2-SHA256
(250.000 tur) ile türetiliyor ve çözme tamamen tarayıcıda oluyor. Parola
sunucuya gitmiyor, sayfada rakam yok.

Bu şifreleme parolanın gücü kadar güçlü. Kısa bir parola çevrimdışı denemeye
açık — en az 5 kelimelik bir parola seç.

## Dosyalar

| Dosya | İş |
|---|---|
| `apps.mjs` | iOS bundle ↔ Android paket ↔ slug eşlemesi. Yeni uygulama buraya eklenir. |
| `collect.mjs` | ascelerate + gplay çağırır, ham JSON'ları vault'a yazar |
| `gcs.mjs` | Cloud Storage'daki toplu raporları okur (yorum geçmişi, indirme) |
| `csv.mjs` | Play'in UTF-16LE, tırnaklı CSV'lerini ayrıştırır |

## Panelde ne var

Dört sekme: **Özet** (kartlar, günlük grafik, uygulama tablosu, ülkeler),
**Yorumlar** (tam metin + senin cevabın, cevapsız ve 3★ altı süzgeçleri),
**Görevler** (vault notlarındaki `- [ ]` satırları), **Veri** (her kaynağın
durumu ve son tarihi).

Sol menüde üç filtre: aralık (7/30/90/tümü), platform (hepsi/iOS/Play),
uygulama. Seçimler `localStorage`'da. Tema açık/koyu — varsayılan sistem
tercihi, alttaki "tema" düğmesi kalıcı olarak değiştirir.

### Gelir neden "≈ ... ₺"

Apple sekiz para biriminde ödüyor. Kurlar `open.er-api.com`'dan günlük
çekiliyor (anahtar gerekmiyor) ve hepsi TL'ye çevrilip tek sayı gösteriliyor.
Rakam **yaklaşık** — kur günlük, Apple'ın gerçek ödeme kuru değil. Kur
çekilemezse panel toplam üretmiyor, para birimlerini ayrı gösteriyor.

### Görev işaretleri

Görevler vault'tan geliyor, kaynak orası. Paneldeki kutucuk yalnız o
tarayıcıda duruyor — "şimdilik kenara çek" içindir, **vault'a yazmaz**.
Kalıcı olması gereken değişikliği vault notuna işle. Görev metni değişirse
işaret düşer; bu bilinçli, değişen görev yeniden görünsün.
| `build.mjs` | Ham dosyaları özetler, şifreler, `lab/panel/data.enc.json` üretir |

Ham veri **vault'ta** (private depo) duruyor:
`~/dev/vault/metrikler/veri/`. Bu depoya hiç girmiyor.

## Android indirme, gelir ve yorum geçmişi

Play Developer API bunları vermiyor:

| Veri | Nerede |
|---|---|
| İndirme, kaldırma, ülke, cihaz | Cloud Storage: `stats/installs/installs_<paket>_<YYYYMM>_overview.csv` |
| Gelir | Cloud Storage: `earnings/`, `sales/` (zip) |
| **Tüm yorum geçmişi** | Cloud Storage: `reviews/reviews_<paket>_<YYYYMM>.csv` |
| Son 7 günün yorumları | `gplay reviews list` — API daha eskisini hiç vermiyor |

Kova **hesap genelinde ortak**, uygulama başına ayrı kova yok; dosya adı
ayırıyor. Kimlik `~/dev/vault/metrikler/veri/gplay.json` içinde (private depo —
kova adındaki sayı geliştirici hesabı kimliği). `GPLAY_BUCKET_ID` onu ezer.

### Gerekli yetki

Kovaya erişmek **uygulama bazında** yetki ile olmuyor, servis hesabının
**hesap geneli** yetkisi olmak zorunda:

- *Uygulama bilgilerini görüntüle ve toplu raporları indir* (`CAN_SEE_ALL_APPS`)
- *Finansal verileri görüntüle* (`CAN_VIEW_FINANCIAL_DATA_GLOBAL`)

Play Console → **Kullanıcılar ve izinler** → servis hesabı → *Hesap izinleri*.
API'den açılamıyor: servis hesabı kendi yetkisini yükseltemiyor (403).

Yetki yokken `collect.mjs` tek istekte anlayıp çıkıyor ve panel bunu "Eksikler"
bölümünde yazıyor — sıfır göstermiyor.
