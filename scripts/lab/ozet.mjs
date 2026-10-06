/* Ham veri → panel paketi. Saf: dosya/ağ yok, iki tarafta aynı kod:
   build.mjs (Mac, vault dosyalarından) ve uzak/calistir.mjs (Worker /
   GitHub Actions, API'lerden). Çıktı şifrelenip lab/panel/data.enc.json olur.

   ham = {
     gunluk: [{tarih, veri, apps}] tarih sırasında,
     android: {apps, notlar, uretim}, yorumlar: {slug: …}, kova: {gunluk, yorumlar, hata},
     kur, iosDurum: {apps, uretim}, vault: {apps, genel, kampanyalar, kampanyaSorular, reklam},
     ga4: {gunluk, satinalma, hatalar, uretim} | null, kovaTanimli: boolean,
     yenile: {tur, …} | null   (panelin "Yenile" düğmesi için)
   } */

import { APPS } from "./apps.mjs";
import { PROFIL, SERVISLER, SABIT_GIDER, TAKVIM, HEDEF } from "./profil.mjs";

export const PAKET_SURUM = 7;

export function panelOlustur(ham) {
  const gunluk = [...(ham.gunluk || [])].sort((a, b) => a.tarih.localeCompare(b.tarih));
  const android = ham.android || { apps: {}, notlar: [] };
  const yorumlar = ham.yorumlar || {};
  const kova = ham.kova || { gunluk: {}, yorumlar: {} };
  const kur = ham.kur || null;
  const iosDurum = ham.iosDurum || { apps: {} };
  const vault = ham.vault || { apps: {}, genel: [] };
  const ga4 = ham.ga4 || null;
  const telemetri = ham.telemetri || null;
  const web = ham.web || null;
  const fg = ham.framegrove || null;

  const androidGun = kova.gunluk || {};
  const androidVar = Object.keys(androidGun).length > 0;

  /* Günlük matris: i=iOS indirme, g=güncelleme, s=satın alma, a=Android indirme,
     k=kaldırma, u=ülkeler, p=gelir, au=aktif kullanıcı (GA4), nu=yeni kullanıcı,
     e=olaylar (GA4), gu=GA4 aktif kullanıcı ülkeye göre.
     Play (sürüm 7): ak=aktif cihaz (o günün anlık sayısı, toplanmaz),
     ua=Play kurulum ülkeye göre, cr=çökme, an=ANR, pa=Play geliri (para birimi
     haritası, Google payı düşülmüş), ps=Play uygulama içi satın alma.
     Yalnız dolu günler. */
  const gunler = gunluk.map(g => g.tarih);
  const iosVeriYok = gunluk.map(g => !g.veri);
  const veri = {};
  gunluk.forEach((g, ix) => {
    if (g.veri) {
      for (const [slug, a] of Object.entries(g.apps || {})) {
        if (!a.indirme && !a.guncelleme && !a.iap && !Object.keys(a.gelir || {}).length) continue;
        const h = (veri[slug] ||= {})[ix] ||= {};
        if (a.indirme)    h.i = a.indirme;
        if (a.iap)        h.s = a.iap;
        if (a.guncelleme) h.g = a.guncelleme;
        if (Object.keys(a.ulkeler || {}).length) h.u = a.ulkeler;
        if (Object.keys(a.gelir   || {}).length) h.p = a.gelir;
      }
    }
    for (const [slug, a] of Object.entries(androidGun[g.tarih] || {})) {
      if (!a.indirme && !a.kaldirma && !a.aktif && !a.cokme && !a.anr && !a.gelir) continue;
      const h = (veri[slug] ||= {})[ix] ||= {};
      if (a.indirme)  h.a = a.indirme;
      if (a.kaldirma) h.k = a.kaldirma;
      if (a.aktif)    h.ak = a.aktif;
      if (a.cokme)    h.cr = a.cokme;
      if (a.anr)      h.an = a.anr;
      if (Object.keys(a.ulke || {}).length)  h.ua = a.ulke;
      if (Object.keys(a.gelir || {}).length) h.pa = a.gelir;
      if (a.satis)    h.ps = a.satis;
    }
    for (const [slug, gg] of Object.entries(ga4?.gunluk || {})) {
      const x = gg[g.tarih]; if (!x) continue;
      const h = (veri[slug] ||= {})[ix] ||= {};
      if (x.au) h.au = x.au;
      if (x.nu) h.nu = x.nu;
      if (Object.keys(x.olay || {}).length) h.e = x.olay;
      if (x.gelir) h.ga = +x.gelir.toFixed(2);
      if (x.reklam) h.ar = +x.reklam.toFixed(2);
      if (Object.keys(x.ulke || {}).length) h.gu = x.ulke;
    }
  });

  const apps = APPS.map(app => ({
    slug: app.slug, ad: app.ad,
    ios: app.ios?.bundle || null, android: app.android || null,
    yorum: yorumlar[app.slug] || null,
    androidYorum: kova.yorumlar?.[app.slug] || null,
    play: android.apps?.[app.slug]?.tracks || null,
    iosSurum: iosDurum.apps?.[app.slug] || null,
    vault: vault.apps?.[app.slug] || null,
    profil: PROFIL[app.slug] || null,
    ga4: ga4?.gunluk?.[app.slug] ? true : false,
    iosHesap: app.ios?.hesap || (app.ios ? "aberk" : null),
    playPuan: kova.puan?.[app.slug] || null,
    playAktifUlke: (() => {
      /* En son günün ülke başına aktif cihazı. */
      const t = Object.keys(androidGun).filter(t => androidGun[t]?.[app.slug]?.aktifUlke).sort().at(-1);
      return t ? { tarih: t, ulke: androidGun[t][app.slug].aktifUlke } : null;
    })()
  }));
  const profilsiz = apps.filter(a => !a.profil).map(a => a.slug);

  const sonVeriliIos = [...gunluk].reverse().find(g => g.veri)?.tarih || null;
  const kaynaklar = [
    { ad: "App Store · satış raporları", arac: "ascelerate reports sales / ASC API",
      durum: sonVeriliIos ? "ok" : "yok", son: sonVeriliIos,
      not: `${gunluk.length} gün, ${iosVeriYok.filter(Boolean).length} günde Apple raporu yok` },
    { ad: "App Store · yorumlar", arac: "ascelerate reviews list / ASC API",
      durum: Object.values(yorumlar).some(y => y?.adet) ? "ok" : "yok",
      son: Object.values(yorumlar).map(y => y?.son).filter(Boolean).sort().at(-1) || null,
      not: `${Object.values(yorumlar).reduce((t, y) => t + (y?.adet || 0), 0)} yorum, ` +
           `${Object.values(yorumlar).reduce((t, y) => t + (y?.cevapsiz || 0), 0)} cevapsız` },
    { ad: "App Store · sürüm durumu", arac: "ascelerate apps versions / ASC API",
      durum: Object.keys(iosDurum.apps || {}).length ? "ok" : "yok", son: iosDurum.uretim || null,
      not: `${Object.keys(iosDurum.apps || {}).length} uygulamada sürüm okundu` },
    { ad: "Google Play · sürüm ve track", arac: "gplay status / androidpublisher",
      durum: Object.values(android.apps || {}).some(a => a.tracks?.length) ? "ok" : "yok", son: android.uretim || null,
      not: `${Object.values(android.apps || {}).filter(a => a.tracks?.length).length} uygulamada sürüm okundu` },
    { ad: "Google Play · indirme, gelir, yorum geçmişi", arac: "Cloud Storage toplu raporlar",
      durum: androidVar ? "ok" : "engel", son: kova.uretim || null,
      not: kova.hata || (androidVar ? "akıyor" : "kova tanımlı, veri yok") },
    { ad: "Firebase Analytics (GA4)", arac: "GA4 Data API",
      durum: ga4 && Object.keys(ga4.gunluk || {}).length ? "ok" : ga4?.hatalar?.length ? "engel" : "yok", son: ga4?.uretim || null,
      not: ga4 ? `${Object.keys(ga4.gunluk || {}).length} uygulama · ${ga4.satinalma?.length || 0} satın alma satırı` +
           (ga4.hatalar?.length ? ` · ${ga4.hatalar.length} mülk okunamadı` : "") : "çekilmedi" },
    { ad: "Uygulama telemetrisi (Firestore)", arac: "installs/ · Firebase CLI oturumu",
      durum: telemetri && Object.keys(telemetri.apps || {}).length ? "ok" : telemetri?.hatalar?.length ? "engel" : "yok", son: telemetri?.uretim || null,
      not: telemetri ? Object.entries(telemetri.apps || {}).map(([s, a]) => `${s} ${a.toplam} kurulum`).join(" · ") +
        (telemetri.hatalar?.length ? ` · ${telemetri.hatalar.map(h => h.proje + ": " + h.hata.slice(0, 60)).join("; ")}` : "") : "çekilmedi" },
    { ad: "Site trafiği · Cloudflare Web Analytics", arac: "GraphQL rumPageloadEventsAdaptiveGroups",
      durum: web && !web.hata ? "ok" : web?.hata ? "engel" : "yok", son: web?.uretim || null,
      not: web?.hata || (web ? `${Object.keys(web.gunluk || {}).length} gün veri (ölçüm 2 Eki 2026'da başladı)` : "çekilmedi") },
    { ad: "Framegrove · npm, GitHub, site, MCP Registry", arac: "api.npmjs.org · gh api · Cloudflare RUM · registry.modelcontextprotocol.io",
      durum: fg && !fg.hatalar?.length ? "ok" : fg ? "engel" : "yok", son: fg?.uretim || null,
      not: fg ? (fg.hatalar?.join(" · ") || `npm ${fg.npm?.surum || "·"} · ${fg.github?.yildiz ?? "·"} yıldız · registry ${fg.registry?.kayitli ? "kayıtlı" : "yok"}`) : "çekilmedi" },
    { ad: "Site trafiği · Umami", arac: "cloud.umami.is API",
      durum: "yok", son: null, not: "API anahtarı yok: Umami → Settings → API keys, anahtar vault'a (gizli.json umamiKey) konursa eklenir" },
    { ad: "Döviz kurları", arac: "open.er-api.com",
      durum: kur ? "ok" : "yok", son: kur?.tarih || null,
      not: kur ? `1 USD = ${kur.oran.TRY.toFixed(2)} TRY` : "çekilemedi, gelir ayrı para birimlerinde" }
  ];

  const notlar = [...(android.notlar || []), ...(ham.toplamaNotlar || [])];
  if (kova.hata) notlar.push(`Play toplu raporları: ${kova.hata}`);
  else if (!androidVar && ham.kovaTanimli) notlar.push("Cloud Storage kovası tanımlı ama hiç indirme verisi gelmedi.");
  /* Sessiz kesinti olmasın: 24 Eyl 2026'da iOS iki hafta boş geldi, görev yine
     "yayınlandı" dedi. Bir kaynak günlerdir gelmiyorsa en üste UYARI. */
  const kacGun = t => t ? Math.floor((Date.now() - Date.parse(t)) / 864e5) : null;
  const andSon = Object.keys(androidGun).filter(t => Object.values(androidGun[t]).some(a => a.indirme || a.aktif)).sort().at(-1) || null;
  if (!sonVeriliIos || kacGun(sonVeriliIos) > 4)
    notlar.unshift(`UYARI: App Store satış verisi ${sonVeriliIos ? `${kacGun(sonVeriliIos)} gündür gelmiyor (son ${sonVeriliIos})` : "hiç yok"}. ~/.ascelerate/config.aberk.json ve vendorNumber'a bak; ios-*.json içindeki "sebep" alanı hatayı yazar.`);
  if (ham.kovaTanimli && (!andSon || kacGun(andSon) > 16))
    notlar.unshift(`UYARI: Play toplu raporu ${andSon ? `${kacGun(andSon)} gündür gelmiyor (son ${andSon})` : "hiç yok"}. Play normalde ~7-10 gün geriden yayınlar.`);
  const veriYokGun = iosVeriYok.filter(Boolean).length;
  if (veriYokGun) notlar.push(`${veriYokGun} gün için Apple raporu yok — grafikte boşluk, ortalamada paydadan düşük.`);
  if (profilsiz.length) notlar.push(`Profili olmayan uygulama: ${profilsiz.join(", ")} (scripts/lab/profil.mjs)`);
  for (const h of ga4?.hatalar || []) notlar.push(`GA4 ${h.mulk}: ${h.hata.slice(0, 140)}`);

  return {
    surum: PAKET_SURUM,
    uretim: new Date().toISOString(),
    kaynakSistem: ham.kaynakSistem || "mac",
    gunler, iosVeriYok, apps, veri,
    androidVeriVar: androidVar,
    kur,
    genelGorevler: vault.genel || [],
    kaynaklar, notlar,
    servisler: SERVISLER, sabitGider: SABIT_GIDER, takvim: TAKVIM, hedef: HEDEF,
    kampanyalar: vault.kampanyalar || [],
    kampanyaSorular: vault.kampanyaSorular || [],
    reklam: vault.reklam || [],
    ga4Satinalma: ga4?.satinalma || [],
    ga4Donem: ga4?.donem || null,
    telemetri: telemetri ? { uretim: telemetri.uretim, apps: telemetri.apps } : null,
    web: web && !web.hata ? web : null,
    framegrove: fg,
    androidSon: andSon,
    yenile: ham.yenile || null
  };
}

