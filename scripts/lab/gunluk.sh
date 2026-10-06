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
node scripts/lab/build.mjs
node scripts/lab/walletcoach.mjs --days 90 || echo "wallet-coach çekimi başarısız"
# Bam Sports (beş spor uygulaması): GA4 özeti → bam-tech-sports Firestore panel/ga4.
node scripts/lab/bam-sports.mjs --days 90 || echo "bam-sports çekimi başarısız"
# Nika: Cloudflare GraphQL (Workers/D1/R2 kullanımı) → Nika D1, panelin Altyapı sayfası.
node scripts/lab/nika.mjs --days 30 || echo "nika altyapı çekimi başarısız"
# Wallet Coach kur ve enflasyon: yeni ay varsa ve makulse yayınlar.
"$HOME/dev/wallet-coach/tools/rates_auto.sh" || echo "wallet-coach kur verisi bakılmalı"

git pull -q --rebase --autostash origin main || echo "git pull başarısız, yine de deneniyor"
git add lab/panel/data.enc.json
if git diff --cached --quiet; then
  echo "değişiklik yok"
else
  git commit -q -m "panel: $(date +%Y-%m-%d) verisi" -- lab/panel/data.enc.json
  # Başka oturum araya push ettiyse bir kez yeniden tabana al ve dene.
  git push -q || { git pull -q --rebase --autostash origin main && git push -q; }
  echo "yayınlandı"
fi
echo "── $(date "+%Y-%m-%d %H:%M") bitti"
}

calis 2>&1 | tee -a "$LOG"
