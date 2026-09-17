/* Uzak çekim — Mac'siz. Aynı kod üç yerde çalışır:
 *   - GitHub Actions:   node scripts/lab/uzak/calistir.mjs --yaz      (workflow commit'ler)
 *   - Cloudflare Worker: worker/src/index.mjs → calistir(env) → paketYaz
 *   - Yerel deneme:     node scripts/lab/uzak/calistir.mjs --yerel --yaz
 *     (kimlikleri ~/.ascelerate, ~/.gplay, gh auth token ve Keychain'den alır)
 *
 * Durum deposu yok: geçmiş, sitedeki şifreli dosyanın kendisinde. Akış:
 *   1. data.enc.json'ı GitHub'dan al, çöz → geçmiş günler
 *   2. Son DAYS günü Apple'dan taze çek (Apple 1–3 gün geç yayınlar), birleştir
 *   3. Yorum, sürüm, Play, GA4, kur, vault → ozet.mjs → şifrele
 *   4. Yaz (dosyaya ya da GitHub API ile commit)
 *
 * env: ASC_KEY_ID ASC_ISSUER_ID ASC_PRIVATE_KEY ASC_VENDOR
 *      GPLAY_SA_JSON GPLAY_BUCKET GITHUB_TOKEN LAB_PASSPHRASE
 *      DAYS (varsayılan 5)  ACTIONS_TOKEN (panelin Yenile düğmesi, isteğe bağlı) */

import { APPS } from "../apps.mjs";
import { panelOlustur, paketAyristir, ozetSatiri } from "../ozet.mjs";
import { sifrele, coz } from "../kripto.mjs";
import { vaultAyristir } from "../vaultmetin.mjs";
import { ascIstemci } from "./asc.mjs";
import { googleIstemci } from "./google.mjs";
import { githubIstemci } from "./github.mjs";
import { PROPERTIES, OLAYLAR } from "../ga4.mjs";

const gunYazi = d => d.toISOString().slice(0, 10);

export async function calistir(env, log = () => {}) {
  const gh = githubIstemci(env);
  const asc = ascIstemci(env);
  const google = googleIstemci(env);
  const DAYS = Number(env.DAYS) || 5;

  /* 1. Geçmiş */
  let onceki = null, sha = null;
  try { const p = await gh.paketOku(); sha = p.sha; onceki = await coz(p.paket, env.LAB_PASSPHRASE); log(`  geçmiş: ${onceki.gunler.length} gün (paket sürüm ${onceki.surum})`); }
  catch (e) { log(`  geçmiş okunamadı: ${e.message} — sıfırdan`); }
  const gunlukH = {};
  for (const g of onceki ? paketAyristir(onceki) : []) gunlukH[g.tarih] = g;

  /* 2. Son günler Apple'dan. Dün ve öncesi; bugünün raporu hiç olmaz. */
  log("Apple satış raporları");
  for (let i = DAYS; i >= 1; i--) {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - i);
    const tarih = gunYazi(d);
    if (gunlukH[tarih]?.veri && i > 3) continue;          /* eski ve dolu — dokunma */
    try {
      const g = await asc.satisGunu(tarih);
      if (g.veri || !gunlukH[tarih]) gunlukH[tarih] = g;
      log(`  ${tarih} ${g.veri ? `${Object.values(g.apps).reduce((t, x) => t + x.indirme, 0)} indirme` : `veri yok (${g.sebep})`}`);
    } catch (e) { log(`  ${tarih} hata ${e.message}`); }
  }
  /* Aradaki boş günler (ilk çalıştırmada) — en fazla 45 gün geriye */
  if (!onceki) for (let i = 45; i > DAYS; i--) {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - i); const tarih = gunYazi(d);
    try { gunlukH[tarih] = await asc.satisGunu(tarih); } catch { }
  }
  const gunluk = Object.values(gunlukH).sort((a, b) => a.tarih.localeCompare(b.tarih));

  /* 3. Diğer kaynaklar */
  log("App Store yorum + sürüm");
  const uygulamalar = await asc.uygulamalar();
  const yorumlar = {}, iosDurum = { uretim: new Date().toISOString(), apps: {} };
  for (const app of APPS.filter(a => a.ios)) {
    const id = uygulamalar[app.ios.bundle]?.id; if (!id) { log(`  ${app.slug}: ASC'de yok`); continue; }
    try { yorumlar[app.slug] = await asc.yorumlar(id); } catch (e) { log(`  yorum ${app.slug} ✗ ${e.message}`); }
    try { iosDurum.apps[app.slug] = await asc.surumler(id); } catch (e) { log(`  sürüm ${app.slug} ✗ ${e.message}`); }
    log(`  ${app.slug} ${yorumlar[app.slug]?.adet ?? "?"} yorum · ${iosDurum.apps[app.slug]?.[0]?.surum || "?"} ${iosDurum.apps[app.slug]?.[0]?.durum || ""}`);
  }

  log("Google Play");
  const android = await google.androidDurum(log);
  const kova = await google.kovaVerisi(3, log);
  if (kova.hata) log(`  ! ${kova.hata}`);

  log("Firebase Analytics");
  const ga4 = await google.ga4(PROPERTIES, OLAYLAR, 45, log);

  log("Kur");
  let kur = null;
  try {
    const j = await (await fetch("https://open.er-api.com/v6/latest/USD")).json();
    if (j.result === "success" && j.rates?.TRY) kur = { taban: "USD", tarih: j.time_last_update_utc || null, kaynak: "open.er-api.com", oran: j.rates };
  } catch { }
  log(`  kur ${kur ? "✓" : "✗"}`);

  log("Vault (GitHub)");
  let vault = { apps: {}, genel: [] };
  try { vault = vaultAyristir(await gh.vaultOku(log)); } catch (e) { log(`  vault ✗ ${e.message}`); }

  /* 4. Paket */
  const panel = panelOlustur({ gunluk, android, yorumlar, kova, kur, iosDurum, vault, ga4, kovaTanimli: !!env.GPLAY_BUCKET,
    yenile: env.ACTIONS_TOKEN ? { tur: "actions", repo: "berkalparslan/berkalparslan.github.io", workflow: "panel.yml", token: env.ACTIONS_TOKEN } : null,
    kaynakSistem: env.KAYNAK_SISTEM || "uzak" });
  const { paket, boyut } = await sifrele(panel, env.LAB_PASSPHRASE);
  for (const s of ozetSatiri(panel, boyut)) log(`  ${s}`);
  return { paket, panel, sha, ozet: ozetSatiri(panel, boyut) };
}

