/* JWT imzalama — WebCrypto ile, Node 20+ ve Cloudflare Workers'ta aynı.
   ES256: App Store Connect (.p8, P-256). RS256: Google servis hesabı. */

const subtle = globalThis.crypto.subtle;

export const b64url = u8 => {
  const s = typeof u8 === "string" ? u8 : String.fromCharCode(...u8);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

function pemGovde(pem) {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/, "").replace(/-----END [^-]+-----/, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

export async function es256Anahtar(pem) {
  return subtle.importKey("pkcs8", pemGovde(pem), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}
export async function rs256Anahtar(pem) {
  return subtle.importKey("pkcs8", pemGovde(pem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

export async function jwtUret(baslik, govde, anahtar, alg) {
  const enc = new TextEncoder();
  const veri = `${b64url(enc.encode(JSON.stringify(baslik)))}.${b64url(enc.encode(JSON.stringify(govde)))}`;
  const imza = new Uint8Array(await subtle.sign(
    alg === "ES256" ? { name: "ECDSA", hash: "SHA-256" } : "RSASSA-PKCS1-v1_5", anahtar, enc.encode(veri)));
  return `${veri}.${b64url(imza)}`;
}
