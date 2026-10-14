/* Matchday paneli. Ortak katman (/lab/assets) uzerine; menu ve bilesenler
 * butun panellerle ayni, renkler uygulamanin (ios/Matchday/Theme.swift,
 * android Theme.kt).
 *
 * Veri: Firestore matchday-bamtech. Telemetri (docs/telemetry-spec.md):
 * installs/{id}, installs/{id}/events (zaman cizelgesi, 90 gun), stats/{gun}.
 * Uygulamanin kendi verisi: users, players, matches, ratings, follows,
 * notifications, reports, claims, users/{uid}/tokens, config/app.
 * Pushes Worker'dan (matchday-push). Okumalar yalniz admin (admins/{uid}).
 *
 * Veri bir kez yuklenir; donem (Bugun/7/28/90/Tumu) ve surum secimi
 * istemcide hesaplanir.
 */
import { getFirestore, collection, collectionGroup, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, deleteField,
  query, orderBy, limit, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { panelKabuk } from "/lab/assets/shell.js?v=3";
import { el, kart, tiles, veriTablo, sayi, sure, tarihTam, tarihHucre, yuzde, zaman, ms, istGun, istGunBasi,
  donem, farkYazi, surumListesi, surumSuz, surumNotlari, surumNotlariKutu, kullaniciCekmecesi } from "/lab/assets/panel.js?v=6";
import { gunlukCubuk, cizgi, huni, yatayCubuk, saatIsi, saatMatrisi, kivilcim, gunleriDoldur } from "/lab/assets/grafik.js?v=1";
import { pushSayfasi, gonderilenlerSayfasi, kisiyeBildirim, onayKarti } from "/lab/assets/push.js?v=3";
import { dunyaHaritasi } from "/lab/assets/harita.js?v=1";
import { firebaseConfig } from "./firebase-config.js";
import { demoVeri } from "./demo.js";

const YONETICI = "aberkalparslan@gmail.com";
const WORKER = "https://matchday-push.kittapcom.workers.dev";
const SLUG = "matchday";
const GUN = 864e5;

// ── Etiketler ──────────────────────────────────────────────────────────────
const EKRAN = {
  onboarding: "Tanıtım", signin: "Giriş", profile_setup: "Profil kurulumu", home: "Ana sayfa", matches: "Maçlar",
  explore: "Keşfet", profile: "Profil", profile_other: "Başkasının profili", match_details: "Maç: Detaylar",
  match_players: "Maç: Oyuncular", match_videos: "Maç: Videolar", editor_new: "Yeni maç", editor_edit: "Maçı düzenle",
  editor_repeat: "Haftaya tekrarla", lineup: "Kadro editörü", score: "Skor girişi", rate: "Puanlama", share: "Kadro paylaşımı",
  invite: "Davet", notifications: "Bildirimler", follows: "Takip listesi", player_editor: "Oyuncu kaydı",
  video_player: "Video oynatıcı", closed: "Kapalı",
};
const EYLEM = {
  sign_in: "Giriş", sign_out: "Çıkış", account_delete: "Hesap silme", match_create: "Maç oluşturma", match_edit: "Maç düzenleme",
  match_cancel: "Maç iptali", match_delete: "Maç silme", rsvp: "Yoklama cevabı", tick: "Kadro tiki", squad_remove: "Kadrodan çıkarma",
  captain_set: "Kaptan seçme", invite_send: "Davet gönderme", invite_accept: "Daveti kabul", invite_decline: "Daveti ret",
  join_request: "Katılma isteği", request_approve: "İsteği onaylama", teams_build: "Takım kurma", share: "Paylaşım",
  share_text: "Metin paylaşımı", share_image: "Resim paylaşımı", result_save: "Sonuç kaydı", result_submit: "Sonucu onaya gönderme",
  result_reject: "Sonucu reddetme", rate_submit: "Puan gönderme", watch_result: "Saatten sonuç", follow: "Takip etme",
  unfollow: "Takibi bırakma", report: "Şikayet", block: "Engelleme", unblock: "Engeli kaldırma", claim_played: "Bu maçta oynadım",
  claim_guest: "Bu benim (misafir)", video_add: "Video ekleme", photo_set: "Profil fotoğrafı", theme: "Tema", language: "Dil",
  session: "Oturum", screen: "Ekran açıldı", screen_time: "Ekranda kaldı", push_open: "Bildirim açtı",
};
const PARAM = {
  google: "Google", apple: "Apple", email: "E-posta", new: "yeni", repeat: "tekrar", in: "geliyor", out: "gelmiyor", on: "açık",
  off: "kapalı", profile: "profilden", sheet: "davet ekranından", positions: "mevkili", names: "isimler", formation: "diziliş",
  manual: "elle", watch: "saatten", approved: "onaylı", dark: "koyu", light: "açık", system: "sistem", tr: "Türkçe", en: "İngilizce",
};
const SAYAC = {
  installs_new: "Yeni kurulum", sessions: "Oturum", onboarding_done: "Tanıtım bitti", sign_ins: "Giriş",
  matches_created: "Maç oluşturuldu", results_saved: "Sonuç kaydedildi", ratings_sent: "Puan gönderildi", invites_sent: "Davet gönderildi",
};
const POZ = { GK: "Kaleci", DEF: "Defans", MID: "Orta saha", FWD: "Forvet" };
const MAC_DURUM = { upcoming: "Yaklaşan", played: "Oynandı", cancelled: "İptal" };
const BIL_TUR = { follow: "Takip", invite: "Davet", accepted: "Geliyor", declined: "Gelemiyor", request: "Katılma isteği",
  approved: "Maça alındı", played: "Oynadım isteği", result: "Sonuç onayı" };
const SEBEP = { abuse: "Hakaret", spam: "Spam", fake: "Sahte hesap", other: "Diğer", inappropriate: "Uygunsuz" };
const KAT = ["overall", "pace", "technique", "teamwork", "defense", "finishing", "fairplay"];
const KAT_TR = { overall: "Genel", pace: "Hız", technique: "Teknik", teamwork: "Takım", defense: "Savunma", finishing: "Bitiricilik", fairplay: "Fair play" };
const GORUNUM = { dark: "Koyu", light: "Açık", system: "Sistem" };
const DIL = { tr: "Türkçe", en: "İngilizce" };
const PLAT = p => p === "android" ? "Android" : p === "ios" ? "iOS" : p || "?";
const ekranAdi = k => EKRAN[k] || k || "";
const eylemAdi = (e, p) => (EYLEM[e] || e) + (p ? ` (${PARAM[p] || p})` : "");

// ── Durum ──────────────────────────────────────────────────────────────────
let K = null, db = null, veri = null;
const bos = () => ({ installs: [], events: [], days: [], users: [], players: [], matches: [], ratings: [], follows: [], notifications: [],
  reports: [], claims: [], tokens: [], pushes: [], config: {}, sales: null, adminUid: null, hatalar: [] });

const F = { getDocs, query, collection, orderBy, limit, doc, deleteDoc, setDoc, addDoc, serverTimestamp };

async function yukle(k) {
  K = k;
  if (k.demo) { veri = hazirla(demoVeri()); k.durum("Demo veri: uydurma kişiler, gerçek alanlar"); return; }
  if (!db) db = getFirestore(k.app);
  const v = bos();
  v.adminUid = k.kullanici?.uid || null;
  const oku = async (ad, is) => { try { return await is(); } catch (e) { v.hatalar.push([ad, e.code || e.message]); return []; } };
  const liste = async yol => (await getDocs(collection(db, yol))).docs.map(d => ({ id: d.id, ...d.data() }));
  const [ins, evs, days, users, players, matches, ratings, follows, notifs, reports, claims, toks, pushes, cfg, sales] = await Promise.all([
    oku("installs", () => liste("installs")),
    oku("events", async () => (await getDocs(collectionGroup(db, "events"))).docs
      .filter(d => d.ref.parent.parent?.parent?.id === "installs")
      .map(d => { const x = d.data(); return { i: d.ref.parent.parent.id, t: ms(x.t), e: x.e, p: x.p, s: x.s }; })),
    oku("stats", () => liste("stats")),
    oku("users", () => liste("users")),
    oku("players", () => liste("players")),
    oku("matches", () => liste("matches")),
    oku("ratings", () => liste("ratings")),
    oku("follows", () => liste("follows")),
    oku("notifications", () => liste("notifications")),
    oku("reports", () => liste("reports")),
    oku("claims", () => liste("claims")),
    oku("tokens", async () => (await getDocs(collectionGroup(db, "tokens"))).docs
      .filter(d => d.ref.parent.parent?.parent?.id === "users")
      .map(d => ({ id: d.id, uid: d.ref.parent.parent.id, ...d.data() }))),
    oku("pushes", () => liste("pushes")),
    oku("config", async () => [(await getDoc(doc(db, "config", "app"))).data() || {}]),
    oku("panel/sales", async () => [(await getDoc(doc(db, "panel", "sales"))).data() || null]),
  ]);
  Object.assign(v, { installs: ins, events: evs, days, users, players, matches, ratings, follows, notifications: notifs,
    reports, claims, tokens: toks, pushes, config: cfg[0] || {}, sales: sales[0] || null });
  veri = hazirla(v);
  k.durum(`${sayi(v.installs.length)} kurulum, ${sayi(v.events.length)} olay, ${sayi(v.users.length)} hesap, ${sayi(v.matches.length)} maç, ${sayi(v.ratings.length)} oy` +
    (v.hatalar.length ? ` · okunamayan: ${v.hatalar.map(h => h[0]).join(", ")}` : ""));
}

/* Turetilmis alanlar: hesap, cihaz adresi (token), test, olaylar. */
function hazirla(v) {
  v.userMap = new Map(v.users.map(u => [u.id, u]));
  v.playerMap = new Map(v.players.map(p => [p.id, p]));
  v.matchMap = new Map(v.matches.map(m => [m.id, m]));
  v.guestAd = new Map();
  for (const m of v.matches) for (const g of m.guests || []) if (g?.id) v.guestAd.set(g.id, g.name);
  const tokSay = {};
  for (const t of v.tokens) { const k = `${t.uid}|${t.platform === "android" ? "android" : "ios"}`; tokSay[k] = (tokSay[k] || 0) + 1; }
  const sirali = v.installs.slice().sort((a, b) => ms(b.lastSeen) - ms(a.lastSeen));
  for (const i of sirali) {
    const k = `${i.uid}|${i.platform === "android" ? "android" : "ios"}`;
    i.fcm = !!(i.uid && i.signedIn !== false && tokSay[k] > 0);
    if (i.fcm) tokSay[k]--;
    i.tester = !!i.uid && i.uid === v.adminUid;
    i.handle = v.userMap.get(i.uid)?.handle || "";
  }
  v.evBy = new Map();
  for (const e of v.events) { if (!v.evBy.has(e.i)) v.evBy.set(e.i, []); v.evBy.get(e.i).push(e); }
  v.insBy = new Map();
  for (const i of v.installs) if (i.uid) { if (!v.insBy.has(i.uid)) v.insBy.set(i.uid, []); v.insBy.get(i.uid).push(i); }
  v.ilkVeri = Math.min(Date.now(), ...v.installs.map(i => ms(i.firstSeen)).filter(Boolean), ...v.users.map(u => ms(u.createdAt)).filter(Boolean),
    ...v.matches.map(m => ms(m.createdAt)).filter(Boolean));
  return v;
}

// ── Yardimcilar ────────────────────────────────────────────────────────────
const D = () => donem(K.aralik);
const icinde = (t, a, b) => t >= a && t < b;
const simdiD = () => { const d = D(); return { a: d.bas, b: d.son + 1, oa: d.oncekiBas, ob: d.oncekiSon }; };
const kurulumlar = () => surumSuz(veri.installs, K.surum);
const olaylar = () => { if (!K.surum) return veri.events; const s = new Set(kurulumlar().map(i => i.id)); return veri.events.filter(e => s.has(e.i)); };
const say = (l, f) => { const d = simdiD(); const s = l.filter(x => icinde(f(x), d.a, d.b)).length; const o = d.oa == null ? null : l.filter(x => icinde(f(x), d.oa, d.ob)).length; return [s, o]; };
const fark = (simdi, once, ters) => once == null ? undefined : { simdi, once, ters };
const donemAdi = () => K.aralik === 0 ? "tüm zamanlar" : K.aralik === 1 ? "bugün" : `son ${K.aralik} gün`;
const onlineMi = i => i.screen && i.screen !== "closed" && Date.now() - ms(i.lastSeen) < 3 * 60e3;
const ad = id => veri.userMap.get(id)?.name || veri.playerMap.get(id)?.name || veri.guestAd.get(id) || (id ? "(silinmiş)" : "");
const kimlik = id => { const u = veri.userMap.get(id); return u ? `${u.name} @${u.handle}` : veri.playerMap.has(id) || veri.guestAd.has(id) ? `${ad(id)} (hesapsız)` : ad(id); };
const resolve = id => veri.playerMap.get(id)?.linkedUid || id;
const macAdi = id => { const m = veri.matchMap.get(id); return m ? (m.title || m.venue || id) : id || ""; };
const kisa = id => String(id || "").slice(0, 8);
const kurulumKisi = i => i.handle ? "@" + i.handle : veri.userMap.get(i.uid)?.name || kisa(i.id);
const kutu = () => el("div");
const not = (m, sinif = "muted") => el("p", sinif, m);
const evSay = (i, k) => Number(i?.ev?.[k] || 0);
const ortalama = l => l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0;
const sayiOn = (n, b = 1) => Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: b, minimumFractionDigits: b });

