/* App Store Connect API — ascelerate'in yaptığı üç işi doğrudan yapar:
   satış raporu, yorumlar, sürüm durumu. Taşınabilir (fetch + WebCrypto).

   env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY (PEM), ASC_VENDOR */

import { es256Anahtar, jwtUret } from "./jwt.mjs";
import { satisAyristir } from "../satis.mjs";

const KOK = "https://api.appstoreconnect.apple.com/v1";

export function ascIstemci(env) {
  let anahtar = null, jwt = null, bitis = 0;
  async function token() {
    if (jwt && Date.now() < bitis - 60_000) return jwt;
    anahtar ||= await es256Anahtar(env.ASC_PRIVATE_KEY);
    const simdi = Math.floor(Date.now() / 1000);
    jwt = await jwtUret({ alg: "ES256", kid: env.ASC_KEY_ID, typ: "JWT" },
      { iss: env.ASC_ISSUER_ID, iat: simdi, exp: simdi + 19 * 60, aud: "appstoreconnect-v1" }, anahtar, "ES256");
    bitis = Date.now() + 19 * 60_000;
    return jwt;
  }
  async function istek(yol, kabul = "application/json") {
    const r = await fetch(yol.startsWith("http") ? yol : KOK + yol, { headers: { Authorization: `Bearer ${await token()}`, Accept: kabul } });
    return r;
  }
  async function json(yol) {
    const r = await istek(yol);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${r.status} ${j.errors?.[0]?.detail || j.errors?.[0]?.title || ""}`.trim());
    return j;
  }

  return {
    /** bundleId → { id, ad } */
    async uygulamalar() {
      const h = {};
      let yol = "/apps?limit=200";
      while (yol) {
        const j = await json(yol);
        for (const a of j.data || []) h[a.attributes.bundleId] = { id: a.id, ad: a.attributes.name };
        yol = j.links?.next || null;
      }
      return h;
    },

    /** Günlük Sales & Trends raporu → satisAyristir çıktısı. Rapor yoksa veri:false. */
    async satisGunu(tarih) {
      const u = new URL(KOK + "/salesReports");
      u.searchParams.set("filter[frequency]", "DAILY");
      u.searchParams.set("filter[reportDate]", tarih);
      u.searchParams.set("filter[reportSubType]", "SUMMARY");
      u.searchParams.set("filter[reportType]", "SALES");
      u.searchParams.set("filter[vendorNumber]", env.ASC_VENDOR);
      const r = await istek(u.toString(), "application/a-gzip");
      if (r.status === 404) return { tarih, veri: false, sebep: "apple-rapor-yok", apps: {} };
      if (!r.ok) return { tarih, veri: false, sebep: `${r.status}`, apps: {} };
      /* Yanıt gzip; Node 18+ ve Workers'ta DecompressionStream var. */
      const metin = await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).text();
      return satisAyristir(metin, tarih);
    },

    /** Yorumlar + yayınlanmış cevaplar — collect.mjs iosYorumlar ile aynı şekil. */
    async yorumlar(appId) {
      const j = await json(`/apps/${appId}/customerReviews?limit=200&sort=-createdDate&include=response`);
      const cevaplar = {};
      for (const c of j.included || []) if (c.type === "customerReviewResponses") cevaplar[c.id] = c.attributes;
      const liste = (j.data || []).map(x => {
        const cid = x.relationships?.response?.data?.id;
        const c = cid ? cevaplar[cid] : null;
        return {
          puan: x.attributes.rating ?? null, baslik: x.attributes.title || "", metin: x.attributes.body || "",
          kisi: x.attributes.reviewerNickname || "", ulke: x.attributes.territory || "", tarih: x.attributes.createdDate || "",
          cevap: c && c.state === "PUBLISHED" ? { metin: c.responseBody || "", tarih: c.lastModifiedDate || "" } : null
        };
      });
      const puanlar = liste.map(x => x.puan).filter(Number.isFinite);
      return {
        adet: liste.length,
        ortalama: puanlar.length ? +(puanlar.reduce((a, b) => a + b, 0) / puanlar.length).toFixed(2) : null,
        cevapsiz: liste.filter(x => !x.cevap).length,
        son: liste.map(x => x.tarih).sort().at(-1) || null,
        liste
      };
    },

    /** Son dört App Store sürümü ve durumu. */
    async surumler(appId) {
      const j = await json(`/apps/${appId}/appStoreVersions?limit=4`);
      return (j.data || [])
        .sort((a, b) => String(b.attributes.createdDate).localeCompare(String(a.attributes.createdDate)))
        .map(v => ({ surum: v.attributes.versionString, durum: v.attributes.appVersionState || v.attributes.appStoreState,
          tarih: v.attributes.createdDate, platform: v.attributes.platform }));
    }
  };
}
