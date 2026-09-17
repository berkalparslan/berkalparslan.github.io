/* Google tarafı — tek servis hesabı, üç API: Cloud Storage (Play toplu
   raporları), Android Publisher (track'ler, son 7 gün yorum), GA4 Data/Admin
   (Firebase Analytics). Taşınabilir (fetch + WebCrypto).

   env: GPLAY_SA_JSON (servis hesabı anahtarı, JSON metni), GPLAY_BUCKET */

import { rs256Anahtar, jwtUret } from "./jwt.mjs";
import { APPS } from "../apps.mjs";
import { csvNesneler } from "../csv.mjs";

export function googleIstemci(env) {
  const sa = JSON.parse(env.GPLAY_SA_JSON);
  let anahtar = null;
  const tokenlar = {};
  async function token(kapsam) {
    const t = tokenlar[kapsam];
    if (t && Date.now() < t.bitis - 60_000) return t.deger;
    anahtar ||= await rs256Anahtar(sa.private_key);
    const simdi = Math.floor(Date.now() / 1000);
    const jwt = await jwtUret({ alg: "RS256", typ: "JWT" },
      { iss: sa.client_email, scope: kapsam, aud: "https://oauth2.googleapis.com/token", iat: simdi, exp: simdi + 3600 }, anahtar, "RS256");
    const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
    const j = await r.json();
    if (!r.ok) throw new Error(`token: ${j.error_description || j.error}`);
    tokenlar[kapsam] = { deger: j.access_token, bitis: Date.now() + (j.expires_in - 60) * 1000 };
    return j.access_token;
  }
  async function api(kapsam, url, secenek = {}) {
    const r = await fetch(url, { ...secenek, headers: { Authorization: `Bearer ${await token(kapsam)}`, "Content-Type": "application/json", ...(secenek.headers || {}) } });
    if (secenek.ham) return r;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${r.status} ${j.error?.message || ""}`.trim());
    return j;
  }

  const GCS = "https://www.googleapis.com/auth/devstorage.read_only";
  const PUB = "https://www.googleapis.com/auth/androidpublisher";
  const GA = "https://www.googleapis.com/auth/analytics.readonly";
  const kova = String(env.GPLAY_BUCKET || "").replace(/^gs:\/\//, "").replace(/\/.*$/, "");

  async function listele(onek) {
    const adlar = []; let sayfa;
    do {
      const u = new URL(`https://storage.googleapis.com/storage/v1/b/${kova}/o`);
      u.searchParams.set("prefix", onek); u.searchParams.set("fields", "items(name),nextPageToken");
      if (sayfa) u.searchParams.set("pageToken", sayfa);
      const j = await api(GCS, u.toString());
      (j.items || []).forEach(o => adlar.push(o.name)); sayfa = j.nextPageToken;
    } while (sayfa);
    return adlar;
  }
  async function indir(ad) {
    const r = await api(GCS, `https://storage.googleapis.com/storage/v1/b/${kova}/o/${encodeURIComponent(ad)}?alt=media`, { ham: true });
    if (!r.ok) throw new Error(`indir ${ad}: ${r.status}`);
    const ham = new Uint8Array(await r.arrayBuffer());
    if (ham[0] === 0xFF && ham[1] === 0xFE) return new TextDecoder("utf-16le").decode(ham.subarray(2));
    return new TextDecoder("utf-8").decode(ham).replace(/^﻿/, "");
  }
  const aylar = n => { const l = [], d = new Date(); for (let i = 0; i < n; i++) { l.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`); d.setMonth(d.getMonth() - 1); } return l; };

  return {
    /** Play toplu raporları — collect.mjs androidKova ile aynı şekil. */
    async kovaVerisi(ay = 3, log = () => {}) {
      const cikti = { uretim: new Date().toISOString(), gunluk: {}, yorumlar: {}, hata: null };
      if (!kova) { cikti.hata = "kova tanımsız"; return cikti; }
      try { await listele("stats/installs/"); }
      catch (e) {
        cikti.hata = /403|denied|forbidden/i.test(e.message)
          ? "Servis hesabında hesap geneli \"toplu raporları indir\" yetkisi yok (403). Play Console → Kullanıcılar ve izinler → servis hesabı → hesap izinleri."
          : e.message;
        return cikti;
      }
      for (const app of APPS.filter(a => a.android)) {
        for (const a of aylar(ay)) {
          let metin; try { metin = await indir(`stats/installs/installs_${app.android}_${a}_overview.csv`); } catch { continue; }
          for (const r of csvNesneler(metin)) {
            const tarih = (r["Date"] || "").trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) continue;
            (cikti.gunluk[tarih] ||= {})[app.slug] = { indirme: Number(r["Daily Device Installs"]) || 0, kaldirma: Number(r["Daily Device Uninstalls"]) || 0,
              guncelleme: Number(r["Daily Device Upgrades"]) || 0, aktif: Number(r["Active Device Installs"]) || 0 };
          }
        }
        let hepsi = [];
        for (const a of aylar(24)) { try { hepsi = hepsi.concat(csvNesneler(await indir(`reviews/reviews_${app.android}_${a}.csv`))); } catch { } }
        const puanlar = hepsi.map(r => Number(r["Star Rating"])).filter(Number.isFinite);
        cikti.yorumlar[app.slug] = { adet: hepsi.length,
          ortalama: puanlar.length ? +(puanlar.reduce((x, y) => x + y, 0) / puanlar.length).toFixed(2) : null,
          cevapsiz: hepsi.filter(r => !(r["Developer Reply Text"] || "").trim()).length,
          son: hepsi.map(r => r["Review Last Update Date and Time"]).filter(Boolean).sort().at(-1) || null };
        log(`  kova ${app.slug} ✓`);
      }
      return cikti;
    },

    /** Track'ler ve son 7 gün yorum sayısı — collect.mjs androidDurum ile aynı şekil. */
    async androidDurum(log = () => {}) {
      const cikti = { uretim: new Date().toISOString(), apps: {}, kova: kova ? "tanımlı" : null, notlar: [] };
      for (const app of APPS.filter(a => a.android)) {
        const kayit = { paket: app.android };
        try {
          const taban = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${app.android}`;
          const e = await api(PUB, `${taban}/edits`, { method: "POST", body: "{}" });
          try {
            const t = await api(PUB, `${taban}/edits/${e.id}/tracks`);
            kayit.tracks = (t.tracks || []).filter(x => x.releases?.length)
              .map(x => ({ track: x.track, surum: x.releases[0].name, durum: x.releases[0].status }));
          } finally { await api(PUB, `${taban}/edits/${e.id}`, { method: "DELETE", ham: true }); }
          const rv = await api(PUB, `${taban}/reviews`);
          kayit.yorum = (rv.reviews || []).length;
        } catch (err) { kayit.hata = err.message.slice(0, 200); }
        cikti.apps[app.slug] = kayit;
        log(`  android ${app.slug} ${kayit.hata ? "✗ " + kayit.hata : "✓"}`);
      }
      return cikti;
    },

    /** GA4 — ga4.mjs ile aynı şekil. properties: { id: ad } */
    async ga4(properties, olaylar, gun = 45, log = () => {}) {
      const BUNDLE_SLUG = new Map(APPS.flatMap(a => [a.ios && [a.ios.bundle, a.slug], a.android && [a.android, a.slug]].filter(Boolean)));
      const tarih = d => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      const cikti = { uretim: new Date().toISOString(), gun, mulkler: {}, gunluk: {}, satinalma: [], hatalar: [] };
      const aralik = [{ startDate: `${gun}daysAgo`, endDate: "today" }];
      const rapor = async (pid, body) => {
        const j = await api(GA, `https://analyticsdata.googleapis.com/v1beta/properties/${pid}:runReport`, { method: "POST", body: JSON.stringify({ ...body, limit: 100000 }) });
        const dk = (j.dimensionHeaders || []).map(d => d.name), mk = (j.metricHeaders || []).map(m => m.name);
        return (j.rows || []).map(r => { const o = {}; r.dimensionValues.forEach((v, i) => o[dk[i]] = v.value); r.metricValues.forEach((v, i) => o[mk[i]] = Number(v.value)); return o; });
      };
      for (const [pid, ad] of Object.entries(properties)) {
        try {
          const j = await api(GA, `https://analyticsadmin.googleapis.com/v1beta/properties/${pid}/dataStreams`);
          const ak = {};
          for (const s of j.dataStreams || []) {
            const kimlik = s.iosAppStreamData?.bundleId || s.androidAppStreamData?.packageName || null;
            ak[s.name.split("/").pop()] = { platform: s.type === "IOS_APP_DATA_STREAM" ? "ios" : s.type === "ANDROID_APP_DATA_STREAM" ? "android" : "web",
              kimlik, slug: kimlik ? BUNDLE_SLUG.get(kimlik) || null : null, ad: s.displayName };
          }
          cikti.mulkler[pid] = { ad, akislar: ak };
          const g = (slug, t) => ((cikti.gunluk[slug] ||= {})[t] ||= { au: 0, nu: 0, gelir: 0, reklam: 0, olay: {} });
          for (const r of await rapor(pid, { dateRanges: aralik, dimensions: [{ name: "date" }, { name: "streamId" }],
            metrics: [{ name: "activeUsers" }, { name: "newUsers" }, { name: "purchaseRevenue" }, { name: "totalAdRevenue" }] })) {
            const slug = ak[r.streamId]?.slug; if (!slug) continue;
            const x = g(slug, tarih(r.date)); x.au += r.activeUsers; x.nu += r.newUsers; x.gelir += r.purchaseRevenue; x.reklam += r.totalAdRevenue;
          }
          for (const r of await rapor(pid, { dateRanges: aralik, dimensions: [{ name: "date" }, { name: "streamId" }, { name: "eventName" }],
            metrics: [{ name: "eventCount" }], dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: olaylar } } } })) {
            const slug = ak[r.streamId]?.slug; if (!slug) continue;
            const x = g(slug, tarih(r.date)); x.olay[r.eventName] = (x.olay[r.eventName] || 0) + r.eventCount;
          }
          for (const r of await rapor(pid, { dateRanges: aralik, dimensions: [{ name: "date" }, { name: "streamId" }, { name: "currencyCode" }],
            metrics: [{ name: "purchaseRevenue" }, { name: "ecommercePurchases" }],
            metricFilter: { filter: { fieldName: "purchaseRevenue", numericFilter: { operation: "GREATER_THAN", value: { doubleValue: 0 } } } } }))
            cikti.satinalma.push({ tarih: tarih(r.date), slug: ak[r.streamId]?.slug || null, akis: ak[r.streamId]?.ad || r.streamId, para: r.currencyCode, gelirUsd: +r.purchaseRevenue.toFixed(2), adet: r.ecommercePurchases });
          log(`  ga4 ${ad} ✓ ${Object.keys(ak).length} akış`);
        } catch (e) { cikti.hatalar.push({ mulk: ad, pid, hata: e.message }); log(`  ga4 ${ad} ✗ ${e.message.slice(0, 100)}`); }
      }
      return cikti;
    }
  };
}
