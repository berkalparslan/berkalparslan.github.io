#!/usr/bin/env node
/**
 * Sürüm notları: her uygulamanın mağazaya giden "Yenilikler" metni → lab/assets/surumler.json
 *
 *   node scripts/lab/surumler.mjs            (gunluk.sh içinde)
 *   node scripts/lab/surumler.mjs leafbook   (tek uygulama)
 *
 * iOS: App Store Connect API (appStoreVersions + localizations.whatsNew), hesap
 * dosyası adıyla (config.aberk.json, config.page.json), collect.mjs gibi.
 * Android: gplay ile salt okunur bir edit açılır, track'lerin releaseNotes'u
 * okunur, edit silinir (commit edilmez).
 *
 * Metin mağazada zaten herkese açık; dosya şifresiz, panellerin "Sürüm
 * notları" çekmecesi ve Genel bakış köşesi okur. Dil: önce tr, yoksa en-US.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { APPS } from "./apps.mjs";
import { es256Anahtar, jwtUret } from "./uzak/jwt.mjs";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CIKTI = join(KOK, "lab", "assets", "surumler.json");
const yalniz = process.argv[2];

/* Elle eklenen ya da mağazaya girmeyen notlar (ör. TestFlight sürümü):
   vault/metrikler/veri/surum-ek.json { "<slug>": [{ surum, platform, tarih, notlar }] } */
const EK = join(homedir(), "dev", "vault", "metrikler", "veri", "surum-ek.json");

