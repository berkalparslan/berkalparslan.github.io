#!/bin/sh
# Günlük çekim: App Store + Play + GA4 + Firestore telemetrisi + Cloudflare
# → şifreli panel → yayın. Her sabah 07:00 Claude zamanlanmış görevi
# (gunaydin-merhaba) çalıştırır; elle de çalışır:
#
#   sh scripts/lab/gunluk.sh
#
# Parola Keychain'den okunuyor (bkz. scripts/lab/README.md). data.enc.json her
# üretimde yeni salt/iv aldığı için her gün commit atılır; yalnız o dosya
# eklenir, başka oturumların değişikliklerine dokunulmaz.
#
# Çıktı ayrıca vault/metrikler/veri/gunluk.log dosyasına eklenir. Veri bir
# kaynaktan günlerdir gelmiyorsa build.mjs "UYARI" satırı basar.
set -e
cd "$(dirname "$0")/../.."
LOG="$HOME/dev/vault/metrikler/veri/gunluk.log"
mkdir -p "$(dirname "$LOG")"

calis() {
set -e
echo "── $(date "+%Y-%m-%d %H:%M") çekim başladı"

node scripts/lab/collect.mjs --days 45
# Sürüm notları (App Store + Play "Yenilikler") → lab/assets/surumler.json, panellerin Sürümler bölümü.
node scripts/lab/surumler.mjs || echo "sürüm notları çekilemedi"
# Günlük rapor (son verili gün + genel tablo) → vault/metrikler/veri/raporlar/.
# build'den ÖNCE: build son 60 raporu şifreli pakete koyuyor (panel + iOS Panel).
node scripts/lab/rapor.mjs || echo "rapor üretilemedi"
node scripts/lab/build.mjs
# Magaza parasini her uygulamanin kendi projesine yazar; uygulama
# panellerinin Satis sayfasi bunu okuyor.
node scripts/lab/panel-yaz.mjs || echo "panel satis yazimi başarısız"
node scripts/lab/walletcoach.mjs --days 90 || echo "wallet-coach çekimi başarısız"
# Daily Whisper: AI proxy sayaçları + Gemini (Cloud Monitoring) + GA4 → kit-app-a91b5 panel/ai, panel/ga4.
node scripts/lab/daily-whisper.mjs --days 90 || echo "daily-whisper çekimi başarısız"
# O mu Bu mu: GA4 + mağaza özeti → thisone-ba533 panel/ga4, panel/sales.
node scripts/lab/o-mu-bu-mu.mjs --days 90 || echo "o-mu-bu-mu çekimi başarısız"
# Bam Sports (beş spor uygulaması): GA4 özeti → bam-tech-sports Firestore panel/ga4.
node scripts/lab/bam-sports.mjs --days 90 || echo "bam-sports çekimi başarısız"
# Nika: Cloudflare GraphQL (Workers/D1/R2 kullanımı) → Nika D1, panelin Altyapı sayfası.
node scripts/lab/nika.mjs --days 30 || echo "nika altyapı çekimi başarısız"
# Wallet Coach kur ve enflasyon: yeni ay varsa ve makulse yayınlar.
"$HOME/dev/wallet-coach/tools/rates_auto.sh" || echo "wallet-coach kur verisi bakılmalı"

git pull -q --rebase --autostash origin main || echo "git pull başarısız, yine de deneniyor"
git add lab/panel/data.enc.json lab/assets/surumler.json
if git diff --cached --quiet; then
  echo "değişiklik yok"
else
  git commit -q -m "panel: $(date +%Y-%m-%d) verisi" -- lab/panel/data.enc.json lab/assets/surumler.json
  # Başka oturum araya push ettiyse bir kez yeniden tabana al ve dene.
  git push -q || { git pull -q --rebase --autostash origin main && git push -q; }
  echo "yayınlandı"
fi
# Telefona sabah bildirimi (APNs, Panel uygulaması). Paket push edildikten
# sonra: bildirime dokununca uygulama yeni paketi indirip raporu açıyor.
node scripts/lab/rapor-gonder.mjs || echo "rapor bildirimi gönderilemedi"
echo "── $(date "+%Y-%m-%d %H:%M") bitti"
}

calis 2>&1 | tee -a "$LOG"
