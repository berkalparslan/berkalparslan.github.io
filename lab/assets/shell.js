/* Panel kabugu: giris, sol menu, ust satir ve sayfa yonlendirmesi, butun
 * paneller icin ayni. Bir panele alisan digerinde neyin nerede oldugunu bilir.
 *
 *   import { panelKabuk } from "/lab/assets/shell.js?v=1";
 *   const kabuk = await panelKabuk({
 *     ad: "Leafbook",
 *     ikon: "/assets/lab-icons/leafbook-180.png",
 *     firebaseConfig: {...},                 // Firebase Auth ile Google girisi
 *     yonetici: "yonetici@ornek.com",        // tek yerde
 *     gruplar: [
 *       { baslik: "ANALİZ", sayfalar: [{ id: "genel", ad: "Genel bakış", ciz: c => ... }, ...] },
 *       { baslik: "SOSYAL", sayfalar: [...] },
 *       { baslik: "YÖNET",  sayfalar: [...] },
 *     ],
 *     araliklar: [1, 7, 28, 90, 0], aralik: 7, // ust satirdaki gun dugmeleri; 0 = Tumu
 *     aralikYukler: false,                   // true: aralik degisince yukle() yeniden calisir
 *     yukle: async kabuk => {...},           // giristen sonra ve Yenile'de
 *     surumler: () => [{ surum, adet }],     // ust satirda Surum secici (panel.js surumListesi)
 *     surumNotu: "leafbook",                 // ust satirda "Surum notlari" (surumler.json slug'i ya da dizi)
 *     tema: { acik: { accent: "#2e9e63", ... }, koyu: {...}, sabit: "light" },  // uygulama renkleri
 *   });
 *   kabuk.app / kabuk.auth / kabuk.kullanici / await kabuk.token() / kabuk.aralik / kabuk.surum
 *   kabuk.git("bildirim") / kabuk.ciz() / kabuk.durum("metin") / kabuk.demo
 *
 * Giris yalniz Google ile. Firebase'li panelde Firebase Auth acilir penceresi;
 * e-posta yonetici olmali ve dogrulanmis olmali. Firebase'siz (Worker arkali)
 * panelde Google Identity Services ile ID token alinir ve `girisDogrula(idToken)`
 * cagrilir; Worker token'i Google'in anahtarlariyla dogrular (aud = istemci
 * kimligi, email = yonetici, email_verified = true) ve ne donerse
 * `kabuk.oturum` olur. O zaman `googleIstemci` (OAuth Web istemci kimligi) sart.
 * Firebase'li panelde de `girisDogrula` verilirse Firebase ID token'i ile
 * ikinci bir kapi olarak calisir.
 *
 * Asil kapi her zaman sunucu tarafi (Firestore kurallari ya da Worker); buradaki
 * kontrol yetkisiz birinin kirik panel yerine acik bir mesaj gormesi icin.
 */
import { $, el, surumNotlari, surumNotlariKutu } from "/lab/assets/panel.js?v=6";

