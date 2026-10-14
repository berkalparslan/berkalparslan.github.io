/* Bam Sports paneli: beş spor uygulaması (Tenis Padel, Pickleball, Voleybol,
 * Rally: Badminton, Rally: Masa Tenisi) tek Firebase projesinde (bam-tech-sports).
 *
 * Ortak katman: kabuk (shell.js), tablo ve biçim (panel.js), grafikler
 * (grafik.js), harita (harita.js), onay kartı (push.js). Bildirim gönder
 * sayfası bu panelin kendi formu: beş uygulamayı ayrı ayrı seçebilen tek
 * panel bu, push.js tek uygulamalı (bkz. rapor "ortak katmana öneri").
 *
 * Veri bir kez yüklenir; dönem (üst satırdaki gün düğmeleri), uygulama ve
 * sürüm seçimi istemcide uygulanır. Günlük sayaçlar `stats/{uygulama}_{gün}`
 * (UTC günü), kurulumlar `installs/{id}`, zaman çizelgesi
 * `installs/{id}/events`. Analytics özeti `panel/ga4`, mağaza özeti
 * `panel/sales` (panel-yaz.mjs) ve `panel/magaza` (bam-sports.mjs: platform
 * ayrımı, kur, Pass fiyatları).
 */
import { panelKabuk } from "/lab/assets/shell.js?v=3";
import { el, kart, tiles, veriTablo, sayi, tarihTam, tarihHucre, zaman, ms, istGun, donem,
  surumNotlari, surumNotlariKutu, kullaniciCekmecesi } from "/lab/assets/panel.js?v=6";
import { gunlukCubuk, cizgi, huni, yatayCubuk, saatIsi, saatMatrisi, kivilcim } from "/lab/assets/grafik.js?v=1";
import { dunyaHaritasi } from "/lab/assets/harita.js?v=1";
import { onayKarti } from "/lab/assets/push.js?v=3";

const DEMO = new URLSearchParams(location.search).has("demo");
const ADMIN = "aberkalparslan@gmail.com";
const firebaseConfig = {
  apiKey: "AIzaSyDPc1503lew3j3aTLWsXVCOOCWVcJ4v1HU",
  authDomain: "bam-tech-sports.firebaseapp.com",
  projectId: "bam-tech-sports",
  appId: "1:64015860470:web:900e873e3ad0d41253a2d7",
  messagingSenderId: "64015860470",
  storageBucket: "bam-tech-sports.firebasestorage.app",
};

// ─── Biçim ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { } } };
const fmt = n => Math.round(+n || 0).toLocaleString("tr-TR");
const dayKey = d => new Date(d).toISOString().slice(0, 10);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ts = v => zaman(v);
const tms = v => ms(v);
const ago = d => { const t = tms(d); if (!t) return "-"; const m = Math.max(0, (Date.now() - t) / 6e4); return m < 1 ? "az önce" : m < 60 ? `${Math.round(m)} dk önce` : m < 1440 ? `${Math.round(m / 60)} sa önce` : `${Math.round(m / 1440)} gün önce`; };
const tt = v => tarihTam(v) || "-";
const sum = (arr, k) => arr.reduce((a, x) => a + (+x[k] || 0), 0);
const ev = (o, k) => +(o?.ev?.[k] || 0);
const evSum = (arr, k) => arr.reduce((a, x) => a + ev(x, k), 0);
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const yuzde = (a, b) => b ? `%${(a / b * 100).toFixed(1).replace(".", ",")}` : "-";
const mins = sec => { sec = +sec || 0; return sec < 60 ? `${Math.round(sec)} sn` : sec < 3600 ? `${(sec / 60).toFixed(sec < 600 ? 1 : 0).replace(".", ",")} dk` : `${(sec / 3600).toFixed(1).replace(".", ",")} sa`; };
const shortId = id => String(id || "").slice(0, 8);
const countBy = (arr, f) => { const m = {}; arr.forEach(x => { const k = f(x); if (k == null) return; m[k] = (m[k] || 0) + 1; }); return m; };
const sleep = t => new Promise(r => setTimeout(r, t));
/* HTML parçasından tablo hücresi: görünen öğe + sıralama/arama değeri. */
const H = html => { const s = el("span"); s.innerHTML = html; return s; };
const N = (html, s) => ({ d: H(html), s });
const num = n => ({ d: fmt(n), s: +n || 0 });
const dur = sec => ({ d: sec ? mins(sec) : "-", s: +sec || 0 });
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
/* Kendi onay kartımız (push.js onayKarti). rows: [etiket, HTML] */
const confirmCard = ({ title, rows = [], note = "", yes = "Evet", danger = false }) =>
  onayKarti({ baslik: title, satirlar: rows, not: note, evet: yes, tehlike: danger });
const notKutu = (html, cls = "") => { const d = el("div", "note " + cls); d.innerHTML = html; return d; };
const p = (html, cls = "muted") => { const x = el("p", cls); x.innerHTML = html; return x; };
/* Grafik kartı: önce DOM'a eklenir (grafik genişliği ölçer), sonra çizilir. */
function grafikKart(c, baslik, ciz, alt) {
  const kutu = el("div");
  const k = kart(baslik, kutu);
  if (alt) k.appendChild(p(alt, "alt-not"));
  c.appendChild(k);
  try { ciz(kutu); } catch (e) { console.error(e); kutu.appendChild(p("Grafik çizilemedi: " + esc(e.message))); }
  return k;
}
const izgara = (c, n = 2) => { const g = el("div", n === 3 ? "izgara3" : "izgara2"); c.appendChild(g); return g; };

// ─── Adlar ───────────────────────────────────────────────────────────────
/* Uygulamadaki anahtarlar sabit; yeni ekran, kaynak ya da uygulama eklenince
   yalnız buradaki etiket haritalarına satır eklenir. Renkler uygulamaların
   SportApp(accent:) değerleri (iOS sistem renkleri); Pickleball'ın vurgusu
   da yeşil olduğu için grafiklerde Tenis'ten ayrılsın diye camgöbeği. */
const APPS = {
  tennis: { ad: "Tenis Padel", renk: "#34C759", slug: "tennis-padel", magaza: "Tennis Padel Score Keeper" },
  pickleball: { ad: "Pickleball", renk: "#30B0C7", slug: "pickleball", magaza: "Score Keeper for Pickleball" },
  volleyball: { ad: "Voleybol", renk: "#FF9500", slug: "volleyball", magaza: "Volleyball Score Keeper" },
  badminton: { ad: "Badminton", renk: "#FF3B30", slug: "rally-badminton", magaza: "Rally: Badminton" },
  tabletennis: { ad: "Masa Tenisi", renk: "#007AFF", slug: "rally-table-tennis", magaza: "Rally: Table Tennis" },
};
const APP_KEYS = Object.keys(APPS);
const SLUG_APP = Object.fromEntries(APP_KEYS.map(a => [APPS[a].slug, a]));
const EKRAN = {
  home: "Ana sayfa", logbook: "Maç defteri", academy: "Akademi", setup: "Maç kurulumu", courts: "Kortlar",
  profile: "Profil", friends: "Arkadaşlar", league: "Lig", leagues: "Ligler", league_organizer: "Lig düzenleyici",
  leaguediscover: "Lig keşfet", league_discover: "Lig keşfet", createleague: "Lig kur", leagueresult: "Lig sonucu",
  community: "Topluluk", newpost: "Yeni gönderi", match_detail: "Maç ayrıntısı", player_profile: "Oyuncu profili",
  notifications: "Bildirim kutusu", people: "Kişiler", player_search: "Oyuncu arama", sendresult: "Sonuç gönder",
  settings: "Ayarlar", stats: "İstatistik", account: "Hesap", paywall: "Paywall", closed: "Kapalı",
};
const SOURCES = {
  quota: "Ücretsiz maç sınırı", banner: "Banner", home_banner: "Ana sayfa bannerı", profile: "Profil", profile_banner: "Profil bannerı",
  setup: "Maç kurulumu", league_create: "Lig kurma", debug: "Debug", offer_code: "Teklif kodu", unknown: "Bilinmiyor",
};
const RESULT = { win: "Galibiyet", loss: "Mağlubiyet", practice: "Antrenman", draw: "Berabere" };
const SHARE = { story: "Hikaye kartı", save: "Fotoğraflara kaydet", copy: "Kopyala", more: "Diğer", qr: "QR" };
const SOCIAL = { follow: "Takip", follow_accept: "Takip isteği kabul", share_result: "Sonuç paylaşımı", league_create: "Lig kurdu", league_join: "Lige katıldı",
  league_result: "Lig sonucu", league_approve: "Lig katılım onayı", league_approve_result: "Lig sonucu onayı", league_confirm: "Lig sonucu teyidi",
  like: "Beğeni", comment: "Yorum", post_match: "Maçlı gönderi", avatar_upload: "Profil fotoğrafı", live_share_join: "Canlı maça katıldı",
  profile_qr_open: "Profil QR", profile_setup_open: "Profil kurulumu açtı", profile_setup_skip: "Profil kurulumunu atladı",
  report: "Gönderi bildirdi", report_player: "Oyuncu bildirdi", block: "Engelledi" };
const SIGNIN = { apple: "Apple", google: "Google" };
const TOUR = { logbook: "Maç defteri turu", setup: "Maç kurulumu turu", profile: "Profil turu", friends: "Arkadaşlar turu", courts: "Kortlar turu" };
const LANG = { tr: "Türkçe", en: "İngilizce", de: "Almanca", es: "İspanyolca", fr: "Fransızca", pt: "Portekizce", it: "İtalyanca", nl: "Felemenkçe", ja: "Japonca", ko: "Korece", zh: "Çince", ru: "Rusça", pt_br: "Portekizce (Brezilya)", system: "Sistem dili" };
const COUNTERS = { installs_new: "Yeni kurulum", sessions: "Oturum", paywall_views: "Paywall gösterimi", purchases: "Satın alma",
  matches_completed: "Tamamlanan maç", matches_sent: "Saate gönderilen maç", shares: "Paylaşım", ads_watched: "İzlenen reklam" };
/* Telemetriye ayna olarak düşen Analytics olayları ve uygulamanın kendi olayları. */
const OLAY = {
  first_open: "İlk açılış", logbook_viewed: "Defter açıldı", match_setup_configured: "Maç kuruldu", match_setup: "Maç kuruldu", match_sent_to_watch: "Saate gönderildi",
  match_saved_from_watch: "Saatten maç kaydı", match_completed: "Maç bitti", match_shared: "Paylaşım", match_deleted: "Maç silindi",
  match_imported: "Maç içe aktarıldı", paywall_viewed: "Paywall görüldü", paywall_dismissed: "Paywall kapatıldı",
  purchase_started: "Satın almaya bastı", purchase_completed: "Satın aldı", purchase_failed: "Satın alma olmadı",
  restore_purchases: "Geri yükleme", restore_completed: "Geri yükleme bitti", offer_code_opened: "Teklif kodu açıldı",
  rewarded_ad_prompt_shown: "Reklam teklifi", rewarded_ad_watched: "Reklam izlendi", ad_reward: "Reklam ödülü", ad_impression: "Reklam gösterimi",
  profile_name_set: "Ad yazıldı", login: "Giriş", social_action: "Sosyal işlem", courts_opened: "Kortlar açıldı", courts_open: "Kortlar açıldı",
  session_start: "Oturum", user_engagement: "Etkileşim", screen_view: "Ekran görüntüleme", os_update: "İşletim sistemi güncellemesi",
  app_update: "Uygulama güncellemesi", app_remove: "Silindi", in_app_purchase: "Mağaza satın alması",
  app_store_subscription_renew: "Abonelik yenilendi", app_exception: "Çökme / hata", phone_match_start: "Telefonda maç başladı",
  full_screen_board: "Tam ekran skor", stats_detail_open: "İstatistik ayrıntısı", match_detail_open: "Maç ayrıntısı", match_resumed: "Maça devam",
  rematch: "Rövanş", rivalry_open: "Rakiple geçmiş", qr_open: "QR açıldı", community_post: "Topluluğa gönderi", app_language: "Uygulama dili",
  app_theme: "Tema", notification_open: "Bildirim açıldı", notification_foreground: "Bildirim (uygulama açıkken)",
  coach_start: "Tanıtım turu başladı", coach_act: "Tanıtım turunda adım", coach_done: "Tanıtım turu bitti", coach_skip: "Tanıtım turu atlandı",
  push_permission: "Bildirim izni sorusu", push_topic_fail: "Bildirim konusuna abone olamadı", push_open: "Bildirime dokundu",
  screen: "Ekran açıldı", screen_time: "Ekran süresi", session: "Oturum bitti", pw_view: "Paywall açıldı", pw_close: "Paywall kapandı",
  pw_close_bought: "Paywall kapandı (aldı)", pw_buy: "Pass aldı", match_done: "Maç bitti", match_sent: "Maç saate gitti",
  share: "Paylaşım", signin: "Giriş", social: "Sosyal işlem", courts: "Kortlar arama sonucu",
};
const SISTEM = new Set(["session_start", "user_engagement", "screen_view", "os_update", "app_update", "first_open", "(not set)", ""]);
const ULKE = (() => { try { const d = new Intl.DisplayNames(["tr"], { type: "region" }); return k => { try { return d.of(k) || k; } catch { return k; } }; } catch { return k => k; } })();
const ISO3 = { US: "USA", TR: "TUR", GB: "GBR", DE: "DEU", FR: "FRA", ES: "ESP", IT: "ITA", NL: "NLD", CA: "CAN", AU: "AUS", BR: "BRA", MX: "MEX", JP: "JPN", IN: "IND",
  HU: "HUN", DK: "DNK", AE: "ARE", ZA: "ZAF", PH: "PHL", SE: "SWE", NO: "NOR", PL: "POL", CH: "CHE", BE: "BEL", AT: "AUT", IE: "IRL", PT: "PRT", KR: "KOR" };

const appName = a => APPS[a]?.ad || a || "?";
const appTag = a => `<span class="app"><i style="background:${APPS[a]?.renk || "var(--soft)"}"></i>${esc(appName(a))}</span>`;
const screenName = sc => !sc ? "-" : (EKRAN[sc] || sc);
const srcName = s => SOURCES[s] || s || "-";
const olayAdi = k => OLAY[k] || k;
const ONLINE_MS = 3 * 60e3;
const isOnline = i => !!tms(i.lastSeen) && Date.now() - tms(i.lastSeen) < ONLINE_MS && !!i.screen && i.screen !== "closed";
/* Plan kimliğinin sonu → ürünün uygulaması. tabletennis önce: "_tennis" ile de biter. */
function passApp(plan) {
  const p = String(plan || "").toLowerCase();
  if (!p) return null;
  if (p === "offer_code") return "offer_code";
  if (p.endsWith("_tabletennis")) return "tabletennis";
  if (p.endsWith("_tennis")) return "tennis";
  if (p.endsWith("_pickle") || p.endsWith("_pickleball")) return "pickleball";
  if (p.endsWith("_volley") || p.endsWith("_volleyball")) return "volleyball";
  if (p.endsWith("_badminton")) return "badminton";
  return "?";
}
const passAppName = k => k === "offer_code" ? "Teklif kodu" : k === "?" ? "Tanınmayan plan" : appName(k);
const planType = p => { p = String(p || "").toLowerCase(); return p === "offer_code" ? "Teklif kodu" : p.includes("year") || p.includes("annual") ? "Yıllık" : p.includes("month") ? "Aylık" : p.includes("life") ? "Ömür boyu" : p.includes("week") ? "Haftalık" : p || "Plan yok"; };
function whereIs(i) {
  if (isOnline(i)) return screenName(i.screen);
  if (i.screen === "closed") return "Kapattı · " + screenName(i.lastScreen);
  if (i.screen) return "Sessiz · " + screenName(i.screen);
  return "-";
}
function eventText(e) {
  const p = e.p || "", s = +e.s || 0;
  switch (e.e) {
    case "screen": return "Ekran: " + screenName(p);
    case "screen_time": return `${screenName(p)} ekranında ${mins(s)}`;
    case "pw_view": return "Paywall açıldı · " + srcName(p);
    case "pw_close": return `Paywall'u kapattı · ${mins(s)} açık kaldı`;
    case "pw_close_bought": return `Paywall kapandı (aldıktan sonra) · ${mins(s)}`;
    case "pw_buy": return `★ PASS ALDI · ${srcName(p)} · ${mins(s)} sonra`;
    case "session": return `Uygulamadan çıktı · oturum ${mins(s)}`;
    case "match_done": return `Maç bitti · ${RESULT[p] || p}${s ? ` · ${mins(s)}` : ""}`;
    case "match_sent": return "Maç saate gönderildi";
    case "match_imported": return "Maç içe aktarıldı";
    case "share": return "Paylaştı · " + (SHARE[p] || p);
    case "signin": return "Giriş yaptı · " + (SIGNIN[p] || p);
    case "social": return "Sosyal · " + (SOCIAL[p] || p);
    case "courts": return `Kortlar açıldı · ${p} sonuç`;
    case "push_open": return "Bildirime dokundu" + (p ? ` · ${p}` : "");
    case "push_permission": return "Bildirim izni: " + ({ granted: "verdi", denied: "vermedi", not_now: "şimdi değil" }[p] || p);
    case "coach_start": case "coach_done": case "coach_skip": case "coach_act": return `${olayAdi(e.e)} · ${TOUR[p] || p}`;
    default: return olayAdi(e.e) + (p ? " · " + p : "") + (s ? ` · ${mins(s)}` : "");
  }
}
const evClass = e => e.e === "pw_buy" || e.e === "pw_close_bought" ? "buy" : e.e.startsWith("pw_") ? "pw" : e.e === "match_done" ? "match" : "";

function screenMap(o) {
  const m = {}, e = o?.ev || {};
  for (const [k, v] of Object.entries(e)) {
    const r = /^screen_(.+)_sec$/.exec(k); if (!r) continue;
    const n = r[1];
    if (n === "time" || n.startsWith("time_")) continue;
    (m[n] ||= { sec: 0, views: 0 }).sec += +v || 0;
  }
  for (const [k, v] of Object.entries(e)) {
    const r = /^screen_(.+)$/.exec(k); if (!r || k.endsWith("_sec") || r[1] === "time" || r[1].startsWith("time_")) continue;
    (m[r[1]] ||= { sec: 0, views: 0 }).views = +v || 0;
  }
  return m;
}
function screenAgg(arr) {
  const m = {};
  for (const x of arr) for (const [n, v] of Object.entries(screenMap(x))) { const t = m[n] ||= { sec: 0, views: 0, people: 0 }; t.sec += v.sec; t.views += v.views; if (v.sec > 0 || v.views > 0) t.people++; }
  return m;
}
function evPrefix(arr, prefix, skip = []) {
  const m = {};
  for (const x of arr) for (const [k, v] of Object.entries(x.ev || {}))
    if (k.startsWith(prefix) && !k.endsWith("_sec") && !skip.some(s => k.startsWith(s))) { const n = k.slice(prefix.length); m[n] = (m[n] || 0) + (+v || 0); }
  return m;
}
const adla = (m, ad) => Object.fromEntries(Object.entries(m).map(([k, v]) => [ad[k] || k, v]));

// ─── Durum ───────────────────────────────────────────────────────────────
let K = null, db = null, F = null;
let allInstalls = [], allStats = [], G = null, gaError = "", sales = null, magaza = null, salesErr = "";
let evCache = {}, pwLoaded = false, pwLoading = false, evToplu = null;
let social = null, socialPromise = null, leagueData = null, leaguePromise = null;
let appF = store.get("bs-panel-uygulama") || "all";
if (appF !== "all" && !APPS[appF]) appF = "all";
let demo = null;
const aOk = a => appF === "all" || a === appF;
const verKey = i => `${appName(i.app)} ${i.appVersion || "?"}`;
const verOk = i => !K?.surum || verKey(i) === K.surum;
/* Seçili uygulama ve sürümdeki kurulumlar. */
const I = () => allInstalls.filter(i => aOk(i.app) && verOk(i));
const IA = () => allInstalls.filter(i => aOk(i.app));
const surumNotuVar = () => K?.surum ? `<span class="muted"> · sürüm filtresi (${esc(K.surum)}) bu günlük sayaçlara uygulanmaz</span>` : "";
const appYazi = () => appF === "all" ? "beş uygulama" : appName(appF);

/* Dönem: Türkiye günü sınırlı [bas, son); önceki eşit dönem. 0 = tüm zamanlar. */
const P = () => donem(K?.aralik ?? 7);
const periodWord = () => !K?.aralik ? "tüm zamanlar" : K.aralik === 1 ? "bugün" : `son ${K.aralik} gün`;
const inP = (v, d = P()) => { const t = tms(v); return !!t && t >= d.bas && t < d.son + 1; };
const inPrev = (v, d = P()) => { const t = tms(v); return d.oncekiBas != null && !!t && t >= d.oncekiBas && t < d.oncekiSon; };
/* Günlük sayaçlar: seçili uygulamalar, gün gün toplanır. Gün metni UTC
   (uygulama UTC günüyle yazar); dönem sınırı Türkiye günü, yaklaşık. */
function statDays(bas, son) {
  const ilk = bas ? istGun(bas) : (allStats.reduce((m, s) => s.day < m ? s.day : m, dayKey(Date.now())));
  const sonG = istGun(son);
  const byDay = {};
  for (const s of allStats) {
    if (!aOk(s.app) || s.day < ilk || s.day > sonG) continue;
    const t = byDay[s.day] ||= { day: s.day, t: s.day, ev: {}, apps: {} };
    for (const [k, v] of Object.entries(s)) if (typeof v === "number") t[k] = (t[k] || 0) + v;
    for (const [k, v] of Object.entries(s.ev || {})) t.ev[k] = (t.ev[k] || 0) + (+v || 0);
    const ap = t.apps[s.app] ||= {}; for (const [k, v] of Object.entries(s)) if (typeof v === "number") ap[k] = (ap[k] || 0) + v;
  }
  const out = [];
  for (let d = new Date(ilk + "T00:00:00Z"); dayKey(d) <= sonG; d = new Date(d.getTime() + 864e5)) { const k = dayKey(d); out.push(byDay[k] || { day: k, t: k, ev: {}, apps: {} }); }
  return out;
}
const stats = () => { const d = P(); return statDays(d.bas, d.son); };
const prevStats = () => { const d = P(); return d.oncekiBas == null ? null : statDays(d.oncekiBas, d.oncekiSon - 1); };
/* Kutucuk farkı: önceki eşit döneme göre (tümü seçiliyken yok). */
const fark = (simdi, once, ters) => once == null ? undefined : { simdi, once, ters };
const sf = (k, ters) => { const o = prevStats(); return o ? fark(sum(stats(), k), sum(o, k), ters) : undefined; };
const evf = (k, ters) => { const o = prevStats(); return o ? fark(evSum(stats(), k), evSum(o, k), ters) : undefined; };

// ─── Veri ────────────────────────────────────────────────────────────────
async function fb() {
  if (F || DEMO) return;
  F = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  db = F.getFirestore(K.app);
}
const statFix = d => { const x = d.data(); return { ...x, app: x.app || d.id.split("_")[0], day: x.day || d.id.slice(-10) }; };
async function yukle(k) {
  K = k;
  evCache = {}; pwLoaded = false; pwLoading = false; evToplu = null;
  social = null; socialPromise = null; leagueData = null; leaguePromise = null;
  pushes = null; templates = null; openStats = null; pushHealth = null;
  if (DEMO) {
    if (!demo) makeDemo();
    allInstalls = demo.installs; allStats = demo.stats; G = demo.ga4; sales = demo.sales; magaza = demo.magaza;
    k.durum("Demo: sahte veri, Firestore'a bağlanmıyor.");
    return;
  }
  await fb();
  const [iSnap, sSnap] = await Promise.all([
    F.getDocs(F.query(F.collection(db, "installs"), F.limit(10000))),
    F.getDocs(F.query(F.collection(db, "stats"), F.limit(20000))),
  ]);
  allInstalls = iSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  allStats = sSnap.docs.map(statFix);
  const oku = async ad => { const g = await F.getDoc(F.doc(db, "panel", ad)); return g.exists() ? g.data() : null; };
  try { const g = await oku("ga4"); G = g?.json ? JSON.parse(g.json) : null; gaError = G ? "" : "panel/ga4 belgesi yok. Mac'te scripts/lab/bam-sports.mjs çalışınca dolar."; }
  catch (e) { G = null; gaError = "Analytics özeti okunamadı: " + (e.code || e.message); }
  try { sales = await oku("sales"); salesErr = sales ? "" : "panel/sales yok (scripts/lab/panel-yaz.mjs yazar)."; } catch (e) { sales = null; salesErr = "panel/sales okunamadı: " + (e.code || e.message); }
  try { const m = await oku("magaza"); magaza = m?.json ? JSON.parse(m.json) : null; } catch (e) { magaza = null; }
  k.durum(`Son güncelleme ${tarihTam(new Date())} · ${fmt(allInstalls.length)} kurulum · ${fmt(allStats.length)} günlük kayıt`);
}
async function loadEvents(id, n = 300) {
  if (evCache[id]) return evCache[id];
  let list;
  if (DEMO) list = (demo.events[id] || []).slice(0, n);
  else {
    await fb();
    const snap = await F.getDocs(F.query(F.collection(db, "installs", id, "events"), F.orderBy("t", "desc"), F.limit(n)));
    list = snap.docs.map(x => x.data());
  }
  return evCache[id] = list;
}

// ─── Kişi yardımcıları ───────────────────────────────────────────────────
const daysSince = i => tms(i.firstSeen) ? Math.floor((Date.now() - tms(i.firstSeen)) / 864e5) : null;
const verStr = i => `${i.appVersion || "?"}${i.build ? ` (${i.build})` : ""}`;
const flag = r => /^[A-Z]{2}$/.test(r || "") ? String.fromCodePoint(...[...r].map(c => 0x1F1A5 + c.charCodeAt(0))) : "";
const lang2 = l => String(l || "").slice(0, 2).toLowerCase();
const platName = i => i.platform === "android" ? "Android" : i.platform === "ios" ? "iOS" : i.platform ? String(i.platform) : "iOS";
/* Bildirim adresi: uygulama FCM jetonunu yazmış ve izin kapalı değil. */
const hasToken = i => typeof i.fcm === "string" && i.fcm.length > 20;
const reachOf = i => hasToken(i) && i.notif !== false;
const notifText = i => i.notif === true ? (reachOf(i) ? "İzin var, adres var" : "İzin var, adres yok") : i.notif === false ? "Kapalı" : "Bilinmiyor";
const profileOf = i => (i?.uid && social?.map?.get(i.uid)) || null;
const handleOf = i => profileOf(i)?.handle || i?.handle || "";
const nameOf = i => profileOf(i)?.displayName || "";
const whoText = i => handleOf(i) ? "@" + handleOf(i) + (nameOf(i) ? " · " + nameOf(i) : "") : nameOf(i) || shortId(i.id);
function whoCell(i) {
  const h = handleOf(i), n = nameOf(i);
  const top = h ? `<b>@${esc(h)}</b>` : n ? `<b>${esc(n)}</b>` : `<code>${esc(shortId(i.id))}</code>`;
  const sub = h ? (n ? esc(n) : `<code>${esc(shortId(i.id))}</code>`) : n ? `<code>${esc(shortId(i.id))}</code>` : "anonim";
  return `<span class="who"><i style="background:${APPS[i.app]?.renk || "var(--soft)"}" title="${esc(appName(i.app))}"></i><span>${top}<small>${sub}</small></span></span>`;
}
function badgesOf(i) {
  return `<span class="badges">${isOnline(i) ? '<span class="dot" title="Şu an online"></span>' : ""}${i.pro ? `<span class="pill pro">${i.grandfathered && !i.plan ? "Eski" : "Pass"}</span>` : ""}${i.signedIn ? '<span class="pill ok">Girişli</span>' : ""}${i.notif === true
    ? `<span class="pill sky" title="${reachOf(i) ? "İzin var, cihaz adresi var: Kitle modunda tek tek ulaşılır" : "İzin var ama cihaz adresi henüz yazılmamış: yalnız Konular modunda ulaşılır"}">Bildirim${reachOf(i) ? "" : " (konu)"}</span>` : ""}${i.tester ? '<span class="pill warn">Test</span>' : ""}${i.platform === "android" ? '<span class="pill no">Android</span>' : ""}</span>`;
}
const statusScore = i => (isOnline(i) ? 16 : 0) + (i.pro ? 8 : 0) + (i.signedIn ? 4 : 0) + (i.notif ? 2 : 0) + (i.tester ? 1 : 0);
const everBought = i => !!(i.pro || tms(i.purchasedAt) || i.plan || +i.purchases > 0 || ev(i, "pw_buy") > 0);
const tourState = i => ev(i, "coach_done") ? "Bitirdi" : ev(i, "coach_skip") ? "Atladı" : ev(i, "coach_start") ? "Başladı" : "Hiç";
const installsOf = uid => allInstalls.filter(x => x.uid === uid);
const handleBy = uid => social?.map?.get(uid)?.handle;
const atH = uid => handleBy(uid) ? `@${esc(handleBy(uid))}` : `<code>${esc(String(uid || "?").slice(0, 8))}</code>`;
const atT = uid => handleBy(uid) ? "@" + handleBy(uid) : String(uid || "?").slice(0, 8);
function installChips(list) {
  const w = el("span");
  for (const x of list) {
    const b = el("button", "linkchip");
    b.title = `${appName(x.app)} · ${x.id}`;
    b.innerHTML = `<i style="background:${APPS[x.app]?.renk || "var(--soft)"}"></i>${esc(appName(x.app))} <code>${esc(shortId(x.id))}</code>`;
    b.onclick = e => { e.stopPropagation(); openUser(x.id); };
    w.appendChild(b);
  }
  if (!list.length) w.appendChild(H('<span class="muted">telemetride yok</span>'));
  return w;
}

// ─── Fiyat ve para ───────────────────────────────────────────────────────
/* Kur: panel/magaza (open.er-api, USD tabanı). Para birimini dolara çevirir. */
const kur = () => magaza?.kur?.oran || null;
const usd = (tutar, kod) => { const o = kur(); if (!o || !o[kod]) return null; return tutar / o[kod]; };
const gelirUsd = g => { let t = 0, eksik = false; for (const [k, v] of Object.entries(g || {})) { const u = usd(+v, k); if (u == null) eksik = true; else t += u; } return { t, eksik }; };
const paraYaz = (n, kod) => Number(n || 0).toLocaleString("tr-TR", { style: "currency", currency: kod, maximumFractionDigits: 2 });
/* Kurulumun ödediği (tahmini): planın o ülkedeki liste fiyatı; ülke tabloda yoksa taban fiyat. Apple'ın kesintisi öncesi. */
function tahminiOdeme(i) {
  const u = magaza?.fiyat?.urunler?.[i.plan];
  if (!u) return null;
  const ulke = ISO3[i.region] && u.ulke?.[ISO3[i.region]];
  const f = ulke || u.taban;
  if (!f) return null;
  return { c: f.c, p: f.p, ulke: !!ulke, tur: u.tur, usd: usd(f.p, f.c) };
}

// ─── Genel bakış ─────────────────────────────────────────────────────────
function genel(c) {
  const d = P(), now = Date.now(), L = I(), S = stats(), O = prevStats();
  const active = (arr, gun) => arr.filter(i => tms(i.lastSeen) && now - tms(i.lastSeen) < gun * 864e5).length;
  const yeni = L.filter(i => inP(i.firstSeen)).length, yeniOnce = O ? L.filter(i => inPrev(i.firstSeen)).length : null;
  const donemAktif = L.filter(i => inP(i.lastSeen)).length;
  const pro = L.filter(i => i.pro).length;
  const watch = L.filter(i => typeof i.watchPaired === "boolean");
  const nKnown = L.filter(i => typeof i.notif === "boolean");
  const ios = L.filter(i => i.platform !== "android").length;
  c.appendChild(p(`${fmt(L.length)} kurulum · ${esc(appYazi())}${K.surum ? " · " + esc(K.surum) : ""} · ${fmt(ios)} iOS, ${fmt(L.length - ios)} Android · ${fmt(L.filter(i => i.tester).length)} test cihazı · dönem: ${periodWord()}`));
  const seri = k => kivilcim(S.slice(-30).map(s => +s[k] || 0));
  c.appendChild(tiles([
    ["Şu an online", fmt(L.filter(isOnline).length), "son 3 dakikada sinyal"],
    ["Toplam kurulum", fmt(L.length), "tüm zamanlar"],
    ["Yeni kurulum", fmt(yeni), periodWord(), fark(yeni, yeniOnce)],
    ["Dönemde aktif", fmt(donemAktif), `${periodWord()} açan`],
    ["Bugün aktif", fmt(active(L, 1)), "son 24 saat"],
    ["7 gün aktif", fmt(active(L, 7))],
    ["28 gün aktif", fmt(active(L, 28))],
    ["Oturum", fmt(sum(S, "sessions")), periodWord(), sf("sessions")],
    ["Tamamlanan maç", fmt(sum(S, "matches_completed")), periodWord(), sf("matches_completed")],
    ["Paywall gösterimi", fmt(sum(S, "paywall_views")), periodWord(), sf("paywall_views")],
    ["Satın alma", fmt(sum(S, "purchases")), periodWord(), sf("purchases")],
    ["Pass sahibi", fmt(pro), `%${pct(pro, L.length)} kurulum`],
    ["Saat eşli", watch.length ? `%${pct(watch.filter(i => i.watchPaired).length, watch.length)}` : "-", `${fmt(watch.filter(i => i.watchPaired).length)} / ${fmt(watch.length)}`],
    ["Bildirim izni", nKnown.length ? `%${pct(nKnown.filter(i => i.notif).length, nKnown.length)}` : "-", `${fmt(nKnown.filter(i => i.notif).length)} / ${fmt(nKnown.length)} · ${fmt(L.filter(reachOf).length)} adres`],
    ["Giriş yapmış", `%${pct(L.filter(i => i.signedIn).length, L.length)}`, `${fmt(L.filter(i => i.signedIn).length)} kurulum`],
  ]));
  const ust = izgara(c);
  grafikKart(ust, "Günlük oturum, yeni kurulum, maç", k => cizgi(k, S, { seriler: [{ ad: "Oturum", alan: "sessions" }, { ad: "Yeni kurulum", alan: "installs_new" }, { ad: "Tamamlanan maç", alan: "matches_completed" }] }),
    "Günlük sayaçlardan (UTC günü)." + surumNotuVar());
  // Yeni kurulum günlük, platforma göre (kurulumların firstSeen'inden; sürüm filtresi uygulanır).
  const yk = {};
  for (const i of L) if (inP(i.firstSeen)) { const g = istGun(i.firstSeen); const x = yk[g] ||= { ios: 0, android: 0 }; x[i.platform === "android" ? "android" : "ios"]++; }
  const gunler = S.map(s => ({ t: s.day, ios: yk[s.day]?.ios || 0, android: yk[s.day]?.android || 0 }));
  grafikKart(ust, "Yeni kurulum, platforma göre", k => gunlukCubuk(k, gunler, { seriler: [{ ad: "iOS", alan: "ios", renk: "var(--s1)" }, { ad: "Android", alan: "android", renk: "var(--s3)" }] }), "Kurulumların ilk görülmesinden (Türkiye günü).");

  // Uygulamalar tablosu: uygulama filtresinden bağımsız hepsini gösterir, seçili olan işaretli.
  const appRows = APP_KEYS.map(a => {
    const l = allInstalls.filter(i => i.app === a && verOk(i));
    const st = allStats.filter(s => s.app === a && (!d.bas || s.day >= istGun(d.bas)));
    const nk = l.filter(i => typeof i.notif === "boolean");
    const vers = [...new Set(l.map(i => i.appVersion).filter(Boolean))].sort().reverse();
    return [N(appTag(a) + (appF === a ? ' <span class="pill sky">seçili</span>' : ""), appName(a)), num(l.length), num(l.filter(i => i.platform !== "android").length), num(l.filter(i => i.platform === "android").length),
      num(l.filter(i => inP(i.lastSeen)).length), num(l.filter(i => inP(i.firstSeen)).length), num(sum(st, "sessions")), num(sum(st, "matches_completed")),
      num(l.filter(i => i.pro).length), { d: nk.length ? `%${pct(nk.filter(i => i.notif).length, nk.length)}` : "-", s: nk.length ? nk.filter(i => i.notif).length / nk.length : -1 },
      num(l.filter(i => i.signedIn).length), vers.slice(0, 2).join(", ") || "-"];
  });
  c.appendChild(kart("Uygulamalar", veriTablo(["Uygulama", { ad: "Kurulum", num: true }, { ad: "iOS", num: true }, { ad: "Android", num: true }, { ad: "Dönemde aktif", num: true },
    { ad: "Yeni", num: true }, { ad: "Oturum", num: true }, { ad: "Maç", num: true }, { ad: "Pass", num: true }, { ad: "Bildirim izni", num: true }, { ad: "Girişli", num: true }, "Sürümler"],
    appRows, { ara: false, sirala: [1, "desc"], satirTik: (_, n) => uygulamaSec(APP_KEYS[n]) }), p("Satıra dokununca o uygulamaya süzülür. Dönem sütunları seçili döneme göre.", "alt-not")));

  const iki = izgara(c);
  const co = L.filter(i => inP(i.firstSeen));
  const steps = [
    ["Kurulum", co.length],
    ["Maç kurdu", co.filter(i => ev(i, "match_setup") > 0 || ev(i, "screen_setup") > 0 || +i.matches_sent > 0).length],
    ["Maç başlattı (telefon ya da saat)", co.filter(i => ev(i, "phone_match_start") > 0 || +i.matches_sent > 0).length],
    ["Maç bitirdi", co.filter(i => +i.matches_completed > 0 || ev(i, "match_done") > 0 || +i.n_matches > 0).length],
    ["Paywall gördü", co.filter(i => ev(i, "pw_view") > 0 || +i.paywall_views > 0).length],
    ["Pass aldı", co.filter(i => (i.pro && !i.grandfathered) || +i.purchases > 0).length],
  ];
  grafikKart(iki, `Dönüşüm hunisi · ${periodWord()} kurulanlar`, k => huni(k, steps, { birim: "kurulum" }), "Kurulum bazlı; sürüm filtresi uygulanır.");
  grafikKart(iki, "Tutma (kurulum gününe göre)", k => k.appendChild(tutmaTablo(L)),
    "Elde gün gün oturum yok: \"N gün sonra hala açıyordu\" = son görülme, ilk görülmeden en az N gün sonra. Yalnız üzerinden N gün geçmiş kurulumlar sayılır.");
  grafikKart(iki, "Ülkeler", k => dunyaHaritasi(k, countBy(L.filter(i => i.region), i => i.region), { birim: "kurulum", tik: iso => { usFiltre.ulke = iso; K.git("kullanicilar"); } }), "Kurulumun cihaz bölgesi. Ülkeye dokununca Kullanıcılar o ülkeyle açılır.");
  grafikKart(iki, "Dil", k => yatayCubuk(k, countBy(L, i => LANG[lang2(i.language)] || i.language || "?")));
  grafikKart(iki, "Platform ve işletim sistemi", k => yatayCubuk(k, countBy(L, i => `${platName(i)} ${String(i.os || "?").split(".").slice(0, 1).join(".")}`)));
  grafikKart(iki, "Cihaz", k => yatayCubuk(k, countBy(L, i => i.device || "?"), { limit: 10 }));
  if (G?.saatGun?.length) grafikKart(iki, "Gün ve saate göre oturum (Analytics)", k => saatIsi(k, gaSaatGun(), { birim: "oturum", not: "Analytics mülkünün saat dilimi" }), `${G.gun} günlük Analytics özeti; uygulama filtresi uygulanır.`);
  const notKart = kart("Son sürüm notları");
  iki.appendChild(notKart);
  const nk = el("div"); notKart.appendChild(nk); nk.appendChild(p("Yükleniyor..."));
  surumNotlari(appF === "all" ? APP_KEYS.map(a => APPS[a].slug) : APPS[appF].slug).then(l => { nk.textContent = ""; nk.appendChild(surumNotlariKutu(l, { limit: 4, uygulamaAdi: s => appName(SLUG_APP[s]) })); });
  c.appendChild(kart("Sürüm benimseme", surumTablo(L), p("Ayrıntı ve sürüm sürüm karşılaştırma: <a href=\"#surumler\">Sürümler</a>.", "alt-not")));
}
function uygulamaSec(a) {
  appF = a; store.set("bs-panel-uygulama", a);
  if (K.surum && !K.surum.startsWith(appName(a) + " ")) K.surum = "";
  const s = document.querySelector(".top select.uyg"); if (s) { s.value = a; s.classList.toggle("on", a !== "all"); }
  pushAppSync(); K.ciz();
}
/* Haftalık tutma: ilk görülme haftası × D1/D7/D30. */
function tutmaTablo(L) {
  const hafta = t => { const d = new Date(istGun(t) + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return dayKey(d); };
  const now = Date.now(), m = {};
  const hucre = (l, n) => { const uy = l.filter(i => now - tms(i.firstSeen) >= n * 864e5); const ka = uy.filter(i => tms(i.lastSeen) - tms(i.firstSeen) >= n * 864e5); return uy.length ? { d: `%${pct(ka.length, uy.length)} (${ka.length}/${uy.length})`, s: ka.length / uy.length } : { d: "-", s: -1 }; };
  for (const i of L) if (tms(i.firstSeen)) (m[hafta(i.firstSeen)] ||= []).push(i);
  const satir = Object.entries(m).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 16).map(([h, l]) => [{ d: tarihTam(h), s: h }, num(l.length), hucre(l, 1), hucre(l, 3), hucre(l, 7), hucre(l, 14), hucre(l, 30)]);
  const hepsi = L.filter(i => tms(i.firstSeen));
  satir.unshift([{ d: "Hepsi", s: "9999" }, num(hepsi.length), hucre(hepsi, 1), hucre(hepsi, 3), hucre(hepsi, 7), hucre(hepsi, 14), hucre(hepsi, 30)]);
  return veriTablo(["Kurulum haftası", { ad: "Kurulum", num: true }, { ad: "D1", num: true }, { ad: "D3", num: true }, { ad: "D7", num: true }, { ad: "D14", num: true }, { ad: "D30", num: true }], satir, { ara: false, kopyala: true, sirala: [0, "desc"] });
}
/* Sürüm benimseme: uygulama + sürüm + platform başına. */
let NOTLAR = null;
surumNotlari(APP_KEYS.map(a => APPS[a].slug)).then(l => { NOTLAR = l; if (K && ["genel", "surumler"].includes(K.sayfa)) K.ciz(); });
const magazaTarihi = (a, v, pl) => (NOTLAR || []).filter(x => x.slug === APPS[a]?.slug && String(x.surum) === String(v) && (!pl || x.platform === pl)).map(x => x.tarih).sort()[0] || null;
function surumTablo(L) {
  const g = {};
  for (const i of L) { const k = `${i.app}|${i.appVersion || "?"}|${i.platform || "ios"}`; (g[k] ||= []).push(i); }
  const now = Date.now();
  const gaAktif = (a, v, pl) => (G?.surumler || []).filter(r => r.a === a && String(r.appVersion) === String(v) && (!r.p || r.p === pl)).reduce((t, r) => t + r.activeUsers, 0);
  const cok = (a, v, pl) => (G?.cokme || []).filter(r => r.a === a && String(r.v) === String(v) && (!r.p || r.p === pl)).reduce((t, r) => t + r.k, 0);
  const rows = Object.entries(g).map(([k, l]) => {
    const [a, v, pl] = k.split("|");
    const nk = l.filter(i => typeof i.notif === "boolean");
    const ilk = Math.min(...l.map(i => tms(i.firstSeen)).filter(Boolean)), son = Math.max(...l.map(i => tms(i.lastSeen)).filter(Boolean));
    const mt = magazaTarihi(a, v, pl);
    return [appName(a), v, pl === "android" ? "Android" : "iOS", num(l.length), num(l.filter(i => now - tms(i.lastSeen) < 7 * 864e5).length),
      { d: yuzde(l.filter(i => i.pro).length, l.length), s: l.filter(i => i.pro).length / l.length },
      { d: nk.length ? yuzde(nk.filter(i => i.notif).length, nk.length) : "-", s: nk.length ? nk.filter(i => i.notif).length / nk.length : -1 },
      isFinite(ilk) ? tarihHucre(ilk) : "-", isFinite(son) ? tarihHucre(son) : "-", mt ? tarihHucre(mt) : "-", num(gaAktif(a, v, pl)), num(cok(a, v, pl))];
  });
  return veriTablo([{ ad: "Uygulama", filtre: true }, { ad: "Sürüm", filtre: true }, { ad: "Platform", filtre: true }, { ad: "Kurulum", num: true }, { ad: "7g aktif", num: true },
    { ad: "Pro oranı", num: true }, { ad: "Bildirim izni", num: true }, "İlk görülme", "Son görülme", "Mağaza tarihi", { ad: "GA 28g aktif", num: true }, { ad: "Çökme (GA kişi)", num: true }],
    rows, { sirala: [3, "desc"], bos: "Kurulum yok." });
}
/* GA dayOfWeek 0 = Pazar → grafik.js satırı (Pzt = 0). */
function gaSaatGun() {
  const m = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of G?.saatGun || []) if (aOk(r.a)) m[(r.g + 6) % 7][r.h] += r.os;
  return m;
}

