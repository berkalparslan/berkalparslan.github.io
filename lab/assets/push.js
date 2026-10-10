/* Bildirim gönderme ve Gönderilenler sayfaları, bütün paneller için ortak.
 * bam-sports panelindeki sayfanın ortak katmana taşınmış hali.
 *
 * Arkasında her uygulamanın kendi Cloudflare Worker'ı var (FCM HTTP v1,
 * Spark planında çalışır, Cloud Functions gerekmez). Worker'ın API'si her
 * uygulamada aynı (README "Worker sözleşmesi"); değişen yalnız adres ve etiketler.
 *
 *   import { pushSayfasi, gonderilenlerSayfasi, kisiyeBildirim } from "/lab/assets/push.js?v=2";
 *
 *   pushSayfasi(icerik, {
 *     worker: "https://leafbook-push.kittapcom.workers.dev",
 *     token: () => kabuk.token(),
 *     uygulama: { ad: "Leafbook", ikon: "/leafbook/assets/icon.png", renk: "#2e9e63" },
 *     diller: ["en", "tr", "de", ...],      // yazılabilecek diller
 *     sekmeler: [{ id: "plants", ad: "Bitkiler" }, ...],
 *     sinir: { baslik: 60, metin: 180 },     // Worker'ın sınırıyla aynı olmalı
 *     kurulumlar: () => veri.installs,       // yerel kitle tahmini ve tek kişi seçimi
 *     kisiAdi: i => "@" + i.handle,          // istege bagli
 *     sablon: { db, F },                     // istege bagli: Firestore pushTemplates; yoksa bu tarayıcı
 *     anahtar: "leafbook",                   // taslak ve yerel şablon anahtarı
 *     gonderilenler: "gonderilenler",        // Gönderilenler sayfasının kimliği (bağlantı için)
 *   });
 *
 *   gonderilenlerSayfasi(icerik, {
 *     worker, token,
 *     gecmis: async () => [...],             // pushes koleksiyonu, en yeni önce
 *     gunluk: async ilkGun => [{ day: "2026-10-10", ev: { push_open_<pid>: 3 } }],
 *     kurulumlar: () => veri.installs,
 *   });
 *
 *   kisiyeBildirim(kurulumId)                // çekmeceden: bir sonraki çizimde tek kişi seçili gelir
 */
import { el, sayi, tarihTam, kart, tiles, veriTablo, ms } from "/lab/assets/panel.js?v=5";

const DIL_ADI = {
  tr: "Türkçe", en: "İngilizce", de: "Almanca", es: "İspanyolca", fr: "Fransızca",
  it: "İtalyanca", pt: "Portekizce", nl: "Felemenkçe", ru: "Rusça", ja: "Japonca",
  ko: "Korece", zh: "Çince", ar: "Arapça", pl: "Lehçe", sv: "İsveççe", id: "Endonezce",
  hi: "Hintçe", uk: "Ukraynaca", el: "Yunanca", cs: "Çekçe", da: "Danca", fi: "Fince",
  no: "Norveççe", nb: "Norveççe", ro: "Romence", hu: "Macarca", he: "İbranice", th: "Tayca",
  vi: "Vietnamca", ms: "Malayca", fa: "Farsça", az: "Azerice",
};
const SIMDI = { tr: "şimdi", en: "now", de: "jetzt", es: "ahora", fr: "maintenant", it: "ora", pt: "agora", nl: "nu",
  ru: "сейчас", ja: "今", ko: "지금", zh: "现在", ar: "الآن", pl: "teraz", sv: "nu", id: "sekarang" };
const YEREL = { tr: "tr-TR", en: "en-US", de: "de-DE", es: "es-ES", fr: "fr-FR", it: "it-IT", pt: "pt-BR", nl: "nl-NL",
  ru: "ru-RU", ja: "ja-JP", ko: "ko-KR", zh: "zh-CN", ar: "ar", pl: "pl-PL", sv: "sv-SE", id: "id-ID" };
const ORNEK = { tr: ["Yeni bir şey var", "Uygulamayı aç, sana hazırladığımız yeniliğe göz at."],
  en: ["Something new is here", "Open the app and take a look at what we made for you."] };
const EMOJI = ["🌿", "🌱", "🪴", "💧", "☀️", "🔥", "🎉", "✨", "⭐", "✅", "👋", "💪", "📅", "⏰", "🎁", "❤️"];
const DURUM = { scheduled: ["Zamanlandı", "sky"], sending: ["Gönderiliyor", "warn"], sent: ["Gönderildi", "ok"],
  cancelled: ["İptal", "no"], failed: ["Hata", "err"] };
const IST = 3 * 36e5;   // Türkiye: UTC+3, yaz saati yok

const segm = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("tr", { granularity: "grapheme" }) : null;
const glen = s => segm ? [...segm.segment(s)].length : [...s].length;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uyu = n => new Promise(r => setTimeout(r, n));
const lang2 = l => String(l || "").toLowerCase().split(/[-_]/)[0];
const dilAdi = l => DIL_ADI[l] || l;
const depo = {
  al: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  yaz: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } },
};

/* Türkiye saati: datetime-local alanı tarayıcının saat diliminden bağımsız. */
const istGirdi = t => new Date(t + IST).toISOString().slice(0, 16);
const istOku = v => v ? Date.parse(v + ":00+03:00") : NaN;
const istMetin = t => new Date(t).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
function kalanMetin(t) {
  const m = Math.round((t - Date.now()) / 6e4);
  if (m < 60) return `${m} dakika sonra`;
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 48) return `${h} saat${r ? ` ${r} dakika` : ""} sonra`;
  return `${Math.round(h / 24)} gün sonra`;
}

const tokenVar = i => typeof i.fcm === "string" ? i.fcm.length > 0 : !!i.fcm;
const ulasilir = i => tokenVar(i) && i.notif !== false;
function eslesir(i, f, now = Date.now()) {
  if (f.installIds?.length) return f.installIds.includes(i.id);
  if (f.apps?.length && !f.apps.includes(i.app)) return false;
  if (f.langs?.length && !f.langs.includes(lang2(i.language))) return false;
  if (f.pro === "pro" && i.pro !== true) return false;
  if (f.pro === "free" && i.pro === true) return false;
  const g = ms(i.lastSeen);
  if (f.activeWithinDays && !(g >= now - f.activeWithinDays * 864e5)) return false;
  if (f.inactiveForDays && !(g && g < now - f.inactiveForDays * 864e5)) return false;
  if (typeof f.signedIn === "boolean" && (i.signedIn === true) !== f.signedIn) return false;
  return true;
}

function toast(m) {
  const t = el("div", "toast"); t.setAttribute("role", "status"); t.textContent = m;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}

/* Kendi onay kartımız (window.confirm değil). satirlar: [etiket, HTML] */
export function onayKarti({ baslik, satirlar = [], not = "", evet = "Evet", tehlike = false }) {
  return new Promise(cevap => {
    const k = el("div", "onay");
    k.innerHTML = `<div class="card" role="dialog" aria-modal="true"><h2>${esc(baslik)}</h2>
      ${satirlar.length ? `<div class="dl" style="grid-template-columns:120px 1fr">${satirlar.map(([a, b]) => `<div>${esc(a)}</div><div>${b}</div>`).join("")}</div>` : ""}
      ${not ? `<p class="muted">${not}</p>` : ""}
      <div class="actions"><button class="ghost" data-h>Vazgeç</button><button class="${tehlike ? "danger" : ""}" data-e>${esc(evet)}</button></div></div>`;
    const bitir = v => { k.remove(); removeEventListener("keydown", tus); cevap(v); };
    const tus = e => { if (e.key === "Escape") bitir(false); };
    k.querySelector("[data-h]").onclick = () => bitir(false);
    k.querySelector("[data-e]").onclick = () => bitir(true);
    k.onclick = e => { if (e.target === k) bitir(false); };
    addEventListener("keydown", tus);
    document.body.appendChild(k);
    k.querySelector("[data-h]").focus();
  });
}

