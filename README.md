# berkalparslan.github.io

BamTech'in ana sayfası. Uygulamalar, blog, gizlilik ve
destek sayfaları — hepsi tek adreste.

Düz HTML + CSS. Build adımı yok, bağımlılık yok, `npm install` yok. Dosyayı
değiştir, push et, bir dakika içinde yayında.

---

## Dosya düzeni

```
index.html              Ana sayfa (kendi CSS/JS'ini içinde taşır)
404.html                Bulunamadı sayfası
robots.txt              /lab/ arama motorlarına kapalı
sitemap.xml             Yeni sayfa eklersen buraya da satır ekle
app-ads.txt             AdMob doğrulaması — dokunma

assets/
  site.css              Alt sayfaların ortak stili (gizlilik, destek, bodybook)
  blog.css              Blog listesi ve yazı sayfalarının stili

blog/
  index.html            Yazı listesi — posts.json'dan okur
  posts.json            Yazı dizini. Yeni yazı = buraya bir satır
  _template.html        Yeni yazı şablonu (kopyala, doldur)
  2026/<slug>/index.html

lab/
  index.html            Gizli panel — Supabase auth + uygulama metrikleri
  config.example.js     Kopyala → config.js, doldur

scripts/
  fetch-metrics.mjs     App Store Connect → Supabase toplayıcı

.github/workflows/
  metrics.yml           Toplayıcıyı her gün çalıştıran cron
```

---

## Yeni blog yazısı eklemek

1. `blog/_template.html` dosyasını `blog/2026/yazi-adresi/index.html` olarak kopyala.
2. Başlık, tarih, etiket ve metni doldur. `canonical` linkini de güncelle.
3. `blog/posts.json`'a bir nesne ekle:

```json
{
  "title": "Yazının başlığı",
  "url": "/blog/2026/yazi-adresi/",
  "date": "2026-09-14",
  "tag": "ios",
  "summary": "Listede görünecek bir iki cümle."
}
```

4. `sitemap.xml`'e de bir `<url>` bloğu ekle.
5. Commit + push.

Liste tarihe göre kendini sıralar, JSON'daki sıra önemli değil. Ana sayfadaki
"Notes" bölümü en yeni üç yazıyı otomatik çeker.

## Yeni uygulama eklemek

`index.html` içindeki `#appGrid` bölümüne bir `<article class="card">` kopyala.
Önemli olan iki attribute:

- `data-tags` — filtre çubuğuyla eşleşir: `sport health tools fun watch ios android soon`
- `data-name` — aramada eşleşsin diye ek anahtar kelimeler (Türkçe adlar dahil)

Hero'daki sayaçlar (`Live apps`, `Watch apps`, `In the oven`) bu etiketlerden
kendiliğinden hesaplanıyor, elle güncellemene gerek yok.

Uygulama ikonu için App Store'daki `mzstatic` URL'ini kullanabilirsin;
henüz yayında değilse `<div class="app-icon-ph">🩺</div>` gibi bir emoji koy.

---

## GitHub Pages hakkında bilinmesi gerekenler

Public repo'da tamamen ücretsiz. Yumuşak limitler:

| | |
|---|---|
| Yayınlanan site | 1 GB |
| Bant genişliği | 100 GB / ay |
| Build | saatte 10 |

Bu limitler aşıldığında fatura gelmez, GitHub uyarı maili atar. Şu anki site
birkaç MB, yani sınırlardan çok uzak.

Tek gerçek kısıt kullanım şartlarında: GitHub Pages "birincil olarak ticari
işlem yapan" bir site için (e-ticaret, ödeme alma) kullanılamaz. Uygulama
tanıtımı, blog, portfolyo, gizlilik/destek sayfaları tamamen serbest.

**Sunucu kodu çalıştırılamaz.** PHP yok, veritabanı yok, gizli anahtar
saklanamaz. Bu yüzden `/lab/` aşağıdaki mimariyi kullanıyor.

### Kendi alan adını bağlamak (isteğe bağlı)

Bir gün `berkalparslan.com` alırsan: repo köküne içinde sadece alan adı yazan
bir `CNAME` dosyası koy, DNS'te `A` kayıtlarını GitHub'ın IP'lerine yönlendir.
Eski `github.io` linkleri otomatik yönlenmeye devam eder — App Store'daki
gizlilik/destek URL'leri kırılmaz.

---

## `/lab/` — gizli panel kurulumu

### Neden böyle?

GitHub Pages statiktir. Sayfaya JavaScript ile şifre koymak güvenlik değildir;
kaynak koda bakan herkes şifreyi görür. Gerçek koruma veritabanı tarafında
olmak zorunda:

