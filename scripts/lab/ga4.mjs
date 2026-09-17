/* Firebase Analytics (GA4) → günlük kullanım ve satın alma olayları.
 *
 *   node scripts/lab/ga4.mjs [--days 45]
 *
 * Kimlik: gplay'in servis hesabı (~/.gplay/config.json → key_path). Aynı hesap
 * GA4 mülklerine Viewer olarak eklendi; token gcs.mjs ile aynı JWT akışı,
 * yalnız kapsam farklı. Mülk kimlikleri PROPERTIES'te — her Firebase projesi
 * bir GA4 mülkü, her uygulama (iOS/Android) o mülkte bir "data stream".
 *
 * Çıktı: ~/dev/vault/metrikler/veri/ga4.json (build.mjs okur).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";


export const PROPERTIES = {
  "542859936": "bam-tech-sports",
  "548857497": "wallet-coach-87336",
  "552195878": "bosyeryok-tycoon",
  "536872002": "thisone-ba533",
  "358139846": "kit-app-a91b5",
  "424113199": "viral-sounds"
};

/* Bu olaylar sayılıyor; başka olay istenirse buraya eklenir. */
export const OLAYLAR = ["first_open", "session_start", "in_app_purchase", "purchase_completed", "purchase_started",
  "paywall_shown", "paywall_viewed", "paywall_dismissed", "app_remove", "ad_impression", "rewarded_ad_watched"];

/* ── Komut satırı: yerel çekim (ga4.json) ──────────────────────────────
   Asıl mantık uzak/google.mjs ga4() içinde; burası yalnız Mac girişi. */
if (typeof process !== "undefined" && process.argv?.[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const { googleIstemci } = await import("./uzak/google.mjs");
  const VERI = join(homedir(), "dev", "vault", "metrikler", "veri");
  const args = process.argv.slice(2);
  const DAYS = Number(args[args.indexOf("--days") + 1]) || 45;
  const cfg = JSON.parse(readFileSync(join(homedir(), ".gplay", "config.json"), "utf8"));
  const profil = cfg.profiles.find(p => p.name === (cfg.default_profile || "default")) || cfg.profiles[0];
  const g = googleIstemci({ GPLAY_SA_JSON: readFileSync(profil.key_path, "utf8") });
  const cikti = await g.ga4(PROPERTIES, OLAYLAR, DAYS, m => console.log(m));
  writeFileSync(join(VERI, "ga4.json"), JSON.stringify(cikti, null, 2));
  console.log(`ga4.json: ${Object.keys(cikti.gunluk).length} uygulama · ${cikti.satinalma.length} satın alma satırı · ${cikti.hatalar.length} hata`);
}
