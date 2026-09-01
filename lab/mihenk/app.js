/* Mihenk — uygulama ölçme aracı
   App Store verisi itunes.apple.com'dan doğrudan gelir (CORS açık).
   Google Play ve App Store ürün sayfaları CORS'a kapalı; onlar için
   köprü gerekir: yerelde server.py, yayında Cloudflare Worker. */

'use strict';

// ── Model ───────────────────────────────────────────────────────────
// İndirme/yorum oranı, kendi uygulamalarımızın gerçek satış raporlarıyla
// kalibre edildi. Aralık olarak uygulanır, tek sayı üretilmez.
const RATIO = { low: 25, mid: 31, high: 40 };
const LTV_DEFAULT = 0.67;
const LTV = {
  'Health & Fitness': 1.21, 'Medical': 1.10,
  'Productivity': 0.85, 'Business': 0.85, 'Finance': 0.80,
  'Education': 0.78, 'Utilities': 0.67, 'Lifestyle': 0.60,
  'Photo & Video': 0.60, 'Sports': 0.55, 'Entertainment': 0.50, 'Games': 0.38,
};
const STORE_SHARE = 0.85;     // Küçük İşletme Programı geliştirici payı
const SUB_MULT = 3;           // abonelikli ücretsiz uygulamalar için üst sınır

const COUNTRIES = {
  fast: 'us gb de tr nl fr ca au jp it es br'.split(' '),
  wide: 'us gb de tr nl fr ca au jp it es br mx in id ru kr se pl ch at be dk no fi pt sa ae'.split(' '),
  full: 'us gb de tr nl fr ca au jp it es br mx in id ru kr se pl ch at be dk no fi pt sa ae za my ph th vn hk tw sg nz ie cz hu ro il eg pk ng cn'.split(' '),
};
const SCOPE_N = { fast: 12, wide: 28, full: 46 };
const STORE_KEY = 'mihenk.saved.v2';