function asc(ad) {
  const yol = join(homedir(), ".ascelerate", `config.${ad}.json`);
  if (!existsSync(yol)) return null;
  const c = JSON.parse(readFileSync(yol, "utf8"));
  const pem = readFileSync(String(c.privateKeyPath).replace(/^~/, homedir()), "utf8");
  let jwt = null, bitis = 0, anahtar = null;
  return async yolu => {
    if (!jwt || Date.now() > bitis - 60_000) {
      anahtar ||= await es256Anahtar(pem);
      const t = Math.floor(Date.now() / 1000);
      jwt = await jwtUret({ alg: "ES256", kid: c.keyId, typ: "JWT" }, { iss: c.issuerId, iat: t, exp: t + 1140, aud: "appstoreconnect-v1" }, anahtar, "ES256");
      bitis = Date.now() + 1140_000;
    }
    const r = await fetch(yolu.startsWith("http") ? yolu : "https://api.appstoreconnect.apple.com/v1" + yolu, { headers: { Authorization: `Bearer ${jwt}` } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${r.status} ${j.errors?.[0]?.detail || ""}`.trim());
    return j;
  };
}
const HESAP = { aberk: asc("aberk"), page: asc("page") };
const satirlar = m => String(m || "").split(/\r?\n/).map(x => x.replace(/^\s*[-•*·]\s*/, "").trim()).filter(Boolean);
/* Önce Türkçe, sonra herhangi bir İngilizce (en-US, en-GB, en-AU...), en son ilk dil. */
const dilSec = (h, sira = ["tr", "tr-TR", "en-US", "en-GB", "en"]) => {
  for (const d of sira) if (h[d]) return h[d];
  const tr = Object.keys(h).find(k => /^tr/i.test(k)), en = Object.keys(h).find(k => /^en/i.test(k));
  return h[tr] || h[en] || Object.values(h)[0] || "";
};

async function ios(app) {
  const get = HESAP[app.ios.hesap || "aberk"];
  if (!get) return [];
  const a = await get(`/apps?filter[bundleId]=${encodeURIComponent(app.ios.bundle)}`);
  const id = a.data?.[0]?.id;
  if (!id) return [];
  const j = await get(`/apps/${id}/appStoreVersions?limit=20&include=appStoreVersionLocalizations&fields[appStoreVersionLocalizations]=locale,whatsNew`);
  const lok = {};
  for (const x of j.included || []) if (x.type === "appStoreVersionLocalizations") lok[x.id] = x.attributes;
  return (j.data || []).map(v => {
    const metin = {};
    for (const r of v.relationships?.appStoreVersionLocalizations?.data || []) { const l = lok[r.id]; if (l?.whatsNew) metin[l.locale] = l.whatsNew; }
    return {
      surum: v.attributes.versionString, platform: v.attributes.platform === "WATCH_OS" ? "watchos" : "ios",
      tarih: v.attributes.earliestReleaseDate || v.attributes.createdDate,
      durum: durumAdi(v.attributes.appVersionState || v.attributes.appStoreState),
      notlar: satirlar(dilSec(metin)),
    };
  });
}
const DURUM = { READY_FOR_DISTRIBUTION: "yayında", READY_FOR_SALE: "yayında", WAITING_FOR_REVIEW: "incelemede", IN_REVIEW: "incelemede",
  PREPARE_FOR_SUBMISSION: "hazırlanıyor", REJECTED: "reddedildi", PENDING_DEVELOPER_RELEASE: "yayın bekliyor", DEVELOPER_REMOVED_FROM_SALE: "kaldırıldı",
  REPLACED_WITH_NEW_VERSION: "eski", ACCEPTED: "onaylandı", PROCESSING_FOR_DISTRIBUTION: "işleniyor", METADATA_REJECTED: "reddedildi" };
const durumAdi = d => DURUM[d] || (d ? d.toLowerCase().replace(/_/g, " ") : "");

function gplay(argv) { return JSON.parse(execFileSync("gplay", argv, { encoding: "utf8", maxBuffer: 32 << 20, stdio: ["ignore", "pipe", "pipe"] })); }
function android(app) {
  const ed = gplay(["edits", "create", "--package", app.android]);
  const edit = ed.id || ed.editId;
  try {
    const t = gplay(["tracks", "list", "--package", app.android, "--edit", edit]);
    const l = [];
    for (const tr of t.tracks || t || []) {
      for (const r of tr.releases || []) {
        if (!r.name && !r.versionCodes?.length) continue;
        const notlar = {};
        for (const n of r.releaseNotes || []) notlar[n.language] = n.text;
        l.push({ surum: r.name || `vc ${r.versionCodes.join(",")}`, platform: tr.track?.startsWith("wear") ? "wear" : "android",
          track: tr.track, durum: `${trackAdi(tr.track)}${r.status && r.status !== "completed" ? " · " + r.status : ""}`,
          vc: (r.versionCodes || []).map(Number), notlar: satirlar(dilSec(notlar, ["tr-TR", "tr", "en-US", "en-GB"])) });
      }
    }
    return l;
  } finally {
    try { execFileSync("gplay", ["edits", "delete", "--package", app.android, "--edit", edit], { stdio: "ignore" }); } catch { }
  }
}
const trackAdi = t => ({ production: "üretim", beta: "açık test", alpha: "kapalı test", internal: "iç test", "wear:production": "saat üretim" }[t] || t);

const onceki = existsSync(CIKTI) ? JSON.parse(readFileSync(CIKTI, "utf8")) : { apps: {} };
const cikti = { uretim: new Date().toISOString(), apps: { ...onceki.apps } };
const ek = existsSync(EK) ? JSON.parse(readFileSync(EK, "utf8")) : {};
const ozet = [];
for (const app of APPS.filter(a => !yalniz || a.slug === yalniz)) {
  if (app.slug === "oncopace") continue; // ayrı yığın, dokunulmuyor
  const l = [];
  if (app.ios) { try { l.push(...await ios(app)); } catch (e) { ozet.push(`${app.slug} ios ✗ ${e.message.slice(0, 80)}`); } }
  if (app.android) {
    try {
      const a = android(app);
      /* Play tarih vermiyor: aynı sürüm daha önce görüldüyse ilk görülme tarihi kalır. */
      const eski = (onceki.apps[app.slug] || []).filter(x => x.platform !== "ios" && x.platform !== "watchos");
      /* İlk çekimde (bu uygulamanın hiç Android kaydı yokken) tarih bilinmiyor: boş kalır. */
      const ilkCekim = !eski.length;
      for (const x of a) {
        const e = eski.find(y => y.surum === x.surum && y.track === x.track);
        x.tarih = e ? e.tarih : ilkCekim ? null : new Date().toISOString().slice(0, 10);
        x.tarihKaynak = "ilk görülme";
      }
      l.push(...a);
    } catch (e) { ozet.push(`${app.slug} android ✗ ${String(e.stderr || e.message).slice(0, 80)}`); }
  }
  for (const x of ek[app.slug] || []) if (!l.some(y => y.surum === x.surum && y.platform === x.platform)) l.push({ ...x, durum: x.durum || "not" });
  if (l.length) { cikti.apps[app.slug] = l.sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || ""))); ozet.push(`${app.slug} ✓ ${l.length}`); }
}
writeFileSync(CIKTI, JSON.stringify(cikti, null, 1) + "\n");
console.log(`sürüm notları: ${ozet.join(" · ")}`);