// ─── Canlı ───────────────────────────────────────────────────────────────
function canli(c) {
  const L = I(), on = L.filter(isOnline).sort((a, b) => tms(b.lastSeen) - tms(a.lastSeen)), now = Date.now();
  const within = m => L.filter(i => tms(i.lastSeen) && now - tms(i.lastSeen) < m * 6e4).length;
  c.appendChild(p("Şu an uygulamayı açık tutanlar ve hangi ekranda oldukları. Uygulama açıkken dakikada bir sinyal gönderir; son 3 dakikada sinyal veren ve uygulamayı kapatmamış olan online sayılır. Sayfa açıkken 30 saniyede bir kendini yeniler."));
  c.appendChild(tiles([
    ["Şu an online", fmt(on.length)], ["Son 15 dakika", fmt(within(15))], ["Son 1 saat", fmt(within(60))], ["Son 24 saat", fmt(within(1440))],
    ["Paywall'da", fmt(on.filter(i => i.screen === "paywall").length)], ["Maç kurulumunda", fmt(on.filter(i => i.screen === "setup").length)],
    ["Pass olan online", fmt(on.filter(i => i.pro).length)], ["Android online", fmt(on.filter(i => i.platform === "android").length)],
  ]));
  const g = izgara(c);
  grafikKart(g, "Online olanlar nerede?", k => { if (!on.length) k.appendChild(p("Şu an uygulamayı açık tutan yok.")); else yatayCubuk(k, countBy(on, i => `${screenName(i.screen)}${appF === "all" ? " · " + appName(i.app) : ""}`)); });
  grafikKart(g, "Son kapatılan ekran (son 24 saat)", k => yatayCubuk(k, countBy(L.filter(i => i.screen === "closed" && i.lastScreen && now - tms(i.lastSeen) < 864e5), i => screenName(i.lastScreen))), "Uygulamayı en son nerede bırakıp çıktılar.");
  c.appendChild(kart("Şu an online", veriTablo(["Kişi", { ad: "Uygulama", filtre: true }, { ad: "Ekran", filtre: true }, { ad: "Durum", sirala: false }, { ad: "Sürüm", filtre: true }, { ad: "Platform", filtre: true }, { ad: "Dil", filtre: true }, { ad: "Ülke", filtre: true }, "Son sinyal", { ad: "Defterde maç", num: true }],
    on.map(i => [whoText(i), appName(i.app), screenName(i.screen), N(badgesOf(i), statusScore(i)), verStr(i), platName(i), i.language || "-", i.region || "-", { d: `${tarihTam(i.lastSeen)} (${ago(i.lastSeen)})`, s: tms(i.lastSeen) }, num(i.n_matches)]),
    { sirala: [8, "desc"], bos: "Şu an kimse yok.", satirTik: (_, n) => openUser(on[n].id) })));
  const son = L.slice().sort((a, b) => tms(b.lastSeen) - tms(a.lastSeen)).slice(0, 40);
  c.appendChild(kart("Son görülenler", veriTablo(["Kişi", { ad: "Uygulama", filtre: true }, { ad: "Nerede", filtre: true }, { ad: "Platform", filtre: true }, "Son görülme"],
    son.map(i => [whoText(i), appName(i.app), whereIs(i), platName(i), { d: `${tarihTam(i.lastSeen)} (${ago(i.lastSeen)})`, s: tms(i.lastSeen) }]),
    { sirala: [4, "desc"], satirTik: (_, n) => openUser(son[n].id) })));
  c.appendChild(notKutu("İki telefonda canlı maç (<code>liveMatches</code>) kurallarda yalnız oyunculara açık; panel okuyamıyor. Görmek için kurallara yönetici okuması eklenmeli (rapordaki komut).", "uyari"));
}
setInterval(async () => {
  if (!K || K.sayfa !== "canli" || document.hidden || (!DEMO && !K.kullanici)) return;
  try {
    if (!DEMO) { await fb(); allInstalls = (await F.getDocs(F.query(F.collection(db, "installs"), F.limit(10000)))).docs.map(d => ({ id: d.id, ...d.data() })); }
    if (K.sayfa === "canli" && !document.querySelector(".drawer[data-cekmece]")) K.ciz();
  } catch (e) { console.error(e); }
}, 30000);

// ─── Ekranlar ────────────────────────────────────────────────────────────
function ekranlar(c) {
  const S = stats(), O = prevStats(), L = I();
  const per = screenAgg(S), once = O ? screenAgg(O) : null, all = screenAgg(L);
  const keys = [...new Set([...Object.keys(per), ...Object.keys(all)])].sort((a, b) => (per[b]?.sec || 0) - (per[a]?.sec || 0) || (all[b]?.sec || 0) - (all[a]?.sec || 0));
  const total = Object.values(per).reduce((a, v) => a + v.sec, 0), views = Object.values(per).reduce((a, v) => a + v.views, 0);
  const tO = once ? Object.values(once).reduce((a, v) => a + v.sec, 0) : null, vO = once ? Object.values(once).reduce((a, v) => a + v.views, 0) : null;
  const top = keys[0];
  c.appendChild(p("Hangi ekranda ne kadar vakit geçiyor. Süre, uygulamanın kendi ölçtüğü saniyeler (ekran açık ve uygulama önde iken). Dönem sütunları günlük kayıtlardan (sürüm filtresi uygulanmaz), kişi sütunları kurulumların toplamından (sürüm filtresi uygulanır)."));
  c.appendChild(tiles([
    ["Ekranlarda toplam", mins(total), `${periodWord()}, herkes`, fark(total, tO)],
    ["Ekran açılışı", fmt(views), periodWord(), fark(views, vO)],
    ["Açılış başı", views ? mins(total / views) : "-"],
    ["En çok vakit", top && per[top]?.sec ? screenName(top) : "-", top && per[top]?.sec ? `%${pct(per[top].sec, total)} süre` : ""],
    ["Farklı ekran", fmt(keys.length)],
  ]));
  c.appendChild(kart("Ekran başına süre", veriTablo(["Ekran", "Anahtar", { ad: "Süre (dönem)", num: true }, { ad: "Önceki dönem", num: true }, { ad: "Açılış (dönem)", num: true }, { ad: "Açılış başı", num: true }, { ad: "Kişi (hepsi)", num: true }, { ad: "Kişi başı (hepsi)", num: true }, { ad: "Pay", num: true }],
    keys.map(k => { const a = per[k] || { sec: 0, views: 0 }, b = all[k] || { sec: 0, people: 0 };
      return [screenName(k), k, dur(a.sec), once ? dur(once[k]?.sec) : "-", num(a.views), dur(a.views ? a.sec / a.views : 0), num(b.people), dur(b.people ? b.sec / b.people : 0), { d: total ? yuzde(a.sec, total) : "-", s: a.sec }]; }),
    { sirala: [2, "desc"], bos: "Henüz ekran süresi yok." })));
  const g = izgara(c);
  grafikKart(g, "Süre dağılımı (dönem)", k => yatayCubuk(k, Object.fromEntries(keys.filter(x => per[x]?.sec).map(x => [screenName(x), Math.round(per[x].sec / 60)])), { limit: 14 }), "Dakika.");
  const ilk5 = keys.filter(x => per[x]?.sec).slice(0, 5);
  grafikKart(g, "Günlük ekran süresi, en çok kullanılan 5 ekran", k => gunlukCubuk(k, S.map(s => ({ t: s.day, ...Object.fromEntries(ilk5.map(x => [x, Math.round((s.ev[`screen_${x}_sec`] || 0) / 60)])) })),
    { seriler: ilk5.map(x => ({ ad: screenName(x), alan: x })) }), "Dakika, günlük kayıtlardan." + surumNotuVar());
}