async function cagir(cfg, yol, govde) {
  const token = await cfg.token();
  const r = await fetch(cfg.worker + yol, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || d.message || `HTTP ${r.status}`);
  return d;
}

let bekleyenKisi = null;
/** Çekmeceden "Bu kişiye bildirim gönder": bir sonraki pushSayfasi tek kişi modunda açılır. */
export function kisiyeBildirim(id) { bekleyenKisi = id; }

// ════════════════════════════════════════════════════════════════════════
// Bildirim gönder
// ════════════════════════════════════════════════════════════════════════

export function pushSayfasi(kok, cfg) {
  const SINIR_T = cfg.sinir?.baslik ?? 60, SINIR_B = cfg.sinir?.metin ?? 180, EN_FAZLA = cfg.enFazlaDil ?? 4;
  const ANA = cfg.anaDiller || ["tr", "en"];
  const EK_DILLER = (cfg.diller || Object.keys(DIL_ADI)).filter(l => !ANA.includes(l));
  const TASLAK = `${cfg.anahtar || "panel"}-push-taslak`;
  const YEREL_SABLON = `${cfg.anahtar || "panel"}-push-sablon`;
  const sekmeAdi = id => (cfg.sekmeler || []).find(s => s.id === id)?.ad || id;
  const hepsi = () => (cfg.kurulumlar ? cfg.kurulumlar() : null) || [];
  const kisiAdi = i => (cfg.kisiAdi && cfg.kisiAdi(i)) || i.handle && "@" + i.handle || i.id.slice(0, 8);

  const s = {
    mod: "topics", ekDiller: [], metin: {}, sekme: "", ne: "now", zaman: "",
    kitle: { langs: [], pro: "any", signed: "any", act: "any", actDays: 7, inactDays: 14, ids: [] },
    uzak: null, saglik: null, mesgul: false, onDil: ANA[0], sablonlar: null, sonAlan: null,
  };
  let uzakSira = 0, uzakZaman = null, taslakHazir = false;

  try { const t = JSON.parse(depo.al(TASLAK) || "null"); if (t) taslakYukle(t); } catch (e) { }
  taslakHazir = true;
  if (bekleyenKisi) { s.mod = "devices"; s.kitle.ids = [bekleyenKisi]; bekleyenKisi = null; }

  // ── İskelet ──
  kok.innerHTML = `<div id="pDurum"></div>
  <div class="pushgrid">
    <div>
      <div class="card"><h2>Kime</h2>
        <div class="modes"><button data-mod="topics">Konular<small>Bildirime izin veren herkes, tek hamlede. Her cihaz kendi dilini alır.</small></button>
          <button data-mod="devices">Kitle<small>Filtreye uyan cihazlara tek tek. Kime gittiğini tam bilirsin.</small></button></div>
        <div id="pKitleF"></div><div id="pKitle"></div></div>
      <div class="card"><h2>Metin</h2>
        <div class="emojis" id="pEmoji" aria-label="Emoji ekle"></div>
        <div class="langs" id="pAna"></div>
        <details class="more" id="pDaha"><summary>Başka diller <span class="muted" id="pDahaN"></span></summary>
          <p class="muted">Yalnız eklediğin diller ayrı metin alır; geri kalan herkes İngilizceyi görür. İngilizce dışında en fazla ${EN_FAZLA} dil (Konular modunda FCM koşulu beş konu alıyor).</p>
          <div class="chips" id="pSec"></div><div class="langs" id="pEk"></div></details>
        <div class="field" style="margin-top:14px"><span class="lbl">Dokununca açılacak yer</span><select id="pSekme"></select></div>
        <div id="pKontrol"></div></div>
      <div class="card"><h2>Ne zaman</h2>
        <div class="seg" id="pNe"><button data-ne="now">Hemen</button><button data-ne="later">Zamanla</button></div>
        <div id="pSonra" class="hidden" style="margin-top:12px"><div class="field" style="max-width:320px"><span class="lbl">Tarih ve saat (Türkiye saati)</span><input id="pZaman" type="datetime-local" step="300"></div>
          <p class="muted" id="pZamanBilgi" style="margin:0"></p></div>
        <div class="actions"><button class="ghost" data-git="validate">Doğrula (kimseye gitmez)</button>
          <button class="ghost" data-git="test">Test cihazlarına gönder</button><button data-git="send" id="pGonder">Gönder</button></div>
        <p class="muted" id="pIpucu" style="margin-bottom:0"></p></div>
      <div class="card hidden" id="pSonucK"><h2>Sonuç</h2><div id="pSonuc"></div></div>
    </div>
    <div class="pg-side">
      <div class="card"><div class="prevtools"><h2 style="margin:0">Önizleme</h2><div class="seg" id="pOnDil"></div></div>
        <div class="phone"><div class="screen" id="pEkran"></div></div>
        <p class="muted" id="pOnNot" style="margin:10px 0 0;font-size:12px"></p>
        <p class="muted" style="margin:6px 0 0;font-size:12px">Kilit ekranında başlık tek satır, metin dört satıra kadar görünür; fazlası "..." ile kesilir.</p></div>
      <div class="card"><h2>Şablonlar</h2>
        <div style="display:flex;gap:8px"><input id="pSAd" placeholder="Şablon adı" maxlength="60"><button class="ghost" id="pSKaydet" style="flex:none">Kaydet</button></div>
        <p class="muted" style="font-size:12px;margin:6px 0 0">${cfg.sablon ? "Firestore <code>pushTemplates</code> koleksiyonunda." : "Bu tarayıcıda saklanır."}</p>
        <div id="pSListe" style="margin-top:8px"></div></div>
    </div>
  </div>`;
  const $ = id => kok.querySelector("#" + id);

  // ── Kurulum ──
  $("pEmoji").innerHTML = (cfg.emojiler || EMOJI).map(e => `<button type="button" data-emo="${e}" title="Ekle">${e}</button>`).join("");
  $("pEmoji").querySelectorAll("[data-emo]").forEach(b => {
    b.onmousedown = e => e.preventDefault();
    b.onclick = () => {
      const f = s.sonAlan && kok.contains(s.sonAlan) ? s.sonAlan : $("pt_" + ANA[0]);
      const a = f.selectionStart ?? f.value.length, z = f.selectionEnd ?? a;
      f.value = f.value.slice(0, a) + b.dataset.emo + f.value.slice(z);
      f.focus(); f.selectionStart = f.selectionEnd = a + b.dataset.emo.length;
      s.metin[f.dataset.l] = { ...(s.metin[f.dataset.l] || {}), [f.dataset.k]: f.value };
      s.onDil = f.dataset.l; degisti();
    };
  });
  $("pSekme").innerHTML = `<option value="">Uygulama (son kaldığı yer)</option>` + (cfg.sekmeler || []).map(x => `<option value="${esc(x.id)}">${esc(x.ad)}</option>`).join("");
  $("pSekme").value = s.sekme;
  $("pSekme").onchange = () => { s.sekme = $("pSekme").value; degisti(); };
  kok.querySelectorAll("[data-mod]").forEach(b => b.onclick = () => { s.mod = b.dataset.mod; modCiz(); degisti(true); });
  kok.querySelectorAll("[data-ne]").forEach(b => b.onclick = () => neAyarla(b.dataset.ne));
  $("pZaman").oninput = () => { s.zaman = $("pZaman").value; degisti(); };
  kok.querySelectorAll("[data-git]").forEach(b => b.onclick = () => sor(b.dataset.git));
  $("pSKaydet").onclick = sablonKaydet;
  $("pSAd").onkeydown = e => { if (e.key === "Enter") sablonKaydet(); };

  dilKutulari();
  modCiz();
  neAyarla(s.ne, true);
  saglikYukle();
  sablonYukle();
  degisti(true);
  // Eski kullanim (v1): gecmis verilip ayri Gonderilenler sayfasi yoksa altta goster.
  if (cfg.gecmis && !cfg.gonderilenler) { const g = el("div"); kok.appendChild(g); gonderilenlerSayfasi(g, cfg); }

  // ── Diller ──
  function dilKutusu(l) {
    const ph = ORNEK[l] || ["", ""];
    return `<div data-dil="${l}"><div class="dil">${esc(dilAdi(l).toLocaleUpperCase("tr-TR"))}${l === "en" ? " (ŞART)" : ANA.includes(l) ? "" : ` <a style="cursor:pointer;letter-spacing:0" data-kaldir="${l}">kaldır</a>`}</div>
      <div class="field"><label for="pt_${l}">Başlık <small id="ptc_${l}">0/${SINIR_T}</small></label><input id="pt_${l}" data-l="${l}" data-k="title" placeholder="${esc(ph[0])}" autocomplete="off"></div>
      <div class="field"><label for="pb_${l}">Metin <small id="pbc_${l}">0/${SINIR_B}</small></label><textarea id="pb_${l}" data-l="${l}" data-k="body" rows="3" placeholder="${esc(ph[1])}"></textarea></div></div>`;
  }
  function dilKutulari() {
    $("pAna").innerHTML = ANA.map(dilKutusu).join("");
    $("pSec").innerHTML = EK_DILLER.map(l => `<button class="chip${s.ekDiller.includes(l) ? " on" : ""}" data-sec="${l}">${esc(dilAdi(l))} <small>${l}</small></button>`).join("");
    $("pSec").querySelectorAll("[data-sec]").forEach(b => b.onclick = () => {
      const l = b.dataset.sec;
      s.ekDiller = s.ekDiller.includes(l) ? s.ekDiller.filter(x => x !== l) : [...s.ekDiller, l];
      dilKutulari(); degisti();
    });
    $("pEk").innerHTML = s.ekDiller.map(dilKutusu).join("");
    $("pDahaN").textContent = s.ekDiller.length ? `(${s.ekDiller.length} dil)` : "";
    if (s.ekDiller.length) $("pDaha").open = true;
    kok.querySelectorAll("[data-l]").forEach(x => {
      x.value = s.metin[x.dataset.l]?.[x.dataset.k] || "";
      x.oninput = () => { s.metin[x.dataset.l] = { ...(s.metin[x.dataset.l] || {}), [x.dataset.k]: x.value }; s.onDil = x.dataset.l; degisti(); };
      x.onfocus = () => { s.sonAlan = x; if (s.onDil !== x.dataset.l) { s.onDil = x.dataset.l; onizleme(); } };
    });
    kok.querySelectorAll("[data-kaldir]").forEach(a => a.onclick = () => { s.ekDiller = s.ekDiller.filter(l => l !== a.dataset.kaldir); dilKutulari(); degisti(); });
  }
  function yazilanDiller() { return [...ANA, ...s.ekDiller]; }
  function metinler() {
    const out = {};
    for (const l of yazilanDiller()) {
      const t = (s.metin[l]?.title || "").trim(), b = (s.metin[l]?.body || "").trim();
      if (t || b) out[l] = { title: t, body: b };
    }
    return out;
  }

  /* Worker'ın kurallarının aynısı: yazarken gösterir, hatalıysa düğmeler kapalı. */
  function sorunlar() {
    const out = [], m = metinler();
    for (const l of yazilanDiller()) {
      const ti = $("pt_" + l), bi = $("pb_" + l); if (!ti) continue;
      const tv = ti.value.trim(), bv = bi.value.trim(), tl = glen(tv), bl = glen(bv);
      $("ptc_" + l).textContent = `${tl}/${SINIR_T}`; $("ptc_" + l).classList.toggle("over", tl > SINIR_T);
      $("pbc_" + l).textContent = `${bl}/${SINIR_B}`; $("pbc_" + l).classList.toggle("over", bl > SINIR_B);
      const ad = dilAdi(l);
      const tire = x => /[\u2014\u2013]/.test(x), sapka = x => /[\u00e2\u00c2]/.test(x);
      let kT = false, kB = false;
      if (tire(tv) || tire(bv)) { out.push(`${ad}: uzun tire var, kısa tire ya da virgül kullan.`); kT ||= tire(tv); kB ||= tire(bv); }
      if (l === "tr" && (sapka(tv) || sapka(bv))) { out.push(`${ad}: "â" var, "a" yaz.`); kT ||= sapka(tv); kB ||= sapka(bv); }
      if (tl > SINIR_T) { out.push(`${ad}: başlık ${SINIR_T} karakteri geçiyor.`); kT = true; }
      if (bl > SINIR_B) { out.push(`${ad}: metin ${SINIR_B} karakteri geçiyor.`); kB = true; }
      if ((tv || bv) && !(tv && bv)) { out.push(`${ad}: başlık ve metin birlikte yazılmalı.`); kT ||= !tv; kB ||= !bv; }
      ti.parentElement.classList.toggle("bad", kT); bi.parentElement.classList.toggle("bad", kB);
    }
    if (!m.en) out.push("İngilizce metin şart: kendi metni olmayan her dil onu görür.");
    const diger = Object.keys(m).filter(l => l !== "en");
    if (diger.length > EN_FAZLA) out.push(`İngilizce dışında en fazla ${EN_FAZLA} dil yazılabilir (şu an ${diger.length}).`);
    return out;
  }
  function zamanMs() { return s.ne === "later" ? istOku(s.zaman) : null; }
  function zamanSorunu() {
    if (s.ne !== "later") return "";
    const t = zamanMs();
    if (!Number.isFinite(t)) return "Gönderim zamanını seç.";
    if (t < Date.now() + 2 * 6e4) return "Zaman geçmişte ya da çok yakın: en az birkaç dakika sonrası olmalı.";
    if (t > Date.now() + 60 * 864e5) return "En fazla 60 gün sonrasına zamanlanabilir.";
    return "";
  }

  function degisti(kitleDegisti = false) {
    kontrol();
    onizleme();
    if (kitleDegisti) uzakSay();
    kitleCiz();
    if (taslakHazir) depo.yaz(TASLAK, JSON.stringify(taslak()));
  }

  function kontrol() {
    const p = sorunlar(), bos = !Object.keys(metinler()).length, zs = zamanSorunu();
    const a = kitle();
    const kimse = s.mod === "devices" && a && a.withToken === 0;
    const fazla = s.mod === "devices" && a && a.withToken > (s.saglik?.maxDevices || 2000);
    const bozuk = s.saglik && !s.saglik.ready;
    const kapali = s.mesgul || p.length > 0 || bozuk;
    $("pKontrol").innerHTML = p.length && !bos ? `<div class="note err">${p.map(esc).join("<br>")}</div>` : "";
    kok.querySelectorAll("[data-git]").forEach(b => b.disabled = kapali);
    $("pGonder").disabled = kapali || !!zs || kimse || fazla;
    $("pGonder").textContent = s.ne === "later" ? "Zamanla" : s.mod === "devices" ? (a && a.withToken ? `${sayi(a.withToken)} cihaza gönder` : "Gönder") : "Herkese gönder";
    if (s.ne === "later") {
      const t = zamanMs();
      $("pZamanBilgi").innerHTML = zs ? `<span style="color:var(--rose)">${esc(zs)}</span>`
        : `Türkiye saatiyle <b>${esc(istMetin(t))}</b> · ${esc(kalanMetin(t))}. Worker beş dakikada bir bakar; zamanı gelince ilk turda gider.`;
    }
  }

  // ── Kime ──
  function modCiz() {
    kok.querySelectorAll("[data-mod]").forEach(b => b.classList.toggle("on", b.dataset.mod === s.mod));
    $("pIpucu").innerHTML = `Test: ${s.mod === "topics" ? "seçim" : "filtre"} ne olursa olsun yalnız test cihazlarına (TestFlight ya da uygulamada test olarak işaretli), cihaz adresiyle tek tek, her biri kendi dilinde.`;
    const f = $("pKitleF");
    if (s.mod !== "devices") { f.innerHTML = ""; return; }
    const k = s.kitle, liste = hepsi(), havuz = liste.filter(ulasilir);
    const dilSay = {};
    for (const i of liste) if (i.language) dilSay[lang2(i.language)] = (dilSay[lang2(i.language)] || 0) + 1;
    const diller = [...new Set([...Object.keys(dilSay).sort((a, b) => dilSay[b] - dilSay[a]).slice(0, 12), ...k.langs])];
    const seg = (ad, alan, secenek) => `<div><span class="lbl">${ad}</span><div class="seg" data-seg="${alan}">${secenek.map(([v, y]) => `<button data-v="${v}" class="${k[alan] === v ? "on" : ""}">${y}</button>`).join("")}</div></div>`;
    f.innerHTML = `<div id="pFiltre"${k.ids.length ? ' style="opacity:.42;pointer-events:none" aria-disabled="true"' : ""}>
        <span class="lbl">Cihaz dili</span>
        <div class="chips"><button class="chip${!k.langs.length ? " on" : ""}" data-dil2="">Hepsi</button>${diller.map(l => `<button class="chip${k.langs.includes(l) ? " on" : ""}" data-dil2="${esc(l)}">${esc(dilAdi(l))} <small>${sayi(havuz.filter(i => lang2(i.language) === l).length)}</small></button>`).join("")}</div>
        <div class="frow">${seg("Pro", "pro", [["any", "Hepsi"], ["pro", "Pro"], ["free", "Ücretsiz"]])}${seg("Hesap", "signed", [["any", "Hepsi"], ["yes", "Girişli"], ["no", "Girişsiz"]])}</div>
        <div class="frow"><div>${seg("Son görülme", "act", [["any", "Hepsi"], ["active", "Son N günde açan"], ["inactive", "N gündür açmayan"]]).slice(5, -6)}
          <label class="inline-n${k.act === "any" ? " hidden" : ""}"><input id="pGun" type="number" min="1" max="365" inputmode="numeric" value="${k.act === "inactive" ? k.inactDays : k.actDays}"> gün</label></div></div>
      </div>
      <span class="lbl">Tek kişi <span style="font-weight:500">(seçince diğer filtreler devre dışı kalır)</span></span>
      <div class="picker"><input id="pAra" type="search" autocomplete="off" placeholder="@kullanıcı adı, ad ya da kurulum kimliği"><div class="picklist hidden" id="pListe"></div></div>
      <div id="pKisiler">${k.ids.map(id => { const i = liste.find(x => x.id === id); return `<span class="tag"><b>${esc(i ? kisiAdi(i) : id.slice(0, 8))}</b>${i && !ulasilir(i) ? ' <span class="muted">adres yok</span>' : ""}<button data-cik="${esc(id)}" aria-label="Kaldır">×</button></span>`; }).join("")}</div>`;
    f.querySelectorAll("[data-dil2]").forEach(b => b.onclick = () => {
      const l = b.dataset.dil2;
      k.langs = !l ? [] : k.langs.includes(l) ? k.langs.filter(x => x !== l) : [...k.langs, l];
      modCiz(); degisti(true);
    });
    f.querySelectorAll("[data-seg] button").forEach(b => b.onclick = () => { k[b.parentElement.dataset.seg] = b.dataset.v; modCiz(); degisti(true); });
    const gun = f.querySelector("#pGun");
    if (gun) gun.oninput = () => {
      const n = Math.max(1, Math.min(365, Math.round(+gun.value) || 0));
      if (!+gun.value) return;
      if (k.act === "inactive") k.inactDays = n; else k.actDays = n;
      degisti(true);
    };
    f.querySelectorAll("[data-cik]").forEach(b => b.onclick = () => { k.ids = k.ids.filter(x => x !== b.dataset.cik); modCiz(); degisti(true); });
    const ara = f.querySelector("#pAra"), pl = f.querySelector("#pListe");
    ara.oninput = () => {
      const ham = ara.value.trim().toLowerCase(), at = ham.startsWith("@"), q = ham.replace(/^@/, "");
      if (q.length < (at ? 1 : 2)) { pl.classList.add("hidden"); return; }
      const puan = i => {
        const h = String(i.handle || "").toLowerCase(), ad = String(kisiAdi(i)).toLowerCase();
        return h.startsWith(q) ? 3 : h.includes(q) ? 2 : at ? 0 : ad.includes(q) ? 2 : i.id.toLowerCase().startsWith(q) ? 1 : 0;
      };
      const bul = liste.map(i => [i, puan(i)]).filter(x => x[1] > 0)
        .sort((a, b) => (b[1] - a[1]) || (ulasilir(b[0]) - ulasilir(a[0])) || (ms(b[0].lastSeen) - ms(a[0].lastSeen))).slice(0, 8).map(x => x[0]);
      pl.innerHTML = bul.length ? bul.map(i => `<button data-ekle="${esc(i.id)}"><span>${esc(kisiAdi(i))}</span><span class="muted">${esc(tarihTam(i.lastSeen))}${ulasilir(i) ? "" : " · adres yok"}</span></button>`).join("")
        : `<p class="muted" style="padding:10px 12px;margin:0">Bulunamadı.</p>`;
      pl.classList.remove("hidden");
      pl.querySelectorAll("[data-ekle]").forEach(b => b.onclick = () => {
        if (!k.ids.includes(b.dataset.ekle)) k.ids.push(b.dataset.ekle);
        modCiz(); degisti(true);
      });
    };
    ara.onkeydown = e => { if (e.key === "Escape") pl.classList.add("hidden"); };
  }
  function filtre() {
    const k = s.kitle;
    if (k.ids.length) return { installIds: k.ids.slice() };
    const f = { langs: k.langs.slice(), pro: k.pro };
    if (k.act === "active") f.activeWithinDays = k.actDays;
    if (k.act === "inactive") f.inactiveForDays = k.inactDays;
    if (k.signed !== "any") f.signedIn = k.signed === "yes";
    return f;
  }
  function yerelSay(f) {
    const m = hepsi().filter(i => eslesir(i, f)), u = m.filter(ulasilir);
    const byLang = {};
    for (const i of u) { const l = lang2(i.language) || "?"; byLang[l] = (byLang[l] || 0) + 1; }
    return { total: m.length, withToken: u.length, noToken: m.filter(i => !tokenVar(i)).length,
      notifOff: m.filter(i => tokenVar(i) && i.notif === false).length, byLang, yerel: true };
  }
  function anahtarF() { return JSON.stringify(filtre()); }
  function kitle() {
    if (s.mod !== "devices") return null;
    if (s.uzak && s.uzak.key === anahtarF() && !s.uzak.err) return s.uzak.data;
    return cfg.kurulumlar ? yerelSay(filtre()) : null;
  }
  function uzakSay() {
    if (s.mod !== "devices") return;
    clearTimeout(uzakZaman);
    if (new URLSearchParams(location.search).has("demo")) return;
    const key = anahtarF(), sira = ++uzakSira;
    uzakZaman = setTimeout(async () => {
      try {
        const data = await cagir(cfg, "/audience", { filter: filtre() });
        if (sira !== uzakSira) return;
        s.uzak = { key, data, at: new Date() };
      } catch (e) { if (sira === uzakSira) s.uzak = { key, err: e.message, at: new Date() }; }
      kitleCiz(); kontrol();
    }, 650);
  }
  function dagilimMetni(byLang, m) {
    const sp = {};
    for (const [l, n] of Object.entries(byLang || {})) { const k = m[l] ? l : "en"; sp[k] = (sp[k] || 0) + n; }
    return Object.entries(sp).sort((a, b) => b[1] - a[1]).map(([l, n]) => `${esc(dilAdi(l))} metni <b>${sayi(n)}</b>`).join(" · ");
  }
  function kitleCiz() {
    const kutu = $("pKitle"), m = metinler(), metinVar = Object.keys(m).length > 0;
    if (s.mod === "topics") {
      if (!cfg.kurulumlar) { kutu.innerHTML = ""; return; }
      const havuz = hepsi().filter(i => i.notif === true);
      const byLang = {};
      for (const i of havuz) { const l = lang2(i.language); byLang[l] = (byLang[l] || 0) + 1; }
      const ios = havuz.filter(i => i.platform !== "android").length;
      kutu.innerHTML = `<div class="audbox"><div class="big">~${sayi(havuz.length)}<small>kurulum</small></div>
        <div class="row"><b>${sayi(ios)} iOS, ${sayi(havuz.length - ios)} Android</b></div>
        <div class="row">Bildirime izin veren herkes. Konuya abone olan herkes alır; telemetrisi eski olanlar sayıda yok.</div>
        ${metinVar ? `<div class="row">${dagilimMetni(byLang, m)}</div>` : ""}</div>`;
      return;
    }
    const a = kitle();
    if (!a) { kutu.innerHTML = `<div class="audbox"><span class="muted">Worker sayıyor...</span></div>`; return; }
    const uzak = s.uzak && s.uzak.key === anahtarF();
    const kaynak = uzak ? (s.uzak.err ? `Worker sayamadı (${esc(s.uzak.err)}); panel verisi gösteriliyor.` : `Worker sayımı · ${s.uzak.at.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`)
      : "Panel verisinden anlık tahmin; Worker sayıyor...";
    const enFazla = s.saglik?.maxDevices || a.maxDevices || 2000;
    const uyari = a.withToken === 0 || a.withToken > enFazla;
    kutu.innerHTML = `<div class="audbox${uyari ? " warnbox" : ""}"><div class="big">${sayi(a.withToken)}<small>cihaz</small></div>
      ${metinVar && a.withToken ? `<div class="row">${dagilimMetni(a.byLang, m)}</div>` : ""}
      <div class="row">Filtreye uyan ${sayi(a.total)} kurulum${a.noToken ? ` · ${sayi(a.noToken)} tanesinin cihaz adresi yok` : ""}${a.notifOff ? ` · ${sayi(a.notifOff)} tanesi bildirimi kapatmış` : ""}.</div>
      ${a.withToken === 0 ? `<div class="row"><b style="color:var(--warn)">Bu filtreye uyan, bildirim adresi olan cihaz yok.</b></div>` : ""}
      ${a.withToken > enFazla ? `<div class="row"><b style="color:var(--warn)">Tek gönderimde en fazla ${sayi(enFazla)} cihaz: filtreyi daralt ya da Konular modunu kullan.</b></div>` : ""}
      <div class="row muted">${kaynak}</div></div>`;
  }
  function ozet() {
    if (s.mod === "topics") return "Herkes";
    const f = filtre(), liste = hepsi();
    if (f.installIds) return (f.installIds.length === 1 ? "Tek kişi: " : `${f.installIds.length} seçili kişi: `)
      + f.installIds.map(id => { const i = liste.find(x => x.id === id); return i ? kisiAdi(i) : id.slice(0, 8); }).join(", ");
    const p = ["Kitle"];
    if (f.langs.length) p.push("dil " + f.langs.join(", "));
    if (f.pro !== "any") p.push(f.pro === "pro" ? "Pro" : "ücretsiz");
    if (f.activeWithinDays) p.push(`son ${f.activeWithinDays} günde açan`);
    if (f.inactiveForDays) p.push(`${f.inactiveForDays} gündür açmayan`);
    if (typeof f.signedIn === "boolean") p.push(f.signedIn ? "girişli" : "girişsiz");
    return p.join(" · ");
  }

  // ── Zaman ──
  function neAyarla(n, sessiz) {
    s.ne = n;
    kok.querySelectorAll("[data-ne]").forEach(b => b.classList.toggle("on", b.dataset.ne === n));
    $("pSonra").classList.toggle("hidden", n !== "later");
    if (n === "later") {
      const z = $("pZaman");
      z.min = istGirdi(Math.ceil((Date.now() + 10 * 6e4) / 3e5) * 3e5);
      z.max = istGirdi(Date.now() + 60 * 864e5);
      if (!s.zaman || istOku(s.zaman) < Date.now()) s.zaman = istGirdi(Math.ceil((Date.now() + 36e5) / 36e5) * 36e5);
      z.value = s.zaman;
    }
    if (!sessiz) degisti();
  }

  // ── Önizleme ──
  function onizleme() {
    const m = metinler(), diller = yazilanDiller();
    if (!diller.includes(s.onDil)) s.onDil = ANA[0];
    $("pOnDil").innerHTML = diller.map(l => `<button data-od="${l}" class="${l === s.onDil ? "on" : ""}" title="${esc(dilAdi(l))}">${l.toUpperCase()}</button>`).join("");
    $("pOnDil").querySelectorAll("[data-od]").forEach(b => b.onclick = () => { s.onDil = b.dataset.od; onizleme(); });
    const kendi = m[s.onDil], gor = kendi || m.en, gorDil = kendi ? s.onDil : "en";
    const bos = !gor, t = gor || { title: (ORNEK[s.onDil] || ORNEK.en)[0], body: (ORNEK[s.onDil] || ORNEK.en)[1] };
    const an = s.ne === "later" && Number.isFinite(zamanMs()) ? new Date(zamanMs()) : new Date();
    const loc = YEREL[s.onDil] || "en-US", opt = { timeZone: "Europe/Istanbul" };
    const tarihY = an.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long", ...opt });
    const saatY = an.toLocaleTimeString(loc, { hour: s.onDil === "en" ? "numeric" : "2-digit", minute: "2-digit", hour12: s.onDil === "en" ? true : undefined, ...opt }).replace(/\s?[AP]M$/i, "");
    const u = cfg.uygulama || {}, r = u.renk || "#2e9e63";
    $("pEkran").innerHTML = `<div class="wall" style="background:radial-gradient(120% 70% at 20% 0%, ${r} 0%, transparent 60%),radial-gradient(90% 60% at 100% 100%, ${r}88 0%, transparent 70%),linear-gradient(170deg,#1d2b3a,#0b1118)"></div>
      <div class="island"></div><div class="lock"><div class="d">${esc(tarihY)}</div><div class="t">${esc(saatY)}</div></div>
      <div class="noti" role="img" aria-label="Bildirim önizlemesi">${u.ikon ? `<img src="${esc(u.ikon)}" alt="">` : "<img alt=''>"}
        <div class="tx"><div class="hd"><span>${esc(u.ad || "")}</span><span>${esc(SIMDI[s.onDil] || "now")}</span></div>
          <div class="ti${bos ? " ph" : ""}" dir="auto">${esc(t.title)}</div><div class="bd${bos ? " ph" : ""}" dir="auto">${esc(t.body)}</div></div></div>
      <div class="bottom"><i></i><i></i></div><div class="hbar"></div>`;
    $("pOnNot").textContent = bos ? "Metin yazınca burada görünür."
      : !kendi && s.onDil !== "en" ? `${dilAdi(s.onDil)} metni yok: bu telefon İngilizceyi görür.`
      : `${dilAdi(gorDil)}${s.sekme ? ` · dokununca ${sekmeAdi(s.sekme)}` : ""}`;
  }

  // ── Taslak ve şablon ──
  function taslak() {
    return { mode: s.mod, kitle: { ...s.kitle, ids: s.kitle.ids.slice(0, 20) }, texts: metinler(), extra: s.ekDiller, tab: s.sekme || null };
  }
  function taslakYukle(d) {
    s.mod = d.mode === "devices" ? "devices" : "topics";
    const k = { langs: [], pro: "any", signed: "any", act: "any", actDays: 7, inactDays: 14, ids: [] };
    if (d.kitle) Object.assign(k, d.kitle);
    else if (d.filter) {
      const f = d.filter;
      Object.assign(k, { langs: f.langs || [], pro: f.pro || "any", ids: f.installIds || [],
        signed: typeof f.signedIn === "boolean" ? (f.signedIn ? "yes" : "no") : "any",
        act: f.activeWithinDays ? "active" : f.inactiveForDays ? "inactive" : "any" });
      if (f.activeWithinDays) k.actDays = f.activeWithinDays;
      if (f.inactiveForDays) k.inactDays = f.inactiveForDays;
    }
    s.kitle = k;
    s.metin = JSON.parse(JSON.stringify(d.texts || {}));
    s.ekDiller = (d.extra || Object.keys(s.metin).filter(l => !ANA.includes(l))).filter(l => EK_DILLER.includes(l)).slice(0, 8);
    s.sekme = (cfg.sekmeler || []).some(x => x.id === d.tab) ? d.tab : "";
  }
  function sablonuAc(d) {
    taslakYukle(d);
    $("pSekme").value = s.sekme;
    dilKutulari(); modCiz(); degisti(true);
  }
  async function sablonYukle() {
    s.sablonlar = { yukleniyor: true }; sablonCiz();
    try {
      if (cfg.sablon) {
        const { db, F } = cfg.sablon;
        const snap = await F.getDocs(F.query(F.collection(db, "pushTemplates"), F.orderBy("updatedAt", "desc"), F.limit(100)));
        s.sablonlar = { liste: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
      } else s.sablonlar = { liste: JSON.parse(depo.al(YEREL_SABLON) || "[]") };
    } catch (e) { s.sablonlar = { hata: e.code || e.message }; }
    sablonCiz();
  }
  function sablonCiz() {
    const k = $("pSListe"), t = s.sablonlar;
    if (!t || t.yukleniyor) { k.innerHTML = `<p class="muted">Yükleniyor...</p>`; return; }
    if (t.hata) { k.innerHTML = `<p class="muted">Okunamadı: ${esc(t.hata)}</p>`; return; }
    k.innerHTML = t.liste.length ? t.liste.map((x, n) => {
      const tt = x.texts?.tr || x.texts?.en || {};
      return `<div class="tpl"><div><b title="${esc(x.name)}">${esc(x.name)}</b><small>${x.mode === "devices" ? "Kitle" : "Konular"} · ${esc(Object.keys(x.texts || {}).join(", ").toUpperCase())} · ${esc(tt.title || "")}</small></div>
        <button class="ghost" data-sy="${n}">Yükle</button><button class="ghost" data-ss="${n}">Sil</button></div>`;
    }).join("") : `<p class="muted">Henüz şablon yok. Metni yaz, ad ver, Kaydet.</p>`;
    k.querySelectorAll("[data-sy]").forEach(b => b.onclick = () => { const x = t.liste[+b.dataset.sy]; sablonuAc(x); $("pSAd").value = x.name; toast(`"${x.name}" yüklendi`); });
    k.querySelectorAll("[data-ss]").forEach(b => b.onclick = async () => {
      const x = t.liste[+b.dataset.ss];
      if (!await onayKarti({ baslik: "Şablon silinsin mi?", satirlar: [["Ad", `<b>${esc(x.name)}</b>`]], evet: "Sil", tehlike: true })) return;
      try {
        if (cfg.sablon) { const { db, F } = cfg.sablon; await F.deleteDoc(F.doc(db, "pushTemplates", x.id)); }
        t.liste = t.liste.filter(y => y !== x);
        if (!cfg.sablon) depo.yaz(YEREL_SABLON, JSON.stringify(t.liste));
        sablonCiz(); toast("Şablon silindi");
      } catch (e) { toast("Silinemedi: " + (e.code || e.message)); }
    });
  }
  async function sablonKaydet() {
    const ad = $("pSAd").value.trim();
    if (!ad) { $("pSAd").focus(); toast("Şablona bir ad ver"); return; }
    const m = metinler();
    if (!Object.keys(m).length) { toast("Önce metni yaz"); return; }
    const d = taslak();
    const veri = { name: ad.slice(0, 60), mode: d.mode, kitle: { ...d.kitle, ids: [] }, texts: m, extra: d.extra, tab: d.tab };
    if (!s.sablonlar?.liste) await sablonYukle();
    const ayni = s.sablonlar?.liste?.find(x => x.name.toLocaleLowerCase("tr") === veri.name.toLocaleLowerCase("tr"));
    if (ayni && !await onayKarti({ baslik: "Aynı adlı şablon var", satirlar: [["Ad", `<b>${esc(ayni.name)}</b>`]], not: "Üzerine yazılsın mı?", evet: "Üzerine yaz" })) return;
    $("pSKaydet").disabled = true;
    try {
      if (cfg.sablon) {
        const { db, F } = cfg.sablon;
        if (ayni) await F.setDoc(F.doc(db, "pushTemplates", ayni.id), { ...veri, updatedAt: F.serverTimestamp() }, { merge: true });
        else await F.addDoc(F.collection(db, "pushTemplates"), { ...veri, createdAt: F.serverTimestamp(), updatedAt: F.serverTimestamp() });
        await sablonYukle();
      } else {
        const l = s.sablonlar.liste.filter(x => x !== ayni);
        l.unshift({ id: "t" + Date.now(), ...veri, updatedAt: new Date().toISOString() });
        s.sablonlar.liste = l;
        depo.yaz(YEREL_SABLON, JSON.stringify(l));
        sablonCiz();
      }
      toast(ayni ? "Şablon güncellendi" : "Şablon kaydedildi");
    } catch (e) { toast("Kaydedilemedi: " + (e.code || e.message)); }
    finally { $("pSKaydet").disabled = false; }
  }

  // ── Worker ──
  async function saglikYukle() {
    const k = $("pDurum");
    k.innerHTML = `<p class="muted">Worker kontrol ediliyor...</p>`;
    try {
      const r = await fetch(cfg.worker + "/health?deep=1", { cache: "no-store" });
      s.saglik = await r.json();
      k.innerHTML = !s.saglik.ready
        ? `<div class="note err"><b>Worker çalışıyor ama FCM anahtarı (FCM_SA) kurulu değil.</b> Worker klasöründe <code>npx wrangler secret put FCM_SA &lt; servis-hesabi.json</code>, sonra deploy.</div>`
        : s.saglik.firestore && s.saglik.firestore !== "ok" ? `<div class="note err">Worker hazır ama Firestore'a ulaşamadı: ${esc(s.saglik.firestore)}</div>` : "";
    } catch (e) {
      s.saglik = null;
      k.innerHTML = `<div class="note err"><b>Worker'a ulaşılamadı.</b> Adres: <code>${esc(cfg.worker)}</code></div>`;
    }
    kontrol();
  }

  async function sor(tur) {
    if (s.mesgul) return;
    const m = metinler(), a = kitle();
    const govde = { mode: s.mod, texts: m, tab: s.sekme || null, filter: s.mod === "devices" ? filtre() : null, summary: ozet() };
    if (s.mod === "topics" && cfg.kurulumlar) govde.estimate = hepsi().filter(i => i.notif === true).length;
    if (tur === "validate") govde.validate = true;
    if (tur === "test") govde.test = true;
    if (tur === "send" && s.ne === "later") govde.sendAt = new Date(zamanMs()).toISOString();
    if (tur !== "validate") {
      const satir = [["Kime", esc(tur === "test" ? "Yalnız test cihazları" : ozet())]];
      if (tur === "send" && s.mod === "devices" && a) satir.push(["Cihaz", `<b>${sayi(a.withToken)}</b>`]);
      if (govde.sendAt) satir.push(["Ne zaman", `${esc(istMetin(Date.parse(govde.sendAt)))} (Türkiye)`]);
      for (const [l, x] of Object.entries(m)) satir.push([dilAdi(l), `<b>${esc(x.title)}</b><br>${esc(x.body)}`]);
      const ok = await onayKarti({
        baslik: tur === "test" ? "Test cihazlarına gönderilsin mi?" : govde.sendAt ? "Bildirim zamanlansın mı?" : "Bildirim gönderilsin mi?",
        satirlar: satir, not: tur === "send" && !govde.sendAt ? "Gönderilen bildirim geri alınamaz." : "",
        evet: tur === "test" ? "Teste gönder" : govde.sendAt ? "Zamanla" : "Gönder",
      });
      if (!ok) return;
    }
    s.mesgul = true; kontrol();
    const sk = $("pSonucK"), so = $("pSonuc");
    sk.classList.remove("hidden");
    so.innerHTML = `<p class="muted">${tur === "validate" ? "Doğrulanıyor..." : "Gönderiliyor..."}</p>`;
    try {
      let d = await cagir(cfg, "/push", govde);
      so.innerHTML = sonucHtml(d, tur);
      let n = 0;
      while (d.status === "sending" && (d.remaining || 0) > 0 && n++ < 300) {
        await uyu(d.busy ? 3000 : 200);
        d = await cagir(cfg, "/continue", { pid: d.pid });
        so.innerHTML = sonucHtml(d, tur);
      }
      so.querySelectorAll("[data-acgon]").forEach(x => x.onclick = () => { location.hash = cfg.gonderilenler; });
    } catch (e) {
      so.innerHTML = `<div class="note err"><b>Olmadı:</b> ${esc(e.message)}</div>`;
    }
    s.mesgul = false; kontrol();
  }

  function sonucHtml(d, tur) {
    const ac = d.pid && tur !== "validate" && cfg.gonderilenler ? ` <a style="cursor:pointer" data-acgon>Gönderilenler'de aç</a>` : "";
    if (d.status === "scheduled") return `<div class="note okn"><b>Zamanlandı:</b> ${esc(istMetin(Date.parse(d.sendAt)))} (Türkiye), ${esc(kalanMetin(Date.parse(d.sendAt)))}. Kimlik <code>${esc(d.pid)}</code>. Gönderilenler'den iptal edebilirsin.${ac}</div>`;
    const r = d.results || [], hata = r.filter(x => !x.ok).length;
    if (d.validate || tur === "validate") {
      return `<div class="note ${hata ? "err" : "okn"}"><b>Doğrulandı:</b> ${d.mode === "devices" ? `filtreye uyan <b>${sayi(d.counts?.targeted)}</b> cihaz; kullanılan her dil için bir örnek cihazla FCM denendi, ` : ""}${sayi(r.length - hata)} / ${sayi(r.length)} geçti. Kimseye gönderilmedi.</div>`
        + (r.length ? veriHtml(r) : "");
    }
    if (d.mode === "devices") {
      const c = d.counts || {}, top = c.targeted || 0, bitti = (c.sent || 0) + (c.failed || 0);
      return `<div class="note ${c.failed ? (c.sent ? "" : "err") : "okn"}"><b>${tur === "test" ? "Test" : "Gönderim"}:</b> <b>${sayi(c.sent)}</b> cihaza gitti${c.failed ? `, ${sayi(c.failed)} hata` : ""}${c.removedTokens ? `, ${sayi(c.removedTokens)} ölü adres silindi` : ""}${d.remaining ? `, ${sayi(d.remaining)} kaldı` : ""}. Kimlik <code>${esc(d.pid)}</code>.${ac}</div>`
        + (d.status === "sending" ? `<div class="progress"><div style="width:${top ? Math.round(bitti / top * 100) : 0}%"></div></div><p class="muted">40'arlı dilimlerle gider; sayfayı kapatırsan Worker kalanını beş dakikada bir dilim sürdürür.</p>` : "");
    }
    return `<div class="note ${hata ? "err" : "okn"}"><b>${tur === "test" ? "Test" : "Gönderim"}:</b> ${sayi(d.sent)} / ${sayi(r.length)} iş gönderildi (kimlik <code>${esc(d.pid)}</code>).${ac}</div>` + (r.length ? veriHtml(r) : "");
  }
  function veriHtml(r) {
    return `<div style="overflow-x:auto"><table><tr><th>Dil</th><th>Sonuç</th><th>Ayrıntı</th></tr>${r.map(x => `<tr><td>${esc(dilAdi(x.lang))}</td><td>${x.ok ? "geçti" : "<b style='color:var(--rose)'>hata</b>"}</td><td class="muted" style="white-space:normal">${x.ok ? "" : esc(`${x.code || ""} ${x.error || ""}`)}${x.condition ? `<br><code style="font-size:11px">${esc(x.condition)}</code>` : ""}</td></tr>`).join("")}</table></div>`;
  }
}

// ════════════════════════════════════════════════════════════════════════
// Gönderilenler
// ════════════════════════════════════════════════════════════════════════

const gunAnahtar = t => new Date(t + IST).toISOString().slice(0, 10);
const pDurum = p => DURUM[p.status] ? p.status : "sent";
const pMod = p => p.test ? "test" : p.mode === "devices" ? "devices" : "topics";
const pZaman = p => ms(p.sendAt && ["scheduled", "cancelled"].includes(pDurum(p)) ? p.sendAt : p.sentAt || p.startedAt || p.at);
const pSayac = p => p.counts || { targeted: (p.results || []).length, sent: +p.sent || 0, failed: (p.results || []).filter(x => !x.ok).length };

export function gonderilenlerSayfasi(kok, cfg) {
  kok.textContent = "";
  const ust = el("div");
  const tablo = el("div");
  kok.append(ust, kart(null, tablo), el("p", "muted",
    "Panelden giden ve zamanlanan bildirimler (doğrulamalar hariç), Firestore pushes koleksiyonundan; kaydı Worker yazar. " +
    "Açılma: bildirime dokunanlar, günlük kayıtlardaki push_open_&lt;kimlik&gt; sayacından. Kitle'de oran açılma / giden cihaz, Konular'da açılma / tahmini kitle (yaklaşık)."));
  tablo.appendChild(el("p", "muted", "Yükleniyor..."));
  let liste = [], gunluk = [], acilmaHazir = false;

  yukle();
  async function yukle() {
    try { liste = (await cfg.gecmis()) || []; }
    catch (e) { tablo.textContent = ""; tablo.appendChild(el("p", "muted", "Okunamadı: " + (e.code || e.message))); return; }
    ciz();
    const giden = liste.filter(p => ["sent", "sending"].includes(pDurum(p)) && !p.test);
    if (cfg.gunluk && giden.length) {
      const enEski = Math.min(...giden.map(p => ms(p.sentAt || p.at) || Date.now()));
      try { gunluk = (await cfg.gunluk(gunAnahtar(Math.max(enEski, Date.now() - 120 * 864e5)))) || []; } catch (e) { gunluk = []; }
    }
    acilmaHazir = true;
    ciz();
  }
  function acilma(p) {
    const k = `push_open_${p.pid || p.id}`, ilk = gunAnahtar(ms(p.sentAt || p.startedAt || p.at) || Date.now());
    let n = 0;
    for (const g of gunluk) if ((g.day || g.id) >= ilk) n += +(g.ev?.[k] || 0);
    const kisi = cfg.kurulumlar ? (cfg.kurulumlar() || []).filter(i => +(i.ev?.[k] || 0) > 0).length : null;
    return { n, kisi };
  }
  function oran(p, o) {
    if (pMod(p) === "devices") { const g = pSayac(p).sent; return g ? `%${Math.round(o.n / g * 1000) / 10}` : ""; }
    return p.estimate ? `~%${Math.round(o.n / p.estimate * 1000) / 10}` : "";
  }
  function ciz() {
    const son30 = Date.now() - 30 * 864e5;
    const gercek = liste.filter(p => pDurum(p) === "sent" && pMod(p) !== "test" && pZaman(p) >= son30);
    const ac = gercek.reduce((t, p) => t + acilma(p).n, 0);
    const kitleG = gercek.filter(p => pMod(p) === "devices");
    const kGiden = kitleG.reduce((t, p) => t + pSayac(p).sent, 0), kAc = kitleG.reduce((t, p) => t + acilma(p).n, 0);
    const zam = liste.filter(p => pDurum(p) === "scheduled").sort((a, b) => pZaman(a) - pZaman(b));
    ust.textContent = "";
    ust.appendChild(tiles([
      ["Gönderim", sayi(gercek.length), "son 30 gün, test hariç"],
      ["Açılma", acilmaHazir ? sayi(ac) : "...", "bildirime dokunan, 30 gün"],
      ["Kitle açılma oranı", kGiden ? `%${Math.round(kAc / kGiden * 1000) / 10}` : "-", `${sayi(kAc)} / ${sayi(kGiden)} cihaz`],
      ["Zamanlanmış", sayi(zam.length), zam.length ? `ilki ${tarihTam(zam[0].sendAt)}` : "bekleyen yok"],
    ]));
    tablo.textContent = "";
    tablo.appendChild(veriTablo(
      ["Zaman", { ad: "Durum", filtre: true }, { ad: "Mod", filtre: true }, "Hedef", "Başlık",
       { ad: "Giden", num: true }, { ad: "Açılma", num: true }, { ad: "Oran", num: true }, { ad: "", sirala: false }],
      liste.map(p => {
        const t = p.texts?.tr || p.texts?.en || Object.values(p.texts || {})[0] || {};
        const st = pDurum(p), c = pSayac(p), o = acilma(p), gitti = st === "sent" || st === "sending";
        return [
          { d: tarihTam(pZaman(p)) + (st === "scheduled" ? ` (${kalanMetin(pZaman(p))})` : ""), s: pZaman(p) },
          DURUM[st][0],
          { test: "Test", devices: "Kitle", topics: "Konular" }[pMod(p)],
          p.summary || "",
          t.title || t.body || "",
          gitti ? { d: pMod(p) === "topics" ? `${sayi(c.sent)} / ${sayi(c.targeted)} iş` : `${sayi(c.sent)} / ${sayi(c.targeted)}`, s: c.sent } : "",
          gitti ? (acilmaHazir ? { d: sayi(o.n) + (o.kisi ? ` (${sayi(o.kisi)} kişi)` : ""), s: o.n } : "...") : "",
          gitti && acilmaHazir ? oran(p, o) : "",
          st === "scheduled" ? dugme("İptal et", () => iptal(p)) : st === "sending" ? dugme("Devam ettir", () => devam(p)) : "",
        ];
      }),
      { sirala: [0, "desc"], bos: "Henüz panelden bildirim gönderilmedi.", satirTik: (_, n) => detay(liste[n]) },
    ));
  }
  function dugme(ad, tik) {
    const b = el("button", "ghost", ad);
    b.onclick = e => { e.stopPropagation(); tik(); };
    return b;
  }
  async function iptal(p) {
    if (!await onayKarti({ baslik: "Zamanlanmış bildirim iptal edilsin mi?", satirlar: [["Zaman", esc(tarihTam(p.sendAt))], ["Hedef", esc(p.summary || "")]], evet: "İptal et", tehlike: true })) return;
    try {
      const d = await cagir(cfg, "/cancel", { pid: p.pid || p.id });
      toast(d.cancelled ? "İptal edildi" : `İptal edilemedi: durum ${d.status}`);
      yukle();
    } catch (e) { toast(e.message); }
  }
  async function devam(p) {
    try {
      let d = await cagir(cfg, "/continue", { pid: p.pid || p.id }), n = 0;
      while (d.status === "sending" && n++ < 300) { toast(`${sayi(d.sent)} gitti, ${sayi(d.remaining)} kaldı`); await uyu(d.busy ? 3000 : 200); d = await cagir(cfg, "/continue", { pid: p.pid || p.id }); }
      yukle();
    } catch (e) { toast(e.message); }
  }
  function detay(p) {
    if (!p) return;
    const o = acilma(p), c = pSayac(p);
    const k = el("div", "onay");
    k.innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h2 style="margin:0">Gönderim <code>${esc(p.pid || p.id)}</code></h2><button class="ghost" data-k>Kapat</button></div>
      <div class="dl" style="margin-top:12px">
        <div>Durum</div><div>${esc(DURUM[pDurum(p)][0])} · ${esc({ test: "Test", devices: "Kitle", topics: "Konular" }[pMod(p)])}</div>
        <div>Zaman</div><div>${esc(tarihTam(pZaman(p)))}</div>
        <div>Hedef</div><div>${esc(p.summary || "-")}</div>
        <div>Giden</div><div>${sayi(c.sent)} / ${sayi(c.targeted)}${c.failed ? ` · ${sayi(c.failed)} hata` : ""}${c.removedTokens ? ` · ${sayi(c.removedTokens)} ölü adres` : ""}</div>
        <div>Açılma</div><div>${sayi(o.n)}${o.kisi != null ? ` · ${sayi(o.kisi)} kişi` : ""} ${esc(oran(p, o))}</div>
        <div>Sekme</div><div>${esc(p.tab || "uygulama")}</div>
        ${p.error ? `<div>Hata</div><div>${esc(p.error)}</div>` : ""}
        ${Object.entries(p.texts || {}).map(([l, t]) => `<div>${esc(dilAdi(l))}</div><div><b>${esc(t.title)}</b><br>${esc(t.body)}</div>`).join("")}
      </div></div>`;
    const kapat = () => k.remove();
    k.querySelector("[data-k]").onclick = kapat;
    k.onclick = e => { if (e.target === k) kapat(); };
    document.body.appendChild(k);
  }
}
