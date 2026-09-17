# berkalparslan.github.io

BamTech'in ana sayfası. Uygulamalar, blog, gizlilik ve destek sayfaları — hepsi
tek adreste. Bir de arama motorlarına kapalı `/lab/` var: iç panel ve araçlar.

Düz HTML + CSS. Build adımı yok, bağımlılık yok, `npm install` yok. Dosyayı
değiştir, push et, bir dakika içinde yayında.

---

## Dosya düzeni

```
index.html              Ana sayfa (kendi CSS/JS'ini içinde taşır)
404.html                Bulunamadı sayfası
robots.txt              /lab/ arama motorlarına kapalı
sitemap.xml             node scripts/sitemap.mjs üretir — elle düzenleme
app-ads.txt             AdMob doğrulaması — dokunma

assets/
  site.css              Alt sayfaların ortak stili (gizlilik, destek, web)
  blog.css              Blog listesi ve yazı sayfaları
  brand/                favicon, apple-touch-icon, og:image

<slug>/index.html       Uygulama tanıtım sayfası (walletcoach/ kalıp)
privacy/<slug>/         Gizlilik politikası (istisnalar aşağıda)
privacy/index.html      Politika dizini
support/index.html      Destek

blog/
  index.html            Yazı listesi — posts.json'dan okur
  posts.json            Yazı dizini. Yeni yazı = buraya bir satır
  _template.html        Yeni yazı şablonu
  2026/<slug>/index.html

web/
  index.html            Web araçları listesi
  store-mockup/         Ekran görüntüsü çerçeveleme aracı (tarayıcıda çalışır)

lab/                    noindex — iç araçlar
  index.html            Lab girişi: araçlar + dış panolara kısayol
  panel/                App Store + Play panosu (şifreli veri, sunucusuz)
  oncopace/             Oncopace yönetim paneli (Vite çıktısı, Supabase'e bağlı)
  mihenk/               App Store tahmin aracı
  filiz/                Content seeding prototipi

scripts/
  sitemap.mjs           sitemap.xml üretir
  lab/                  Panel veri boru hattı (aşağıda)
```

### Mağazaya kayıtlı URL'ler — taşıma

Üç gizlilik sayfası dizin kalıbının dışında duruyor ve **App Store Connect'te
o adresle kayıtlı**. Taşınırsa mağaza linki kırılır; oldukları yerde kalıyor:

| Uygulama | Adres |
|---|---|
| Wallet Coach | `/privacy.html` |
| BodyBook | `/bodybook/privacy/` (+ `/bodybook/support/`) |
| Yonca | `/yonca/privacy/` |

Yeni uygulamada `privacy/<slug>/index.html` kalıbını kullan.

---

## Yeni blog yazısı eklemek

1. `blog/_template.html` → `blog/2026/yazi-adresi/index.html`.
2. Başlık, tarih, etiket, metin. `canonical` linkini güncelle.
3. `blog/posts.json`'a bir nesne ekle (`title`, `title_tr`, `url`, `date`,
   `tag`, `tag_tr`, `lang`, `summary`, `summary_tr`).
4. `node scripts/sitemap.mjs`, commit, push.

Liste tarihe göre kendini sıralar. Ana sayfadaki "Notes" en yeni üçü çeker.

## Yeni uygulama eklemek

1. **Ana sayfa kartı:** `index.html` içindeki `#appGrid`'e bir
   `<article class="card">` kopyala. `data-tags` filtre çubuğuyla eşleşir
   (`sport health tools fun lifestyle watch ios android web soon retired`),
   `data-name` aramada ek anahtar kelime. Hero sayaçları etiketlerden hesaplanır.
2. **Tanıtım sayfası:** `walletcoach/index.html` kalıbından `<slug>/index.html`.
3. **Gizlilik:** `privacy/<slug>/index.html`, dizine (`privacy/index.html`) satır.
4. **Panel:** `scripts/lab/apps.mjs` (kimlikler) + `scripts/lab/profil.mjs`
   (model, servisler, kategori). Vault'ta `uygulamalar/<slug>.md`.
