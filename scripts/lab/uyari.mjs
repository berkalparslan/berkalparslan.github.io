#!/usr/bin/env node
/**
 * Anlık uyarılar: sabah raporunu beklemeden önemli olayı Panel iOS'a push eder.
 *
 *   node scripts/lab/uyari.mjs            kontrol et, yeni olanı bildir (launchd 30 dk'da bir)
 *   node scripts/lab/uyari.mjs --kuru     kontrol et, uyarıları yazdır; gönderme, yazma, durumu kaydetme
 *   node scripts/lab/uyari.mjs --test     "Uyarılar çalışıyor" deneme uyarısı (Worker + push), başka bir şey yapmaz
 *   node scripts/lab/uyari.mjs --anomali  anomali kontrolünü bugün yapıldıysa da yeniden yap
 *
 * Kaynaklar (yalnız okuma):
 *   - Yeni mağaza yorumu: App Store Connect customerReviews (config.aberk/page),
 *     Play `gplay reviews list` (API son 7 günü veriyor). Yorumcu adı alınmaz.
 *   - Mağaza durumu: App Store en yeni sürümün durumu (incelemede, onaylandı,
 *     yayın bekliyor, reddedildi, metadata reddi); Play production track'inde yeni sürüm.
 *   - Satın alma / deneme: telemetrili projelerde (telemetri.mjs PROJELER)
 *     installs.purchasedAt son 3 gün (runQuery, yalnız eşleşen belgeler okunur).
 *     Uygulama, plan, kaynak, ülke; test cihazı (tester: true) hariç.
 *   - Anomali (günde bir, 12:00 TSİ sonrası ilk çalışma): aktif kullanıcı 7 gün
 *     ortalamasının yarısının altında; 2 gündür kurulum yok ama önceki hafta var;
 *     bir veri kaynağı 3 gündür yenilenmiyor.
 *   - Bildirim Worker'ları: /health ready false→true bilgi; iki kez üst üste erişilemezse uyarı.
 *
 * Durum: ~/dev/vault/metrikler/veri/uyari-durum.json. Bir kaynak (uygulama,
 * hesap, Worker) durumda ilk kez görülünce mevcut her şey "görüldü" sayılır,
 * eski olaylar bildirilmez.
 *
 * Gönderim: uyarı hemen site Worker'ına yazılır (POST /api/panel-alerts, son 200),
 * push apns.mjs ile. 00:00-08:00 TSİ arası yalnız öncelikli (reddedildi, 1-2★)
 * hemen gider; diğerleri 08:00 sonrası ilk çalışmada toplu gider. Aynı çalışmada
 * birden çok uyarı tek bildirimde toplanır. Yükte `uyari: "<id>"`.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

import { APPS, SLUG_APP } from "./apps.mjs";
import { ascIstemci } from "./uzak/asc.mjs";
import { PROJELER, firebaseToken, deger, telemetri } from "./telemetri.mjs";
import { VERI } from "./ham.mjs";
import { SITE_API, liveAnahtar, apnsGonder } from "./apns.mjs";

const args = process.argv.slice(2);
const KURU = args.includes("--kuru"), TEST = args.includes("--test"), ANOMALI_ZORLA = args.includes("--anomali");
const DURUM_YOL = process.env.UYARI_DURUM || join(VERI, "uyari-durum.json");
const UYARI_UC = `${SITE_API}/panel-alerts`;

/* Uygulamaların bildirim Worker'ları (lab panellerindeki adresler). */
const BILDIRIM_WORKER = [
  { uygulama: "leafbook", url: "https://leafbook-push.kittapcom.workers.dev" },
  { uygulama: "daily-whisper", url: "https://daily-whisper-push.kittapcom.workers.dev" },
  { uygulama: "tasbih-tally", url: "https://tasbih-push.kittapcom.workers.dev" },
  { uygulama: "walletcoach", url: "https://wallet-coach-push.kittapcom.workers.dev" },
  { uygulama: "matchday", url: "https://matchday-push.kittapcom.workers.dev" },
  { uygulama: null, ad: "Bam Sports", url: "https://bam-sports-push.kittapcom.workers.dev" },
  { uygulama: "o-mu-bu-mu", url: "https://omubumu-upload.kittapcom.workers.dev" }
];