/* Paketten ham günlük listesine geri dönüş — uzak çalıştırıcı geçmişi
   şifreli dosyadan alır, yeni günleri ekler, yeniden üretir. Böylece durum
   deposu (KV, veritabanı) gerekmiyor; geçmiş dosyanın kendisinde. */
export function paketAyristir(panel) {
  const gunluk = [];
  (panel.gunler || []).forEach((tarih, ix) => {
    const veriVar = !(panel.iosVeriYok || [])[ix];
    const apps = {};
    for (const [slug, gunlerH] of Object.entries(panel.veri || {})) {
      const h = gunlerH[ix]; if (!h) continue;
      if (!h.i && !h.g && !h.s && !h.p) continue;
      apps[slug] = { indirme: h.i || 0, guncelleme: h.g || 0, iap: h.s || 0, gelir: h.p || {}, ulkeler: h.u || {}, cihazlar: {} };
    }
    gunluk.push(veriVar ? { tarih, veri: true, apps } : { tarih, veri: false, sebep: "apple-rapor-yok", apps: {} });
  });
  return gunluk;
}

export function ozetSatiri(panel, kapaliBoyut) {
  const son = (n, alan) => panel.gunler.slice(-n).reduce((t, _, j) => {
    const ix = panel.gunler.length - n + j;
    return t + Object.values(panel.veri).reduce((x, g) => x + (g[ix]?.[alan] || 0), 0);
  }, 0);
  return [
    `${panel.gunler.length} gün · ${panel.apps.length} uygulama${kapaliBoyut ? ` · ${(kapaliBoyut / 1024).toFixed(1)} KB şifreli` : ""}`,
    `${panel.apps.reduce((t, a) => t + (a.yorum?.liste?.length || 0), 0)} yorum metni · ` +
    `${panel.apps.reduce((t, a) => t + (a.vault?.gorevler?.filter(g => !g.bitti).length || 0), 0)} açık görev · kur ${panel.kur ? "var" : "yok"}`,
    `son 7 gün: ${son(7, "i")} iOS + ${son(7, "a")} Android · ${son(7, "s")} satın alma`,
    `son veri: App Store ${[...panel.gunler].reverse().find((_, j) => !panel.iosVeriYok[panel.gunler.length - 1 - j]) || "yok"} · Play ${panel.androidSon || "yok"}` +
    ` · telemetri ${panel.telemetri ? Object.keys(panel.telemetri.apps || {}).length + " uygulama" : "yok"} · site ${panel.web ? "var" : "yok"}`
  ];
}
