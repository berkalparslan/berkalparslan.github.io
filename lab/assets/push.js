/* Bildirim gonderme sayfasi, butun paneller icin ortak.
 *
 * Arkasinda her uygulamanin kendi Cloudflare Worker'i var (FCM HTTP v1,
 * Spark planinda calisir, Cloud Functions gerekmez). Worker'in API'si her
 * uygulamada ayni, degisen yalnizca adres ve etiketler; o yuzden sayfa da
 * ortak. Bir panelde ogrendigin sira digerinde de ayni:
 *
 *     Dogrula  ->  Test cihazlarina  ->  Gonder (ya da Zamanla)
 *
 * Kullanimi:
 *
 *   import { pushSayfasi } from "/lab/assets/push.js?v=1";
 *   pushSayfasi(icerik, {
 *     worker: "https://leafbook-push.kittapcom.workers.dev",
 *     token: () => auth.currentUser.getIdToken(),
 *     diller: ["en", "tr", "de"],
 *     sekmeler: [{ id: "community", ad: "Topluluk" }, ...],
 *     gecmis: async () => [...],          // pushes koleksiyonu
 *     kurulumlar: () => [...],            // kitle tahmini icin, istege bagli
 *   });
 */
import { $, el, sayi, tarih, kart, tiles, veriTablo } from "/lab/assets/panel.js?v=4";

const DIL_ADI = {
  en: "Ingilizce", tr: "Turkce", de: "Almanca", es: "Ispanyolca", fr: "Fransizca",
  it: "Italyanca", pt: "Portekizce", nl: "Felemenkce", ru: "Rusca", ja: "Japonca",
  ko: "Korece", zh: "Cince", ar: "Arapca", pl: "Lehce", sv: "Isvecce", id: "Endonezce",
  hi: "Hintce",
};

const DURUM_ADI = {
  sent: "Gonderildi", sending: "Gonderiliyor", scheduled: "Zamanlandi",
  cancelled: "Iptal edildi", failed: "Basarisiz",
};

