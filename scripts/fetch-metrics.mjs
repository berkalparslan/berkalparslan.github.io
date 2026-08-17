#!/usr/bin/env node
/**
 * App Store Connect satış raporlarını çekip Supabase'e yazar.
 *
 * GitHub Actions içinde günlük çalışır. Bağımlılığı yok — Node 18+ ile gelen
 * webcrypto (ES256 imza), fetch ve zlib yeterli.
 *
 * Gerekli ortam değişkenleri (hepsi GitHub Actions secret'ı):
 *   ASC_KEY_ID          App Store Connect API anahtar ID'si  (10 karakter)
 *   ASC_ISSUER_ID       Issuer ID (UUID)
 *   ASC_PRIVATE_KEY     .p8 dosyasının içeriği, satır sonlarıyla birlikte
 *   ASC_VENDOR_NUMBER   Payments and Financial Reports'taki vendor numarası
 *   SUPABASE_URL        https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY  service_role anahtarı — RLS'i bypass eder, ASLA repoda durmaz
 *
 * İsteğe bağlı:
 *   DAYS_BACK           Kaç güne geriye gidilsin (varsayılan 5)
 *
 * Apple raporları ~1 gün gecikmeli yayınlar ve bazı günler hiç rapor olmaz
 * (o gün satış yoksa 404 döner). İkisi de normal; script devam eder.
 */

import { gunzipSync } from "node:zlib";
import { webcrypto } from "node:crypto";

const {
  ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY, ASC_VENDOR_NUMBER,
  SUPABASE_URL, SUPABASE_SERVICE_KEY,
  DAYS_BACK = "5"
} = process.env;

const required = {
  ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY, ASC_VENDOR_NUMBER,
  SUPABASE_URL, SUPABASE_SERVICE_KEY
};
const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error("Eksik ortam değişkeni:", missing.join(", "));
  process.exit(1);
}

/* ── ES256 JWT ───────────────────────────────────────────────────────────
   Apple, JWT'yi ES256 ile imzalanmış ister. WebCrypto'nun ECDSA çıktısı
   zaten ham r||s formatında — JWT'nin beklediği format bu, ek dönüşüm yok. */

const b64url = buf =>
  Buffer.from(buf).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function makeToken() {
  const pem = ASC_PRIVATE_KEY.replace(/\\n/g, "\n").trim();
  const der = Buffer.from(
    pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, ""),
    "base64");

  const key = await webcrypto.subtle.importKey(
    "pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: ASC_KEY_ID, typ: "JWT" };
  const payload = {
    iss: ASC_ISSUER_ID,
    iat: now,
    exp: now + 20 * 60,          // Apple en fazla 20 dakika kabul ediyor
    aud: "appstoreconnect-v1"
  };

  const signingInput =
    b64url(JSON.stringify(header)) + "." + b64url(JSON.stringify(payload));

  const sig = await webcrypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, Buffer.from(signingInput));

  return signingInput + "." + b64url(sig);
}

/* ── Rapor indirme ───────────────────────────────────────────────────── */

async function fetchReport(token, date) {
  const url = new URL("https://api.appstoreconnect.apple.com/v1/salesReports");
  url.searchParams.set("filter[frequency]", "DAILY");
  url.searchParams.set("filter[reportType]", "SALES");
  url.searchParams.set("filter[reportSubType]", "SUMMARY");
  url.searchParams.set("filter[vendorNumber]", ASC_VENDOR_NUMBER);
  url.searchParams.set("filter[reportDate]", date);

  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + token, Accept: "application/a-gzip" }
  });

  // O gün hiç satış yoksa Apple 404 döner — hata değil, boş gün.
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`ASC ${date}: ${res.status} ${await res.text().catch(() => "")}`);
  }
  return gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8");
}