// ── Yardımcılar ─────────────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const el = (id) => document.getElementById(id);
const int = (v) => Math.round(v).toLocaleString('tr-TR');
const money = (v) => v >= 1000 ? '$' + Math.round(v).toLocaleString('tr-TR')
                               : '$' + v.toFixed(v < 10 ? 1 : 0);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
  (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const tidy = (c) => !c ? '—' :
  String(c).toLowerCase().replace(/_/g,' ').replace(/\b\w/g,(m)=>m.toUpperCase());

const OUT = () => el('out');
const statusEl = () => el('status');
function say(msg, isErr) {
  const s = statusEl();
  s.hidden = false;
  s.className = 'status' + (isErr ? ' err' : '');
  s.textContent = msg;
}
const hideStatus = () => { statusEl().hidden = true; };

// ── Köprü ───────────────────────────────────────────────────────────
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const API = LOCAL ? '' : (window.MIHENK_API || '');
const BRIDGE = LOCAL || !!API;

async function bridge(path) {
  if (!BRIDGE) throw new Error('köprü tanımlı değil');
  const r = await fetch(API + path);
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j;
}
async function itunes(endpoint, params) {
  const r = await fetch(`https://itunes.apple.com/${endpoint}?` + new URLSearchParams(params));
  if (!r.ok) throw new Error('App Store ' + r.status);
  return r.json();
}
const lookup = (p) => itunes('lookup', p);
const searchAPI = (p) => itunes('search', p);

// ── Girdiyi anla ────────────────────────────────────────────────────
function parseInput(raw) {
  const s = (raw || '').trim();
  if (!s) return null;
  let m;
  if ((m = s.match(/play\.google\.com\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/i)))
    return { kind: 'playApp', id: m[1] };
  if ((m = s.match(/play\.google\.com\/store\/apps\/dev\?id=(\d+)/i)))
    return { kind: 'playDev', id: m[1] };
  if ((m = s.match(/play\.google\.com\/store\/apps\/developer\?id=([^&]+)/i)))
    return { kind: 'playDev', id: decodeURIComponent(m[1].replace(/\+/g, ' ')), byName: true };
  if ((m = s.match(/apps\.apple\.com[^\s]*\/developer\/(?:[^/]+\/)?id(\d+)/i)))
    return { kind: 'iosDev', id: m[1] };
  if ((m = s.match(/apps\.apple\.com[^\s]*\/id(\d+)/i)))
    return { kind: 'iosApp', id: m[1] };
  if (/^\d{6,}$/.test(s)) return { kind: 'iosAuto', id: s };
  if (/^[a-zA-Z0-9]+(\.[a-zA-Z0-9_]+){2,}$/.test(s)) return { kind: 'playApp', id: s };
  return { kind: 'search', term: s };
}

// ── Tahmin ──────────────────────────────────────────────────────────
function estimate(app, ratings) {
  const price = app.price || 0;
  const ltv = LTV[app.primaryGenreName] ?? LTV_DEFAULT;
  const dl = { low: ratings * RATIO.low, mid: ratings * RATIO.mid, high: ratings * RATIO.high };

  const rel = app.releaseDate ? new Date(app.releaseDate) : null;
  const months = rel ? Math.max(1, (Date.now() - rel) / 2629746000) : null;

  const rev = (n, mult) => price > 0 ? n * price * STORE_SHARE : n * ltv * mult;
  const total = {
    low: rev(dl.low, 1),
    mid: rev(dl.mid, price > 0 ? 1 : 1.7),
    high: rev(dl.high, price > 0 ? 1 : SUB_MULT),
  };
  const monthly = months
    ? { low: total.low / months, mid: total.mid / months, high: total.high / months } : null;

  let conf = 'low', confText = 'Zayıf — 10\'dan az yorum var';
  if (ratings >= 100) { conf = 'high'; confText = 'Sağlam — 100\'den çok yorum'; }
  else if (ratings >= 10) { conf = 'mid'; confText = 'Orta — 10 ile 99 arası yorum'; }

  const notes = [];
  if (ratings === 0) notes.push({ warn: true, t: 'Hiç yorum yok, bu yüzden indirme tahmini yapılamıyor.' });
  else if (ratings < 10) notes.push({ warn: true, t: 'Çok az yorum var. Aralık geniş; buradaki sayıya karar verecek kadar güvenme.' });

  const upd = app.currentVersionReleaseDate ? new Date(app.currentVersionReleaseDate) : null;
  if (upd) {
    const ay = (Date.now() - upd) / 2629746000;
    if (ay > 12) notes.push({ warn: true, t: `${Math.round(ay)} aydır güncellenmemiş. Yorumlar zamanla birikmiş ama indirme durmuş olabilir — tahmin olduğundan yüksek çıkar.` });
    else if (ay < 2) notes.push({ warn: false, t: 'Aktif bakımda: son güncelleme 2 aydan yeni.' });
  }
  if (months && months < 3) notes.push({ warn: true, t: 'Uygulama 3 aydan yeni. Aylık ortalama bu kadar kısa sürede oynak olur.' });
  if (price > 0) notes.push({ warn: false, t: 'Ücretli uygulama. Ayrıca uygulama içi satın alma varsa gerçek gelir bundan yüksektir.' });
  else notes.push({ warn: false, t: `Ücretsiz uygulama. Alt sınır "${app.primaryGenreName || 'genel'}" kategorisinin indirme başına ortalaması (${money(ltv)}); üst sınır aboneliği olanlar için üç katına açıldı.` });

  return { dl, total, monthly, months, ltv, price, conf, confText, notes };
}

// ── Ortak parçalar ──────────────────────────────────────────────────
const storeTag = (s) => s === 'play'
  ? '<span class="store play">▶ Google Play</span>'
  : '<span class="store ios"> App Store</span>';

const yearsLabel = (m) => !m ? '—'
  : (m >= 12 ? (m / 12).toFixed(1) + ' yıl' : Math.round(m) + ' ay');

function notesBlock(notes, calc) {
  return `<div class="sect">
    ${calc ? `<p class="calc">${esc(calc)}</p>` : ''}
    <ul class="notes">${notes.map((n) =>
      `<li class="${n.warn ? 'warn' : ''}">${esc(n.t)}</li>`).join('')}</ul>
  </div>`;
}

// ── iOS uygulama kartı ──────────────────────────────────────────────
function iosCard(app, ratings, per, est, scope, avg) {
  const yas = yearsLabel(est.months);
  const priceTag = est.price > 0
    ? `<span class="tag money">${esc(app.formattedPrice)}</span>`
    : '<span class="tag quiet">Ücretsiz</span>';

  const calc = est.price > 0
    ? `${int(est.dl.mid)} indirme × ${money(est.price)} × 0,85 (mağaza payı sonrası) ÷ ${Math.round(est.months)} ay`
    : `${int(est.dl.mid)} indirme × ${money(est.ltv)} (abonelik varsa ×3'e kadar) ÷ ${Math.round(est.months || 1)} ay`;

  return `<article class="card" data-ios="${app.trackId}">
    <div class="card-head">
      ${app.artworkUrl100 ? `<img class="icon" src="${esc(app.artworkUrl100)}" alt="">` : '<div class="icon"></div>'}
      <div class="card-id">
        ${storeTag('ios')}
        <h3>${esc(app.trackName)}</h3>
        <p class="by">${esc(app.sellerName || '')}</p>
        <div class="tags">
          ${priceTag}
          <span class="tag">${esc(app.primaryGenreName || '—')}</span>
          <span class="tag">Sürüm ${esc(app.version || '?')}</span>
          <span class="tag">${yas} önce çıktı</span>
          <span class="tag quiet">${SCOPE_N[scope]} ülke tarandı</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="ghost" type="button" data-save>Kaydet</button>
        <button class="ghost" type="button" data-findplay>Android'de ara</button>
      </div>
    </div>

    <div class="figs">
      <div><span class="lab">Toplam yorum</span>
        <span class="fig">${int(ratings)}</span>
        <span class="sub">${avg ? '★ ' + avg.toFixed(2) + ' ortalama puan' : 'henüz puan yok'}</span></div>
      <div><span class="lab">İndirme — tahmin</span>
        ${ratings ? `<span class="fig">${int(est.dl.low)} – ${int(est.dl.high)}</span>
          <span class="sub">orta değer ${int(est.dl.mid)}</span>`
          : '<span class="fig">—</span><span class="sub">yorum olmadan hesaplanamıyor</span>'}</div>
      <div><span class="lab">Aylık gelir — tahmin</span>
        ${ratings ? `<span class="fig money">${money(est.monthly.low)} – ${money(est.monthly.high)}</span>
          <span class="sub">orta değer ${money(est.monthly.mid)}</span>`
          : '<span class="fig">—</span>'}</div>
      <div><span class="lab">Çıkışından bugüne</span>
        ${ratings ? `<span class="fig money">${money(est.total.low)} – ${money(est.total.high)}</span>
          <span class="sub"><span class="conf ${est.conf}">${esc(est.confText)}</span></span>`
          : '<span class="fig">—</span>'}</div>
    </div>

    <div class="sect tint" data-iosx>
      <h4>Para modeli</h4><p class="muted">alınıyor…</p></div>

    ${per.length ? `<div class="sect"><h4>Yorumlar hangi ülkelerden geldi</h4>
      <div class="cbars">${per.slice(0, 16).map((p) =>
        `<span class="cbar">${p.c.toUpperCase()} <b>${p.n}</b><em>★${p.avg.toFixed(1)}</em></span>`).join('')}</div></div>` : ''}

    ${notesBlock(est.notes, calc)}
    <div data-playslot></div>
  </article>`;
}

// ── Play uygulama kartı ─────────────────────────────────────────────
function playCard(a) {
  const tags = [];
  if (a.price && a.price !== 'Free') tags.push(`<span class="tag money">${esc(a.price)}</span>`);
  else tags.push('<span class="tag quiet">Ücretsiz</span>');
  tags.push(`<span class="tag">${esc(tidy(a.category))}</span>`);
  if (a.hasIAP) tags.push('<span class="tag iap">Uygulama içi satın alma</span>');
  if (a.hasAds) tags.push('<span class="tag ads">Reklam içeriyor</span>');
  if (a.updated) tags.push(`<span class="tag quiet">Güncelleme: ${esc(a.updated)}</span>`);

  return `<article class="card" data-play="${esc(a.package)}">
    <div class="card-head">
      ${a.icon ? `<img class="icon" src="${esc(a.icon)}" alt="">` : '<div class="icon"></div>'}
      <div class="card-id">
        ${storeTag('play')}
        <h3>${esc(a.name || a.package)}</h3>
        <p class="by">${esc(a.developer || '—')}</p>
        <div class="tags">${tags.join('')}</div>
      </div>
      <div class="card-actions">
        <button class="ghost" type="button" data-save-play="${esc(a.package)}">Kaydet</button>
        <a class="ghost" style="text-decoration:none" href="${esc(a.url)}" target="_blank" rel="noopener">Play'de aç ↗</a>
      </div>
    </div>
    <div class="figs">
      <div><span class="lab">Kurulum</span>
        <span class="fig money">${esc(a.installs || '—')}</span>
        <span class="sub">Google'ın kendi açıkladığı sayı — tahmin değil</span></div>
      <div><span class="lab">Puan</span>
        <span class="fig">${a.rating ? '★ ' + a.rating.toFixed(1) : '—'}</span>
        <span class="sub">${a.reviews ? esc(a.reviews) + ' yorum' : 'yorum yok'}</span></div>
      <div><span class="lab">Para modeli</span>
        <span class="fig small">${a.hasIAP ? 'Satın alma var' : 'Satın alma yok'}</span>
        <span class="sub">${a.hasAds ? 'Ayrıca reklam gösteriyor' : 'Reklam göstermiyor'}</span></div>
      <div><span class="lab">Paket adı</span>
        <span class="fig small mono" style="font-size:15px;word-break:break-all">${esc(a.package)}</span></div>
    </div>
    <div class="sect">
      <ul class="notes">
        <li>Kurulum sayısı Play'in yayınladığı aralıktır; kesin rakam değil ama tahmin de değil.</li>
        <li>Gelir tahmini Android tarafında yapılmıyor — satın alma dönüşümü ve reklam geliri görünmüyor.</li>
      </ul>
    </div>
  </article>`;
}

// ── Satırlar ────────────────────────────────────────────────────────
function iosRow(a) {
  const n = a.userRatingCount || 0;
  return `<button class="row" type="button" data-open-ios="${a.trackId}">
    ${a.artworkUrl60 ? `<img src="${esc(a.artworkUrl60)}" alt="">` : '<span></span>'}
    <span><span class="nm">${esc(a.trackName)}</span>
      <span class="meta">${esc(a.sellerName || '—')} · ${esc(a.primaryGenreName || '—')} · ${esc(a.formattedPrice || '')}</span></span>
    <span class="rt"><b>${n ? '≈ ' + int(n * RATIO.mid) : '—'}</b>
      <span class="rtk">${n ? 'indirme tahmini' : 'yorum yok'}</span></span>
  </button>`;
}
function playRowBtn(a, attr) {
  return `<button class="row" type="button" ${attr}="${esc(a.package)}">
    ${a.icon ? `<img src="${esc(a.icon)}" alt="">` : '<span></span>'}
    <span><span class="nm">${esc(a.name || a.package)}</span>
      <span class="meta">${esc(a.developer || '—')} · ${esc(tidy(a.category))}${
        (a.hasAds ? ' <span class="badge ads">reklam</span>' : '') +
        (a.hasIAP ? ' <span class="badge iap">satın alma</span>' : '')}</span></span>
    <span class="rt"><b class="money">${esc(a.installs || '—')}</b>
      <span class="rtk">kurulum${a.rating ? ' · ★' + a.rating.toFixed(1) : ''}</span></span>
  </button>`;
}

// ── Toplama ─────────────────────────────────────────────────────────
async function gather(id, scope) {
  const per = []; let base = null;
  await Promise.all(COUNTRIES[scope].map(async (c) => {
    let d; try { d = await lookup({ id, country: c }); } catch { return; }
    if (!d || !d.resultCount) return;
    const r = d.results[0];
    if (!base) base = r;
    const n = r.userRatingCount || 0;
    if (n > 0) per.push({ c, n, avg: r.averageUserRating || 0 });
  }));
  per.sort((a, b) => b.n - a.n);
  const total = per.reduce((s, x) => s + x.n, 0);
  const rated = per.filter((x) => x.avg > 0);
  const w = rated.reduce((s, x) => s + x.n, 0);
  const avg = w ? rated.reduce((s, x) => s + x.avg * x.n, 0) / w : 0;
  return { base, per, total, avg };
}

const SCANS = new Map();   // trackId -> {app, ratings, est, avg}
const PLAYS = new Map();   // package -> playApp

// ── Görünümler ──────────────────────────────────────────────────────
async function viewIOSApp(id, scope) {
  say('App Store taranıyor…');
  const d = await lookup({ id, entity: 'software' });
  const soft = (d.results || []).filter((r) => r.wrapperType === 'software');
  if (!soft.length) throw new Error('Bu kimlikle uygulama bulunamadı. Uygulama satıştan kaldırılmış olabilir.');
  if (soft.length > 1) return viewIOSDev(id, scope, soft);

  say(`${SCOPE_N[scope]} ülkeden yorum toplanıyor…`);
  const g = await gather(id, scope);
  const app = g.base || soft[0];
  const est = estimate(app, g.total);
  SCANS.set(String(app.trackId), { app, ratings: g.total, est, avg: g.avg, store: 'ios' });
  OUT().innerHTML = iosCard(app, g.total, g.per, est, scope, g.avg);
  hideStatus();
  wire();
  loadIOSExtras(app);
}

async function viewPlayApp(pkg) {
  say('Google Play\'den alınıyor…');
  const a = await bridge('/api/play?id=' + encodeURIComponent(pkg));
  PLAYS.set(a.package, a);
  OUT().innerHTML = playCard(a);
  hideStatus();
  wire();
}

async function viewSearch(term, scope) {
  OUT().innerHTML = `<div class="cols">
    <div><div class="colhead"><h3>${storeTag('ios')}<span class="pill grey" id="niOS">…</span></h3></div>
      <div class="list" id="iosList"><div class="empty">aranıyor…</div></div>
      <p class="foot-note" style="padding:0;margin-top:12px;font-size:13.5px;color:var(--ink2)">
        Buradaki sayı yalnızca ABD mağazasının yorumlarından hesaplandı — hızlı liste için.
        Bir satıra tıkla, ${SCOPE_N[scope]} ülke taransın ve gerçek toplam çıksın.</p></div>
    <div><div class="colhead"><h3>${storeTag('play')}<span class="pill grey" id="niAnd">…</span></h3></div>
      <div class="list" id="andList"><div class="empty">aranıyor…</div></div>
      <p class="foot-note" style="padding:0;margin-top:12px;font-size:13.5px;color:var(--ink2)">
        Kurulum sayıları Google'ın kendi beyanı. Bir satıra tıkla, ayrıntılı kartı açılsın.</p></div>
  </div>`;
  hideStatus();

  const a = searchAPI({ term, entity: 'software', country: 'us', limit: 10 })
    .then((d) => {
      const rs = d.results || [];
      el('niOS').textContent = rs.length;
      el('iosList').innerHTML = rs.length ? rs.map(iosRow).join('')
        : '<div class="empty">Sonuç yok.</div>';
    }).catch((e) => {
      el('niOS').textContent = '—';
      el('iosList').innerHTML = `<div class="empty">Alınamadı: ${esc(e.message)}</div>`;
    });

  const b = bridge('/api/play/search?q=' + encodeURIComponent(term))
    .then((d) => {
      const rs = d.results || [];
      rs.forEach((r) => PLAYS.set(r.package, r));
      el('niAnd').textContent = rs.length;
      el('andList').innerHTML = rs.length
        ? rs.map((r) => playRowBtn(r, 'data-open-play')).join('')
        : '<div class="empty">Sonuç yok.</div>';
    }).catch(() => {
      el('niAnd').textContent = '—';
      el('andList').innerHTML = `<div class="empty">${BRIDGE
        ? 'Google Play\'e ulaşılamadı.'
        : 'Android araması için köprü gerekiyor.'}</div>`;
    });

  await Promise.all([a, b]);
  wire();
}

// ── Geliştirici özetleri ────────────────────────────────────────────
function devSummary(opts) {
  const { name, store, count, ratings, dl, monthly, avg, since, top, topShare,
          fresh, stale, paid, cats, rows, note } = opts;
  const catMax = cats[0]?.[1] || 1;
  return `<article class="card">
    <div class="devhead">
      <span class="lab">${store === 'play' ? 'Google Play' : 'App Store'} geliştiricisi</span>
      <h3>${esc(name)}</h3>
      <p>${count} uygulama${since ? ` · ${since}'ten beri` : ''}</p>
    </div>
    <div class="figs">
      <div><span class="lab">Uygulama sayısı</span><span class="fig">${count}</span>
        <span class="sub">${paid}</span></div>
      ${ratings !== null ? `<div><span class="lab">Toplam yorum</span><span class="fig">${int(ratings)}</span>
        <span class="sub">${avg ? '★ ' + avg.toFixed(2) + ' ortalama' : 'puan yok'}</span></div>` : ''}
      <div><span class="lab">${store === 'play' ? 'Toplam kurulum' : 'Toplam indirme — tahmin'}</span>
        <span class="fig">${dl}</span></div>
      ${monthly ? `<div><span class="lab">Aylık gelir — tahmin</span>
        <span class="fig money">${monthly}</span>
        <span class="sub">portföyün tamamı</span></div>` : ''}
    </div>
    <div class="devgrid">
      <div class="devbox"><span class="lab">Yoğunlaşma</span>
        <p class="bignum">%${topShare}</p>
        <p class="note-s">En büyük uygulama tek başına bu kadarını taşıyor:
          <strong>${esc(top)}</strong>.
          ${topShare > 60 ? 'Portföy değil, tek uygulama taşıyor.'
            : topShare > 35 ? 'Belirgin bir lokomotif var.' : 'Yük dengeli dağılmış.'}</p></div>
      <div class="devbox"><span class="lab">Bakım</span>
        <p class="bignum">${fresh}/${count}</p>
        <p class="note-s">Son 6 ayda güncellenmiş.
          ${stale ? `<strong>${stale}</strong> tanesi bir yıldır güncellenmemiş — o kalemlerde tahmin şişer.`
                  : 'Bir yıldan uzun süredir bırakılmış uygulama yok.'}</p></div>
      <div class="devbox"><span class="lab">Kategoriler</span>
        <div class="catbars">${cats.slice(0, 6).map(([c, n]) => `<div class="catrow">
          <span class="cl">${esc(tidy(c))}</span>
          <span class="ct"><span class="cf" style="width:${(n / catMax) * 100}%"></span></span>
          <span class="cn">${n}</span></div>`).join('')}</div></div>
    </div>
    <div class="scroll"><table>${rows}</table></div>
    <p class="foot-note">${note}</p>
  </article>`;
}

async function viewIOSDev(id, scope, preloaded) {
  let apps = preloaded;
  if (!apps) {
    say('Geliştiricinin uygulamaları alınıyor…');
    const d = await lookup({ id, entity: 'software', limit: 200 });
    apps = (d.results || []).filter((r) => r.wrapperType === 'software');
  }
  if (!apps.length) throw new Error('Bu geliştiricide uygulama bulunamadı.');
  apps.sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0));

  const scans = [];
  for (let i = 0; i < apps.length; i++) {
    say(`${i + 1}/${apps.length} — ${apps[i].trackName} taranıyor…`);
    const g = await gather(apps[i].trackId, scope);
    const app = g.base || apps[i];
    const est = estimate(app, g.total);
    SCANS.set(String(app.trackId), { app, ratings: g.total, est, avg: g.avg, store: 'ios' });
    scans.push({ app, ratings: g.total, est, avg: g.avg });
    OUT().innerHTML = renderIOSDev(apps, scans, scope);
  }
  hideStatus();
  wire();
}

function renderIOSDev(apps, scans, scope) {
  const now = Date.now(), M = 2629746000;
  const count = scans.length;
  const ratings = scans.reduce((a, s) => a + s.ratings, 0);
  const dlL = scans.reduce((a, s) => a + s.est.dl.low, 0);
  const dlH = scans.reduce((a, s) => a + s.est.dl.high, 0);
  const dlM = scans.reduce((a, s) => a + s.est.dl.mid, 0);
  const mL = scans.reduce((a, s) => a + (s.est.monthly?.low || 0), 0);
  const mH = scans.reduce((a, s) => a + (s.est.monthly?.high || 0), 0);
  const rated = scans.filter((s) => s.avg > 0);
  const wsum = rated.reduce((a, s) => a + s.ratings, 0);
  const avg = wsum ? rated.reduce((a, s) => a + s.avg * s.ratings, 0) / wsum : 0;

  const dates = scans.map((s) => s.app.releaseDate).filter(Boolean).sort();
  const since = dates[0] ? new Date(dates[0]).getFullYear() : null;
  const sorted = [...scans].sort((a, b) => b.est.dl.mid - a.est.dl.mid);
  const topShare = dlM > 0 ? Math.round((sorted[0].est.dl.mid / dlM) * 100) : 0;
  const fresh = scans.filter((s) => s.app.currentVersionReleaseDate &&
    (now - new Date(s.app.currentVersionReleaseDate)) / M < 6).length;
  const stale = scans.filter((s) => s.app.currentVersionReleaseDate &&
    (now - new Date(s.app.currentVersionReleaseDate)) / M > 12).length;
  const paidN = scans.filter((s) => (s.app.price || 0) > 0).length;

  const cats = {};
  scans.forEach((s) => { const c = s.app.primaryGenreName || '—'; cats[c] = (cats[c] || 0) + 1; });

  const rows = `<thead><tr><th>Uygulama</th><th>Kategori</th><th>Fiyat</th>
    <th class="n">Yorum</th><th class="n">Puan</th><th class="n">İndirme</th>
    <th class="n">Aylık gelir</th><th class="n">Son güncelleme</th></tr></thead><tbody>` +
    sorted.map((s) => {
      const a = s.app, e = s.est;
      const upd = a.currentVersionReleaseDate
        ? Math.round((now - new Date(a.currentVersionReleaseDate)) / M) : null;
      return `<tr>
        <td>${esc(a.trackName)}</td><td>${esc(a.primaryGenreName || '—')}</td>
        <td>${esc(a.formattedPrice || '—')}</td>
        <td class="n">${s.ratings || '—'}</td>
        <td class="n">${s.avg ? '★' + s.avg.toFixed(1) : '—'}</td>
        <td class="n">${s.ratings ? int(e.dl.low) + ' – ' + int(e.dl.high) : '—'}</td>
        <td class="n">${s.ratings && e.monthly
          ? money(e.monthly.low) + ' – ' + money(e.monthly.high)
            + (e.months < 3 ? ' <span class="young">yeni</span>' : '') : '—'}</td>
        <td class="n">${upd === null ? '—' : upd + ' ay önce'}</td></tr>`;
    }).join('') + '</tbody>';

  return devSummary({
    name: apps[0].artistName || scans[0].app.sellerName || 'Geliştirici',
    store: 'ios', count, ratings, avg, since,
    dl: `${int(dlL)} – ${int(dlH)}`,
    monthly: `${money(mL)} – ${money(mH)}`,
    paid: `${paidN} ücretli · ${count - paidN} ücretsiz`,
    top: sorted[0]?.app.trackName || '—', topShare, fresh, stale,
    cats: Object.entries(cats).sort((a, b) => b[1] - a[1]),
    rows,
    note: `Her uygulama ${SCOPE_N[scope]} ülkede tarandı. Bütün rakamlar tahmin;
      portföy toplamı tek tek tahminlerin toplamı olduğu için hata payı da toplanır.`,
  });
}

async function viewPlayDev(id, byName) {
  say('Geliştiricinin Play uygulamaları alınıyor…');
  const d = await bridge('/api/play/dev?id=' + encodeURIComponent(id) + (byName ? '&name=1' : ''));
  const apps = d.results || [];
  if (!apps.length) throw new Error('Bu geliştiricide uygulama bulunamadı.');
  apps.forEach((a) => PLAYS.set(a.package, a));
  apps.sort((a, b) => (b.installsNum || 0) - (a.installsNum || 0));

  const now = Date.now(), M = 2629746000;
  const count = apps.length;
  const totalInstalls = apps.reduce((a, x) => a + (x.installsNum || 0), 0);
  const topShare = totalInstalls > 0
    ? Math.round(((apps[0].installsNum || 0) / totalInstalls) * 100) : 0;
  const age = (x) => x.updated ? (now - Date.parse(x.updated)) / M : null;
  const fresh = apps.filter((x) => { const a = age(x); return a !== null && a < 6; }).length;
  const stale = apps.filter((x) => { const a = age(x); return a !== null && a > 12; }).length;
  const paidN = apps.filter((x) => x.price && x.price !== 'Free').length;
  const withIAP = apps.filter((x) => x.hasIAP).length;
  const withAds = apps.filter((x) => x.hasAds).length;

  const cats = {};
  apps.forEach((a) => { const c = a.category || '—'; cats[c] = (cats[c] || 0) + 1; });

  const rows = `<thead><tr><th>Uygulama</th><th>Kategori</th><th>Fiyat</th>
    <th class="n">Kurulum</th><th class="n">Puan</th><th class="n">Yorum</th>
    <th>Para modeli</th><th class="n">Son güncelleme</th></tr></thead><tbody>` +
    apps.map((a) => `<tr>
      <td>${esc(a.name || a.package)}</td><td>${esc(tidy(a.category))}</td>
      <td>${esc(a.price || '—')}</td>
      <td class="n">${esc(a.installs || '—')}</td>
      <td class="n">${a.rating ? '★' + a.rating.toFixed(1) : '—'}</td>
      <td class="n">${esc(a.reviews || '—')}</td>
      <td>${a.hasIAP ? 'satın alma' : '—'}${a.hasAds ? ' + reklam' : ''}</td>
      <td class="n">${esc(a.updated || '—')}</td></tr>`).join('') + '</tbody>';

  OUT().innerHTML = devSummary({
    name: apps[0].developer || id,
    store: 'play', count, ratings: null, avg: 0, since: null,
    dl: totalInstalls ? int(totalInstalls) + '+' : '—',
    monthly: null,
    paid: `${paidN} ücretli · ${count - paidN} ücretsiz · ${withIAP} satın almalı · ${withAds} reklamlı`,
    top: apps[0]?.name || '—', topShare, fresh, stale,
    cats: Object.entries(cats).sort((a, b) => b[1] - a[1]),
    rows,
    note: `Kurulum sayıları Google'ın yayınladığı aralıkların toplamıdır ("10 B+" gibi),
      yani gerçek toplam bundan yüksektir. Android tarafında gelir tahmini yapılmıyor.`,
  });
  hideStatus();
  wire();
}

// ── Ek veriler ──────────────────────────────────────────────────────
async function loadIOSExtras(app) {
  const slot = document.querySelector(`.card[data-ios="${app.trackId}"] [data-iosx]`);
  if (!slot) return;
  try {
    const d = await bridge('/api/ios?id=' + app.trackId);
    const tags = [];
    if (d.hasIAP) tags.push('<span class="tag iap">Uygulama içi satın alma var</span>');
    if (d.hasAds) tags.push('<span class="tag ads">Reklam içeriyor</span>');
    if (!d.hasIAP && !d.hasAds) tags.push('<span class="tag quiet">Satın alma ve reklam yok</span>');
    slot.innerHTML = `<h4>Para modeli</h4><div class="tags">${tags.join('')}</div>` +
      (d.iaps.length ? `<div class="iaplist">${d.iaps.map((i) =>
        `<span class="iapitem"><b>${esc(i.name)}</b><span>${esc(i.price)}</span></span>`).join('')}</div>` : '');
  } catch {
    slot.innerHTML = '<h4>Para modeli</h4><p class="muted">' + (BRIDGE
      ? 'App Store sayfasına ulaşılamadı.'
      : 'Uygulama içi satın alma bilgisi için köprü gerekiyor.') + '</p>';
  }
}

async function findOnPlay(trackId) {
  const rec = SCANS.get(String(trackId));
  const slot = document.querySelector(`.card[data-ios="${trackId}"] [data-playslot]`);
  if (!rec || !slot) return;
  slot.innerHTML = '<div class="sect tint"><h4>Android karşılığı</h4><p class="muted">aranıyor…</p></div>';
  let rs;
  try {
    rs = (await bridge('/api/play/search?q=' + encodeURIComponent(rec.app.trackName))).results || [];
  } catch {
    slot.innerHTML = '<div class="sect tint"><h4>Android karşılığı</h4><p class="muted">' +
      (BRIDGE ? 'Play\'e ulaşılamadı.' : 'Köprü gerekiyor.') + '</p></div>';
    return;
  }
  if (!rs.length) {
    slot.innerHTML = '<div class="sect tint"><h4>Android karşılığı</h4><p class="muted">Play\'de eşleşme bulunamadı.</p></div>';
    return;
  }
  rs.forEach((r) => PLAYS.set(r.package, r));
  // Otomatik eşleştirme YOK — hangisi olduğuna sen karar ver.
  slot.innerHTML = `<div class="sect tint">
    <h4>Android karşılığı — hangisi olduğunu seç</h4>
    <p class="muted">Ad benzerliğine göre bulunanlar. Otomatik eşleştirmiyorum;
      aynı adı taşıyan başka geliştiricilerin uygulamaları da çıkabiliyor.</p>
    <div class="list picker">${rs.map((r) => playRowBtn(r, 'data-open-play')).join('')}</div>
  </div>`;
  wire();
}

// ── Kayıt ───────────────────────────────────────────────────────────
const load = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; } };
function persist(rows) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(rows)); } catch { /* kota dolmuş olabilir */ }
  renderSaved();
}
function saveRec(rec) {
  const rows = load().filter((r) => r.key !== rec.key);
  rows.unshift(rec); persist(rows);
}
function renderSaved() {
  const rows = load();
  el('savedWrap').hidden = rows.length === 0;
  el('savedCount').textContent = rows.length;
  $('#savedTable tbody').innerHTML = rows.map((r) => `<tr>
    <td>${esc(r.name)}</td>
    <td>${r.store === 'play' ? '▶ Play' : ' App Store'}</td>
    <td>${esc(r.cat)}</td><td>${esc(r.price)}</td>
    <td class="n">${esc(r.reviews)}</td>
    <td class="n">${esc(r.dl)}</td>
    <td class="n">${esc(r.rev)}</td>
    <td><button class="rowdel" type="button" data-del="${esc(r.key)}" title="Listeden çıkar">×</button></td>
  </tr>`).join('');
}

// ── Olay bağlama ────────────────────────────────────────────────────
function wire() {
  document.querySelectorAll('[data-open-ios]').forEach((b) => {
    if (b.dataset.w) return; b.dataset.w = '1';
    b.addEventListener('click', () => { el('q').value = b.dataset.openIos; run(); });
  });
  document.querySelectorAll('[data-open-play]').forEach((b) => {
    if (b.dataset.w) return; b.dataset.w = '1';
    b.addEventListener('click', async () => {
      const a = PLAYS.get(b.dataset.openPlay);
      if (a) { OUT().innerHTML = playCard(a); wire(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
  });
  document.querySelectorAll('[data-findplay]').forEach((b) => {
    if (b.dataset.w) return; b.dataset.w = '1';
    b.addEventListener('click', () => findOnPlay(b.closest('[data-ios]').dataset.ios));
  });
  document.querySelectorAll('[data-save]').forEach((b) => {
    if (b.dataset.w) return; b.dataset.w = '1';
    b.addEventListener('click', () => {
      const id = b.closest('[data-ios]').dataset.ios;
      const r = SCANS.get(String(id)); if (!r) return;
      saveRec({
        key: 'ios:' + id, store: 'ios', name: r.app.trackName,
        cat: r.app.primaryGenreName || '—', price: r.app.formattedPrice || '—',
        reviews: r.ratings || '—',
        dl: r.ratings ? int(r.est.dl.low) + ' – ' + int(r.est.dl.high) : '—',
        rev: r.ratings && r.est.monthly
          ? money(r.est.monthly.low) + ' – ' + money(r.est.monthly.high) : '—',
      });
      b.textContent = 'Kaydedildi ✓'; setTimeout(() => { b.textContent = 'Kaydet'; }, 1600);
    });
  });
  document.querySelectorAll('[data-save-play]').forEach((b) => {
    if (b.dataset.w) return; b.dataset.w = '1';
    b.addEventListener('click', () => {
      const a = PLAYS.get(b.dataset.savePlay); if (!a) return;
      saveRec({
        key: 'play:' + a.package, store: 'play', name: a.name || a.package,
        cat: tidy(a.category), price: a.price || '—',
        reviews: a.reviews || '—', dl: a.installs || '—', rev: '—',
      });
      b.textContent = 'Kaydedildi ✓'; setTimeout(() => { b.textContent = 'Kaydet'; }, 1600);
    });
  });
}

// ── Ana akış ────────────────────────────────────────────────────────
async function run() {
  const p = parseInput(el('q').value);
  if (!p) { say('Bir şey yaz: uygulama adı ya da mağaza bağlantısı.', true); return; }
  const scope = el('scope').value;
  const btn = el('go');
  btn.disabled = true; OUT().innerHTML = '';
  try {
    if (p.kind === 'search') { say('İki mağazada birden aranıyor…'); await viewSearch(p.term, scope); }
    else if (p.kind === 'playApp') await viewPlayApp(p.id);
    else if (p.kind === 'playDev') await viewPlayDev(p.id, p.byName);
    else if (p.kind === 'iosDev') await viewIOSDev(p.id, scope);
    else await viewIOSApp(p.id, scope);
  } catch (e) {
    say('Olmadı: ' + e.message, true);
  } finally { btn.disabled = false; }
}

el('go').addEventListener('click', run);
el('q').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
document.querySelectorAll('[data-ex]').forEach((b) => {
  b.addEventListener('click', () => { el('q').value = b.dataset.ex; el('q').focus(); });
});
$('#savedTable').addEventListener('click', (e) => {
  const k = e.target.dataset?.del; if (k) persist(load().filter((r) => r.key !== k));
});
el('clearBtn').addEventListener('click', () => {
  if (confirm('Kaydettiğin bütün uygulamalar listeden çıkarılsın mı?')) persist([]);
});
el('exportBtn').addEventListener('click', () => {
  const b = new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'mihenk-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click(); URL.revokeObjectURL(a.href);
});
el('importInput').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const rows = JSON.parse(await f.text());
    if (!Array.isArray(rows)) throw new Error('dosya beklenen biçimde değil');
    const keys = new Set(rows.map((r) => r.key));
    persist([...rows, ...load().filter((r) => !keys.has(r.key))]);
    say(rows.length + ' kayıt yüklendi.');
  } catch (err) { say('Dosya okunamadı: ' + err.message, true); }
  e.target.value = '';
});
el('themeBtn').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : cur === 'light' ? '' : 'dark';
  if (next) document.documentElement.setAttribute('data-theme', next);
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem('mihenk.theme', next); } catch { /* yoksay */ }
});
try {
  const t = localStorage.getItem('mihenk.theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
} catch { /* yoksay */ }

// Köprü yoksa üstte söyle
(function () {
  const b = el('liteban');
  if (!b || BRIDGE) return;
  b.hidden = false;
  b.innerHTML = '<strong>App Store tarafı çalışıyor.</strong> Google Play verisi ve ' +
    'uygulama içi satın alma bilgisi için köprü gerekiyor — bu iki kaynak tarayıcıdan ' +
    'doğrudan çekilemiyor.';
})();

renderSaved();