const ONCELIK_SIRA = { yuksek: 0, normal: 1, dusuk: 2 };
const simdi = new Date();
const trGun = (d = simdi) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
const trSaat = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Istanbul" }).format(simdi));
const bugun = trGun();
const gunEkle = (g, n) => { const d = new Date(`${g}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ozet = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
/* Uygulama metni kuralı: uzun/orta tire yok. */
const temiz = s => String(s || "").replace(/\s*[—–]\s*/g, ", ");
const kisaId = (tur, anahtar) => `${tur}-${createHash("sha1").update(anahtar).digest("hex").slice(0, 12)}`;
const appAd = slug => SLUG_APP.get(slug)?.ad || slug;
const log = (...a) => console.log(...a);

/* ── durum ── */
const ilkKez = !existsSync(DURUM_YOL);
const D = ilkKez ? {} : JSON.parse(readFileSync(DURUM_YOL, "utf8"));
D.surum = 1; D.tohum ||= simdi.toISOString();
for (const k of ["yorum", "yorumTohum", "ios", "play", "satis", "satisTohum", "saglik", "aktif", "anomali", "dwai"]) D[k] ||= {};
D.bekleyen ||= []; D.yazilacak ||= [];

const yeni = [];
function uyar(u) {
  /* İlk çalışma yalnız tohumlar: eski olay bildirilmez. */
  if (ilkKez && u.tur !== "test") return;
  const a = { t: simdi.toISOString(), uygulama: null, oncelik: "normal", ...u };
  a.baslik = ozet(temiz(a.baslik), 80); a.govde = ozet(temiz(a.govde), 240);
  yeni.push(a);
}

function sh(cmd, argv) {
  try { return { ok: true, out: execFileSync(cmd, argv, { encoding: "utf8", maxBuffer: 32 << 20, stdio: ["ignore", "pipe", "pipe"], timeout: 60000 }) }; }
  catch (e) { return { ok: false, out: (e.stdout || "") + (e.stderr || e.message || "") }; }
}

/* ── App Store Connect hesapları (collect.mjs ile aynı: hesap dosyası adıyla) ── */
function ascHesap(ad) {
  const yol = join(homedir(), ".ascelerate", `config.${ad}.json`);
  if (!existsSync(yol)) return null;
  const c = JSON.parse(readFileSync(yol, "utf8"));
  const pem = readFileSync(String(c.privateKeyPath).replace(/^~/, homedir()), "utf8");
  return ascIstemci({ ASC_KEY_ID: c.keyId, ASC_ISSUER_ID: c.issuerId, ASC_PRIVATE_KEY: pem });
}

const YILDIZ = n => `${n}★`;
function yorumUyar({ slug, magaza, id, puan, baslik, metin }) {
  const p = Number(puan) || 0;
  uyar({
    id: kisaId("yorum", `${magaza}:${id}`), tur: "yorum", uygulama: slug,
    oncelik: p && p <= 2 ? "yuksek" : p === 3 ? "normal" : "dusuk",
    baslik: `${appAd(slug)} · ${YILDIZ(p || "?")} yorum (${magaza === "ios" ? "App Store" : "Play"})`,
    govde: [baslik ? `"${ozet(baslik, 60)}"` : "", ozet(metin, 160)].filter(Boolean).join(" ") || "Metinsiz puan."
  });
}

const IOS_DURUM = {
  IN_REVIEW: { ne: "incelemeye girdi", o: "normal" },
  PENDING_DEVELOPER_RELEASE: { ne: "onaylandı, yayın senin elinde (Pending Developer Release)", o: "normal" },
  PENDING_APPLE_RELEASE: { ne: "onaylandı, Apple yayınlayacak", o: "normal" },
  ACCEPTED: { ne: "kabul edildi", o: "normal" },
  READY_FOR_DISTRIBUTION: { ne: "onaylandı, App Store'da (Ready for Distribution)", o: "normal" },
  REJECTED: { ne: "reddedildi", o: "yuksek" },
  METADATA_REJECTED: { ne: "metadata reddedildi", o: "yuksek" },
  INVALID_BINARY: { ne: "binary geçersiz sayıldı", o: "yuksek" }
};

async function appStore() {
  for (const hesap of ["aberk", "page"]) {
    let api, kimlik;
    try { api = ascHesap(hesap); if (!api) { log(`  asc ${hesap}: hesap dosyası yok`); continue; } kimlik = await api.uygulamalar(); }
    catch (e) { log(`  asc ${hesap} ✗ ${e.message.slice(0, 120)}`); continue; }
    for (const app of APPS.filter(a => a.ios && (a.ios.hesap || "aberk") === hesap)) {
      const id = kimlik[app.ios.bundle]?.id; if (!id) continue;
      /* yorumlar */
      try {
        const y = await api.yorumlar(id), anahtar = `ios:${app.slug}`;
        const tohum = !D.yorumTohum[anahtar];
        let n = 0;
        for (const r of y.liste) {
          if (!r.id) continue;
          const k = `ios:${r.id}`; if (D.yorum[k]) continue;
          D.yorum[k] = bugun;
          if (!tohum) { yorumUyar({ slug: app.slug, magaza: "ios", id: r.id, puan: r.puan, baslik: r.baslik, metin: r.metin }); n++; }
        }
        D.yorumTohum[anahtar] ||= bugun;
        if (n) log(`  yorum ${app.slug} (App Store) +${n}`);
      } catch (e) { log(`  yorum ${app.slug} ✗ ${e.message.slice(0, 100)}`); }
      /* sürüm durumu: platform başına en yeni sürüm */
      try {
        const l = await api.surumler(id);
        const enYeni = {};
        for (const v of l) if (!enYeni[v.platform]) enYeni[v.platform] = v;
        const eski = D.ios[app.slug];
        const durum = {};
        for (const [pl, v] of Object.entries(enYeni)) {
          durum[pl] = `${v.surum}|${v.durum}`;
          if (!eski || eski[pl] === durum[pl] || !IOS_DURUM[v.durum]) continue;
          const [eskiSurum, eskiDurum] = String(eski[pl] || "|").split("|");
          if (eskiSurum === v.surum && eskiDurum === v.durum) continue;
          const t = IOS_DURUM[v.durum];
          uyar({ id: kisaId("durum", `ios:${app.slug}:${pl}:${v.surum}:${v.durum}`), tur: "durum", uygulama: app.slug, oncelik: t.o,
            baslik: `${appAd(app.slug)} ${v.surum} ${t.ne.split(" (")[0]}`,
            govde: `App Store${pl !== "IOS" ? ` (${pl})` : ""}: ${v.surum} ${t.ne}.${eskiDurum && eskiSurum === v.surum ? ` Önceki durum: ${eskiDurum}.` : ""}` });
        }
        D.ios[app.slug] = durum;
      } catch (e) { log(`  sürüm ${app.slug} ✗ ${e.message.slice(0, 100)}`); }
    }
  }
}

function play() {
  for (const app of APPS.filter(a => a.android)) {
    /* yorumlar (Play API son 7 gün) */
    const rv = sh("gplay", ["reviews", "list", "--package", app.android]);
    if (rv.ok) {
      let liste = [];
      try { liste = JSON.parse(rv.out || "{}").reviews || []; } catch { }
      const anahtar = `play:${app.slug}`, tohum = !D.yorumTohum[anahtar];
      let n = 0;
      for (const r of liste) {
        if (!r.reviewId) continue;
        const k = `play:${r.reviewId}`; if (D.yorum[k]) continue;
        D.yorum[k] = bugun;
        const u = (r.comments || []).map(c => c.userComment).find(Boolean) || {};
        if (!tohum) { yorumUyar({ slug: app.slug, magaza: "play", id: r.reviewId, puan: u.starRating, baslik: "", metin: u.text }); n++; }
      }
      D.yorumTohum[anahtar] ||= bugun;
      if (n) log(`  yorum ${app.slug} (Play) +${n}`);
    } else log(`  play yorum ${app.slug} ✗ ${rv.out.trim().slice(0, 100)}`);

    /* production track */
    let prod = null, okundu = false;
    for (let deneme = 0; deneme < 2 && !okundu; deneme++) {
      const s = sh("gplay", ["status", "--package", app.android]);
      if (!s.ok) continue;
      try {
        const tr = JSON.parse(s.out).tracks?.tracks || [];
        if (!tr.length) continue;
        okundu = true;
        const p = tr.find(t => t.track === "production");
        const r = p?.releases?.[0];
        if (r) prod = { ad: r.name, durum: r.status };
      } catch { }
    }
    if (!okundu) { log(`  play durum ${app.slug} ✗ okunamadı`); continue; }
    const imza = prod ? `${prod.ad}|${prod.durum}` : "";
    const eski = D.play[app.slug];
    if (eski !== undefined && prod && imza !== eski && ["completed", "inProgress"].includes(prod.durum)) {
      const [eskiAd] = String(eski).split("|");
      if (eskiAd !== prod.ad || prod.durum === "completed") {
        const kademeli = prod.durum === "inProgress";
        uyar({ id: kisaId("durum", `play:${app.slug}:${imza}`), tur: "durum", uygulama: app.slug, oncelik: "normal",
          baslik: `${appAd(app.slug)} ${prod.ad} Play'de ${kademeli ? "kademeli yayında" : "üretimde"}`,
          govde: `Google Play production: ${prod.ad} ${kademeli ? "kademeli yayına başladı" : "yayına çıktı"}.${eskiAd && eskiAd !== prod.ad ? ` Önceki: ${eskiAd}.` : ""}` });
      }
    }
    D.play[app.slug] = imza;
  }
}

