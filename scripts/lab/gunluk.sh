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

node scripts/lab/collect.mjs --days 45
node scripts/lab/build.mjs

git add lab/panel/data.enc.json
if git diff --cached --quiet; then
  echo "değişiklik yok"
else
  git commit -q -m "panel: $(date +%Y-%m-%d) verisi"
  git push -q
  echo "yayınlandı"
fi
