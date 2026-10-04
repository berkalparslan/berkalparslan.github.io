/* bamstudio.dev arka ucu.
   Statik site Cloudflare'in varlık katmanından gelir; yalnız /api/* bu koda düşer.
   - POST /api/subscribe   bülten kaydı (çift onay: mail ile onay bağlantısı)
   - GET  /api/confirm     bülten onayı
   - GET  /api/unsubscribe bültenden çıkış
   - POST /api/poll        "en sevdiğin 3 uygulama" anketi; seçilen uygulamaların %20 kodlarını mailler
   - GET  /api/live        lab paneli için şu an uygulamada olan kurulumlar (anahtar ister, bkz. live())
   Veri D1'de (binding: DB), mail Resend ile (secret: RESEND_KEY). */
import APPS from "./apps.json";

const SITE = "https://bamstudio.dev";
const FROM = "Bam Studio <merhaba@bamstudio.dev>";
const REPLY = "merhaba@bamstudio.dev";
const BY = Object.fromEntries(APPS.map((a) => [a.slug, a]));
const POLL_APPS = APPS.filter((a) => a.status !== "web" && a.status !== "soon").map((a) => a.slug);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    try {
      const route = url.pathname.replace(/\/+$/, "");
      if (route === "/api/live") return await live(req, env);
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
      if (route === "/api/subscribe" && req.method === "POST") return await subscribe(req, env);
      if (route === "/api/confirm") return await confirm(url, env);
      if (route === "/api/unsubscribe") return await unsubscribe(url, env);
      if (route === "/api/poll" && req.method === "POST") return await poll(req, env);
      return json({ ok: false, error: "not_found" }, 404);
    } catch (e) {
      console.error(e && e.stack || e);
      return json({ ok: false, error: "server" }, 500);
    }
  },
};

/* ── yardımcılar ─────────────────────────────────────────── */
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, GET, OPTIONS", "access-control-allow-headers": "content-type" };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS } });
const now = () => new Date().toISOString();
const tok = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const okEmail = (e) => typeof e === "string" && e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const L = (lang) => (lang === "tr" ? "tr" : "en");

async function body(req) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await req.json();
  const f = await req.formData(); const o = {};
  for (const [k, v] of f) o[k] = k === "apps" ? (o[k] || []).concat(v) : v;
  return o;
}

/* Saatte IP başına en fazla 10 istek. */
async function limited(req, env) {
  const ip = req.headers.get("cf-connecting-ip") || "0";
  const hour = now().slice(0, 13);
  await env.DB.prepare("INSERT INTO hits(ip,hour,n) VALUES(?,?,1) ON CONFLICT(ip,hour) DO UPDATE SET n=n+1").bind(ip, hour).run();
  const r = await env.DB.prepare("SELECT n FROM hits WHERE ip=? AND hour=?").bind(ip, hour).first();
  return r && r.n > 10;
}

async function send(env, to, subject, html, text) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY, subject, html, text }),
  });
  if (!r.ok) throw new Error("resend " + r.status + " " + (await r.text()).slice(0, 200));
}

/* ── bülten ─────────────────────────────────────────────── */
async function addSubscriber(env, email, lang, source) {
  const row = await env.DB.prepare("SELECT status, token FROM subscribers WHERE email=?").bind(email).first();
  if (row && row.status === "active") return { already: true, token: row.token };
  const token = row ? row.token : tok();
  if (row) await env.DB.prepare("UPDATE subscribers SET status='pending', lang=?, source=? WHERE email=?").bind(lang, source, email).run();
  else await env.DB.prepare("INSERT INTO subscribers(email,lang,source,status,token,created_at) VALUES(?,?,?,?,?,?)").bind(email, lang, source, "pending", token, now()).run();
  return { already: false, token };
}

async function subscribe(req, env) {
  const b = await body(req);
  if (b.website) return json({ ok: true }); // bal tuzağı: botlar doldurur
  const email = String(b.email || "").trim().toLowerCase(); const lang = L(b.lang);
  if (!okEmail(email)) return json({ ok: false, error: "email" }, 400);
  if (!b.consent) return json({ ok: false, error: "consent" }, 400);
  if (await limited(req, env)) return json({ ok: false, error: "rate" }, 429);
  const s = await addSubscriber(env, email, lang, "newsletter");
  if (s.already) return json({ ok: true, already: true });
  const m = mailConfirm(lang, s.token);
  await send(env, email, m.subject, m.html, m.text);
  return json({ ok: true });
}