// ─── Paywall ve satın alma ───────────────────────────────────────────────
const pwFiltre = { tur: "all" };
function paywall(c) {
  const S = stats(), O = prevStats(), L = I();
  const views = evPrefix(S, "pw_view_"), closes = evPrefix(S, "pw_close_", ["pw_close_bought"]), bought = evPrefix(S, "pw_close_bought_"), buys = evPrefix(S, "pw_buy_");
  const proBy = countBy(L.filter(i => i.pro && i.buySource), i => i.buySource);
  const pv = sum(S, "paywall_views"), pu = sum(S, "purchases");
  const closeN = evSum(S, "pw_close"), closeSec = evSum(S, "pw_close_sec");
  const buyN = evSum(S, "pw_buy"), buySec = evSum(S, "pw_buy_sec");
  const pro = L.filter(i => i.pro);
  c.appendChild(p("Paywall hangi ekrandan açıldı, ne kadar açık kaldı, kapatıldı mı alındı mı. Sports Pass beş uygulamada ortak; hangi uygulamanın ürünüyle alındığı plan kimliğinin sonundan okunur. Dönem sayıları günlük kayıtlardan" + surumNotuVar() + "; kişi sayıları kurulumlardan."));
  c.appendChild(tiles([
    ["Paywall gösterimi", fmt(pv), periodWord(), sf("paywall_views")], ["Satın alma", fmt(pu), periodWord(), sf("purchases")],
    ["Dönüşüm", yuzde(pu, pv), "satın alma / gösterim", O ? fark(pv ? pu / pv : 0, sum(O, "paywall_views") ? sum(O, "purchases") / sum(O, "paywall_views") : 0) : undefined],
    ["Kapatana kadar", closeN ? mins(closeSec / closeN) : "-", `${fmt(closeN)} kapatma ortalaması`],
    ["Alana kadar", buyN ? mins(buySec / buyN) : "-", "açılıştan satın almaya"],
    ["Satın almaya bastı", fmt(evSum(S, "purchase_started")), periodWord(), evf("purchase_started")],
    ["Satın alma olmadı", fmt(evSum(S, "purchase_failed")), periodWord(), evf("purchase_failed", true)],
    ["Pass kurulum", fmt(pro.length), `${fmt(pro.filter(i => i.grandfathered).length)} eski kullanıcı hakkı`],
    ["Paywall gören kişi", fmt(L.filter(i => ev(i, "pw_view") > 0).length), "tüm zamanlar"],
  ]));
  const g = izgara(c);
  grafikKart(g, `Huni · ${periodWord()}`, k => huni(k, [["Paywall gösterimi", pv], ["Satın almaya bastı", evSum(S, "purchase_started")], ["Satın aldı", pu]], { birim: "kez" }),
    "\"Plan seçti\" adımı telemetride yok (rapordaki öneri). Satın almaya basma Analytics olayının telemetri aynasından.");
  const kisiHuni = [["Paywall gördü", L.filter(i => ev(i, "pw_view") > 0).length], ["Satın almaya bastı", L.filter(i => ev(i, "purchase_started") > 0).length], ["Aldı", L.filter(i => ev(i, "pw_buy") > 0 || +i.purchases > 0).length]];
  grafikKart(g, "Kişi hunisi · tüm zamanlar", k => huni(k, kisiHuni, { birim: "kurulum" }), "Kurulumların kendi sayaçlarından; sürüm filtresi uygulanır.");
  const keys = [...new Set([...Object.keys(views), ...Object.keys(buys), ...Object.keys(proBy)])].sort((a, b) => (buys[b] || 0) - (buys[a] || 0) || (views[b] || 0) - (views[a] || 0));
  const avg = (k, n) => dur(n ? evSum(S, k) / n : 0);
  c.appendChild(kart("Kaynağa göre (dönem)", veriTablo(["Nereden açıldı", "Anahtar", { ad: "Gösterim", num: true }, { ad: "Kapatan", num: true }, { ad: "Kapatana kadar", num: true }, { ad: "Alıp kapatan", num: true }, { ad: "Satın alma", num: true }, { ad: "Alana kadar", num: true }, { ad: "Dönüşüm", num: true }, { ad: "Şu an Pass", num: true }],
    keys.map(k => [srcName(k), k, num(views[k]), num(closes[k]), avg(`pw_close_${k}_sec`, closes[k]), num(bought[k]), num(buys[k]), avg(`pw_buy_${k}_sec`, buys[k]), { d: yuzde(buys[k] || 0, views[k]), s: views[k] ? (buys[k] || 0) / views[k] : 0 }, num(proBy[k])]),
    { sirala: [2, "desc"], bos: "Bu dönemde paywall açılmadı." })));
  const g2 = izgara(c);
  grafikKart(g2, "Günlük gösterim ve satın alma", k => gunlukCubuk(k, S.map(s => ({ t: s.day, g: s.paywall_views || 0, s: s.purchases || 0 })), { seriler: [{ ad: "Gösterim", alan: "g", renk: "var(--s1)" }, { ad: "Satın alma", alan: "s", renk: "var(--s3)" }] }), surumNotuVar());
  grafikKart(g2, "Kapatana kadar geçen süre, kaynağa göre", k => yatayCubuk(k, Object.fromEntries(keys.filter(x => closes[x]).map(x => [srcName(x), Math.round(evSum(S, `pw_close_${x}_sec`) / closes[x])])), {}), "Saniye, ortalama.");
  grafikKart(g2, "Plan", k => yatayCubuk(k, countBy(pro, i => planType(i.plan))));
  // Pass hangi uygulamadan: plan sonekine göre; kaynak kırılımı buySource.
  const pa = {};
  for (const i of pro) {
    const k = passApp(i.plan) || (i.grandfathered ? "grandfathered" : "noplan");
    const x = pa[k] ||= { n: 0, src: {}, installedIn: {} };
    x.n++; x.src[i.buySource || "-"] = (x.src[i.buySource || "-"] || 0) + 1; x.installedIn[i.app] = (x.installedIn[i.app] || 0) + 1;
  }
  const paName = k => k === "grandfathered" ? "Eski kullanıcı hakkı (plan yok)" : k === "noplan" ? "Plan yazılmamış" : passAppName(k);
  g2.appendChild(kart("Pass hangi uygulamadan alındı", veriTablo(["Ürünün uygulaması", { ad: "Pass", num: true }, "Kaynaklar", "Şu an şurada"],
    Object.entries(pa).map(([k, x]) => [paName(k), num(x.n), Object.entries(x.src).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s === "-" ? "kaynak yok" : srcName(s)} ${fmt(n)}`).join(" · "),
      Object.entries(x.installedIn).map(([a, n]) => `${appName(a)} ${fmt(n)}`).join(" · ")]), { ara: false, sirala: [1, "desc"], bos: "Henüz Pass yok." }),
    p("Plan kimliğinin sonu (_tennis, _pickle, _volley, _badminton, _tabletennis). Tüm zamanlar.", "alt-not")));
  const f = L.filter(i => !i.pro);
  const dl = el("div", "kucuk-dl");
  dl.innerHTML = `<div>Pass kurulum</div><div>${fmt(pro.length)}</div>
    <div>Bu dönemde alan</div><div>${fmt(pro.filter(i => inP(i.purchasedAt)).length)}</div>
    <div>Eski kullanıcı hakkı</div><div>${fmt(pro.filter(i => i.grandfathered).length)}</div>
    <div>Saat eşli olan</div><div>${fmt(pro.filter(i => i.watchPaired).length)}</div>
    <div>Ortalama maç</div><div>${pro.length ? (sum(pro, "n_matches") / pro.length).toFixed(1).replace(".", ",") : "-"} (Pass olmayan: ${f.length ? (sum(f, "n_matches") / f.length).toFixed(1).replace(".", ",") : "-"})</div>
    <div>Ortalama oturum</div><div>${pro.length ? (sum(pro, "sessions") / pro.length).toFixed(1).replace(".", ",") : "-"} (Pass olmayan: ${f.length ? (sum(f, "sessions") / f.length).toFixed(1).replace(".", ",") : "-"})</div>`;
  g2.appendChild(kart("Pass sahipleri", dl));

  // Tüm zamanlar: dönemden bağımsız, kurulum sayaçları telemetriden önceki alımları da taşır.
  const SA = allStats.filter(s => aOk(s.app));
  const first = SA.length ? SA.reduce((m, s) => s.day < m ? s.day : m, "9999") : null;
  const buyers = L.filter(everBought);
  const dated = buyers.filter(i => tms(i.purchasedAt));
  const oldest = dated.length ? Math.min(...dated.map(i => tms(i.purchasedAt))) : null;
  const odemeler = buyers.map(tahminiOdeme).filter(Boolean);
  const odemeUsd = odemeler.reduce((t, o) => t + (o.usd || 0), 0);
  c.appendChild(kart("Tüm zamanlar", tiles([
    ["Satın alma (günlük kayıt)", fmt(sum(SA, "purchases")), first ? `${tarihTam(first)} gününden beri` : "kayıt yok"],
    ["Paywall gösterimi (günlük kayıt)", fmt(sum(SA, "paywall_views")), `dönüşüm ${yuzde(sum(SA, "purchases"), sum(SA, "paywall_views"))}`],
    ["Satın alma (kurulum sayacı)", fmt(sum(L, "purchases")), `${fmt(sum(L, "paywall_views"))} paywall gösterimi`],
    ["Satın almış kurulum", fmt(buyers.length), `${fmt(buyers.filter(i => i.pro).length)} şu an Pass`],
    ["Tarihi bilinen alım", fmt(dated.length), oldest ? `en eskisi ${tarihTam(oldest)}` : "purchasedAt yok"],
    ["Eski kullanıcı hakkı", fmt(L.filter(i => i.grandfathered).length), "grandfathered"],
    ["Tahmini ödenen", odemeler.length ? "≈ " + paraYaz(odemeUsd, "USD") : "-", odemeler.length ? `${fmt(odemeler.length)} alımın liste fiyatı, Apple payı öncesi` : "fiyat tablosu yok"],
  ]), p("Dönem seçiminden bağımsız: kurulumların kendi sayaçları (<code>purchases</code>, <code>paywall_views</code>, <code>purchasedAt</code>, <code>plan</code>, <code>buySource</code>) ve bütün günlük kayıtlar. Gerçek gelir mağaza raporundan: <a href=\"#satis\">Satış</a>.", "alt-not")));

  const keep = { all: () => true, bought: i => tms(i.purchasedAt) || +i.purchases > 0 || ev(i, "pw_buy") > 0 || (i.plan && !i.grandfathered), pro: i => i.pro, grand: i => i.grandfathered, lapsed: i => !i.pro && (tms(i.purchasedAt) || i.plan || +i.purchases > 0), donem: i => inP(i.purchasedAt) }[pwFiltre.tur] || (() => true);
  const list = buyers.filter(keep).sort((a, b) => tms(b.purchasedAt) - tms(a.purchasedAt) || tms(b.lastSeen) - tms(a.lastSeen));
  const bar = el("div", "bar2");
  const sel = el("select");
  sel.innerHTML = [["all", "Tür: hepsi"], ["bought", "Satın alan"], ["donem", "Bu dönemde alan"], ["pro", "Şu an Pass"], ["grand", "Eski kullanıcı hakkı"], ["lapsed", "Almış, şu an Pass değil"]].map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
  sel.value = pwFiltre.tur; sel.onchange = () => { pwFiltre.tur = sel.value; K.ciz(); };
  bar.appendChild(sel);
  const st = i => i.pro ? (i.grandfathered && !i.plan ? "Eski kullanıcı" : "Pass") : "Pass değil";
  const kk = kart("Satın alanlar ve Pass sahipleri", bar, veriTablo(["Kişi", { ad: "Uygulama", filtre: true }, { ad: "Durum", filtre: true }, { ad: "Plan", filtre: true }, { ad: "Plan türü", filtre: true }, { ad: "Ürünün uygulaması", filtre: true }, { ad: "Kaynak", filtre: true }, "Satın alma", { ad: "Alana kadar", num: true }, { ad: "Tahmini ödeme", num: true }, { ad: "Ülke", filtre: true }, { ad: "Alım", num: true }, "Son görülme"],
    list.map(i => { const pa = passApp(i.plan), o = tahminiOdeme(i);
      return [whoText(i), appName(i.app), st(i), i.plan || "-", i.plan ? planType(i.plan) : "-", pa ? passAppName(pa) : "-", i.buySource ? srcName(i.buySource) : "-", tarihHucre(i.purchasedAt), dur(ev(i, "pw_buy_sec")),
        o ? { d: `${paraYaz(o.p, o.c)}${o.ulke ? "" : " (taban)"}`, s: o.usd || 0 } : "-", i.region || "-", num(Math.max(+i.purchases || 0, ev(i, "pw_buy"))), { d: ago(i.lastSeen), s: tms(i.lastSeen) }]; }),
    { sirala: [7, "desc"], bos: buyers.length ? "Bu filtreye uyan yok." : "Henüz satın alan ya da Pass sahibi yok.", satirTik: (_, n) => openUser(list[n].id) }),
    p(`Tahmini ödeme: planın kurulumun ülkesindeki liste fiyatı (App Store Connect, ${magaza?.fiyat?.uretim ? tarihTam(magaza.fiyat.uretim) : "fiyat tablosu yok"}); ülke tabloda yoksa taban fiyat. Vergi ve Apple payı öncesi, yenilemeler sayılmaz. Gerçek tutar Satış sayfasında.`, "alt-not"));
  c.appendChild(kk);
  if (!social && !DEMO) loadSocial();

  const jk = kart("Son paywall yolculukları");
  c.appendChild(jk);
  if (!pwLoaded) { jk.appendChild(p(pwLoading ? "Zaman çizelgeleri okunuyor..." : "Paywall gören son 30 kurulumun zaman çizelgesi okunacak.")); loadJourneys(); return; }
  const all = L.filter(i => evCache[i.id]).flatMap(journeysOf).sort((a, b) => b.t - a.t).slice(0, 150);
  const res = j => j.res === "bought" ? "Pass aldı" : j.res === "closed" ? "Kapattı" : (isOnline(j.i) && j.i.screen === "paywall" && Date.now() - j.t < 36e5 ? "Şu an açık" : "Kapanış yok");
  jk.appendChild(p(`Paywall gören son ${Object.keys(evCache).length} kurulumun zaman çizelgesinden, ${all.length} açılış.`));
  jk.appendChild(veriTablo(["Ne zaman", "Kişi", { ad: "Uygulama", filtre: true }, { ad: "Nereden", filtre: true }, { ad: "Açık kaldı", num: true }, { ad: "Sonuç", filtre: true }, { ad: "Dil", filtre: true }],
    all.map(j => [tarihHucre(j.t), whoText(j.i), appName(j.i.app), srcName(j.src), j.sec != null ? dur(j.sec) : "-", res(j), j.i.language || "-"]),
    { sirala: [0, "desc"], bos: "Henüz paywall yolculuğu yok.", satirTik: (_, n) => openUser(all[n].i.id) }));
}
async function loadJourneys() {
  if (pwLoaded || pwLoading || !allInstalls.length) return;
  pwLoading = true;
  const who = allInstalls.filter(i => ev(i, "pw_view") > 0).sort((a, b) => tms(b.lastSeen) - tms(a.lastSeen)).slice(0, 30);
  try { await Promise.all(who.map(i => loadEvents(i.id))); pwLoaded = true; }
  catch (e) { toast("Zaman çizelgesi okunamadı: " + (e.code || e.message)); }
  pwLoading = false;
  if (K.sayfa === "paywall") K.ciz();
}
function journeysOf(i) {
  const evs = (evCache[i.id] || []).slice().sort((a, b) => tms(a.t) - tms(b.t)), out = [];
  let cur = null;
  for (const e of evs) {
    if (e.e === "pw_view") { if (cur) out.push(cur); cur = { i, t: tms(e.t), src: e.p, sec: null, res: "open" }; }
    else if (cur && e.e === "pw_buy") { cur.res = "bought"; cur.sec = +e.s || cur.sec; }
    else if (cur && (e.e === "pw_close" || e.e === "pw_close_bought")) { cur.sec = +e.s || 0; if (e.e === "pw_close_bought") cur.res = "bought"; else if (cur.res !== "bought") cur.res = "closed"; out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}

// ─── Satış (mağaza raporu) ───────────────────────────────────────────────
/* panel/sales (panel-yaz.mjs): uygulamalar[slug].gunluk [{tarih, indirme, guncelleme, iap, gelir{para: tutar}}].
   panel/magaza (bam-sports.mjs): platform ayrımı (iOS + Play kovası) ve kur. Gelir "Developer Proceeds":
   Apple'ın kesintisinden sonra kalan. */
function satisSatirlari() {
  const out = [];
  if (sales?.uygulamalar) for (const [slug, u] of Object.entries(sales.uygulamalar)) { const a = SLUG_APP[slug]; if (!a) continue; for (const g of u.gunluk || []) out.push({ t: g.tarih, a, ...g }); }
  return out;
}
function satis(c) {
  const d = P(), mag = (magaza?.gunluk || []);
  let rows = satisSatirlari();
  const kaynak = rows.length ? "panel/sales" : mag.length ? "panel/magaza" : null;
  if (!rows.length) rows = mag.map(r => ({ ...r, tarih: r.t }));
  if (!rows.length) { c.appendChild(notKutu(esc(salesErr || "Mağaza özeti yok.") + " Mac'te <code>node scripts/lab/panel-yaz.mjs</code> ve <code>node scripts/lab/bam-sports.mjs</code> çalışınca dolar.", "uyari")); return; }
  const r = rows.filter(x => aOk(x.a));
  const ilk = d.bas ? istGun(d.bas) : "0000", sonG = istGun(d.son);
  const R = r.filter(x => x.t >= ilk && x.t <= sonG);
  const RO = d.oncekiBas != null ? r.filter(x => x.t >= istGun(d.oncekiBas) && x.t < ilk) : null;
  const gelirTop = l => { const m = {}; for (const x of l) for (const [k, v] of Object.entries(x.gelir || {})) m[k] = (m[k] || 0) + +v; return m; };
  const gU = l => l.reduce((t, x) => t + gelirUsd(x.gelir).t, 0);
  const g = gelirTop(R);
  c.appendChild(p(`Kaynak: App Store satış raporu ve Play kovası, Mac'teki günlük iş yazar (${kaynak}, ${tarihTam(kaynak === "panel/sales" ? sales.uretim : magaza?.uretim)}). Gelir Apple ve Google'ın kesintisinden sonra kalan (Developer Proceeds); dolar karşılığı ${magaza?.kur ? `${esc(magaza.kur.tarih || "")} kuruyla` : "kur yok"}, yaklaşık. Rapor bir gün gecikmeli gelir; sürüm filtresi buraya uygulanmaz.`));
  c.appendChild(tiles([
    ["İndirme", fmt(sum(R, "indirme")), periodWord(), RO ? fark(sum(R, "indirme"), sum(RO, "indirme")) : undefined],
    ["Güncelleme", fmt(sum(R, "guncelleme")), periodWord(), RO ? fark(sum(R, "guncelleme"), sum(RO, "guncelleme")) : undefined],
    ["Uygulama içi satın alma", fmt(sum(R, "iap")), "yenilemeler dahil", RO ? fark(sum(R, "iap"), sum(RO, "iap")) : undefined],
    ["Gelir (dolar karşılığı)", kur() ? "≈ " + paraYaz(gU(R), "USD") : "-", periodWord(), RO && kur() ? fark(gU(R), gU(RO)) : undefined],
    ...Object.entries(g).sort((a, b) => (usd(b[1], b[0]) || 0) - (usd(a[1], a[0]) || 0)).slice(0, 4).map(([k, v]) => ["Gelir " + k, paraYaz(v, k), "yerel para"]),
  ]));
  const gunler = [];
  for (let t = new Date((R[0]?.t || ilk) + "T00:00:00Z"); dayKey(t) <= sonG; t = new Date(t.getTime() + 864e5)) gunler.push(dayKey(t));
  const shown = appF === "all" ? APP_KEYS : [appF];
  const gun = alan => gunler.map(t => ({ t, ...Object.fromEntries(shown.map(a => [a, R.filter(x => x.t === t && x.a === a).reduce((s, x) => s + (alan === "gelir" ? gelirUsd(x.gelir).t : +x[alan] || 0), 0)])) }));
  const ser = shown.map(a => ({ ad: appName(a), alan: a, renk: APPS[a].renk }));
  const iz = izgara(c);
  grafikKart(iz, "Günlük indirme", k => gunlukCubuk(k, gun("indirme"), { seriler: ser }));
  grafikKart(iz, "Günlük gelir (dolar karşılığı)", k => gunlukCubuk(k, gun("gelir").map(x => ({ ...x, ...Object.fromEntries(shown.map(a => [a, Math.round(x[a] * 100) / 100])) })), { seriler: ser }));
  grafikKart(iz, "Günlük uygulama içi satın alma", k => gunlukCubuk(k, gun("iap"), { seriler: ser }));
  c.appendChild(kart("Uygulamaya göre", veriTablo(["Uygulama", { ad: "İndirme", num: true }, { ad: "Güncelleme", num: true }, { ad: "IAP", num: true }, { ad: "Gelir ≈ USD", num: true }, "Para birimleri"],
    shown.map(a => { const l = R.filter(x => x.a === a); const gg = gelirTop(l); return [appName(a), num(sum(l, "indirme")), num(sum(l, "guncelleme")), num(sum(l, "iap")), { d: paraYaz(gU(l), "USD"), s: gU(l) }, Object.entries(gg).map(([k, v]) => paraYaz(v, k)).join(" · ") || "-"]; }),
    { ara: false, sirala: [4, "desc"] })));
  const iz2 = izgara(c);
  iz2.appendChild(kart("Para birimine göre", veriTablo(["Para", { ad: "Tutar", num: true }, { ad: "≈ USD", num: true }], Object.entries(g).map(([k, v]) => [k, { d: paraYaz(v, k), s: v }, { d: usd(v, k) != null ? paraYaz(usd(v, k), "USD") : "-", s: usd(v, k) || 0 }]), { ara: false, sirala: [2, "desc"], bos: "Bu dönemde gelir yok." })));
  if (mag.length) {
    const M = mag.filter(x => aOk(x.a) && x.t >= ilk && x.t <= sonG);
    iz2.appendChild(kart("Platforma göre", veriTablo(["Platform", { ad: "İndirme", num: true }, { ad: "IAP", num: true }, { ad: "Gelir ≈ USD", num: true }],
      ["ios", "android"].map(pl => { const l = M.filter(x => x.p === pl); return [pl === "ios" ? "iOS (App Store)" : "Android (Play kovası)", num(sum(l, "indirme")), num(sum(l, "iap")), { d: paraYaz(gU(l), "USD"), s: gU(l) }]; }), { ara: false }),
      p("panel/magaza'dan; Play kovası yalnız Tenis (com.aberk.wear) için.", "alt-not")));
    const ul = {}; for (const x of M) for (const [u, n] of Object.entries(x.ulkeler || {})) ul[u] = (ul[u] || 0) + n;
    grafikKart(c, "İndirmenin ülkesi", k => dunyaHaritasi(k, ul, { birim: "indirme" }), "App Store indirme ülkeleri ve Play satış ülkeleri.");
  } else if (sales?.ulkeler && appF === "all") grafikKart(c, "İndirmenin ülkesi (hepsi)", k => dunyaHaritasi(k, sales.ulkeler, { birim: "indirme" }));
  c.appendChild(kart("Gün gün", veriTablo(["Gün", { ad: "Uygulama", filtre: true }, { ad: "İndirme", num: true }, { ad: "Güncelleme", num: true }, { ad: "IAP", num: true }, "Gelir", { ad: "≈ USD", num: true }],
    R.slice().sort((a, b) => b.t.localeCompare(a.t)).map(x => [{ d: tarihTam(x.t), s: x.t }, appName(x.a), num(x.indirme), num(x.guncelleme), num(x.iap), Object.entries(x.gelir || {}).map(([k, v]) => paraYaz(v, k)).join(" · ") || "-", { d: paraYaz(gelirUsd(x.gelir).t, "USD"), s: gelirUsd(x.gelir).t }]),
    { sirala: [0, "desc"], bos: "Bu dönemde satır yok." })));
  if (magaza?.fiyat?.urunler) c.appendChild(kart("Pass fiyatları (App Store Connect)", veriTablo(["Ürün", { ad: "Uygulama", filtre: true }, { ad: "Tür", filtre: true }, "Taban", "Türkiye", "ABD", "Almanya", "Birleşik Krallık"],
    Object.entries(magaza.fiyat.urunler).filter(([, u]) => aOk(u.a)).map(([id, u]) => [id, appName(u.a), planType(u.tur), u.taban ? paraYaz(u.taban.p, u.taban.c) : "-", ...["TUR", "USA", "DEU", "GBR"].map(t => u.ulke?.[t] ? paraYaz(u.ulke[t].p, u.ulke[t].c) : "-")]), { ara: false }),
    p(`ascelerate ile haftada bir (${tarihTam(magaza.fiyat.uretim)}). Ömür boyu ürünlerin yalnız taban fiyatı var, diğer ülkelere Apple eşitler.`, "alt-not")));
}

// ─── Kullanım ────────────────────────────────────────────────────────────
function kullanim(c) {
  const S = stats(), O = prevStats(), L = I();
  const sess = evSum(S, "session"), sessSec = evSum(S, "session_sec");
  const mDone = evSum(S, "match_done"), mSec = evSum(S, "match_done_sec");
  const watch = L.filter(i => typeof i.watchPaired === "boolean"), paired = watch.filter(i => i.watchPaired);
  c.appendChild(p("Ne yapıyorlar: tutulan maçlar, saate gönderilen kurulumlar, paylaşımlar, reklamlar, kortlar, tanıtım turları. Dönem sayıları günlük kayıtlardan" + surumNotuVar() + ", kişi sayıları kurulumlardan."));
  c.appendChild(tiles([
    ["Tamamlanan maç", fmt(sum(S, "matches_completed")), periodWord(), sf("matches_completed")],
    ["Maç süresi", mDone ? mins(mSec / mDone) : "-", "ortalama"],
    ["Telefonda maç başladı", fmt(evSum(S, "phone_match_start")), periodWord(), evf("phone_match_start")],
    ["Saate gönderilen", fmt(sum(S, "matches_sent")), periodWord(), sf("matches_sent")],
    ["Paylaşım", fmt(sum(S, "shares")), periodWord(), sf("shares")],
    ["İzlenen reklam", fmt(sum(S, "ads_watched")), "ödüllü, " + periodWord(), sf("ads_watched")],
    ["Saat eşli", watch.length ? `%${pct(paired.length, watch.length)}` : "-", `${fmt(paired.length)} / ${fmt(watch.length)} kurulum`],
    ["Kortlar açılışı", fmt(evSum(S, "courts")), `${fmt(L.filter(i => ev(i, "courts") > 0).length)} kişi (hepsi)`, evf("courts")],
    ["Oturum", fmt(sum(S, "sessions")), periodWord(), sf("sessions")],
    ["Ortalama oturum", sess ? mins(sessSec / sess) : "-", `${fmt(sess)} biten oturum`, O && evSum(O, "session") ? fark(sess ? sessSec / sess : 0, evSum(O, "session_sec") / evSum(O, "session")) : undefined],
    ["Bildirime dokunma", fmt(evSum(S, "push_open")), periodWord(), evf("push_open")],
    ["Çökme / hata", fmt(evSum(S, "app_exception")), "Analytics aynası", evf("app_exception", true)],
  ]));
  const shown = appF === "all" ? APP_KEYS : [appF];
  grafikKart(c, "Tamamlanan maç (gün ve uygulama)", k => gunlukCubuk(k, S.map(s => ({ t: s.day, ...Object.fromEntries(shown.map(a => [a, s.apps[a]?.matches_completed || 0])) })), { seriler: shown.map(a => ({ ad: appName(a), alan: a, renk: APPS[a].renk })) }), surumNotuVar());
  const g = izgara(c);
  grafikKart(g, "Maç sonucu (dönem)", k => yatayCubuk(k, adla(evPrefix(S, "match_done_"), RESULT)));
  grafikKart(g, "Paylaşım türü (dönem)", k => yatayCubuk(k, adla(evPrefix(S, "share_"), SHARE)));
  grafikKart(g, "Telefonda maç biçimi (dönem)", k => yatayCubuk(k, Object.fromEntries(Object.entries(evPrefix(S, "phone_match_start_")).map(([k2, v]) => [k2.replace(/_+/g, " ").trim(), v])), { limit: 10 }));
  grafikKart(g, "Saate gönderilen spor (dönem)", k => yatayCubuk(k, evPrefix(S, "match_sent_to_watch_")));
  const appWatch = shown.map(a => { const l = L.filter(i => i.app === a && typeof i.watchPaired === "boolean"); return `<div>${esc(appName(a))}</div><div>${l.length ? `%${pct(l.filter(i => i.watchPaired).length, l.length)} eşli · ${fmt(l.filter(i => i.watchApp).length)} saat uygulaması kurulu` : "-"}</div>`; }).join("");
  const wd = el("div", "kucuk-dl"); wd.innerHTML = `<div>Eşli saat</div><div>${fmt(paired.length)} / ${fmt(watch.length)}</div><div>Saat uygulaması kurulu</div><div>${fmt(L.filter(i => i.watchApp).length)}</div><div>Eşli ama uygulama yok</div><div>${fmt(paired.filter(i => !i.watchApp).length)}</div>${appWatch}`;
  g.appendChild(kart("Apple Watch", wd));
  const buckets = [["0", 0, 1], ["1", 1, 2], ["2-5", 2, 6], ["6-20", 6, 21], ["21-50", 21, 51], ["50 üstü", 51, 1e9]];
  grafikKart(g, "Defterdeki maç sayısı", k => yatayCubuk(k, buckets.map(([ad, a, b]) => [`${ad} maç`, L.filter(i => (+i.n_matches || 0) >= a && (+i.n_matches || 0) < b).length]), { limit: 10 }), "Kurulumların şu anki kayıtlı maçı.");
  // Tanıtım turları (Coach): onboarding hunisi.
  const tours = [...new Set([...Object.keys(evPrefix(S, "coach_start_")), ...Object.keys(evPrefix(L, "coach_start_"))])];
  g.appendChild(kart("Tanıtım turları", veriTablo(["Tur", { ad: "Başladı (dönem)", num: true }, { ad: "Bitti", num: true }, { ad: "Atlandı", num: true }, { ad: "Bitirme", num: true }, { ad: "Kişi bitirdi (hepsi)", num: true }],
    tours.map(t => { const s0 = evSum(S, "coach_start_" + t), dn = evSum(S, "coach_done_" + t), sk = evSum(S, "coach_skip_" + t);
      return [TOUR[t] || t, num(s0), num(dn), num(sk), { d: yuzde(dn, s0), s: s0 ? dn / s0 : 0 }, num(L.filter(i => ev(i, "coach_done_" + t) > 0).length)]; }), { ara: false, bos: "Bu dönemde tanıtım turu yok." })));
  grafikKart(g, "Bildirim izni sorusu (dönem)", k => yatayCubuk(k, adla(evPrefix(S, "push_permission_"), { granted: "Verdi", denied: "Vermedi", not_now: "Şimdi değil" })),
    `Bildirim konusuna abone olamayan: ${fmt(evSum(S, "push_topic_fail"))} kez (${fmt(L.filter(i => ev(i, "push_topic_fail") > 0).length)} kurulum, tüm zamanlar).`);
  grafikKart(g, "Uygulama dili ve tema", k => { yatayCubuk(k, adla(evPrefix(L, "app_language_"), LANG)); const t = el("div"); t.style.marginTop = "12px"; k.appendChild(t); yatayCubuk(t, adla(evPrefix(L, "app_theme_"), { dark: "Koyu tema", light: "Açık tema", system: "Sistem teması" })); }, "Uygulamanın içinden seçilen; kurulum sayaçları.");
  // Oturum dağılımı ve saat x gün: zaman çizelgelerinden (okuma ister).
  const ok = kart("Oturum süresi dağılımı ve saat × gün");
  c.appendChild(ok);
  oturumKarti(ok, L);
  // Bütün olay sayaçları: telemetride olup başka yerde görünmeyen hiçbir şey kalmasın.
  const tum = {};
  const ekle = (arr, alan) => { for (const x of arr) for (const [k, v] of Object.entries(x.ev || {})) { if (/^screen_/.test(k) || k.endsWith("_sec") || /^push_open_[0-9a-f]{6,}$/.test(k)) continue; (tum[k] ||= { s: 0, o: 0, k: 0 })[alan] += +v || 0; } };
  ekle(S, "s"); if (O) ekle(O, "o");
  for (const i of L) for (const k of Object.keys(i.ev || {})) if (tum[k]) tum[k].k++;
  const baz = k => Object.keys(OLAY).find(b => k === b || k.startsWith(b + "_")) || k;
  c.appendChild(kart("Bütün olay sayaçları (dönem)", veriTablo(["Olay", "Anahtar", { ad: "Ana olay", filtre: true }, { ad: "Kez", num: true }, { ad: "Önceki dönem", num: true }, { ad: "Kişi (hepsi)", num: true }],
    Object.entries(tum).map(([k, v]) => [k in OLAY ? olayAdi(k) : `${olayAdi(baz(k))} · ${k.slice(baz(k).length + 1) || k}`, k, olayAdi(baz(k)), num(v.s), O ? num(v.o) : "-", num(v.k)]),
    { sirala: [3, "desc"] }), p("Ekran anahtarları Ekranlar'da, bildirim açılmaları Gönderilenler'de. Parametreli olaylar (ör. <code>match_done_win</code>) ana olayın altında.", "alt-not")));
  c.appendChild(kart("Sayaçlar (dönem)", veriTablo(["Sayaç", "Anahtar", { ad: "Kez", num: true }, { ad: "Önceki dönem", num: true }, { ad: "Kişi (hepsi)", num: true }],
    [...Object.entries(COUNTERS).map(([k, ad]) => [ad, k, num(sum(S, k)), O ? num(sum(O, k)) : "-", num(L.filter(i => +i[k] > 0).length)]),
     ["Maç içe aktarıldı", "match_imported", num(evSum(S, "match_imported")), O ? num(evSum(O, "match_imported")) : "-", num(L.filter(i => ev(i, "match_imported") > 0).length)]], { ara: false })));
}
function oturumKarti(k, L) {
  const hedef = L.slice().sort((a, b) => tms(b.lastSeen) - tms(a.lastSeen)).slice(0, 50);
  if (!evToplu) {
    k.appendChild(p(`Günlük kayıtlarda yalnız ortalama var. Dağılım ve saat × gün ısı haritası için son görülen ${fmt(hedef.length)} kurulumun zaman çizelgesi okunur (kurulum başına en çok 100 olay, en çok ~${fmt(hedef.length * 100)} Firestore okuması).`));
    const b = el("button", "second", "Zaman çizelgelerini oku");
    b.onclick = async () => { b.disabled = true; b.textContent = "Okunuyor..."; try { await Promise.all(hedef.map(i => loadEvents(i.id, 100))); evToplu = true; } catch (e) { toast("Okunamadı: " + (e.code || e.message)); } K.ciz(); };
    k.appendChild(b);
    if (DEMO) { evToplu = true; setTimeout(() => K.sayfa === "kullanim" && K.ciz(), 0); }
    return;
  }
  const evs = L.flatMap(i => (evCache[i.id] || []));
  const ses = evs.filter(e => e.e === "session" && +e.s > 0);
  const kova = [["1 dk altı", 0, 60], ["1-3 dk", 60, 180], ["3-10 dk", 180, 600], ["10-30 dk", 600, 1800], ["30-60 dk", 1800, 3600], ["1-2 sa", 3600, 7200], ["2 sa üstü", 7200, 1e9]];
  const g = izgara(k);
  const a = el("div"), b = el("div"); g.append(a, b);
  a.appendChild(el("h3", null, "Oturum süresi")); const ak = el("div"); a.appendChild(ak);
  yatayCubuk(ak, kova.map(([ad, x, y]) => [ad, ses.filter(e => +e.s >= x && +e.s < y).length]), { limit: 10 });
  b.appendChild(el("h3", null, "Oturumun bittiği saat")); const bk = el("div"); b.appendChild(bk);
  saatIsi(bk, saatMatrisi(ses.map(e => ts(e.t))), { birim: "oturum" });
  k.appendChild(p(`${fmt(Object.keys(evCache).length)} kurulumun ${fmt(ses.length)} oturumundan. Medyan ${ses.length ? mins(ses.map(e => +e.s).sort((x, y) => x - y)[Math.floor(ses.length / 2)]) : "-"}.`, "alt-not"));
}

// ─── Kullanıcılar ────────────────────────────────────────────────────────
const usFiltre = { hizli: "all", son: "any", tur: "any", ulke: "any" };
function kullanicilar(c) {
  if (!social) loadSocial();
  const L = I(), now = Date.now();
  c.appendChild(p("Her satır bir uygulamanın bir kurulumu. Giriş yapanların kullanıcı adı ve adı sosyal profilden (<code>users</code>) gelir; girişsiz kurulum anonimdir. Sütun başlığına dokununca sıralanır, kategorik sütunlar açılır kutuyla süzülür; satıra dokununca ayrıntı, sosyal profil ve zaman çizelgesi açılır."));
  if (!social || social.loading) c.appendChild(p("Kullanıcı adları yükleniyor..."));
  else if (social.err?.users) c.appendChild(notKutu(`Sosyal profiller okunamadı (${esc(social.err.users)}); kullanıcı adı yalnız telemetriden gelir.`, "err"));
  if (!allInstalls.some(i => i.platform === "android")) c.appendChild(notKutu("Bu tabloda Android kurulum yok. Android Tenis 2.0 (<code>com.aberk.wear</code>) aynı telemetriyi yazar; 2.0 üretime çıkınca burada görünür. Diğer dört uygulamanın Android sürümü yok.", "uyari"));
  const bar = el("div", "bar2");
  const sec = (k, ops) => { const s = el("select"); s.innerHTML = ops.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join(""); s.value = usFiltre[k]; if (s.value !== usFiltre[k]) s.value = ops[0][0]; s.onchange = () => { usFiltre[k] = s.value; K.ciz(); }; bar.appendChild(s); };
  sec("hizli", [["all", "Hızlı süz: hepsi"], ["online", "Online"], ["new", "Dönemde kurulan"], ["active", "Dönemde aktif"], ["handle", "Kullanıcı adı olan"], ["reach", "Bildirim adresi olan"], ["paywall", "Paywall görmüş"], ["bought", "Satın almış"], ["watch", "Saat eşli"], ["pushopen", "Bildirime dokunmuş"], ["noMatch", "Hiç maç bitirmemiş"]]);
  sec("son", [["any", "Son görülme: hepsi"], ["1", "Son 24 saat"], ["7", "Son 7 gün"], ["28", "Son 28 gün"], ["-7", "7 gündür yok"], ["-30", "30 gündür yok"]]);
  sec("tur", [["any", "Tanıtım: hepsi"], ["Bitirdi", "Tanıtımı bitirdi"], ["Atladı", "Tanıtımı atladı"], ["Başladı", "Başladı, bitirmedi"], ["Hiç", "Tanıtım yok"]]);
  const ulkeler = countBy(L, i => i.region || "?");
  sec("ulke", [["any", "Ülke: hepsi"], ...Object.entries(ulkeler).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, `${k === "?" ? "Bilinmiyor" : flag(k) + " " + ULKE(k)} (${n})`])]);
  const sifir = el("button", "ghost", "Filtreleri sıfırla"); sifir.onclick = () => { Object.assign(usFiltre, { hizli: "all", son: "any", tur: "any", ulke: "any" }); K.ciz(); }; bar.appendChild(sifir);
  c.appendChild(bar);
  const d = P();
  const keep = {
    all: () => true, online: isOnline, new: i => inP(i.firstSeen, d), active: i => inP(i.lastSeen, d), handle: i => !!handleOf(i), reach: reachOf,
    paywall: i => ev(i, "pw_view") > 0, bought: everBought, watch: i => i.watchPaired, pushopen: i => ev(i, "push_open") > 0, noMatch: i => !(+i.matches_completed > 0 || ev(i, "match_done") > 0),
  }[usFiltre.hizli] || (() => true);
  const sd = +usFiltre.son || 0;
  const rows = L.filter(i => keep(i) && (usFiltre.ulke === "any" || (i.region || "?") === usFiltre.ulke) && (usFiltre.tur === "any" || tourState(i) === usFiltre.tur)
    && (!sd || (sd > 0 ? tms(i.lastSeen) >= now - sd * 864e5 : tms(i.lastSeen) < now + sd * 864e5)));
  const watchT = i => i.watchPaired == null ? "-" : i.watchPaired ? (i.watchApp ? "Eşli, kurulu" : "Eşli") : "Yok";
  const passT = i => i.pro ? (i.grandfathered && !i.plan ? "Eski kullanıcı" : "Pass") : everBought(i) ? "Almış, bitmiş" : "Yok";
  c.appendChild(veriTablo([
    "Kişi", { ad: "Durum", sirala: true }, "Son görülme", { ad: "Uygulama", filtre: true }, { ad: "Platform", filtre: true }, { ad: "Sürüm", filtre: true },
    { ad: "Ülke", filtre: true }, { ad: "Dil", filtre: true }, "İlk görülme", { ad: "Gün", num: true }, { ad: "Nerede", filtre: true }, { ad: "Cihaz", filtre: true }, { ad: "OS", filtre: true },
    { ad: "Saat", filtre: true }, { ad: "Pass", filtre: true }, { ad: "Plan", filtre: true }, { ad: "Bildirim", filtre: true }, { ad: "Hesap", filtre: true }, { ad: "Test", filtre: true }, { ad: "Tanıtım", filtre: true },
    { ad: "Oturum", num: true }, { ad: "Toplam süre", num: true }, { ad: "Defterde maç", num: true }, { ad: "Biten maç", num: true }, { ad: "Rakip", num: true }, { ad: "Paywall", num: true }, { ad: "Bildirime dokunma", num: true },
  ], rows.map(i => [whoText(i), N(badgesOf(i), statusScore(i)), { d: `${tarihTam(i.lastSeen)}`, s: tms(i.lastSeen) }, appName(i.app), platName(i), verStr(i),
    i.region || "?", lang2(i.language) || "?", tarihHucre(i.firstSeen), { d: daysSince(i) ?? "-", s: daysSince(i) ?? -1 }, whereIs(i), i.device || "?", i.os ? `${platName(i)} ${String(i.os).split(".")[0]}` : "?",
    watchT(i), passT(i), i.plan ? planType(i.plan) : "-", notifText(i), i.signedIn ? "Girişli" : "Girişsiz", i.tester ? "Test" : "Gerçek", tourState(i),
    num(i.sessions), dur(ev(i, "session_sec")), i.n_matches != null ? num(i.n_matches) : "-", num(i.matches_completed || ev(i, "match_done")), i.n_opponents != null ? num(i.n_opponents) : "-", num(ev(i, "pw_view")), num(ev(i, "push_open"))]),
  { sirala: [2, "desc"], araYazi: "Ara: @kullanıcı adı, ad, kimlik, cihaz, sürüm", bos: "Bu süzgece uyan kurulum yok.", satirTik: (_, n) => openUser(rows[n].id) }));
  c.appendChild(p(`${fmt(rows.length)} / ${fmt(L.length)} kurulum (üst süzgeçlerden sonra).`, "alt-not"));
}

function openUser(id) {
  const i = allInstalls.find(x => x.id === id); if (!i) return;
  const yes = b => b == null ? "-" : b ? "Evet" : "Hayır";
  const pa = passApp(i.plan), o = tahminiOdeme(i), h = handleOf(i);
  const opens = Object.entries(i.ev || {}).filter(([k]) => /^push_open_[0-9a-f]{6,}$/.test(k));
  kullaniciCekmecesi(i, [
    ["Uygulama", H(appTag(i.app))],
    ["Durum", statusScore(i) || i.platform === "android" ? H(badgesOf(i)) : "-"],
    ["Şu an", H(`${isOnline(i) ? '<span class="dot"></span>' : ""}${esc(whereIs(i))}`)],
    ["Son görülme", `${tarihTam(i.lastSeen)} (${ago(i.lastSeen)})`],
    ["İlk görülme", `${tt(i.firstSeen)}${daysSince(i) != null ? ` · ${daysSince(i)} gün önce` : ""}`],
    ["Sürüm", `${platName(i)} ${verStr(i)}`],
    ["Cihaz", `${i.device || "-"}${i.os ? ` · ${platName(i)} ${i.os}` : ""}`],
    ["Dil / ülke", `${LANG[lang2(i.language)] || i.language || "-"} / ${i.region ? `${flag(i.region)} ${ULKE(i.region)}` : "-"}`],
    ["Saat dilimi", i.tz || "-"],
    ["Kurulum kimliği", i.id],
    { baslik: "Bildirim ve hesap" },
    ["Bildirim", `${notifText(i)}${hasToken(i) ? "" : " · cihaz adresi (fcm) yok"}`],
    ["Bildirime dokunma", `${fmt(ev(i, "push_open"))} kez${opens.length ? ` · ${opens.length} farklı gönderim` : ""}`],
    ["Hesap", i.signedIn ? `Girişli${i.uid ? ` · ${i.uid.slice(0, 10)}` : ""}` : "Girişsiz"],
    ["Test cihazı", yes(i.tester)],
    { baslik: "Pass" },
    ["Pass", i.pro ? `Pass ${i.plan || ""}${pa && pa !== "?" ? ` · ${passAppName(pa)} ürünü` : ""}${i.grandfathered ? " · eski kullanıcı hakkı" : ""}` : "Hayır"],
    ["Satın alma", i.purchasedAt ? `${tarihTam(i.purchasedAt)} · ${srcName(i.buySource)} · ${mins(ev(i, "pw_buy_sec"))} sonra` : "-"],
    ["Tahmini ödeme", o ? `${paraYaz(o.p, o.c)} (${o.ulke ? "ülke fiyatı" : "taban fiyat"}, ${planType(o.tur)}, tahmini)` : "-"],
    ["Paywall", `${fmt(ev(i, "pw_view"))} gösterim · ${fmt(ev(i, "pw_close"))} kapatma · ${fmt(ev(i, "pw_buy"))} satın alma`],
    { baslik: "Kullanım" },
    ["Apple Watch", i.watchPaired == null ? "-" : i.watchPaired ? `Eşli · uygulama ${i.watchApp ? "kurulu" : "kurulu değil"}` : "Eşli saat yok"],
    ["Oturum", `${fmt(i.sessions)} · toplam ${mins(ev(i, "session_sec"))}${ev(i, "session") ? ` · ortalama ${mins(ev(i, "session_sec") / ev(i, "session"))}` : ""}`],
    ["Maç", `defterde ${i.n_matches != null ? fmt(i.n_matches) : "-"} · ${fmt(i.matches_completed)} bitti · ${fmt(i.matches_sent)} saate gitti · ${i.n_opponents != null ? fmt(i.n_opponents) : "-"} rakip`],
    ["Sonuçlar", Object.entries(evPrefix([i], "match_done_")).map(([k, v]) => `${RESULT[k] || k} ${fmt(v)}`).join(" · ") || "-"],
    ["Paylaşım / reklam", `${fmt(i.shares)} paylaşım · ${fmt(i.ads_watched)} reklam`],
    ["Tanıtım turu", `${tourState(i)}${Object.keys(evPrefix([i], "coach_done_")).length ? " · " + Object.keys(evPrefix([i], "coach_done_")).map(t => TOUR[t] || t).join(", ") : ""}`],
  ], {
    baslik: h ? "@" + h : `Kurulum ${shortId(id)}`,
    alt: [nameOf(i), appName(i.app), platName(i), verStr(i), i.region].filter(Boolean).join(" · "),
    eylemler: [{ ad: "Bu kişiye bildirim gönder", kapali: !reachOf(i), not: reachOf(i) ? "" : i.notif === false ? "Bildirimi kapatmış." : i.notif === true ? "İzin var ama cihaz adresi (fcm) henüz yazılmamış." : "Bildirim izni vermemiş ya da eski sürüm.", tik: kapat => { kapat(); pushToInstall(id); } }],
    hamAlanlar: true,
    ek: async kutu => {
      const sk = el("div"); kutu.appendChild(sk);
      sk.appendChild(el("h2", null, "Sosyal profil"));
      const soc = el("div"); sk.appendChild(soc);
      if (!(i.uid || i.signedIn)) soc.appendChild(p("Giriş yapmamış; sosyal profili yok."));
      else { soc.appendChild(p("Yükleniyor...")); loadSocial().then(() => { soc.textContent = ""; soc.appendChild(socialBlock(i)); }); }
      const sm = screenMap(i);
      kutu.appendChild(el("h2", null, "Ekranlarda geçen süre"));
      const ek = el("div"); kutu.appendChild(ek);
      yatayCubuk(ek, Object.fromEntries(Object.entries(sm).filter(([, v]) => v.sec > 0).map(([k, v]) => [screenName(k), v.sec])), { limit: 14 });
      const pwSrc = evPrefix([i], "pw_view_");
      if (Object.keys(pwSrc).length) { kutu.appendChild(el("h2", null, "Paywall kaynakları")); const pk = el("div"); kutu.appendChild(pk); yatayCubuk(pk, adla(pwSrc, SOURCES)); }
      kutu.appendChild(el("h2", null, "Zaman çizelgesi"));
      const tl = el("div"); kutu.appendChild(tl); tl.appendChild(p("Yükleniyor..."));
      try {
        const evs = (await loadEvents(id)).slice().sort((a, b) => tms(b.t) - tms(a.t));
        let lastDay = "";
        tl.innerHTML = evs.length ? `<p class="muted">Son ${evs.length} olay, en yenisi üstte, Türkiye saati.</p><div class="tl">${evs.map(e => {
          const dk = tarihTam(e.t, { saatsiz: true });
          const head = dk !== lastDay ? `<div class="day">${esc(dk)}</div>` : ""; lastDay = dk;
          return `${head}<div class="${evClass(e)}"><time>${esc((tarihTam(e.t).split(" ")[3]) || "")}</time>${esc(eventText(e))}</div>`;
        }).join("")}</div>` : `<p class="muted">Zaman çizelgesi boş.</p>`;
      } catch (e) { tl.innerHTML = `<p class="muted">Okunamadı: ${esc(e.code || e.message)}</p>`; }
    },
  });
}
/* Çekmecedeki sosyal profil: kullanıcı adı, ad, takip, ligler, aynı hesabın diğer kurulumları. */
function socialBlock(i) {
  if (social?.err?.users) return notKutu(`Sosyal profiller okunamadı: ${esc(social.err.users)}`, "err");
  const u = profileOf(i);
  if (!u) return p(i.uid ? `Hesap <code>${esc(i.uid.slice(0, 10))}</code> için profil belgesi yok (silinmiş ya da henüz yazılmamış).` : "Giriş yapmış ama hesap kimliği (uid) telemetriye yazılmamış.");
  const leagues = social.leagues.filter(l => (l.members || []).includes(u.id));
  const others = installsOf(u.id).filter(x => x.id !== i.id);
  const dl = el("div", "kucuk-dl");
  dl.innerHTML = `<div>Kullanıcı adı</div><div><b>@${esc(u.handle || "-")}</b></div>
    <div>Ad</div><div>${esc(u.displayName || "-")}</div>
    <div>Sporlar</div><div>${(u.sports || []).map(appTag).join(" ") || "-"}</div>
    <div>Ülke / şehir</div><div>${esc([u.country, u.city].filter(Boolean).join(" / ") || "-")}</div>
    ${u.level ? `<div>Seviye</div><div>${esc(u.level)}</div>` : ""}${u.bio ? `<div>Hakkında</div><div>${esc(u.bio)}</div>` : ""}
    <div>Kilitli profil</div><div>${u.private ? "Evet" : "Hayır"}</div>
    <div>Hesap açıldı</div><div>${esc(tt(u.createdAt))}</div>
    <div>Takipçi / takip</div><div>${fmt(social.followers.get(u.id) || 0)} takipçi · ${fmt(social.following.get(u.id) || 0)} takip</div>
    <div>Gönderi / yorum</div><div>${fmt(social.posts.filter(x => x.authorUid === u.id).length)} gönderi · ${fmt(social.comments.filter(x => x.uid === u.id).length)} yorum</div>
    <div>Paylaşılan maç</div><div>${fmt(social.matches.filter(m => (m.players || []).includes(u.id)).length)}</div>
    <div>Ligler</div><div>${leagues.length ? leagues.map(l => `${esc(l.name || "?")} <span class="muted">(${esc(appName(l.sport))}, ${fmt((l.members || []).length)} üye)</span>`).join("<br>") : "-"}</div>
    <div>Hakkında rapor</div><div>${fmt(social.reports.filter(r => r.uid === u.id).length)}</div>
    <div>Diğer kurulumları</div><div></div>`;
  dl.lastElementChild.appendChild(installChips(others));
  return dl;
}

// ─── Sürümler ────────────────────────────────────────────────────────────
const svFiltre = { secili: "" };
function surumler(c) {
  const L = I();
  c.appendChild(p("Hangi sürümde kaç kişi var, bir sürümden sonra ne değişti. Mağaza tarihleri ve notlar <code>surumler.json</code>'dan (App Store Connect ve Play, her sabah); Analytics sütunları <code>panel/ga4</code>'ten."));
  c.appendChild(kart("Sürüm benimseme", surumTablo(L)));
  if (G?.surumGunluk?.length) {
    const rows = G.surumGunluk.filter(r => aOk(r.a));
    const ver = {}; for (const r of rows) ver[`${appName(r.a)} ${r.v}`] = (ver[`${appName(r.a)} ${r.v}`] || 0) + r.au;
    const top = Object.entries(ver).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
    const d = P(); const ilk = d.bas ? istGun(d.bas) : "0000";
    const gun = {}; for (const r of rows) if (r.t >= ilk) { const k = `${appName(r.a)} ${r.v}`; if (!top.includes(k)) continue; (gun[r.t] ||= { t: r.t })[k] = ((gun[r.t] || {})[k] || 0) + r.au; }
    const seri = Object.values(gun).sort((a, b) => a.t.localeCompare(b.t)).map(x => { for (const k of top) x[k] ||= 0; return x; });
    grafikKart(c, "Sürüme göre günlük aktif kullanıcı (Analytics)", k => gunlukCubuk(k, seri, { seriler: top.map(x => ({ ad: x, alan: x })) }), "En çok kullanıcısı olan 8 sürüm; geçişin hızı burada görünür.");
  }
  // Sürüm öncesi / sonrası: mağaza tarihinden önceki ve sonraki 14 gün, günlük sayaçlar.
  const notlar = (NOTLAR || []).filter(x => aOk(SLUG_APP[x.slug]));
  const bar = el("div", "bar2");
  const s = el("select");
  s.innerHTML = `<option value="">Karşılaştırılacak sürümü seç</option>` + notlar.map((x, n) => `<option value="${n}">${esc(appName(SLUG_APP[x.slug]))} ${esc(x.surum)} · ${x.platform === "android" ? "Android" : "iOS"} · ${esc(tarihTam(x.tarih, { saatsiz: true }))}</option>`).join("");
  s.value = svFiltre.secili; s.onchange = () => { svFiltre.secili = s.value; K.ciz(); };
  bar.appendChild(s);
  const kk = kart("Bir sürümden sonra ne değişti?", bar);
  c.appendChild(kk);
  const x = notlar[+svFiltre.secili];
  if (svFiltre.secili !== "" && x) {
    const a = SLUG_APP[x.slug], t0 = tms(x.tarih), gun = 14;
    const al = (b, e) => { const out = {}; for (const st of allStats) if (st.app === a && st.day >= istGun(b) && st.day < istGun(e)) { for (const [k, v] of Object.entries(st)) if (typeof v === "number") out[k] = (out[k] || 0) + v; for (const [k, v] of Object.entries(st.ev || {})) out["ev." + k] = (out["ev." + k] || 0) + v; } return out; };
    const once = al(t0 - gun * 864e5, t0), sonra = al(t0, Math.min(Date.now() + 864e5, t0 + gun * 864e5));
    const gunSonra = Math.max(1, Math.min(gun, Math.ceil((Date.now() - t0) / 864e5)));
    const satir = (ad, k, f = v => v) => { const a1 = f(once, k) / gun, b1 = f(sonra, k) / gunSonra; return [ad, { d: a1.toFixed(2).replace(".", ","), s: a1 }, { d: b1.toFixed(2).replace(".", ","), s: b1 }, { d: a1 ? `${b1 >= a1 ? "▲" : "▼"} %${Math.abs((b1 - a1) / a1 * 100).toFixed(0)}` : b1 ? "yeni" : "-", s: a1 ? (b1 - a1) / a1 : 0 }]; };
    const g = (o, k) => +o[k] || 0;
    kk.appendChild(p(`${esc(appName(a))} ${esc(x.surum)} mağazaya ${esc(tarihTam(x.tarih, { saatsiz: true }))} günü çıktı. Günlük ortalama: öncesi ${gun} gün, sonrası ${gunSonra} gün (${gunSonra < gun ? "henüz tamamlanmadı" : "tam"}). Günlük sayaçlar uygulama başına, sürüme bölünmez: geçiş günlerinde eski sürüm de sayılır.`));
    kk.appendChild(veriTablo(["Gösterge", { ad: "Öncesi / gün", num: true }, { ad: "Sonrası / gün", num: true }, { ad: "Değişim", num: true }], [
      satir("Yeni kurulum", "installs_new", g), satir("Oturum", "sessions", g), satir("Tamamlanan maç", "matches_completed", g), satir("Saate gönderilen", "matches_sent", g),
      satir("Paywall gösterimi", "paywall_views", g), satir("Satın alma", "purchases", g), satir("Paylaşım", "shares", g), satir("Reklam", "ads_watched", g),
      satir("Telefonda maç", "ev.phone_match_start", g), satir("Sosyal işlem", "ev.social", g), satir("Bildirime dokunma", "ev.push_open", g), satir("Çökme / hata", "ev.app_exception", g),
    ], { ara: false, kopyala: true }));
    if (x.notlar?.length) { const ul = el("ul"); for (const n of x.notlar) { const li = el("li"); li.textContent = n; ul.appendChild(li); } kk.appendChild(el("h3", null, "Bu sürümde gelenler")); kk.appendChild(ul); }
  }
  const nk = kart("Bütün sürüm notları"); c.appendChild(nk);
  nk.appendChild(surumNotlariKutu(notlar, { limit: 60, uygulamaAdi: s2 => appName(SLUG_APP[s2]) }));
}

// ─── Analytics (GA4 özeti) ───────────────────────────────────────────────
function gaFrom() {
  if (!G?.gunluk?.length || !K.aralik) return "0000";
  const last = G.gunluk.reduce((m, r) => r.t > m ? r.t : m, "");
  const d = new Date(last + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - K.aralik + 1);
  return dayKey(d);
}
const gaOk = r => aOk(r.a);
const topla = (rows, anahtar, deger) => { const m = {}; for (const r of rows) { const k = anahtar(r); m[k] = (m[k] || 0) + (+deger(r) || 0); } return m; };
function analytics(c) {
  if (!G) { c.appendChild(notKutu(esc(gaError || "Analytics özeti yok."), "uyari")); return; }
  const bas = gaFrom(), hepsi = appF === "all";
  c.appendChild(p(`Firebase Analytics özeti · veri ${esc(tarihTam(G.uretim))} · ${fmt(G.toplam?.totalUsers)} kullanıcı / ${G.gun} gün · ${fmt((G.akislar || G.uygulamalar || []).length)} veri akışı. Mac'teki günlük iş (<code>scripts/lab/bam-sports.mjs</code>) yazar; bugünün verisi eksik olabilir. Dönem ve uygulama filtresi kırılımlara uygulanır; sürüm filtresi Analytics'e uygulanmaz.`));
  const gun = G.gunluk.filter(r => r.t >= bas && gaOk(r));
  const m = {};
  for (const r of gun) { const x = m[r.t] ||= { t: r.t, au: 0, nu: 0, os: 0, sure: 0, ios: 0, android: 0 }; x.au += r.au; x.nu += r.nu; x.os += r.os; x.sure += r.sure; x[r.p === "android" ? "android" : "ios"] += r.au; }
  const s = Object.values(m).sort((a, b) => a.t.localeCompare(b.t));
  const top = s.reduce((a, r) => ({ nu: a.nu + r.nu, os: a.os + r.os, sure: a.sure + r.sure }), { nu: 0, os: 0, sure: 0 });
  // Önceki eşit dönem (GA serisi içinden).
  let once = null;
  if (K.aralik) { const b = new Date(bas + "T00:00:00Z"); const ob = dayKey(b.getTime() - K.aralik * 864e5); const l = G.gunluk.filter(r => r.t >= ob && r.t < bas && gaOk(r)); if (l.length) once = { nu: sum(l, "nu"), os: sum(l, "os"), sure: sum(l, "sure") }; }
  const o = {};
  for (const r of G.olaylar || []) if (r.t >= bas && gaOk(r)) { const x = o[r.o] ||= { n: 0, k: 0 }; x.n += r.n; x.k += r.k; }
  const oO = {}; if (K.aralik) { const ob = dayKey(new Date(bas + "T00:00:00Z").getTime() - K.aralik * 864e5); for (const r of G.olaylar || []) if (r.t >= ob && r.t < bas && gaOk(r)) (oO[r.o] ||= { n: 0 }).n += r.n; }
  c.appendChild(tiles([
    ["Bugün aktif", fmt(G.aktif?.dau), "son 1 gün, beş uygulama"], ["Haftalık aktif", fmt(G.aktif?.wau), "son 7 gün, beş uygulama"], ["Aylık aktif", fmt(G.aktif?.mau), "son 28 gün, beş uygulama"],
    ["Yeni kullanıcı", fmt(top.nu), periodWord(), once ? fark(top.nu, once.nu) : undefined],
    ["Oturum", fmt(top.os), periodWord(), once ? fark(top.os, once.os) : undefined],
    ["Oturum başı süre", mins(top.os ? top.sure / top.os : 0), "etkileşim süresi", once && once.os ? fark(top.sure / (top.os || 1), once.sure / once.os) : undefined],
    ["Saatten maç", fmt(o.match_saved_from_watch?.n || 0), periodWord(), K.aralik ? fark(o.match_saved_from_watch?.n || 0, oO.match_saved_from_watch?.n || 0) : undefined],
    ["Paywall görüldü", fmt(o.paywall_viewed?.n || 0), periodWord(), K.aralik ? fark(o.paywall_viewed?.n || 0, oO.paywall_viewed?.n || 0) : undefined],
    ["Satın aldı", fmt(o.purchase_completed?.n || 0), periodWord()],
    ["Çökme", fmt(o.app_exception?.n || 0), `${fmt(o.app_exception?.k || 0)} kişi`, K.aralik ? fark(o.app_exception?.n || 0, oO.app_exception?.n || 0, true) : undefined],
  ]));
  const g1 = izgara(c);
  grafikKart(g1, `Günlük kullanıcı · ${periodWord()}`, k => cizgi(k, s, { seriler: [{ ad: "Aktif", alan: "au" }, { ad: "Yeni", alan: "nu" }, { ad: "Oturum", alan: "os" }] }));
  grafikKart(g1, "Günlük aktif, platforma göre", k => gunlukCubuk(k, s, { seriler: [{ ad: "iOS", alan: "ios", renk: "var(--s1)" }, { ad: "Android", alan: "android", renk: "var(--s3)" }] }));
  const ua = (G.uygulamalar || []).filter(gaOk).slice().sort((a, b) => b.totalUsers - a.totalUsers);
  c.appendChild(kart(`Veri akışları · ${G.gun} gün`, veriTablo(["Uygulama", "Akış", { ad: "Platform", filtre: true }, { ad: "Kullanıcı", num: true }, { ad: "Yeni", num: true }, { ad: "Oturum", num: true }, { ad: "Etkileşimli", num: true }, { ad: "Kişi başı süre", num: true }],
    ua.map(r => [appName(r.a), r.ad, (r.p || (/android/i.test(r.ad) ? "android" : "ios")) === "android" ? "Android" : "iOS", num(r.totalUsers), num(r.newUsers), num(r.sessions), { d: yuzde(r.engagedSessions, r.sessions), s: r.sessions ? r.engagedSessions / r.sessions : 0 }, dur(r.totalUsers ? r.userEngagementDuration / r.totalUsers : 0)]),
    { ara: false, sirala: [3, "desc"] })));
  const g2 = izgara(c);
  const enCok = Object.entries(o).filter(([n]) => !SISTEM.has(n)).sort((a, b) => b[1].n - a[1].n);
  grafikKart(g2, "En çok yapılan (olay sayısı)", k => yatayCubuk(k, Object.fromEntries(enCok.map(([n, v]) => [olayAdi(n), v.n])), { limit: 14 }));
  const k = n => hepsi ? (G.olayKisi?.[n]?.k || 0) : (o[n]?.k || 0);
  const adim = [["first_open", "İlk açılış"], ["logbook_viewed", "Defteri açtı"], ["match_setup_configured", "Maç kurdu"], ["match_sent_to_watch", "Saate maç gönderdi"], ["match_saved_from_watch", "Saatten maç kaydetti"], ["match_completed", "Maç bitirdi"], ["paywall_viewed", "Paywall gördü"], ["purchase_started", "Satın almaya bastı"], ["purchase_completed", "Satın aldı"]];
  grafikKart(g2, `Huni · kişi${hepsi ? `, ${G.gun} gün` : ", günlük tekillerin toplamı"}`, kk => huni(kk, adim.map(([n, ad]) => [ad, k(n)]), { birim: "kişi" }), hepsi ? "Dönemin tekil kullanıcısı (olayKisi)." : "Uygulama seçiliyken günlük tekil kişiler toplanır (bir kişi birden çok sayılabilir).");
  grafikKart(g2, "Gün ve saate göre oturum", kk => saatIsi(kk, gaSaatGun(), { birim: "oturum", not: "Analytics mülkünün saat dilimi" }), `${G.gun} gün.`);
  const saat = topla((G.saatler || []).filter(gaOk), r => r.hour, r => r.sessions);
  grafikKart(g2, "Günün saatine göre oturum", kk => gunlukCubuk(kk, Array.from({ length: 24 }, (_, h) => ({ t: String(h).padStart(2, "0"), v: saat[String(h).padStart(2, "0")] || saat[String(h)] || 0 })), { birim: "oturum", ozet: false }));
  const ulke = (G.ulkeler || []).filter(gaOk);
  grafikKart(c, "Ülkeler", kk => dunyaHaritasi(kk, topla(ulke.filter(r => r.iso), r => r.iso, r => r.totalUsers), { birim: "kullanıcı" }), ulke.some(r => r.iso) ? `${G.gun} gün, tekil kullanıcı (uygulama başına toplanır).` : "Eski özet: ülke kodu yok, harita boş kalır. Betik yeniden çalışınca dolar.");
  const g3 = izgara(c, 3);
  const tablo = (baslik, rows, ad, deger, sutun) => g3.appendChild(kart(baslik, veriTablo([sutun, { ad: "Kullanıcı", num: true }], Object.entries(topla(rows.filter(gaOk), ad, deger)).map(([a, v]) => [a, num(v)]), { sirala: [1, "desc"], kopyala: false })));
  tablo("Sürüm · aktif, 28 gün", G.surumler || [], r => `${appName(r.a)} ${r.appVersion}${r.p === "android" ? " (Android)" : ""}`, r => r.activeUsers, "Sürüm");
  tablo(`Ülke · ${G.gun} gün`, ulke, r => r.country, r => r.totalUsers, "Ülke");
  tablo("Dil", G.diller || [], r => r.language, r => r.totalUsers, "Dil");
  tablo("Cihaz", G.cihazlar || [], r => r.mobileDeviceModel, r => r.totalUsers, "Cihaz");
  tablo("İşletim sistemi", G.isletim || [], r => `${r.operatingSystem || ""} ${r.operatingSystemVersion}`.trim(), r => r.totalUsers, "Sürüm");
  tablo("Nereden geldiler · ilk kaynak", G.kaynaklar || [], r => `${r.firstUserSource} / ${r.firstUserMedium}`, r => r.totalUsers, "Kaynak");
  const ek = topla((G.ekranlar || []).filter(gaOk), r => r.ad, r => r.sure), eg = topla((G.ekranlar || []).filter(gaOk), r => r.ad, r => r.g), ekk = topla((G.ekranlar || []).filter(gaOk), r => r.ad, r => r.k);
  c.appendChild(kart(`Ekranlar · ${G.gun} gün`, veriTablo(["Ekran", { ad: "Süre", num: true }, { ad: "Görüntüleme", num: true }, { ad: "Kişi", num: true }],
    Object.keys(ek).map(a => [a === "(not set)" ? "(adsız)" : (EKRAN[a.toLowerCase()] ? `${EKRAN[a.toLowerCase()]} (${a})` : a), dur(ek[a]), num(eg[a]), num(ekk[a])]), { sirala: [1, "desc"] })));
  c.appendChild(kart(`Bütün olaylar · ${periodWord()}`, veriTablo(["Olay", "Anahtar", { ad: "Sayı", num: true }, { ad: "Önceki dönem", num: true }, { ad: "Kişi (günlük toplam)", num: true }, { ad: `Tekil kişi (${G.gun} gün, hepsi)`, num: true }],
    Object.entries(o).map(([n, v]) => [olayAdi(n), n, num(v.n), K.aralik ? num(oO[n]?.n || 0) : "-", num(v.k), num(G.olayKisi?.[n]?.k || 0)]), { sirala: [2, "desc"] })));
  const g4 = izgara(c);
  if (G.cokme?.length) g4.appendChild(kart("Çökme · sürüme göre", veriTablo(["Uygulama", "Sürüm", { ad: "Çökme yaşayan", num: true }, { ad: "Aktif", num: true }, { ad: "Oran", num: true }],
    G.cokme.filter(gaOk).map(r => [appName(r.a) + (r.p === "android" ? " (Android)" : ""), r.v, num(r.k), num(r.au), { d: yuzde(r.k, r.au), s: r.au ? r.k / r.au : 0 }]), { sirala: [2, "desc"], bos: "Çökme kaydı yok." }),
    p("GA4 crashAffectedUsers (app_exception). Crashlytics ayrıntısı Firebase konsolunda.", "alt-not")));
  g4.appendChild(kart("Geri gelme · ilk haftaya göre", kohortTablo()));
}
function kohortTablo() {
  const hafta = t => { const d = new Date(t + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return dayKey(d); };
  const fark2 = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5 / 7);
  const m = {};
  for (const r of G.kohort || []) { if (!aOk(r.a || "tennis") && r.a) continue; const h = hafta(r.ilk), w = fark2(h, hafta(r.t)); const x = m[h] ||= {}; x[w] = (x[w] || 0) + r.k; }
  const haftalar = Object.keys(m).sort().reverse().slice(0, 10);
  const k = el("div");
  k.appendChild(veriTablo(["Hafta", { ad: "Yeni", num: true }, ...[1, 2, 3, 4].map(i => ({ ad: `+${i}`, num: true }))],
    haftalar.map(h => { const x = m[h], y = x[0] || 0; return [{ d: tarihTam(h), s: h }, num(y), ...[1, 2, 3, 4].map(i => x[i] != null && y ? { d: `%${pct(x[i], y)}`, s: x[i] / y } : "-")]; }), { ara: false, sirala: [0, "desc"] }));
  k.appendChild(p("Hücre: o haftanın yeni kullanıcılarından kaç kişi n hafta sonra açtı (günlük aktiflerin toplamı, kaba).", "alt-not"));
  return k;
}

// ─── Sosyal veri ─────────────────────────────────────────────────────────
/* users, follows, leagues giriş yapmış herkese; matches, gönderiler, yorumlar,
   raporlar ve bildirim kutuları yöneticiye açık (kurallar). Hepsi bir kez
   okunur, sayfalar arasında paylaşılır; Yenile ile tazelenir. */
const SOSYAL_SAYFA = ["sosyal", "akis", "yorumlar", "raporlar", "ligler", "resmi", "kullanicilar", "paywall"];
function loadSocial() {
  if (socialPromise) return socialPromise;
  social = { loading: true };
  socialPromise = (async () => {
    let raw;
    if (DEMO) raw = demo.socialData;
    else {
      await fb();
      raw = { err: {} };
      const izin = e => e.code === "permission-denied" ? "kurallar okumaya izin vermiyor" : (e.code || e.message);
      const get = async (c, lim) => { try { raw[c] = (await F.getDocs(F.query(F.collection(db, c), F.limit(lim)))).docs.map(d => ({ id: d.id, ...d.data() })); } catch (e) { raw[c] = []; raw.err[c] = izin(e); } };
      // Alt koleksiyonlar (yorum, beğeni, bildirim kutusu, engel) collection group ile; kural yalnız yöneticiye açık.
      const group = async (key, c, lim) => { try { raw[key] = (await F.getDocs(F.query(F.collectionGroup(db, c), F.limit(lim)))).docs.map(d => ({ id: d.id, path: d.ref.path, ...d.data() })); } catch (e) { raw[key] = []; raw.err[key] = izin(e); } };
      await Promise.all([get("users", 3000), get("follows", 10000), get("leagues", 1000), get("matches", 3000), get("posts", 5000), get("followRequests", 5000), get("reports", 3000),
        group("comments", "comments", 10000), group("likes", "likes", 20000), group("notifItems", "items", 20000), group("blocks", "blocks", 5000),
        (async () => { try { raw.handlesN = (await F.getCountFromServer(F.collection(db, "handles"))).data().count; } catch (e) { raw.err.handles = e.code || e.message; } })()]);
    }
    const followers = new Map(), following = new Map();
    for (const f of raw.follows || []) { following.set(f.follower, (following.get(f.follower) || 0) + 1); followers.set(f.followee, (followers.get(f.followee) || 0) + 1); }
    const comments = (raw.comments || []).map(x => ({ ...x, postId: (x.path || "").split("/")[1] }));
    const blocks = (raw.blocks || []).map(x => ({ ...x, by: (x.path || "").split("/")[1], who: x.id }));
    social = { users: raw.users || [], map: new Map((raw.users || []).map(u => [u.id, u])), follows: raw.follows || [], leagues: raw.leagues || [], matches: raw.matches || [],
      posts: raw.posts || [], comments, likes: raw.likes || [], followRequests: raw.followRequests || [], notifItems: raw.notifItems || [], reports: raw.reports || [], blocks,
      handlesN: raw.handlesN, err: raw.err || {}, followers, following };
    if (K && SOSYAL_SAYFA.includes(K.sayfa)) K.ciz();
  })();
  return socialPromise;
}
const soReady = () => social && !social.loading;
function bekle(c) { if (soReady()) return false; loadSocial(); c.appendChild(p("Sosyal veri okunuyor...")); return true; }
const hataSatiri = (c, anahtarlar) => { const e = anahtarlar.filter(k => social.err?.[k]); if (e.length) c.appendChild(notKutu(`Okunamayan: ${e.map(k => `<code>${esc(k)}</code> (${esc(social.err[k])})`).join(", ")}`, "err")); };
const userAppOk = uid => appF === "all" || (social.map.get(uid)?.sports || []).includes(appF) || installsOf(uid).some(i => i.app === appF);
const postOf = id => social.posts.find(x => x.id === id);
const postAuthor = p2 => p2.authorHandle ? "@" + p2.authorHandle : handleBy(p2.authorUid) ? "@" + handleBy(p2.authorUid) : (p2.authorName || shortId(p2.authorUid));
const isOfficial = uid => /^official_[a-z]+$/.test(uid || "");
const gunlukSay = (arr, alan = "createdAt") => { const d = P(); const m = {}; for (const x of arr) if (inP(x[alan], d)) { const g = istGun(x[alan]); m[g] = (m[g] || 0) + 1; } return stats().map(s => ({ t: s.day, v: m[s.day] || 0 })); };
const pfark = arr => { const d = P(); return d.oncekiBas == null ? undefined : fark(arr.filter(x => inP(x.createdAt, d)).length, arr.filter(x => inPrev(x.createdAt, d)).length); };
function dugme(ad, tik, cls = "ghost tbtn") { const b = el("button", cls, ad); b.onclick = e => { e.stopPropagation(); tik(b); }; return b; }

// ─── SOSYAL: Akış ve gönderiler ──────────────────────────────────────────
const akFiltre = { aud: "all", kind: "all" };
function akis(c) {
  c.appendChild(p("Topluluktaki bütün gönderiler (<code>posts</code>). Silmek gönderiyi, beğeni ve yorumlarını (<code>posts/*/likes</code>, <code>posts/*/comments</code>) ve fotoğrafını (<code>postPhotos</code>) kaldırır; geri alınamaz. Gizleme yok: uygulama gizli alanını okumuyor, kurallar da yöneticiye düzenleme izni vermiyor."));
  if (bekle(c)) return;
  hataSatiri(c, ["posts", "likes", "comments"]);
  const all = social.posts.filter(x => aOk(x.sport));
  const d = P();
  c.appendChild(tiles([
    ["Gönderi", fmt(all.length), "toplam"], ["Dönemde gönderi", fmt(all.filter(x => inP(x.createdAt, d)).length), periodWord(), pfark(all)],
    ["Beğeni", fmt(social.likes.filter(l => postOf((l.path || "").split("/")[1]) && aOk(postOf((l.path || "").split("/")[1]).sport)).length), "toplam"],
    ["Yorum", fmt(social.comments.filter(x => aOk(postOf(x.postId)?.sport)).length), "toplam"],
    ["Paylaşan", fmt(new Set(all.map(x => x.authorUid)).size), "kişi"],
    ["Maçlı gönderi", fmt(all.filter(x => x.match).length)], ["Fotoğraflı", fmt(all.filter(x => x.hasPhoto).length)],
    ["Raporlanan", fmt(new Set(social.reports.filter(r => r.postId && all.some(x => x.id === r.postId)).map(r => r.postId)).size), "gönderi"],
  ]));
  grafikKart(c, "Günlük gönderi", k => gunlukCubuk(k, gunlukSay(all), { birim: "gönderi" }));
  const bar = el("div", "bar2");
  const sec = (k, ops) => { const s = el("select"); s.innerHTML = ops.map(([v, t]) => `<option value="${v}">${t}</option>`).join(""); s.value = akFiltre[k]; s.onchange = () => { akFiltre[k] = s.value; K.ciz(); }; bar.appendChild(s); };
  sec("aud", [["all", "Görünürlük: hepsi"], ["public", "Herkese açık"], ["followers", "Takipçilere"]]);
  sec("kind", [["all", "Tür: hepsi"], ["match", "Maçlı"], ["photo", "Fotoğraflı"], ["official", "Resmi hesap"], ["reported", "Raporlanan"]]);
  c.appendChild(bar);
  const list = all.filter(x => (akFiltre.aud === "all" || x.audience === akFiltre.aud) && (akFiltre.kind === "all" || (akFiltre.kind === "match" && x.match) || (akFiltre.kind === "photo" && x.hasPhoto) || (akFiltre.kind === "official" && isOfficial(x.authorUid)) || (akFiltre.kind === "reported" && social.reports.some(r => r.postId === x.id))));
  const likesOf = x => x.likeCount ?? social.likes.filter(l => (l.path || "").startsWith(`posts/${x.id}/`)).length;
  const comOf = x => x.commentCount ?? social.comments.filter(y => y.postId === x.id).length;
  c.appendChild(veriTablo(["Zaman", { ad: "Uygulama", filtre: true }, { ad: "Yazar", filtre: true }, "Gönderi", { ad: "Görünürlük", filtre: true }, { ad: "Tür", filtre: true }, { ad: "Beğeni", num: true }, { ad: "Yorum", num: true }, { ad: "Rapor", num: true }, { ad: "", sirala: false }],
    list.map(x => [tarihHucre(x.createdAt), appName(x.sport), postAuthor(x) + (isOfficial(x.authorUid) ? " (resmi)" : ""),
      `${x.match ? `[Maç] ${x.match.title || ""} ${x.match.sets || x.match.score || ""} · ` : ""}${(x.caption || "").slice(0, 160)}${x.place ? ` · ${x.place}` : ""}`,
      x.audience === "public" ? "Herkese açık" : "Takipçilere", x.match ? "Maçlı" : x.hasPhoto ? "Fotoğraflı" : "Metin", num(likesOf(x)), num(comOf(x)), num(social.reports.filter(r => r.postId === x.id).length),
      dugme("Sil", () => deletePost(x.id), "ghost tbtn kirmizi")]),
    { sirala: [0, "desc"], bos: all.length ? "Bu filtreye uyan gönderi yok." : "Henüz gönderi yok.", satirTik: (_, n) => postCekmece(list[n]) }));
}
function postCekmece(x) {
  const com = social.comments.filter(y => y.postId === x.id).sort((a, b) => tms(a.createdAt) - tms(b.createdAt));
  const reps = social.reports.filter(r => r.postId === x.id);
  kullaniciCekmecesi(x, [
    ["Yazar", postAuthor(x) + (x.authorName ? ` · ${x.authorName}` : "")], ["Uygulama", H(appTag(x.sport))], ["Zaman", tt(x.createdAt)],
    ["Görünürlük", x.audience === "public" ? "Herkese açık" : `Takipçilere (${fmt((x.allowed || []).length)} kişi)`], ["Metin", x.caption || "-"], ["Yer", x.place || "-"],
    ["Maç", x.match ? `${x.match.title || ""} · ${x.match.sets || x.match.score || ""}${x.gameType ? ` · ${x.gameType}` : ""}` : "-"], ["Fotoğraf", x.hasPhoto ? "Var" : "Yok"],
    ["Beğeni / yorum", `${fmt(x.likeCount)} / ${fmt(x.commentCount)}`], ["Rapor", reps.length ? reps.map(r => r.reason).join(" · ") : "-"],
  ], {
    baslik: "Gönderi", alt: x.id,
    eylemler: [{ ad: "Gönderiyi sil", tik: kapat => { kapat(); deletePost(x.id); } }],
    hamAlanlar: true,
    ek: k => {
      k.appendChild(el("h2", null, `Yorumlar (${com.length})`));
      k.appendChild(veriTablo(["Zaman", "Kişi", "Yorum", { ad: "", sirala: false }], com.map(y => [tarihHucre(y.createdAt), y.handle ? "@" + y.handle : (y.name || atT(y.uid)), y.text || "", dugme("Sil", () => deleteComment(y), "ghost tbtn kirmizi")]), { ara: false, bos: "Yorum yok." }));
    },
  });
}
async function deletePost(id) {
  const x = postOf(id); if (!x) return;
  const ok = await confirmCard({ title: "Gönderi silinsin mi?", yes: "Sil", danger: true,
    rows: [["Yazar", esc(postAuthor(x))], ["Uygulama", appTag(x.sport)], ["Zaman", esc(tt(x.createdAt))], ["Metin", esc((x.caption || x.match?.title || "-").slice(0, 200))]],
    note: "Beğeni, yorum ve fotoğrafıyla birlikte kalıcı olarak silinir." });
  if (!ok) return;
  try {
    if (!DEMO) {
      await fb();
      const subs = await Promise.all(["likes", "comments"].map(c2 => F.getDocs(F.collection(db, "posts", id, c2))));
      const refs = subs.flatMap(s => s.docs.map(d => d.ref));
      for (let k = 0; k < refs.length; k += 400) { const b = F.writeBatch(db); refs.slice(k, k + 400).forEach(r => b.delete(r)); await b.commit(); }
      await F.deleteDoc(F.doc(db, "postPhotos", id));
      await F.deleteDoc(F.doc(db, "posts", id));
    }
    social.posts = social.posts.filter(y => y.id !== id);
    social.likes = social.likes.filter(l => !(l.path || "").startsWith(`posts/${id}/`));
    social.comments = social.comments.filter(y => y.postId !== id);
    toast("Gönderi silindi"); K.ciz();
  } catch (e) { toast("Silinemedi: " + (e.code || e.message)); }
}
async function deleteComment(y) {
  const x = postOf(y.postId);
  const ok = await confirmCard({ title: "Yorum silinsin mi?", yes: "Sil", danger: true,
    rows: [["Kişi", esc(y.handle ? "@" + y.handle : y.name || atT(y.uid))], ["Yorum", esc(y.text || "")], ["Gönderi", esc(x ? postAuthor(x) + ": " + (x.caption || x.match?.title || "").slice(0, 80) : y.postId)]],
    note: "Kalıcı olarak silinir. Gönderinin yorum sayacı herkese açık gönderide bir azalır (takipçilere açık gönderide kurallar izin vermez, sayaç kalır)." });
  if (!ok) return;
  try {
    if (!DEMO) {
      await fb();
      await F.deleteDoc(F.doc(db, ...y.path.split("/")));
      if (x && (x.commentCount || 0) > 0) { try { await F.updateDoc(F.doc(db, "posts", y.postId), { commentCount: F.increment(-1) }); x.commentCount--; } catch (e) { console.warn("sayaç", e); } }
    } else if (x && x.commentCount > 0) x.commentCount--;
    social.comments = social.comments.filter(z => z.path !== y.path);
    document.querySelectorAll(".drawer[data-cekmece]").forEach(z => z.remove());
    toast("Yorum silindi"); K.ciz();
  } catch (e) { toast("Silinemedi: " + (e.code || e.message)); }
}

// ─── SOSYAL: Yorumlar ────────────────────────────────────────────────────
function yorumlar(c) {
  c.appendChild(p("Bütün gönderilerin yorumları (<code>posts/*/comments</code>, collection group). Silme yönetici kuralıyla açık; satıra dokununca gönderi açılır."));
  if (bekle(c)) return;
  hataSatiri(c, ["comments"]);
  const all = social.comments.filter(y => aOk(postOf(y.postId)?.sport || "tennis") || !postOf(y.postId));
  const d = P();
  c.appendChild(tiles([["Yorum", fmt(all.length), "toplam"], ["Dönemde", fmt(all.filter(y => inP(y.createdAt, d)).length), periodWord(), pfark(all)], ["Yorum yazan", fmt(new Set(all.map(y => y.uid)).size), "kişi"], ["Yorumlu gönderi", fmt(new Set(all.map(y => y.postId)).size)]]));
  grafikKart(c, "Günlük yorum", k => gunlukCubuk(k, gunlukSay(all), { birim: "yorum" }));
  const list = all.slice();
  c.appendChild(veriTablo(["Zaman", { ad: "Uygulama", filtre: true }, { ad: "Kişi", filtre: true }, "Yorum", "Gönderi", { ad: "", sirala: false }],
    list.map(y => { const x = postOf(y.postId); return [tarihHucre(y.createdAt), x ? appName(x.sport) : "?", y.handle ? "@" + y.handle : (y.name || atT(y.uid)), y.text || "", x ? `${postAuthor(x)}: ${(x.caption || x.match?.title || "").slice(0, 60)}` : "gönderi yok", dugme("Sil", () => deleteComment(y), "ghost tbtn kirmizi")]; }),
    { sirala: [0, "desc"], bos: "Henüz yorum yok.", satirTik: (_, n) => { const x = postOf(list[n].postId); if (x) postCekmece(x); } }));
}

// ─── SOSYAL: Raporlar ────────────────────────────────────────────────────
function raporlar(c) {
  c.appendChild(p("Uygulamadan gelen bildirimler (<code>reports</code>): bir gönderiyi ya da bir oyuncuyu. Bildiren kişi o kişiyi kendisi için zaten gizliyor; burası içeriğin herkes için kalkması gerekip gerekmediğine bakılan yer. <b>Gönderiyi sil</b> gönderiyi kaldırır; <b>Kapat</b> raporu siler (incelendi). Oyuncu hesabını kapatmak kurallarda yok: Firebase Authentication'dan elle."));
  if (bekle(c)) return;
  hataSatiri(c, ["reports", "blocks"]);
  const all = social.reports.filter(r => { const x = r.postId && postOf(r.postId); return x ? aOk(x.sport) : userAppOk(r.uid); });
  const d = P();
  c.appendChild(tiles([["Açık rapor", fmt(all.length)], ["Dönemde", fmt(all.filter(r => inP(r.createdAt, d)).length), periodWord(), pfark(all)],
    ["Gönderi raporu", fmt(all.filter(r => r.postId).length)], ["Oyuncu raporu", fmt(all.filter(r => !r.postId).length)],
    ["Raporlanan kişi", fmt(new Set(all.map(r => r.uid)).size)], ["Engelleme", social.err?.blocks ? "-" : fmt(social.blocks.length), social.err?.blocks ? "okunamıyor" : "users/*/blocks"]]));
  c.appendChild(veriTablo(["Zaman", { ad: "Tür", filtre: true }, { ad: "Sebep", filtre: true }, { ad: "Raporlanan", filtre: true }, "Gönderi", { ad: "Bildiren", filtre: true }, { ad: "Aynı kişiye rapor", num: true }, { ad: "", sirala: false }],
    all.map(r => { const x = r.postId && postOf(r.postId); const w = el("span"); w.style.whiteSpace = "nowrap";
      if (x) w.appendChild(dugme("Gönderiyi sil", () => deletePost(x.id), "ghost tbtn kirmizi"));
      w.appendChild(dugme("Kapat", () => closeReport(r)));
      return [tarihHucre(r.createdAt), r.postId ? "Gönderi" : "Oyuncu", r.reason || "-", atT(r.uid), r.postId ? (x ? (x.caption || x.match?.title || "(fotoğraf)").slice(0, 70) : "gönderi yok (silinmiş)") : "-", atT(r.reporter), num(all.filter(z => z.uid === r.uid).length), w]; }),
    { sirala: [0, "desc"], bos: "Açık rapor yok.", satirTik: (_, n) => { const x = all[n].postId && postOf(all[n].postId); if (x) postCekmece(x); } }));
  c.appendChild(kart("Engellenenler", social.err?.blocks
    ? notKutu(`Engelleme listeleri (<code>users/*/blocks</code>) kurallarda yalnız sahibine açık: panel okuyamıyor (${esc(social.err.blocks)}). Kurallara yönetici okuması eklenince burada kim kimi engelledi görünür (rapordaki komut).`, "uyari")
    : veriTablo(["Zaman", "Engelleyen", "Engellenen", { ad: "Engellenenin rapor sayısı", num: true }], social.blocks.map(b => [tarihHucre(b.createdAt), atT(b.by), atT(b.who), num(social.reports.filter(r => r.uid === b.who).length)]), { sirala: [0, "desc"], bos: "Engelleme yok." })));
}
async function closeReport(r) {
  if (!await confirmCard({ title: "Rapor kapatılsın mı?", rows: [["Sebep", esc(r.reason || "-")], ["Raporlanan", esc(atT(r.uid))]], note: "Rapor belgesi silinir (incelendi sayılır). Gönderi yerinde kalır.", yes: "Kapat" })) return;
  try {
    if (!DEMO) { await fb(); await F.deleteDoc(F.doc(db, "reports", r.id)); }
    social.reports = social.reports.filter(z => z.id !== r.id); toast("Rapor kapatıldı"); K.ciz();
  } catch (e) { toast("Kapatılamadı: " + (e.code || e.message)); }
}

// ─── SOSYAL: Ligler ──────────────────────────────────────────────────────
const L_STATUS = { setup: "Kurulumda", active: "Sürüyor", finished: "Bitti", done: "Bitti", archived: "Arşiv" };
const F_STATUS = { scheduled: "Oynanacak", submitted: "Onay bekliyor", confirmed: "Düzenleyici bekliyor", approved: "Onaylandı", correction: "Düzeltme istendi", proposed: "Eklenecek maç" };
const F_ACTION = { proposed: "önerdi", submitted: "sonucu girdi", confirmed: "onayladı", added: "ekledi", approved: "düzenleyici onayladı", correction: "düzeltme istedi", declined: "reddetti", edited: "düzenledi" };
const PENDING_F = ["submitted", "confirmed", "correction", "proposed"];
function loadLeagues() {
  if (leaguePromise) return leaguePromise;
  leagueData = { loading: true };
  leaguePromise = (async () => {
    const soP = loadSocial();
    let raw;
    if (DEMO) raw = demo.leagueData;
    else {
      await fb();
      raw = { err: {} };
      const run = async (key, q) => { try { raw[key] = (await F.getDocs(q)).docs.map(d => ({ id: d.id, leagueId: d.ref.parent.parent?.id || d.data().leagueId, ...d.data() })); } catch (e) { raw[key] = []; raw.err[key] = e.code === "permission-denied" ? "kurallar okumaya izin vermiyor" : (e.code || e.message); } };
      await Promise.all([
        run("fixtures", F.query(F.collectionGroup(db, "fixtures"), F.limit(20000))),
        run("invites", F.query(F.collection(db, "leagueInvites"), F.limit(5000))),
        run("requests", F.query(F.collection(db, "leagueRequests"), F.limit(5000))),
      ]);
    }
    await soP;
    const byLeague = new Map();
    for (const f of raw.fixtures) { const a = byLeague.get(f.leagueId) || []; a.push(f); byLeague.set(f.leagueId, a); }
    leagueData = { fixtures: raw.fixtures, invites: raw.invites, requests: raw.requests, byLeague, err: raw.err || {} };
    if (K.sayfa === "ligler") K.ciz();
  })();
  return leaguePromise;
}
const lgReady = () => leagueData && !leagueData.loading && soReady();
const fixLast = f => Math.max(tms(f.createdAt), ...(f.history || []).map(h => tms(h.at)));
const approvedAt = f => { const h = (f.history || []).filter(x => x.action === "approved").map(x => tms(x.at)); return h.length ? Math.max(...h) : (f.status === "approved" ? fixLast(f) : 0); };
const memberName = (l, uid) => handleBy(uid) ? "@" + handleBy(uid) : l.memberNames?.[uid] || String(uid || "?").slice(0, 8);
const ownerText = l => handleBy(l.ownerUid) ? "@" + handleBy(l.ownerUid) : l.ownerName || atT(l.ownerUid);
const placeOf = l => [l.city, l.country ? `${flag(l.country)} ${l.country}` : ""].filter(Boolean).join(", ");
const lgFiltre = { vis: "all" };
function ligler(c) {
  c.appendChild(p("Bütün ligler, özel olanlar da (yönetici okuması). Fikstürler <code>leagues/*/fixtures</code>, davetler <code>leagueInvites</code>, katılma istekleri <code>leagueRequests</code>. \"Dönemde aktif\": dönemde kurulan ya da fikstüründe bir işlem (öneri, onay, düzeltme) olan lig. Satıra dokununca üyeler, fikstürler, bekleyen istek ve davetler açılır."));
  if (!lgReady()) { loadLeagues(); c.appendChild(p("Okunuyor...")); return; }
  const all = social.leagues.filter(l => aOk(l.sport)), D = leagueData, d = P();
  const fx = id => D.byLeague.get(id) || [];
  const aktif = l => inP(l.createdAt, d) || fx(l.id).some(f => inP(fixLast(f), d));
  const allFx = all.flatMap(l => fx(l.id));
  const appr = allFx.filter(f => inP(approvedAt(f), d));
  c.appendChild(tiles([
    ["Lig", fmt(all.length), `${fmt(all.reduce((t, l) => t + (l.members || []).length, 0))} üyelik`, pfark(all)],
    ["Herkese açık", fmt(all.filter(l => l.visibility === "public").length), `${fmt(all.filter(l => l.visibility !== "public").length)} özel`],
    ["Resmi", fmt(all.filter(l => l.official).length), "dünya ligleri"],
    ["Dönemde aktif", fmt(all.filter(aktif).length), periodWord()],
    ["Dönemde onaylı sonuç", fmt(appr.length), `${fmt(allFx.length)} fikstür · ${fmt(allFx.filter(f => PENDING_F.includes(f.status)).length)} bekleyen`],
    ["Bekleyen istek / davet", `${fmt(D.requests.filter(r => all.some(l => l.id === r.leagueId)).length)} / ${fmt(D.invites.filter(r => all.some(l => l.id === r.leagueId)).length)}`, "leagueRequests / leagueInvites"],
  ]));
  const errs = Object.entries({ ...D.err, ...(social.err?.leagues ? { leagues: social.err.leagues } : {}) });
  if (errs.length) c.appendChild(notKutu(`Okunamayan: ${errs.map(([k, e]) => `<code>${esc(k)}</code> (${esc(e)})`).join(", ")}`, "err"));
  const g = izgara(c);
  grafikKart(g, "Fikstür durumu", k => yatayCubuk(k, countBy(allFx, f => F_STATUS[f.status] || f.status || "?")));
  grafikKart(g, "Spora göre lig", k => yatayCubuk(k, countBy(all, l => appName(l.sport))));
  c.appendChild(veriTablo(["Lig", { ad: "Spor", filtre: true }, { ad: "Düzenleyici", filtre: true }, { ad: "Üye", num: true }, { ad: "Görünürlük", filtre: true }, { ad: "Katılım", filtre: true }, "Yer", { ad: "Durum", filtre: true }, { ad: "Fikstür", num: true }, { ad: "Onaylı sonuç", num: true }, { ad: "Bekleyen", num: true }, "Davet kodu", "Kuruldu"],
    all.map(l => { const f = fx(l.id); return [`${l.name || "?"}${l.season ? ` · ${l.season}` : ""}${l.official ? " (resmi)" : ""}`, appName(l.sport), ownerText(l), num((l.members || []).length), (l.visibility || "private") === "public" ? "Herkese açık" : "Özel", l.open ? "Açık" : "İstekle",
      placeOf(l) || "-", L_STATUS[l.status] || l.status || "-", num(f.length), num(f.filter(x => x.status === "approved").length), num(f.filter(x => PENDING_F.includes(x.status)).length + D.requests.filter(r => r.leagueId === l.id).length), l.inviteCode || "-", tarihHucre(l.createdAt)]; }),
    { sirala: [12, "desc"], bos: "Henüz lig yok.", satirTik: (_, n) => openLeague(all[n].id) }));
}
function openLeague(id) {
  const l = social?.leagues?.find(x => x.id === id); if (!l || !lgReady()) return;
  const D = leagueData;
  const fx = (D.byLeague.get(id) || []).slice().sort((a, b) => (+a.week || 0) - (+b.week || 0) || fixLast(b) - fixLast(a));
  const reqs = D.requests.filter(r => r.leagueId === id), invs = D.invites.filter(r => r.leagueId === id);
  const byStatus = countBy(fx, f => f.status || "?");
  const side = (f, k) => f[`side${k}Name`] || (f[`side${k}Members`] || []).map(u => memberName(l, u)).join(" & ") || "?";
  const score = f => f.result ? (f.result.sets || `${f.result.setsA ?? "?"}-${f.result.setsB ?? "?"}`) : "-";
  const lastAct = f => { const h = (f.history || []).slice().sort((a, b) => tms(b.at) - tms(a.at))[0]; return h ? `${memberName(l, h.by)} ${F_ACTION[h.action] || h.action || ""} · ${tt(h.at)}${h.reason ? ` (${h.reason})` : ""}` : "-"; };
  const person = (uid, name, handle) => uid && handleBy(uid) ? "@" + handleBy(uid) : handle ? "@" + handle : name || String(uid || "?").slice(0, 8);
  kullaniciCekmecesi(l, [
    ["Spor", H(appTag(l.sport))], ["Düzenleyici", ownerText(l) + (l.ownerName && handleBy(l.ownerUid) ? ` · ${l.ownerName}` : "")],
    ["Görünürlük", `${(l.visibility || "private") === "public" ? "Herkese açık" : "Özel"} · ${l.open ? "herkes katılabilir" : "istekle"}${l.official ? " · resmi" : ""}`],
    ["Durum", L_STATUS[l.status] || l.status || "-"], ["Sezon", l.season || "-"],
    ["Biçim", [l.format === "doubles" ? "Çiftler" : l.format === "singles" ? "Tekler" : l.format, l.gameType].filter(Boolean).join(" · ") || "-"],
    ["Kurallar", l.rulesText || "-"], ["Yer", placeOf(l) || "-"], ["Davet kodu", l.inviteCode || "-"], ["Kuruldu", tt(l.createdAt)],
    ["Fikstür", `${fmt(fx.length)}${fx.length ? " · " + Object.entries(byStatus).map(([k, v]) => `${F_STATUS[k] || k} ${fmt(v)}`).join(" · ") : ""}`],
  ], {
    baslik: l.name || "Lig", alt: id,
    eylemler: [{ ad: "Ligi sil", ikincil: true, tik: kapat => deleteLeague(l, kapat) }],
    hamAlanlar: true,
    ek: k => {
      k.appendChild(el("h2", null, `Üyeler (${fmt((l.members || []).length)})`));
      k.appendChild(veriTablo(["Oyuncu", { ad: "Kurulumlar", sirala: false }], (l.members || []).map(u => [memberName(l, u) + (u === l.ownerUid ? " (düzenleyici)" : ""), installChips(installsOf(u))]), { bos: "Üye yok.", kopyala: false }));
      k.appendChild(el("h2", null, `Bekleyen katılma istekleri (${fmt(reqs.length)})`));
      k.appendChild(veriTablo(["Oyuncu", "İstedi"], reqs.map(r => [person(r.uid, r.name, r.handle), tarihHucre(r.createdAt)]), { ara: false, bos: "Yok.", kopyala: false }));
      k.appendChild(el("h2", null, `Gönderilen davetler (${fmt(invs.length)})`));
      k.appendChild(veriTablo(["Davet edilen", "Davet eden", "Zaman"], invs.map(r => [person(r.uid, r.name, r.handle), person(r.fromUid, r.fromName), tarihHucre(r.createdAt)]), { ara: false, bos: "Yok.", kopyala: false }));
      k.appendChild(el("h2", null, `Fikstürler (${fmt(fx.length)})`));
      k.appendChild(veriTablo([{ ad: "Hafta", num: true }, "Eşleşme", { ad: "Durum", filtre: true }, "Skor", "Son işlem"], fx.map(f => [f.week != null ? num(f.week) : "-", `${side(f, "A")} × ${side(f, "B")}`, F_STATUS[f.status] || f.status || "?", score(f), lastAct(f)]), { bos: "Henüz fikstür yok (lig kurulum aşamasında olabilir)." }));
    },
  });
}
async function deleteLeague(l, kapat) {
  const ok = await confirmCard({ title: "Lig silinsin mi?", yes: "Sil", danger: true,
    rows: [["Lig", esc(l.name || "?")], ["Spor", appTag(l.sport)], ["Düzenleyici", esc(ownerText(l))], ["Üye", fmt((l.members || []).length)]],
    note: "Lig belgesi kalıcı olarak silinir, üyeler ligi göremez. Kurallar yöneticiye fikstür silme izni vermediği için fikstürler (<code>leagues/*/fixtures</code>) yerinde kalır, artık görünmezler." });
  if (!ok) return;
  try {
    if (!DEMO) { await fb(); await F.deleteDoc(F.doc(db, "leagues", l.id)); }
    social.leagues = social.leagues.filter(x => x.id !== l.id); kapat(); toast("Lig silindi"); K.ciz();
  } catch (e) { toast("Silinemedi: " + (e.code || e.message)); }
}

// ─── SOSYAL: Resmi hesaplar ──────────────────────────────────────────────
/* Her uygulamanın resmi hesabı: sabit kimlik official_<uygulama>. Panel o hesap
   adına herkese açık gönderi ve resmi lig yazar. Kural: yalnız yönetici, yalnız official_ kimlikleri. */
const OFFICIAL = {
  tennis: { handle: "tennispadelscorekeeper", name: "Tennis Padel Score Keeper" },
  pickleball: { handle: "pickleballscorekeeper", name: "Score Keeper for Pickleball" },
  volleyball: { handle: "volleyballscorekeeper", name: "Volleyball Score Keeper" },
  badminton: { handle: "rallybadminton", name: "Rally: Badminton" },
  tabletennis: { handle: "rallytabletennis", name: "Rally: Table Tennis" },
};
const APP_ICON = { tennis: "/tennis-padel/assets/icon.webp", pickleball: "/pickleball/assets/icon.webp", volleyball: "/volleyball/assets/icon.webp", badminton: "/rally-badminton/assets/icon.webp", tabletennis: "/rally-table-tennis/assets/icon.webp" };
const offUid = a => "official_" + a;
const offProfile = a => social?.map?.get(offUid(a)) || null;
function photoSrc(u) {
  const ph = u?.photo; if (!ph) return "";
  try { if (ph.toBase64) return "data:image/jpeg;base64," + ph.toBase64(); if (typeof ph === "string") return ph.startsWith("data:") ? ph : "data:image/jpeg;base64," + ph; } catch { }
  return "";
}
const noDash = s => !/[—–]/.test(s);
let resmiKok = null;
function resmi(c) {
  c.appendChild(p("Her uygulamanın resmi hesabı (<code>users/official_&lt;uygulama&gt;</code>, kullanıcı adı <code>handles</code>'ta). Buradan o hesap adına herkese açık gönderi yazılır ve resmi lig kurulur; uygulamada Topluluk akışında, profilde ve Ligler'de görünür. Yazma kuralı yalnız yöneticiye açık."));
  if (bekle(c)) return;
  hataSatiri(c, ["users", "posts", "leagues"]);
  const keys = APP_KEYS.filter(aOk);
  c.appendChild(veriTablo(["Hesap", "Uygulama", { ad: "Gönderi", num: true }, { ad: "Takipçi", num: true }, { ad: "Gönderi beğenisi", num: true }, "Ligleri", "Belge"],
    keys.map(a => { const u = offProfile(a), uid = offUid(a); const lg = social.leagues.filter(l => l.ownerUid === uid); const src = photoSrc(u) || APP_ICON[a];
      return [N(`<span class="ofacc"><img src="${src}" alt=""><span><b>@${esc(u?.handle || OFFICIAL[a].handle)}</b><small class="muted" style="display:block">${esc(u?.displayName || OFFICIAL[a].name)}</small></span></span>`, OFFICIAL[a].handle),
        appName(a), num(social.posts.filter(x => x.authorUid === uid).length), num(social.followers.get(uid) || 0), num(social.posts.filter(x => x.authorUid === uid).reduce((t, x) => t + (+x.likeCount || 0), 0)),
        lg.map(l => `${l.name || "?"} (${fmt((l.members || []).length)} üye${l.open ? ", açık" : ""})`).join(" · ") || "yok", u ? "var" : "belge yok"]; }), { ara: false, kopyala: false }));
  if (!resmiKok) resmiKok = resmiForm();
  c.appendChild(resmiKok);
  const acc = $("ofAcc"), app = $("nlApp");
  if (appF !== "all") { acc.value = appF; app.value = appF; }
}
function resmiForm() {
  const g = el("div", "izgara2");
  g.innerHTML = `<div class="card"><h2>Gönderi yaz</h2>
      <div class="field"><label for="ofAcc">Hesap</label><select id="ofAcc">${APP_KEYS.map(a => `<option value="${a}">@${esc(OFFICIAL[a].handle)} · ${esc(appName(a))}</option>`).join("")}</select></div>
      <div class="field"><label for="ofCap">Metin <small id="ofCapN">0/500</small></label><textarea id="ofCap" rows="5" maxlength="500" placeholder="Season 2026 is on. Join the World Ladder from the Leagues tab."></textarea></div>
      <div class="field"><label for="ofPlace">Yer (isteğe bağlı) <small>60</small></label><input id="ofPlace" maxlength="60" autocomplete="off"></div>
      <p class="muted">Herkese açık gider (<code>audience: public</code>), uygulamanın yazdığı şemayla. Topluluk akışı bütün uygulamalarda ortaktır; gönderinin sporu seçilen hesabın uygulamasıdır. Metin uygulamada çevrilmez: herkes aynısını görür.</p>
      <div class="actions"><button id="ofPost">Gönderiyi paylaş</button></div><div id="ofMsg"></div></div>
    <div class="card"><h2>Lig kur</h2>
      <div class="field"><label for="nlName">Lig adı <small id="nlNameN">0/40</small></label><input id="nlName" maxlength="40" placeholder="Tennis World Ladder" autocomplete="off"></div>
      <div class="frow"><div class="field"><label for="nlApp">Spor (uygulama)</label><select id="nlApp">${APP_KEYS.map(a => `<option value="${a}">${esc(appName(a))}</option>`).join("")}</select></div>
        <div class="field"><label for="nlSeason">Sezon</label><input id="nlSeason" maxlength="30" value="Season 2026"></div></div>
      <label class="chk"><input type="checkbox" id="nlOpen" checked> Herkes istek göndermeden katılabilir (<code>open</code>)</label>
      <p class="muted">Herkese açık (<code>visibility: public</code>), ülke yok (dünya geneli), sahibi seçilen sporun resmi hesabı, üyesiz başlar, rastgele davet kodu alır, <code>official: true</code>. Uygulama, sporun açık resmi ligini Ligler'in üstünde gösterir.</p>
      <div class="actions"><button id="nlCreate">Ligi kur</button></div><div id="nlMsg"></div></div>`;
  const q = s => g.querySelector(s);
  q("#ofCap").oninput = () => { q("#ofCapN").textContent = `${q("#ofCap").value.length}/500`; };
  q("#nlName").oninput = () => { q("#nlNameN").textContent = `${q("#nlName").value.length}/40`; };
  q("#ofPost").onclick = async () => {
    const a = q("#ofAcc").value, caption = q("#ofCap").value.trim(), place = q("#ofPlace").value.trim();
    const msg = h => { q("#ofMsg").innerHTML = h; };
    if (!caption) { msg(`<div class="note err">Metin boş olmasın.</div>`); return; }
    if (!noDash(caption + place)) { msg(`<div class="note err">Uzun tire var; kısa tire ya da virgül kullan.</div>`); return; }
    const u = offProfile(a), uid = offUid(a);
    const ok = await confirmCard({ title: "Gönderi paylaşılsın mı?", yes: "Paylaş", rows: [["Hesap", `@${esc(u?.handle || OFFICIAL[a].handle)}`], ["Uygulama", appTag(a)], ["Görünürlük", "Herkese açık"], ["Metin", esc(caption)], ...(place ? [["Yer", esc(place)]] : [])], note: "Topluluk akışında herkes görür. Panelden silebilirsin." });
    if (!ok) return;
    const data = { authorUid: uid, authorName: (u?.displayName || OFFICIAL[a].name).slice(0, 40), authorHandle: u?.handle || OFFICIAL[a].handle, sport: a,
      caption: caption.slice(0, 500), audience: "public", allowed: [uid], likeCount: 0, commentCount: 0, showDetails: false, hasPhoto: false, gameType: "" };
    if (place) data.place = place.slice(0, 60);
    q("#ofPost").disabled = true; msg("Paylaşılıyor...");
    try {
      let id;
      if (DEMO) id = "p" + Date.now();
      else { await fb(); id = (await F.addDoc(F.collection(db, "posts"), { ...data, createdAt: F.serverTimestamp() })).id; }
      social.posts.unshift({ id, ...data, createdAt: new Date() });
      q("#ofCap").value = ""; q("#ofPlace").value = ""; q("#ofCapN").textContent = "0/500";
      msg(`<div class="note okn">Paylaşıldı (<code>posts/${esc(id)}</code>).</div>`); toast("Gönderi paylaşıldı"); K.ciz();
    } catch (e) { msg(`<div class="note err">Olmadı: ${esc(e.code || e.message)}</div>`); }
    finally { q("#ofPost").disabled = false; }
  };
  const inviteCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[b % 31]).join("");
  q("#nlCreate").onclick = async () => {
    const name = q("#nlName").value.trim(), a = q("#nlApp").value, season = q("#nlSeason").value.trim(), open = q("#nlOpen").checked;
    const msg = h => { q("#nlMsg").innerHTML = h; };
    if (!name) { msg(`<div class="note err">Lig adını yaz.</div>`); return; }
    if (!noDash(name + season)) { msg(`<div class="note err">Uzun tire var; kısa tire ya da virgül kullan.</div>`); return; }
    const uid = offUid(a), u = offProfile(a);
    const ok = await confirmCard({ title: "Lig kurulsun mu?", yes: "Kur", rows: [["Ad", esc(name)], ["Spor", appTag(a)], ["Sezon", esc(season || "-")], ["Sahibi", `@${esc(u?.handle || OFFICIAL[a].handle)}`], ["Katılım", open ? "Açık, istek yok" : "İstekle"], ["Görünürlük", "Herkese açık, dünya geneli"]] });
    if (!ok) return;
    const data = { name: name.slice(0, 40), sport: a, ownerUid: uid, ownerName: (u?.displayName || OFFICIAL[a].name).slice(0, 40), members: [], memberNames: {}, teams: [],
      visibility: "public", open, season: season.slice(0, 30), inviteCode: inviteCode(), official: true, status: "active", format: "singles", rulesText: "" };
    q("#nlCreate").disabled = true; msg("Kuruluyor...");
    try {
      let id;
      if (DEMO) id = "lg" + Date.now();
      else { await fb(); id = (await F.addDoc(F.collection(db, "leagues"), { ...data, createdAt: F.serverTimestamp() })).id; }
      social.leagues.unshift({ id, ...data, createdAt: new Date() });
      leaguePromise = null; leagueData = null;
      q("#nlName").value = ""; q("#nlNameN").textContent = "0/40";
      msg(`<div class="note okn">Kuruldu (<code>leagues/${esc(id)}</code>, davet kodu <code>${esc(data.inviteCode)}</code>).</div>`); toast("Lig kuruldu"); K.ciz();
    } catch (e) { msg(`<div class="note err">Olmadı: ${esc(e.code || e.message)}</div>`); }
    finally { q("#nlCreate").disabled = false; }
  };
  return g;
}

// ─── SOSYAL: Kullanıcılar ve takip ───────────────────────────────────────
const M_STATUS = { pending: "Bekliyor", confirmed: "Onaylı", disputed: "İtiraz" };
function sosyal(c) {
  c.appendChild(p("Apple ya da Google ile giriş, profiller, takip, takip istekleri, paylaşılan maç sonuçları ve bildirim kutusu. Listeler Firestore'dan (<code>users</code>, <code>follows</code>, <code>followRequests</code>, <code>matches</code>, <code>notifications/*/items</code>) okunur; olay sayıları telemetriden."));
  if (bekle(c)) return;
  const S = stats(), L = I(), d = P();
  const users = social.users.filter(u => !isOfficial(u.id) && userAppOk(u.id));
  const follows = social.follows.filter(f => userAppOk(f.follower) || userAppOk(f.followee));
  const matches = social.matches.filter(m => aOk(m.sport));
  const items = social.notifItems.filter(x => userAppOk((x.path || "").split("/")[1]));
  const signed = L.filter(i => i.signedIn);
  hataSatiri(c, ["users", "follows", "matches", "followRequests", "notifItems", "handles"]);
  c.appendChild(tiles([
    ["Profil", fmt(users.length), social.handlesN != null ? `${fmt(social.handlesN)} kullanıcı adı (hepsi)` : "users", pfark(users)],
    ["Dönemde yeni profil", fmt(users.filter(u => inP(u.createdAt, d)).length), periodWord()],
    ["Takip", fmt(follows.length), `dönemde ${fmt(follows.filter(f => inP(f.createdAt, d)).length)}`, pfark(follows)],
    ["Bekleyen takip isteği", fmt(social.followRequests.length)],
    ["Kilitli profil", fmt(users.filter(u => u.private).length), `%${pct(users.filter(u => u.private).length, users.length)}`],
    ["Paylaşılan maç", fmt(matches.length), `${fmt(matches.filter(x => x.status === "confirmed").length)} onaylı · ${fmt(matches.filter(x => x.status === "pending").length)} bekliyor`],
    ["Giriş yapmış kurulum", fmt(signed.length), `%${pct(signed.length, L.length)} kurulum`],
    ["Sosyal işlem", fmt(evSum(S, "social")), `${fmt(evSum(S, "signin"))} giriş, ${periodWord()}`, evf("social")],
    ["Bildirim kutusu", fmt(items.length), `dönemde ${fmt(items.filter(x => inP(x.createdAt, d)).length)} · ${fmt(items.filter(x => x.pushed).length)} push`],
  ]));
  const g = izgara(c);
  grafikKart(g, "Günlük yeni profil ve takip", k => gunlukCubuk(k, stats().map(s => ({ t: s.day, u: users.filter(u => istGun(u.createdAt) === s.day).length, f: follows.filter(f => istGun(f.createdAt) === s.day).length })), { seriler: [{ ad: "Profil", alan: "u", renk: "var(--s1)" }, { ad: "Takip", alan: "f", renk: "var(--s3)" }] }));
  grafikKart(g, "Giriş yöntemi (dönem)", k => yatayCubuk(k, adla(evPrefix(S, "signin_"), SIGNIN)));
  grafikKart(g, "Sosyal işlemler (dönem)", k => yatayCubuk(k, adla(evPrefix(S, "social_"), SOCIAL), { limit: 14 }));
  grafikKart(g, "Giriş yapmış kurulum, uygulamaya göre", k => yatayCubuk(k, Object.fromEntries(APP_KEYS.filter(aOk).map(a => [appName(a), L.filter(i => i.app === a && i.signedIn).length]))));
  grafikKart(g, "Bildirim kutusu türü", k => yatayCubuk(k, countBy(items, x => x.type || "?")));
  const per = screenAgg(S), all = screenAgg(L);
  const sd = el("div", "kucuk-dl"); sd.innerHTML = ["community", "friends", "people", "player_search", "notifications", "leagues", "league"].map(k => `<div>${screenName(k)}</div><div>${fmt(per[k]?.views)} açılış · ${mins(per[k]?.sec)} (${periodWord()}) · ${fmt(all[k]?.people)} kişi (hepsi)</div>`).join("");
  g.appendChild(kart("Sosyal ekranlar", sd));
  c.appendChild(kart("Profiller", veriTablo(["Kişi", "Ad", { ad: "Sporlar", filtre: true }, { ad: "Ülke", filtre: true }, { ad: "Kilitli", filtre: true }, { ad: "Takipçi", num: true }, { ad: "Takip", num: true }, { ad: "Gönderi", num: true }, { ad: "Lig", num: true }, { ad: "Maç", num: true }, { ad: "Rapor", num: true }, { ad: "Kurulumlar", sirala: false }, "Katıldı"],
    users.map(u => ["@" + (u.handle || "?"), u.displayName || "", (u.sports || []).map(appName).join(", ") || "-", u.country || "-", u.private ? "Kilitli" : "Açık",
      num(social.followers.get(u.id) || 0), num(social.following.get(u.id) || 0), num(social.posts.filter(x => x.authorUid === u.id).length), num(social.leagues.filter(l => (l.members || []).includes(u.id)).length),
      num(social.matches.filter(m => (m.players || []).includes(u.id)).length), num(social.reports.filter(r => r.uid === u.id).length), installChips(installsOf(u.id)), tarihHucre(u.createdAt)]),
    { sirala: [12, "desc"], bos: "Profil yok.", satirTik: (_, n) => { const i = installsOf(users[n].id)[0]; if (i) openUser(i.id); } })));
  const g2 = izgara(c);
  g2.appendChild(kart("Takipler", veriTablo(["Takip eden", "Takip edilen", "Zaman"], follows.map(f => [atT(f.follower), atT(f.followee), tarihHucre(f.createdAt)]), { sirala: [2, "desc"], bos: "Takip yok." })));
  g2.appendChild(kart("Bekleyen takip istekleri", veriTablo(["İsteyen", "Kime", "Zaman"], social.followRequests.map(r => [r.fromHandle ? "@" + r.fromHandle : atT(r.from), atT(r.to), tarihHucre(r.createdAt)]), { sirala: [2, "desc"], bos: "Bekleyen istek yok." })));
  c.appendChild(kart("Paylaşılan maçlar", veriTablo([{ ad: "Spor", filtre: true }, { ad: "Durum", filtre: true }, "Oyuncular", "Kaydeden", "Oynandı", "Kayıt"],
    matches.map(m => [appName(m.sport), M_STATUS[m.status] || m.status || "?", (m.players || []).map(atT).join(", "), atT(m.createdBy), tarihHucre(m.playedAt), tarihHucre(m.createdAt)]), { sirala: [4, "desc"], bos: "Henüz paylaşılan maç yok." })));
  c.appendChild(kart("Firestore belgeleri", veriTablo(["Koleksiyon", { ad: "Belge", num: true }, "Not"],
    [["Profil (users)", social.users.length, "users"], ["Kullanıcı adı (handles)", social.handlesN, "handles"], ["Takip (follows)", social.follows.length, "follows"], ["Lig (leagues)", social.leagues.length, "leagues"],
     ["Paylaşılan maç (matches)", social.matches.length, "matches"], ["Gönderi (posts)", social.posts.length, "posts"], ["Yorum (posts/*/comments)", social.comments.length, "comments"], ["Beğeni (posts/*/likes)", social.likes.length, "likes"],
     ["Takip isteği (followRequests)", social.followRequests.length, "followRequests"], ["Bildirim kutusu (notifications/*/items)", social.notifItems.length, "notifItems"], ["Rapor (reports)", social.reports.length, "reports"], ["Engelleme (users/*/blocks)", social.err?.blocks ? null : social.blocks.length, "blocks"]]
      .map(([ad, v, k]) => [ad, v != null ? num(v) : "-", social.err?.[k] || ""]), { ara: false, kopyala: false }), p("Uygulama filtresinden bağımsız, hepsi.", "alt-not")));
}

// ─── Bildirim gönder (bu panelin beş uygulamalı formu) ─────────────────
const PUSH_HTML = `      <p class="muted">İki yol var. <b>Konular</b>: seçtiğin uygulamaların bildirime izin veren herkesine, tek hamlede. <b>Kitle</b>: filtreye uyan cihazlara tek tek, her cihaza kendi dilinde (yoksa İngilizce). Sıra hep aynı: önce <b>Doğrula</b>, sonra <b>Test cihazlarına</b>, en son <b>Gönder</b> ya da <b>Zamanla</b>.</p>
      <div id="pushState"></div>
      <div class="pushgrid">
        <div class="card pg-who">
          <h2>Kime</h2>
          <div class="modes" id="pushModes">
            <button class="mode on" data-mode="topics"><b>Konular</b><span>Hızlı. Seçilen uygulamalardaki herkes; dil konusuna göre kendi metni.</span></button>
            <button class="mode" data-mode="devices"><b>Kitle</b><span>Filtreli. Son görülme, Pass, giriş, dil ya da tek kişi; cihaz cihaz gider.</span></button>
          </div>
          <div id="whoTopics">
            <span class="lbl">Uygulama</span>
            <div class="chips" id="pushApps" style="margin-bottom:12px"></div>
          </div>
          <div id="whoAud" class="hidden">
            <div id="audFilters">
              <span class="lbl">Uygulama</span>
              <div class="chips" id="audApps" style="margin-bottom:10px"></div>
              <span class="lbl">Cihaz dili</span>
              <div class="chips" id="audLangs" style="margin-bottom:12px"></div>
              <div class="frow">
                <div><span class="lbl">Pass</span><div class="seg" data-seg="pro"><button data-v="any">Hepsi</button><button data-v="pro">Pro</button><button data-v="free">Ücretsiz</button></div></div>
                <div><span class="lbl">Hesap</span><div class="seg" data-seg="signed"><button data-v="any">Hepsi</button><button data-v="yes">Girişli</button><button data-v="no">Girişsiz</button></div></div>
              </div>
              <div class="frow">
                <div><span class="lbl">Son görülme</span><div class="seg" data-seg="act"><button data-v="any">Hepsi</button><button data-v="active">Son N günde açan</button><button data-v="inactive">N gündür açmayan</button></div>
                  <label class="inline-n hidden" id="actDaysWrap"><input id="actDays" type="number" min="1" max="365" inputmode="numeric"> gün</label></div>
              </div>
            </div>
            <span class="lbl">Tek kişi <span style="font-weight:500">(seçince diğer filtreler devre dışı kalır)</span></span>
            <div class="picker">
              <input id="audSearch" type="search" autocomplete="off" placeholder="@kullanıcı adı, ad ya da kurulum kimliği yaz">
              <div class="picklist hidden" id="audPick"></div>
            </div>
            <div id="audIds" style="margin:0 0 12px"></div>
          </div>
          <div id="pushAud"></div>
        </div>

        <div class="card pg-text">
          <h2>Metin</h2>
          <div class="emojis" id="emojiBar" aria-label="Emoji ekle"></div>
          <div class="langs" id="pushMain"></div>
          <details class="more" id="pushMore">
            <summary>Başka diller <span class="muted" id="pushMoreN"></span></summary>
            <p class="muted">Yalnız eklediğin diller ayrı metin alır; geri kalan herkes İngilizceyi görür. İngilizce dışında en fazla 4 dil (Konular modunda FCM koşulu beş konu alıyor).</p>
            <div class="langpick" id="pushPick"></div>
            <div class="langs" id="pushExtra"></div>
          </details>
          <div class="field" style="margin-top:14px"><label for="pushTab">Dokununca açılacak sekme</label>
            <select id="pushTab">
              <option value="">Uygulama (son kaldığı yer)</option>
              <option value="logbook">Maç defteri</option>
              <option value="setup">Maç kurulumu</option>
              <option value="courts">Kortlar</option>
              <option value="profile">Profil</option>
              <option value="friends">Arkadaşlar</option>
            </select></div>
          <div id="pushCheck"></div>
        </div>

        <div class="pg-side">
          <div class="card">
            <div class="prevtools"><h2 style="margin:0">Önizleme</h2><div class="seg" id="prevLangs"></div></div>
            <div class="phone"><div class="screen" id="prevScreen"></div></div>
            <div class="prevtools" style="margin:12px 0 0"><span class="muted" id="prevAppName"></span><div class="appicons" id="prevApps"></div></div>
            <p class="muted" style="margin:8px 0 0;font-size:12px">Kilit ekranında başlık tek satır, metin dört satıra kadar görünür; fazlası "..." ile kesilir.</p>
          </div>
          <div class="card">
            <h2>Şablonlar</h2>
            <div style="display:flex;gap:8px"><input id="tplName" placeholder="Şablon adı" maxlength="60"><button class="second" id="tplSave" style="flex:none">Kaydet</button></div>
            <div id="tplList" style="margin-top:8px"></div>
          </div>
        </div>

        <div class="card pg-send">
          <h2>Ne zaman</h2>
          <div class="seg" id="whenSeg"><button data-when="now" class="on">Hemen</button><button data-when="later">Zamanla</button></div>
          <div id="whenLater" class="hidden" style="margin-top:12px">
            <div class="field" style="max-width:320px"><label for="sendAt">Tarih ve saat (Türkiye saati)</label><input id="sendAt" type="datetime-local" step="300"></div>
            <p class="muted" id="sendAtInfo" style="margin:0"></p>
          </div>
          <div class="actions">
            <button class="second" data-push="validate">Doğrula (kimseye gitmez)</button>
            <button class="second" data-push="test">Test cihazlarına gönder</button>
            <button data-push="send" id="sendBtn">Gönder</button>
          </div>
          <p class="muted" style="margin-bottom:0" id="pushHint"></p>
        </div>

        <div class="card pg-res hidden" id="pushResultCard"><h2>Sonuç</h2><div id="pushResult"></div></div>

        <div class="card pg-stats"><h2>Bildirime izin veren</h2><p class="muted" style="margin-top:-6px">Telemetrideki <code>notif</code> alanı: izin verilmiş kurulum / bu alanı yazmış kurulum; parantezde cihaz adresi (<code>fcm</code>) olan. Tüm zamanlar.</p><div class="bars" id="pushNotif"></div></div>
      </div>
    </section>

    <section data-view="sent" class="hidden">
      <h1>Gönderilenler</h1>
      <p class="muted">Panelden giden ve zamanlanan bildirimler (doğrulamalar hariç), Firestore <code>pushes</code> koleksiyonundan; kaydı Worker yazar. Açılma: bildirime dokunanlar, günlük kayıtlardaki <code>push_open_&lt;kimlik&gt;</code> sayacından. Satıra dokununca metinler, hedef ve iş sonuçları açılır.</p>
      <div class="kpis" id="sentKpis"></div>
      <div class="toolbar"><div class="seg" id="sentFilter"></div><span class="muted" id="sentCount"></span><button class="ghost" id="sentReload">Yenile</button></div>
      <div class="tablewrap"><table><thead><tr><th>Zaman</th><th>Durum</th><th>Hedef</th><th>Başlık</th><th class="n">Giden</th><th class="n">Açılma</th><th></th></tr></thead><tbody id="sentRows"></tbody></table></div>`;
const PUSH_URL = "https://bam-sports-push.kittapcom.workers.dev";
const PUSH_TABS = { logbook: "Maç defteri", setup: "Maç kurulumu", courts: "Kortlar", profile: "Profil", friends: "Arkadaşlar" };
const PUSH_LANGS = { tr: "Türkçe", en: "İngilizce", de: "Almanca", es: "İspanyolca", fr: "Fransızca", it: "İtalyanca", pt: "Portekizce", nl: "Felemenkçe",
  ru: "Rusça", ja: "Japonca", ko: "Korece", zh: "Çince", ar: "Arapça", pl: "Lehçe", sv: "İsveççe", id: "Endonezce" };
const EXTRA_LANGS = Object.keys(PUSH_LANGS).filter(l => l !== "tr" && l !== "en");
const MAX_OTHER = 4, MAX_T = 50, MAX_B = 160, MAX_DEVICES = 2000;
const PH = { tr: ["Yeni sezon başladı", "Maçını kaydet, istatistiğin defterde birikip dursun."], en: ["New season is on", "Log your next match and watch your stats grow in the logbook."] };
/* Telefonda görünen ad (CFBundleDisplayName). */
const APP_IOS = { tennis: "Tennis Padel Score Keeper", pickleball: "Score Keeper for Pickleball", volleyball: "Volleyball Score Keeper", badminton: "Rally: Badminton", tabletennis: "Rally: Table Tennis" };
const NOW_WORD = { tr: "şimdi", en: "now", de: "jetzt", es: "ahora", fr: "maintenant", it: "ora", pt: "agora", nl: "nu", ru: "сейчас", ja: "今", ko: "지금", zh: "现在", ar: "الآن", pl: "teraz", sv: "nu", id: "sekarang" };
const LOCALE = { tr: "tr-TR", en: "en-US", de: "de-DE", es: "es-ES", fr: "fr-FR", it: "it-IT", pt: "pt-BR", nl: "nl-NL", ru: "ru-RU", ja: "ja-JP", ko: "ko-KR", zh: "zh-CN", ar: "ar", pl: "pl-PL", sv: "sv-SE", id: "id-ID" };
const EMOJI = ["🎾", "🏓", "🏸", "🏐", "🏆", "🔥", "⏱️", "📈", "📅", "⌚", "🎉", "💪", "👋", "✅", "⭐", "🙌"];
const DRAFT_KEY = "bs-push-draft";
const IST = 3 * 36e5;   // Türkiye: UTC+3, yaz saati yok
/* Karakter, insanın saydığı gibi: ten rengi ya da aile emojisi tek karakter. Worker da aynı sayar. */
const segm = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("tr", { granularity: "grapheme" }) : null;
const glen = s => segm ? [...segm.segment(s)].length : [...s].length;

let pushMode = "topics", pushApps = [], pushExtra = [], pushHealth = null, pushBusy = false, pushes = null, templates = null, openStats = null;
const aud = { apps: [], langs: [], pro: "any", signed: "any", act: "any", actDays: 7, inactDays: 14, ids: [] };
let when = "now", prevLang = "tr", prevApp = null, audRemote = null, audTimer = null, audSeq = 0, lastField = null, sentF = "all";



// ---- Form ----
function langBox(l) {
  const ph = PH[l] || ["", ""];
  return `<div data-lang="${l}"><div class="lang">${esc(PUSH_LANGS[l].toLocaleUpperCase("tr-TR"))}${l === "en" ? " (ŞART)" : l === "tr" ? "" : ` <a style="cursor:pointer;font-weight:600;letter-spacing:0" data-rm="${l}">kaldır</a>`}</div>
    <div class="field"><label for="pt_${l}">Başlık <small id="ptc_${l}">0/${MAX_T}</small></label><input id="pt_${l}" data-l="${l}" data-k="title" placeholder="${esc(ph[0])}" autocomplete="off"></div>
    <div class="field"><label for="pb_${l}">Metin <small id="pbc_${l}">0/${MAX_B}</small></label><textarea id="pb_${l}" data-l="${l}" data-k="body" rows="3" placeholder="${esc(ph[1])}"></textarea></div></div>`;
}
function bindLangInputs(root) {
  root.querySelectorAll("[data-l]").forEach(x => { x.oninput = () => { prevLang = x.dataset.l; pushChanged(); }; x.onfocus = () => { lastField = x; if (prevLang !== x.dataset.l) { prevLang = x.dataset.l; renderPreview(); } }; });
  root.querySelectorAll("[data-rm]").forEach(a => a.onclick = () => { pushExtra = pushExtra.filter(l => l !== a.dataset.rm); renderExtra(); });
}
function renderExtra(values = {}) {
  // Yazılmış metinleri koru: yeniden çizmeden önce oku, sonra geri koy.
  const keep = {};
  $("pushExtra").querySelectorAll("[data-l]").forEach(x => keep[x.id] = x.value);
  Object.assign(keep, values);
  $("pushPick").innerHTML = EXTRA_LANGS.map(l => `<button class="ghost${pushExtra.includes(l) ? " on" : ""}" data-pick="${l}">${esc(PUSH_LANGS[l])} <code>${l}</code></button>`).join("");
  $("pushPick").querySelectorAll("[data-pick]").forEach(b => b.onclick = () => {
    const l = b.dataset.pick;
    pushExtra = pushExtra.includes(l) ? pushExtra.filter(x => x !== l) : [...pushExtra, l];
    renderExtra();
  });
  $("pushExtra").innerHTML = pushExtra.map(langBox).join("");
  for (const [id, v] of Object.entries(keep)) if ($(id)) $(id).value = v;
  $("pushMoreN").textContent = pushExtra.length ? `(${pushExtra.length} dil)` : "";
  if (pushExtra.length) $("pushMore").open = true;
  bindLangInputs($("pushExtra"));
  pushChanged();
}
const appChip = (k, ad, renk, on, attr, n) => `<button class="chip${on ? " on" : ""}" ${attr}="${k}"><i style="background:${renk}"></i>${ad}${n != null ? `<small>${fmt(n)}</small>` : ""}</button>`;
function renderPushApps() {
  const n = a => allInstalls.filter(i => (a === "all" || i.app === a) && i.notif === true).length;
  $("pushApps").innerHTML = [["all", "Tümü", "var(--ink)"], ...APP_KEYS.map(a => [a, APPS[a].ad, APPS[a].renk])]
    .map(([k, ad, renk]) => appChip(k, ad, renk, k === "all" ? !pushApps.length : pushApps.includes(k), "data-papp", veriHazir() ? n(k) : null)).join("");
  $("pushApps").querySelectorAll("[data-papp]").forEach(b => b.onclick = () => {
    const k = b.dataset.papp;
    if (k === "all") pushApps = [];
    else pushApps = pushApps.includes(k) ? pushApps.filter(x => x !== k) : [...pushApps, k];
    if (pushApps.length === APP_KEYS.length) pushApps = [];
    renderPushApps(); pushChanged();
  });
}
/* Kitle filtreleri: uygulama, dil, Pass, hesap, son görülme, tek kişi. */
function renderAudFilters() {
  const pool = allInstalls.filter(reachOf);
  $("audApps").innerHTML = [["all", "Tümü", "var(--ink)"], ...APP_KEYS.map(a => [a, APPS[a].ad, APPS[a].renk])]
    .map(([k, ad, renk]) => appChip(k, ad, renk, k === "all" ? !aud.apps.length : aud.apps.includes(k), "data-aapp", veriHazir() ? pool.filter(i => k === "all" || i.app === k).length : null)).join("");
  $("audApps").querySelectorAll("[data-aapp]").forEach(b => b.onclick = () => {
    const k = b.dataset.aapp;
    aud.apps = k === "all" ? [] : aud.apps.includes(k) ? aud.apps.filter(x => x !== k) : [...aud.apps, k];
    if (aud.apps.length === APP_KEYS.length) aud.apps = [];
    renderAudFilters(); pushChanged(true);
  });
  const langCount = countBy(allInstalls.filter(i => i.language), i => lang2(i.language));
  const langs = [...new Set([...Object.keys(langCount).sort((a, b) => langCount[b] - langCount[a]).slice(0, 12), ...aud.langs])];
  $("audLangs").innerHTML = `<button class="chip${!aud.langs.length ? " on" : ""}" data-alang="all">Hepsi</button>` + langs.map(l => {
    const n = pool.filter(i => lang2(i.language) === l).length;
    return `<button class="chip${aud.langs.includes(l) ? " on" : ""}" data-alang="${esc(l)}">${esc(PUSH_LANGS[l] || LANG[l] || l)} <code>${esc(l)}</code><small>${fmt(n)}</small></button>`;
  }).join("");
  $("audLangs").querySelectorAll("[data-alang]").forEach(b => b.onclick = () => {
    const l = b.dataset.alang;
    aud.langs = l === "all" ? [] : aud.langs.includes(l) ? aud.langs.filter(x => x !== l) : [...aud.langs, l];
    renderAudFilters(); pushChanged(true);
  });
  document.querySelectorAll("#whoAud [data-seg]").forEach(s => s.querySelectorAll("button").forEach(b => b.classList.toggle("on", aud[s.dataset.seg] === b.dataset.v)));
  $("actDaysWrap").classList.toggle("hidden", aud.act === "any");
  if (document.activeElement !== $("actDays")) $("actDays").value = aud.act === "inactive" ? aud.inactDays : aud.actDays;
  const off = aud.ids.length > 0;
  $("audFilters").style.opacity = off ? ".42" : "";
  $("audFilters").style.pointerEvents = off ? "none" : "";
  $("audFilters").setAttribute("aria-disabled", off ? "true" : "false");
  $("audIds").innerHTML = aud.ids.map(id => {
    const i = allInstalls.find(x => x.id === id);
    const lbl = i ? (handleOf(i) ? "@" + handleOf(i) : nameOf(i) || shortId(id)) : shortId(id);
    return `<span class="tag">${i ? `<i style="width:8px;height:8px;border-radius:50%;background:${APPS[i.app]?.renk}"></i>` : ""}<b>${esc(lbl)}</b> <span class="muted">${esc(i ? appName(i.app) : "bilinmeyen kurulum")}${i && !reachOf(i) ? " · adres yok" : ""}</span><button data-unid="${esc(id)}" aria-label="Kaldır">×</button></span>`;
  }).join("") + (aud.ids.length > 1 ? `<button class="ghost" id="audClear" style="margin-top:6px">Hepsini kaldır</button>` : "");
  $("audIds").querySelectorAll("[data-unid]").forEach(b => b.onclick = () => { aud.ids = aud.ids.filter(x => x !== b.dataset.unid); renderAudFilters(); pushChanged(true); });
  if ($("audClear")) $("audClear").onclick = () => { aud.ids = []; renderAudFilters(); pushChanged(true); };
}
function bindAudControls() {
  document.querySelectorAll("#whoAud [data-seg]").forEach(s => s.querySelectorAll("button").forEach(b => b.onclick = () => {
    aud[s.dataset.seg] = b.dataset.v; renderAudFilters(); pushChanged(true);
    if (s.dataset.seg === "act" && b.dataset.v !== "any") $("actDays").focus();
  }));
  $("actDays").oninput = () => {
    const n = Math.max(1, Math.min(365, Math.round(+$("actDays").value) || 0));
    if (!+$("actDays").value) return;
    if (aud.act === "inactive") aud.inactDays = n; else aud.actDays = n;
    pushChanged(true);
  };
  $("actDays").onblur = () => renderAudFilters();
  // Tek kişi: kullanıcı adı, ad ya da kurulum kimliğiyle ara.
  const pick = $("audPick"), input = $("audSearch");
  const close = () => pick.classList.add("hidden");
  input.oninput = () => {
    const raw = input.value.trim().toLowerCase(), at = raw.startsWith("@"), q = raw.replace(/^@/, "");
    if (q.length < (at ? 1 : 2)) { close(); return; }
    // @ ile yalnız kullanıcı adı; yoksa kullanıcı adı, ad ya da kimliğin başı.
    const score = i => handleOf(i).toLowerCase().startsWith(q) ? 3 : handleOf(i).toLowerCase().includes(q) ? 2
      : at ? 0 : nameOf(i).toLowerCase().includes(q) ? 2 : i.id.toLowerCase().startsWith(q) ? 1 : 0;
    const hit = allInstalls.map(i => [i, score(i)]).filter(x => x[1] > 0)
      .sort((a, b) => (b[1] - a[1]) || (reachOf(b[0]) - reachOf(a[0])) || (ts(b[0].lastSeen) - ts(a[0].lastSeen))).slice(0, 8).map(x => x[0]);
    pick.innerHTML = hit.length ? hit.map(i => `<button data-addid="${esc(i.id)}">${whoCell(i)}<span class="muted">${esc(appName(i.app))} · ${ago(ts(i.lastSeen))}${reachOf(i) ? "" : " · adres yok"}</span></button>`).join("")
      : `<p class="muted" style="padding:10px 12px;margin:0">Bulunamadı.</p>`;
    pick.classList.remove("hidden");
    pick.querySelectorAll("[data-addid]").forEach(b => b.onclick = () => {
      if (!aud.ids.includes(b.dataset.addid)) aud.ids.push(b.dataset.addid);
      input.value = ""; close(); renderAudFilters(); pushChanged(true);
    });
  };
  input.onkeydown = e => { if (e.key === "Escape") close(); if (e.key === "ArrowDown") { e.preventDefault(); pick.querySelector("button")?.focus(); } };
  pick.onkeydown = e => {
    const items = [...pick.querySelectorAll("button")], k = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[Math.min(items.length - 1, k + 1)]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); (k <= 0 ? input : items[k - 1]).focus(); }
    if (e.key === "Escape") { close(); input.focus(); }
  };
  document.addEventListener("click", e => { if (!e.target.closest(".picker")) close(); });
}
function setMode(m) {
  pushMode = m;
  document.querySelectorAll("#pushModes .mode").forEach(b => b.classList.toggle("on", b.dataset.mode === m));
  $("whoTopics").classList.toggle("hidden", m !== "topics");
  $("whoAud").classList.toggle("hidden", m !== "devices");
  $("pushHint").innerHTML = `Test: ${m === "topics" ? "uygulama seçimi" : "filtre"} ne olursa olsun yalnız test cihazlarına (TestFlight ya da Profil'de sürüm satırına yedi dokunuş), cihaz adresiyle tek tek, her biri kendi dilinde. <code>bs_test</code> konusu kullanılmaz: konuya gönderim kimse abone olmasa da "gönderildi" görünür.`;
  if (m === "devices") renderAudFilters();
  pushChanged(true);
}
function initPushForm() {
  $("pushMain").innerHTML = langBox("tr") + langBox("en");
  bindLangInputs($("pushMain"));
  $("emojiBar").innerHTML = EMOJI.map(e => `<button type="button" data-emo="${e}" title="Ekle">${e}</button>`).join("");
  $("emojiBar").querySelectorAll("[data-emo]").forEach(b => {
    b.onmousedown = e => e.preventDefault();   // odak alanda kalsın
    b.onclick = () => {
      const f = lastField && document.body.contains(lastField) ? lastField : $("pt_tr");
      const s = f.selectionStart ?? f.value.length, e2 = f.selectionEnd ?? s;
      f.value = f.value.slice(0, s) + b.dataset.emo + f.value.slice(e2);
      f.focus(); f.selectionStart = f.selectionEnd = s + b.dataset.emo.length;
      prevLang = f.dataset.l; pushChanged();
    };
  });
  $("pushTab").onchange = () => pushChanged();
  document.querySelectorAll("#pushModes .mode").forEach(b => b.onclick = () => setMode(b.dataset.mode));
  document.querySelectorAll("#whenSeg button").forEach(b => b.onclick = () => setWhen(b.dataset.when));
  $("sendAt").oninput = () => pushChanged();
  document.querySelectorAll("[data-push]").forEach(b => b.onclick = () => pushAsk(b.dataset.push));
  $("tplSave").onclick = saveTemplate;
  $("tplName").onkeydown = e => { if (e.key === "Enter") saveTemplate(); };
  bindAudControls();
  renderPushApps(); renderExtra();
  restoreDraft();
  setMode(pushMode);
}

