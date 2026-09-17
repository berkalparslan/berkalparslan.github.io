/* Panel paketinin şifrelenmesi ve çözülmesi. WebCrypto — Node 20+, Cloudflare
   Workers ve tarayıcıda aynı kod. PBKDF2-SHA256 (250.000 tur) → AES-256-GCM.
   Tarayıcıdaki coz() ile birebir aynı parametreler. */

export const TUR = 250_000;
const subtle = globalThis.crypto.subtle;

const b64e = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function anahtar(parola, salt, tur, kullanim) {
  const temel = await subtle.importKey("raw", new TextEncoder().encode(parola), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey({ name: "PBKDF2", salt, iterations: tur, hash: "SHA-256" }, temel,
    { name: "AES-GCM", length: 256 }, false, [kullanim]);
}

export async function sifrele(nesne, parola) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await anahtar(parola, salt, TUR, "encrypt");
  const acik = new TextEncoder().encode(JSON.stringify(nesne));
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, k, acik));
  return { paket: { v: 1, kdf: { ad: "PBKDF2-SHA256", tur: TUR, salt: b64e(salt) }, iv: b64e(iv), ct: b64e(ct) }, boyut: ct.length };
}

export async function coz(paket, parola) {
  const k = await anahtar(parola, b64d(paket.kdf.salt), paket.kdf.tur, "decrypt");
  const acik = await subtle.decrypt({ name: "AES-GCM", iv: b64d(paket.iv) }, k, b64d(paket.ct));
  return JSON.parse(new TextDecoder().decode(acik));
}