async function confirm(url, env) {
  const t = url.searchParams.get("t") || "";
  const row = t && await env.DB.prepare("SELECT email FROM subscribers WHERE token=?").bind(t).first();
  if (row) await env.DB.prepare("UPDATE subscribers SET status='active', confirmed_at=? WHERE token=?").bind(now(), t).run();
  return Response.redirect(`${SITE}/?bulten=${row ? "onay" : "hata"}#haberdar`, 302);
}

async function unsubscribe(url, env) {
  const t = url.searchParams.get("t") || "";
  const row = t && await env.DB.prepare("SELECT email FROM subscribers WHERE token=?").bind(t).first();
  if (row) await env.DB.prepare("UPDATE subscribers SET status='unsubscribed', unsubscribed_at=? WHERE token=?").bind(now(), t).run();
  return Response.redirect(`${SITE}/?bulten=${row ? "cikis" : "hata"}#haberdar`, 302);
}

/* ── anket ──────────────────────────────────────────────── */
async function poll(req, env) {
  const b = await body(req);
  if (b.website) return json({ ok: true });
  const email = String(b.email || "").trim().toLowerCase(); const lang = L(b.lang);
  let apps = Array.isArray(b.apps) ? b.apps : String(b.apps || "").split(",");
  apps = [...new Set(apps.map((s) => String(s).trim()).filter((s) => POLL_APPS.includes(s)))];
  if (!okEmail(email)) return json({ ok: false, error: "email" }, 400);
  if (apps.length < 1 || apps.length > 3) return json({ ok: false, error: "apps" }, 400);
  if (!b.consent) return json({ ok: false, error: "consent" }, 400);
  if (await limited(req, env)) return json({ ok: false, error: "rate" }, 429);

  const prev = await env.DB.prepare("SELECT apps FROM votes WHERE email=?").bind(email).first();
  if (prev) return json({ ok: false, error: "already" }, 409);

  const platform = ["ios", "android"].includes(b.platform) ? b.platform : "other";
  const codes = {};
  if (platform !== "android") {
    for (const slug of apps) {
      const c = await env.DB.prepare("SELECT code, expires FROM codes WHERE app=? AND assigned_to IS NULL LIMIT 1").bind(slug).first();
      if (!c) continue;
      const u = await env.DB.prepare("UPDATE codes SET assigned_to=?, assigned_at=? WHERE code=? AND assigned_to IS NULL").bind(email, now(), c.code).run();
      if (u.meta && u.meta.changes === 1) codes[slug] = { code: c.code, expires: c.expires };
    }
  }
  await env.DB.prepare("INSERT INTO votes(email,apps,lang,platform,created_at,sent_codes) VALUES(?,?,?,?,?,?)")
    .bind(email, JSON.stringify(apps), lang, platform, now(), JSON.stringify(codes)).run();

  let sub = null;
  if (b.newsletter) sub = await addSubscriber(env, email, lang, "poll");
  const m = mailPoll(lang, apps, codes, platform, sub && !sub.already ? sub.token : null);
  await send(env, email, m.subject, m.html, m.text);
  return json({ ok: true, codes: Object.keys(codes).length });
}