// ---- Zaman (Türkiye saati) ----
const istInput = ms => new Date(ms + IST).toISOString().slice(0, 16);           // datetime-local değeri
const istParse = v => v ? Date.parse(v + ":00+03:00") : NaN;
const istText = ms => new Date(ms).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
function untilText(ms) {
  const m = Math.round((ms - Date.now()) / 6e4);
  if (m < 60) return `${m} dakika sonra`;
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 48) return `${h} saat${r ? ` ${r} dakika` : ""} sonra`;
  return `${Math.round(h / 24)} gün sonra`;
}
function setWhen(w) {
  when = w;
  document.querySelectorAll("#whenSeg button").forEach(b => b.classList.toggle("on", b.dataset.when === w));
  $("whenLater").classList.toggle("hidden", w !== "later");
  if (w === "later") {
    const min = Math.ceil((Date.now() + 10 * 6e4) / 3e5) * 3e5;
    $("sendAt").min = istInput(min); $("sendAt").max = istInput(Date.now() + 60 * 864e5);
    if (!$("sendAt").value || istParse($("sendAt").value) < Date.now()) $("sendAt").value = istInput(Math.ceil((Date.now() + 36e5) / 36e5) * 36e5);
  }
  pushChanged();
}
function sendAtMs() { return when === "later" ? istParse($("sendAt").value) : null; }