5. `<head>`'e favicon + apple-touch-icon üç satırı. `node scripts/sitemap.mjs`.

---

## `/lab/panel/` — nasıl çalışıyor

Sunucu yok, veritabanı yok. Mac yolunda veri iki CLI ile
çekilir, şifrelenir, statik dosya olarak push edilir; çözme tarayıcıda olur.

```
ascelerate (App Store Connect)  ─┐
gplay (Play Console)             ├─ collect.mjs ─► ~/dev/vault/metrikler/veri/  (ham, private)
vault notları (durum, görevler)  ─┘                        │
                                                    build.mjs (+ profil.mjs)
                                                           │
                                         lab/panel/data.enc.json  (AES-256-GCM)
                                                           │
                                         tarayıcı: parola → PBKDF2 → çöz → çiz
```

Her çekimde:

```bash
node scripts/lab/collect.mjs --days 45
node scripts/lab/build.mjs
git add lab/panel/data.enc.json && git commit -m "panel verisi" && git push
```

Parola macOS Keychain'de (`bamtech-lab-panel`). Ayrıntı: `scripts/lab/README.md`.

### Mac'siz çekim — GitHub Actions ya da Cloudflare Worker

`scripts/lab/uzak/` aynı işi doğrudan API'lerle yapar (App Store Connect,
Android Publisher + Cloud Storage, GA4, GitHub). Durum deposu yok: geçmiş
günler sitedeki şifreli dosyanın içinde; çalıştırıcı onu çözer, son günleri
ekler, yeniden şifreler, commit eder.

```
scripts/lab/
  satis.mjs · vaultmetin.mjs · ozet.mjs · kripto.mjs   saf çekirdek (üç yerde ortak)
  collect.mjs · build.mjs                              Mac yolu (ascelerate/gplay + vault diski)
  uzak/calistir.mjs                                    API yolu (Actions / Worker / yerel deneme)
  uzak/asc.mjs · google.mjs · github.mjs · jwt.mjs     istemciler (fetch + WebCrypto)
worker/                                                Cloudflare Worker girişi (wrangler)
.github/workflows/panel.yml                            GitHub Actions girişi (09:30, elle de)
```

**GitHub Actions (ücretsiz, önerilen).** Repo → Settings → Secrets and
variables → Actions → şu secret'lar:

| Secret | Değer |
|---|---|
| `ASC_KEY_ID` | `~/.ascelerate/config.json` → keyId |
| `ASC_ISSUER_ID` | → issuerId |
| `ASC_VENDOR` | → vendorNumber |
| `ASC_PRIVATE_KEY` | `.p8` dosyasının tamamı (BEGIN/END satırları dahil) |
| `GPLAY_SA_JSON` | `~/.gplay/bosyeryok-sa.json` içeriği |
| `GPLAY_BUCKET` | `gs://pubsite_prod_…` |
| `VAULT_TOKEN` | Fine-grained PAT: `bamtech-vault` **Contents: Read** |
| `LAB_PASSPHRASE` | panel parolası (Keychain'deki) |
| `ACTIONS_TOKEN` | Fine-grained PAT: site deposu **Actions: Read and write** — panelin "Yenile" düğmesi için (isteğe bağlı) |

Secret'lar girilince workflow her sabah çalışır; Actions sekmesinden elle de
tetiklenir. Panelde **Yenile** düğmesi (sol alt) aynı tetiği atar; 3–5 dakika
sonra veri gelir. `ACTIONS_TOKEN`'ı Mac tarafı için de
`~/dev/vault/metrikler/veri/gizli.json` içine `{"actionsToken":"…"}` diye koy.

**Cloudflare Worker.** `worker/wrangler.toml` başındaki adımlar. Uyarı:
PBKDF2 (250 bin tur) ücretsiz planın 10 ms CPU sınırını aşar; **Workers Paid
(5 $/ay)** gerekir. Kod aynı, yalnız giriş farklı.

**Yerel deneme** (kimlikleri Mac'ten alır, yayınlamaz):
`node scripts/lab/uzak/calistir.mjs --yerel --yaz`

**Vault bağımlılığı:** uzak çekim vault'u GitHub'daki `bamtech-vault`
deposundan okur. Notlar push edilmedikçe panel eski görevleri gösterir —
vault'u sık push et.

**Otomatik çekim, Mac'te** (her gün 09:30, Mac açıkken): `scripts/lab/gunluk.sh`
aynı üç adımı yapar, veri değişmediyse commit atmaz. launchd ile kurmak:

```bash
cp scripts/lab/com.bamtech.lab-panel.plist ~/Library/LaunchAgents/ && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.bamtech.lab-panel.plist
```

Hemen denemek `launchctl kickstart -k gui/$(id -u)/com.bamtech.lab-panel`,
log `~/dev/vault/metrikler/veri/gunluk.log`. İlk çalışmada Keychain parola
erişimi için macOS bir kez sorabilir ("Always Allow" de).

Sekmeler: **Özet** (indirme, gelir, gider, net, bu hafta yapılacaklar, tarihli
işler) · **Uygulamalar** (portföy tablosu, katman, ₺/indirme, servisler) ·
**Pazarlama** (odak/büyüt/bakım/bekle kartları, sonraki adım, kanal, reklam
kuralları) · **Takip** (hangi uygulama hangi servise bağlı, nereye ne sıklıkla
bakılır, ölçüm boşlukları) · **Yorumlar** · **Görevler** (vault) · **Veri**.

Katman ve adımlar `lab/panel/index.html` içindeki `degerlendir()` kurallarından
çıkıyor; rakam değişince kendiliğinden değişir. Sabit metinler (model, servis,
not) `scripts/lab/profil.mjs`'te.

Eski Supabase + GitHub Actions boru hattı (Ağustos 2026) kaldırıldı; hiç
kurulmamıştı ve panel onu gereksiz bıraktı.

---

## GitHub Pages hakkında

Public repoda ücretsiz. Yumuşak limitler: site 1 GB, bant genişliği 100 GB/ay,
saatte 10 build. Aşılırsa fatura değil uyarı maili gelir. Tek kısıt: "birincil
olarak ticari işlem yapan" site olamaz; uygulama tanıtımı, blog, gizlilik
sayfaları serbest. Sunucu kodu çalışmaz — `/lab/` bu yüzden şifreli statik.

### Kendi alan adı

Anonimlikteki üç sızıntıyı (alan adı, e-posta, GitHub kullanıcı adı) kapatmanın
tek yolu. Kısa, marka adıyla aynı bir şey: `bamtech.app` / `bamtech.dev` /
`bamtech.studio` — hangisi boşsa. `.app` ve `.dev` HTTPS zorunlu, GitHub Pages
zaten sağlıyor.

Bağlamak:

1. Kayıt sağlayıcıda DNS: `A` kayıtları `185.199.108.153`, `.109.153`,
   `.110.153`, `.111.153`; `www` için `CNAME` → `berkalparslan.github.io`.
2. Repo köküne yalnız alan adını içeren `CNAME` dosyası (`bamtech.app`).
3. Repo → Settings → Pages → Custom domain, "Enforce HTTPS" işaretle.
4. Sertifika 10–60 dk içinde gelir.

Eski `berkalparslan.github.io` linkleri **otomatik 301 ile yeni alana yönlenir** —
App Store'daki gizlilik/destek URL'leri kırılmaz, ama boş vakitte App Store
Connect'te yenileriyle değiştir. `canonical` ve `og:url` etiketlerini de
`grep -rl "berkalparslan.github.io"` ile bul, değiştir; `scripts/sitemap.mjs`
içindeki `SITE` sabitini güncelle.

Alan adıyla birlikte marka e-postası (Cloudflare Email Routing ücretsiz:
`hello@bamtech.app` → Gmail) sitedeki `mailto:` linklerini de anonimleştirir.
