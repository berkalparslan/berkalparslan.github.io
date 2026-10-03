# /lab/panel/ — günlük mağaza verisi

App Store Connect, Google Play, Firebase Analytics, uygulama panellerinin
Firestore telemetrisi ve site trafiğini (Cloudflare Web Analytics) tek panelde
toplar. Sunucu yok, GitHub Actions yok; her sabah 07:00 Mac'te `gunluk.sh`.
Kimlikler Mac'teki yerlerinde duruyor, **bu depoda hiçbir anahtar yok**:

| Kaynak | Kimlik |
|---|---|
| App Store (satış, yorum, sürüm) | `~/.ascelerate/config.aberk.json` (Berk) ve `config.page.json` (Elif: Daily Whisper, Nubi), API doğrudan. Etkin `config.json`'a bakılmaz: başka oturumlar onu hesaptan hesaba çeviriyor, 24 Eyl 2026'da iOS bu yüzden iki hafta boş geldi. Elif hesabında `vendorNumber` yok, satış raporu o yüzden gelmiyor. |
| Play (sürüm, toplu raporlar) | `gplay` servis hesabı (`~/.gplay/config.json`) |
| GA4 | aynı servis hesabı (Viewer), mülkler `ga4.mjs` PROPERTIES |
| Firestore telemetrisi | Firebase CLI oturumu, projeler `telemetri.mjs` PROJELER |
| Cloudflare Web Analytics | wrangler OAuth oturumu (eskiyse `wrangler whoami` yeniler) |

Hata yüzünden boş kaydedilen gün (`ios-*.json` içinde `sebep` "apple-rapor-yok"
değilse) her çalıştırmada yeniden denenir. Bir kaynak günlerdir gelmiyorsa
`build.mjs` ve panelin Veri sekmesi "UYARI" yazar.

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
| `telemetri.mjs` | Uygulama panellerinin `installs/` belgeleri → aktif, yeni, ülke, canlı |
| `web.mjs` | Cloudflare RUM → günlük ziyaret, ülke, sayfa, yönlendiren |

## Panelde ne var

**Kitle** sekmesi (Ekim 2026): bütün uygulamaların toplamı (aktif kullanıcı,
Play kurulu cihaz, indirme, gelir), bayraklı ülke dağılımı ve ısı listesi
(indirme, GA4 aktif, Play cihaz, telemetri, site), uygulama kırılımı, trendler.
Aralık penceresi son verili güne demirli (Apple 1-2 gün, Play ~7-10 gün geriden).

Diğer sekmeler: **Özet** (kartlar, günlük grafik, uygulama tablosu, ülkeler),
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
| Gelir | Cloud Storage: `sales/salesreport_<YYYYMM>.zip` (günlük sipariş; Item Price × 0,85, iade eksi) |
| Ülke, aktif cihaz | `stats/installs/..._country.csv` |
| Çökme, ANR | `stats/crashes/..._overview.csv` |
| Mağaza puanı | `stats/ratings/..._overview.csv` (Total Average Rating) |
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