/* Grafik gunleri: donem basindan bugune (Tumu: ilk veriden). */
function gunAraligi() {
  const d = D();
  const bas = d.bas || veri.ilkVeri || Date.now();
  return [istGun(Math.max(bas, Date.now() - 400 * GUN)), istGun(Date.now())];
}
function gunluk(l, f, deger = () => 1) {
  const h = {};
  for (const x of l) { const t = f(x); if (!t) continue; const g = istGun(t); h[g] = (h[g] || 0) + deger(x); }
  return h;
}
function gunlukSeri(seriler) {
  const [a, b] = gunAraligi();
  const h = {};
  for (const [alan, harita] of Object.entries(seriler)) for (const [g, v] of Object.entries(harita)) (h[g] ||= {})[alan] = v;
  return gunleriDoldur(h, a, b).map(g => { for (const alan of Object.keys(seriler)) g[alan] ||= 0; return g; });
}
function grafikKart(c, baslik, ciz, alt) {
  const k = kutu();
  const kk = kart(baslik, k);
  if (alt) kk.appendChild(not(alt));
  c.appendChild(kk);
  try { ciz(k); } catch (e) { console.error(e); k.appendChild(not("Grafik çizilemedi: " + e.message)); }
  return kk;
}
function izgara(c, n = 2) { const g = el("div", n === 3 ? "izgara3" : "izgara2"); c.appendChild(g); return g; }
function dagilim(l, f) { const h = {}; for (const x of l) { const k = f(x); if (k == null || k === "") continue; h[k] = (h[k] || 0) + 1; } return h; }
function toast(m) { const t = el("div", "toast"); t.setAttribute("role", "status"); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); }
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function surumNotu(c) { if (K.surum) c.appendChild(not(`Sürüm filtresi (${K.surum}) bu sayfadaki uygulama verisine (hesap, maç, oy) uygulanmaz; yalnız kurulum bazlı sayılara uygulanır.`)); }
function gunYas(t) { const m = ms(t); return m ? Math.floor((Date.now() - m) / GUN) : null; }
function sonGorulmeKova(i) {
  const m = ms(i.lastSeen); if (!m) return "Bilinmiyor";
  if (onlineMi(i)) return "Şu an";
  if (m >= istGunBasi()) return "Bugün";
  const g = (Date.now() - m) / GUN;
  return g < 7 ? "7 gün içinde" : g < 28 ? "28 gün içinde" : g < 90 ? "90 gün içinde" : "Daha eski";
}

/* Bir islem: demo'da yazmaz, gercekte yazar, sonra yeniden yukler. */
async function islem(baslik, satirlar, evet, is, tehlike = true) {
  const ok = await onayKarti({ baslik, satirlar, evet, tehlike, not: tehlike ? "Bu işlem geri alınamaz." : "" });
  if (!ok) return false;
  if (K.demo) { toast("Demo: hiçbir şey yazılmadı"); return false; }
  try { await is(); toast("Yapıldı"); await K.yenile(); return true; }
  catch (e) { toast("Olmadı: " + (e.code || e.message)); return false; }
}

// ════════════════════════════════════════════════════════════════════════
// ANALİZ
// ════════════════════════════════════════════════════════════════════════

function genel(c) {
  const ins = kurulumlar(), E = olaylar(), d = simdiD();
  const aktifSet = (a, b) => new Set(E.filter(e => icinde(e.t, a, b)).map(e => e.i));
  const aktif = aktifSet(d.a, d.b).size, aktifO = d.oa == null ? null : aktifSet(d.oa, d.ob).size;
  const [yeni, yeniO] = say(ins, i => ms(i.firstSeen));
  const ses = E.filter(e => e.e === "session");
  const [oturum, oturumO] = say(ses, e => e.t);
  const sesD = ses.filter(e => icinde(e.t, d.a, d.b));
  const ortS = ortalama(sesD.map(e => e.s || 0));
  const [hesap, hesapO] = say(veri.users, u => ms(u.createdAt));
  const [mac, macO] = say(veri.matches, m => ms(m.createdAt));
  const [oyn, oynO] = say(veri.matches.filter(m => m.status === "played"), m => ms(m.startsAt));
  const [oy, oyO] = say(veri.ratings, r => ms(r.createdAt));
  const gunler = gunlukSeri({ aktif: gunlukAktif(E), yeni: gunluk(ins, i => ms(i.firstSeen)) });
  c.appendChild(tiles([
    ["Kurulum", sayi(ins.length), K.surum ? `sürüm ${K.surum}` : "toplam"],
    ["Aktif kurulum", sayi(aktif), donemAdi(), fark(aktif, aktifO)],
    ["Yeni kurulum", sayi(yeni), donemAdi(), fark(yeni, yeniO)],
    ["Oturum", sayi(oturum), donemAdi(), fark(oturum, oturumO)],
    ["Ortalama oturum", sure(ortS) || "0 sn", `${sayi(sesD.length)} oturum`],
    ["Şu an açık", sayi(ins.filter(onlineMi).length), "son 3 dakika"],
    ["Girişli", yuzde(ins.filter(i => i.signedIn).length, ins.length), `${sayi(ins.filter(i => i.signedIn).length)} kurulum`],
    ["Bildirim izni", yuzde(ins.filter(i => i.notif).length, ins.length), `${sayi(ins.filter(i => i.fcm && i.notif !== false).length)} ulaşılır`],
    ["Yeni hesap", sayi(hesap), donemAdi(), fark(hesap, hesapO)],
    ["Yeni maç", sayi(mac), donemAdi(), fark(mac, macO)],
    ["Oynanan maç", sayi(oyn), donemAdi(), fark(oyn, oynO)],
    ["Oy", sayi(oy), donemAdi(), fark(oy, oyO)],
  ]));
  const g1 = izgara(c);
  grafikKart(g1, "Günlük aktif ve yeni kurulum", k => cizgi(k, gunler, { seriler: [{ ad: "Aktif kurulum", alan: "aktif" }, { ad: "Yeni kurulum", alan: "yeni" }] }),
    "Aktif: o gün en az bir olay yazan kurulum (olay kaydı 5 Eki 2026'da başladı).");
  const sk = kart("Son sürüm notları");
  const sn = kutu(); sn.textContent = "Yükleniyor...";
  sk.appendChild(sn);
  const tum = el("button", "ghost", "Bütün notlar"); tum.onclick = () => K.surumCekmecesi?.();
  sk.appendChild(tum);
  g1.appendChild(sk);
  surumNotlari(SLUG).then(l => { sn.textContent = ""; sn.appendChild(surumNotlariKutu(l, { limit: 4 })); });

  const g2 = izgara(c);
  grafikKart(g2, "Günlük oturum (platform)", k => gunlukCubuk(k, gunlukSeri({
    ios: gunluk(ses.filter(e => veri.installs.find(i => i.id === e.i)?.platform === "ios"), e => e.t),
    android: gunluk(ses.filter(e => veri.installs.find(i => i.id === e.i)?.platform === "android"), e => e.t),
  }), { seriler: [{ ad: "iOS", alan: "ios" }, { ad: "Android", alan: "android" }] }));
  grafikKart(g2, "Uygulama içi etkinlik", k => gunlukCubuk(k, gunlukSeri({
    hesap: gunluk(veri.users, u => ms(u.createdAt)), mac: gunluk(veri.matches, m => ms(m.createdAt)), oy: gunluk(veri.ratings, r => ms(r.createdAt)),
  }), { seriler: [{ ad: "Yeni hesap", alan: "hesap" }, { ad: "Yeni maç", alan: "mac" }, { ad: "Oy", alan: "oy" }] }),
    "Firestore koleksiyonlarından; sürüm filtresi bu grafiğe uygulanmaz.");

  c.appendChild(kart("Tutma (kohort)", kohortTablo(ins),
    not("D1/D7/D30: kurulumdan N gün sonra (o gün ya da sonra) yeniden açan kurulumların oranı; yalnız en az N günlük kurulumlar sayılır. Olay kaydı olmayan eski kurulumlarda son görülme kullanılır.")));

  const hk = kutu();
  c.appendChild(kart("Ülkeler", hk, not("Kurulum belgesindeki bölge (telefonun bölge ayarı).")));
  dunyaHaritasi(hk, dagilim(ins, i => i.region), { birim: "kurulum" }).catch(e => hk.appendChild(not("Harita yüklenemedi: " + e.message)));

  const g3 = izgara(c, 3);
  grafikKart(g3, "Platform", k => yatayCubuk(k, dagilim(ins, i => PLAT(i.platform))));
  grafikKart(g3, "Sürüm", k => yatayCubuk(k, dagilim(ins, i => `${PLAT(i.platform)} ${i.appVersion || "?"} (${i.build || "?"})`)));
  grafikKart(g3, "Dil", k => yatayCubuk(k, dagilim(ins, i => DIL[i.language] || i.language)));
  grafikKart(g3, "Cihaz", k => yatayCubuk(k, dagilim(ins, i => i.device), { limit: 8 }));
  grafikKart(g3, "İşletim sistemi", k => yatayCubuk(k, dagilim(ins, i => `${PLAT(i.platform)} ${i.os || "?"}`), { limit: 8 }));
  grafikKart(g3, "Görünüm", k => yatayCubuk(k, dagilim(ins, i => GORUNUM[i.appearance] || i.appearance)));

  c.appendChild(kart("Sürüm benimseme", surumTablo(), not("Pro ve plan yok: Matchday'de satın alma yok. Sürüm filtresinden bağımsız, bütün kurulumlar.")));
}

function gunlukAktif(E) {
  const h = {};
  for (const e of E) { const g = istGun(e.t); (h[g] ||= new Set()).add(e.i); }
  return Object.fromEntries(Object.entries(h).map(([g, s]) => [g, s.size]));
}

function kohortTablo(ins) {
  const hafta = t => { const g = istGunBasi(t); const gun = (new Date(g + 3 * 36e5).getUTCDay() + 6) % 7; return istGun(g - gun * GUN); };
  const gruplar = {};
  for (const i of ins) { const t = ms(i.firstSeen); if (t) (gruplar[hafta(t)] ||= []).push(i); }
  const doner = (i, n) => {
    const ilk = ms(i.firstSeen), e = veri.evBy.get(i.id);
    if (e?.length) return e.some(x => x.t >= ilk + n * GUN);
    return ms(i.lastSeen) >= ilk + n * GUN;
  };
  const hucre = (l, n) => {
    const uygun = l.filter(i => Date.now() - ms(i.firstSeen) >= n * GUN);
    if (!uygun.length) return { d: "-", s: -1 };
    const k = uygun.filter(i => doner(i, n)).length;
    return { d: `${yuzde(k, uygun.length)} (${k}/${uygun.length})`, s: k / uygun.length };
  };
  const satir = Object.entries(gruplar).sort((a, b) => b[0].localeCompare(a[0])).map(([h, l]) => [
    { d: `${tarihTam(h)} haftası`, s: Date.parse(h) }, sayi(l.length), hucre(l, 1), hucre(l, 7), hucre(l, 30)]);
  satir.unshift(["Hepsi", sayi(ins.length), hucre(ins, 1), hucre(ins, 7), hucre(ins, 30)]);
  return veriTablo(["Kurulum haftası", { ad: "Kurulum", num: true }, { ad: "D1", num: true }, { ad: "D7", num: true }, { ad: "D30", num: true }], satir, { ara: false });
}

