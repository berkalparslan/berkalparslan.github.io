/* Panel iOS uygulamasına (dev.bamstudio.panel) APNs gönderimi; rapor-gonder.mjs
   ve uyari.mjs ortak kullanır.

   Jetonlar site Worker'ında (GET https://bamstudio.dev/api/panel-device,
   x-live-key = Keychain bamtech-lab-live). APNs: Berk takımının tek .p8 anahtarı
   (~/dev/p8, Key 2972UYSCQ2), ES256 JWT, HTTP/2. Geliştirme imzalı kurulum
   sandbox'a, dağıtım imzalı production'a gider. 410 / BadDeviceToken /
   Unregistered dönen jeton Worker'dan silinir. */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createSign } from "node:crypto";
import http2 from "node:http2";

export const SITE_API = "https://bamstudio.dev/api";
export const CIHAZ_UC = `${SITE_API}/panel-device`;
const TOPIC = "dev.bamstudio.panel";
const TEAM = "949JRVJB94", KEY_ID = "2972UYSCQ2";
export const P8 = join(homedir(), "dev", "p8", `AuthKey_${KEY_ID}.p8`);
const HOST = { development: "https://api.sandbox.push.apple.com", production: "https://api.push.apple.com" };

export function liveAnahtar() {
  if (process.env.LAB_LIVE_KEY) return process.env.LAB_LIVE_KEY;
  try { return execFileSync("security", ["find-generic-password", "-s", "bamtech-lab-live", "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
}

function jwt() {
  const b64u = o => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
  const govde = `${b64u({ alg: "ES256", kid: KEY_ID })}.${b64u({ iss: TEAM, iat: Math.floor(Date.now() / 1000) })}`;
  const imza = createSign("SHA256").update(govde).sign({ key: readFileSync(P8, "utf8"), dsaEncoding: "ieee-p1363" });
  return `${govde}.${imza.toString("base64url")}`;
}

function tekGonder(oturum, token, yuk, tok, collapse) {
  return new Promise(res => {
    const r = oturum.request({
      ":method": "POST", ":path": `/3/device/${token}`,
      authorization: `bearer ${tok}`, "apns-topic": TOPIC, "apns-push-type": "alert", "apns-priority": "10",
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 12 * 3600),
      ...(collapse ? { "apns-collapse-id": collapse.slice(0, 64) } : {}),
      "content-type": "application/json"
    });
    let durum = 0, govde = "";
    r.on("response", h => { durum = h[":status"]; });
    r.on("data", d => { govde += d; });
    r.on("end", () => { let neden = null; try { neden = JSON.parse(govde || "{}").reason || null; } catch { } res({ durum, neden }); });
    r.on("error", e => res({ durum: 0, neden: e.message }));
    r.end(JSON.stringify(yuk));
  });
}

/** Kayıtlı cihazlar: [{ token, env, ... }]. */
export async function cihazlar(K = liveAnahtar()) {
  if (!K) throw new Error("LIVE anahtarı yok (Keychain: bamtech-lab-live)");
  const jr = await fetch(CIHAZ_UC, { headers: { "x-live-key": K }, signal: AbortSignal.timeout(20000) });
  if (!jr.ok) throw new Error(`jeton listesi alınamadı: HTTP ${jr.status}`);
  return (await jr.json()).devices || [];
}

/** Yükü kayıtlı her cihaza gönderir, ölü jetonu siler. → { basarili, toplam } */
export async function apnsGonder(yuk, { collapse = null, log = console.log, K = liveAnahtar(), liste = null } = {}) {
  const l = liste || await cihazlar(K);
  if (!l.length) return { basarili: 0, toplam: 0 };
  if (!existsSync(P8)) throw new Error(`APNs anahtarı yok: ${P8}`);
  const tok = jwt();
  const oturumlar = {};
  let basarili = 0;
  try {
    for (const c of l) {
      const host = HOST[c.env] || HOST.production;
      const o = oturumlar[host] ||= http2.connect(host);
      const { durum, neden } = await tekGonder(o, c.token, yuk, tok, collapse);
      if (durum === 200) { basarili++; log(`  ✓ ${c.token.slice(0, 8)}… (${c.env})`); continue; }
      log(`  ✗ ${c.token.slice(0, 8)}… (${c.env}) HTTP ${durum} ${neden || ""}`);
      if (durum === 410 || ["BadDeviceToken", "Unregistered", "DeviceTokenNotForTopic"].includes(neden)) {
        const d = await fetch(`${CIHAZ_UC}?token=${c.token}`, { method: "DELETE", headers: { "x-live-key": K } });
        log(`    ölü jeton silindi (${d.status})`);
      }
    }
  } finally { for (const o of Object.values(oturumlar)) o.close(); }
  return { basarili, toplam: l.length };
}