/* ── satın alma / deneme (Firestore runQuery, purchasedAt son 3 gün) ── */
const SATIS_ALAN = ["purchasedAt", "plan", "buySource", "region", "tester", "app", "platform"];
async function satislar() {
  let token;
  try { token = await firebaseToken(); }
  catch (e) { log(`  satış ✗ firebase oturumu: ${e.message}`); return; }
  const esik = new Date(simdi.getTime() - 3 * 864e5).toISOString();
  for (const [proje, h] of Object.entries(PROJELER)) {
    try {
      const r = await fetch(`https://firestore.googleapis.com/v1/projects/${proje}/databases/(default)/documents:runQuery`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ structuredQuery: {
          from: [{ collectionId: "installs" }],
          where: { fieldFilter: { field: { fieldPath: "purchasedAt" }, op: "GREATER_THAN", value: { timestampValue: esik } } },
          select: { fields: SATIS_ALAN.map(f => ({ fieldPath: f })) }, limit: 200 } }),
        signal: AbortSignal.timeout(30000)
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`${r.status} ${(Array.isArray(j) ? j[0] : j)?.error?.message?.slice(0, 100) || ""}`);
      const tohum = !D.satisTohum[proje];
      let n = 0;
      for (const x of j) {
        if (!x.document) continue;
        const docId = x.document.name.split("/").pop();
        const f = Object.fromEntries(SATIS_ALAN.map(a => [a, deger(x.document.fields?.[a])]));
        const k = `${proje}:${docId}:${f.purchasedAt}`;
        if (D.satis[k]) continue;
        D.satis[k] = bugun;
        if (tohum || f.tester) continue;
        const slug = typeof h === "string" ? h : h[f.app];
        if (!slug) continue;
        const plan = String(f.plan || "");
        const deneme = /trial|deneme/i.test(plan);
        const parca = [plan && `plan ${ozet(plan, 40)}`, f.buySource && `kaynak ${ozet(f.buySource, 30)}`,
          /^[A-Z]{2}$/.test(f.region || "") && `ülke ${f.region}`, f.platform && String(f.platform).toLowerCase()].filter(Boolean);
        uyar({ id: kisaId("satis", k), tur: "satis", uygulama: slug, oncelik: "normal",
          baslik: `${appAd(slug)} · yeni ${deneme ? "deneme" : "satın alma"}`,
          govde: parca.length ? parca.join(" · ") : "Ayrıntı yok." });
        n++;
      }
      D.satisTohum[proje] ||= bugun;
      if (n) log(`  satış ${proje} +${n}`);
    } catch (e) { log(`  satış ${proje} ✗ ${e.message}`); }
  }
}