// ---- Metin ve kontroller ----
const pushLangs = () => ["tr", "en", ...pushExtra];
function readTexts() {
  const texts = {};
  for (const l of pushLangs()) {
    const title = ($("pt_" + l)?.value || "").trim(), body = ($("pb_" + l)?.value || "").trim();
    if (title || body) texts[l] = { title, body };
  }
  return texts;
}
/* Worker'ın kurallarının aynısı; yazarken gösterir, hatalıysa düğmeler kapalı. */
function pushProblems() {
  const out = [], texts = readTexts();
  for (const l of pushLangs()) {
    const t = $("pt_" + l), b = $("pb_" + l); if (!t) continue;
    const tv = t.value.trim(), bv = b.value.trim(), tl = glen(tv), bl = glen(bv);
    $("ptc_" + l).textContent = `${tl}/${MAX_T}`; $("ptc_" + l).classList.toggle("over", tl > MAX_T);
    $("pbc_" + l).textContent = `${bl}/${MAX_B}`; $("pbc_" + l).classList.toggle("over", bl > MAX_B);
    const name = PUSH_LANGS[l];
    const dash = s => /[\u2014\u2013]/.test(s), hat = s => l === "tr" && /\u00e2/i.test(s);
    let badT = false, badB = false;
    if (dash(tv) || dash(bv)) { out.push(`${name}: uzun tire var, kısa tire ya da virgül kullan.`); badT ||= dash(tv); badB ||= dash(bv); }
    if (hat(tv) || hat(bv)) { out.push(`${name}: "\u00e2" var, "a" yaz.`); badT ||= hat(tv); badB ||= hat(bv); }
    if (tl > MAX_T) { out.push(`${name}: başlık ${MAX_T} karakteri geçiyor.`); badT = true; }
    if (bl > MAX_B) { out.push(`${name}: metin ${MAX_B} karakteri geçiyor.`); badB = true; }
    if ((tv || bv) && !(tv && bv)) { out.push(`${name}: başlık ve metin birlikte yazılmalı.`); badT ||= !tv; badB ||= !bv; }
    t.parentElement.classList.toggle("bad", badT); b.parentElement.classList.toggle("bad", badB);
  }
  if (!texts.en) out.push("İngilizce metin şart: kendi metni olmayan her dil onu görür.");
  const other = Object.keys(texts).filter(l => l !== "en");
  if (other.length > MAX_OTHER) out.push(`İngilizce dışında en fazla ${MAX_OTHER} dil yazılabilir (şu an ${other.length}).`);
  return out;
}
function whenProblem() {
  if (when !== "later") return "";
  const t = sendAtMs();
  if (!Number.isFinite(t)) return "Gönderim zamanını seç.";
  if (t < Date.now() + 2 * 6e4) return "Zaman geçmişte ya da çok yakın: en az birkaç dakika sonrası olmalı.";
  if (t > Date.now() + 60 * 864e5) return "En fazla 60 gün sonrasına zamanlanabilir.";
  return "";
}
function pushChanged(audChanged = false) {
  pushCheck();
  renderPreview();
  if (audChanged) scheduleAudience();
  renderAudience();
  saveDraft();
}
function pushCheck() {
  if (!$("pushCheck")) return;
  const probs = pushProblems(), empty = !Object.keys(readTexts()).length, wp = whenProblem();
  const a = currentAudience();
  const noOne = pushMode === "devices" && a && a.withToken === 0;
  const tooMany = pushMode === "devices" && a && a.withToken > MAX_DEVICES;
  const healthBad = !DEMO && pushHealth && !pushHealth.ready;
  const blocked = pushBusy || probs.length > 0 || healthBad;
  $("pushCheck").innerHTML = probs.length && !empty ? `<div class="note err">${probs.map(esc).join("<br>")}</div>` : "";
  document.querySelectorAll("[data-push]").forEach(b => b.disabled = blocked);
  $("sendBtn").disabled = blocked || !!wp || noOne || tooMany;
  $("sendBtn").textContent = when === "later" ? "Zamanla" : pushMode === "devices" ? (a && a.withToken ? `${fmt(a.withToken)} cihaza gönder` : "Gönder") : "Herkese gönder";
  if (when === "later") {
    const t = sendAtMs();
    $("sendAtInfo").innerHTML = wp ? `<span style="color:var(--rose)">${esc(wp)}</span>`
      : `Türkiye saatiyle <b>${esc(istText(t))}</b> · ${esc(untilText(t))}. Worker beş dakikada bir bakar; zamanı gelince ilk turda gider.`;
  }
}

