/*
 Gunluk magaza verisini her uygulamanin kendi Firebase projesine yazar, ki
 uygulama paneli ("Satis" sayfasi) parayi gosterebilsin.

 Neden boyle: uygulama panelleri bamstudio.dev'de duran statik sayfalar. App
 Store Connect ve Play anahtarlarini oraya koyamayiz, RevenueCat'in gizli
 anahtarini da. Anahtarlar Mac'te kaliyor; bu is gunluk ozeti Firestore'da
 `panel/sales` belgesine yaziyor, panel de yalnizca onu okuyor. Kurallar o
 belgeyi yoneticiye okutuyor, kimseye yazdirmiyor; buradaki yazma Firebase
 CLI oturumunun OAuth kimligiyle, kurallarin ustunden geciyor.

   node scripts/lab/panel-yaz.mjs
*/

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { PROJELER } from "./telemetri.mjs";

const VERI = join(homedir(), "dev", "vault", "metrikler", "veri");
const GUN = 90;

async function token() {
  const api = await import("/opt/homebrew/lib/node_modules/firebase-tools/lib/api.js");
  const c = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "refresh_token", refresh_token: c.tokens.refresh_token,
      client_id: api.clientId(), client_secret: api.clientSecret(),
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`firebase token: ${j.error_description || j.error}`);
  return j.access_token;
}

/** Son GUN gunun ios-*.json dosyalari, eskiden yeniye. */
function gunler() {
  if (!existsSync(VERI)) return [];
  const sinir = new Date(Date.now() - GUN * 864e5).toISOString().slice(0, 10);
  return readdirSync(VERI)
    .filter(f => /^ios-\d{4}-\d{2}-\d{2}\.json$/.test(f) && f.slice(4, 14) >= sinir)
    .sort()
    .map(f => ({ tarih: f.slice(4, 14), ...JSON.parse(readFileSync(join(VERI, f), "utf8")) }))
    .filter(d => d.veri);
}

const android = existsSync(join(VERI, "android-kova.json"))
  ? JSON.parse(readFileSync(join(VERI, "android-kova.json"), "utf8"))
  : { gunluk: {} };

/** Bir uygulamanin gunluk satirlari + toplamlari. */
function ozet(slug, gunlukler) {
  const satirlar = [];
  for (const g of gunlukler) {
    const a = g.apps?.[slug];
    const p = android.gunluk?.[slug]?.[g.tarih];
    if (!a && !p) continue;
    satirlar.push({
      tarih: g.tarih,
      indirme: (a?.indirme || 0) + (p?.indirme || 0),
      guncelleme: (a?.guncelleme || 0) + (p?.guncelleme || 0),
      iap: (a?.iap || 0) + (p?.iap || 0),
      gelir: a?.gelir || {},
    });
  }
  const paralar = {};
  for (const s of satirlar) for (const [kod, tutar] of Object.entries(s.gelir)) paralar[kod] = (paralar[kod] || 0) + Number(tutar);
  const ulkeler = {};
  for (const g of gunlukler) for (const [u, n] of Object.entries(g.apps?.[slug]?.ulkeler || {})) ulkeler[u] = (ulkeler[u] || 0) + n;
  return {
    uretim: new Date().toISOString(),
    gun: satirlar.length,
    indirme: satirlar.reduce((a, s) => a + s.indirme, 0),
    guncelleme: satirlar.reduce((a, s) => a + s.guncelleme, 0),
    iap: satirlar.reduce((a, s) => a + s.iap, 0),
    gelir: paralar,
    ulkeler,
    gunluk: satirlar.slice(-60),
  };
}

/* Firestore REST'e JSON yazmak icin tip sarmalayicilari. Ic ice haritalar
   mapValue olarak gidiyor; sayilar tam sayi degilse doubleValue. */
function alan(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(alan) } };
  if (typeof v === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, alan(x)])) } };
  return { stringValue: String(v) };
}

export async function panelYaz(log = console.log) {
  const gunlukler = gunler();
  if (!gunlukler.length) { log("  panel-yaz: gunluk dosya yok, atlandi"); return; }
  let t;
  try { t = await token(); } catch (e) { log(`  panel-yaz ✗ ${e.message}`); return; }
  for (const [proje, slug] of Object.entries(PROJELER)) {
    const belge = ozet(slug, gunlukler);
    const url = `https://firestore.googleapis.com/v1/projects/${proje}/databases/(default)/documents/panel/sales`;
    const r = await fetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: Object.fromEntries(Object.entries(belge).map(([k, v]) => [k, alan(v)])) }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      log(`  panel-yaz ✗ ${slug}: ${r.status} ${j.error?.message?.slice(0, 100) || ""}`);
      continue;
    }
    log(`  panel-yaz ✓ ${slug}: ${belge.gun} gun, ${belge.indirme} indirme, ${belge.iap} iap`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await panelYaz();
