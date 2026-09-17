/* Apple Sales & Trends günlük raporu (TSV) → uygulama başına özet.
   Saf: dosya/ağ yok. collect.mjs (ascelerate --raw çıktısı) ve uzak/asc.mjs
   (App Store Connect API'den gzip çözülmüş rapor) aynı fonksiyonu kullanır.

   Ürün tipi ayrımı kritik: "1" ile başlayanlar yeni indirme, "3"/"7"
   güncelleme; IA… ve FI… uygulama içi satın alma ve abonelik. IAP satırında SKU
   ürünün kendisi, uygulama "Parent Identifier" sütununda. */

import { SKU_SLUG } from "./apps.mjs";

export function indirmeMi(tip) { return /^1/.test(tip) || /^F1/.test(tip); }
export function guncellemeMi(tip) { return /^3/.test(tip) || /^7/.test(tip); }
export function iapMi(tip) { return /^(IA|FI)/.test(tip); }

/** @returns {{tarih, veri:boolean, sebep?:string, apps:Object}} */
export function satisAyristir(metin, tarih) {
  const satirlar = metin.split("\n").filter(s => s.includes("\t"));
  const bas = satirlar.findIndex(s => s.startsWith("Provider\t"));
  if (bas < 0) return { tarih, veri: false, sebep: "baslik-yok", apps: {} };

  const kolon = satirlar[bas].split("\t").map(s => s.trim());
  const ix = ad => kolon.indexOf(ad);
  const [iSku, iTip, iAdet, iGelir, iUlke, iPara, iCihaz, iEbeveyn] =
    ["SKU", "Product Type Identifier", "Units", "Developer Proceeds",
     "Country Code", "Currency of Proceeds", "Device", "Parent Identifier"].map(ix);

  const apps = {};
  for (const satir of satirlar.slice(bas + 1)) {
    const h = satir.split("\t");
    const sku = (h[iSku] || "").trim();
    const tip = (h[iTip] || "").trim();
    const ebeveyn = iEbeveyn >= 0 ? (h[iEbeveyn] || "").trim() : "";
    const slug = SKU_SLUG.get(sku) || (iapMi(tip) && ebeveyn ? SKU_SLUG.get(ebeveyn) : null);
    if (!slug) continue;

    const adet  = Number(h[iAdet]) || 0;
    const ulke  = (h[iUlke] || "").trim() || "??";
    const para  = (h[iPara] || "").trim();
    const gelir = Number(h[iGelir]) || 0;

    const a = apps[slug] ||= { indirme: 0, guncelleme: 0, gelir: {}, ulkeler: {}, cihazlar: {}, iap: 0 };
    if (iapMi(tip)) {
      a.iap += adet;
    } else if (indirmeMi(tip)) {
      a.indirme += adet;
      a.ulkeler[ulke] = (a.ulkeler[ulke] || 0) + adet;
      const c = (h[iCihaz] || "").trim() || "?";
      a.cihazlar[c] = (a.cihazlar[c] || 0) + adet;
    } else if (guncellemeMi(tip)) {
      a.guncelleme += adet;
    }
    if (gelir && para) a.gelir[para] = +((a.gelir[para] || 0) + gelir * adet).toFixed(4);
  }
  return { tarih, veri: true, apps };
}
