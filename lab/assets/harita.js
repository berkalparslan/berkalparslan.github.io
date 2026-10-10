/* Dunya haritasi: ulke basina sayiyla boyanan (choropleth) satir ici SVG.
 *
 *   import { dunyaHaritasi } from "/lab/assets/harita.js?v=1";
 *   dunyaHaritasi(kutu, { TR: 96, US: 42, DE: 21 }, { birim: "kurulum" });
 *
 * Girdi ISO-2 ulke kodu (buyuk ya da kucuk harf). Sinirlar world-atlas@2.0.2
 * (Natural Earth 1:110m, TopoJSON) dosyasindan, cdn.jsdelivr.net'ten tam
 * surumle bir kez indirilir ve sayfa boyunca bellekte kalir. TopoJSON cozumu
 * burada (topojson-client gerekmez). Ulke adlari Intl.DisplayNames ile Turkce.
 * Renkler panel.css'teki --accent'ten, koyu ve acik temada ayni calisir.
 */
const ATLAS = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";

/* ISO 3166-1 alfa-2 -> sayisal (world-atlas kimlikleri sayisal kod). */
const KODLAR = "AF004AX248AL008DZ012AS016AD020AO024AI660AQ010AG028AR032AM051AW533AU036AT040AZ031BS044BH048BD050BB052BY112BE056BZ084BJ204BM060BT064BO068BQ535BA070BW072BV074BR076IO086BN096BG100BF854BI108CV132KH116CM120CA124KY136CF140TD148CL152CN156CX162CC166CO170KM174CG178CD180CK184CR188CI384HR191CU192CW531CY196CZ203DK208DJ262DM212DO214EC218EG818SV222GQ226ER232EE233SZ748ET231FK238FO234FJ242FI246FR250GF254PF258TF260GA266GM270GE268DE276GH288GI292GR300GL304GD308GP312GU316GT320GG831GN324GW624GY328HT332HM334VA336HN340HK344HU348IS352IN356ID360IR364IQ368IE372IM833IL376IT380JM388JP392JE832JO400KZ398KE404KI296KP408KR410KW414KG417LA418LV428LB422LS426LR430LY434LI438LT440LU442MO446MG450MW454MY458MV462ML466MT470MH584MQ474MR478MU480YT175MX484FM583MD498MC492MN496ME499MS500MA504MZ508MM104NA516NR520NP524NL528NC540NZ554NI558NE562NG566NU570NF574MK807MP580NO578OM512PK586PW585PS275PA591PG598PY600PE604PH608PN612PL616PT620PR630QA634RE638RO642RU643RW646BL652SH654KN659LC662MF663PM666VC670WS882SM674ST678SA682SN686RS688SC690SL694SG702SX534SK703SI705SB090SO706ZA710GS239SS728ES724LK144SD729SR740SJ744SE752CH756SY760TW158TJ762TZ834TH764TL626TG768TK772TO776TT780TN788TR792TM795TC796TV798UG800UA804AE784GB826US840UM581UY858UZ860VU548VE862VN704VG092VI850WF876EH732YE887ZM894ZW716XK-99";
const ISO2_SAYI = {};
const SAYI_ISO2 = {};
for (let i = 0; i < KODLAR.length;) {
  const a = KODLAR.slice(i, i + 2);
  const n = KODLAR.slice(i + 2, i + 5);
  i += 5;
  ISO2_SAYI[a] = n;
  SAYI_ISO2[n] = a;
}

let atlasSozu = null;
function atlas() {
  if (!atlasSozu) atlasSozu = fetch(ATLAS).then(r => { if (!r.ok) throw new Error("Harita indirilemedi"); return r.json(); })
    .then(cozTopo).catch(e => { atlasSozu = null; throw e; });
  return atlasSozu;
}

/* TopoJSON -> [{id, ad, halkalar:[[ [lon,lat], ...], ...]}] */
function cozTopo(topo) {
  const { scale = [1, 1], translate = [0, 0] } = topo.transform || {};
  const yaylar = topo.arcs.map(yay => {
    let x = 0, y = 0;
    return yay.map(([dx, dy]) => { x += dx; y += dy; return [x * scale[0] + translate[0], y * scale[1] + translate[1]]; });
  });
  const yay = i => i < 0 ? yaylar[~i].slice().reverse() : yaylar[i];
  const halka = dizi => { const out = []; dizi.forEach((i, k) => { const p = yay(i); out.push(...(k ? p.slice(1) : p)); }); return out; };
  return topo.objects.countries.geometries.map(g => {
    const pol = g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : [];
    return { id: g.id != null ? String(g.id) : g.properties?.name === "Kosovo" ? "-99" : "", ad: g.properties?.name || "", halkalar: pol.flatMap(p => p.map(halka)) };
  });
}

/* Esit alanli olmayan ama okunakli: Miller benzeri hafif basik silindirik. */
const G = 960, Y = 470;
const xx = lon => (lon + 180) / 360 * G;
const yy = lat => {
  const f = Math.max(-58, Math.min(84, lat)) * Math.PI / 180;
  const m = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * f));
  const ust = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * 84 * Math.PI / 180));
  const alt = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * -58 * Math.PI / 180));
  return (ust - m) / (ust - alt) * Y;
};
/* 180. boylami asan halkalar (Rusya, Fiji) bir uctan otekine cizgi cekmesin:
   boylami surekli hale getir, tasan kisim cercevenin disinda kalir. */
