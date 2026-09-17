#!/usr/bin/env node
/**
 * Ham günlük dosyaları (vault) → panel paketi → şifreli lab/panel/data.enc.json
 *
 *   node scripts/lab/build.mjs
 *
 * Özetleme ozet.mjs'te, şifreleme kripto.mjs'te — ikisi de saf; uzak
 * çalıştırıcı (Worker / GitHub Actions) aynı modülleri kullanıyor. Bu dosya
 * yalnız Mac tarafı: vault'tan okur, Keychain'den parolayı alır, yazar.
 *
 * Parola macOS Keychain'de. Bir kez kurmak için:
 *   security add-generic-password -a "$USER" -s bamtech-lab-panel -w
 * Ortam değişkeni LAB_PASSPHRASE tanımlıysa Keychain yerine o kullanılır.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

import { panelOlustur, ozetSatiri } from "./ozet.mjs";
import { sifrele } from "./kripto.mjs";

const KOK  = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERI = join(homedir(), "dev", "vault", "metrikler", "veri");
const CIKTI = join(KOK, "lab", "panel", "data.enc.json");
const SERVIS = "bamtech-lab-panel";

function parolaAl() {
  if (process.env.LAB_PASSPHRASE) return process.env.LAB_PASSPHRASE;
  try {
    return execFileSync("security", ["find-generic-password", "-s", SERVIS, "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { /* Keychain'de yok — ilk çalıştırma, aşağıda sorulur. */ }
  if (!process.stdin.isTTY) {
    console.error(`Parola yok. Terminalden bir kez çalıştır:\n  security add-generic-password -a "$USER" -s ${SERVIS} -w`);
    process.exit(1);
  }
  console.log("Panel parolası kurulmamış. Bir tane belirle (aynısını sayfaya gireceksin).");
  const sor = e => execFileSync("/bin/sh", ["-c", `stty -echo; printf "${e}: " >&2; read v; stty echo; echo >&2; printf %s "$v"`],
    { encoding: "utf8", stdio: ["inherit", "pipe", "inherit"] });
  const p1 = sor("parola"), p2 = sor("tekrar");
  if (!p1 || p1 !== p2) { console.error("Parolalar eşleşmedi."); process.exit(1); }
  execFileSync("security", ["add-generic-password", "-U", "-a", process.env.USER || "aberk", "-s", SERVIS, "-w", p1]);
  console.log(`Keychain'e kaydedildi (servis: ${SERVIS}).\n`);
  return p1;
}

if (!existsSync(VERI)) { console.error(`Ham veri yok: ${VERI}\nÖnce collect.mjs çalıştır.`); process.exit(1); }
const oku = (ad, bos) => existsSync(join(VERI, ad)) ? JSON.parse(readFileSync(join(VERI, ad), "utf8")) : bos;

const gunluk = readdirSync(VERI)
  .filter(d => /^ios-\d{4}-\d{2}-\d{2}\.json$/.test(d)).sort()
  .map(d => JSON.parse(readFileSync(join(VERI, d), "utf8")));

/* Panelin "Yenile" düğmesi: GitHub Actions'ı tetikleyen ince yetkili token,
   vault'ta (private) durur, şifreli pakete girer. Yoksa düğme görünmez. */
const gizli = oku("gizli.json", {});

const panel = panelOlustur({
  gunluk,
  android: oku("android-durum.json", { apps: {}, notlar: [] }),
  yorumlar: oku("ios-yorumlar.json", {}),
  kova: oku("android-kova.json", { gunluk: {}, yorumlar: {} }),
  kur: oku("kurlar.json", null),
  iosDurum: oku("ios-durum.json", { apps: {} }),
  vault: oku("vault.json", { apps: {}, genel: [] }),
  ga4: oku("ga4.json", null),
  kovaTanimli: !!(process.env.GPLAY_BUCKET_ID || existsSync(join(VERI, "gplay.json"))),
  yenile: gizli.actionsToken ? { tur: "actions", repo: "berkalparslan/berkalparslan.github.io", workflow: "panel.yml", token: gizli.actionsToken } : null,
  kaynakSistem: "mac"
});

const { paket, boyut } = await sifrele(panel, parolaAl());
mkdirSync(dirname(CIKTI), { recursive: true });
writeFileSync(CIKTI, JSON.stringify(paket) + "\n");

console.log(CIKTI);
for (const s of ozetSatiri(panel, boyut)) console.log(`  ${s}`);
if (panel.notlar.length) panel.notlar.forEach(n => console.log(`  ! ${n}`));