export function pushSayfasi(kok, cfg) {
  const durum = {
    mod: "topics",
    metinler: { en: { title: "", body: "" } },
    sekme: "",
    filtre: { langs: [], pro: "any", signedIn: null, activeWithinDays: null, inactiveForDays: null },
    aktiflik: "any",
    gun: 7,
    zaman: "",
    mesgul: false,
  };

  const kutu = el("div");
  let gecmisKutu;
  kok.appendChild(kutu);
  ciz();

  function ciz() {
    kutu.textContent = "";
    kutu.appendChild(saglik());
    kutu.appendChild(kimeKarti());
    kutu.appendChild(neKarti());
    kutu.appendChild(gonderKarti());
    kutu.appendChild(gecmisKarti());
  }

  // ── Worker ayakta mi ──────────────────────────────────────────────────

  function saglik() {
    const satir = el("p", "muted", "Worker kontrol ediliyor...");
    const k = kart("Gonderim servisi", satir);
    fetch(cfg.worker + "/health?deep=1", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (!d.ready) {
          satir.innerHTML = "<b>Servis hesabi anahtari yuklenmemis.</b> " +
            "<code>npx wrangler secret put FCM_SA</code> ile yukle, sonra deploy et.";
          return;
        }
        satir.innerHTML = `Hazir. Firestore: <b>${d.firestore === "ok" ? "baglandi" : d.firestore}</b>` +
          ` &middot; tek gonderimde en fazla ${sayi(d.maxDevices)} cihaz.`;
      })
      .catch(() => { satir.innerHTML = "<b>Worker'a ulasilamadi.</b> Adres: <code>" + cfg.worker + "</code>"; });
    return k;
  }

  // ── Kime ──────────────────────────────────────────────────────────────

  function kimeKarti() {
    const govde = el("div");

    govde.appendChild(segment(
      [["topics", "Konular"], ["devices", "Kitle"]],
      durum.mod,
      v => { durum.mod = v; ciz(); },
    ));
    govde.appendChild(el("p", "muted", durum.mod === "topics"
      ? "Bildirime izin veren herkese tek hamlede. Her cihaz kendi dilindeki metni alir, dili yoksa Ingilizce."
      : "Filtreye uyan cihazlara tek tek. Yavas ama kime gittigini tam bilirsin."));

    if (durum.mod === "devices") {
      govde.appendChild(etiket("Cihaz dili"));
      govde.appendChild(cipler(cfg.diller, durum.filtre.langs, diller => {
        durum.filtre.langs = diller;
        tahminYenile();
      }, d => DIL_ADI[d] || d));

      const satir = el("div", "frow");
      satir.appendChild(alan("Pro", segment(
        [["any", "Hepsi"], ["pro", "Pro"], ["free", "Ucretsiz"]],
        durum.filtre.pro,
        v => { durum.filtre.pro = v; tahminYenile(); },
      )));
      satir.appendChild(alan("Hesap", segment(
        [["any", "Hepsi"], ["yes", "Girisli"], ["no", "Girissiz"]],
        durum.filtre.signedIn === null ? "any" : durum.filtre.signedIn ? "yes" : "no",
        v => { durum.filtre.signedIn = v === "any" ? null : v === "yes"; tahminYenile(); },
      )));
      govde.appendChild(satir);

      const akt = el("div");
      akt.appendChild(etiket("Son gorulme"));
      akt.appendChild(segment(
        [["any", "Hepsi"], ["active", "Son N gunde acan"], ["inactive", "N gundur acmayan"]],
        durum.aktiflik,
        v => { durum.aktiflik = v; gunUygula(); tahminYenile(); ciz(); },
      ));
      if (durum.aktiflik !== "any") {
        const inp = el("input");
        inp.type = "number"; inp.min = "1"; inp.max = "365"; inp.value = String(durum.gun);
        inp.style.maxWidth = "90px";
        inp.oninput = () => { durum.gun = Math.max(1, Math.min(365, +inp.value || 1)); gunUygula(); tahminYenile(); };
        const sar = el("label", "inline-n");
        sar.appendChild(inp);
        sar.appendChild(document.createTextNode(" gun"));
        akt.appendChild(sar);
      }
      govde.appendChild(akt);

      const tahmin = el("p", "muted", "Kitle hesaplaniyor...");
      tahmin.id = "pushTahmin";
      govde.appendChild(tahmin);
      setTimeout(tahminYenile, 0);
    }

    return kart("Kime", govde);
  }

  function gunUygula() {
    durum.filtre.activeWithinDays = durum.aktiflik === "active" ? durum.gun : null;
    durum.filtre.inactiveForDays = durum.aktiflik === "inactive" ? durum.gun : null;
  }

  async function tahminYenile() {
    const hedef = document.getElementById("pushTahmin");
    if (!hedef) return;
    hedef.textContent = "Kitle hesaplaniyor...";
    try {
      const d = await cagir("/audience", { filter: durum.filtre });
      hedef.innerHTML = `Filtreye uyan <b>${sayi(d.total)}</b> kurulum` +
        `${d.noToken ? ` &middot; ${sayi(d.noToken)} tanesinin cihaz adresi yok` : ""}` +
        `${d.notifOff ? ` &middot; ${sayi(d.notifOff)} tanesi bildirimi kapatmis` : ""}` +
        `. Ulasilacak: <b>${sayi(d.withToken)}</b>.`;
      if (!d.withToken) hedef.innerHTML += " <b>Bu filtreye uyan, adresi olan cihaz yok.</b>";
    } catch (e) {
      hedef.textContent = "Kitle hesaplanamadi: " + e.message;
    }
  }

  // ── Ne yazdigi ────────────────────────────────────────────────────────

  function neKarti() {
    const govde = el("div");
    for (const dil of Object.keys(durum.metinler)) govde.appendChild(dilAlani(dil));

    const kalan = cfg.diller.filter(d => !(d in durum.metinler));
    if (kalan.length && Object.keys(durum.metinler).length < 5) {
      const sec = el("select");
      sec.appendChild(new Option("Dil ekle", ""));
      for (const d of kalan) sec.appendChild(new Option(DIL_ADI[d] || d, d));
      sec.onchange = () => {
        if (!sec.value) return;
        durum.metinler[sec.value] = { title: "", body: "" };
        ciz();
      };
      govde.appendChild(sec);
    }
    govde.appendChild(el("p", "muted",
      "Ingilizce sart: dili listede olmayan herkese o gider. Ingilizce disinda en fazla 4 dil."));

    govde.appendChild(etiket("Dokununca acilacak yer"));
    const sekme = el("select");
    sekme.appendChild(new Option("Uygulamayi ac", ""));
    for (const s of cfg.sekmeler || []) sekme.appendChild(new Option(s.ad, s.id));
    sekme.value = durum.sekme;
    sekme.onchange = () => { durum.sekme = sekme.value; };
    govde.appendChild(sekme);

    return kart("Ne yazsin", govde);
  }

  function dilAlani(dil) {
    const sar = el("div", "field");
    const bas = el("div");
    bas.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:6px";
    bas.appendChild(el("b", null, DIL_ADI[dil] || dil));
    if (dil !== "en") {
      const sil = el("button", "ghost", "Kaldir");
      sil.onclick = () => { delete durum.metinler[dil]; ciz(); };
      bas.appendChild(sil);
    }
    sar.appendChild(bas);

    const baslik = el("input");
    baslik.maxLength = 60;
    baslik.placeholder = "Baslik";
    baslik.value = durum.metinler[dil].title;
    baslik.oninput = () => { durum.metinler[dil].title = baslik.value; sayac(); };
    sar.appendChild(baslik);

    const govde = el("textarea");
    govde.rows = 2;
    govde.maxLength = 180;
    govde.placeholder = "Metin";
    govde.value = durum.metinler[dil].body;
    govde.oninput = () => { durum.metinler[dil].body = govde.value; sayac(); };
    sar.appendChild(govde);

    const n = el("small", "muted");
    sar.appendChild(n);
    function sayac() {
      n.textContent = `${baslik.value.length}/60 baslik, ${govde.value.length}/180 metin`;
    }
    sayac();
    return sar;
  }

  // ── Gonder ────────────────────────────────────────────────────────────

  function gonderKarti() {
    const govde = el("div");
    const cikti = el("div");

    const eylem = el("div", "actions");
    eylem.appendChild(dugme("Dogrula", "ghost", () => calistir({ validate: true }, cikti)));
    eylem.appendChild(dugme("Test cihazlarina", "ghost", () => calistir({ test: true }, cikti)));
    eylem.appendChild(dugme("Gonder", null, async () => {
      if (!confirm("Bildirim herkese gidiyor. Emin misin?")) return;
      await calistir({}, cikti);
    }));
    govde.appendChild(eylem);

    const zamanSatiri = el("div", "field");
    zamanSatiri.appendChild(etiket("Simdi degil, ileri bir zamanda"));
    const ic = el("div");
    ic.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center";
    const inp = el("input");
    inp.type = "datetime-local";
    inp.style.maxWidth = "230px";
    inp.oninput = () => { durum.zaman = inp.value; };
    ic.appendChild(inp);
    ic.appendChild(dugme("Zamanla", "ghost", () => {
      if (!durum.zaman) { cikti.textContent = "Once bir zaman sec."; return; }
      return calistir({ sendAt: new Date(durum.zaman).toISOString() }, cikti);
    }));
    zamanSatiri.appendChild(ic);
    govde.appendChild(zamanSatiri);

    govde.appendChild(el("p", "muted",
      "Sira: once Dogrula (hicbir sey gitmez, metinleri ve hedefi kontrol eder), " +
      "sonra Test cihazlarina (yalnizca TestFlight ve isaretli cihazlar), en son Gonder."));
    govde.appendChild(cikti);
    return kart("Gonder", govde);
  }

  async function calistir(ek, cikti) {
    if (durum.mesgul) return;
    durum.mesgul = true;
    cikti.textContent = "Gonderiliyor...";
    try {
      const d = await cagir("/push", {
        mode: durum.mod,
        texts: durum.metinler,
        tab: durum.sekme || null,
        filter: durum.mod === "devices" ? durum.filtre : null,
        ...ek,
      });
      cikti.innerHTML = sonucMetni(d, ek);
      // Cihaz gonderimi parcali gider: kalanini burada doner doner bitiririz.
      let kalan = d.remaining || 0;
      while (kalan > 0) {
        const s = await cagir("/continue", { pid: d.pid });
        cikti.innerHTML = sonucMetni(s, ek);
        if (s.busy) break;
        kalan = s.remaining || 0;
      }
      if (!ek.validate) gecmisYenile();
    } catch (e) {
      cikti.innerHTML = `<b>Olmadi:</b> ${e.message}`;
    }
    durum.mesgul = false;
  }

  function sonucMetni(d, ek) {
    if (ek.validate) {
      return `Dogrulandi. ${d.counts ? sayi(d.counts.targeted || 0) + " hedef" : "Metinler gecerli"}` +
        `${d.estimate ? ` &middot; tahmini ${sayi(d.estimate)} kisi` : ""}. Hicbir sey gonderilmedi.`;
    }
    if (d.status === "scheduled") {
      return `Zamanlandi: <b>${tarih(d.sendAt)}</b>. Iptal etmek icin asagidaki listeden.`;
    }
    const gonderilen = d.sent ?? d.counts?.sent ?? 0;
    return `<b>${sayi(gonderilen)}</b> gonderildi` +
      `${d.counts?.targeted ? ` / ${sayi(d.counts.targeted)} hedef` : ""}` +
      `${d.remaining ? ` &middot; ${sayi(d.remaining)} kaldi` : ""}` +
      `${d.removedTokens ? ` &middot; ${sayi(d.removedTokens)} olu adres temizlendi` : ""}.`;
  }

  // ── Gecmis ────────────────────────────────────────────────────────────

  function gecmisKarti() {
    gecmisKutu = el("div");
    gecmisKutu.appendChild(el("p", "muted", "Yukleniyor..."));
    const k = kart("Gonderilenler", gecmisKutu);
    gecmisYenile();
    return k;
  }

  async function gecmisYenile() {
    if (!gecmisKutu || !cfg.gecmis) return;
    let liste = [];
    try { liste = await cfg.gecmis(); } catch (e) { /* kurallar ya da ag */ }
    gecmisKutu.textContent = "";
    gecmisKutu.appendChild(veriTablo(
      ["Zaman", { ad: "Durum", filtre: true }, { ad: "Mod", filtre: true }, "Baslik",
       { ad: "Hedef", num: true }, { ad: "Gonderilen", num: true }, ""],
      liste.map(p => {
        const t = p.texts?.en || Object.values(p.texts || {})[0] || {};
        const ne = p.sendAt || p.at;
        return [
          { d: tarih(ne), s: new Date(ne).getTime() },
          DURUM_ADI[p.status] || p.status || "",
          p.test ? "Test" : p.mode === "devices" ? "Kitle" : "Konular",
          t.title || t.body || p.summary || "",
          p.counts?.targeted ?? "",
          p.sent ?? p.counts?.sent ?? "",
          p.status === "scheduled" ? iptalDugmesi(p.pid) : "",
        ];
      }),
      { sirala: [0, "desc"], bos: "Henuz panelden bildirim gonderilmedi." },
    ));
  }

  function iptalDugmesi(pid) {
    const b = el("button", "ghost", "Iptal et");
    b.onclick = async () => {
      if (!confirm("Zamanlanmis bildirim iptal edilsin mi?")) return;
      try { await cagir("/cancel", { pid }); gecmisYenile(); }
      catch (e) { alert(e.message); }
    };
    return b;
  }

  // ── Worker cagrisi ────────────────────────────────────────────────────

  async function cagir(yol, govde) {
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
}