/* ── Node girişi ─────────────────────────────────────────────────────── */
if (typeof process !== "undefined" && process.argv?.[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const args = process.argv.slice(2);
  const env = { ...process.env };
  if (args.includes("--yerel")) {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { homedir } = await import("node:os");
    const { execFileSync } = await import("node:child_process");
    const c = JSON.parse(readFileSync(join(homedir(), ".ascelerate", "config.json"), "utf8"));
    env.ASC_KEY_ID = c.keyId; env.ASC_ISSUER_ID = c.issuerId; env.ASC_VENDOR = c.vendorNumber;
    env.ASC_PRIVATE_KEY = readFileSync(c.privateKeyPath.replace(/^~/, homedir()), "utf8");
    const g = JSON.parse(readFileSync(join(homedir(), ".gplay", "config.json"), "utf8"));
    const profil = g.profiles.find(p => p.name === (g.default_profile || "default")) || g.profiles[0];
    env.GPLAY_SA_JSON = readFileSync(profil.key_path, "utf8");
    try { env.GPLAY_BUCKET = JSON.parse(readFileSync(join(homedir(), "dev", "vault", "metrikler", "veri", "gplay.json"), "utf8")).bucket; } catch { }
    env.GITHUB_TOKEN ||= execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
    env.LAB_PASSPHRASE ||= execFileSync("security", ["find-generic-password", "-s", "bamtech-lab-panel", "-w"], { encoding: "utf8" }).trim();
    env.KAYNAK_SISTEM = "yerel-deneme";
  }
  for (const k of ["ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_PRIVATE_KEY", "ASC_VENDOR", "GPLAY_SA_JSON", "GITHUB_TOKEN", "LAB_PASSPHRASE"])
    if (!env[k]) { console.error(`eksik: ${k}`); process.exit(1); }

  const { paket, sha, ozet } = await calistir(env, m => console.log(m));
  if (args.includes("--yaz")) {
    const { writeFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { join, dirname } = await import("node:path");
    const yol = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "lab", "panel", "data.enc.json");
    writeFileSync(yol, JSON.stringify(paket) + "\n"); console.log(`yazıldı: ${yol}`);
  }
  if (args.includes("--yayinla")) {
    const r = await githubIstemci(env).paketYaz(paket, sha, `panel: ${new Date().toISOString().slice(0, 10)} verisi (uzak)\n\n${ozet.join("\n")}`);
    console.log(`yayınlandı: ${r.commit?.sha?.slice(0, 7)}`);
  }
}