function surumTablo() {
  const g = {};
  for (const i of veri.installs) (g[`${PLAT(i.platform)}|${i.appVersion || "?"}|${i.build || "?"}`] ||= []).push(i);
  const yedi = Date.now() - 7 * GUN;
  return veriTablo([{ ad: "Platform", filtre: true }, { ad: "Sürüm", filtre: true }, "Build", { ad: "Kurulum", num: true }, { ad: "7g aktif", num: true },
    { ad: "Girişli", num: true }, { ad: "Bildirim izni", num: true }, { ad: "Ort. oturum sayısı", num: true }, "İlk görülme", "Son görülme"],
    Object.entries(g).map(([k, l]) => {
      const [p, v, b] = k.split("|");
      return [p, v, b, sayi(l.length), sayi(l.filter(i => ms(i.lastSeen) >= yedi).length), yuzde(l.filter(i => i.signedIn).length, l.length),
        yuzde(l.filter(i => i.notif).length, l.length), sayiOn(ortalama(l.map(i => +i.sessions || 0))),
        tarihHucre(Math.min(...l.map(i => ms(i.firstSeen) || Infinity))), tarihHucre(Math.max(...l.map(i => ms(i.lastSeen))))];
    }), { sirala: [3, "desc"], ara: false });
}

function canli(c) {
  const ins = kurulumlar(), E = olaylar(), simdi = Date.now();
  const acik = ins.filter(onlineMi).sort((a, b) => ms(b.lastSeen) - ms(a.lastSeen));
  const son = dk => ins.filter(i => simdi - ms(i.lastSeen) < dk * 60e3).length;
  c.appendChild(tiles([
    ["Şu an açık", sayi(acik.length), "son 3 dk kalp atışı"],
    ["Son 15 dakika", sayi(son(15))], ["Son 1 saat", sayi(son(60))],
    ["Bugün", sayi(ins.filter(i => ms(i.lastSeen) >= istGunBasi()).length), "Türkiye günü"],
    ["Bugün oturum", sayi(E.filter(e => e.e === "session" && e.t >= istGunBasi()).length)],
  ]));
  c.appendChild(kart(`Şu an uygulamada: ${acik.length}`, veriTablo(
    ["Kişi", { ad: "Ekran", filtre: true }, { ad: "Platform", filtre: true }, { ad: "Sürüm", filtre: true }, { ad: "Ülke", filtre: true }, "Son kalp atışı"],
    acik.map(i => [kurulumKisi(i), ekranAdi(i.screen), PLAT(i.platform), i.appVersion || "", i.region || "", tarihHucre(i.lastSeen)]),
    { sirala: [5, "desc"], bos: "Şu an kimse yok. Uygulama açıkken dakikada bir kalp atışı yazar; son 3 dakikada yazan sayılır.", satirTik: (_, n) => kisiAc(acik[n]) })));
  const bugun = E.filter(e => e.t >= istGunBasi());
  const saat = {};
  const sf = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", hourCycle: "h23" });
  for (const e of bugun) if (e.e === "session" || e.e === "screen") { const h = sf.format(e.t); const a = saat[h] ||= { oturum: 0, ekran: 0 }; if (e.e === "session") a.oturum++; else a.ekran++; }
  const saatler = Array.from({ length: 24 }, (_, h) => { const k = String(h).padStart(2, "0"); return { t: k + ":00", oturum: saat[k]?.oturum || 0, ekran: saat[k]?.ekran || 0 }; });
  grafikKart(c, "Bugün saat saat", k => gunlukCubuk(k, saatler, { seriler: [{ ad: "Ekran açılışı", alan: "ekran" }, { ad: "Oturum bitti", alan: "oturum" }] }), "Türkiye saati.");
  const akim = E.slice().sort((a, b) => b.t - a.t).filter(e => e.e !== "screen_time").slice(0, 80);
  const insMap = new Map(veri.installs.map(i => [i.id, i]));
  c.appendChild(kart("Son olaylar", veriTablo(["Zaman", "Kişi", { ad: "Olay", filtre: true }, "Ayrıntı", { ad: "Platform", filtre: true }],
    akim.map(e => { const i = insMap.get(e.i); return [tarihHucre(e.t), i ? kurulumKisi(i) : kisa(e.i), EYLEM[e.e] || e.e,
      e.e === "screen" ? ekranAdi(e.p) : e.e === "session" ? sure(e.s) : PARAM[e.p] || e.p || "", PLAT(i?.platform)]; }),
    { sirala: [0, "desc"], satirTik: (s, n) => { const i = insMap.get(akim[n].i); if (i) kisiAc(i); } })));
  const sonG = ins.slice().sort((a, b) => ms(b.lastSeen) - ms(a.lastSeen)).slice(0, 30);
  c.appendChild(kart("Son görülenler", veriTablo(["Kişi", { ad: "Son ekran", filtre: true }, { ad: "Platform", filtre: true }, "Sürüm", "Son görülme"],
    sonG.map(i => [kurulumKisi(i), ekranAdi(i.screen === "closed" ? i.lastScreen : i.screen), PLAT(i.platform), i.appVersion || "", tarihHucre(i.lastSeen)]),
    { sirala: [4, "desc"], satirTik: (_, n) => kisiAc(sonG[n]) })));
}

function ekranlar(c) {
  const E = olaylar(), d = simdiD();
  const ac = {}, sn = {}, kisi = {}, acO = {}, snO = {};
  for (const e of E) {
    const simdi = icinde(e.t, d.a, d.b), once = d.oa != null && icinde(e.t, d.oa, d.ob);
    if (!simdi && !once) continue;
    if (e.e === "screen") { if (simdi) { ac[e.p] = (ac[e.p] || 0) + 1; (kisi[e.p] ||= new Set()).add(e.i); } else acO[e.p] = (acO[e.p] || 0) + 1; }
    if (e.e === "screen_time") { if (simdi) sn[e.p] = (sn[e.p] || 0) + (e.s || 0); else snO[e.p] = (snO[e.p] || 0) + (e.s || 0); }
  }
  const adlar = [...new Set([...Object.keys(ac), ...Object.keys(sn)])];
  const topSn = Object.values(sn).reduce((a, b) => a + b, 0);
  c.appendChild(tiles([
    ["Ekran açılışı", sayi(Object.values(ac).reduce((a, b) => a + b, 0)), donemAdi(), fark(Object.values(ac).reduce((a, b) => a + b, 0), d.oa == null ? null : Object.values(acO).reduce((a, b) => a + b, 0))],
    ["Ekranda geçen süre", sure(topSn) || "0 sn", donemAdi(), fark(topSn, d.oa == null ? null : Object.values(snO).reduce((a, b) => a + b, 0))],
    ["Farklı ekran", sayi(adlar.length)],
  ]));
  c.appendChild(kart("Ekranlar", veriTablo(["Ekran", { ad: "Açılış", num: true }, { ad: "Önceki dönem", num: true }, "Değişim", { ad: "Kişi", num: true },
    { ad: "Toplam süre", num: true }, { ad: "Açılış başına", num: true }, { ad: "Süre payı", num: true }],
    adlar.map(a => {
      const f = d.oa == null ? null : farkYazi({ simdi: ac[a] || 0, once: acO[a] || 0 });
      return [ekranAdi(a), sayi(ac[a]), d.oa == null ? "-" : sayi(acO[a]), f ? f.metin : "-", sayi(kisi[a]?.size),
        { d: sure(sn[a]) || "0 sn", s: sn[a] || 0 }, { d: ac[a] ? sure((sn[a] || 0) / ac[a]) : "-", s: ac[a] ? (sn[a] || 0) / ac[a] : 0 }, yuzde(sn[a] || 0, topSn, 1)];
    }), { sirala: [5, "desc"], bos: "Bu dönemde ekran verisi yok." }),
    not("Olay kaydından (installs/*/events: screen ve screen_time). Sürüm filtresi uygulanır.")));
  const g = izgara(c);
  grafikKart(g, "Süreye göre", k => yatayCubuk(k, Object.fromEntries(adlar.map(a => [ekranAdi(a), Math.round((sn[a] || 0) / 60)])), { limit: 12 }), "dakika");
  grafikKart(g, "Kapatıldığı ekran", k => yatayCubuk(k, dagilim(kurulumlar(), i => ekranAdi(i.lastScreen))), "Kurulumun son kapattığı ekran (lastScreen).");
  // Gecisler: ayni kurulumda art arda acilan iki ekran
  const gec = {};
  const ekr = E.filter(e => e.e === "screen" && icinde(e.t, d.a, d.b)).sort((a, b) => a.i.localeCompare(b.i) || a.t - b.t);
  for (let n = 1; n < ekr.length; n++) if (ekr[n].i === ekr[n - 1].i && ekr[n].t - ekr[n - 1].t < 30 * 60e3) {
    const k = `${ekranAdi(ekr[n - 1].p)} → ${ekranAdi(ekr[n].p)}`; gec[k] = (gec[k] || 0) + 1;
  }
  grafikKart(c, "En sık geçişler", k => yatayCubuk(k, gec, { limit: 15 }), "Aynı kurulumda 30 dakika içinde art arda açılan iki ekran.");
}

function paywall(c) {
  const S = veri.sales;
  const sk = kart("Mağaza (panel/sales)");
  c.appendChild(sk);
  if (!S || !S.gun) sk.appendChild(not(`Mağaza verisi yok${S?.uretim ? ` (son çekim ${tarihTam(S.uretim)}, 0 gün)` : ""}. scripts/lab/panel-yaz.mjs her sabah App Store ve Play raporlarından yazar; uygulama mağazada yayına çıkınca dolar.`));
  else {
    const para = Object.entries(S.gelir || {}).map(([k, v]) => `${sayiOn(v, 2)} ${k}`).join(" · ") || "0";
    sk.appendChild(tiles([["İndirme", sayi(S.indirme), `${sayi(S.gun)} gün`], ["Güncelleme", sayi(S.guncelleme)], ["Satın alma", sayi(S.iap)], ["Gelir", para], ["Son çekim", tarihTam(S.uretim)]]));
    const gk = kutu(); sk.appendChild(gk);
    gunlukCubuk(gk, (S.gunluk || []).map(g => ({ t: g.tarih, indirme: +g.indirme || 0, guncelleme: +g.guncelleme || 0 })), { seriler: [{ ad: "İndirme", alan: "indirme" }, { ad: "Güncelleme", alan: "guncelleme" }] });
    if (Object.keys(S.ulkeler || {}).length) { const hk = kutu(); sk.appendChild(hk); dunyaHaritasi(hk, S.ulkeler, { birim: "indirme" }).catch(() => {}); }
  }
  c.appendChild(kart("Satın alma yok", not("Matchday ücretsiz; uygulamada abonelik, satın alma ya da paywall yok (IAP ileride, fikir: \"kendi puanını gör\" premium). Bu sayfa telemetriye paywall olayları eklenince dolar: hangi kaynaktan açıldı, ne kadar açık kaldı, huni ve kaynak başına dönüşüm, alıcı listesi ve gelir (panel/sales)."),
    not("Uygulamaya eklenecekler (paywall gelince): ev.pw_view_<kaynak>, ev.pw_close_<kaynak> + saniye, ev.pw_plan_<plan>, ev.pw_buy_tap_<kaynak>, ev.pw_buy_<kaynak>, sayaçlar paywall_views ve purchases; kurulumda pro, plan, purchasedAt, buySource. Mağaza parası için scripts/lab/panel-yaz.mjs'e matchday satırı.")));
  const k = kutu();
  c.appendChild(kart("Huni (veri yok)", k));
  huni(k, [["Paywall gördü", 0], ["Plan seçti", 0], ["Satın almaya bastı", 0], ["Aldı", 0]]);
}