/* ── Kucuk parcalar ──────────────────────────────────────────────────── */

function etiket(metin) {
  const s = el("span", "lbl", metin);
  s.style.cssText = "display:block;margin:10px 0 6px;font-size:12px;opacity:.7";
  return s;
}

function alan(baslik, icerik) {
  const d = el("div", "field");
  if (baslik.trim()) d.appendChild(etiket(baslik));
  d.appendChild(icerik);
  return d;
}

function dugme(metin, cls, tik) {
  const b = el("button", cls, metin);
  b.onclick = tik;
  return b;
}

function segment(secenekler, deger, degisti) {
  const s = el("div", "seg");
  for (const [v, ad] of secenekler) {
    const b = el("button", v === deger ? "on" : null, ad);
    b.onclick = () => degisti(v);
    s.appendChild(b);
  }
  return s;
}

function cipler(hepsi, secili, degisti, ad = x => x) {
  const sar = el("div", "chips");
  for (const v of hepsi) {
    const acik = secili.includes(v);
    const b = el("button", acik ? "chip on" : "chip", ad(v));
    b.onclick = () => {
      const yeni = acik ? secili.filter(x => x !== v) : [...secili, v];
      degisti(yeni);
      b.className = acik ? "chip" : "chip on";
    };
    sar.appendChild(b);
  }
  return sar;
}