```
GitHub Actions (günlük cron)
  └─ App Store Connect API              [.p8 anahtarı = Actions secret]
      └─ Supabase / Postgres            [service_role anahtarı = Actions secret]
           ▲
           │  RLS: sadece giriş yapmış kullanıcı okuyabilir
           │
      /lab/ (GitHub Pages, public sayfa)
           └─ Supabase Auth ile e-posta + şifre
```

`/lab/index.html` herkese açık ama içi boş bir kabuk. Veri ancak Supabase'e
giriş yapılınca geliyor; RLS politikası giriş yapmamış isteklere boş küme
döndürüyor. Sayfadaki `anon` anahtar zaten tarayıcıya verilmek üzere
tasarlanmış — tek başına hiçbir şeye erişim vermiyor.

### 1. Supabase projesi

[supabase.com](https://supabase.com) → yeni proje (ücretsiz plan yeterli).
SQL Editor'de şunu çalıştır:

```sql
create table app_metrics (
  date      date        not null,
  app_id    text        not null,
  app_name  text,
  platform  text        not null default 'ios',
  country   text        not null default 'ZZ',
  units     integer     not null default 0,
  proceeds  numeric(12,2) not null default 0,
  primary key (date, app_id, platform, country)
);

create index app_metrics_date_idx on app_metrics (date desc);

alter table app_metrics enable row level security;

-- Sadece giriş yapmış kullanıcı okuyabilir. Yazma yetkisi hiç kimsede yok;
-- toplayıcı RLS'i bypass eden service_role anahtarıyla yazıyor.
create policy "signed-in read"
  on app_metrics for select
  to authenticated
  using (true);
```

### 2. Kendi kullanıcını oluştur

Supabase → **Authentication → Users → Add user**. E-posta + güçlü bir şifre.
Bu tek kullanıcı senin. **Authentication → Providers → Email** altında
"Enable email signups" seçeneğini **kapat** — böylece kimse kendine hesap
açamaz.

### 3. `lab/config.js`

```bash
cp lab/config.example.js lab/config.js
```

İçini doldur (Supabase → Project Settings → API):

- `supabaseUrl` — Project URL
- `supabaseAnonKey` — `anon` / `public` anahtar

Bu dosya repoya commit edilir, gizli değildir.
**`service_role` anahtarını buraya asla koyma** — o anahtar RLS'i tamamen
bypass eder.

### 4. App Store Connect API anahtarı

App Store Connect → **Users and Access → Integrations → App Store Connect API**
→ yeni anahtar, erişim seviyesi **Sales and Reports** (Admin gerekmiyor).
`.p8` dosyası bir kez indirilir, kaybedersen yenisini üretmen gerekir.

Vendor numarası: **Payments and Financial Reports** sayfasının üst kısmında,
8 haneli.

### 5. GitHub Actions secret'ları

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Değer |
|---|---|
| `ASC_KEY_ID` | Anahtar ID (10 karakter) |
| `ASC_ISSUER_ID` | Issuer ID (UUID) |
| `ASC_PRIVATE_KEY` | `.p8` dosyasının tüm içeriği, `-----BEGIN...` satırı dahil |
| `ASC_VENDOR_NUMBER` | Vendor numarası |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `service_role` anahtarı |

### 6. Test

Actions sekmesi → **Collect app metrics** → **Run workflow**. Log'da günlük
indirme sayılarını görmelisin. Sonra `berkalparslan.github.io/lab/` adresine
gidip giriş yap.

Oturum tarayıcıda saklanıyor, yani telefonda bir kez girdikten sonra ana
ekrana kısayol ekleyip doğrudan açabilirsin.

### Notlar

- Apple raporları ~1 gün gecikmeli. O gün hiç satış yoksa API 404 döner;
  script bunu hata saymaz.
- `DAYS_BACK` (varsayılan 5) sayesinde her çalışmada son 5 gün yeniden
  yazılır — Apple sonradan düzeltme yaparsa panel de düzelir.
- Google Play tarafı henüz yok. Play, raporları bir Cloud Storage bucket'ına
  CSV olarak bırakıyor; servis hesabı anahtarıyla aynı script'e eklenebilir.

### `/lab/` linkini gizlemek

Sayfa hiçbir menüde linkli değil ve `robots.txt` ile taramaya kapalı. Ana
sayfada sadece komut paletinden (⌘K → "lab") erişilebiliyor. İstersen
`index.html` içindeki `commands` dizisinden o satırı silebilirsin — sayfa yine
doğrudan URL ile açılır.

Bunların hiçbiri güvenlik önlemi değil, sadece göze batmasın diye.
Güvenlik tamamen Supabase'in RLS politikasında.

---

## Yerelde çalıştırmak

```bash
python3 -m http.server 8000
```

Sonra `http://localhost:8000` — kök yollar (`/assets/...`) doğru çözülsün diye
dosyayı doğrudan açmak yerine sunucu kullan.
