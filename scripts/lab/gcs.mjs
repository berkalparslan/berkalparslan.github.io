/* Play'in toplu rapor kovasından ham dosya okumak için küçük bir GCS istemcisi.
 *
 * `gplay reports stats` yalnızca installs/ratings/crashes/... türlerini biliyor;
 * kovadaki **yorum geçmişi** (`reviews/reviews_<paket>_<YYYYMM>.csv`) o listede
 * yok. Play Developer API ise yorumların yalnız son 7 gününü veriyor. Tüm
 * geçmişi görmenin tek yolu bu dosyalar.
 *
 * Kimlik: gplay'in kullandığı servis hesabı JSON'u (~/.gplay/config.json içinde
 * yolu yazıyor). RS256 imzalı JWT ile token alınıyor, ekstra paket yok.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createSign } from "node:crypto";

const KAPSAM = "https://www.googleapis.com/auth/devstorage.read_only";

function servisHesabi() {
  const cfg = JSON.parse(readFileSync(join(homedir(), ".gplay", "config.json"), "utf8"));
  const profil = cfg.profiles.find(p => p.name === (cfg.default_profile || "default")) || cfg.profiles[0];
  if (!profil?.key_path) throw new Error("gplay servis hesabı yapılandırılmamış");
  return JSON.parse(readFileSync(profil.key_path, "utf8"));
}

const b64url = b => Buffer.from(b).toString("base64")
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

let ONBELLEK = null;

async function token() {
  if (ONBELLEK && ONBELLEK.bitis > Date.now() + 60_000) return ONBELLEK.deger;

  const sa = servisHesabi();
  const simdi = Math.floor(Date.now() / 1000);
  const bas = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const gov = b64url(JSON.stringify({
    iss: sa.client_email, scope: KAPSAM,
    aud: "https://oauth2.googleapis.com/token",
    iat: simdi, exp: simdi + 3600
  }));
  const imza = createSign("RSA-SHA256").update(`${bas}.${gov}`).sign(sa.private_key);
  const jwt = `${bas}.${gov}.${b64url(imza)}`;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`token alınamadı: ${j.error_description || j.error || r.status}`);

  ONBELLEK = { deger: j.access_token, bitis: Date.now() + (j.expires_in - 60) * 1000 };
  return ONBELLEK.deger;
}

export const kovaAdi = k => String(k || "").replace(/^gs:\/\//, "").replace(/\/.*$/, "");

/** Bir önek altındaki nesne adlarını döndürür. */
export async function listele(kova, onek) {
  const t = await token();
  const adlar = [];
  let sayfa;
  do {
    const u = new URL(`https://storage.googleapis.com/storage/v1/b/${kovaAdi(kova)}/o`);
    u.searchParams.set("prefix", onek);
    u.searchParams.set("fields", "items(name),nextPageToken");
    if (sayfa) u.searchParams.set("pageToken", sayfa);
    const r = await fetch(u, { headers: { Authorization: `Bearer ${t}` } });
    const j = await r.json();
    if (!r.ok) throw new Error(`liste: ${j.error?.message || r.status}`);
    (j.items || []).forEach(o => adlar.push(o.name));
    sayfa = j.nextPageToken;
  } while (sayfa);
  return adlar;
}

/** Tek bir nesneyi metin olarak indirir. Play CSV'leri UTF-16LE, BOM'lu. */
export async function indir(kova, ad) {
  const t = await token();
  const u = `https://storage.googleapis.com/storage/v1/b/${kovaAdi(kova)}/o/` +
            `${encodeURIComponent(ad)}?alt=media`;
  const r = await fetch(u, { headers: { Authorization: `Bearer ${t}` } });
  if (!r.ok) throw new Error(`indir ${ad}: ${r.status}`);
  const ham = Buffer.from(await r.arrayBuffer());
  if (ham[0] === 0xFF && ham[1] === 0xFE) return ham.toString("utf16le").slice(1);
  return ham.toString("utf8").replace(/^﻿/, "");
}