// ---- Kitle sayımı ----
function audFilter() {
  if (aud.ids.length) return { installIds: aud.ids.slice() };
  const f = { apps: aud.apps.slice(), langs: aud.langs.slice(), pro: aud.pro };
  if (aud.act === "active") f.activeWithinDays = aud.actDays;
  if (aud.act === "inactive") f.inactiveForDays = aud.inactDays;
  if (aud.signed !== "any") f.signedIn = aud.signed === "yes";
  return f;
}
/* Worker'daki süzgecin aynısı (panelin elindeki veriyle anında tahmin, demo için de). */
function matchLocal(i, f, now = Date.now()) {
  if (f.installIds?.length && !f.installIds.includes(i.id)) return false;
  if (f.apps?.length && !f.apps.includes(i.app)) return false;
  if (f.langs?.length && !f.langs.includes(lang2(i.language))) return false;
  if (f.pro === "pro" && i.pro !== true) return false;
  if (f.pro === "free" && i.pro === true) return false;
  const seen = ts(i.lastSeen)?.getTime() ?? NaN;
  if (f.activeWithinDays && !(seen >= now - f.activeWithinDays * 864e5)) return false;
  if (f.inactiveForDays && !(seen < now - f.inactiveForDays * 864e5)) return false;
  if (typeof f.signedIn === "boolean" && (i.signedIn === true) !== f.signedIn) return false;
  return true;
}
function audienceLocal(f) {
  const match = allInstalls.filter(i => matchLocal(i, f)), reach = match.filter(reachOf);
  return { total: match.length, withToken: reach.length, noToken: match.filter(i => !hasToken(i)).length, notifOff: match.filter(i => hasToken(i) && i.notif === false).length,
    byApp: countBy(reach, i => i.app || "?"), byLang: countBy(reach, i => lang2(i.language) || "?"), local: true };
}
const audKey = () => JSON.stringify(audFilter());
function currentAudience() {
  if (pushMode !== "devices") return null;
  if (audRemote && audRemote.key === audKey()) return audRemote.data;
  return veriHazir() ? audienceLocal(audFilter()) : null;
}
function scheduleAudience() {
  if (pushMode !== "devices") return;
  clearTimeout(audTimer);
  if (DEMO || !K?.kullanici) return;
  const key = audKey(), seq = ++audSeq;
  audTimer = setTimeout(async () => {
    try {
      const data = await api("/audience", { filter: audFilter() });
      if (seq !== audSeq) return;
      audRemote = { key, data, at: new Date() };
    } catch (e) { if (seq === audSeq) audRemote = { key, err: e.message, at: new Date() }; }
    renderAudience(); pushCheck();
  }, 650);
}
/* Konular: kim hangi metni görür. Dili metni olanlar kendi dilini, gerisi İngilizceyi. */
function textSplit(pool, texts) {
  const m = {};
  for (const i of pool) { const l = texts[lang2(i.language)] ? lang2(i.language) : "en"; m[l] = (m[l] || 0) + 1; }
  return m;
}
const splitText = m => Object.entries(m).sort((a, b) => b[1] - a[1]).map(([l, n]) => `${esc(PUSH_LANGS[l] || l)} metni <b>${fmt(n)}</b>`).join(" · ");
/* "Yaklaşık N kişi: X iOS, Y Android" (kurulumun platform alanından). */
function platLine(list) {
  const ios = list.filter(i => i.platform !== "android").length, and = list.length - ios;
  return `<div class="row"><b>Yaklaşık ${fmt(list.length)} kişi: ${fmt(ios)} iOS, ${fmt(and)} Android</b></div>${and ? "" : `<div class="row"><span class="muted">Android Tenis telemetri yazmadığı ve bildirim konusuna abone olmadığı için Android'e bu panelden bildirim gitmez.</span></div>`}`;
}
function topicPool() { return allInstalls.filter(i => (!pushApps.length || pushApps.includes(i.app)) && i.notif === true); }
function renderAudience() {
  const box = $("pushAud"); if (!box) return;
  if (!veriHazir()) { box.innerHTML = `<div class="audbox"><span class="muted">Veri yükleniyor…</span></div>`; return; }
  const texts = readTexts(), hasTexts = Object.keys(texts).length > 0;
  if (pushMode === "topics") {
    const pool = topicPool(), known = allInstalls.filter(i => (!pushApps.length || pushApps.includes(i.app)) && typeof i.notif === "boolean").length;
    box.innerHTML = `<div class="audbox"><div class="big">~${fmt(pool.length)}<small>kurulum</small></div>
      ${platLine(pool)}
      <div class="row"><span>Bildirime izin veren, ${esc(targetText())}. Konuya abone olan herkes alır; telemetrisi eski olanlar sayıda yok.</span></div>
      ${hasTexts ? `<div class="row"><span>${splitText(textSplit(pool, texts))}</span></div>` : ""}
      <div class="row"><span>${fmt(known)} kurulumun izin durumu biliniyor.</span></div></div>`;
    return;
  }
  const a = currentAudience(), remote = audRemote && audRemote.key === audKey();
  const src = DEMO ? "Demo: panel verisinden sayıldı, Worker'a sorulmadı."
    : remote ? (audRemote.err ? `Worker sayamadı (${esc(audRemote.err)}); panel verisi gösteriliyor.` : `Worker sayımı · ${audRemote.at.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`)
    : "Panel verisinden anlık tahmin; Worker sayıyor…";
  const data = remote && audRemote.err ? audienceLocal(audFilter()) : a;
  const warn = data.withToken === 0 || data.withToken > MAX_DEVICES;
  const split = {};
  if (hasTexts) for (const [l, n] of Object.entries(data.byLang || {})) { const k = texts[l] ? l : "en"; split[k] = (split[k] || 0) + n; }
  box.innerHTML = `<div class="audbox${warn ? " warnbox" : ""}"><div class="big">${fmt(data.withToken)}<small>cihaz</small></div>
    ${platLine(allInstalls.filter(i => reachOf(i) && matchLocal(i, audFilter())))}
    <div class="row"><span>${esc(audSummary())}</span></div>
    <div class="row">${Object.entries(data.byApp || {}).sort((x, y) => y[1] - x[1]).map(([k, n]) => `<span class="app"><i style="background:${APPS[k]?.renk || "var(--soft)"}"></i>${esc(appName(k))} ${fmt(n)}</span>`).join("")}</div>
    ${hasTexts && data.withToken ? `<div class="row"><span>${splitText(split)}</span></div>` : ""}
    <div class="row"><span>Filtreye uyan ${fmt(data.total)} kurulum${data.noToken ? ` · ${fmt(data.noToken)} tanesinin cihaz adresi yok` : ""}${data.notifOff ? ` · ${fmt(data.notifOff)} tanesi bildirimi kapatmış` : ""}.</span></div>
    ${data.withToken === 0 ? `<div class="row"><b style="color:var(--warn)">Bu filtreye uyan, bildirim adresi olan cihaz yok.</b></div>` : ""}
    ${data.withToken > MAX_DEVICES ? `<div class="row"><b style="color:var(--warn)">Tek gönderimde en fazla ${fmt(MAX_DEVICES)} cihaz: filtreyi daralt ya da Konular modunu kullan.</b></div>` : ""}
    <div class="row"><span>${src}</span></div></div>`;
}
function targetText() { return pushApps.length ? pushApps.map(appName).join(", ") : "beş uygulamanın hepsi"; }
function audSummary() {
  const f = audFilter(), parts = [];
  if (f.installIds) {
    const who = f.installIds.map(id => { const i = allInstalls.find(x => x.id === id); return i ? (handleOf(i) ? "@" + handleOf(i) : shortId(id)) + ` (${appName(i.app)})` : shortId(id); });
    return (f.installIds.length === 1 ? "Tek kişi: " : `${f.installIds.length} seçili kişi: `) + who.join(", ");
  }
  parts.push(f.apps.length ? f.apps.map(appName).join(", ") : "Tüm uygulamalar");
  if (f.langs.length) parts.push("dil " + f.langs.join(", "));
  if (f.pro !== "any") parts.push(f.pro === "pro" ? "Pro" : "ücretsiz");
  if (f.activeWithinDays) parts.push(`son ${f.activeWithinDays} günde açan`);
  if (f.inactiveForDays) parts.push(`${f.inactiveForDays} gündür açmayan`);
  if (typeof f.signedIn === "boolean") parts.push(f.signedIn ? "girişli" : "girişsiz");
  return parts.join(" · ");
}
const summaryText = () => pushMode === "topics" ? targetText().replace(/^b/, "B") : audSummary();

// ---- iPhone kilit ekranı önizlemesi ----
function previewApps() {
  if (pushMode === "topics") return pushApps.length ? pushApps : APP_KEYS;
  if (aud.ids.length) { const a = [...new Set(aud.ids.map(id => allInstalls.find(x => x.id === id)?.app).filter(Boolean))]; return a.length ? a : APP_KEYS; }
  return aud.apps.length ? aud.apps : APP_KEYS;
}
function renderPreview() {
  if (!$("prevScreen")) return;
  const texts = readTexts(), langs = pushLangs();
  if (!langs.includes(prevLang)) prevLang = "tr";
  const apps = previewApps();
  if (!apps.includes(prevApp)) prevApp = apps[0];
  $("prevLangs").innerHTML = langs.map(l => `<button data-pl="${l}" class="${l === prevLang ? "on" : ""}" title="${esc(PUSH_LANGS[l])}">${l.toUpperCase()}</button>`).join("");
  $("prevLangs").querySelectorAll("[data-pl]").forEach(b => b.onclick = () => { prevLang = b.dataset.pl; renderPreview(); });
  $("prevApps").innerHTML = apps.length > 1 ? apps.map(a => `<button data-pa="${a}" class="${a === prevApp ? "on" : ""}" title="${esc(appName(a))}"><img src="${APP_ICON[a]}" alt="${esc(appName(a))}"></button>`).join("") : "";
  $("prevApps").querySelectorAll("[data-pa]").forEach(b => b.onclick = () => { prevApp = b.dataset.pa; renderPreview(); });
  // Dilin kendi metni yoksa o dildeki telefon İngilizceyi görür.
  const own = texts[prevLang], shown = own || texts.en, shownLang = own ? prevLang : "en";
  const ph = !shown, t = shown || { title: (PH[prevLang] || PH.en)[0], body: (PH[prevLang] || PH.en)[1] };
  const at = when === "later" && Number.isFinite(sendAtMs()) ? new Date(sendAtMs()) : new Date();
  const loc = LOCALE[prevLang] || "en-US";
  const opt = { timeZone: when === "later" ? "Europe/Istanbul" : undefined };
  const date = at.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long", ...opt });
  const time = at.toLocaleTimeString(loc, { hour: prevLang === "en" ? "numeric" : "2-digit", minute: "2-digit", hour12: prevLang === "en" ? true : undefined, ...opt }).replace(/\s?[AP]M$/i, "");
  const c = APPS[prevApp]?.renk || "#2CD758";
  $("prevScreen").innerHTML = `<div class="wall" style="background:radial-gradient(120% 70% at 20% 0%, ${c} 0%, transparent 60%),radial-gradient(90% 60% at 100% 100%, ${c}88 0%, transparent 70%),linear-gradient(170deg,#1d2b3a,#0b1118)"></div>
    <div class="island"></div>
    <div class="lock"><div class="d">${esc(date)}</div><div class="t">${esc(time)}</div></div>
    <div class="noti" role="img" aria-label="Bildirim önizlemesi">
      <img src="${APP_ICON[prevApp]}" alt="">
      <div class="tx"><div class="hd"><span>${esc(APP_IOS[prevApp] || appName(prevApp))}</span><span>${esc(NOW_WORD[prevLang] || "now")}</span></div>
        <div class="ti${ph ? " ph" : ""}" dir="auto">${esc(t.title)}</div><div class="bd${ph ? " ph" : ""}" dir="auto">${esc(t.body)}</div></div>
    </div>
    <div class="bottom"><i></i><i></i></div><div class="bar"></div>`;
  $("prevAppName").textContent = ph ? "Metin yazınca burada görünür." : !own && prevLang !== "en" ? `${PUSH_LANGS[prevLang]} metni yok: bu telefon İngilizceyi görür.` : `${appName(prevApp)} · ${PUSH_LANGS[shownLang]}${$("pushTab").value ? ` · dokununca ${PUSH_TABS[$("pushTab").value]}` : ""}`;
}

// ---- Taslak (bu tarayıcıda) ----
function draftData() {
  const vals = {};
  for (const l of pushLangs()) { vals[l] = { title: $("pt_" + l)?.value || "", body: $("pb_" + l)?.value || "" }; }
  return { mode: pushMode, apps: pushApps, aud: { ...aud, ids: aud.ids.slice(0, 20) }, texts: vals, extra: pushExtra, tab: $("pushTab").value };
}
let draftReady = false;
function saveDraft() { if (draftReady) store.set(DRAFT_KEY, JSON.stringify(draftData())); }
function restoreDraft() {
  try { const d = JSON.parse(store.get(DRAFT_KEY) || "null"); if (d) loadDraft(d, true); } catch { }
  draftReady = true;
}
/* Şablon, eski gönderim ya da taslak forma. */
function loadDraft(d, quiet = false) {
  pushMode = d.mode === "devices" ? "devices" : "topics";
  pushApps = (d.apps || []).filter(a => APPS[a]);
  if (d.aud) Object.assign(aud, { apps: [], langs: [], pro: "any", signed: "any", act: "any", ids: [] }, d.aud);
  else if (d.filter) {
    const f = d.filter;
    Object.assign(aud, { apps: f.apps || [], langs: f.langs || [], pro: f.pro || "any", ids: f.installIds || [],
      signed: typeof f.signedIn === "boolean" ? (f.signedIn ? "yes" : "no") : "any",
      act: f.activeWithinDays ? "active" : f.inactiveForDays ? "inactive" : "any" });
    if (f.activeWithinDays) aud.actDays = f.activeWithinDays;
    if (f.inactiveForDays) aud.inactDays = f.inactiveForDays;
  } else Object.assign(aud, { apps: [], langs: [], pro: "any", signed: "any", act: "any", ids: [] });
  const texts = d.texts || {};
  pushExtra = (d.extra || Object.keys(texts).filter(l => l !== "tr" && l !== "en")).filter(l => EXTRA_LANGS.includes(l)).slice(0, 6);
  for (const l of ["tr", "en"]) { $("pt_" + l).value = texts[l]?.title || ""; $("pb_" + l).value = texts[l]?.body || ""; }
  const extraVals = {};
  for (const l of pushExtra) { extraVals["pt_" + l] = texts[l]?.title || ""; extraVals["pb_" + l] = texts[l]?.body || ""; }
  $("pushExtra").innerHTML = "";
  $("pushTab").value = PUSH_TABS[d.tab] ? d.tab : "";
  renderPushApps();
  renderExtra(extraVals);
  setMode(pushMode);
  if (!quiet) prevLang = texts.tr ? "tr" : "en";
}
function pushToInstall(id) {
  aud.ids = [id];
  bekleyenMod = "devices";
  K.git("bildirim");
  toast("Kitle: tek kişi seçildi. Metni yaz, Doğrula, Gönder.");
}

