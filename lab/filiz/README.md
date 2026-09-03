# Filiz

Content seeding operasyonu için üç rollü panel prototipi.

**Canlı:** [/lab/filiz/](https://berkalparslan.github.io/lab/filiz/)

## Ne işe yarıyor

Seçilmiş içerik üreticileri bir marka için sıfırdan sosyal medya hesabı açar ve
her gün video atar. Aynı video TikTok, Instagram Reels ve YouTube Shorts'a
birden gider. Marka o videoları sonradan kendi reklamında da kullanabilir.

Filiz bu operasyonun arayüzü. Tek veritabanı, üç görünüm:

| Rol | Ne yapar | Cihaz |
|---|---|---|
| **Üretici** | Günlük görevi görür, videoyu ve üç yayın linkini gönderir, hakedişini takip eder | mobil |
| **Marka** | Kampanya özetini izler, içerik kütüphanesinden video indirir, üreticilerini görür | masaüstü |
| **Ajans** | Günlük gönderi takibi, uyarılar, hakediş tablosu, kampanya marjı | masaüstü |

## Durum

Tıklanabilir tasarım prototipi — canlı sistem değil. Backend yok, veri statik.
Sayfadaki tüm isimler, kampanya ve rakamlar kurgudur.

Amacı iki tane: sunumda gösterilecek bir ekran vermek, ve v1 kapsamını
dondurmak. Prototipte olmayan her şey v2'dir.

## Teknik notlar

Tek dosya, bağımlılık yok. Google Fonts dışında dış kaynak yüklemiyor.

**Tema.** Lab'in geri kalanı her zaman koyu; Filiz projeksiyona vurulduğu için
varsayılanı açık. Sağ üstteki düğme değiştirir, tercih `localStorage`'da
`filiz-theme` anahtarında saklanır. Site genelindeki `bb-theme` anahtarına
dokunulmaz. JavaScript kapalıysa sistem tercihi geçerli olur.

**Gerçek sistem yazılırsa** veri katmanı şöyle kurulur:

| Platform | Kaynak | Maliyet |
|---|---|---|
| YouTube Shorts | Resmî Data API v3, `videos.batchGetStats` | ücretsiz, 10k birim/gün |
| Instagram Reels | Resmî Graph API — üretici hesabını OAuth ile bağlar | ücretsiz |
| TikTok | Resmî API üçüncü taraf izlenmesi vermiyor → Apify / EnsembleData | kullanıma göre |

Üreticiler sözleşmeli olduğu için "hesabını panele bağlarsın" maddesi
konabiliyor; bu, iki platformun verisini ücretli kazımadan resmî ve ücretsiz
API'ye taşıyor. Genel amaçlı takip araçlarının yapamadığı şey bu.

## Erişim

`noindex, nofollow` — arama motorlarına kapalı, ama URL public.
Hassas bir şey konulmamalı.