/* ── bildirim Worker'ları ── */
async function saglik() {
  const sonuc = [];
  for (const w of BILDIRIM_WORKER) {
    let j = null, hata = null, ag = false;
    try {
      const r = await fetch(`${w.url}/health`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      j = await r.json().catch(() => null);
      if (!r.ok || !j) hata = `HTTP ${r.status}`;
    } catch (e) { hata = e.name === "TimeoutError" ? "zaman aşımı" : e.message; ag = true; }
    sonuc.push({ w, j, hata, ag });
  }
  /* Hepsi ağ hatasıysa sorun büyük ihtimalle Mac'in interneti; Worker dışı bir adresle doğrula, durumu değiştirme. */
  if (sonuc.every(x => x.ag)) {
    const internet = await fetch("https://www.google.com/generate_204", { cache: "no-store", signal: AbortSignal.timeout(10000) })
      .then(() => true, () => false);
    if (!internet) { log("  internet yoktu, Worker kontrolü atlandı"); return; }
  }
  for (const { w, j, hata } of sonuc) {
    const ad = w.uygulama ? appAd(w.uygulama) : w.ad;
    const eski = D.saglik[w.url];
    const s = { ...(eski || {}), t: simdi.toISOString() };
    if (hata) {
      s.hata = (s.hata || 0) + 1;
      if (eski && s.hata >= 2 && !s.uyarildi) {
        s.uyarildi = true;
        uyar({ id: kisaId("saglik", `${w.url}:yok:${simdi.toISOString().slice(0, 13)}`), tur: "saglik", uygulama: w.uygulama, oncelik: "normal",
          baslik: `${ad} bildirim Worker'ına erişilemiyor`, govde: `${w.url.replace("https://", "")}/health iki kontroldür yanıt vermiyor (${ozet(hata, 60)}). Panelden bildirim gönderilemez.` });
      }
    } else {
      if (eski?.uyarildi) uyar({ id: kisaId("saglik", `${w.url}:geri:${simdi.toISOString().slice(0, 13)}`), tur: "saglik", uygulama: w.uygulama, oncelik: "dusuk",
        baslik: `${ad} bildirim Worker'ı yeniden yanıt veriyor`, govde: `${w.url.replace("https://", "")}/health tekrar erişilebilir.` });
      s.hata = 0; s.uyarildi = false;
      if (eski && eski.ready === false && j.ready === true) uyar({ id: kisaId("saglik", `${w.url}:ready`), tur: "saglik", uygulama: w.uygulama, oncelik: "dusuk",
        baslik: `${ad} bildirimleri hazır`, govde: `Bildirim Worker'ı artık hazır (ready: true). Panelden bildirim gönderilebilir.` });
      if (eski && eski.apnsReady === false && j.apnsReady === true) uyar({ id: kisaId("saglik", `${w.url}:apns`), tur: "saglik", uygulama: w.uygulama, oncelik: "dusuk",
        baslik: `${ad} iOS bildirimleri hazır`, govde: `Bildirim Worker'ında APNs artık hazır (apnsReady: true).` });
      s.ready = j.ready ?? null; if ("apnsReady" in j) s.apnsReady = j.apnsReady;
    }
    D.saglik[w.url] = s;
  }
}

/* ── Daily Whisper AI: Gemini hataları, eski anahtar sıçraması, proxy sınırı ──
 * Kredi bitince ya da kota dolunca Gemini 429/403/402 döner; 503 (model yoğun) zincirle
 * karşılandığı için sayılmaz. Son 3 saatte 10+ hata ve %20+ oran: yüksek öncelik.
 * Proxy dışı anahtarda 3 saatte 300+ istek: anahtar sızmış olabilir.
 * Proxy günlük çağrısı uygulama sınırının %70'ini geçerse: sınırı yükseltme zamanı. */
const DW_PROJE = "kit-app-a91b5", DW_PROXY_ANAHTAR = "ai-proxy-dailywhisper";
async function dwAI() {
  const S = D.dwai ||= {};
  try {
    const t = await firebaseToken();
    const isim = Object.fromEntries(((await (await fetch(`https://apikeys.googleapis.com/v2/projects/${DW_PROJE}/locations/global/keys`,
      { headers: { Authorization: `Bearer ${t}` } })).json()).keys || []).map(k => [k.uid, k.displayName]));
    const u = new URL(`https://monitoring.googleapis.com/v3/projects/${DW_PROJE}/timeSeries`);
    u.searchParams.set("filter", 'metric.type="serviceruntime.googleapis.com/api/request_count" AND resource.labels.service="generativelanguage.googleapis.com"');
    u.searchParams.set("interval.startTime", new Date(simdi - 3 * 36e5).toISOString());
    u.searchParams.set("interval.endTime", simdi.toISOString());
    u.searchParams.set("aggregation.alignmentPeriod", "10800s");
    u.searchParams.set("aggregation.perSeriesAligner", "ALIGN_SUM");
    u.searchParams.set("aggregation.crossSeriesReducer", "REDUCE_SUM");
    u.searchParams.append("aggregation.groupByFields", "metric.labels.response_code");
    u.searchParams.append("aggregation.groupByFields", "resource.labels.credential_id");
    const j = await (await fetch(u, { headers: { Authorization: `Bearer ${t}` } })).json();
    if (j.error) throw new Error(j.error.message);
    let toplam = 0, hata = 0; const kodlar = {}, digerAnahtar = {};
    for (const s of j.timeSeries || []) {
      const ad = isim[(s.resource.labels.credential_id || "").replace(/^apikey:/, "")] || "?";
      if (/auto created by Firebase/.test(ad)) continue; // Firebase anahtarları zaten 403, gürültü
      const kod = Number(s.metric.labels.response_code), n = s.points.reduce((a, p) => a + Number(p.value.int64Value || 0), 0);
      toplam += n;
      if (kod !== 200 && kod !== 503 && kod !== 499) { hata += n; kodlar[kod] = (kodlar[kod] || 0) + n; }
      if (ad !== DW_PROXY_ANAHTAR) digerAnahtar[ad] = (digerAnahtar[ad] || 0) + n;
    }
    log(`  Gemini son 3 sa: ${toplam} istek, ${hata} hata ${JSON.stringify(kodlar)}`);
    const sorun = hata >= 10 && hata / toplam >= 0.2;
    if (sorun && !S.hata) {
      S.hata = simdi.toISOString();
      uyar({ id: kisaId("dwai", `hata:${S.hata}`), tur: "saglik", uygulama: "daily-whisper", oncelik: "yuksek",
        baslik: "Daily Whisper AI hata veriyor",
        govde: `Son 3 saatte ${toplam} Gemini isteğinin ${hata} tanesi hata (${Object.entries(kodlar).map(([k, n]) => `${k}: ${n}`).join(", ")}). 429/402 ise AI Studio kredisi ya da kota bitmiş olabilir: aistudio.google.com Billing.` });
    } else if (!sorun && S.hata && hata < 3) {
      uyar({ id: kisaId("dwai", `geri:${S.hata}`), tur: "saglik", uygulama: "daily-whisper", oncelik: "dusuk",
        baslik: "Daily Whisper AI düzeldi", govde: `Son 3 saatte ${toplam} Gemini isteği, ${hata} hata.` });
      S.hata = null;
    }
    for (const [ad, n] of Object.entries(digerAnahtar)) {
      const k = `${ad}:${bugun}`;
      if (n >= 300 && !(S.sizinti ||= {})[k]) {
        S.sizinti[k] = true;
        uyar({ id: kisaId("dwai", `sizinti:${k}`), tur: "saglik", uygulama: "daily-whisper", oncelik: "yuksek",
          baslik: `Daily Whisper: "${ad}" anahtarında ani yükseliş`,
          govde: `Proxy dışındaki bu anahtar son 3 saatte ${n} istek aldı. Normali günde birkaç düzine. Wallet Coach'taki gibi sızmış olabilir; AI Studio → API keys.` });
      }
    }
    if (S.sizinti) for (const k of Object.keys(S.sizinti)) if (!k.endsWith(bugun)) delete S.sizinti[k];
  } catch (e) { log(`  dw gemini ✗ ${e.message}`); }

  /* proxy sayacı saatte bir (wrangler D1 yavaş) */
  const saat = simdi.toISOString().slice(0, 13);
  if (S.proxySaat === saat) return;
  const gun = simdi.toISOString().slice(0, 10);
  const r = sh("npx", ["wrangler", "d1", "execute", "bam-ai-proxy", "--remote", "--json", "--command",
    `SELECT n FROM usage WHERE day = '${gun}' AND scope = 'app:dailywhisper'`]);
  if (!r.ok) { log(`  dw proxy ✗ ${r.out.split("\n")[0]}`); return; }
  S.proxySaat = saat;
  try {
    const n = JSON.parse(r.out.slice(r.out.indexOf("[")))[0]?.results?.[0]?.n || 0;
    const toml = readFileSync(join(homedir(), "dev", "ai-proxy", "wrangler.toml"), "utf8");
    const sinir = Number((toml.match(/LIMIT_APP_DAILYWHISPER\s*=\s*"(\d+)"/) || [])[1]) || 6000;
    log(`  DW proxy bugün ${n}/${sinir}`);
    if (n >= sinir * 0.7 && S.proxyGun !== gun) {
      S.proxyGun = gun;
      uyar({ id: kisaId("dwai", `proxy:${gun}`), tur: "saglik", uygulama: "daily-whisper", oncelik: n >= sinir ? "yuksek" : "normal",
        baslik: `Daily Whisper AI günlük sınıra yaklaştı (${n}/${sinir})`,
        govde: `Bugün proxy'den ${n} çağrı geçti, sınır ${sinir}. Dolunca kullanıcılar 429 alır. ~/dev/ai-proxy/wrangler.toml LIMIT_APP_DAILYWHISPER artırılıp deploy edilmeli.` });
    }
  } catch (e) { log(`  dw proxy ✗ ${e.message}`); }
}

/* ── anomali (günde bir, 12:00 TSİ sonrası) ── */
function kaynakYasi() {
  const gunFark = iso => iso ? Math.floor((simdi - Date.parse(iso)) / 864e5) : Infinity;
  const mtime = ad => { try { return statSync(join(VERI, ad)).mtime.toISOString(); } catch { return null; } };
  const jsonAl = ad => { try { return JSON.parse(readFileSync(join(VERI, ad), "utf8")); } catch { return null; } };
  const l = [];
  /* App Store satış raporu ~1-2 gün gecikmeli; son veri günü 4 günden eskiyse 3 gündür gelmiyor. */
  const iosSon = readdirSync(VERI).filter(d => /^ios-\d{4}-\d{2}-\d{2}\.json$/.test(d)).sort().reverse()
    .find(d => { try { return JSON.parse(readFileSync(join(VERI, d), "utf8")).veri; } catch { return false; } });
  const iosGun = iosSon?.slice(4, 14);
  l.push({ k: "ios-satis", ad: "App Store satış raporu", gecik: iosGun ? Math.round((Date.parse(`${bugun}T12:00:00Z`) - Date.parse(`${iosGun}T12:00:00Z`)) / 864e5) - 1 : Infinity, son: iosGun });
  const tel = jsonAl("telemetri.json");
  l.push({ k: "telemetri", ad: "Uygulama telemetrisi (Firestore)", gecik: gunFark(tel?.uretim || mtime("telemetri.json")), son: tel?.uretim?.slice(0, 10) });
  const kova = jsonAl("android-kova.json");
  l.push({ k: "play-kova", ad: "Play toplu raporları", gecik: kova?.hata ? Infinity : gunFark(kova?.uretim || mtime("android-kova.json")), son: kova?.uretim?.slice(0, 10), not: kova?.hata });
  for (const [k, ad, dosya] of [["ios-yorum", "App Store yorumları", "ios-yorumlar.json"], ["ios-durum", "App Store sürüm durumu", "ios-durum.json"],
    ["play-durum", "Play sürüm durumu", "android-durum.json"], ["ga4", "Firebase Analytics (GA4)", "ga4.json"], ["web", "Site trafiği", "web.json"]]) {
    const m = mtime(dosya); if (!m) continue;
    l.push({ k, ad, gecik: gunFark(m), son: m.slice(0, 10) });
  }
  return l;
}

async function anomali() {
  if (!ANOMALI_ZORLA && (trSaat < 12 || D.anomaliGun === bugun)) return;
  log("anomali kontrolü");
  /* veri kaynakları */
  for (const s of kaynakYasi()) {
    const k = `kaynak:${s.k}`;
    if (s.gecik >= 3) {
      if (D.anomali[k]) continue;
      D.anomali[k] = bugun;
      uyar({ id: kisaId("anomali", `${k}:${bugun}`), tur: "anomali", oncelik: "normal",
        baslik: `${s.ad} 3 gündür gelmiyor`,
        govde: s.not ? ozet(s.not, 160) : `Son veri: ${s.son || "hiç"}. Günlük toplama (gunluk.sh, collect.mjs) bu kaynağı yenileyemiyor.` });
    } else delete D.anomali[k];
  }
  /* telemetri: aktif ve kurulum */
  const t = await telemetri(() => {});
  for (const h of t.hatalar) log(`  telemetri ✗ ${h.proje}: ${h.hata}`);
  for (const [slug, o] of Object.entries(t.apps)) {
    const gecmis = D.aktif[slug] ||= {};
    const onceki = Object.entries(gecmis).filter(([g]) => g < bugun).sort().slice(-7).map(([, v]) => v);
    gecmis[bugun] = o.aktif1;
    for (const g of Object.keys(gecmis).sort().slice(0, -30)) delete gecmis[g];
    const ka = `aktif:${slug}`;
    if (onceki.length >= 3) {
      const ort = onceki.reduce((a, b) => a + b, 0) / onceki.length;
      if (ort >= 3 && o.aktif1 < ort / 2) {
        if (!D.anomali[ka]) {
          D.anomali[ka] = bugun;
          uyar({ id: kisaId("anomali", `${ka}:${bugun}`), tur: "anomali", uygulama: slug, oncelik: "normal",
            baslik: `${appAd(slug)} aktif kullanıcı düştü`,
            govde: `Son 24 saatte ${o.aktif1} aktif kullanıcı; önceki ${onceki.length} günün ortalaması ${ort.toFixed(1)}. Yarısının altında.` });
        }
      } else delete D.anomali[ka];
    }
    const gy = o.gunlukYeni || {};
    const d1 = gunEkle(bugun, -1), d2 = gunEkle(bugun, -2);
    let hafta = 0; for (let i = 3; i <= 9; i++) hafta += gy[gunEkle(bugun, -i)] || 0;
    const kk = `kurulum:${slug}`;
    if (!(gy[d1] || 0) && !(gy[d2] || 0) && hafta >= 2) {
      if (!D.anomali[kk]) {
        D.anomali[kk] = bugun;
        uyar({ id: kisaId("anomali", `${kk}:${bugun}`), tur: "anomali", uygulama: slug, oncelik: "normal",
          baslik: `${appAd(slug)} 2 gündür yeni kurulum yok`,
          govde: `Dün ve önceki gün telemetride yeni kurulum yok; ondan önceki 7 günde ${hafta} kurulum vardı. Mağaza listesi, reklam ya da sürüm sorunu olabilir.` });
      }
    } else if ((gy[d1] || 0) || (gy[d2] || 0)) delete D.anomali[kk];
  }
  if (!KURU) D.anomaliGun = bugun;
}

/* ── Worker'a yazma ve push ── */
async function workerYaz(liste, K) {
  if (!liste.length) return true;
  try {
    const r = await fetch(UYARI_UC, { method: "POST", headers: { "x-live-key": K, "content-type": "application/json" },
      body: JSON.stringify({ alerts: liste }), signal: AbortSignal.timeout(20000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
    log(`  Worker'a yazıldı: ${liste.length} uyarı`);
    return true;
  } catch (e) { log(`  Worker'a yazılamadı (${e.message}), sonraki çalışmada tekrar`); return false; }
}

function bildirimYuku(liste) {
  const s = [...liste].sort((a, b) => ONCELIK_SIRA[a.oncelik] - ONCELIK_SIRA[b.oncelik] || a.t.localeCompare(b.t));
  const tek = s.length === 1;
  const govde = tek ? s[0].govde : ozet(s.map(a => a.baslik).join("; "), 178);
  return {
    aps: { alert: { title: tek ? s[0].baslik : `${s.length} yeni uyarı`, body: govde }, sound: "default", "thread-id": "uyari" },
    uyari: s[0].id, uyarilar: s.slice(0, 20).map(a => a.id)
  };
}

/* ── akış ── */
const K = liveAnahtar();
log(`── uyarı ${simdi.toISOString()} (TSİ ${bugun} ${String(trSaat).padStart(2, "0")}:xx)${ilkKez ? " · ilk çalışma, durum tohumlanıyor" : ""}${KURU ? " · kuru" : ""}`);

if (TEST) {
  if (!K) { console.error("LIVE anahtarı yok (Keychain: bamtech-lab-live)"); process.exit(1); }
  uyar({ id: `test-${simdi.getTime().toString(36)}`, tur: "test", oncelik: "dusuk", baslik: "Uyarılar çalışıyor",
    govde: "Deneme bildirimi. Yeni yorum, mağaza durumu, satın alma ve anomaliler bundan sonra böyle gelir. Dokununca Uyarılar açılır." });
  await workerYaz(yeni, K);
  const yuk = bildirimYuku(yeni);
  const { basarili, toplam } = await apnsGonder(yuk, { collapse: yeni[0].id, K, log });
  log(toplam ? `test bildirimi: ${basarili}/${toplam} cihaz` : "kayıtlı cihaz yok: Panel uygulamasını aç, bildirim iznine İzin ver");
  process.exit(0);
}

log("App Store"); await appStore();
log("Google Play"); play();
log("Satın alma"); await satislar();
log("Bildirim Worker'ları"); await saglik();
log("Daily Whisper AI"); await dwAI();
await anomali();

/* eski kayıtları buda: yorum/satış kimlikleri 120 gün */
const sinir = gunEkle(bugun, -120);
for (const k of ["yorum", "satis"]) for (const [id, g] of Object.entries(D[k])) if (g < sinir) delete D[k][id];

/* tekrar eden kimlikleri ele (aynı olay iki yoldan) */
const gorulen = new Set();
const bulunan = yeni.filter(a => !gorulen.has(a.id) && gorulen.add(a.id));

if (KURU) {
  log(`[kuru] ${bulunan.length} uyarı`);
  for (const a of bulunan) log(`  [${a.oncelik}] ${a.tur} · ${a.baslik} · ${a.govde}`);
  if (bulunan.length) log(`[kuru] bildirim: ${JSON.stringify(bildirimYuku(bulunan))}`);
  process.exit(0);
}

if (!K) { log("LIVE anahtarı yok (Keychain: bamtech-lab-live): Worker ve push atlandı"); }
else {
  /* Worker: önceki çalışmada yazılamayanlar + yeniler */
  const yaz = [...D.yazilacak, ...bulunan];
  D.yazilacak = (await workerYaz(yaz, K)) ? [] : yaz.slice(-200);

  /* sessiz saat: 00-08 TSİ yalnız yüksek öncelik */
  const sessiz = trSaat < 8;
  const gonder = sessiz ? bulunan.filter(a => a.oncelik === "yuksek") : [...D.bekleyen, ...bulunan];
  const bekle = sessiz ? [...D.bekleyen, ...bulunan.filter(a => a.oncelik !== "yuksek")] : [];
  if (gonder.length) {
    const yuk = bildirimYuku(gonder);
    log(`bildirim: ${yuk.aps.alert.title} · ${yuk.aps.alert.body}`);
    try {
      const { basarili, toplam } = await apnsGonder(yuk, { collapse: `uyari-${yuk.uyari}`, K, log });
      log(toplam ? `  ${basarili}/${toplam} cihaz` : "  kayıtlı cihaz yok: Panel uygulamasını aç, bildirim iznine İzin ver");
      D.bekleyen = bekle;
    } catch (e) { log(`  push ✗ ${e.message}; sonraki çalışmada tekrar`); D.bekleyen = [...gonder, ...bekle].slice(-100); }
  } else {
    D.bekleyen = bekle.slice(-100);
    if (bekle.length) log(`sessiz saat: ${bekle.length} uyarı sabaha bekliyor`);
  }
}

mkdirSync(VERI, { recursive: true });
writeFileSync(DURUM_YOL, JSON.stringify(D, null, 1) + "\n");
log(`bitti: ${bulunan.length} yeni uyarı${ilkKez ? " (ilk çalışma: mevcut olaylar görüldü sayıldı)" : ""}`);
