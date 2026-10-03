/* bamstudio.dev arka ucu.
   Statik site Cloudflare'in varlık katmanından gelir; yalnız /api/* bu koda düşer.
   - POST /api/subscribe   bülten kaydı (çift onay: mail ile onay bağlantısı)
   - GET  /api/confirm     bülten onayı
   - GET  /api/unsubscribe bültenden çıkış
   - POST /api/poll        "en sevdiğin 3 uygulama" anketi; seçilen uygulamaların %20 kodlarını mailler
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
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
      const route = url.pathname.replace(/\/+$/, "");
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
<body style="margin:0;padding:0;background:${C.sky};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#000">
<span style="display:none;opacity:0;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sky}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 0 16px"><img src="${SITE}/assets/brand/icon-180.png" width="56" height="56" alt="Bam Studio" style="display:block;border:0;border-radius:14px"></td></tr>
<tr><td style="background:#fff;border:2px solid #000;border-radius:28px;padding:30px 28px">${inner}</td></tr>
<tr><td style="padding:18px 6px;font-size:12px;line-height:1.5;color:#000;opacity:.75">${foot}<a href="${SITE}" style="color:#000">bamstudio.dev</a> · <a href="${SITE}/privacy/site/" style="color:#000">${T ? "Gizlilik" : "Privacy"}</a><br>${T ? "Bu maili bamstudio.dev'de e-postanı bıraktığın için aldın." : "You got this email because you left your address on bamstudio.dev."}</td></tr>
</table></td></tr></table></body></html>`;
}
const h1 = (t) => `<h1 style="margin:0 0 14px;font-family:Impact,'Arial Black',sans-serif;font-weight:900;font-size:40px;line-height:.95;text-transform:uppercase;letter-spacing:-.5px">${t}</h1>`;
const p = (t) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55">${t}</p>`;
const btn = (href, t, bg = "#000", fg = "#fff") => `<a href="${href}" style="display:inline-block;background:${bg};color:${fg};text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:999px;border:2px solid #000">${t}</a>`;

function mailConfirm(lang, token) {
  const T = lang === "tr", link = `${SITE}/api/confirm?t=${token}`;
  const inner = h1(T ? "Bir tık kaldı" : "One more tap") +
    p(T ? "Bam Studio bültenine katılmak için e-postanı onayla. Yeni uygulamalar ve büyük güncellemeler çıktığında, arada bir yazarız. Spam yok." : "Confirm your email to join the Bam Studio newsletter. We write now and then, when a new app or a big update ships. No spam.") +
    `<p style="margin:22px 0">${btn(link, T ? "Evet, haberdar et" : "Yes, keep me posted")}</p>` +
    p(`<span style="font-size:13px;opacity:.7">${T ? "Bu isteği sen yapmadıysan bu maili yok sayabilirsin." : "If this wasn't you, just ignore this email."}</span>`);
  return { subject: T ? "Bam Studio bültenini onayla" : "Confirm the Bam Studio newsletter", html: shell(lang, T ? "Bir tıkla onayla" : "Confirm with one tap", inner, null), text: (T ? "Onaylamak için: " : "Confirm here: ") + link };
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
  const inner = h1(T ? "Favorilerin geldi" : "Your favourites") + p(lead) + cards + android + news +
    p(`<span style="font-size:13px;opacity:.75">${T ? "Sevgiyle, Bam Studio" : "With love, Bam Studio"}</span>`);
  const text = (T ? "Seçtiklerin: " : "Your picks: ") + apps.map((s) => (BY[s] ? BY[s].name : s) + (codes[s] ? ` ${codes[s].code}` : "")).join(", ");
  return { subject: T ? (got ? "%20 indirim kodların burada" : "Seçimlerin için teşekkürler") : (got ? "Your 20% off codes are here" : "Thanks for your picks"), html: shell(lang, T ? "En sevdiğin uygulamalar için hediye" : "A little gift for your favourite apps", inner, null), text };
}