// ---- Şablonlar (pushTemplates) ----
async function loadTemplates(force = false) {
  if (templates && !templates.err && !force) { renderTemplates(); return; }
  templates = { loading: true }; renderTemplates();
  if (DEMO) templates = { list: demo.templates };
  else {
    try {
      await fb();
      const snap = await F.getDocs(F.query(F.collection(db, "pushTemplates"), F.orderBy("updatedAt", "desc"), F.limit(100)));
      templates = { list: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (e) { templates = { err: e.code || e.message }; }
  }
  renderTemplates();
}
function renderTemplates() {
  const el = $("tplList"); if (!el) return;
  if (!templates || templates.loading) { el.innerHTML = `<p class="muted">Yükleniyor…</p>`; return; }
  if (templates.err) { el.innerHTML = `<p class="muted">Okunamadı: ${esc(templates.err)}</p>`; return; }
  el.innerHTML = templates.list.length ? templates.list.map((t, n) => {
    const tt = t.texts?.tr || t.texts?.en || {};
    return `<div class="tpl"><div><b title="${esc(t.name)}">${esc(t.name)}</b><small title="${esc(tt.title || "")}">${t.mode === "devices" ? "Kitle" : "Konular"} · ${esc(Object.keys(t.texts || {}).join(", ").toUpperCase())} · ${esc(tt.title || "")}</small></div>
      <button class="ghost" data-tload="${n}">Yükle</button><button class="ghost" data-tdel="${n}" aria-label="Sil" title="Sil">Sil</button></div>`;
  }).join("") : `<p class="muted">Henüz şablon yok. Metni yaz, ad ver, Kaydet.</p>`;
  el.querySelectorAll("[data-tload]").forEach(b => b.onclick = () => { const t = templates.list[+b.dataset.tload]; loadDraft(t); $("tplName").value = t.name; toast(`"${t.name}" yüklendi`); });
  el.querySelectorAll("[data-tdel]").forEach(b => b.onclick = async () => {
    const t = templates.list[+b.dataset.tdel];
    if (!await confirmCard({ title: "Şablon silinsin mi?", rows: [["Ad", `<b>${esc(t.name)}</b>`]], yes: "Sil", danger: true })) return;
    try {
      if (DEMO) demo.templates.splice(demo.templates.indexOf(t), 1);
      else { await fb(); await F.deleteDoc(F.doc(db, "pushTemplates", t.id)); templates.list = templates.list.filter(x => x !== t); }
      renderTemplates(); toast("Şablon silindi");
    } catch (e) { toast("Silinemedi: " + (e.code || e.message)); }
  });
}
async function saveTemplate() {
  const name = $("tplName").value.trim();
  if (!name) { $("tplName").focus(); toast("Şablona bir ad ver"); return; }
  const texts = readTexts();
  if (!Object.keys(texts).length) { toast("Önce metni yaz"); return; }
  const d = draftData();
  const data = { name: name.slice(0, 60), mode: d.mode, apps: d.apps, aud: { ...d.aud, ids: [] }, texts, extra: d.extra, tab: d.tab || null };
  if (!templates?.list) await loadTemplates();
  const same = templates?.list?.find(t => t.name.toLocaleLowerCase("tr") === data.name.toLocaleLowerCase("tr"));
  if (same && !await confirmCard({ title: "Aynı adlı şablon var", rows: [["Ad", `<b>${esc(same.name)}</b>`]], note: "Üzerine yazılsın mı?", yes: "Üzerine yaz" })) return;
  $("tplSave").disabled = true;
  try {
    if (DEMO) {
      if (same) Object.assign(same, data, { updatedAt: new Date() });
      else demo.templates.unshift({ id: "t" + Date.now(), ...data, createdAt: new Date(), updatedAt: new Date() });
    } else {
      await fb();
      if (same) await F.setDoc(F.doc(db, "pushTemplates", same.id), { ...data, updatedAt: F.serverTimestamp() }, { merge: true });
      else await F.addDoc(F.collection(db, "pushTemplates"), { ...data, createdAt: F.serverTimestamp(), updatedAt: F.serverTimestamp(), by: K.kullanici?.email || "" });
    }
    toast(same ? "Şablon güncellendi" : "Şablon kaydedildi");
    await loadTemplates(true);
  } catch (e) { toast("Kaydedilemedi: " + (e.code || e.message)); }
  finally { $("tplSave").disabled = false; }
}

// ---- Bildirime izin verenler ----
function renderPushStats() {
  const k = $("pushNotif"); if (!k) return;
  const L = IA();
  const rows = APP_KEYS.filter(aOk).map(a => {
    const l = L.filter(i => i.app === a), known = l.filter(i => typeof i.notif === "boolean").length, on = l.filter(i => i.notif === true).length, tok = l.filter(reachOf).length;
    return [appName(a), l.length, known, on, tok];
  });
  k.textContent = "";
  k.appendChild(veriTablo(["Uygulama", { ad: "Kurulum", num: true }, { ad: "Alanı yazan", num: true }, { ad: "İzin veren", num: true }, { ad: "Oran", num: true }, { ad: "Cihaz adresi", num: true }],
    rows.map(([ad, n, kn, on, tok]) => [ad, num(n), num(kn), num(on), { d: yuzde(on, kn), s: kn ? on / kn : 0 }, num(tok)]), { ara: false, kopyala: false }));
  const on = L.filter(i => i.notif === true).length;
  k.appendChild(p(`Toplam <b>${fmt(on)}</b> kurulum bildirime izin vermiş, <b>${fmt(L.filter(reachOf).length)}</b> tanesinin cihaz adresi var (Kitle modu bunlara ulaşır). Alanı yazmayan eski sürümler sayılmaz.`, "alt-not"));
}
/* Veri yenilenince bildirim sayfasındaki sayılar. */
function pushRefresh() {
  if (!$("pushApps")) return;
  renderPushApps();
  if (pushMode === "devices") renderAudFilters();
  pushCheck(); renderAudience(); renderPreview();
  if (K?.sayfa === "bildirim") scheduleAudience();
}

// ---- Worker ----
const SETUP_NOTE = `<div class="note"><b>Worker çalışıyor ama FCM anahtarı (FCM_SA) kurulu değil.</b> Bir kez şunlar yapılınca gönderim açılır:
  <ol style="margin:8px 0 0;padding-left:20px">
    <li>Firebase Console (<code>bam-tech-sports</code>) &rarr; Proje ayarları &rarr; Hizmet hesapları &rarr; <b>Yeni özel anahtar oluştur</b> &rarr; JSON'u kaydet.</li>
    <li>Terminalde: <code>cd ~/dev/"All Sport Apps"/push-worker &amp;&amp; npx wrangler secret put FCM_SA &lt; indirilen.json</code> (sonra JSON'u sil).</li>
    <li>iOS için APNs anahtarı: Firebase Console &rarr; Proje ayarları &rarr; Cloud Messaging &rarr; beş iOS uygulamasının her birine <code>~/dev/p8/AuthKey_2972UYSCQ2.p8</code> yükle (Key ID <code>2972UYSCQ2</code>, Team ID <code>949JRVJB94</code>).</li>
  </ol>
  <p style="margin:8px 0 0"><a href="https://console.firebase.google.com/project/bam-tech-sports/settings/serviceaccounts/adminsdk" target="_blank" rel="noopener">Hizmet hesapları</a> · <a href="https://console.firebase.google.com/project/bam-tech-sports/settings/cloudmessaging" target="_blank" rel="noopener">Cloud Messaging</a> · kurduktan sonra <a style="cursor:pointer" id="healthAgain">yeniden kontrol et</a></p></div>`;
async function loadPushHealth(force = false) {
  if (DEMO) {
    $("pushState").innerHTML = `<div class="note">Demo: her şey çalışır ama hiçbir şey gitmez. Worker'a ve Firestore'a dokunulmaz; gönderim, zamanlama, şablon ve iptal yalnız bu sekmede, sahte veriyle canlandırılır.</div>`;
    pushCheck(); return;
  }
  if (pushHealth && !force && pushHealth.ready) return;
  $("pushState").innerHTML = `<p class="muted">Worker kontrol ediliyor…</p>`;
  try {
    const r = await fetch(PUSH_URL + "/health?deep=1", { cache: "no-store" });
    pushHealth = await r.json();
    $("pushState").innerHTML = !pushHealth.ready ? SETUP_NOTE
      : pushHealth.firestore && pushHealth.firestore !== "ok" ? `<div class="note err"><b>Worker Firestore'a ulaşamıyor:</b> ${esc(pushHealth.firestore)}. Konular modunda gönderim çalışır; Kitle, zamanlama ve kayıt çalışmaz.</div>`
      : (pushHealth.version || 1) < 2 ? `<div class="note">Worker eski sürüm: Kitle modu ve zamanlama için <code>push-worker</code> klasöründen <code>npx wrangler deploy</code>.</div>`
      : `<div class="note okn">Worker hazır: FCM anahtarı kurulu, Firestore erişimi var.</div>`;
  } catch (e) {
    pushHealth = null;
    $("pushState").innerHTML = `<div class="note err">Worker'a ulaşılamadı (${esc(e.message)}). <a style="cursor:pointer" id="healthAgain">Yeniden dene</a></div>`;
  }
  if ($("healthAgain")) $("healthAgain").onclick = () => loadPushHealth(true);
  pushCheck();
}
async function api(path, body) {
  if (DEMO) return demoApi(path, body);
  const token = await K.token();
  const r = await fetch(PUSH_URL + path, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const out = await r.json().catch(() => ({}));
  if (!r.ok || out.error) throw new Error(out.error === "forbidden" ? "Worker yetki vermedi (yönetici e-postası doğrulanmış olmalı)" : out.error || `HTTP ${r.status}`);
  return out;
}
function topicJobsLocal(apps, texts, test) {
  const langs = Object.keys(texts);
  if (test) return [{ app: "test", lang: langs.includes("tr") ? "tr" : "en", condition: "'bs_test' in topics" }];
  const others = langs.filter(l => l !== "en"), jobs = [];
  for (const s of apps.length ? apps.map(a => ({ app: a, topic: `bs_${a}` })) : [{ app: "all", topic: "bs_all" }]) {
    for (const l of others) jobs.push({ app: s.app, lang: l, condition: `'${s.topic}' in topics && 'bs_lang_${l}' in topics` });
    jobs.push({ app: s.app, lang: "en", condition: `'${s.topic}' in topics` + others.slice(0, 4).map(l => ` && !('bs_lang_${l}' in topics)`).join("") });
  }
  return jobs;
}
function buildPayload(kind) {
  const p = { mode: pushMode, texts: readTexts(), tab: $("pushTab").value || null, summary: summaryText() };
  if (pushMode === "topics") { p.apps = pushApps.slice(); p.estimate = topicPool().length; }
  else p.filter = audFilter();
  if (kind === "validate") p.validate = true;
  /* Test her zaman cihaz adresiyle gider: bs_test konusuna gönderim FCM'de
     "gönderildi" der ama 2.0 (10) ve öncesi iOS sürümleri konulara hiç
     katılamadı, telefona bir şey düşmüyordu. Worker da testi cihaz moduna çevirir. */
  if (kind === "test") { p.test = true; p.mode = "devices"; delete p.apps; delete p.estimate; p.filter = {}; p.summary = "Test cihazları (cihaz adresiyle)"; }
  if (kind === "schedule") p.sendAt = new Date(sendAtMs()).toISOString();
  return p;
}
async function pushAsk(kind) {
  if (pushBusy || pushProblems().length) return;
  if (kind === "send" && when === "later") kind = "schedule";
  if (kind === "validate" || kind === "test") return pushRun(kind);
  if (whenProblem()) return;
  const texts = readTexts(), tab = $("pushTab").value, a = currentAudience();
  const langsRow = Object.entries(texts).map(([l, t]) => `<b>${esc(l.toUpperCase())}</b> ${esc(t.title)}<br><span class="muted">${esc(t.body)}</span>`).join("<br>");
  const rows = [
    ["Yol", pushMode === "topics" ? "Konular (konuya abone olan herkes)" : "Kitle (cihaz cihaz, kendi dilinde)"],
    ["Kime", `<b>${esc(summaryText())}</b>`],
    ["Ulaşacak", pushMode === "topics" ? `yaklaşık <b>${fmt(topicPool().length)}</b> kurulum (izin veren)` : `<b>${fmt(a?.withToken || 0)}</b> cihaz${audRemote && audRemote.key === audKey() && !audRemote.err ? " (Worker sayımı)" : " (panel tahmini; Worker gönderirken yeniden sayar)"}`],
    ["Metin dağılımı", pushMode === "topics" ? splitText(textSplit(topicPool(), texts)) || "-" : (() => { const s = {}; for (const [l, n] of Object.entries(a?.byLang || {})) { const k = texts[l] ? l : "en"; s[k] = (s[k] || 0) + n; } return splitText(s) || "-"; })()],
    ["Metinler", langsRow],
    ["Sekme", esc(tab ? PUSH_TABS[tab] : "Uygulama açılır")],
    ["Zaman", kind === "schedule" ? `<b>${esc(istText(sendAtMs()))}</b> (Türkiye) · ${esc(untilText(sendAtMs()))}` : "Hemen"],
  ];
  if (pushMode === "topics") rows.push(["FCM işi", `${fmt(topicJobsLocal(pushApps, texts, false).length)} koşullu mesaj`]);
  const n = pushMode === "devices" ? a?.withToken || 0 : 0;
  const ok = await confirmCard({
    title: kind === "schedule" ? "Zamanlansın mı?" : pushMode === "topics" ? "Herkese gönderilsin mi?" : `${fmt(n)} cihaza gönderilsin mi?`,
    rows,
    note: kind === "schedule" ? "Zamanı gelene kadar Gönderilenler'den iptal edebilirsin." : "Geri alınamaz; telefonlara hemen düşer.",
    yes: kind === "schedule" ? "Evet, zamanla" : pushMode === "topics" ? "Evet, herkese gönder" : `Evet, ${fmt(n)} cihaza gönder`,
    danger: kind !== "schedule",
  });
  if (ok) pushRun(kind);
}
async function pushRun(kind) {
  if (pushBusy) return;
  if (!DEMO && !K?.kullanici) return;
  const payload = buildPayload(kind);
  const label = { validate: "Doğrulama", test: "Test gönderimi", send: "Gönderim", schedule: "Zamanlama" }[kind];
  pushBusy = true; pushCheck();
  $("pushResultCard").classList.remove("hidden");
  $("pushResult").innerHTML = `<p class="muted">${label} yapılıyor…</p>`;
  $("pushResultCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
  let out = null;
  try {
    out = await api("/push", payload);
    if (out.status === "sending") {
      progress(out);
      let guard = 0;
      while (out.status === "sending" && guard++ < 300) {
        await sleep(out.busy ? 3000 : 200);
        out = await api("/continue", { pid: out.pid });
        progress(out);
      }
    }
    pushes = null;
    $("pushResult").innerHTML = resultHtml(out, kind, label);
    bindResult();
  } catch (e) {
    $("pushResult").innerHTML = `<div class="note err"><b>${label} olmadı:</b> ${esc(e.message)}${out?.pid && out.status === "sending" ? `<br>Gönderim yarıda kaldı (kimlik <code>${esc(out.pid)}</code>). Worker beş dakika içinde kaldığı yerden sürdürür; Gönderilenler'den de devam ettirebilirsin.` : ""}</div>`;
  } finally { pushBusy = false; pushCheck(); }
}
function progress(o) {
  const c = o.counts || {}, done = (c.sent || 0) + (c.failed || 0), all = c.targeted || 1;
  $("pushResult").innerHTML = `<p style="margin:0"><b>${fmt(done)} / ${fmt(all)}</b> cihaz${o.busy ? " · başka bir istek bu dilimi gönderiyor, bekleniyor" : ""}</p>
    <div class="progress"><div style="width:${Math.round(done / all * 100)}%"></div></div>
    <p class="muted" style="margin:0">${fmt(c.sent)} gitti · ${fmt(c.failed)} hata${c.removedTokens ? ` · ${fmt(c.removedTokens)} ölü adres silindi` : ""}. Ücretsiz planda 40'arlı dilimlerle gider; sayfayı kapatırsan Worker kalanını beş dakikada bir dilim sürdürür.</p>`;
}
function resultHtml(out, kind, label) {
  const results = out.results || [], fail = results.filter(x => !x.ok).length;
  const openBtn = out.pid && kind !== "validate" ? ` <a style="cursor:pointer" data-opensent="${esc(out.pid)}">Gönderilenler'de aç</a>` : "";
  if (kind === "schedule") return `<div class="note okn"><b>Zamanlandı:</b> ${esc(istText(Date.parse(out.sendAt)))} (Türkiye), ${esc(untilText(Date.parse(out.sendAt)))}. Kimlik <code>${esc(out.pid)}</code>. Gönderilenler'den iptal edebilirsin.${openBtn}</div>`;
  if (out.mode === "devices" && out.validate) {
    return `<div class="note ${fail ? "err" : "okn"}"><b>${label}:</b> filtreye uyan <b>${fmt(out.counts?.targeted)}</b> cihaz; kullanılan her dil için bir örnek cihazla FCM denendi, ${fmt(results.length - fail)} / ${fmt(results.length)} geçti. Kimseye gönderilmedi.${out.tooMany ? ` <b>Dikkat:</b> ${fmt(MAX_DEVICES)} sınırını aşıyor.` : ""}</div>
      <p class="muted">Metin dağılımı: ${splitText(out.byLang || {}) || "-"}</p>${sampleTable(results)}`;
  }
  if (out.mode === "devices") {
    const c = out.counts || {};
    return `<div class="note ${c.failed ? (c.sent ? "" : "err") : "okn"}"><b>${label}:</b> <b>${fmt(c.sent)}</b> cihaza gitti${c.failed ? `, ${fmt(c.failed)} hata` : ""}${c.removedTokens ? `, ${fmt(c.removedTokens)} ölü adres silindi` : ""}. Kimlik <code>${esc(out.pid)}</code>.${openBtn}</div>${deviceDetail(out)}`;
  }
  const head = out.validate ? `${fmt(results.length - fail)} / ${fmt(results.length)} iş FCM'den geçti, kimseye gönderilmedi.` : `${fmt(out.sent)} / ${fmt(results.length)} iş gönderildi (kimlik <code>${esc(out.pid)}</code>).`;
  return `<div class="note ${fail ? "err" : "okn"}"><b>${label}:</b> ${head}${openBtn}</div>${resultTable(results, out.validate)}`;
}
function bindResult() {
  document.querySelectorAll("[data-opensent]").forEach(a => a.onclick = async () => {
    K.git("gonderilenler"); await loadPushes(); const p = (pushes?.list || []).find(x => pPid(x) === a.dataset.opensent); if (p) openSent(p);
  });
}
function sampleTable(results) {
  if (!results?.length) return "";
  return `<div class="tablewrap"><table><thead><tr><th>Dil</th><th>Örnek cihaz</th><th>Sonuç</th><th>Ayrıntı</th></tr></thead><tbody>${results.map(x => `<tr>
    <td>${esc(PUSH_LANGS[x.lang] || x.lang)}</td><td>${appTag(x.app)} <code>${esc(shortId(x.install))}</code></td>
    <td>${x.ok ? '<span class="pill ok">geçerli</span>' : '<span class="pill err">hata</span>'}</td>
    <td class="muted wrap">${x.ok ? "" : esc(`${x.code || ""} ${x.error || ""}`)}${x.deadTried ? `${x.ok ? "" : "<br>"}${fmt(x.deadTried)} ölü adres atlandı` : ""}</td></tr>`).join("")}</tbody></table></div>`;
}
function deviceDetail(p) {
  const byLang = Object.entries(p.byLang || {}), byApp = Object.entries(p.byApp || {}), errs = Object.entries(p.errors || {});
  const tbl = (head, rows) => `<div class="tablewrap" style="margin-top:8px"><table><thead><tr><th>${head}</th><th class="n">Giden</th><th class="n">Hata</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  return `${byLang.length ? tbl("Metin", byLang.map(([l, x]) => `<tr><td>${esc(PUSH_LANGS[l] || l)}</td><td class="n">${fmt(x.sent)}</td><td class="n">${fmt(x.failed)}</td></tr>`).join("")) : ""}
    ${byApp.length > 1 ? tbl("Uygulama", byApp.map(([a, x]) => `<tr><td>${appTag(a)}</td><td class="n">${fmt(x.sent)}</td><td class="n">${fmt(x.failed)}</td></tr>`).join("")) : ""}
    ${errs.length ? `<h3 style="font-size:14px;margin:14px 0 6px">Hatalar</h3><p class="muted" style="margin:0 0 6px">${errs.map(([k, n]) => `<code>${esc(k)}</code> ${fmt(n)}`).join(" · ")}. UNREGISTERED: uygulama silinmiş ya da adres eskimiş; adres kurulumdan silinir.</p>
      <div class="tablewrap"><table><tbody>${(p.failures || []).map(f => `<tr><td>${allInstalls.some(i => i.id === f.i) ? whoCell(allInstalls.find(i => i.id === f.i)) : `<code>${esc(shortId(f.i))}</code>`}</td><td>${esc(f.l)}</td><td class="muted wrap">${esc(f.e)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
}
function resultTable(results, validate) {
  if (!results?.length) return "";
  const who = a => APPS[a] ? appTag(a) : a === "all" ? "Hepsi (bs_all)" : a === "test" ? "Test (bs_test)" : esc(a);
  return `<div class="tablewrap"><table><thead><tr><th>Uygulama</th><th>Dil</th><th>Sonuç</th><th>Ayrıntı</th></tr></thead><tbody>${results.map(x => `<tr>
    <td>${who(x.app)}</td><td>${esc(PUSH_LANGS[x.lang] || x.lang)}</td>
    <td>${x.ok ? `<span class="pill ok">${validate ? "geçerli" : "gönderildi"}</span>` : `<span class="pill err">hata</span>`}</td>
    <td style="white-space:normal" class="muted">${x.ok ? `<code>${esc(String(x.id || "").split("/").pop())}</code>` : esc(x.error)}<br><code style="font-size:11px">${esc(x.condition)}</code></td></tr>`).join("")}</tbody></table></div>`;
}

// ---------- Gönderilenler ----------
const STATUS = { scheduled: ["Zamanlandı", "sky"], sending: ["Gönderiliyor", "warn"], sent: ["Gönderildi", "ok"], cancelled: ["İptal", "no"], failed: ["Hata", "err"] };
const pStatus = p => STATUS[p.status] ? p.status : "sent";      // eski kayıtlarda durum yok: gönderilmiş
const pPid = p => p.pid || p.id;
const pMode = p => p.test ? "test" : p.mode === "devices" ? "devices" : "topics";
const pCounts = p => p.counts || { targeted: (p.results || []).length, sent: +p.sent || 0, failed: (p.results || []).filter(x => !x.ok).length, removedTokens: 0 };
const pWhen = p => ts(p.sendAt && ["scheduled", "cancelled"].includes(pStatus(p)) ? p.sendAt : p.sentAt || p.startedAt || p.at);
const pTarget = p => p.summary || (p.test ? "Test cihazları (bs_test)" : p.apps?.length ? p.apps.map(appName).join(", ") : "Beş uygulamanın hepsi");
const statusPill = p => { const s = STATUS[pStatus(p)]; return `<span class="pill ${s[1]}">${s[0]}</span>`; };
const modePill = p => ({ test: '<span class="pill warn">Test</span>', devices: '<span class="pill sky">Kitle</span>', topics: '<span class="pill no">Konular</span>' })[pMode(p)];
async function loadPushes() {
  if (pushes && !pushes.err) { renderSent(); return; }
  pushes = { loading: true }; renderSent();
  if (DEMO) pushes = { list: demo.pushes };
  else {
    try {
      await fb();
      const snap = await F.getDocs(F.query(F.collection(db, "pushes"), F.orderBy("at", "desc"), F.limit(200)));
      pushes = { list: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (e) { pushes = { err: e.code || e.message }; }
  }
  renderSent();
  await loadOpenStats();
  renderSent();
}
/* Açılmalar günlük kayıtlardan: stats/{uygulama}_{gün}.ev.push_open_<kimlik>. En eski gönderimden bu yana (en fazla 120 gün). */
async function loadOpenStats() {
  const sent = (pushes?.list || []).filter(p => ["sent", "sending"].includes(pStatus(p)) && !p.test);
  if (!sent.length) { openStats = { from: "9999", docs: [] }; return; }
  const oldest = Math.min(...sent.map(p => (ts(p.sentAt || p.at) || new Date()).getTime()));
  const from = dayKey(Math.max(oldest, Date.now() - 120 * 864e5));
  if (openStats && openStats.from <= from) return;
  openStats = { loading: true, from, docs: openStats?.docs || [] };
  if (DEMO) openStats = { from, docs: demo.stats.filter(s => s.day >= from) };
  else {
    try {
      await fb();
      const snap = await F.getDocs(F.query(F.collection(db, "stats"), F.where("day", ">=", from)));
      openStats = { from, docs: snap.docs.map(d => { const x = d.data(); return { ...x, app: x.app || d.id.split("_")[0], day: x.day || d.id.slice(-10) }; }) };
    } catch (e) { openStats = { from: "9999", docs: [], err: e.code || e.message }; }
  }
}
function opensOf(p) {
  const k = `push_open_${pPid(p)}`, from = dayKey(ts(p.sentAt || p.startedAt || p.at) || Date.now());
  const byDay = {}, byApp = {};
  let n = 0;
  for (const s of openStats?.docs || []) if (s.day >= from) { const v = +(s.ev?.[k] || 0); if (v) { n += v; byDay[s.day] = (byDay[s.day] || 0) + v; byApp[s.app] = (byApp[s.app] || 0) + v; } }
  return { n, people: allInstalls.filter(i => ev(i, k) > 0).length, byDay, byApp, ready: !!openStats && !openStats.loading };
}
/* Açılma oranı: Kitle'de açılma / giden cihaz, Konular'da açılma / tahmini kitle (yaklaşık). */
function openRate(p, o) {
  if (pMode(p) === "devices") { const s = pCounts(p).sent; return s ? { txt: yuzde(o.n, s), approx: false } : null; }
  return p.estimate ? { txt: "~" + yuzde(o.n, p.estimate), approx: true } : null;
}
async function cancelPush(p) {
  if (!p) return;
  const t = p.texts?.tr || p.texts?.en || {};
  if (!await confirmCard({ title: "Zamanlanmış bildirim iptal edilsin mi?", rows: [["Zaman", esc(istText(pWhen(p).getTime()))], ["Kime", esc(pTarget(p))], ["Başlık", esc(t.title || "")]], yes: "İptal et", danger: true })) return;
  try {
    const out = await api("/cancel", { pid: pPid(p) });
    if (out.cancelled) { p.status = "cancelled"; p.cancelledAt = new Date(); toast("İptal edildi"); }
    else { toast(`İptal olmadı: durum artık "${STATUS[out.status]?.[0] || out.status}"`); pushes = null; await loadPushes(); }
    renderSent(); document.querySelectorAll(".drawer[data-cekmece]").forEach(z => z.remove());
  } catch (e) { toast("İptal olmadı: " + e.message); }
}
async function continuePush(p) {
  if (!p) return;
  try {
    let out = await api("/continue", { pid: pPid(p) }), guard = 0;
    toast("Devam ediyor…");
    while (out.status === "sending" && guard++ < 300) { await sleep(out.busy ? 3000 : 200); out = await api("/continue", { pid: pPid(p) }); }
    toast(out.status === "sent" ? "Gönderim tamamlandı" : `Durum: ${STATUS[out.status]?.[0] || out.status}`);
  } catch (e) { toast("Olmadı: " + e.message); }
  pushes = null; loadPushes();
}
// ---------- Demo Worker (hiçbir yere istek atmaz) ----------
const demoJobs = {};
async function demoApi(path, body) {
  await sleep(path === "/continue" ? 260 : 420);
  const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  const find = pid => demo.pushes.find(p => pPid(p) === pid);
  if (path === "/audience") return { ...audienceLocal(body.filter || {}), local: false };
  if (path === "/cancel") {
    const p = find(body.pid); if (!p) throw new Error("Böyle bir gönderim yok");
    if (p.status !== "scheduled") return { pid: body.pid, status: p.status, cancelled: false };
    Object.assign(p, { status: "cancelled", cancelledAt: new Date(), cancelledBy: ADMIN });
    return { pid: body.pid, status: "cancelled", cancelled: true };
  }
  if (path === "/continue") return demoChunk(body.pid);
  // /push
  const texts = body.texts, pid = hex(), base = { pid, at: new Date(), by: ADMIN, mode: body.mode, apps: body.apps || [], filter: body.filter || null, texts, tab: body.tab, test: !!body.test, estimate: body.estimate ?? null, summary: body.summary };
  if (body.mode !== "devices") {
    const jobs = topicJobsLocal(body.apps || [], texts, body.test);
    const results = jobs.map(j => ({ ...j, ok: true, id: `projects/bam-tech-sports/messages/${Math.floor(Math.random() * 1e15)}`, error: null }));
    const out = { pid, mode: "topics", sent: jobs.length, test: !!body.test, validate: !!body.validate, results, counts: { targeted: jobs.length, sent: jobs.length, failed: 0, removedTokens: 0 } };
    if (body.validate) return out;
    if (body.sendAt) { demo.pushes.unshift({ ...base, status: "scheduled", sendAt: new Date(body.sendAt) }); return { pid, status: "scheduled", sendAt: body.sendAt }; }
    demo.pushes.unshift({ ...base, status: "sent", sentAt: new Date(), sent: jobs.length, results, counts: out.counts });
    return { ...out, status: "sent" };
  }
  const targets = allInstalls.filter(i => reachOf(i) && (body.test ? i.tester : matchLocal(i, body.filter || {})));
  const tl = l => texts[lang2(l)] ? lang2(l) : "en";
  if (body.validate) {
    const byLang = countBy(targets, i => tl(i.language));
    const results = Object.keys(byLang).map(l => { const i = targets.find(x => tl(x.language) === l && !x.fcm.startsWith("dead")) || targets.find(x => tl(x.language) === l); return { app: i.app, lang: l, install: i.id, ok: true, deadTried: 0 }; });
    return { mode: "devices", validate: true, results, counts: { targeted: targets.length, sent: 0, failed: 0, removedTokens: 0 }, byLang, tooMany: targets.length > MAX_DEVICES };
  }
  if (!targets.length) throw new Error("Bu filtreye uyan, bildirim adresi olan cihaz yok");
  if (targets.length > MAX_DEVICES) throw new Error(`${targets.length} cihaz: tek gönderimde en fazla ${MAX_DEVICES}`);
  if (body.sendAt) { demo.pushes.unshift({ ...base, status: "scheduled", sendAt: new Date(body.sendAt) }); return { pid, status: "scheduled", sendAt: body.sendAt }; }
  const doc = { ...base, status: "sending", startedAt: new Date(), counts: { targeted: targets.length, sent: 0, failed: 0, removedTokens: 0 }, byLang: {}, byApp: {}, errors: {}, failures: [] };
  demo.pushes.unshift(doc);
  demoJobs[pid] = { items: targets.map(i => ({ i, l: tl(i.language) })), next: 0 };
  return demoChunk(pid);
}
function demoChunk(pid) {
  const p = demo.pushes.find(x => pPid(x) === pid), q = demoJobs[pid];
  if (!p || !q || p.status !== "sending") return { pid, mode: p?.mode, status: p?.status || "failed", counts: p?.counts };
  for (const it of q.items.slice(q.next, q.next + 40)) {
    const bl = p.byLang[it.l] ||= { sent: 0, failed: 0 }, ba = p.byApp[it.i.app] ||= { sent: 0, failed: 0 };
    if (it.i.fcm?.startsWith("dead")) {
      p.counts.failed++; bl.failed++; ba.failed++; p.errors.UNREGISTERED = (p.errors.UNREGISTERED || 0) + 1;
      p.failures.push({ i: it.i.id, l: it.l, a: it.i.app, e: "UNREGISTERED: Requested entity was not found." });
      delete it.i.fcm; p.counts.removedTokens++;
    } else { p.counts.sent++; bl.sent++; ba.sent++; }
  }
  q.next += 40;
  if (q.next >= q.items.length) { p.status = p.counts.sent ? "sent" : "failed"; p.sentAt = new Date(); p.sent = p.counts.sent; delete demoJobs[pid]; }
  return { pid, mode: "devices", status: p.status, counts: { ...p.counts }, byLang: p.byLang, byApp: p.byApp, errors: p.errors, failures: p.failures, remaining: Math.max(0, q.items.length - q.next), sent: p.counts.sent };
}

// ─── Bildirim sayfası, kabuğa bağlama ────────────────────────────────────
/* Form bir kez kurulur ve sayfa her çizildiğinde aynı öğe yeniden eklenir:
   yazılan metin, dönem ya da uygulama değişince kaybolmasın. */
const veriHazir = () => !!K;
let pushKok = null, bekleyenMod = null;
const installChip = x => `<span class="linkchip"><i style="background:${APPS[x.app]?.renk || "var(--soft)"}"></i>${esc(appName(x.app))} <code>${esc(shortId(x.id))}</code></span>`;
function pushAppSync() {
  pushApps = appF === "all" ? [] : [appF];
  aud.apps = appF === "all" ? [] : [appF];
}
function bildirim(c) {
  if (!pushKok) {
    pushKok = el("div");
    pushKok.innerHTML = PUSH_HTML;
    c.appendChild(pushKok);
    pushAppSync();
    initPushForm();
  } else c.appendChild(pushKok);
  if (bekleyenMod) { setMode(bekleyenMod); bekleyenMod = null; renderAudFilters(); setTimeout(() => $("pt_tr")?.focus(), 50); }
  renderPushApps(); if (pushMode === "devices") renderAudFilters();
  renderPushStats(); loadPushHealth(); loadTemplates(); pushRefresh();
}
function renderSent() { if (K?.sayfa === "gonderilenler") K.ciz(); }
const pApps = x => x.apps?.length ? x.apps : x.filter?.apps || [];
function gonderilenler(c) {
  c.appendChild(p("Panelden giden ve zamanlanan bildirimler (doğrulamalar hariç), Firestore <code>pushes</code> koleksiyonundan; kaydı Worker yazar. Açılma: bildirime dokunanlar, günlük kayıtlardaki <code>push_open_&lt;kimlik&gt;</code> sayacından. Kitle'de oran açılma / giden cihaz, Konular'da açılma / tahmini kitle (yaklaşık). Satıra dokununca metinler, hedef ve iş sonuçları açılır."));
  if (!pushes) { loadPushes(); c.appendChild(p("Yükleniyor...")); return; }
  if (pushes.loading) { c.appendChild(p("Yükleniyor...")); return; }
  if (pushes.err) { c.appendChild(notKutu("Okunamadı: " + esc(pushes.err), "err")); const b = el("button", "second", "Yeniden dene"); b.onclick = () => { pushes = null; K.ciz(); }; c.appendChild(b); return; }
  const all = (pushes.list || []).filter(x => appF === "all" || !pApps(x).length || pApps(x).includes(appF));
  const cnt = s => all.filter(x => pStatus(x) === s).length;
  const d = P();
  const real = all.filter(x => pStatus(x) === "sent" && pMode(x) !== "test" && inP(pWhen(x), d));
  const realO = d.oncekiBas != null ? all.filter(x => pStatus(x) === "sent" && pMode(x) !== "test" && inPrev(pWhen(x), d)) : null;
  const opens = real.reduce((t, x) => t + opensOf(x).n, 0);
  const dev = real.filter(x => pMode(x) === "devices"), devSent = dev.reduce((t, x) => t + pCounts(x).sent, 0), devOpen = dev.reduce((t, x) => t + opensOf(x).n, 0);
  const zam = all.filter(x => pStatus(x) === "scheduled").map(pWhen).sort((a, b) => a - b);
  c.appendChild(tiles([
    ["Gönderim", fmt(real.length), `${periodWord()}, test hariç`, realO ? fark(real.length, realO.length) : undefined],
    ["Açılma", openStats && !openStats.loading ? fmt(opens) : "...", "bildirime dokunan"],
    ["Kitle açılma oranı", devSent ? yuzde(devOpen, devSent) : "-", `${fmt(devOpen)} / ${fmt(devSent)} cihaz`],
    ["Giden cihaz", fmt(devSent), "Kitle modu"],
    ["Zamanlanmış", fmt(cnt("scheduled")), zam.length ? `ilki ${tarihTam(zam[0])}` : "bekleyen yok"],
    ["Hatalı", fmt(cnt("failed")), "tüm zamanlar"],
  ]));
  const bar = el("div", "bar2");
  const seg = el("div", "seg");
  for (const [k, ad, n] of [["all", "Hepsi", all.length], ["scheduled", "Zamanlandı", cnt("scheduled")], ["sending", "Gönderiliyor", cnt("sending")], ["sent", "Gönderildi", cnt("sent")], ["cancelled", "İptal", cnt("cancelled")], ["failed", "Hata", cnt("failed")]]) {
    if (k !== "all" && k !== "sent" && !n && sentF !== k) continue;
    const b = el("button", sentF === k ? "on" : "", `${ad} <small>${fmt(n)}</small>`); b.onclick = () => { sentF = k; K.ciz(); }; seg.appendChild(b);
  }
  const yb = el("button", "ghost", "Yenile"); yb.onclick = () => { pushes = null; openStats = null; K.ciz(); };
  bar.append(seg, yb); c.appendChild(bar);
  const list = all.filter(x => sentF === "all" || pStatus(x) === sentF);
  const modAd = x => ({ test: "Test", devices: "Kitle", topics: "Konular" })[pMode(x)];
  c.appendChild(veriTablo(["Zaman", { ad: "Durum", filtre: true }, { ad: "Mod", filtre: true }, "Hedef", "Başlık", { ad: "Giden", num: true }, { ad: "Açılma", num: true }, { ad: "Oran", num: true }, { ad: "", sirala: false }],
    list.map(x => { const t0 = x.texts?.tr || x.texts?.en || Object.values(x.texts || {})[0] || {}, cc = pCounts(x), st = pStatus(x), o = opensOf(x), r = openRate(x, o), gitti = st === "sent" || st === "sending";
      const act = st === "scheduled" ? dugme("İptal et", () => cancelPush(x)) : st === "sending" ? dugme("Devam ettir", () => continuePush(x)) : "";
      return [{ d: tarihTam(pWhen(x)) + (st === "scheduled" ? ` (${untilText(tms(pWhen(x)))})` : ""), s: tms(pWhen(x)) }, STATUS[st][0], modAd(x), pTarget(x), t0.title || "",
        gitti ? { d: pMode(x) === "topics" ? `${fmt(cc.sent)} / ${fmt(cc.targeted)} iş${x.estimate ? ` (~${fmt(x.estimate)} kurulum)` : ""}` : `${fmt(cc.sent)} / ${fmt(cc.targeted)}${cc.failed ? ` (${fmt(cc.failed)} hata)` : ""}`, s: cc.sent } : "-",
        gitti ? (o.ready ? { d: `${fmt(o.n)}${o.people ? ` (${fmt(o.people)} kişi)` : ""}`, s: o.n } : "...") : "-", gitti && r ? { d: r.txt, s: o.n / (pMode(x) === "devices" ? cc.sent || 1 : x.estimate || 1) } : "-", act]; }),
    { sirala: [0, "desc"], bos: all.length ? "Bu durumda kayıt yok." : "Henüz panelden bildirim gönderilmedi.", satirTik: (_, n) => openSent(list[n]) }));
  if (openStats && !openStats.loading && real.length) {
    const gun = {}; for (const x of real) for (const [k, v] of Object.entries(opensOf(x).byDay)) gun[k] = (gun[k] || 0) + v;
    grafikKart(c, "Günlük açılma (dönemdeki gönderimler)", k => gunlukCubuk(k, stats().map(s => ({ t: s.day, v: gun[s.day] || 0 })), { birim: "açılma" }), "UTC günü.");
  }
  if (openStats?.err) c.appendChild(notKutu("Açılma sayaçları okunamadı: " + esc(openStats.err), "err"));
}
function openSent(x) {
  if (!x) return;
  const cc = pCounts(x), st = pStatus(x), o = opensOf(x), r = openRate(x, o), f = x.filter;
  const t0 = x.texts?.tr || x.texts?.en || {};
  const filterTxt = f ? [f.installIds?.length ? `kurulum: ${f.installIds.map(shortId).join(", ")}` : "", f.apps?.length ? `uygulama: ${f.apps.map(appName).join(", ")}` : "",
    f.langs?.length ? `dil: ${f.langs.join(", ")}` : "", f.pro && f.pro !== "any" ? (f.pro === "pro" ? "Pro" : "ücretsiz") : "", f.activeWithinDays ? `son ${f.activeWithinDays} günde açan` : "",
    f.inactiveForDays ? `${f.inactiveForDays} gündür açmayan` : "", typeof f.signedIn === "boolean" ? (f.signedIn ? "girişli" : "girişsiz") : ""].filter(Boolean).join(" · ") || "filtre yok (hepsi)" : "";
  const ey = [{ ad: "Yeni taslak olarak kopyala", ikincil: true, tik: kapat => { kapat(); loadDraft({ mode: pMode(x) === "devices" || x.mode === "devices" ? "devices" : "topics", apps: x.apps || [], filter: x.filter, texts: x.texts, tab: x.tab }); setWhen("now"); K.git("bildirim"); toast("Taslak yüklendi: kontrol et, Doğrula, Gönder."); } }];
  if (st === "scheduled") ey.push({ ad: "İptal et", tik: () => cancelPush(x) });
  if (st === "sending") ey.push({ ad: "Devam ettir", ikincil: true, tik: () => continuePush(x) });
  kullaniciCekmecesi(x, [
    ["Durum", `${STATUS[st][0]} · ${({ test: "Test cihazları", devices: "Kitle (cihaz cihaz)", topics: "Konular" })[pMode(x)]}`],
    ["Kimlik", pPid(x)], ["Oluşturuldu", `${tt(x.at)}${x.by ? ` · ${x.by}` : ""}`],
    ...(x.sendAt ? [["Zamanlanan", `${istText(tms(x.sendAt))} (Türkiye)${st === "scheduled" ? ` · ${untilText(tms(x.sendAt))}` : ""}`]] : []),
    ...(x.sentAt ? [["Gönderildi", tt(x.sentAt)]] : []),
    ...(x.cancelledAt ? [["İptal", `${tt(x.cancelledAt)}${x.cancelledBy ? ` · ${x.cancelledBy}` : ""}`]] : []),
    ["Kime", pTarget(x)], ...(f ? [["Filtre", filterTxt]] : []),
    ["Sekme", x.tab ? PUSH_TABS[x.tab] || x.tab : "Uygulama açılır"],
    ...(x.estimate ? [["Tahmini kitle", `~${fmt(x.estimate)} kurulum (gönderim anında izin veren)`]] : []),
    ...(st !== "scheduled" && st !== "cancelled" ? [["Giden", pMode(x) === "topics" ? `${fmt(cc.sent)} / ${fmt(cc.targeted)} FCM işi` : `${fmt(cc.sent)} / ${fmt(cc.targeted)} cihaz${cc.failed ? ` · ${fmt(cc.failed)} hata` : ""}${cc.removedTokens ? ` · ${fmt(cc.removedTokens)} ölü adres silindi` : ""}`],
      ["Açılma", `${fmt(o.n)}${r ? ` · oran ${r.txt}${r.approx ? " (tahmini kitleye göre)" : ""}` : ""} · ${fmt(o.people)} kişi`],
      ["Açılma, uygulamaya göre", Object.entries(o.byApp).map(([a, n]) => `${appName(a)} ${fmt(n)}`).join(" · ") || "-"]] : []),
    ...(x.error ? [["Hata", x.error]] : []),
    { baslik: "Metinler" },
    ...Object.entries(x.texts || {}).map(([l, t]) => [PUSH_LANGS[l] || l, `${t.title}\n${t.body}`]),
  ], {
    baslik: t0.title || "Bildirim", alt: t0.body || "", eylemler: ey,
    ek: k => {
      if (Object.keys(o.byDay).length) { k.appendChild(el("h2", null, "Açılma, güne göre (UTC)")); const g = el("div"); k.appendChild(g); gunlukCubuk(g, Object.entries(o.byDay).sort((a, b) => a[0].localeCompare(b[0])).map(([t, v]) => ({ t, v })), { birim: "açılma" }); }
      if (st !== "scheduled" && st !== "cancelled") { k.appendChild(el("h2", null, "Sonuçlar")); const g = el("div"); g.innerHTML = pMode(x) === "topics" || x.results?.length ? resultTable(x.results, false) : deviceDetail(x); k.appendChild(g); }
    },
  });
}

// ─── Ayarlar ─────────────────────────────────────────────────────────────
function ayarlar(c) {
  c.appendChild(kart("Oturum", p(DEMO ? "Demo modu: giriş yok, veri sahte. Adresten <code>?demo</code>'yu kaldırınca gerçek veri." : `Giriş: ${esc(K.kullanici?.email || "-")} (yalnız Google; kurallar doğrulanmış ${ADMIN} adresine okuma veriyor).`)));
  c.appendChild(kart("Bildirim altyapısı", p(`Gönderim Cloudflare Worker'dan geçer (<code>bam-sports-push</code>, kaynak <code>All Sport Apps/push-worker</code>): servis hesabı anahtarı orada durur, panel yalnız giriş kimliğini yollar. FCM HTTP v1 ücretsiz planda çalışır, Blaze gerekmez. Konular: <code>bs_all</code>, <code>bs_&lt;uygulama&gt;</code>, <code>bs_lang_xx</code>, <code>bs_test</code>.`),
    p("<b>Kitle</b> modunda Worker kurulumları servis hesabıyla okur (uygulama, dil, Pass, son görülme, giriş, <code>fcm</code>, <code>notif</code>) ve her cihaza ayrı mesaj atar; tek seferde en fazla 2.000 cihaz. Ücretsiz planda bir çağrı en fazla 50 dış istek yapabildiği için 40'arlı dilimlerle gider: panel dilimleri sırayla ister, panel kapanırsa Worker'ın beş dakikalık zamanlayıcısı kalanı sürdürür. Ölü adresler (UNREGISTERED) kurulumdan silinir. <b>Zamanla</b> ile gönderim <code>pushes</code> koleksiyonuna yazılır, aynı zamanlayıcı vakti gelince yollar. Şablonlar <code>pushTemplates</code> koleksiyonunda.")));
  const lk = el("div", "links");
  lk.innerHTML = [["overview", "Firebase konsolu"], ["firestore/databases/-default-/data", "Firestore verisi"], ["firestore/databases/-default-/rules", "Firestore kuralları"], ["analytics", "Firebase Analytics"], ["crashlytics", "Crashlytics"],
    ["authentication/users", "Authentication (sosyal hesaplar)"], ["settings/cloudmessaging", "Cloud Messaging (APNs anahtarları)"], ["usage/details", "Plan ve kullanım"]]
    .map(([y, ad]) => `<a href="https://console.firebase.google.com/project/bam-tech-sports/${y}" target="_blank" rel="noopener">${ad}</a>`).join("")
    + `<a href="https://dash.cloudflare.com/" target="_blank" rel="noopener">Cloudflare (bam-sports-push Worker)</a><a href="https://appstoreconnect.apple.com/apps" target="_blank" rel="noopener">App Store Connect</a><a href="https://play.google.com/console" target="_blank" rel="noopener">Play Console (com.aberk.wear)</a>`;
  c.appendChild(kart("Bağlantılar", lk));
  c.appendChild(kart("Veri nasıl toplanıyor",
    p("Beş uygulama (Tenis Padel, Pickleball, Voleybol, Rally: Badminton, Rally: Masa Tenisi) tek Firebase projesine (<code>bam-tech-sports</code>) yazar; <code>app</code> alanı onları ayırır, <code>platform</code> iOS ile Android'i (Android yalnız Tenis 2.0). Her kurulum rastgele bir kimlikle kendi kaydını yazar (<code>installs/{id}</code>): ilk ve son görülme, sürüm, dil, bölge, saat dilimi, cihaz, işletim sistemi, Pass durumu, planı, kaynağı ve tarihi, eski kullanıcı hakkı, saat eşli mi, giriş yapmış mı (uid, kullanıcı adı), bildirim izni ve adresi, test cihazı mı, şu anki ve son ekran, defterdeki maç ve rakip sayısı. Ne yaptığı sayaç olarak (<code>ev</code>) ve zaman çizelgesi olarak (<code>events</code>) tutulur. Günlük toplamlar uygulama başına <code>stats/{uygulama}_{gün}</code> belgesinde (UTC).", ""),
    p("<b>İsim, skor, rakip adı, fotoğraf telemetriye hiç girmez.</b> Yalnız sayı, ekran adı ve süre. Geliştirme sürümleri ve ekran görüntüsü modu hiçbir şey yazmaz.", ""),
    p("Analytics bölümü Mac'teki günlük işin (<code>scripts/lab/bam-sports.mjs</code>, <code>gunluk.sh</code> içinde) <code>panel/ga4</code> belgesine yazdığı özetten, mağaza parası <code>panel/sales</code> (<code>panel-yaz.mjs</code>) ve <code>panel/magaza</code>'dan (<code>bam-sports.mjs</code>: platform ayrımı, kur, Pass fiyatları).", ""),
    p("Blaze planı olmadığı için olay belgelerinin 90 günlük silinmesi (TTL) çalışmıyor; <code>x</code> alanı yazılıyor, plan açılınca politika devreye girer.")));
  c.appendChild(kart("Moderasyon sınırları (kurallar)", p("Yönetici: gönderi, yorum, beğeni silebilir; rapor okuyup kapatabilir; herhangi bir ligi silebilir; resmi hesap adına gönderi ve lig yazabilir. Yapamaz: gönderiyi gizlemek (alan yok), kullanıcı profilini ya da takibi silmek, fikstür silmek, engelleme listelerini ve iki telefonlu canlı maçları okumak (kural eklenmesi gerekir).")));
  c.appendChild(kart("Demo", p("Adrese <code>?demo</code> eklersen panel sahte veriyle açılır, Firestore'a ve Worker'a hiç bağlanmaz. Tasarım denemek için.")));
}
function makeDemo() {
  let seed = 23;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const r = (a, b) => Math.floor(a + rnd() * (b - a));
  const now = Date.now(), statsMap = {}, events = {}, list = [];
  const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
  const APPW = ["tennis", "tennis", "tennis", "tennis", "tennis", "pickleball", "pickleball", "tabletennis", "badminton", "volleyball"];
  const SUFFIX = { tennis: "_tennis", pickleball: "_pickle", volleyball: "_volley", badminton: "_badminton", tabletennis: "_tabletennis" };
  const TOURS = ["logbook", "setup", "profile", "friends", "courts"];
  const SCR = ["home", "home", "logbook", "logbook", "setup", "setup", "community", "match_detail", "academy", "courts", "profile", "friends", "leagues", "stats", "notifications"];
  const PW = ["quota", "quota", "home_banner", "banner", "profile_banner", "profile", "setup", "league_create"];
  const langs = ["en", "en", "en", "en", "tr", "de", "es", "fr", "it", "nl"];
  const regionOf = { en: ["US", "GB", "AU", "CA"], tr: ["TR"], de: ["DE", "AT"], es: ["ES", "MX"], fr: ["FR"], it: ["IT"], nl: ["NL"] };
  const tzOf = { US: "America/New_York", GB: "Europe/London", AU: "Australia/Sydney", CA: "America/Toronto", TR: "Europe/Istanbul", DE: "Europe/Berlin", AT: "Europe/Vienna", ES: "Europe/Madrid", MX: "America/Mexico_City", FR: "Europe/Paris", IT: "Europe/Rome", NL: "Europe/Amsterdam" };
  for (let n = 0; n < 160; n++) {
    const app = APPW[n % APPW.length];
    const id = Array.from({ length: 4 }, () => Math.floor(rnd() * 0xffffffff).toString(16).padStart(8, "0").toUpperCase()).join("-");
    const lang = pick(langs), region = pick(regionOf[lang]);
    const first = now - 30 * 6e4 - Math.pow(rnd(), 1.3) * 115 * 864e5;
    const android = app === "tennis" && n % 4 === 1;
    const paired = rnd() < .62;
    const inst = { id, app, platform: android ? "android" : "ios", appVersion: android ? "2.0.0" : pick(["2.0", "2.0", "2.0", "1.9"]), build: android ? "204" : pick(["12", "12", "11", "9"]), language: lang, region, tz: tzOf[region],
      device: android ? pick(["Pixel 8", "SM-S921B", "Pixel 7a"]) : pick(["iPhone16,1", "iPhone15,2", "iPhone17,3", "iPhone14,7", "iPhone16,2"]), os: android ? pick(["15", "14"]) : pick(["26.0", "26.0.1", "18.6.2"]),
      pro: false, grandfathered: false, watchPaired: paired, watchApp: paired && rnd() < .8, signedIn: rnd() < .22, tester: n < 3, ev: {}, firstSeen: new Date(first) };
    Object.keys(COUNTERS).forEach(k => inst[k] = 0);
    const evs = [];
    const st = t => statsMap[app + "_" + dayKey(t)] ||= { app, day: dayKey(t), ev: {} };
    const rec = (t, name, p, s) => {
      for (const o of [inst, st(t)]) { bump(o.ev, name); if (p) bump(o.ev, `${name}_${p}`); if (s > 0) { bump(o.ev, `${name}_sec`, s); if (p) bump(o.ev, `${name}_${p}_sec`, s); } }
      evs.push({ t: new Date(t), e: name, ...(p ? { p } : {}), ...(s != null ? { s } : {}) });
    };
    const cnt = (t, k, v = 1) => { bump(inst, k, v); bump(st(t), k, v); };
    cnt(first, "installs_new");
    if (rnd() < .7) { const tr = pick(TOURS); rec(first + 4e3, "coach_start", tr); rec(first + 40e3, rnd() < .7 ? "coach_done" : "coach_skip", tr); }
    rec(first + 9e3, "push_permission", pick(["granted", "granted", "denied", "not_now"]));
    if (rnd() < .3) rec(first + 12e3, "app_language", pick(["system", "system", "en", "tr", "de"]));
    if (rnd() < .2) rec(first + 15e3, "app_theme", pick(["system", "dark", "light"]));
    if (n % 31 === 5) rec(first + 20e3, "push_topic_fail", "the_operation_couldn_t_be_completed");
    const online = n >= 3 && n < 9, sessions = online ? r(2, 8) : 1 + Math.floor(rnd() * rnd() * 26);
    let t = first, lastScreen = "logbook";
    for (let si = 0; si < sessions && t < now; si++) {
      const start = t; cnt(t, "sessions");
      if (si === 0 && inst.signedIn && rnd() < .5) rec(t + 5e3, "signin", pick(["apple", "apple", "google"]));
      const screensN = r(2, 6);
      for (let k = 0; k < screensN; k++) {
        const sc = pick(SCR); lastScreen = sc; rec(t, "screen", sc);
        const dur = Math.round(4 + Math.pow(rnd(), 2) * 240);
        if (sc === "setup" && rnd() < .5) rec(t + 3e3, "match_setup", app === "tennis" ? pick(["tennis", "padel"]) : app);
        if (sc === "setup" && rnd() < .35) rec(t + 5e3, "phone_match_start", app === "tennis" ? pick(["tennis___bo3", "padel___bo3___hyb_2_"]) : "bo3___11pts_rally");
        if (sc === "match_detail" && rnd() < .3) rec(t + 2e3, pick(["rematch", "rivalry_open", "stats_detail_open", "full_screen_board"]));
        if (rnd() < .01) rec(t + 1e3, "app_exception");
        if (sc === "setup" && rnd() < .55 && paired) {
          rec(t + dur * 500, "match_sent", app); cnt(t, "matches_sent");
          if (rnd() < .8) { const md = r(25, 110) * 60, tt = t + dur * 1000 + md * 1000; cnt(tt, "matches_completed"); rec(tt, "match_done", pick(["win", "win", "loss", "loss", "practice"]), md); }
        }
        if (sc === "logbook" && rnd() < .12) { rec(t + dur * 500, "share", pick(["story", "story", "save", "copy", "more", "qr"])); cnt(t, "shares"); }
        if (sc === "courts") rec(t + 2e3, "courts", String(r(0, 25)));
        if ((sc === "friends" || sc === "league") && inst.signedIn && rnd() < .5) rec(t + dur * 400, "social", pick(["follow", "follow", "share_result", "league_join", "league_create", "league_result"]));
        if (rnd() < .05) cnt(t, "ads_watched");
        t += dur * 1000; bump(inst.ev, `screen_${sc}_sec`, dur); bump(st(t).ev, `screen_${sc}_sec`, dur); rec(t, "screen_time", sc, dur);
      }
      if (!inst.pro && (rnd() < .3 || (si > 2 && rnd() < .3))) {
        const src = pick(PW), dur = Math.round(3 + rnd() * 60);
        rec(t, "pw_view", src); cnt(t, "paywall_views");
        t += dur * 1000;
        if (rnd() < .3) rec(t - 2e3, "purchase_started", src);
        if (rnd() < .1) {
          rec(t, "pw_buy", src, dur); cnt(t, "purchases");
          const planApp = rnd() < .8 ? app : pick(APP_KEYS);
          Object.assign(inst, { pro: true, plan: `bamtech_allsports_${pick(["yearly", "yearly", "monthly", "lifetime"])}${SUFFIX[planApp]}`, buySource: src, purchasedAt: new Date(t) });
          t += 2000; rec(t, "pw_close_bought", src, dur + 2);
        } else rec(t, "pw_close", src, dur);
      }
      const len = Math.round((t - start) / 1000); rec(t, "session", null, len);
      if (si < sessions - 1) t += online && si === sessions - 2 ? 0 : (0.5 + rnd() * 70) * 36e5;
    }
    if (n % 23 === 7 && !inst.pro) Object.assign(inst, { pro: true, grandfathered: true, plan: "" });
    if (n === 11) Object.assign(inst, { pro: true, plan: "offer_code", buySource: "offer_code", purchasedAt: new Date(now - 4 * 864e5) });
    if (online) {
      t = now - rnd() * 100e3; inst.lastSeen = new Date(t); inst.screen = rnd() < .2 ? "paywall" : pick(SCR);
    } else { inst.lastSeen = new Date(Math.min(t, now - 5 * 6e4)); inst.screen = "closed"; inst.lastScreen = lastScreen; }
    inst.notif = n % 9 === 4 ? undefined : (n * 7 + Math.floor(n / 10)) % 10 < 6;
    if (inst.notif === undefined) delete inst.notif;
    inst.n_matches = inst.matches_completed + (rnd() < .3 ? r(0, 40) : 0);
    inst.n_opponents = inst.n_matches ? r(1, Math.min(12, inst.n_matches + 1)) : 0;
    events[id] = evs.sort((a, b) => b.t - a.t);
    list.push(inst);
  }
  // Bildirim adresi: izin verenlerin çoğunda; birkaçı ölü (Kitle gönderiminde UNREGISTERED döner, silinir).
  list.forEach((inst, n) => {
    if (n < 3) inst.notif = true;
    if ((inst.notif === true && (n < 3 || rnd() < .86)) || (inst.notif === false && rnd() < .25))
      inst.fcm = (n % 23 === 13 ? "dead_" : "demo_") + "fcm".repeat(10) + inst.id.slice(0, 8);
  });
  // Sosyal katman: giriş yapanlara hesap, bazısı iki uygulamada aynı hesap.
  const HANDLES = ["deniz.k", "matchpoint", "ace_ali", "lena_spin", "volley.ece", "baseline_bob", "smash.sam", "drop_shot", "tiebreak.tom", "rally_rita", "kort.kral", "net.ninja",
    "spin.doctor", "padel_pia", "love_all", "mert.serve", "dinks.only", "kitchen_kim", "shuttle.sun", "pingpong.pao", "test.user", "elif.ace", "sena.set", "can.lob", "jo_volley", "max.power", "nora_net", "omer.ok"];
  const NAMES = ["Deniz Kaya", "Lucas M.", "Ali Yıldız", "Lena", "Ece", "Bob Turner", "Sam", "Mia Rossi", "Tom", "Rita", "Kerem", "Yuki", "Dr. Spin", "Pia", "Chloé", "Mert", "Dana", "Kim", "Sunny", "Pao", "Test", "Elif", "Sena", "Can", "Jo", "Max", "Nora", "Ömer"];
  const signedL = list.filter(i => i.signedIn), users = [];
  signedL.forEach((inst, k) => {
    if (k % 6 === 5 && users.length) { const u = users[users.length - 1]; inst.uid = u.id; if (!u.sports.includes(inst.app)) u.sports.push(inst.app); }
    else {
      const u = { id: "uid" + (1000 + k) + "x" + inst.id.slice(0, 6), handle: HANDLES[users.length % HANDLES.length] + (users.length >= HANDLES.length ? users.length : ""), displayName: NAMES[users.length % NAMES.length],
        sports: [inst.app], level: pick(["", "", "Başlangıç", "Orta", "İleri"]), createdAt: new Date(tms(inst.firstSeen) + r(1, 5) * 36e5) };
      users.push(u); inst.uid = u.id;
    }
    inst.handle = users.find(u => u.id === inst.uid).handle;
  });
  const follows = [];
  for (const u of users) for (let k = 0; k < r(0, 6); k++) { const o = pick(users); if (o !== u && !follows.some(f => f.follower === u.id && f.followee === o.id)) follows.push({ id: `${u.id}_${o.id}`, follower: u.id, followee: o.id, createdAt: new Date(now - r(1, 40) * 864e5) }); }
  const LNAMES = ["Salı Akşamı Ligi", "Moda Kort Kulübü", "Office Smash", "Sunday Doubles", "Kadıköy Pickle", "Ping Pong Masters"];
  const LSPORT = ["tennis", "tennis", "volleyball", "tennis", "pickleball", "tabletennis"];
  const LPLACE = [["İstanbul", "TR"], ["İstanbul", "TR"], ["London", "GB"], ["Berlin", "DE"], ["İzmir", "TR"], ["Amsterdam", "NL"]];
  const leagues = LNAMES.map((name, k) => { const owner = users[(k * 5) % users.length]; const sport = LSPORT[k];
    const members = [owner.id, ...users.filter(u => u !== owner && rnd() < .3).map(u => u.id)].slice(0, 9);
    if (members.length < 3) members.push(...users.filter(u => !members.includes(u.id)).slice(0, 3 - members.length).map(u => u.id));
    return { id: "lg" + k, name, sport, ownerUid: owner.id, ownerName: owner.displayName, members, memberNames: Object.fromEntries(members.map(id => [id, users.find(u => u.id === id)?.displayName || ""])),
      visibility: k % 3 === 1 ? "private" : "public", city: LPLACE[k][0], country: LPLACE[k][1], season: k % 2 ? "Sonbahar 2026" : "Fall 2026",
      format: sport === "volleyball" || k === 3 ? "doubles" : "singles", status: k === 5 ? "setup" : "active", rulesText: "1 set · 6-6'da tiebreak",
      inviteCode: Array.from({ length: 6 }, () => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[r(0, 31)]).join(""), createdAt: new Date(now - (k === 4 ? 3 : r(9, 60)) * 864e5) }; });
  APP_KEYS.forEach(a => leagues.push({ id: "w_" + a, name: `${{ tennis: "Tennis & Padel", pickleball: "Pickleball", volleyball: "Volleyball", badminton: "Badminton", tabletennis: "Table Tennis" }[a]} World Ladder`, sport: a,
    ownerUid: "official_" + a, ownerName: OFFICIAL[a].name, members: users.filter(u => u.sports.includes(a) && !u.id.startsWith("official_")).slice(0, 4).map(u => u.id), memberNames: {}, visibility: "public", open: true, official: true,
    season: "Season 2026", status: "active", format: "singles", rulesText: "", inviteCode: "W" + a.slice(0, 5).toUpperCase(), createdAt: new Date(now - 864e5) }));
  // Fikstürler: kurulumdaki lig hariç, haftalara dağılmış, her durumdan.
  const fixtures = [], FST = ["approved", "approved", "approved", "confirmed", "submitted", "scheduled", "scheduled", "correction", "proposed"];
  leagues.filter(l => l.status === "active").forEach(l => {
    let fid = 0;
    for (let w = 1; w <= 4; w++) for (let k = 0; k + 1 < l.members.length && k < 4; k += 2) {
      const a = l.members[k], b = l.members[k + 1], st = w <= 2 ? (rnd() < .8 ? "approved" : pick(FST)) : pick(FST);
      const made = tms(l.createdAt) + w * 3 * 864e5, at = Math.min(now - 12 * 36e5, made + r(1, 5) * 864e5);
      const res = st === "scheduled" ? null : (() => { const ga = r(3, 7), gb = r(0, 6); return { sets: `${ga}-${gb}, ${r(4, 7)}-${r(0, 5)}`, setsA: 2, setsB: 0, winner: "A", source: "phone" }; })();
      const hist = st === "scheduled" ? [] : [{ action: st === "proposed" ? "proposed" : "submitted", by: a, at: new Date(at), reason: "" }];
      if (["confirmed", "approved"].includes(st)) hist.push({ action: "confirmed", by: b, at: new Date(at + 4 * 36e5), reason: "" });
      if (st === "approved") hist.push({ action: "approved", by: l.ownerUid, at: new Date(Math.min(now - 6e4, at + 9 * 36e5)), reason: "" });
      if (st === "correction") hist.push({ action: "correction", by: l.ownerUid, at: new Date(at + 6 * 36e5), reason: "Skor eksik" });
      fixtures.push({ id: `${l.id}f${fid++}`, leagueId: l.id, week: w, sideA: a, sideB: b, sideAMembers: [a], sideBMembers: [b],
        sideAName: l.memberNames[a], sideBName: l.memberNames[b], status: st, result: res, history: hist, createdAt: new Date(made) });
    }
  });
  const lReq = [], lInv = [];
  leagues.forEach((l, k) => {
    const outs = users.filter(u => !l.members.includes(u.id));
    if (k % 2 === 0 && outs[k]) lReq.push({ id: `${l.id}_${outs[k].id}`, leagueId: l.id, leagueName: l.name, uid: outs[k].id, name: outs[k].displayName, handle: outs[k].handle, ownerUid: l.ownerUid, createdAt: new Date(now - r(1, 40) * 36e5) });
    if (k % 3 !== 2 && outs[k + 2]) lInv.push({ id: `${l.id}_${outs[k + 2].id}`, leagueId: l.id, leagueName: l.name, uid: outs[k + 2].id, name: outs[k + 2].displayName, handle: outs[k + 2].handle, fromUid: l.ownerUid, fromName: l.ownerName, createdAt: new Date(now - r(1, 70) * 36e5) });
  });
  // Gönderi, yorum, beğeni, takip isteği, bildirim kutusu: bir kısmı bugün.
  const recent = () => new Date(now - Math.pow(rnd(), 2) * 6 * 864e5);
  const CAPS = ["", "", "Great rally today!", "Finally won the tiebreak 💪", "Sunday doubles with the crew", "New racket, new me", "Close one, rematch next week"];
  const posts = Array.from({ length: 18 }, (_, k) => { const a = pick(users), b = pick(users); const withMatch = k % 3 !== 2;
    return { id: "p" + k, authorUid: a.id, authorHandle: a.handle, authorName: a.displayName, sport: a.sports[0], audience: k % 4 ? "public" : "followers", allowed: [a.id], caption: pick(CAPS),
      place: k % 5 === 0 ? "Moda Tenis Kulübü" : undefined, hasPhoto: k % 6 === 1, likeCount: r(0, 6), commentCount: r(0, 3), showDetails: withMatch,
      match: withMatch ? { title: `${a.displayName} × ${b.displayName}`, sets: `6-${r(0, 5)} · 6-${r(0, 5)}`, score: "2-0", won: rnd() < .6 } : undefined, createdAt: recent() }; });
  // Resmi hesaplar, birer gönderi ve dünya ligi.
  APP_KEYS.forEach((a, k) => {
    const uid = "official_" + a, o = OFFICIAL[a];
    users.push({ id: uid, handle: o.handle, displayName: o.name, sports: [a], bio: "Official account", private: false, createdAt: new Date(now - 864e5) });
    if (k < 2) posts.push({ id: "po" + k, authorUid: uid, authorHandle: o.handle, authorName: o.name, sport: a, audience: "public", allowed: [uid], caption: "Season 2026 is on. Join the World Ladder from the Leagues tab.", likeCount: r(2, 9), commentCount: r(0, 3), hasPhoto: false, showDetails: false, createdAt: new Date(now - (k + 1) * 5 * 36e5) });
  });
  const CTXT = ["Great match!", "Rematch next week?", "Nice tiebreak 👏", "Which court was this?", "Harika maç", "Well played", "Congrats!"];
  const comments = posts.flatMap(p => Array.from({ length: r(0, 3) }, (_, k) => { const u = pick(users); return { id: p.id + "c" + k, path: `posts/${p.id}/comments/${p.id}c${k}`, postId: p.id, uid: u.id, handle: u.handle, name: u.displayName, text: pick(CTXT), createdAt: new Date(Math.min(now, tms(p.createdAt) + r(1, 30) * 36e5)) }; }));
  posts.forEach(p => { p.commentCount = comments.filter(c => c.postId === p.id).length; });
  const likes = posts.flatMap(p => Array.from({ length: r(0, 6) }, (_, k) => ({ id: p.id + "l" + k, path: `posts/${p.id}/likes/${p.id}l${k}`, createdAt: new Date(Math.min(now, tms(p.createdAt) + r(1, 20) * 36e5)) })));
  const followRequests = users.slice(0, 4).filter((u, k) => users[k + 5]).map((u, k) => ({ id: `${u.id}_${users[k + 5].id}`, from: u.id, to: users[k + 5].id, createdAt: recent() }));
  const NTYPES = ["like", "comment", "follow", "leagueResult", "leagueInvite", "leagueRequest"];
  const notifItems = Array.from({ length: 40 }, (_, k) => { const at = recent(); return { id: "n" + k, path: `notifications/${pick(users).id}/items/n${k}`, type: pick(NTYPES), fromUid: pick(users).id, createdAt: at, pushed: rnd() < .7 }; });
  const matches = Array.from({ length: 26 }, (_, k) => { const a = pick(users), b = pick(users.filter(u => u !== a)) || a; const played = now - r(0, 45) * 864e5 - r(0, 20) * 36e5;
    return { id: "m" + k, sport: a.sports[0], createdBy: a.id, players: [a.id, b.id], status: k % 5 === 0 ? "pending" : k % 13 === 7 ? "disputed" : "confirmed", winner: pick([a.id, b.id]), playedAt: new Date(played), createdAt: new Date(played + 36e5) }; });
  // Gönderilenler: her durumdan biri; açılmalar günlük kayıtlara ve kurulumlara işlenir.
  const okRes = (app, lang, cond) => ({ app, lang, condition: cond || `'bs_${app}' in topics`, ok: true, id: "projects/bam-tech-sports/messages/" + Math.floor(rnd() * 1e15), error: null });
  const T1 = { tr: { title: "Hafta sonu maç var mı? 🎾", body: "Maçını saatten tut, skor ve süre deftere kendiliğinden yazılsın." }, en: { title: "Playing this weekend? 🎾", body: "Keep score on your watch and the logbook fills itself." } };
  const T2 = { tr: { title: "Seni özledik 👋", body: "Son maçından beri bir süre geçti. Bu hafta bir maç kaydet, serin bozulmasın." }, en: { title: "We miss you 👋", body: "It has been a while since your last match. Log one this week and keep your streak going." } };
  const T3 = { en: { title: "Find a court near you", body: "The courts map now shows pickleball courts around you." } };
  const T4 = { tr: { title: "Lig tablosu güncellendi 🏆", body: "Salı Akşamı Ligi'nde sıralama değişti. Kimin önde olduğuna bak." }, en: { title: "League table updated 🏆", body: "Standings moved in your league. See who is on top." } };
  const demoPushes = [
    { pid: "c0ffee01", at: new Date(now - 3 * 36e5), sendAt: new Date(Math.ceil((now + 20 * 36e5) / 36e5) * 36e5), status: "scheduled", mode: "topics", apps: [], tab: "logbook", by: ADMIN, texts: T1, summary: "Beş uygulamanın hepsi", estimate: 61 },
    { pid: "a1b2c3d4", at: new Date(now - 2 * 864e5), sentAt: new Date(now - 2 * 864e5), status: "sent", mode: "topics", apps: [], tab: "logbook", test: false, sent: 2, by: ADMIN, estimate: 58, summary: "Beş uygulamanın hepsi",
      texts: T1, results: [okRes("all", "tr", "'bs_all' in topics && 'bs_lang_tr' in topics"), okRes("all", "en", "'bs_all' in topics && !('bs_lang_tr' in topics)")], counts: { targeted: 2, sent: 2, failed: 0, removedTokens: 0 } },
    { pid: "9f8e7d6c", at: new Date(now - 2 * 864e5 - 30 * 6e4), sentAt: new Date(now - 2 * 864e5 - 30 * 6e4), status: "sent", mode: "topics", apps: [], tab: "logbook", test: true, sent: 1, by: ADMIN, summary: "Test cihazları (bs_test)",
      texts: T1, results: [okRes("test", "tr", "'bs_test' in topics")], counts: { targeted: 1, sent: 1, failed: 0, removedTokens: 0 } },
    { pid: "b7e1d2aa", at: new Date(now - 5 * 864e5), sentAt: new Date(now - 5 * 864e5), status: "sent", mode: "devices", test: false, by: ADMIN, tab: "setup", texts: T2,
      filter: { apps: [], langs: [], pro: "free", inactiveForDays: 14 }, summary: "Tüm uygulamalar · ücretsiz · 14 gündür açmayan",
      counts: { targeted: 23, sent: 22, failed: 1, removedTokens: 1 }, byLang: { en: { sent: 15, failed: 1 }, tr: { sent: 7, failed: 0 } }, byApp: { tennis: { sent: 12, failed: 1 }, pickleball: { sent: 6, failed: 0 }, tabletennis: { sent: 4, failed: 0 } },
      errors: { UNREGISTERED: 1 }, failures: [{ i: list[13].id, l: "en", a: list[13].app, e: "UNREGISTERED: Requested entity was not found." }] },
    { pid: "5e4d3c2b", at: new Date(now - 9 * 864e5), sentAt: new Date(now - 9 * 864e5), status: "sent", mode: "topics", apps: ["pickleball"], tab: "courts", test: false, sent: 1, by: ADMIN, estimate: 14, summary: "Pickleball",
      texts: T3, results: [okRes("pickleball", "en")], counts: { targeted: 1, sent: 1, failed: 0, removedTokens: 0 } },
    { pid: "d00dfeed", at: new Date(now - 11 * 864e5), sendAt: new Date(now - 10 * 864e5), status: "cancelled", cancelledAt: new Date(now - 10.5 * 864e5), cancelledBy: ADMIN, mode: "devices", by: ADMIN, tab: "friends", texts: T4,
      filter: { apps: ["tennis"], langs: ["tr"], pro: "any", signedIn: true }, summary: "Tenis · dil tr · girişli" },
    { pid: "fa11ed00", at: new Date(now - 13 * 864e5), sentAt: new Date(now - 13 * 864e5), status: "failed", mode: "devices", by: ADMIN, texts: T3, tab: null, error: "UNREGISTERED",
      filter: { installIds: [list[13].id] }, summary: `Tek kişi: ${shortId(list[13].id)}`, counts: { targeted: 1, sent: 0, failed: 1, removedTokens: 1 }, byLang: { en: { sent: 0, failed: 1 } }, errors: { UNREGISTERED: 1 }, failures: [{ i: list[13].id, l: "en", a: list[13].app, e: "UNREGISTERED: Requested entity was not found." }] },
  ];
  // Açılmalar: dokunan kurulumun ve günün sayaçlarına push_open_<kimlik>.
  for (const p of demoPushes.filter(p => p.status === "sent" && !p.test)) {
    const base = tms(p.sentAt), rate = p.mode === "devices" ? .32 : .18;
    let cap = p.mode === "devices" ? Math.round(p.counts.sent * rate) : 1e9;
    for (const inst of list) {
      if (inst.notif !== true || (p.apps?.length && !p.apps.includes(inst.app)) || rnd() > rate || cap-- <= 0) continue;
      const t = Math.min(now - 6e4, base + Math.pow(rnd(), 3) * 3 * 864e5), k = `push_open_${p.pid}`;
      bump(inst.ev, "push_open"); bump(inst.ev, k);
      const s = statsMap[inst.app + "_" + dayKey(t)] ||= { app: inst.app, day: dayKey(t), ev: {} };
      bump(s.ev, "push_open"); bump(s.ev, k);
    }
  }
  const templates = [
    { id: "t1", name: "Hafta sonu hatırlatma", mode: "topics", apps: [], texts: T1, tab: "logbook", updatedAt: new Date(now - 864e5) },
    { id: "t2", name: "Geri dön (14 gün)", mode: "devices", apps: [], aud: { apps: [], langs: [], pro: "free", signed: "any", act: "inactive", actDays: 7, inactDays: 14, ids: [] }, texts: T2, tab: "setup", updatedAt: new Date(now - 6 * 864e5) },
  ];
  const REASON = ["Spam", "Inappropriate", "Fake result", "Hakaret", "Harassment"];
  const reports = [...posts.filter((x, k) => k % 6 === 2).map((x, k) => ({ id: "r" + k, reporter: pick(users).id, postId: x.id, uid: x.authorUid, reason: pick(REASON), createdAt: recent() })),
    { id: "rp1", reporter: users[2].id, uid: users[7].id, reason: "Fake profile", createdAt: recent() }];
  const blocks = [{ id: users[7].id, path: `users/${users[2].id}/blocks/${users[7].id}`, by: users[2].id, who: users[7].id, createdAt: recent() }, { id: users[4].id, path: `users/${users[9].id}/blocks/${users[4].id}`, by: users[9].id, who: users[4].id, createdAt: recent() }];
  const st = Object.values(statsMap);
  demo = { installs: list, stats: st, events, ga4: fakeGA4(rnd, pick), pushes: demoPushes, templates, ...fakeSales(rnd, st),
    socialData: { users, follows, leagues, matches, posts, comments, likes, followRequests, notifItems, reports, blocks, handlesN: users.length, err: {} },
    leagueData: { fixtures, invites: lInv, requests: lReq, err: {} } };
}
function fakeGA4(rnd, pick) {
  const now = Date.now(), gun = 90, g = { uretim: new Date(now - 5 * 36e5).toISOString(), gun, gunluk: [], olaylar: [], kohort: [], surumGunluk: [] };
  const AK = [["tennis", "ios", 14, "Tennis Padel Score Keeper"], ["tennis", "android", 3, "Tennis Padel Score Keeper Android"], ["pickleball", "ios", 4, "Pickleball Score Keeper"],
    ["tabletennis", "ios", 2, "Rally: Table Tennis"], ["badminton", "ios", 2, "Rally: Badminton"], ["volleyball", "ios", 1, "Volleyball Score Keeper"]];
  const names = Object.keys(OLAY).filter(k => !["screen", "screen_time", "session", "pw_view", "pw_close", "pw_close_bought", "pw_buy", "match_done", "match_sent", "share", "signin", "social", "courts"].includes(k));
  const kisi = {};
  for (let d = gun - 1; d >= 0; d--) {
    const t = dayKey(now - d * 864e5);
    for (const [a, pl, w] of AK) {
      const au = Math.round(w * (0.5 + rnd()) * (1 + (gun - d) / gun)), nu = Math.round(au * (.2 + rnd() * .3));
      g.gunluk.push({ t, a, p: pl, au, nu, os: Math.round(au * 1.7), sure: au * Math.round(120 + rnd() * 300), ekran: au * 4 });
      const v = pl === "android" ? "2.0.0" : d > 20 ? "1.9" : rnd() < (20 - d) / 20 ? "2.0" : "1.9";
      g.surumGunluk.push({ t, a, p: pl, v, au, nu });
      for (const o of names) if (rnd() < .3) {
        const n = 1 + Math.floor(rnd() * au), k = Math.max(1, Math.round(n / 2));
        g.olaylar.push({ t, o, a, p: pl, n, k });
        (kisi[o] ||= { k: 0, n: 0 }).n += n; kisi[o].k += k;
      }
    }
  }
  const tu = g.gunluk.reduce((s2, r2) => s2 + r2.nu, 0);
  kisi.first_open = { k: tu, n: tu };
  g.olayKisi = kisi;
  g.toplam = { totalUsers: tu, newUsers: tu, activeUsers: tu, sessions: tu * 3, userEngagementDuration: tu * 900, engagedSessions: tu * 2 };
  g.aktif = { dau: 14, wau: 38, mau: 96 };
  g.uygulamalar = AK.map(([a, pl, w, ad]) => { const u = Math.round(tu * w / 26); return { a, p: pl, ad, streamName: ad, totalUsers: u, newUsers: Math.round(u * .85), activeUsers: u, sessions: u * 3, engagedSessions: u * 2, userEngagementDuration: u * 700 }; });
  g.akislar = AK.map(x => x[3]);
  g.ekranlar = ["home", "logbook", "setup", "community", "profile", "leagues", "GADFullScreenAdViewController/Rewarded", "(not set)"].flatMap(ad => AK.map(([a, pl]) => ({ ad, a, p: pl, g: Math.floor(rnd() * 300), sure: Math.floor(rnd() * 20000), k: 1 + Math.floor(rnd() * 40) })));
  g.surumler = AK.flatMap(([a, pl, w]) => pl === "android" ? [{ a, p: pl, appVersion: "2.0.0", activeUsers: w * 3 }] : [{ a, p: pl, appVersion: "2.0", activeUsers: Math.round(w * 3) }, { a, p: pl, appVersion: "1.9", activeUsers: w }]);
  g.cokme = AK.map(([a, pl, w]) => ({ a, p: pl, v: pl === "android" ? "2.0.0" : "2.0", k: Math.round(rnd() * 3), au: w * 3 }));
  g.ulkeler = [["US", "United States", 70], ["GB", "United Kingdom", 22], ["DE", "Germany", 15], ["TR", "Türkiye", 12], ["AU", "Australia", 10], ["ES", "Spain", 8], ["NL", "Netherlands", 6], ["HU", "Hungary", 4]]
    .flatMap(([iso, country, n]) => AK.map(([a, pl, w]) => ({ a, p: pl, iso, country, totalUsers: Math.max(1, Math.round(n * w / 26)), newUsers: Math.round(n * w / 30) })));
  g.diller = [["English", 120], ["German", 15], ["Turkish", 12], ["Spanish", 9]].flatMap(([language, n]) => AK.map(([a, pl, w]) => ({ a, p: pl, language, totalUsers: Math.max(1, Math.round(n * w / 26)) })));
  g.kaynaklar = AK.flatMap(([a, pl, w]) => [{ a, p: pl, firstUserSource: "(direct)", firstUserMedium: "(none)", totalUsers: w * 8 }, { a, p: pl, firstUserSource: pl === "android" ? "google-play" : "apple", firstUserMedium: "organic", totalUsers: w * 2 }]);
  g.cihazlar = AK.flatMap(([a, pl, w]) => (pl === "android" ? [["Pixel 8", 5], ["Galaxy S24", 3]] : [["iPhone", 70], ["iPhone 15 Pro", 25], ["iPhone 16", 18]]).map(([mobileDeviceModel, n]) => ({ a, p: pl, mobileDeviceModel, totalUsers: Math.max(1, Math.round(n * w / 14)) })));
  g.isletim = AK.flatMap(([a, pl, w]) => (pl === "android" ? [["Android", "15", 6], ["Android", "14", 3]] : [["iOS", "26.0", 80], ["iOS", "26.0.1", 30], ["iOS", "18.6.2", 20]]).map(([operatingSystem, operatingSystemVersion, n]) => ({ a, p: pl, operatingSystem, operatingSystemVersion, totalUsers: Math.max(1, Math.round(n * w / 14)) })));
  g.saatler = AK.flatMap(([a, pl, w]) => Array.from({ length: 24 }, (_, h) => ({ a, p: pl, hour: String(h).padStart(2, "0"), activeUsers: w, sessions: Math.round(w * (1 + 6 * Math.max(0, Math.sin((h - 6) / 18 * Math.PI))) * (0.7 + rnd() * .6)) })));
  g.saatGun = AK.flatMap(([a, pl, w]) => Array.from({ length: 7 * 24 }, (_, x) => { const gg = Math.floor(x / 24), h = x % 24; return { a, p: pl, g: gg, h, os: Math.round(w * Math.max(0, Math.sin((h - 6) / 18 * Math.PI)) * (gg === 0 || gg === 6 ? 2 : 1) * (0.5 + rnd())) }; }));
  for (let w = 8; w >= 0; w--) { const ilk = dayKey(now - w * 7 * 864e5); for (const [a, pl, ww] of AK) { let k = Math.round((5 + rnd() * 5) * ww / 4) + 1; for (let j = 0; j <= w && j < 5; j++) { g.kohort.push({ a, p: pl, ilk, t: dayKey(now - (w - j) * 7 * 864e5), k }); k = Math.round(k * (.3 + rnd() * .3)); } } }
  return g;
}
/* panel/sales (panel-yaz.mjs biçimi) ve panel/magaza (bam-sports.mjs biçimi), sahte. */
function fakeSales(rnd, st) {
  const now = Date.now(), uyg = {}, mag = [];
  const W = { tennis: 6, pickleball: 3, volleyball: 2, badminton: 1, tabletennis: 1 };
  for (let d = 119; d >= 1; d--) {
    const t = dayKey(now - d * 864e5);
    for (const [a, w] of Object.entries(W)) {
      const ind = Math.round(w * rnd() * 2), iap = rnd() < .08 * w ? 1 : 0;
      const gelir = iap ? (rnd() < .5 ? { USD: +(5.59 * (0.5 + rnd())).toFixed(2) } : { EUR: 6.29, TRY: 279.99 }) : {};
      const row = { tarih: t, indirme: ind, guncelleme: Math.round(ind * 1.5), iap, gelir };
      ((uyg[APPS[a].slug] ||= { gunluk: [] }).gunluk).push(row);
      mag.push({ t, a, p: "ios", indirme: ind, guncelleme: row.guncelleme, iap, gelir, ulkeler: ind ? { [pick2(rnd, ["US", "GB", "DE", "TR", "NL"])]: ind } : {} });
      if (a === "tennis" && rnd() < .3) mag.push({ t, a, p: "android", indirme: 1, guncelleme: 0, iap: 0, gelir: { EUR: 1.42 }, ulkeler: { DE: 1 } });
    }
  }
  const urunler = {};
  const SUF = { tennis: "tennis", pickleball: "pickle", volleyball: "volley", badminton: "badminton", tabletennis: "tabletennis" };
  for (const a of APP_KEYS) for (const [tur, usd2, trY, eur, gbp] of [["monthly", 0.99, 49.99, 0.99, 0.99], ["yearly", 7.99, 399.99, 8.99, 7.99], ["lifetime", 49.99]])
    urunler[`bamtech_allsports_${tur}_${SUF[a]}`] = { a, tur, taban: { c: "USD", p: usd2, u: "USA" }, ulke: trY ? { USA: { c: "USD", p: usd2 }, TUR: { c: "TRY", p: trY }, DEU: { c: "EUR", p: eur }, GBR: { c: "GBP", p: gbp } } : { USA: { c: "USD", p: usd2 } } };
  return {
    sales: { uretim: new Date(now - 6 * 36e5).toISOString(), uygulamalar: uyg, ulkeler: { US: 40, GB: 12, DE: 9, TR: 7, NL: 4 } },
    magaza: { uretim: new Date(now - 5 * 36e5).toISOString(), gunluk: mag, kur: { taban: "USD", tarih: "demo", oran: { USD: 1, EUR: 0.92, TRY: 41.6, GBP: 0.79, PHP: 57, HUF: 360 } }, fiyat: { uretim: new Date(now - 2 * 864e5).toISOString(), urunler } },
  };
}
const pick2 = (rnd, a) => a[Math.floor(rnd() * a.length)];

// ─── Kabuk (en sonda: sayfa fonksiyonlarının let/const tanımları hazır) ─────
/* Tema: BamSportsKit BamPalette (Tenis yeşili rgb .19/.78/.34, iOS sistem
   renkleri) ve iOS gruplu arka planı (systemGroupedBackground / secondary). */
const TEMA = {
  acik: { accent: "#30C757", onAccent: "#052e12", bg: "#F2F2F7", card: "#FFFFFF", side: "#E7F5EA", line: "#DCDCE1", ink: "#1C1C1E", soft: "#636366",
    ok: "#248A3D", warn: "#C26A00", sky: "#0A6FE0", rose: "#D70015" },
  koyu: { accent: "#30D158", onAccent: "#04260f", bg: "#000000", card: "#1C1C1E", side: "#101512", line: "#38383A", ink: "#F2F2F7", soft: "#AEAEB2",
    ok: "#30D158", warn: "#FF9F0A", sky: "#64A8FF", rose: "#FF6961" },
};
if (DEMO) { const d = el("div", "demo-serit", "DEMO: sahte veri, Firestore'a ve Worker'a bağlanmıyor"); document.body.prepend(d); }
K = await panelKabuk({
  ad: "Bam Sports",
  anahtar: "bam-sports",
  ikon: "/assets/lab-icons/bam-sports-180.png",
  firebaseConfig,
  yonetici: ADMIN,
  tema: TEMA,
  araliklar: [1, 7, 28, 90, 0], aralik: 7,
  yukle,
  surumler: () => {
    const say = {};
    for (const i of allInstalls) if (aOk(i.app)) { const k = verKey(i); say[k] = (say[k] || 0) + 1; }
    const ad = k => APP_KEYS.findIndex(x => k.startsWith(appName(x) + " "));
    return Object.entries(say).sort((a, b) => ad(a[0]) - ad(b[0]) || b[0].localeCompare(a[0], "tr", { numeric: true })).map(([surum, adet]) => ({ surum, adet }));
  },
  surumNotu: APP_KEYS.map(a => APPS[a].slug),
  uygulamaAdi: s => appName(SLUG_APP[s]),
  gruplar: [
    { baslik: "ANALİZ", sayfalar: [
      { id: "genel", ad: "Genel bakış", ciz: genel },
      { id: "canli", ad: "Canlı", ciz: canli },
      { id: "ekranlar", ad: "Ekranlar", ciz: ekranlar },
      { id: "paywall", ad: "Paywall ve satın alma", ciz: paywall },
      { id: "kullanim", ad: "Kullanım", ciz: kullanim },
      { id: "kullanicilar", ad: "Kullanıcılar", ciz: kullanicilar },
      { id: "surumler", ad: "Sürümler", ciz: surumler },
      { id: "satis", ad: "Satış", ciz: satis },
      { id: "analytics", ad: "Analytics", ciz: analytics },
    ] },
    { baslik: "SOSYAL", sayfalar: [
      { id: "akis", ad: "Akış ve gönderiler", ciz: akis },
      { id: "yorumlar", ad: "Yorumlar", ciz: yorumlar },
      { id: "raporlar", ad: "Raporlar", ciz: raporlar },
      { id: "ligler", ad: "Ligler", ciz: ligler },
      { id: "resmi", ad: "Resmi hesaplar", ciz: resmi },
      { id: "sosyal", ad: "Kullanıcılar ve takip", ciz: sosyal },
    ] },
    { baslik: "YÖNET", sayfalar: [
      { id: "bildirim", ad: "Bildirim gönder", ciz: bildirim },
      { id: "gonderilenler", ad: "Gönderilenler", ciz: gonderilenler },
      { id: "ayarlar", ad: "Ayarlar", ciz: ayarlar },
    ] },
  ],
});
/* Uygulama seçici üst satırda, sürüm seçicinin solunda; her sayfa buna göre süzülür. */
(function uygulamaSecici() {
  const ust = document.querySelector(".top"); if (!ust || ust.querySelector("select.uyg")) return;
  const s = el("select", "uyg");
  s.title = "Uygulamaya göre süz: her sayfa seçili uygulamayı gösterir";
  s.innerHTML = `<option value="all">Uygulama: beşi (${fmt(allInstalls.length)})</option>` + APP_KEYS.map(a => `<option value="${a}">${esc(appName(a))} (${fmt(allInstalls.filter(i => i.app === a).length)})</option>`).join("");
  s.value = appF; s.classList.toggle("on", appF !== "all");
  s.onchange = () => uygulamaSec(s.value);
  const sur = ust.querySelector("select.surum");
  ust.insertBefore(s, sur || ust.children[2] || null);
})();