/* ── TSV ayrıştırma ──────────────────────────────────────────────────────
   Sütun sırası zamanla değişebiliyor, o yüzden başlık satırından isimle
   okuyoruz. Sadece uygulama indirmelerini sayıyoruz: "Product Type
   Identifier" 1 ile başlayanlar (1, 1F, 1T, 1E...) uygulama; 7/F ile
   başlayanlar güncelleme, I ile başlayanlar uygulama içi satın alma. */

function parseReport(tsv) {
  const lines = tsv.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  const head = lines[0].split("\t").map(h => h.trim());
  const col = name => head.indexOf(name);

  const iType = col("Product Type Identifier");
  const iUnits = col("Units");
  const iProceeds = col("Developer Proceeds");
  const iBegin = col("Begin Date");
  const iTitle = col("Title");
  const iAppleId = col("Apple Identifier");
  const iCountry = col("Country Code");

  if ([iUnits, iBegin, iAppleId].some(i => i < 0)) {
    console.warn("Beklenmeyen rapor başlığı, atlanıyor:", head.join(" | "));
    return [];
  }

  const out = [];
  for (const line of lines.slice(1)) {
    const f = line.split("\t");
    const type = iType >= 0 ? (f[iType] || "").trim() : "1";
    if (!type.startsWith("1")) continue;              // sadece ilk indirmeler

    const units = parseInt(f[iUnits], 10) || 0;
    if (!units) continue;

    out.push({
      date: normalizeDate(f[iBegin]),
      app_id: (f[iAppleId] || "").trim(),
      app_name: iTitle >= 0 ? (f[iTitle] || "").trim() : "",
      platform: "ios",
      country: iCountry >= 0 ? (f[iCountry] || "ZZ").trim() : "ZZ",
      units,
      proceeds: iProceeds >= 0 ? (parseFloat(f[iProceeds]) || 0) * units : 0
    });
  }
  return out;
}

/* Apple MM/DD/YYYY veriyor; Postgres ISO istiyor. */
function normalizeDate(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s || "").trim());
  return m ? `${m[3]}-${m[1]}-${m[2]}` : (s || "").trim();
}

/* Aynı gün + uygulama + ülke için satırları toplar. */
function aggregate(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = [r.date, r.app_id, r.platform, r.country].join("|");
    const e = map.get(key);
    if (e) {
      e.units += r.units;
      e.proceeds += r.proceeds;
    } else {
      map.set(key, { ...r });
    }
  }
  return Array.from(map.values())
    .map(r => ({ ...r, proceeds: Math.round(r.proceeds * 100) / 100 }));
}

/* ── Supabase'e yazma ────────────────────────────────────────────────────
   merge-duplicates: aynı birincil anahtar varsa günceller. Böylece Apple
   bir günün raporunu sonradan düzeltirse biz de düzeltiriz. */

async function upsert(rows) {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const res = await fetch(
      SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/app_metrics", {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: "Bearer " + SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(chunk)
    });
    if (!res.ok) {
      throw new Error(`Supabase upsert: ${res.status} ${await res.text()}`);
    }
    console.log(`  ↳ ${chunk.length} satır yazıldı`);
  }
}

/* ── Ana akış ────────────────────────────────────────────────────────── */

const token = await makeToken();
const all = [];
const back = Math.max(1, parseInt(DAYS_BACK, 10) || 5);

for (let i = 1; i <= back; i++) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - i);
  const date = d.toISOString().slice(0, 10);

  try {
    const tsv = await fetchReport(token, date);
    if (!tsv) {
      console.log(`${date}: rapor yok (o gün satış olmamış)`);
      continue;
    }
    const rows = parseReport(tsv);
    console.log(`${date}: ${rows.length} satır, ${rows.reduce((a, r) => a + r.units, 0)} indirme`);
    all.push(...rows);
  } catch (err) {
    console.error(`${date}: ${err.message}`);
  }
}

if (!all.length) {
  console.log("Yazılacak yeni veri yok.");
  process.exit(0);
}

const merged = aggregate(all);
console.log(`Toplam ${merged.length} benzersiz satır yazılıyor…`);
await upsert(merged);
console.log("Bitti.");
