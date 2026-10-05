/* Uygulama panellerinin Firestore telemetrisi → ana panel özeti.
 *
 *   node scripts/lab/telemetri.mjs        (tek başına dener, özet yazar)
 *
 * Uygulama panelleri (adminpanel standardı) kurulum bazlı `installs/{id}`
 * belgeleri tutuyor: firstSeen, lastSeen, platform, region, pro/premium,
 * tester, screen. Burada yalnız o alanlar okunur (fieldMask); sayı, ekran ve
 * zaman dışında hiçbir şey yok. Kimlik: Firebase CLI oturumu (firebase-tools'un
 * clientId/secret'ı + ~/.config/configstore/firebase-tools.json refresh token),
 * walletcoach.mjs ile aynı kalıp. Oturum yoksa atlanır.
 *
 * Yeni uygulama paneli kurulunca PROJELER'e bir satır eklenir.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const PROJELER = {
  "wallet-coach-87336": "walletcoach",
  "kit-app-a91b5": "daily-whisper",
  "leafbook-bamtech": "leafbook"
};

const ALANLAR = ["firstSeen", "lastSeen", "platform", "region", "pro", "premium", "tester", "screen"];

async function firebaseToken() {
  const api = await import("/opt/homebrew/lib/node_modules/firebase-tools/lib/api.js");
  const c = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: c.tokens.refresh_token,
      client_id: api.clientId(), client_secret: api.clientSecret() }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`firebase token: ${j.error_description || j.error}`);
  return j.access_token;
}

const deger = f => f == null ? null : f.stringValue ?? f.timestampValue ?? f.booleanValue ?? (f.integerValue != null ? Number(f.integerValue) : null);

async function kurulumlar(proje, token) {
  const l = []; let sayfa;
  do {
    const u = new URL(`https://firestore.googleapis.com/v1/projects/${proje}/databases/(default)/documents/installs`);
    u.searchParams.set("pageSize", "300");
    for (const a of ALANLAR) u.searchParams.append("mask.fieldPaths", a);
    if (sayfa) u.searchParams.set("pageToken", sayfa);
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (!r.ok) throw new Error(`${r.status} ${j.error?.message?.slice(0, 120) || ""}`);
    for (const d of j.documents || []) l.push(Object.fromEntries(ALANLAR.map(a => [a, deger(d.fields?.[a])])));
    sayfa = j.nextPageToken;
  } while (sayfa);
  return l;
}

/** @returns {{uretim, apps: {slug: {...}}, hatalar: []}} */
export async function telemetri(log = () => {}) {
  const cikti = { uretim: new Date().toISOString(), apps: {}, hatalar: [] };
  let token;
  try { token = await firebaseToken(); }
  catch (e) { cikti.hatalar.push({ proje: "*", hata: e.message }); log(`  telemetri ✗ ${e.message}`); return cikti; }

  const simdi = Date.now(), gun = 864e5;
  for (const [proje, slug] of Object.entries(PROJELER)) {
    try {
      const hepsi = await kurulumlar(proje, token);
      const l = hepsi.filter(k => !k.tester);
      const yas = t => t ? (simdi - Date.parse(t)) / gun : Infinity;
      const o = {
        proje, toplam: l.length, testci: hepsi.length - l.length,
        canli: l.filter(k => yas(k.lastSeen) < 3 / 1440 && k.screen && k.screen !== "closed").length,
        aktif1: l.filter(k => yas(k.lastSeen) < 1).length,
        aktif7: l.filter(k => yas(k.lastSeen) < 7).length,
        aktif30: l.filter(k => yas(k.lastSeen) < 30).length,
        yeni7: l.filter(k => yas(k.firstSeen) < 7).length,
        yeni30: l.filter(k => yas(k.firstSeen) < 30).length,
        pro: l.filter(k => k.pro || k.premium).length,
        platform: {}, ulke: {}, gunlukYeni: {}
      };
      for (const k of l) {
        const p = (k.platform || "?").toLowerCase();
        o.platform[p] = (o.platform[p] || 0) + 1;
        const u = /^[A-Z]{2}$/.test(k.region || "") ? k.region : "??";
        const x = o.ulke[u] ||= { toplam: 0, aktif7: 0, aktif30: 0 };
        x.toplam++; if (yas(k.lastSeen) < 7) x.aktif7++; if (yas(k.lastSeen) < 30) x.aktif30++;
        if (k.firstSeen && yas(k.firstSeen) < 90) { const t = k.firstSeen.slice(0, 10); o.gunlukYeni[t] = (o.gunlukYeni[t] || 0) + 1; }
      }
      cikti.apps[slug] = o;
      log(`  telemetri ${slug} ✓ ${o.toplam} kurulum · 7g aktif ${o.aktif7} · canlı ${o.canli}`);
    } catch (e) { cikti.hatalar.push({ proje, hata: e.message }); log(`  telemetri ${slug} ✗ ${e.message}`); }
  }
  return cikti;
}

if (process.argv[1]?.endsWith("telemetri.mjs")) {
  const t = await telemetri(m => console.log(m));
  writeFileSync(join(homedir(), "dev", "vault", "metrikler", "veri", "telemetri.json"), JSON.stringify(t, null, 2));
}
