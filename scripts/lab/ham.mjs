/* Vault'taki ham günlük dosyaları → panelOlustur'un beklediği `ham` nesnesi.
   build.mjs ve rapor.mjs aynı okumayı kullanır; yalnız Mac tarafı. */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const VERI = join(homedir(), "dev", "vault", "metrikler", "veri");
export const RAPOR_DIZIN = join(VERI, "raporlar");
export const RAPOR_SAKLA = 60;

export const veriOku = (ad, bos) => existsSync(join(VERI, ad)) ? JSON.parse(readFileSync(join(VERI, ad), "utf8")) : bos;

export function hamOku() {
  const gunluk = readdirSync(VERI)
    .filter(d => /^ios-\d{4}-\d{2}-\d{2}\.json$/.test(d)).sort()
    .map(d => JSON.parse(readFileSync(join(VERI, d), "utf8")));
  return {
    gunluk,
    android: veriOku("android-durum.json", { apps: {}, notlar: [] }),
    yorumlar: veriOku("ios-yorumlar.json", {}),
    kova: veriOku("android-kova.json", { gunluk: {}, yorumlar: {} }),
    kur: veriOku("kurlar.json", null),
    iosDurum: veriOku("ios-durum.json", { apps: {} }),
    vault: veriOku("vault.json", { apps: {}, genel: [] }),
    ga4: veriOku("ga4.json", null),
    telemetri: veriOku("telemetri.json", null),
    web: veriOku("web.json", null),
    framegrove: veriOku("framegrove.json", null),
    toplamaNotlar: veriOku("toplama-notlar.json", []),
    kovaTanimli: !!(process.env.GPLAY_BUCKET_ID || existsSync(join(VERI, "gplay.json")))
  };
}

/* Kaydedilmiş raporlar, en yeni önce. `ham` alanı (kıyas için ham sayılar)
   yalnız vault kopyasında kalır, pakete girmez. */
export function raporlariOku({ hamIle = false, adet = RAPOR_SAKLA } = {}) {
  if (!existsSync(RAPOR_DIZIN)) return [];
  return readdirSync(RAPOR_DIZIN).filter(d => /^\d{4}-\d{2}-\d{2}\.json$/.test(d)).sort().reverse().slice(0, adet)
    .map(d => { try { return JSON.parse(readFileSync(join(RAPOR_DIZIN, d), "utf8")); } catch { return null; } })
    .filter(Boolean)
    .map(r => { if (hamIle) return r; const { ham, ...kalan } = r; return kalan; });
}
