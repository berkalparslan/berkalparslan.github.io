#!/bin/sh
# Günlük çekim: ascelerate + gplay → şifreli panel → yayın.
#
#   sh scripts/lab/gunluk.sh
#
# Parola Keychain'den okunuyor (bkz. scripts/lab/README.md). Veri değişmediyse
# commit atılmıyor — data.enc.json her çalıştırmada yeni salt/iv ile
# üretildiği için dosya hep farklı görünür, o yüzden özet karşılaştırılıyor.
set -e
cd "$(dirname "$0")/../.."
echo "── $(date "+%Y-%m-%d %H:%M") çekim başladı"

node scripts/lab/collect.mjs --days 45
node scripts/lab/build.mjs
node scripts/lab/walletcoach.mjs --days 90 || echo "wallet-coach çekimi başarısız"
# Wallet Coach kur ve enflasyon: yeni ay varsa ve makulse yayınlar.
"$HOME/dev/wallet-coach/tools/rates_auto.sh" || echo "wallet-coach kur verisi bakılmalı"

git pull -q --rebase --autostash origin main || true
git add lab/panel/data.enc.json
if git diff --cached --quiet; then
  echo "değişiklik yok"
else
  git commit -q -m "panel: $(date +%Y-%m-%d) verisi"
  git push -q
  echo "yayınlandı"
fi