function kullanim(c) {
  const E = olaylar(), d = simdiD(), ins = kurulumlar();
  // Sayaclar: stats/{gun} (UTC gun; surume bolunemez)
  const gunIc = (g, a, b) => { const t = Date.parse(g.id + "T12:00:00Z"); return t >= a && t < b; };
  const sayac = (a, b) => { const o = {}; for (const g of veri.days) if (gunIc(g, a, b)) for (const k of Object.keys(SAYAC)) o[k] = (o[k] || 0) + (+g[k] || 0); return o; };
  const s = sayac(d.a, d.b), so = d.oa == null ? null : sayac(d.oa, d.ob);
  c.appendChild(tiles(Object.entries(SAYAC).map(([k, a]) => [a, sayi(s[k]), donemAdi(), so ? fark(s[k] || 0, so[k] || 0) : undefined])));
  c.appendChild(not("Sayaçlar stats/{gün} belgelerinden (UTC günü); sürüm filtresi bu kutulara uygulanmaz."));

  // Eylemler (olaylardan)
  const hesap = (a, b) => { const o = {}; for (const e of E) if (icinde(e.t, a, b) && !["screen", "screen_time", "session"].includes(e.e)) { const k = e.e + "|" + (e.p || ""); (o[k] ||= { n: 0, kisi: new Set() }).n++; o[k].kisi.add(e.i); } return o; };
  const ey = hesap(d.a, d.b), eyO = d.oa == null ? {} : hesap(d.oa, d.ob);
  const anahtarlar = [...new Set([...Object.keys(ey), ...Object.keys(eyO)])];
  c.appendChild(kart("Eylemler", veriTablo([{ ad: "Eylem", filtre: true }, { ad: "Ayrıntı", filtre: true }, { ad: "Adet", num: true }, { ad: "Kişi", num: true },
    { ad: "Önceki dönem", num: true }, "Değişim"],
    anahtarlar.map(k => { const [e, p] = k.split("|"); const f = d.oa == null ? null : farkYazi({ simdi: ey[k]?.n || 0, once: eyO[k]?.n || 0 });
      return [EYLEM[e] || e, PARAM[p] || p || "-", sayi(ey[k]?.n), sayi(ey[k]?.kisi.size), d.oa == null ? "-" : sayi(eyO[k]?.n), f ? f.metin : "-"]; }),
    { sirala: [2, "desc"], bos: "Bu dönemde eylem yok." }), not("Olay kaydından; sürüm filtresi uygulanır.")));

  const enCok = Object.entries(dagilim(E.filter(e => icinde(e.t, d.a, d.b) && !["screen", "screen_time", "session"].includes(e.e)), e => e.e))
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
  if (enCok.length) grafikKart(c, "Günlük eylemler (en sık 5)", k => gunlukCubuk(k, gunlukSeri(Object.fromEntries(enCok.map(e => [e, gunluk(E.filter(x => x.e === e), x => x.t)]))),
    { seriler: enCok.map(e => ({ ad: EYLEM[e] || e, alan: e })) }));

  const g = izgara(c);
  const ses = E.filter(e => e.e === "session" && icinde(e.t, d.a, d.b));
  const KOVA = [["10 sn altı", 10], ["10-30 sn", 30], ["30-60 sn", 60], ["1-3 dk", 180], ["3-10 dk", 600], ["10-30 dk", 1800], ["30 dk üstü", Infinity]];
  const kova = {}; for (const [a] of KOVA) kova[a] = 0;
  for (const e of ses) { const k = KOVA.find(([, ust]) => (e.s || 0) < ust); kova[k[0]]++; }
  grafikKart(g, "Oturum süresi dağılımı", k => gunlukCubuk(k, KOVA.map(([a]) => ({ t: a, v: kova[a] })), { birim: "oturum", ozet: false }),
    `${sayi(ses.length)} oturum · ortalama ${sure(ortalama(ses.map(e => e.s || 0))) || "0 sn"} · medyan ${sure(medyan(ses.map(e => e.s || 0))) || "0 sn"}`);
  grafikKart(g, "Ne zaman açılıyor", k => saatIsi(k, saatMatrisi(E.filter(e => e.e === "screen" && icinde(e.t, d.a, d.b)).map(e => new Date(e.t))), { birim: "ekran açılışı" }));

  const huniK = kutu();
  c.appendChild(kart("Kurulumdan maça huni", huniK, not("Kurulum belgesinin anlık alanlarından (onboarded, signedIn, uid, n_*). Sürüm filtresi uygulanır.")));
  huni(huniK, [["Kurulum", ins.length], ["Tanıtımı bitirdi", ins.filter(i => i.onboarded).length], ["Giriş yaptı", ins.filter(i => i.signedIn).length],
    ["Profili var", ins.filter(i => i.uid && veri.userMap.has(i.uid)).length], ["Bir maçta", ins.filter(i => +i.n_matches > 0).length],
    ["Maç oynadı", ins.filter(i => +i.n_played > 0).length], ["Maç organize etti", ins.filter(i => +i.n_organised > 0).length]], { birim: "kurulum" });

  const g3 = izgara(c, 3);
  grafikKart(g3, "Giriş yöntemi", k => yatayCubuk(k, dagilim(E.filter(e => e.e === "sign_in"), e => PARAM[e.p] || e.p || "?")), "Olaylardan, tüm zamanlar.");
  grafikKart(g3, "Bildirim izni", k => yatayCubuk(k, dagilim(ins, i => `${PLAT(i.platform)}: ${i.notif ? (i.fcm ? "izin + adres" : "izin, adres yok") : "kapalı"}`)));
  grafikKart(g3, "Saat uygulaması", k => yatayCubuk(k, dagilim(ins, i => `${PLAT(i.platform)}: ${i.watch ? "kullanıyor" : "yok"}`)),
    `Saatten gelen sonuç: ${sayi(E.filter(e => e.e === "watch_result").length)} · saatten kaydedilen: ${sayi(E.filter(e => e.e === "result_save" && e.p === "watch").length)}`);
  const ort = (f) => sayiOn(ortalama(ins.filter(i => i.signedIn).map(f)));
  c.appendChild(kart("Girişli kurulum başına ortalama", tiles([
    ["Maç", ort(i => +i.n_matches || 0)], ["Yaklaşan", ort(i => +i.n_upcoming || 0)], ["Oynanan", ort(i => +i.n_played || 0)],
    ["Organize", ort(i => +i.n_organised || 0)], ["Takip", ort(i => +i.n_following || 0)], ["Oyuncu listesi", ort(i => +i.n_players || 0)],
    ["Oturum", ort(i => +i.sessions || 0)], ["Toplam süre", sure(ortalama(ins.filter(i => i.signedIn).map(i => evSay(i, "session_sec")))) || "0 sn"],
  ])));
}
const medyan = l => { if (!l.length) return 0; const s = l.slice().sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

function kullanicilar(c) {
  const ins = kurulumlar();
  c.appendChild(tiles([
    ["Kurulum", sayi(ins.length)], ["Girişli", sayi(ins.filter(i => i.signedIn).length)],
    ["Bildirim ulaşılır", sayi(ins.filter(i => i.fcm && i.notif !== false).length), "izin + cihaz adresi"],
    ["Şu an açık", sayi(ins.filter(onlineMi).length)], ["Test (yönetici)", sayi(ins.filter(i => i.tester).length)],
    ["Saat kullanan", sayi(ins.filter(i => i.watch).length)],
  ]));
  const sirali = ins.slice().sort((a, b) => ms(b.lastSeen) - ms(a.lastSeen));
  c.appendChild(kart(null, veriTablo([
    "Kişi", { ad: "Son görülme aralığı", filtre: true }, "Son görülme", { ad: "Platform", filtre: true }, { ad: "Sürüm", filtre: true }, "Build",
    { ad: "Ülke", filtre: true }, { ad: "Dil", filtre: true }, { ad: "Hesap", filtre: true }, { ad: "Bildirim", filtre: true },
    { ad: "Onboarding", filtre: true }, { ad: "Saat", filtre: true }, { ad: "Görünüm", filtre: true }, { ad: "Test", filtre: true },
    { ad: "Cihaz", filtre: true }, "OS", { ad: "Ekran", filtre: true }, "İlk görülme", { ad: "Gün", num: true }, { ad: "Oturum", num: true },
    { ad: "Toplam süre", num: true }, { ad: "Maç", num: true }, { ad: "Oynanan", num: true }, { ad: "Organize", num: true },
    { ad: "Takip", num: true }, { ad: "Oyuncu listesi", num: true }, "Saat dilimi",
  ], sirali.map(i => [
    kurulumKisi(i), sonGorulmeKova(i), tarihHucre(i.lastSeen), PLAT(i.platform), i.appVersion || "?", i.build || "", i.region || "?",
    DIL[i.language] || i.language || "?", i.signedIn ? "Girişli" : "Girişsiz",
    i.notif ? (i.fcm ? "İzin + adres" : "İzin, adres yok") : "Kapalı", i.onboarded ? "Bitti" : "Bitmedi", i.watch ? "Kullanıyor" : "Yok",
    GORUNUM[i.appearance] || i.appearance || "?", i.tester ? "Test" : "Gerçek", i.device || "?", i.os || "", onlineMi(i) ? ekranAdi(i.screen) : "Kapalı",
    tarihHucre(i.firstSeen), gunYas(i.firstSeen) ?? "-", sayi(i.sessions), { d: sure(evSay(i, "session_sec")) || "0 sn", s: evSay(i, "session_sec") },
    sayi(i.n_matches), sayi(i.n_played), sayi(i.n_organised), sayi(i.n_following), sayi(i.n_players), i.tz || "",
  ]), { sirala: [2, "desc"], araYazi: "Ara: @kullanıcı, ad, kimlik, cihaz", satirTik: (_, n) => kisiAc(sirali[n]) })));
  c.appendChild(not("Kişi: hesabı varsa @kullanıcı adı, yoksa kurulum kimliğinin ilk 8 hanesi. Bildirim adresi users/{uid}/tokens'tan (yalnız girişli). Test: senin hesabının kurulumu. Satıra dokun: ayrıntı ve zaman çizelgesi."));
}

function kisiAc(i) {
  const u = veri.userMap.get(i.uid);
  const E = (veri.evBy.get(i.id) || []).slice().sort((a, b) => b.t - a.t);
  const ekr = {};
  for (const e of E) if (e.e === "screen_time") ekr[e.p] = (ekr[e.p] || 0) + (e.s || 0);
  const eyl = dagilim(E.filter(e => !["screen", "screen_time", "session"].includes(e.e)), e => eylemAdi(e.e, e.p));
  const ulasir = i.fcm && i.notif !== false;
  const sos = u ? sosyalOzet(u.id) : null;
  kullaniciCekmecesi(i, [
    ["Şu an", onlineMi(i) ? `Açık: ${ekranAdi(i.screen)}` : `Kapalı (son ekran ${ekranAdi(i.lastScreen) || "-"})`],
    ["Son görülme", tarihTam(i.lastSeen)], ["İlk görülme", `${tarihTam(i.firstSeen)}${gunYas(i.firstSeen) != null ? ` · ${gunYas(i.firstSeen)} gün önce` : ""}`],
    ["Sürüm", `${PLAT(i.platform)} ${i.appVersion || "?"} (${i.build || "?"})`], ["Cihaz", `${i.device || "-"} · ${i.os || "-"}`],
    ["Dil / ülke", `${DIL[i.language] || i.language || "-"} / ${i.region || "-"}`], ["Saat dilimi", i.tz || "-"],
    ["Görünüm", GORUNUM[i.appearance] || i.appearance || "-"], ["Saat uygulaması", i.watch ? "Kullanıyor" : "Yok"],
    ["Onboarding", i.onboarded ? "Bitti" : "Bitmedi"], ["Hesap", i.signedIn ? `Girişli${i.uid ? ` · uid ${kisa(i.uid)}` : ""}` : "Girişsiz"],
    ["Bildirim", `${i.notif ? "İzin var" : i.notif === false ? "Kapalı" : "Bilinmiyor"} · ${i.fcm ? "cihaz adresi var" : "cihaz adresi yok"}`],
    ["Test", i.tester ? "Evet (yönetici hesabı)" : "Hayır"],
    { baslik: "Kullanım" },
    ["Oturum", `${sayi(i.sessions)} · toplam ${sure(evSay(i, "session_sec")) || "0 sn"}${evSay(i, "session") ? ` · ortalama ${sure(evSay(i, "session_sec") / evSay(i, "session"))}` : ""}`],
    ["Maç", `${sayi(i.n_matches)} maç · ${sayi(i.n_upcoming)} yaklaşan · ${sayi(i.n_played)} oynanan · ${sayi(i.n_organised)} organize`],
    ["Takip / oyuncu listesi", `${sayi(i.n_following)} takip · ${sayi(i.n_players)} hesapsız oyuncu`],
    ["Sayaçlar", Object.entries(SAYAC).map(([k, a]) => `${a} ${sayi(i[k])}`).join(" · ")],
    ...(u ? [{ baslik: "Hesap (users)" }, ["Ad", `${u.name} @${u.handle}`], ["Mevki", (u.positions || []).map(p => POZ[p] || p).join(", ") || "-"],
      ["Kayıt", tarihTam(u.createdAt)], ["Uygulama dili", DIL[u.lang] || u.lang || "telefon"], ["Biyografi", u.bio || "-"],
      ["Sosyal", `${sayi(sos.mac)} maç · ${sayi(sos.gol)} gol · ${sayi(sos.asist)} asist · ${sayi(sos.verdi)} oy verdi · ${sayi(sos.aldi)} oy aldı`],
      ["Takip", `${sayi(sos.takipci)} takipçi · ${sayi(sos.takip)} takip`],
      ["Profilde puan", u.rating ? `${sayiOn(u.rating.overall)} (${sayi(u.rating.count)} oy, ${tarihTam(u.rating.publishedAt)})` : "Yayınlanmadı"]] : []),
  ], {
    baslik: kurulumKisi(i), alt: `${PLAT(i.platform)} · ${i.appVersion || "?"} · ${i.region || "?"} · ${i.id}`,
    eylemler: [
      { ad: "Bu kişiye bildirim gönder", kapali: !ulasir, not: ulasir ? "" : "Cihaz adresi yok ya da bildirim kapalı.", tik: kapat => { kapat(); kisiyeBildirim(i.id); K.git("bildirim"); } },
      ...(u ? [{ ad: "Oyuncu profilini aç", ikincil: true, tik: kapat => { kapat(); oyuncuAc(u); } }] : []),
    ],
    hamAlanlar: true,
    ek: k => {
      k.appendChild(el("h2", "cek-ara", "Ekranlarda geçen süre"));
      const y = kutu(); k.appendChild(y); yatayCubuk(y, Object.fromEntries(Object.entries(ekr).map(([a, v]) => [ekranAdi(a), Math.round(v / 6) / 10])), { limit: 10 });
      if (Object.keys(eyl).length) { k.appendChild(el("h2", "cek-ara", "Eylemler")); const z = kutu(); k.appendChild(z); yatayCubuk(z, eyl, { limit: 15 }); }
      zamanCizelgesi(k, E);
    },
  });
}

function zamanCizelgesi(k, E) {
  k.appendChild(el("h2", "cek-ara", "Zaman çizelgesi"));
  if (!E.length) { k.appendChild(not("Olay yok (bu kurulum olay kaydından önce ya da hiç açılmadı).")); return; }
  k.appendChild(not(`Son ${sayi(Math.min(E.length, 400))} olay, en yenisi üstte.`));
  let gunM = "";
  for (const e of E.filter(x => x.e !== "screen_time").slice(0, 400)) {
    const g = tarihTam(e.t, { saatsiz: true });
    if (g !== gunM) { k.appendChild(el("h2", "cek-ara", g)); gunM = g; }
    const r = el("div", "ev");
    const t = el("span", "t"); t.textContent = tarihTam(e.t).split(" ").pop();
    const a = el("span"); a.textContent = e.e === "screen" ? `Ekran: ${ekranAdi(e.p)}` : e.e === "session" ? "Oturum bitti" : eylemAdi(e.e, e.p);
    const s = el("span", "muted"); s.textContent = e.e === "session" ? sure(e.s) : e.s ? sure(e.s) : "";
    r.append(t, a, s); k.appendChild(r);
  }
}

function analytics(c) {
  c.appendChild(kart("Firebase Analytics bağlı değil", not("Matchday'de Firebase Analytics (GA4) yok; bu panelin bütün sayıları kendi telemetrisinden (installs, events, stats) ve uygulama verisinden. GA4 eklenirse scripts/lab/ga4.mjs özeti buraya gelir.")));
  const gunler = veri.days.slice().sort((a, b) => b.id.localeCompare(a.id));
  const sutun = Object.keys(SAYAC);
  grafikKart(c, "Günlük sayaçlar (stats)", k => gunlukCubuk(k, gunleriDoldur(Object.fromEntries(veri.days.map(g => [g.id, { oturum: +g.sessions || 0, kurulum: +g.installs_new || 0 }])), ...gunAraligi()),
    { seriler: [{ ad: "Oturum", alan: "oturum" }, { ad: "Yeni kurulum", alan: "kurulum" }] }), "UTC günleri; sürüm filtresi uygulanmaz.");
  c.appendChild(kart("Ham günlük sayaçlar", veriTablo(["Gün", ...sutun.map(k => ({ ad: SAYAC[k], num: true })), { ad: "Olay anahtarı", num: true }],
    gunler.map(g => [{ d: tarihTam(g.id), s: Date.parse(g.id) }, ...sutun.map(k => sayi(g[k])), sayi(Object.keys(g.ev || {}).length)]),
    { sirala: [0, "desc"], satirTik: (_, n) => kullaniciCekmecesi(gunler[n], [], { baslik: tarihTam(gunler[n].id), alt: "stats/" + gunler[n].id, hamAlanlar: true }) })));
}

// ════════════════════════════════════════════════════════════════════════
// SOSYAL
// ════════════════════════════════════════════════════════════════════════

function sosyalOzet(uid) {
  let mac = 0, org = 0, gol = 0, asist = 0, galibiyet = 0;
  for (const m of veri.matches) {
    const icinde = (m.memberUids || []).includes(uid);
    if (icinde) mac++;
    if (m.adminUid === uid) org++;
    for (const [k, s] of Object.entries(m.stats || {})) if (resolve(k) === uid) { gol += +s.goals || 0; asist += +s.assists || 0; }
    if (m.status === "played" && m.homeScore != null && m.homeScore !== m.awayScore) {
      const kazanan = m.homeScore > m.awayScore ? m.home : m.away;
      if ((kazanan?.uids || []).map(resolve).includes(uid)) galibiyet++;
    }
  }
  const verdiL = veri.ratings.filter(r => r.raterUid === uid), aldiL = veri.ratings.filter(r => resolve(r.ratedUid) === uid);
  return { mac, org, gol, asist, galibiyet, verdi: verdiL.length, aldi: aldiL.length,
    ort: aldiL.length ? ortalama(aldiL.map(r => +r.scores?.overall || 0)) : null, verdigiOrt: verdiL.length ? ortalama(verdiL.map(r => +r.scores?.overall || 0)) : null,
    takipci: veri.follows.filter(f => f.followedUid === uid).length, takip: veri.follows.filter(f => f.followerUid === uid).length,
    engelledi: (veri.userMap.get(uid)?.blocked || []).length, engellendi: veri.users.filter(u => (u.blocked || []).includes(uid)).length,
    sikayet: veri.reports.filter(r => r.targetUid === uid).length };
}

function oyuncular(c) {
  surumNotu(c);
  const [yeni, yeniO] = say(veri.users, u => ms(u.createdAt));
  const ozet = new Map(veri.users.map(u => [u.id, sosyalOzet(u.id)]));
  c.appendChild(tiles([
    ["Hesap", sayi(veri.users.length)], ["Yeni hesap", sayi(yeni), donemAdi(), fark(yeni, yeniO)],
    ["Hesapsız oyuncu", sayi(veri.players.length), "organizatör listeleri"], ["Hesaba bağlanan", sayi(veri.players.filter(p => p.linkedUid).length)],
    ["Profilde puan", sayi(veri.users.filter(u => u.rating).length), "yayınlanmış"], ["Engelleme", sayi(veri.users.reduce((a, u) => a + (u.blocked || []).length, 0))],
    ["Fotoğraflı", sayi(veri.users.filter(u => u.photoAt).length)], ["Biyografili", sayi(veri.users.filter(u => u.bio).length)],
  ]));
  const g = izgara(c, 3);
  grafikKart(g, "Günlük yeni hesap", k => gunlukCubuk(k, gunlukSeri({ v: gunluk(veri.users, u => ms(u.createdAt)) }), { birim: "hesap" }));
  grafikKart(g, "Mevki", k => yatayCubuk(k, (() => { const h = {}; for (const u of veri.users) for (const p of u.positions || []) h[POZ[p] || p] = (h[POZ[p] || p] || 0) + 1; return h; })()));
  grafikKart(g, "Uygulama dili", k => yatayCubuk(k, dagilim(veri.users, u => DIL[u.lang] || "Telefonun dili")));
  const liste = veri.users.slice().sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
  c.appendChild(kart("Hesaplar", veriTablo([
    "Ad", "Kullanıcı adı", { ad: "Mevki", filtre: true }, { ad: "Dil", filtre: true }, "Kayıt", { ad: "Maç", num: true }, { ad: "Organize", num: true },
    { ad: "Gol", num: true }, { ad: "Asist", num: true }, { ad: "Galibiyet", num: true }, { ad: "Oy verdi", num: true }, { ad: "Oy aldı", num: true },
    { ad: "Aldığı ort.", num: true }, { ad: "Profilde", filtre: true }, { ad: "Takipçi", num: true }, { ad: "Takip", num: true },
    { ad: "Şikayet", num: true }, { ad: "Kurulum", filtre: true }, "Son görülme",
  ], liste.map(u => {
    const s = ozet.get(u.id), ins = veri.insBy.get(u.id) || [];
    return [u.name || "", "@" + (u.handle || ""), (u.positions || []).map(p => POZ[p] || p).join(", ") || "-", DIL[u.lang] || "Telefon", tarihHucre(u.createdAt),
      sayi(s.mac), sayi(s.org), sayi(s.gol), sayi(s.asist), sayi(s.galibiyet), sayi(s.verdi), sayi(s.aldi), s.ort == null ? "-" : sayiOn(s.ort),
      u.rating ? "Yayında" : "Yok", sayi(s.takipci), sayi(s.takip), sayi(s.sikayet), ins.length ? [...new Set(ins.map(i => PLAT(i.platform)))].join(", ") : "Telemetri yok",
      ins.length ? tarihHucre(Math.max(...ins.map(i => ms(i.lastSeen)))) : ""];
  }), { sirala: [4, "desc"], satirTik: (_, n) => oyuncuAc(liste[n]) })));
  const pl = veri.players.slice().sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
  c.appendChild(kart("Hesapsız oyuncular (organizatör listeleri)", veriTablo([
    "Ad", { ad: "Mevki", filtre: true }, { ad: "Ekleyen", filtre: true }, { ad: "Durum", filtre: true }, { ad: "Maç", num: true }, { ad: "Oy aldı", num: true }, "Not", "Kayıt",
  ], pl.map(p => [p.name || "", (p.positions || []).map(x => POZ[x] || x).join(", ") || "-", kimlik(p.ownerUid),
    p.linkedUid ? `@${veri.userMap.get(p.linkedUid)?.handle || "?"} ile bağlı` : "Hesapsız",
    sayi(veri.matches.filter(m => (m.guestIds || []).includes(p.id)).length), sayi(veri.ratings.filter(r => r.ratedUid === p.id).length), p.notes || "", tarihHucre(p.createdAt)]),
  { sirala: [7, "desc"], satirTik: (_, n) => misafirAc(pl[n]) }), not("Bu listeyi yalnız ekleyen organizatör ve admin görür.")));
}

function oyuncuAc(u) {
  const s = sosyalOzet(u.id), ins = veri.insBy.get(u.id) || [];
  const ulasir = ins.find(i => i.fcm && i.notif !== false);
  const maclar = veri.matches.filter(m => (m.memberUids || []).includes(u.id)).sort((a, b) => ms(b.startsAt) - ms(a.startsAt));
  kullaniciCekmecesi(u, [
    ["Ad", u.name], ["Kullanıcı adı", "@" + u.handle], ["Mevki", (u.positions || []).map(p => POZ[p] || p).join(", ") || "-"],
    ["Kayıt", tarihTam(u.createdAt)], ["Uygulama dili", DIL[u.lang] || "telefon"], ["Biyografi", u.bio || "-"], ["Fotoğraf", u.photoAt ? tarihTam(u.photoAt) : "Yok"],
    { baslik: "Sahada" },
    ["Maç", `${sayi(s.mac)} maç · ${sayi(s.org)} organize · ${sayi(s.galibiyet)} galibiyet`], ["Gol / asist", `${sayi(s.gol)} / ${sayi(s.asist)}`],
    ["Oy", `${sayi(s.verdi)} verdi (ort. ${s.verdigiOrt == null ? "-" : sayiOn(s.verdigiOrt)}) · ${sayi(s.aldi)} aldı (ort. ${s.ort == null ? "-" : sayiOn(s.ort)})`],
    ["Profilde puan", u.rating ? `${sayiOn(u.rating.overall)} · ${sayi(u.rating.count)} oy · ${tarihTam(u.rating.publishedAt)}` : "Yayınlanmadı"],
    { baslik: "Sosyal" },
    ["Takip", `${sayi(s.takipci)} takipçi · ${sayi(s.takip)} takip`], ["Engelleme", `${sayi(s.engelledi)} kişiyi engelledi · ${sayi(s.engellendi)} kişi engelledi`],
    ["Şikayet", `${sayi(s.sikayet)} şikayet hakkında`],
    ["Kurulum", ins.length ? ins.map(i => `${PLAT(i.platform)} ${i.appVersion || ""} (${tarihTam(i.lastSeen)})`).join(" · ") : "Telemetri yok (eski sürüm ya da hiç açmadı)"],
  ], {
    baslik: `${u.name} @${u.handle}`, alt: `uid ${u.id}`,
    eylemler: [
      { ad: "Bu kişiye bildirim gönder", kapali: !ulasir, tik: kapat => { kapat(); kisiyeBildirim(ulasir.id); K.git("bildirim"); } },
      ...(ins[0] ? [{ ad: "Kurulumu aç", ikincil: true, tik: kapat => { kapat(); kisiAc(ins[0]); } }] : []),
      { ad: "Yayınlanmış puanı kaldır", ikincil: true, kapali: !u.rating, tik: () => islem("Profildeki puan kaldırılsın mı?", [["Kişi", esc(`${u.name} @${u.handle}`)]], "Kaldır",
        () => updateDoc(doc(db, "users", u.id), { rating: deleteField() })) },
      { ad: "Biyografiyi temizle", ikincil: true, kapali: !u.bio, tik: () => islem("Biyografi silinsin mi?", [["Kişi", esc(`${u.name} @${u.handle}`)], ["Metin", esc(u.bio)]], "Temizle",
        () => updateDoc(doc(db, "users", u.id), { bio: "" })) },
    ],
    hamAlanlar: true,
    ek: k => {
      k.appendChild(el("h2", "cek-ara", "Maçları"));
      k.appendChild(veriTablo(["Maç", "Zaman", { ad: "Durum", filtre: true }, "Rol"], maclar.map(m => [macAdi(m.id), tarihHucre(m.startsAt), MAC_DURUM[m.status] || m.status,
        m.adminUid === u.id ? "Organizatör" : m.captainUid === u.id ? "Kaptan" : "Oyuncu"]), { bos: "Maç yok.", satirTik: (_, n) => macAc(maclar[n]) }));
    },
  });
}

function misafirAc(p) {
  kullaniciCekmecesi(p, [["Ad", p.name], ["Mevki", (p.positions || []).map(x => POZ[x] || x).join(", ") || "-"], ["Ekleyen", kimlik(p.ownerUid)],
    ["Durum", p.linkedUid ? `${kimlik(p.linkedUid)} hesabına bağlı` : "Hesapsız"], ["Not", p.notes || "-"], ["Kayıt", tarihTam(p.createdAt)],
    ["Maç", sayi(veri.matches.filter(m => (m.guestIds || []).includes(p.id)).length)], ["Oy aldı", sayi(veri.ratings.filter(r => r.ratedUid === p.id).length)]], {
    baslik: p.name, alt: `players/${p.id}`, hamAlanlar: true,
    eylemler: [{ ad: "Oyuncu kaydını sil", ikincil: true, tik: () => islem("Hesapsız oyuncu kaydı silinsin mi?", [["Ad", esc(p.name)], ["Ekleyen", esc(kimlik(p.ownerUid))]], "Sil",
      () => deleteDoc(doc(db, "players", p.id))) }],
  });
}

function maclar(c) {
  surumNotu(c);
  const M = veri.matches, d = simdiD();
  const [yeni, yeniO] = say(M, m => ms(m.createdAt));
  const [oyn, oynO] = say(M.filter(m => m.status === "played"), m => ms(m.startsAt));
  const oySay = new Map(); for (const r of veri.ratings) oySay.set(r.matchId, (oySay.get(r.matchId) || 0) + 1);
  const oyVeren = new Map(); for (const r of veri.ratings) { if (!oyVeren.has(r.matchId)) oyVeren.set(r.matchId, new Set()); oyVeren.get(r.matchId).add(r.raterUid); }
  const kisiS = m => (m.memberUids?.length || 0) + (m.guests?.length || 0);
  const played = M.filter(m => m.status === "played");
  c.appendChild(tiles([
    ["Maç", sayi(M.length), "toplam"], ["Yeni maç", sayi(yeni), donemAdi(), fark(yeni, yeniO)], ["Oynanan", sayi(oyn), donemAdi(), fark(oyn, oynO)],
    ["Yaklaşan", sayi(M.filter(m => m.status === "upcoming" && ms(m.startsAt) > Date.now()).length)], ["İptal", sayi(M.filter(m => m.status === "cancelled").length)],
    ["Açık maç", yuzde(M.filter(m => m.visibility === "public").length, M.length)], ["Ortalama oyuncu", sayiOn(ortalama(M.map(kisiS)))],
    ["Oy verilen maç", yuzde(played.filter(m => oySay.get(m.id)).length, played.length), `${sayi(played.filter(m => oySay.get(m.id)).length)} / ${sayi(played.length)}`],
    ["Sonuç girilen", yuzde(played.filter(m => m.homeScore != null).length, played.length)], ["Kaptanlı", sayi(M.filter(m => m.captainUid).length)],
  ]));
  const g = izgara(c);
  grafikKart(g, "Günlük maç", k => gunlukCubuk(k, gunlukSeri({ olusan: gunluk(M, m => ms(m.createdAt)), oynanan: gunluk(played, m => ms(m.startsAt)) }),
    { seriler: [{ ad: "Oluşturulan", alan: "olusan" }, { ad: "Oynanan", alan: "oynanan" }] }));
  grafikKart(g, "Maç saatleri", k => saatIsi(k, saatMatrisi(M.map(m => zaman(m.startsAt)).filter(Boolean)), { birim: "maç" }), "Başlama saati, Türkiye saati, bütün maçlar.");
  const g3 = izgara(c, 3);
  grafikKart(g3, "Durum", k => yatayCubuk(k, dagilim(M, m => MAC_DURUM[m.status] || m.status)));
  grafikKart(g3, "Şehir", k => yatayCubuk(k, dagilim(M, m => m.city || "?"), { limit: 8 }));
  grafikKart(g3, "Kapasite", k => yatayCubuk(k, dagilim(M, m => `${m.maxPlayers || "?"} kişilik`)));
  const liste = M.slice().sort((a, b) => ms(b.startsAt) - ms(a.startsAt));
  c.appendChild(kart("Maçlar", veriTablo([
    "Maç", "Saha", { ad: "Şehir", filtre: true }, "Başlama", { ad: "Durum", filtre: true }, { ad: "Görünürlük", filtre: true }, { ad: "Organizatör", filtre: true },
    "Kaptan", { ad: "Oyuncu", num: true }, { ad: "Misafir", num: true }, { ad: "Kapasite", num: true }, "Skor", { ad: "Gol", num: true },
    { ad: "Oy", num: true }, { ad: "Oy veren", num: true }, { ad: "Geliyor", num: true }, { ad: "Gelmiyor", num: true }, { ad: "An", num: true }, { ad: "Süre", num: true }, "Oluşturma",
  ], liste.map(m => {
    const rs = Object.values(m.rsvp || {});
    return [m.title || "-", m.venue || "", m.city || "?", tarihHucre(m.startsAt), MAC_DURUM[m.status] || m.status, m.visibility === "private" ? "Özel" : "Açık",
      kimlik(m.adminUid), m.captainUid ? kimlik(m.captainUid) : "-", sayi(m.memberUids?.length), sayi(m.guests?.length), sayi(m.maxPlayers),
      m.homeScore != null ? `${m.homeScore}:${m.awayScore}` : "-", sayi(Object.values(m.stats || {}).reduce((a, s) => a + (+s.goals || 0), 0)),
      sayi(oySay.get(m.id)), sayi(oyVeren.get(m.id)?.size), sayi(rs.filter(x => x === "in").length), sayi(rs.filter(x => x === "out").length),
      sayi(m.moments?.length), m.durationMin ? `${m.durationMin} dk` : "-", tarihHucre(m.createdAt)];
  }), { sirala: [3, "desc"], satirTik: (_, n) => macAc(liste[n]) })));
}

function macAc(m) {
  const takim = t => (t?.uids || []).map(x => { const s = m.stats?.[x]; return `${ad(x)}${s?.goals ? ` ${s.goals} gol` : ""}${s?.assists ? ` ${s.assists} asist` : ""}${m.matchPositions?.[x] ? ` (${POZ[m.matchPositions[x]] || m.matchPositions[x]})` : ""}`; }).join(", ") || "-";
  const oylar = veri.ratings.filter(r => r.matchId === m.id);
  const rs = Object.entries(m.rsvp || {});
  kullaniciCekmecesi(m, [
    ["Başlık", m.title || "-"], ["Saha", `${m.venue || "-"}${m.address ? ", " + m.address : ""}${m.city ? " · " + m.city : ""}`],
    ["Başlama", `${tarihTam(m.startsAt)} · ${m.durationMin || "?"} dk`], ["Durum", `${MAC_DURUM[m.status] || m.status} · ${m.visibility === "private" ? "Özel" : "Açık"}`],
    ["Organizatör", kimlik(m.adminUid)], ["Kaptan", m.captainUid ? kimlik(m.captainUid) : "-"],
    ["Skor", m.homeScore != null ? `${m.home?.name || "Ev"} ${m.homeScore} : ${m.awayScore} ${m.away?.name || "Deplasman"}` : "-"],
    { baslik: "Kadro" },
    [m.home?.name || "Siyah", takim(m.home)], [m.away?.name || "Beyaz", takim(m.away)],
    ["Üyeler", sayi(m.memberUids?.length)], ["Davetli", (m.invitedUids || []).map(kimlik).join(", ") || "-"], ["İstek", (m.requestedUids || []).map(kimlik).join(", ") || "-"],
    ["Misafir", (m.guests || []).map(g => g.name).join(", ") || "-"], ["Kapasite", sayi(m.maxPlayers)],
    ["Yoklama", rs.length ? rs.map(([u, v]) => `${ad(u)}: ${v === "in" ? "geliyor" : "gelmiyor"}`).join(", ") : "-"], ["Onaylı", sayi(m.confirmed?.length)],
    { baslik: "Sonrası" },
    ["Oy", `${sayi(oylar.length)} oy · ${sayi(new Set(oylar.map(r => r.raterUid)).size)} kişi verdi`], ["Anlar", sayi(m.moments?.length)],
    ["Video", [m.socialLink ? "Sosyal Halısaha kaydı" : "", ...(m.videoLinks || []).map(() => "video linki")].filter(Boolean).join(", ") || "-"],
    ["Oluşturma", tarihTam(m.createdAt)], ["Son değişiklik", tarihTam(m.updatedAt)],
  ], {
    baslik: m.title || m.venue || m.id, alt: `matches/${m.id}`, hamAlanlar: true,
    eylemler: [
      ...(m.mapsURL ? [{ ad: "Haritada aç", ikincil: true, tik: () => window.open(m.mapsURL, "_blank", "noopener") }] : []),
      { ad: "Maçı sil", ikincil: true, tik: () => islem("Maç silinsin mi?", [["Maç", esc(m.title || m.venue)], ["Zaman", esc(tarihTam(m.startsAt))], ["Organizatör", esc(kimlik(m.adminUid))]], "Sil",
        () => deleteDoc(doc(db, "matches", m.id))) },
    ],
    ek: async k => {
      k.appendChild(el("h2", "cek-ara", "Bu maçın oyları"));
      k.appendChild(veriTablo(["Veren", "Alan", ...KAT.map(c => ({ ad: KAT_TR[c], num: true }))], oylar.map(r => [kimlik(r.raterUid), kimlik(r.ratedUid), ...KAT.map(c => r.scores?.[c] ?? "-")]), { bos: "Oy yok." }));
      k.appendChild(el("h2", "cek-ara", "Saatten gelen sonuçlar (onay bekleyen)"));
      if (K.demo) { k.appendChild(not("Demo: sonuç yok.")); return; }
      try {
        const r = (await getDocs(collection(db, "matches", m.id, "results"))).docs.map(d => ({ id: d.id, ...d.data() }));
        k.appendChild(veriTablo(["Gönderen", "Skor", "Zaman"], r.map(x => [kimlik(x.uid || x.id), x.homeScore != null ? `${x.homeScore}:${x.awayScore}` : "-", tarihHucre(x.updatedAt || x.createdAt)]), { bos: "Bekleyen sonuç yok." }));
      } catch (e) { k.appendChild(not("Okunamadı: " + (e.code || e.message))); }
    },
  });
}

/* Puan tablosu: oylarin ortalamasi; "Yayinla" users/{uid}.rating'e yazar.
   Hesapsiz oyuncu bir hesaba baglandiysa oylari o hesaba eklenir. */
function topla() {
  const acc = new Map();
  for (const r of veri.ratings) {
    const id = resolve(r.ratedUid);
    const a = acc.get(id) ?? { n: 0, sum: {}, cnt: {}, matches: new Set() };
    a.n++; a.matches.add(r.matchId);
    for (const c of KAT) if (typeof r.scores?.[c] === "number") { a.sum[c] = (a.sum[c] ?? 0) + r.scores[c]; a.cnt[c] = (a.cnt[c] ?? 0) + 1; }
    acc.set(id, a);
  }
  return [...acc].map(([id, a]) => ({ id, n: a.n, m: a.matches.size, avg: Object.fromEntries(KAT.map(c => [c, a.cnt[c] ? a.sum[c] / a.cnt[c] : null])) }))
    .sort((x, y) => (y.avg.overall ?? 0) - (x.avg.overall ?? 0));
}

let enAzOy = 3;
function puanlar(c) {
  surumNotu(c);
  const R = veri.ratings;
  const [oy, oyO] = say(R, r => ms(r.createdAt));
  const tab = topla();
  c.appendChild(tiles([
    ["Oy", sayi(R.length), "toplam"], ["Yeni oy", sayi(oy), donemAdi(), fark(oy, oyO)], ["Oy veren", sayi(new Set(R.map(r => r.raterUid)).size)],
    ["Puanlanan", sayi(tab.length)], ["Genel ortalama", R.length ? sayiOn(ortalama(R.map(r => +r.scores?.overall || 0))) : "-"],
    ["Profilde yayında", sayi(veri.users.filter(u => u.rating).length)], ["Görünürlük", { off: "Kapalı", self: "Yalnız kendisi", all: "Herkes" }[veri.config.ratings || "off"] || veri.config.ratings],
  ]));
  const g = izgara(c, 3);
  grafikKart(g, "Günlük oy", k => gunlukCubuk(k, gunlukSeri({ v: gunluk(R, r => ms(r.createdAt)) }), { birim: "oy" }));
  grafikKart(g, "Genel puan dağılımı", k => gunlukCubuk(k, Array.from({ length: 10 }, (_, n) => ({ t: String(n + 1), v: R.filter(r => r.scores?.overall === n + 1).length })), { birim: "oy", ozet: false }));
  grafikKart(g, "Kategori ortalamaları", k => yatayCubuk(k, Object.fromEntries(KAT.map(c2 => [KAT_TR[c2], Math.round(ortalama(R.map(r => r.scores?.[c2]).filter(x => typeof x === "number")) * 10) / 10]))), "10 üzerinden");

  // Yayinla
  const bar = el("div", "actions");
  const girdi = el("input"); girdi.type = "number"; girdi.min = "1"; girdi.value = enAzOy; girdi.style.cssText = "width:80px;flex:none"; girdi.title = "Yayınlamak için en az oy";
  girdi.oninput = () => { enAzOy = Math.max(1, Number(girdi.value) || 1); };
  const etk = el("span", "muted", "en az oy");
  const yay = el("button", null, "Yayınla");
  const kal = el("button", "ghost", "Yayından kaldır");
  bar.append(girdi, etk, yay, kal);
  yay.onclick = async () => {
    const rows = topla().filter(r => r.n >= enAzOy && veri.userMap.has(r.id));
    if (!rows.length) { toast(`En az ${enAzOy} oyu olan hesap yok`); return; }
    await islem("Ortalamalar profillere yazılsın mı?", [["Hesap", `<b>${sayi(rows.length)}</b>`], ["En az oy", sayi(enAzOy)],
      ["Kim görür", esc({ off: "Kimse (Ayarlar'dan aç)", self: "Yalnız kişi kendisi", all: "Herkes" }[veri.config.ratings || "off"] || "")]], "Yayınla", async () => {
      const b = writeBatch(db);
      for (const r of rows) b.update(doc(db, "users", r.id), { rating: { overall: r.avg.overall ?? 0, count: r.n, publishedAt: new Date(),
        categories: Object.fromEntries(KAT.filter(c2 => c2 !== "overall" && r.avg[c2] != null).map(c2 => [c2, r.avg[c2]])) } });
      await b.commit();
    }, false);
  };
  kal.onclick = async () => {
    const list = veri.users.filter(u => u.rating);
    if (!list.length) { toast("Profilde yayınlanmış puan yok"); return; }
    await islem("Bütün profillerdeki puan silinsin mi?", [["Hesap", `<b>${sayi(list.length)}</b>`]], "Kaldır", async () => {
      const b = writeBatch(db); for (const u of list) b.update(doc(db, "users", u.id), { rating: deleteField() }); await b.commit();
    });
  };
  c.appendChild(kart("Puan tablosu", not("Her oyuncunun aldığı oyların ortalaması. Hesapsız oyuncular da puanlanır; bir hesaba bağlandıklarında puanları o hesaba eklenir. Yayınla ortalamayı hesabın profiline yazar (users/{uid}.rating); kimin göreceği Ayarlar'da. Yeni oylar gelince yeniden yayınla."), bar,
    veriTablo(["#", "Oyuncu", { ad: "Tür", filtre: true }, { ad: "Oy", num: true }, { ad: "Maç", num: true }, ...KAT.map(c2 => ({ ad: KAT_TR[c2], num: true })), { ad: "Profilde", num: true }, { ad: "Fark", num: true }],
      tab.map((r, n) => { const pub = veri.userMap.get(r.id)?.rating;
        return [n + 1, ad(r.id), veri.userMap.has(r.id) ? "Hesap" : "Hesapsız", sayi(r.n), sayi(r.m), ...KAT.map(c2 => r.avg[c2] == null ? "-" : sayiOn(r.avg[c2])),
          pub ? sayiOn(pub.overall) : "-", pub && r.avg.overall != null ? sayiOn(r.avg.overall - pub.overall) : "-"]; }),
      { sirala: [5, "desc"], bos: "Henüz oy yok.", satirTik: (_, n) => { const u = veri.userMap.get(tab[n].id); if (u) oyuncuAc(u); } })));

  // Kim kime ne verdi: veren basina ozet + ham oylar
  const verenler = {};
  for (const r of R) (verenler[r.raterUid] ||= []).push(r);
  c.appendChild(kart("Veren başına", veriTablo(["Veren", { ad: "Oy", num: true }, { ad: "Verdiği genel ort.", num: true }, { ad: "En düşük", num: true }, { ad: "En yüksek", num: true }, "Son oy"],
    Object.entries(verenler).map(([id, l]) => { const o = l.map(r => +r.scores?.overall || 0);
      return [kimlik(id), sayi(l.length), sayiOn(ortalama(o)), Math.min(...o), Math.max(...o), tarihHucre(Math.max(...l.map(r => ms(r.createdAt))))]; }),
    { sirala: [1, "desc"] }), not("Çok sert ya da çok cömert veren kişileri bulmak için.")));
  const ham = R.slice().sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
  c.appendChild(kart("Ham oylar (kim kime ne verdi)", veriTablo(["Zaman", { ad: "Veren", filtre: true }, { ad: "Alan", filtre: true }, { ad: "Maç", filtre: true }, ...KAT.map(c2 => ({ ad: KAT_TR[c2], num: true }))],
    ham.map(r => [tarihHucre(r.createdAt), kimlik(r.raterUid), kimlik(r.ratedUid), macAdi(r.matchId), ...KAT.map(c2 => r.scores?.[c2] ?? "-")]),
    { sirala: [0, "desc"], satirTik: (_, n) => oyAc(ham[n]) }), not("Yalnız admin görür (ratings okuma kuralı). Satıra dokun: oyu silmek için.")));
}

function oyAc(r) {
  kullaniciCekmecesi(r, [["Veren", kimlik(r.raterUid)], ["Alan", kimlik(r.ratedUid)], ["Maç", macAdi(r.matchId)], ["Zaman", tarihTam(r.createdAt)],
    ["Değişiklik", tarihTam(r.updatedAt)], { baslik: "Puanlar" }, ...KAT.map(c => [KAT_TR[c], r.scores?.[c] ?? "-"])], {
    baslik: "Oy", alt: `ratings/${r.id}`, hamAlanlar: true,
    eylemler: [{ ad: "Oyu sil", ikincil: true, tik: () => islem("Oy silinsin mi?", [["Veren", esc(kimlik(r.raterUid))], ["Alan", esc(kimlik(r.ratedUid))], ["Maç", esc(macAdi(r.matchId))]], "Sil",
      () => deleteDoc(doc(db, "ratings", r.id))) }],
  });
}

function sikayetler(c) {
  surumNotu(c);
  const R = veri.reports.slice().sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
  const [yeni, yeniO] = say(R, r => ms(r.createdAt));
  const engel = veri.users.flatMap(u => (u.blocked || []).map(b => ({ kim: u.id, kimi: b })));
  c.appendChild(tiles([
    ["Açık şikayet", sayi(R.length)], ["Yeni şikayet", sayi(yeni), donemAdi(), fark(yeni, yeniO, true)],
    ["Hakkında şikayet olan", sayi(new Set(R.map(r => r.targetUid)).size)], ["Engelleme", sayi(engel.length)],
    ["Bu benim isteği", sayi(veri.claims.length), "bekleyen"],
  ]));
  c.appendChild(kart("Şikayetler", veriTablo(["Zaman", { ad: "Şikayet eden", filtre: true }, { ad: "Hakkında", filtre: true }, { ad: "Sebep", filtre: true }, "Not", { ad: "Hakkındaki toplam", num: true }],
    R.map(r => [tarihHucre(r.createdAt), kimlik(r.fromUid), kimlik(r.targetUid), SEBEP[r.reason] || r.reason || "-", r.note || r.text || "", sayi(R.filter(x => x.targetUid === r.targetUid).length)]),
    { sirala: [0, "desc"], bos: "Şikayet yok.", satirTik: (_, n) => sikayetAc(R[n]) }), not("Uygulamadan gelen şikayetler (reports). Kapatmak belgeyi siler; kişi hakkında işlem için profili aç.")));
  c.appendChild(kart("Engellenenler", veriTablo(["Engelleyen", { ad: "Engellenen", filtre: true }], engel.map(x => [kimlik(x.kim), kimlik(x.kimi)]), { bos: "Engelleme yok." }),
    not("users/{uid}.blocked dizisinden. Engeli yalnız kişinin kendisi kaldırır.")));
  c.appendChild(kart("Bu benim istekleri (misafir → hesap)", veriTablo(["Zaman", "İsteyen", "Organizatör", "Maç"],
    veri.claims.map(x => [tarihHucre(x.createdAt), kimlik(x.uid), kimlik(x.ownerUid), macAdi(x.matchId)]), { bos: "Bekleyen istek yok." }),
    not("Organizatör onaylayınca misafir kaydı hesaba bağlanır.")));
}

function sikayetAc(r) {
  const hedefU = veri.userMap.get(r.targetUid), hedefP = veri.playerMap.get(r.targetUid);
  kullaniciCekmecesi(r, [["Zaman", tarihTam(r.createdAt)], ["Şikayet eden", kimlik(r.fromUid)], ["Hakkında", kimlik(r.targetUid)], ["Sebep", SEBEP[r.reason] || r.reason || "-"],
    ["Not", r.note || r.text || "-"], ["Hakkındaki şikayet", sayi(veri.reports.filter(x => x.targetUid === r.targetUid).length)]], {
    baslik: "Şikayet", alt: `reports/${r.id}`, hamAlanlar: true,
    eylemler: [
      ...(hedefU ? [{ ad: "Profili aç", tik: kapat => { kapat(); oyuncuAc(hedefU); } }] : hedefP ? [{ ad: "Oyuncu kaydını aç", tik: kapat => { kapat(); misafirAc(hedefP); } }] : []),
      { ad: "Şikayeti kapat (sil)", ikincil: true, tik: () => islem("Şikayet kapatılsın mı?", [["Hakkında", esc(kimlik(r.targetUid))], ["Sebep", esc(SEBEP[r.reason] || r.reason || "")]], "Kapat",
        () => deleteDoc(doc(db, "reports", r.id))) },
    ],
  });
}

function takip(c) {
  surumNotu(c);
  const Fl = veri.follows, N = veri.notifications;
  const [yeni, yeniO] = say(Fl, f => ms(f.createdAt));
  const [bil, bilO] = say(N, n => ms(n.createdAt));
  c.appendChild(tiles([
    ["Takip", sayi(Fl.length), "toplam"], ["Yeni takip", sayi(yeni), donemAdi(), fark(yeni, yeniO)],
    ["Uygulama içi bildirim", sayi(bil), donemAdi(), fark(bil, bilO)], ["Okunma", yuzde(N.filter(n => n.read).length, N.length), "tümü"],
    ["Takip eden kişi", sayi(new Set(Fl.map(f => f.followerUid)).size)], ["Takip edilen kişi", sayi(new Set(Fl.map(f => f.followedUid)).size)],
  ]));
  const g = izgara(c);
  const turler = Object.keys(dagilim(N, n => n.type));
  grafikKart(g, "Günlük uygulama içi bildirim (türe göre)", k => gunlukCubuk(k, gunlukSeri(Object.fromEntries(turler.map(t => [t, gunluk(N.filter(n => n.type === t), n => ms(n.createdAt))]))),
    { seriler: turler.map(t => ({ ad: BIL_TUR[t] || t, alan: t })) }), "notifications koleksiyonu: davet, takip, istek. Telefon bildirimi (push) değil, uygulamadaki zil.");
  grafikKart(g, "Günlük yeni takip", k => gunlukCubuk(k, gunlukSeri({ v: gunluk(Fl, f => ms(f.createdAt)) }), { birim: "takip" }));
  c.appendChild(kart("Bildirim türleri", veriTablo([{ ad: "Tür" }, { ad: "Adet", num: true }, { ad: "Okunan", num: true }, { ad: "Okunma", num: true }, { ad: "Gönderen kişi", num: true }, "Son"],
    turler.map(t => { const l = N.filter(n => n.type === t); return [BIL_TUR[t] || t, sayi(l.length), sayi(l.filter(n => n.read).length), yuzde(l.filter(n => n.read).length, l.length),
      sayi(new Set(l.map(n => n.fromUid)).size), tarihHucre(Math.max(...l.map(n => ms(n.createdAt))))]; }), { sirala: [1, "desc"], ara: false })));
  const enCok = Object.entries(dagilim(Fl, f => f.followedUid)).sort((a, b) => b[1] - a[1]);
  c.appendChild(kart("En çok takip edilenler", veriTablo(["Kişi", { ad: "Takipçi", num: true }, { ad: "Takip ettiği", num: true }],
    enCok.map(([id, n]) => [kimlik(id), sayi(n), sayi(Fl.filter(f => f.followerUid === id).length)]), { sirala: [1, "desc"], satirTik: (_, n) => { const u = veri.userMap.get(enCok[n][0]); if (u) oyuncuAc(u); } })));
}

// ════════════════════════════════════════════════════════════════════════
// YÖNET
// ════════════════════════════════════════════════════════════════════════

function bildirim(c) {
  c.appendChild(el("div", "note", "<b>Matchday'e özel:</b> uygulama FCM konularına abone olmuyor; <b>Konular</b> modu Worker'da bildirim adresi olan herkese cihaz cihaz gider. " +
    "Cihaz adresi yalnız girişli kullanıcılarda var (users/{uid}/tokens). Test cihazları: yönetici hesabının (admins) kurulumları. " +
    "Zamanlama şimdilik kapalı (Cloudflare ücretsiz planda cron sınırı dolu). Uygulama bildirim açılışını (push_open) henüz kaydetmiyor; açılma oranı boş kalır."));
  const k = kutu(); c.appendChild(k);
  pushSayfasi(k, {
    worker: WORKER, token: () => K.token(),
    uygulama: { ad: "Matchday", ikon: "/assets/lab-icons/matchday-180.png", renk: "#5BE36A" },
    diller: ["en", "tr"], anaDiller: ["tr", "en"], sinir: { baslik: 50, metin: 160 }, sekmeler: [],
    kurulumlar: () => veri.installs, kisiAdi: i => i.handle ? "@" + i.handle : veri.userMap.get(i.uid)?.name,
    sablon: K.demo || !db ? null : { db, F }, anahtar: "matchday", gonderilenler: "gonderilenler",
    emojiler: ["⚽", "🥅", "🏆", "🔥", "👟", "📅", "⏰", "🎉", "✨", "✅", "👋", "💪", "🤝", "📣", "⭐", "❤️"],
  });
}

function gonderilenler(c) {
  gonderilenlerSayfasi(c, {
    worker: WORKER, token: () => K.token(),
    gecmis: async () => veri.pushes.slice().sort((a, b) => ms(b.sentAt || b.at) - ms(a.sentAt || a.at)),
    gunluk: async ilkGun => veri.days.filter(g => g.id >= ilkGun).map(g => ({ day: g.id, ev: g.ev || {} })),
    kurulumlar: () => veri.installs,
  });
}

function ayarlar(c) {
  const cfg = veri.config || {};
  const form = kart("Uygulama ayarları (config/app)", not("Uygulamalar ve katılım sayfası bunları her açılışta okur; değiştirince yeni sürüm gerekmez. Boş bırakılan alan varsayılana döner."));
  const alan = (etiket, id, yer, deger) => { const l = el("label", "field"); l.innerHTML = `<span class="lbl">${etiket}</span>`; const i = el("input"); i.type = "url"; i.id = id; i.placeholder = yer; i.value = deger || ""; l.appendChild(i); form.appendChild(l); return i; };
  const j = alan("Kadro paylaşımındaki indirme linki", "cJoin", "https://bamstudio.dev/matchday/", cfg.joinURL);
  const io = alan("iPhone (TestFlight ya da App Store)", "cIos", "https://testflight.apple.com/join/EkCzWQEM", cfg.iosURL);
  const an = alan("Android (Play test ya da mağaza)", "cAnd", "https://play.google.com/apps/testing/com.aberk.matchday", cfg.androidURL);
  const sl = el("label", "field"); sl.innerHTML = `<span class="lbl">Profilde puan</span>`;
  const sec = el("select"); sec.innerHTML = `<option value="off">Kapalı: kimse görmez</option><option value="self">Yalnız kişi kendi puanını görür</option><option value="all">Herkes herkesinkini görür</option>`;
  sec.value = cfg.ratings || "off"; sl.appendChild(sec); form.appendChild(sl);
  const kaydet = el("button", null, "Kaydet"); const ac = el("div", "actions"); ac.appendChild(kaydet); form.appendChild(ac);
  kaydet.onclick = () => {
    const data = {};
    if (j.value.trim()) data.joinURL = j.value.trim();
    if (io.value.trim()) data.iosURL = io.value.trim();
    if (an.value.trim()) data.androidURL = an.value.trim();
    data.ratings = sec.value;
    islem("Ayarlar kaydedilsin mi?", Object.entries(data).map(([k, v]) => [k, esc(v)]), "Kaydet", () => setDoc(doc(db, "config", "app"), data), false);
  };
  c.appendChild(form);
  const sag = kart("Bildirim Worker'ı", not("Yükleniyor..."));
  c.appendChild(sag);
  fetch(WORKER + "/health?deep=1", { cache: "no-store" }).then(r => r.json()).then(h => {
    sag.lastChild.remove();
    sag.appendChild(tiles([["Durum", h.ready ? "Hazır" : "FCM_SA yok"], ["Sürüm", String(h.version ?? "-")], ["Zamanlama", h.cron ? "Açık" : "Kapalı"], ["En fazla cihaz", sayi(h.maxDevices)]]));
    sag.appendChild(not(`${WORKER} · özellikler: ${(h.features || []).join(", ")}`));
  }).catch(e => { sag.lastChild.textContent = "Worker'a ulaşılamadı: " + e.message; });
  const kaynak = [["installs", veri.installs], ["installs/*/events", veri.events], ["stats", veri.days], ["users", veri.users], ["players", veri.players],
    ["matches", veri.matches], ["ratings", veri.ratings], ["follows", veri.follows], ["notifications", veri.notifications], ["reports", veri.reports],
    ["claims", veri.claims], ["users/*/tokens", veri.tokens], ["pushes", veri.pushes]];
  const hata = Object.fromEntries(veri.hatalar);
  c.appendChild(kart("Veri kaynakları", veriTablo(["Koleksiyon", { ad: "Belge", num: true }, "Durum"],
    kaynak.map(([a, l]) => [a, sayi(l.length), hata[a.split("/")[a.startsWith("users/") ? 2 : 0]] ? "Okunamadı: " + hata[a.split("/")[a.startsWith("users/") ? 2 : 0]] : hata[a.replace("installs/*/", "")] ? "Okunamadı: " + hata[a.replace("installs/*/", "")] : "Tamam"]), { ara: false }),
    not(`Okuma yetkisi Firestore kurallarında admins/{uid} belgesiyle; panel girişi ${YONETICI}. Kaynak kodu ~/dev/matchday, kurallar firestore.rules.`)));
}

// ── Kabuk ──────────────────────────────────────────────────────────────────
panelKabuk({
  ad: "Matchday", anahtar: "matchday", ikon: "/assets/lab-icons/matchday-180.png", firebaseConfig, yonetici: YONETICI,
  araliklar: [1, 7, 28, 90, 0], aralik: 7, yukle,
  surumler: () => surumListesi(veri?.installs || []), surumNotu: SLUG,
  tema: {
    acik: { accent: "#22A83F", onAccent: "#000000", bg: "#F4F6F3", card: "#FFFFFF", side: "#EEF1ED", line: "#DDE3DC", ink: "#101410", soft: "#5F695F",
      ok: "#22A83F", warn: "#E0A100", rose: "#E5405F", sky: "#2B7DE0" },
    koyu: { accent: "#5BE36A", onAccent: "#000000", bg: "#0A0D0A", card: "#151A15", side: "#101510", line: "#242B24", ink: "#F2F5F2", soft: "#8B948B",
      ok: "#5BE36A", warn: "#FFC53D", rose: "#FF5C7A", sky: "#62A8FF" },
    sabit: "dark",
  },
  gruplar: [
    { baslik: "ANALİZ", sayfalar: [
      { id: "genel", ad: "Genel bakış", ciz: genel },
      { id: "canli", ad: "Canlı", ciz: canli },
      { id: "ekranlar", ad: "Ekranlar", ciz: ekranlar },
      { id: "paywall", ad: "Paywall ve satın alma", ciz: paywall },
      { id: "kullanim", ad: "Kullanım", ciz: kullanim },
      { id: "kullanicilar", ad: "Kullanıcılar", ciz: kullanicilar },
      { id: "analytics", ad: "Analytics", ciz: analytics },
    ] },
    { baslik: "SOSYAL", sayfalar: [
      { id: "oyuncular", ad: "Oyuncular", ciz: oyuncular },
      { id: "maclar", ad: "Maçlar", ciz: maclar },
      { id: "puanlar", ad: "Puanlar ve oylar", ciz: puanlar },
      { id: "sikayetler", ad: "Şikayet ve engel", ciz: sikayetler },
      { id: "takip", ad: "Takip ve bildirimler", ciz: takip },
    ] },
    { baslik: "YÖNET", sayfalar: [
      { id: "bildirim", ad: "Bildirim gönder", ciz: bildirim },
      { id: "gonderilenler", ad: "Gönderilenler", ciz: gonderilenler },
      { id: "ayarlar", ad: "Ayarlar", ciz: ayarlar },
    ] },
  ],
});