/* ── mail şablonları ────────────────────────────────────── */
const C = { ink: "#000000", sky: "#dceeff", sun: "#ffd731", mint: "#55db9c", lav: "#e9ccff", ember: "#fb4903" };
function shell(lang, preheader, inner, unsubToken) {
  const T = lang === "tr";
  const foot = unsubToken
    ? `<a href="${SITE}/api/unsubscribe?t=${unsubToken}" style="color:#000">${T ? "Bültenden çık" : "Unsubscribe"}</a> · `
    : "";
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Bam Studio</title></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#000">
<span style="display:none;opacity:0;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="background:${C.sky};border:2px solid #000;border-radius:28px;padding:28px 24px">${inner}</td></tr>
<tr><td style="padding:18px 6px;font-size:12px;line-height:1.5;color:#000;opacity:.75">${foot}<a href="${SITE}" style="color:#000">bamstudio.dev</a> · <a href="${SITE}/privacy/site/" style="color:#000">${T ? "Gizlilik" : "Privacy"}</a><br>${T ? "Bu maili bamstudio.dev'de seçim yapıp e-postanı bıraktığın için aldın. Cevap yazarsan doğrudan bana gelir." : "You got this email because you made your picks on bamstudio.dev. Reply and it comes straight to me."}</td></tr>
</table></td></tr></table></body></html>`;
}
const h1 = (t) => `<h1 style="margin:0 0 14px;font-family:Impact,'Arial Black',sans-serif;font-weight:900;font-size:40px;line-height:.95;text-transform:uppercase;letter-spacing:-.5px">${t}</h1>`;
const p = (t) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55">${t}</p>`;
const btn = (href, t, bg = "#000", fg = "#fff") => `<a href="${href}" style="display:inline-block;background:${bg};color:${fg};text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:999px;border:2px solid #000">${t}</a>`;

function mailConfirm(lang, token) {
  /* Bilerek sade: görsel, renkli kutu, düğme yok. Gmail kişisel yazışmaya benzeyen maili
     "Tanıtımlar" yerine "Birincil"e koyma eğiliminde. */
  const T = lang === "tr", link = `${SITE}/api/confirm?t=${token}`;
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"></head><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
<p>${T ? "Merhaba," : "Hi,"}</p>
<p>${T ? "Bam Studio bültenine katılmak istediğini görünce sevindim. Onaylamak için şu bağlantıya dokunman yeterli:" : "Glad you want to join the Bam Studio newsletter. To confirm, just tap this link:"}</p>
<p><a href="${link}">${link}</a></p>
<p>${T ? "Arada bir, yeni bir uygulama ya da büyük bir güncelleme olduğunda yazarım. İstediğin an tek tıkla çıkabilirsin." : "I write now and then, when a new app or a big update ships. You can leave any time with one click."}</p>
<p>${T ? "Bu isteği sen yapmadıysan bu maili yok sayabilirsin." : "If this wasn't you, just ignore this email."}</p>
<p>${T ? "Sevgiyle," : "Cheers,"}<br>Bam Studio<br><a href="${SITE}">bamstudio.dev</a></p>
</body></html>`;
  return { subject: T ? "Bültene katılımını onaylar mısın?" : "Can you confirm your subscription?", html, text: (T ? "Onaylamak için: " : "Confirm here: ") + link };
}

function appCard(a, lang, c) {
  const T = lang === "tr";
  const redeem = c && a.ios ? `https://apps.apple.com/redeem?ctx=offercodes&id=${a.ios}&code=${encodeURIComponent(c.code)}` : null;
  const store = a.ios ? `https://apps.apple.com/app/id${a.ios}` : a.play ? `https://play.google.com/store/apps/details?id=${a.play}` : `${SITE}${a.tour || "/"}`;
  const icon = a.icon && /\.(png|webp|svg)$/.test(a.icon) ? `${SITE}${a.icon}` : `${SITE}/assets/brand/icon-180.png`;
  const codeBox = c
    ? `<div style="margin:12px 0 6px;font-family:Menlo,Consolas,monospace;font-size:20px;font-weight:700;letter-spacing:2px;background:${C.sun};border:2px dashed #000;border-radius:14px;padding:12px 14px;text-align:center">${esc(c.code)}</div>
       <div style="font-size:12px;opacity:.75;margin-bottom:10px">${T ? "%20 indirim · tek kullanımlık" : "20% off · single use"}${c.expires ? (T ? " · son gün " : " · valid until ") + esc(c.expires) : ""}</div>
       ${btn(redeem, T ? "Kodu kullan" : "Redeem code")}`
    : `<div style="margin-top:10px">${btn(store, T ? "Mağazada aç" : "Open in store", "#fff", "#000")}</div>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;background:${a.color || C.lav};border:2px solid #000;border-radius:22px"><tr>
<td width="76" valign="top" style="padding:16px 0 16px 16px"><img src="${icon}" width="60" height="60" alt="" style="display:block;border:2px solid #000;border-radius:16px;background:#fff"></td>
<td valign="top" style="padding:16px 18px 16px 14px"><div style="font-weight:800;font-size:18px">${esc(a.name)}</div><div style="font-size:13px;opacity:.75;margin-bottom:4px">${esc(a.sub || "")}</div>${codeBox}</td></tr></table>`;
}

function mailPoll(lang, apps, codes, platform, confirmToken) {
  const T = lang === "tr";
  const got = Object.keys(codes).length;
  const cards = apps.map((s) => BY[s] && appCard(BY[s], lang, codes[s])).filter(Boolean).join("");
  const lead = platform === "android"
    ? (T ? "Seçimlerin için teşekkürler! Android'de indirim kodlarını şu an otomatik veremiyoruz. Bu maile cevap yaz, hangi uygulama için olduğunu söyle, birlikte halledelim." : "Thanks for your picks! We can't hand out Android discount codes automatically yet. Reply to this email with the app you want and we'll sort it out together.")
    : got
      ? (T ? "Seçimlerin için teşekkürler! Sevdiğin uygulamalar için %20 indirim kodların aşağıda. Her kod tek kullanımlık; \"Kodu kullan\"a dokunman yeterli, App Store açılır." : "Thanks for your picks! Here are your 20% off codes for the apps you love. Each code works once; tap \"Redeem code\" and the App Store opens.")
      : (T ? "Seçimlerin için teşekkürler! Bu uygulamalar için şu an dağıtılacak kod kalmadı ya da kodsuz uygulamalar; yine de mağaza bağlantıları aşağıda." : "Thanks for your picks! There are no codes left for these apps right now, or they don't take codes; here are their store links anyway.");
  const android = platform !== "android"
    ? p(`<span style="font-size:13px;opacity:.8">${T ? "Android kullanıyorsan bu maile cevap yaz; senin için ayrıca bakalım." : "On Android? Reply to this email and we'll sort something out."}</span>`)
    : "";
  const news = confirmToken
    ? `<div style="margin-top:18px;padding:16px;border:2px solid #000;border-radius:18px;background:${C.mint}">${p(T ? "Bültene de katılmak istedin. Onaylamak için:" : "You also asked to join the newsletter. Confirm here:")}${btn(`${SITE}/api/confirm?t=${confirmToken}`, T ? "Bülteni onayla" : "Confirm newsletter")}</div>`
    : "";
  const inner = p(T ? "Merhaba," : "Hi,") + h1(T ? "Favorilerin geldi" : "Your favourites") + p(lead) + cards + android + news +
    p(`<span style="font-size:13px;opacity:.75">${T ? "Sevgiyle, Bam Studio" : "With love, Bam Studio"}</span>`);
  const text = [T ? "Merhaba," : "Hi,", "", lead, ""].concat(apps.map((s) => {
    const a = BY[s]; if (!a) return s; const c = codes[s];
    return c && a.ios ? `${a.name}: ${c.code}\nhttps://apps.apple.com/redeem?ctx=offercodes&id=${a.ios}&code=${encodeURIComponent(c.code)}` : a.name;
  })).concat(["", T ? "Sevgiyle, Bam Studio" : "With love, Bam Studio", SITE]).join("\n");
  return { subject: T ? (got ? "Seçtiğin uygulamalar ve kodların" : "Seçimlerin için teşekkürler") : (got ? "Your picks and your codes" : "Thanks for your picks"), html: shell(lang, T ? "Merhaba, seçtiğin uygulamalar için kodları yazdım." : "Hi, here are the codes for the apps you picked.", inner, null), text };
}

/* ── canlı (lab paneli) ─────────────────────────────────────
   Uygulamaların Firestore'undaki installs/ belgelerinden son ~3 dakikada sinyal
   verenler. Kimlik: yalnız roles/datastore.viewer'ı olan servis hesabı
   (secret GCP_SA_KEY, lab-live-reader@wallet-coach-87336). Koruma: panelin
   şifreli paketinde duran paylaşılan anahtar (secret LIVE_KEY), x-live-key
   başlığıyla gelir. Kişisel alan (e-posta, ad) okunmaz, döndürülmez. */
const LIVE_ORIGINS = ["https://bamstudio.dev", "https://www.bamstudio.dev", "https://berkalparslan.github.io"];
const LIVE_APPS = [
  { slug: "walletcoach", ad: "Wallet Coach", proje: "wallet-coach-87336", tur: "installs", panel: "/lab/wallet-coach/" },
  { slug: "daily-whisper", ad: "Daily Whisper", proje: "kit-app-a91b5", tur: "installs", panel: "/lab/daily-whisper/" },
  /* O mu Bu mu?: kalp atışı yok, users.lastSeenAt yalnız açılışta yazılır → "son açanlar". */
  { slug: "o-mu-bu-mu", ad: "O mu Bu mu?", proje: "thisone-ba533", tur: "users", panel: "/lab/omubumu/" },
];
const INSTALL_ALAN = ["platform", "appVersion", "build", "language", "region", "pro", "premium", "plan", "tester", "screen", "lastScreen", "firstSeen", "lastSeen", "onboarded", "sessions", "ev.session_sec", "ev.session"];
const USER_ALAN = ["platform", "appVersion", "lastSeenAt", "createdAt", "isAnonymous", "language", "locale", "country", "region"];
let gTok = null, gTokBitis = 0, liveCache = null, liveCacheT = 0;

function liveCors(req) {
  const o = req.headers.get("origin") || "";
  return { "access-control-allow-origin": LIVE_ORIGINS.includes(o) ? o : LIVE_ORIGINS[0], "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "x-live-key", "access-control-max-age": "600", vary: "origin" };
}
function esit(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0;
}
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uStr = (s) => b64u(new TextEncoder().encode(s));

async function googleToken(env) {
  if (gTok && Date.now() < gTokBitis - 60_000) return gTok;
  const sa = JSON.parse(env.GCP_SA_KEY);
  const simdi = Math.floor(Date.now() / 1000);
  const govde = `${b64uStr(JSON.stringify({ alg: "RS256", typ: "JWT", kid: sa.private_key_id }))}.${b64uStr(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: simdi, exp: simdi + 3600 }))}`;
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const anahtar = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const imza = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", anahtar, new TextEncoder().encode(govde));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${govde}.${b64u(imza)}` }) });
  const j = await r.json();
  if (!r.ok) throw new Error("google token " + r.status + " " + (j.error || ""));
  gTok = j.access_token; gTokBitis = Date.now() + (j.expires_in || 3600) * 1000;
  return gTok;
}

const fsDeger = (f) => {
  if (!f) return null;
  if ("mapValue" in f) return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, v]) => [k, fsDeger(v)]));
  if ("integerValue" in f) return Number(f.integerValue);
  if ("doubleValue" in f) return f.doubleValue;
  return f.stringValue ?? f.timestampValue ?? f.booleanValue ?? null;
};
async function fsSorgu(tok, proje, parent, sorgu) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${proje}/databases/(default)/documents${parent}:runQuery`, {
    method: "POST", headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" }, body: JSON.stringify({ structuredQuery: sorgu }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${(j.error?.message || j[0]?.error?.message || "").slice(0, 120)}`);
  return j.filter((x) => x.document).map((x) => ({ id: x.document.name.split("/").pop(), ...Object.fromEntries(Object.entries(x.document.fields || {}).map(([k, v]) => [k, fsDeger(v)])) }));
}
async function fsSay(tok, proje, tur, alan, sinceIso) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${proje}/databases/(default)/documents:runAggregationQuery`, {
    method: "POST", headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" },
    body: JSON.stringify({ structuredAggregationQuery: { structuredQuery: { from: [{ collectionId: tur }], where: { fieldFilter: { field: { fieldPath: alan }, op: "GREATER_THAN_OR_EQUAL", value: { timestampValue: sinceIso } } } }, aggregations: [{ alias: "n", count: {} }] } }) });
  const j = await r.json();
  if (!r.ok) return null;
  return Number(j[0]?.result?.aggregateFields?.n?.integerValue ?? 0);
}
const iso = (ms) => new Date(ms).toISOString();

/* Oturumun başı: zaman çizelgesinde son "session" olayından (önceki oturumun
   kapanışı) sonraki ilk olay. Olay yoksa bilinmiyor. */
async function oturumBasi(tok, a, id) {
  try {
    const l = await fsSorgu(tok, a.proje, `/installs/${encodeURIComponent(id)}`, { from: [{ collectionId: "events" }], select: { fields: [{ fieldPath: "t" }, { fieldPath: "e" }] }, orderBy: [{ field: { fieldPath: "t" }, direction: "DESCENDING" }], limit: 60 });
    let bas = null;
    for (const e of l) { if (e.e === "session") break; bas = e.t; }
    return bas;
  } catch { return null; }
}

async function uygulamaCanli(tok, a, simdi) {
  const ESIK = 3 * 60_000;
  if (a.tur === "users") {
    const l = await fsSorgu(tok, a.proje, "", { from: [{ collectionId: "users" }], select: { fields: USER_ALAN.map((f) => ({ fieldPath: f })) },
      where: { fieldFilter: { field: { fieldPath: "lastSeenAt" }, op: "GREATER_THAN_OR_EQUAL", value: { timestampValue: iso(simdi - 10 * 60_000) } } },
      orderBy: [{ field: { fieldPath: "lastSeenAt" }, direction: "DESCENDING" }], limit: 100 });
    const [s15, s60, s24] = await Promise.all([15, 60, 1440].map((m) => fsSay(tok, a.proje, "users", "lastSeenAt", iso(simdi - m * 60_000))));
    return { slug: a.slug, ad: a.ad, panel: a.panel, tur: "acilis", son15: s15, son60: s60, son24: s24,
      liste: l.map((u) => ({ id: u.id.slice(0, 8), ekran: null, ulke: u.country || u.region || null, dil: u.language || u.locale || null, platform: u.platform || null,
        surum: u.appVersion || null, pro: false, test: false, sonSinyal: u.lastSeenAt, oturumBasi: u.lastSeenAt, toplamSn: null, ilk: u.createdAt || null, canli: simdi - Date.parse(u.lastSeenAt) < ESIK })) };
  }
  const l = await fsSorgu(tok, a.proje, "", { from: [{ collectionId: "installs" }], select: { fields: INSTALL_ALAN.map((f) => ({ fieldPath: f })) },
    where: { fieldFilter: { field: { fieldPath: "lastSeen" }, op: "GREATER_THAN_OR_EQUAL", value: { timestampValue: iso(simdi - ESIK) } } },
    orderBy: [{ field: { fieldPath: "lastSeen" }, direction: "DESCENDING" }], limit: 150 });
  const on = l.filter((i) => i.screen && i.screen !== "closed");
  const [s15, s60, s24] = await Promise.all([15, 60, 1440].map((m) => fsSay(tok, a.proje, "installs", "lastSeen", iso(simdi - m * 60_000))));
  const baslar = await Promise.all(on.slice(0, 25).map((i) => oturumBasi(tok, a, i.id)));
  return { slug: a.slug, ad: a.ad, panel: a.panel, tur: "kalp", son15: s15, son60: s60, son24: s24,
    yeniKapanan: l.filter((i) => i.screen === "closed").length,
    liste: on.map((i, k) => ({ id: i.id.slice(0, 8), ekran: i.screen, oncekiEkran: i.lastScreen || null, ulke: /^[A-Z]{2}$/.test(i.region || "") ? i.region : null, dil: i.language || null,
      platform: i.platform || null, surum: i.appVersion ? `${i.appVersion}${i.build ? ` (${i.build})` : ""}` : null, pro: !!(i.pro || i.premium), plan: i.plan || null,
      test: !!i.tester, onboarded: i.onboarded ?? null, sonSinyal: i.lastSeen, oturumBasi: baslar[k] || null, ilk: i.firstSeen || null,
      toplamSn: i.ev?.session_sec ?? null, oturumSay: i.ev?.session ?? i.sessions ?? null, canli: true })) };
}

async function live(req, env) {
  const cors = liveCors(req);
  const yanit = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...cors } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET") return yanit({ ok: false, error: "method" }, 405);
  if (!env.LIVE_KEY || !env.GCP_SA_KEY) return yanit({ ok: false, error: "not_configured" }, 503);
  if (!esit(req.headers.get("x-live-key") || "", env.LIVE_KEY)) return yanit({ ok: false, error: "unauthorized" }, 401);
  /* Aynı isolate'te 10 sn önbellek: panel birden çok sekmede açıksa Firestore'u dövmesin. */
  if (liveCache && Date.now() - liveCacheT < 10_000) return yanit(liveCache);
  const simdi = Date.now();
  const tok = await googleToken(env);
  const apps = await Promise.all(LIVE_APPS.map((a) => uygulamaCanli(tok, a, simdi).catch((e) => ({ slug: a.slug, ad: a.ad, panel: a.panel, hata: String(e.message || e).slice(0, 160), liste: [] }))));
  liveCache = { ok: true, zaman: iso(simdi), esikDk: 3, toplam: apps.reduce((t, a) => t + a.liste.filter((x) => x.canli).length, 0), apps };
  liveCacheT = Date.now();
  return yanit(liveCache);
}