const FB = "https://www.gstatic.com/firebasejs/10.14.1";
const TEMA = "bamtech-panel-tema";
const G_IKON = `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

export async function panelKabuk(cfg) {
  temaRenkleri(cfg.tema);
  temaUygula(cfg.tema?.sabit);
  const ANAHTAR = "bamtech-panel:" + (cfg.anahtar || cfg.ad);
  const hafiza = (() => { try { return JSON.parse(localStorage.getItem(ANAHTAR) || "{}"); } catch (e) { return {}; } })();
  const hafizaYaz = () => { try { localStorage.setItem(ANAHTAR, JSON.stringify({ aralik: kabuk.aralik, surum: kabuk.surum })); } catch (e) { } };
  const demo = new URLSearchParams(location.search).has("demo");
  const sayfalar = cfg.gruplar.flatMap(g => g.sayfalar);
  const ilk = cfg.varsayilan || sayfalar[0]?.id;
  const kabuk = {
    demo, app: null, auth: null, kullanici: null, oturum: null,
    aralik: cfg.araliklar?.includes(hafiza.aralik) ? hafiza.aralik : cfg.aralik ?? (cfg.araliklar ? cfg.araliklar[1] ?? cfg.araliklar[0] : null),
    surum: hafiza.surum || "",
    sayfa: ilk, icerik: null,
    token: async () => {
      if (kabuk.auth?.currentUser) return kabuk.auth.currentUser.getIdToken();
      if (gisToken) return gisToken;
      throw new Error("Oturum yok");
    },
    git: id => { location.hash = id; },
    ciz: () => ciz(),
    yenile: () => yenile(),
    durum: m => { const d = $("#durum"); if (d) d.textContent = m || ""; },
    cikis: () => cikis(),
  };
  let gisToken = null, yuklendi = false;

  // ── DOM ────────────────────────────────────────────────────────────────
  const giris = el("div", "card hidden");
  giris.id = "login";
  giris.innerHTML = `<h1></h1><p class="muted">Panele Google hesabınla gir. Yalnız yönetici e-postası açabilir.</p>
    <p><button class="gbtn" id="gGiris">${G_IKON}<span>Google ile gir</span></button></p><div id="gisKutu"></div>
    <p class="muted" id="loginMsg"></p>`;
  giris.querySelector("h1").textContent = cfg.ad;

  const uyg = el("div", "layout hidden");
  uyg.id = "app";
  const yan = el("aside");
  const marka = el("div", "brand");
  if (cfg.ikon) { const i = el("img"); i.src = cfg.ikon; i.alt = ""; i.onerror = () => i.remove(); marka.appendChild(i); }
  marka.appendChild(document.createTextNode(cfg.ad));
  yan.appendChild(marka);
  for (const g of cfg.gruplar) {
    if (!g.sayfalar?.length) continue;
    yan.appendChild(el("div", "sec", g.baslik));
    for (const s of g.sayfalar) {
      const a = el("a");
      a.href = "#" + s.id;
      a.dataset.p = s.id;
      a.textContent = s.ad;
      yan.appendChild(a);
    }
  }
  yan.appendChild(el("div", "spacer"));
  const alt = el("div", "alt-dugme");
  const temaB = el("button", "ghost", "Tema");
  const cikisB = el("button", "ghost", "Çıkış");
  alt.append(temaB, cikisB);
  yan.appendChild(alt);

  const ana = el("main");
  const ust = el("div", "top");
  const baslik = el("strong");
  baslik.id = "baslik";
  ust.append(baslik, el("span", "grow"));
  const aralikB = [];
  let surumSec = null;
  if (cfg.surumler) {
    surumSec = el("select", "surum");
    surumSec.title = "Sürüme göre süz: kurulum bazlı sayılar seçili sürümdeki kurulumlardan";
    surumSec.onchange = () => { kabuk.surum = surumSec.value; surumSec.classList.toggle("on", !!kabuk.surum); hafizaYaz(); ciz(); };
    ust.appendChild(surumSec);
  }
  if (cfg.surumNotu) {
    const b = el("button", "ghost", "Sürüm notları");
    b.onclick = () => surumCekmecesi();
    ust.appendChild(b);
  }
  for (const g of cfg.araliklar || []) {
    const b = el("button", "ghost range" + (g === kabuk.aralik ? " on" : ""), g === 0 ? "Tümü" : g === 1 ? "Bugün" : `${g} gün`);
    b.onclick = () => {
      kabuk.aralik = g;
      aralikB.forEach(x => x.classList.toggle("on", x === b));
      hafizaYaz();
      if (cfg.aralikYukler) yenile(); else ciz();
    };
    aralikB.push(b);
    ust.appendChild(b);
  }
  if (cfg.yukle) { const y = el("button", "ghost", "Yenile"); y.onclick = () => yenile(); ust.appendChild(y); }
  const icerik = el("div");
  icerik.id = "icerik";
  const durum = el("p", "muted");
  durum.id = "durum";
  ana.append(ust, icerik, durum);
  uyg.append(yan, ana);
  document.body.prepend(giris, uyg);
  kabuk.icerik = icerik;

  temaB.onclick = () => {
    const t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(TEMA, t); } catch (e) { }
  };
  cikisB.onclick = () => cikis();
  addEventListener("hashchange", () => ciz());

  // ── Akis ───────────────────────────────────────────────────────────────
  function goster(acik) {
    giris.classList.toggle("hidden", acik);
    uyg.classList.toggle("hidden", !acik);
  }
  const mesaj = m => { $("#loginMsg").textContent = m || ""; };

  async function icerde() {
    goster(true);
    if (!yuklendi) { yuklendi = true; await yenile(); } else ciz();
  }

  async function yenile() {
    if (cfg.yukle) {
      kabuk.durum("Yükleniyor...");
      try { await cfg.yukle(kabuk); }
      catch (e) { kabuk.durum("Hata: " + (e.message || e)); }
    }
    ciz();
  }

  function surumleriDoldur() {
    if (!surumSec) return;
    let l = [];
    try { l = cfg.surumler(kabuk) || []; } catch (e) { }
    if (kabuk.surum && !l.some(x => String(x.surum) === String(kabuk.surum))) l = [{ surum: kabuk.surum, adet: 0 }, ...l];
    surumSec.innerHTML = `<option value="">Sürüm: hepsi</option>` + l.map(x => `<option value="${String(x.surum).replace(/"/g, "&quot;")}">${String(x.surum).replace(/</g, "&lt;")}${x.adet != null ? ` (${x.adet})` : ""}</option>`).join("");
    surumSec.value = kabuk.surum || "";
    surumSec.classList.toggle("on", !!kabuk.surum);
  }

  async function surumCekmecesi() {
    const d = el("div", "drawer"); d.dataset.cekmece = "1";
    const ic = el("div", "inner");
    const ustS = el("div", "cek-ust");
    ustS.appendChild(el("h1", null, "Sürüm notları"));
    const kp = el("button", "ghost", "Kapat"); ustS.appendChild(kp);
    ic.append(ustS, el("p", "muted", "Mağazaya giden “Yenilikler” metni, sürüm ve tarihiyle. Kaynak: App Store Connect ve Play, her sabah."));
    const govde = el("div"); govde.textContent = "Yükleniyor...";
    ic.appendChild(govde); d.appendChild(ic);
    const kapat = () => { d.remove(); removeEventListener("keydown", tus); };
    const tus = e => { if (e.key === "Escape") kapat(); };
    kp.onclick = kapat; d.onclick = e => { if (e.target === d) kapat(); }; addEventListener("keydown", tus);
    document.body.appendChild(d);
    govde.textContent = "";
    govde.appendChild(surumNotlariKutu(await surumNotlari(cfg.surumNotu), { uygulamaAdi: cfg.uygulamaAdi }));
  }
  kabuk.surumCekmecesi = surumCekmecesi;

  function ciz() {
    surumleriDoldur();
    document.querySelectorAll(".drawer[data-cekmece]").forEach(x => x.remove());
    const id = location.hash.slice(1);
    const s = sayfalar.find(x => x.id === id) || sayfalar.find(x => x.id === ilk);
    /* Sayfa değişince açık çekmece kapanır (aynı sayfada yeniden çizimde kalır). */
    if (kabuk.sayfa !== s.id) document.querySelectorAll(".drawer[data-cekmece]").forEach(x => x.remove());
    kabuk.sayfa = s.id;
    yan.querySelectorAll("a[data-p]").forEach(a => a.classList.toggle("on", a.dataset.p === s.id));
    const on = yan.querySelector("a.on");
    if (on && yan.scrollWidth > yan.clientWidth) yan.scrollLeft = on.offsetLeft - (yan.clientWidth - on.offsetWidth) / 2;
    baslik.textContent = s.ad;
    document.title = `${s.ad} · ${cfg.ad} Panel`;
    icerik.textContent = "";
    try { s.ciz(icerik, kabuk); }
    catch (e) { console.error(e); icerik.appendChild(el("p", "muted", "Sayfa çizilemedi: " + (e.message || e))); }
  }

  async function cikis() {
    gisToken = null; kabuk.oturum = null; kabuk.kullanici = null; yuklendi = false;
    if (kabuk.auth) { const { signOut } = await import(`${FB}/firebase-auth.js`); await signOut(kabuk.auth); }
    else { goster(false); window.google?.accounts?.id?.disableAutoSelect?.(); }
  }

  if (demo) {
    kabuk.kullanici = { email: "demo" };
    await icerde();
    return kabuk;
  }

  const yoneticiMi = (email, dogru) => !!email && email.toLowerCase() === String(cfg.yonetici).toLowerCase() && dogru === true;

  if (cfg.firebaseConfig) {
    const [{ initializeApp, getApps }, A] = await Promise.all([import(`${FB}/firebase-app.js`), import(`${FB}/firebase-auth.js`)]);
    kabuk.app = getApps()[0] || initializeApp(cfg.firebaseConfig);
    kabuk.auth = A.getAuth(kabuk.app);
    $("#gGiris").onclick = async () => {
      mesaj("");
      try {
        const p = new A.GoogleAuthProvider();
        p.setCustomParameters({ prompt: "select_account", login_hint: cfg.yonetici || "" });
        await A.signInWithPopup(kabuk.auth, p);
      } catch (e) { if (e.code !== "auth/popup-closed-by-user") mesaj(e.message); }
    };
    await new Promise(hazir => {
      let ilkKez = true;
      A.onAuthStateChanged(kabuk.auth, async u => {
        if (u && yoneticiMi(u.email, u.emailVerified)) {
          try {
            if (cfg.girisDogrula) kabuk.oturum = await cfg.girisDogrula(await u.getIdToken());
            kabuk.kullanici = u;
            await icerde();
          } catch (e) { mesaj("Sunucu girişi reddetti: " + (e.message || e)); await A.signOut(kabuk.auth); }
        } else {
          kabuk.kullanici = null;
          goster(false);
          if (u) { mesaj("Bu panel yalnız yöneticiye açık."); await A.signOut(kabuk.auth); }
        }
        if (ilkKez) { ilkKez = false; hazir(); }
      });
    });
    return kabuk;
  }

  // Firebase'siz: Google Identity Services ile ID token, dogrulama Worker'da.
  if (!cfg.girisDogrula || !cfg.googleIstemci) {
    goster(false);
    mesaj("Panel ayarı eksik: firebaseConfig ya da googleIstemci + girisDogrula gerekli.");
    return kabuk;
  }
  goster(false);
  $("#gGiris").classList.add("hidden");
  await scriptYukle("https://accounts.google.com/gsi/client");
  window.google.accounts.id.initialize({
    client_id: cfg.googleIstemci,
    login_hint: cfg.yonetici,
    auto_select: true,
    callback: async ({ credential }) => {
      mesaj("Doğrulanıyor...");
      try {
        const yuk = jwtYuk(credential);
        if (!yoneticiMi(yuk.email, yuk.email_verified)) throw new Error("Bu panel yalnız yöneticiye açık.");
        kabuk.oturum = await cfg.girisDogrula(credential);
        gisToken = credential;
        kabuk.kullanici = { email: yuk.email, ad: yuk.name };
        mesaj("");
        await icerde();
      } catch (e) { mesaj(e.message || String(e)); }
    },
  });
  window.google.accounts.id.renderButton($("#gisKutu"), { theme: "outline", size: "large", text: "signin_with", locale: "tr" });
  window.google.accounts.id.prompt();
  return kabuk;
}