const duzle = h => { let onceki = null, kay = 0; return h.map(([a, b]) => { if (onceki != null && Math.abs(a + kay - onceki) > 180) kay += a + kay > onceki ? -360 : 360; onceki = a + kay; return [a + kay, b]; }); };
const yol = halkalar => halkalar.map(h => "M" + duzle(h).map(([a, b]) => `${xx(a).toFixed(1)},${yy(b).toFixed(1)}`).join("L") + "Z").join("");

let adlar = null;
const ulkeAdi = (iso2, yedek) => {
  try { adlar ||= new Intl.DisplayNames(["tr"], { type: "region" }); return adlar.of(iso2) || yedek; }
  catch (e) { return yedek || iso2; }
};

/**
 * @param kutu     DOM ogesi; icerigi silinip harita cizilir
 * @param veri     { "TR": 96, "us": 42, ... }  ISO-2 -> sayi
 * @param secenek  { birim: "kurulum", adim: 5, bos: "Ulke verisi yok." , tik: iso2 => ... }
 * @returns        Promise<{ eslesmeyen: ["??", ...] }>
 */
export async function dunyaHaritasi(kutu, veri = {}, secenek = {}) {
  kutu.textContent = "";
  kutu.classList.add("harita");
  const sayilar = {};
  const eslesmeyen = [];
  for (const [k, v] of Object.entries(veri || {})) {
    const a = String(k).toUpperCase(), n = Number(v) || 0;
    if (!n) continue;
    if (ISO2_SAYI[a]) sayilar[ISO2_SAYI[a]] = (sayilar[ISO2_SAYI[a]] || 0) + n;
    else eslesmeyen.push(a);
  }
  const yukleniyor = document.createElement("p");
  yukleniyor.className = "muted";
  yukleniyor.textContent = "Harita yükleniyor...";
  kutu.appendChild(yukleniyor);
  let ulkeler;
  try { ulkeler = await atlas(); }
  catch (e) { yukleniyor.textContent = "Harita yüklenemedi: " + e.message; return { eslesmeyen }; }
  kutu.textContent = "";

  const enCok = Math.max(0, ...Object.values(sayilar));
  const adim = secenek.adim || 5;
  /* Logaritmik basamak: birkac buyuk ulke gerisini soldurmasin. */
  const basamak = n => !n || !enCok ? -1 : enCok === 1 ? adim - 1 : Math.min(adim - 1, Math.floor(Math.log(n) / Math.log(enCok + 1e-9) * adim));
  const renk = b => `color-mix(in srgb, var(--accent) ${Math.round(18 + (b / Math.max(1, adim - 1)) * 82)}%, var(--card))`;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${G} ${Y}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Ülkelere göre dünya haritası");
  const ipucu = document.createElement("div");
  ipucu.className = "ipucu";
  ipucu.hidden = true;
  const birim = secenek.birim || "";
  for (const u of ulkeler) {
    if (u.id === "010") continue; // Antarktika: yer kaplar, veri olmaz
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", yol(u.halkalar));
    const n = sayilar[u.id] || 0, b = basamak(n);
    if (b < 0) p.setAttribute("class", "bos"); else p.style.fill = renk(b);
    const iso2 = SAYI_ISO2[u.id];
    const ad = iso2 ? ulkeAdi(iso2, u.ad) : u.ad;
    p.setAttribute("aria-label", `${ad}: ${n}`);
    p.addEventListener("mousemove", e => {
      const r = kutu.getBoundingClientRect();
      ipucu.hidden = false;
      ipucu.textContent = `${ad}: ${n.toLocaleString("tr-TR")}${birim ? " " + birim : ""}`;
      ipucu.style.left = `${e.clientX - r.left}px`;
      ipucu.style.top = `${e.clientY - r.top}px`;
    });
    p.addEventListener("mouseleave", () => { ipucu.hidden = true; });
    if (secenek.tik && iso2) { p.style.cursor = "pointer"; p.addEventListener("click", () => secenek.tik(iso2)); }
    svg.appendChild(p);
  }
  kutu.append(svg, ipucu);

  const lej = document.createElement("div");
  lej.className = "lejant";
  const toplam = Object.values(sayilar).reduce((a, b) => a + b, 0);
  if (!enCok) lej.textContent = secenek.bos || "Ülke verisi yok.";
  else {
    lej.append("Az");
    for (let b = 0; b < adim; b++) { const i = document.createElement("i"); i.style.background = renk(b); lej.appendChild(i); }
    lej.append(`Çok (en çok ${enCok.toLocaleString("tr-TR")}) · ${Object.keys(sayilar).length} ülke · toplam ${toplam.toLocaleString("tr-TR")}${birim ? " " + birim : ""}`);
    if (eslesmeyen.length) lej.append(` · haritada olmayan: ${eslesmeyen.join(", ")}`);
  }
  kutu.appendChild(lej);
  return { eslesmeyen };
}

export { ISO2_SAYI, SAYI_ISO2 };