/* Uygulamanin renkleri: panel.css rollerini (--accent, --bg, --side ...) ezer.
   acik/koyu ayri verilir; sabit "light" ise panel hep acik acilir (Tema
   dugmesi yine calisir). */
function temaRenkleri(tema) {
  if (!tema) return;
  const satir = o => Object.entries(o || {}).map(([k, v]) => `--${k.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}:${v}`).join(";");
  const st = document.createElement("style");
  st.textContent = `:root{${satir(tema.acik)}}` +
    (tema.koyu ? `:root[data-theme="dark"]{${satir(tema.koyu)}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${satir(tema.koyu)}}}` : "");
  document.head.appendChild(st);
}

function temaUygula(sabit) {
  let t = null;
  try { t = localStorage.getItem(TEMA); } catch (e) { }
  if (!t && sabit) t = sabit;
  if (!t) t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
}

function scriptYukle(src) {
  return new Promise((ok, hata) => {
    const s = document.createElement("script");
    s.src = src; s.async = true; s.onload = ok; s.onerror = () => hata(new Error("Yüklenemedi: " + src));
    document.head.appendChild(s);
  });
}

function jwtYuk(t) {
  const p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(decodeURIComponent(escape(atob(p.padEnd(Math.ceil(p.length / 4) * 4, "=")))));
}
