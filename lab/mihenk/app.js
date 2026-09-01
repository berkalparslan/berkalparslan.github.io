/* Mihenk — App Store ölçüm taşı
   Veri: itunes.apple.com/lookup (ücretsiz, anahtarsız, CORS açık)
   Tahmin modeli için index.html içindeki "Tahmin modeli" bölümüne bak. */

'use strict';

// ─── Model sabitleri ────────────────────────────────────────────────
// Kendi uygulamalarımızın gerçek App Store Connect satış raporlarıyla
// kalibre edildi (Ara 2025 – Tem 2026, 6 uygulama). Medyan 31.
const RATIO = { low: 25, mid: 31, high: 40 };

// İndirme başına gelir (USD). İki sağlam rakamdan türetildi:
//   App Store ortalaması $0,67  ·  Sağlık & Fitness $1,21
// Diğerleri ödeyen başına yıllık gelir (RLTV) oranıyla ölçeklendi.
const LTV_DEFAULT = 0.67;
const LTV = {
  'Health & Fitness': 1.21, 'Sağlık ve Fitness': 1.21, 'Medical': 1.10,
  'Productivity': 0.85, 'Verimlilik': 0.85,
  'Business': 0.85, 'Finance': 0.80, 'Education': 0.78, 'Eğitim': 0.78,
  'Utilities': 0.67, 'Araçlar': 0.67, 'Lifestyle': 0.60,
  'Photo & Video': 0.60, 'Sports': 0.55, 'Spor': 0.55,
  'Entertainment': 0.50, 'Games': 0.38, 'Oyunlar': 0.38,
};
const STORE_SHARE = 0.85; // Küçük İşletme Programı geliştirici payı

const COUNTRIES = {
  fast: ['us','gb','de','tr','nl','fr','ca','au','jp','it','es','br'],
  wide: ['us','gb','de','tr','nl','fr','ca','au','jp','it','es','br','mx','in','id','ru','kr','se','pl','ch','at','be','dk','no','fi','pt','sa','ae'],
  full: ['us','gb','de','tr','nl','fr','ca','au','jp','it','es','br','mx','in','id','ru','kr','se','pl','ch','at','be','dk','no','fi','pt','sa','ae','za','my','ph','th','vn','hk','tw','sg','nz','ie','cz','hu','ro','il','eg','pk','ng','cn'],
};

const STORE_KEY = 'mihenk.saved.v1';

// ─── Yardımcılar ────────────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const money = (v) => v >= 1000 ? '$' + Math.round(v).toLocaleString('tr-TR')
                               : '$' + v.toFixed(v < 10 ? 1 : 0);
const int = (v) => Math.round(v).toLocaleString('tr-TR');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
  (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function parseInput(raw) {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{6,}$/.test(s)) return { kind: 'auto', id: s };
  const play = s.match(/play\.google\.com\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/i);
  if (play) return { kind: 'play', id: play[1] };
  const dev = s.match(/\/developer\/(?:[^/]+\/)?id(\d+)/i);
  if (dev) return { kind: 'dev', id: dev[1] };
  const app = s.match(/apps\.apple\.com[^\s]*\/id(\d+)/i) || s.match(/[?&]id=(\d+)\b/);
  if (app) return { kind: 'app', id: app[1] };
  // Bağlantı değilse ad araması say
  if (/^[a-zA-Z0-9._]+\.[a-zA-Z0-9._]+\.[a-zA-Z0-9._]+$/.test(s) && !s.includes(' '))
    return { kind: 'play', id: s };
  return { kind: 'search', term: s };
}

// ─── Köprü ──────────────────────────────────────────────────────────
// Play ve App Store sayfaları CORS'a kapalı; aradaki köprü ya yereldeki
// server.py ya da yayındaki Cloudflare Worker oluyor.
// Yerelde boş taban (aynı sunucu), yayında window.MIHENK_API.
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const API = LOCAL ? '' : (window.MIHENK_API || '');
const HAS_BRIDGE = LOCAL || !!API;

async function playFetch(path) {
  if (!HAS_BRIDGE) throw new Error('köprü tanımlı değil');
  const r = await fetch(API + path);
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j;
}
// Play kategorisi bazen tamamı büyük harf geliyor (EDUCATION).
// Worker'da düzeltildi ama eski deploy'larda da düzgün görünsün.
const tidyCat = (c) => !c ? '—' :
  c.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

const playBadges = (a) =>
  (a.hasAds ? ' <span class="badge ads">reklam</span>' : '') +
  (a.hasIAP ? ' <span class="badge iap">iap</span>' : '');

function playRow(a, pick) {
  const tag = pick ? 'button' : 'a';
  const attrs = pick
    ? `type="button" data-pick="${esc(a.package)}"`
    : `href="${esc(a.url)}" target="_blank" rel="noopener" style="text-decoration:none"`;
  return `<${tag} class="row${pick ? '' : ' plain'}" ${attrs}>
    ${a.icon ? `<img src="${esc(a.icon)}" alt="">` : '<span></span>'}
    <span><span class="nm">${esc(a.name || a.package)}</span>
      <span class="meta">${esc(a.developer || '—')} · ${esc(tidyCat(a.category))}${playBadges(a)}</span></span>
    <span class="rt"><b class="installs">${esc(a.installs || '—')}</b>
      <span class="rtk">kurulum · ${a.rating ? '★' + a.rating.toFixed(1) : '—'} ${a.reviews ? '· ' + esc(a.reviews) : ''}</span></span>
  </${tag}>`;
}

function iosRow(a) {
  const n = a.userRatingCount || 0;
  return `<button class="row" type="button" data-scan="${a.trackId}" title="Tıkla — 46 ülkede tara">
    ${a.artworkUrl60 ? `<img src="${esc(a.artworkUrl60)}" alt="">` : '<span></span>'}
    <span><span class="nm">${esc(a.trackName)}</span>
      <span class="meta">${esc(a.sellerName || '—')} · ${esc(a.primaryGenreName || '—')} · ${esc(a.formattedPrice || '')}</span></span>
    <span class="rt">
      <b>${n ? '≈ ' + int(n * RATIO.mid) : '—'}</b>
      <span class="rtk">indirme · ${n ? n + ' yorum' : 'yorum yok'} <span class="cc">US</span></span>
    </span>
  </button>`;
}

// Ad araması: iki mağazayı birden tara
async function searchBoth(term) {
  const box = $('#search');
  box.hidden = false;
  $('#iosList').innerHTML = '<div class="empty">aranıyor…</div>';
  $('#andList').innerHTML = '<div class="empty">aranıyor…</div>';
  $('#andNote').hidden = true;

  const ios = (async () => {
    const d = await search({ term, entity: 'software', country: 'us', limit: 10 });
    const rs = d.results || [];
    $('#iosN').textContent = rs.length;
    $('#iosList').innerHTML = rs.length
      ? rs.map(iosRow).join('')
      : '<div class="empty">Sonuç yok.</div>';
    document.querySelectorAll('[data-scan]').forEach((b) => {
      b.addEventListener('click', () => {
        $('#q').value = b.dataset.scan;
        run();
      });
    });
  })().catch((e) => {
    $('#iosList').innerHTML = `<div class="empty">Alınamadı: ${esc(e.message)}</div>`;
  });

  const and = (async () => {
    const d = await playFetch('/api/play/search?q=' + encodeURIComponent(term));
    const rs = d.results || [];
    $('#andN').textContent = rs.length;
    $('#andList').innerHTML = rs.length
      ? rs.map(playRow).join('')
      : '<div class="empty">Sonuç yok.</div>';
  })().catch((e) => {
    $('#andN').textContent = '—';
    $('#andList').innerHTML = '<div class="empty">Play köprüsü yanıt vermedi.</div>';
    const n = $('#andNote');
    n.hidden = false;
    n.textContent = HAS_BRIDGE
      ? 'Köprüye ulaşılamadı: ' + e.message
      : 'Android araması için köprü gerekiyor (yerelde server.py, yayında Cloudflare Worker).';
  });

  await Promise.all([ios, and]);
}

async function itunes(endpoint, params) {
  const r = await fetch(`https://itunes.apple.com/${endpoint}?` + new URLSearchParams(params));
  if (!r.ok) throw new Error('Apple ' + r.status);
  return r.json();
}
// Kimlikle tek kayıt
const lookup = (params) => itunes('lookup', params);
// Adla arama — ayrı uç, `lookup` term kabul etmiyor
const search = (params) => itunes('search', params);

// Bir uygulamanın yorum sayısını ülke ülke toplar.
async function gather(id, scope, onTick) {
  const list = COUNTRIES[scope];
  const per = [];
  let base = null, done = 0;

  const jobs = list.map(async (c) => {
    let d;
    try { d = await lookup({ id, country: c }); } catch { d = null; }
    done++; onTick?.(done, list.length);
    if (!d || !d.resultCount) return;
    const r = d.results[0];
    if (!base) base = r;
    const n = r.userRatingCount || 0;
    if (n > 0) per.push({ c, n, avg: r.averageUserRating || 0 });
  });
  await Promise.all(jobs);

  per.sort((a, b) => b.n - a.n);
  const total = per.reduce((s, x) => s + x.n, 0);
  // Tek ülkenin puanı yanıltıcı — yorum sayısıyla ağırlıklandır.
  const rated = per.filter((x) => x.avg > 0);
  const wsum = rated.reduce((s, x) => s + x.n, 0);
  const avg = wsum ? rated.reduce((s, x) => s + x.avg * x.n, 0) / wsum : 0;
  return { base, per, total, avg };
}

// ─── Tahmin ─────────────────────────────────────────────────────────
function estimate(app, ratings) {
  const price = app.price || 0;
  const genre = app.primaryGenreName || '';
  const ltv = LTV[genre] ?? LTV_DEFAULT;

  const dl = {
    low: ratings * RATIO.low,
    mid: ratings * RATIO.mid,
    high: ratings * RATIO.high,
  };

  const released = app.releaseDate ? new Date(app.releaseDate) : null;
  const months = released
    ? Math.max(1, (Date.now() - released) / (1000 * 60 * 60 * 24 * 30.44))
    : null;

  // Ücretsiz uygulamalarda kategori ortalaması ABONELİĞİ HESABA KATMIYOR.
  // Kendi Tennis Padel verimizle doğrulandı: gerçek gelir kategori
  // varsayımının ~3 katı çıktı (abonelik yüzünden). Bu yüzden ücretsiz
  // uygulamalarda üst sınır 3× ile açılıyor.
  const SUB_MULT = 3;
  const rev = (n, mult) => price > 0
    ? n * price * STORE_SHARE
    : n * ltv * (mult || 1);
  const total = {
    low: rev(dl.low, 1),
    mid: rev(dl.mid, price > 0 ? 1 : 1.7),
    high: rev(dl.high, price > 0 ? 1 : SUB_MULT),
  };
  const monthly = months
    ? { low: total.low / months, mid: total.mid / months, high: total.high / months }
    : null;

  // Güven
  let conf = 'low', confText = 'Düşük — 10\'dan az yorum';
  if (ratings >= 100) { conf = 'high'; confText = 'İyi — 100+ yorum'; }
  else if (ratings >= 10) { conf = 'mid'; confText = 'Orta — 10–99 yorum'; }

  // Uyarılar
  const flags = [];
  if (ratings === 0) flags.push({ warn: true, t: 'Hiç yorum yok — indirme tahmini yapılamıyor.' });
  if (ratings > 0 && ratings < 10) flags.push({ warn: true, t: 'Çok az yorum; aralık geniş, sayıya güvenme.' });
  const upd = app.currentVersionReleaseDate ? new Date(app.currentVersionReleaseDate) : null;
  if (upd) {
    const ay = (Date.now() - upd) / (1000 * 60 * 60 * 24 * 30.44);
    if (ay > 12) flags.push({ warn: true, t: `${Math.round(ay)} aydır güncellenmemiş — yorumlar birikmiş olabilir, indirme durmuş olabilir. Tahmin yüksek çıkar.` });
    else if (ay < 2) flags.push({ warn: false, t: 'Aktif bakımda — son güncelleme 2 aydan yeni.' });
  }
  if (price > 0) flags.push({ warn: false, t: 'Ücretli uygulama. Uygulama içi satın alma varsa gelir bundan yüksektir — göremiyoruz.' });
  else flags.push({ warn: false, t: `Ücretsiz. Alt sınır "${genre || 'genel'}" kategorisi için indirme başına ${money(ltv)}; üst sınır aboneliği olan uygulamalar için 3× açıldı.` });
  if (months && months < 3) flags.push({ warn: true, t: 'Uygulama 3 aydan yeni — aylık ortalama oynak.' });

  return { dl, total, monthly, months, ltv, price, conf, confText, flags };
}

// ─── Görselleştirme ─────────────────────────────────────────────────
function card(app, ratings, per, est, scope, avg) {
  const rating = avg || app.averageUserRating || 0;
  const icon = app.artworkUrl100 || app.artworkUrl60 || '';
  const priceTag = est.price > 0
    ? `<span class="tag price">${esc(app.formattedPrice)}</span>`
    : `<span class="tag free">Ücretsiz</span>`;
  const yas = est.months
    ? (est.months >= 12 ? (est.months / 12).toFixed(1) + ' yıl' : Math.round(est.months) + ' ay')
    : '—';

  const cbars = per.slice(0, 14).map((p) =>
    `<span class="cbar">${p.c.toUpperCase()} <b>${p.n}</b><span>★${p.avg.toFixed(1)}</span></span>`).join('');

  const revLine = ratings === 0 ? '<span class="big">—</span>'
    : `<span class="big gold">${money(est.monthly.low)} – ${money(est.monthly.high)}</span>
       <span class="sub">orta değer ${money(est.monthly.mid)} / ay</span>`;

  const why = est.price > 0
    ? `${int(est.dl.mid)} indirme × ${money(est.price)} × 0,85 ÷ ${Math.round(est.months)} ay`
    : `${int(est.dl.mid)} indirme × ${money(est.ltv)} (×1 – ×3) ÷ ${Math.round(est.months || 1)} ay`;

  return `<article class="card" data-id="${app.trackId}">
    <div class="card-head">
      ${icon ? `<img class="icon" src="${esc(icon)}" alt="">` : '<div class="icon"></div>'}
      <div class="card-id">
        <h3>${esc(app.trackName)}</h3>
        <p class="seller">${esc(app.sellerName || '')}</p>
        <div class="tags">
          ${priceTag}
          <span class="tag">${esc(app.primaryGenreName || '—')}</span>
          <span class="tag">v${esc(app.version || '?')}</span>
          <span class="tag">${yas}</span>
          <span class="tag">${scope === 'fast' ? 12 : scope === 'wide' ? 28 : 46} ülke tarandı</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="ghost save" type="button">Kaydet</button>
        <a class="ghost" style="text-decoration:none;padding:8px 13px"
           href="${esc(app.trackViewUrl || '#')}" target="_blank" rel="noopener">App Store ↗</a>
      </div>
    </div>

    <div class="est">
      <div><span class="lab">Toplam yorum</span><span class="big">${int(ratings)}</span>
        <span class="sub">${rating ? '★ ' + rating.toFixed(2) + ' ortalama' : 'henüz puan yok'}</span></div>
      <div><span class="lab">İndirme tahmini</span>
        ${ratings === 0 ? '<span class="big">—</span>'
          : `<span class="big">${int(est.dl.low)} – ${int(est.dl.high)}</span>
             <span class="sub">orta değer ${int(est.dl.mid)}</span>`}</div>
      <div><span class="lab">Aylık gelir tahmini</span>${revLine}</div>
      <div><span class="lab">Bugüne kadar toplam</span>
        ${ratings === 0 ? '<span class="big">—</span>'
          : `<span class="big">${money(est.total.low)} – ${money(est.total.high)}</span>
             <span class="sub"><span class="conf ${est.conf}">${esc(est.confText)}</span></span>`}</div>
    </div>

    <div class="iosx"><span class="lab">Para modeli</span><span class="pk">alınıyor…</span></div>

    ${per.length ? `<div class="countries"><span class="lab">Yorumun geldiği ülkeler · ${per.length} ülkede yorum var</span>
      <div class="cbars">${cbars}</div></div>` : ''}

    <div class="card-foot">
      ${ratings ? `<p class="why">${esc(why)}</p>` : ''}
      <ul class="flags">${est.flags.map((f) =>
        `<li class="${f.warn ? 'warn' : ''}">${esc(f.t)}</li>`).join('')}</ul>
    </div>
  </article>`;
}

// iOS kartının altına Android karşılığını asar (adıyla Play'de arar).
async function attachPlay(app) {
  const el = document.querySelector(`.card[data-id="${app.trackId}"]`);
  if (!el || el.querySelector('.playbox')) return;
  const box = document.createElement('div');
  box.className = 'playbox';
  box.innerHTML = '<span class="lab">Google Play karşılığı</span><span class="pk">aranıyor…</span>';
  el.appendChild(box);

  let rs;
  try {
    const d = await playFetch('/api/play/search?q=' + encodeURIComponent(app.trackName));
    rs = d.results || [];
  } catch {
    box.innerHTML = '<span class="lab">Google Play karşılığı</span><span class="pk">'
      + (HAS_BRIDGE
          ? 'Köprüye ulaşılamadı. Yerelde <code>python3 server.py</code> çalışıyor mu?'
          : 'Android verisi için köprü gerekiyor — kurulumu README\'de.')
      + '</span>';
    return;
  }
  if (!rs.length) {
    box.innerHTML = '<span class="lab">Google Play karşılığı</span>'
      + '<span class="pk">Play\'de eşleşme bulunamadı.</span>';
    return;
  }

  const render = (hit) => {
    box.innerHTML = `<span class="lab">Google Play karşılığı</span>
      <div class="pgrid">
        <span><span class="pk">Uygulama</span><span class="pv">${esc(hit.name || hit.package)}</span></span>
        <span><span class="pk">Kurulum · Google'ın beyanı</span><span class="pv gold">${esc(hit.installs || '—')}</span></span>
        <span><span class="pk">Puan</span><span class="pv">${hit.rating ? '★' + hit.rating.toFixed(1) : '—'}</span></span>
        <span><span class="pk">Yorum</span><span class="pv">${esc(hit.reviews || '—')}</span></span>
        <span><span class="pk">Model</span><span class="pv sm">${hit.hasIAP ? 'IAP var' : 'IAP yok'}${hit.hasAds ? ' · reklam var' : ''}</span></span>
        <span><span class="pk">Kategori</span><span class="pv sm">${esc(tidyCat(hit.category))}</span></span>
      </div>
      <p class="pfoot"><a href="${esc(hit.url)}" target="_blank" rel="noopener">Play'de aç ↗</a>
        <button class="linkish" type="button" data-other>Bu değil, listeden seç (${rs.length})</button></p>`;
    box.querySelector('[data-other]').addEventListener('click', chooser);
  };

  const chooser = () => {
    box.innerHTML = `<span class="lab">Google Play karşılığı — doğru olanı seç</span>
      <div class="list picker">${rs.map((r) => playRow(r, true)).join('')}</div>`;
    box.querySelectorAll('[data-pick]').forEach((b) => {
      b.addEventListener('click', () => {
        const hit = rs.find((r) => r.package === b.dataset.pick);
        if (hit) { PLAY_PICK.set(String(app.trackId), hit); render(hit); }
      });
    });
  };

  // Ad benzerliğine göre ilk tahmin
  const key = (app.trackName || '').toLowerCase().split(/[\s:–-]+/)[0];
  const guess = PLAY_PICK.get(String(app.trackId))
    || rs.find((r) => (r.name || '').toLowerCase().includes(key)) || rs[0];
  render(guess);
}
const PLAY_PICK = new Map();

// iOS tarafında IAP ve reklam bilgisi — lookup vermiyor, sayfadan geliyor
async function attachIOSExtras(app) {
  const el = document.querySelector(`.card[data-id="${app.trackId}"]`);
  if (!el) return;
  const slot = el.querySelector('.iosx');
  if (!slot) return;
  try {
    const d = await playFetch('/api/ios?id=' + app.trackId);
    const tags = [];
    if (d.hasIAP) tags.push('<span class="tag iap">Uygulama içi satın alma</span>');
    if (d.hasAds) tags.push('<span class="tag ads">Reklam içeriyor</span>');
    if (!d.hasIAP && !d.hasAds) tags.push('<span class="tag free">Satın alma ve reklam yok</span>');

    const list = d.iaps.length
      ? `<div class="iaplist">${d.iaps.map((i) =>
          `<span class="iapitem"><b>${esc(i.name)}</b><span>${esc(i.price)}</span></span>`).join('')}</div>`
      : '';
    slot.innerHTML = `<span class="lab">Para modeli</span>
      <div class="tags">${tags.join('')}</div>${list}`;
  } catch {
    slot.innerHTML = '<span class="lab">Para modeli</span><span class="pk">'
      + (HAS_BRIDGE
          ? 'App Store sayfasına ulaşılamadı.'
          : 'Uygulama içi satın alma bilgisi için köprü gerekiyor — kurulumu README\'de.')
      + '</span>';
  }
}

// ─── Geliştirici özeti ──────────────────────────────────────────────
function devSummary(name, scans) {
  const live = scans.filter((s) => s.ratings > 0);
  const totalR = scans.reduce((a, s) => a + s.ratings, 0);
  const dlMid = scans.reduce((a, s) => a + s.est.dl.mid, 0);
  const dlLow = scans.reduce((a, s) => a + s.est.dl.low, 0);
  const dlHigh = scans.reduce((a, s) => a + s.est.dl.high, 0);
  const mLow = scans.reduce((a, s) => a + (s.est.monthly?.low || 0), 0);
  const mHigh = scans.reduce((a, s) => a + (s.est.monthly?.high || 0), 0);

  const rated = scans.filter((s) => (s.avg || 0) > 0);
  const avg = rated.length
    ? rated.reduce((a, s) => a + s.avg * s.ratings, 0) /
      rated.reduce((a, s) => a + s.ratings, 0) : 0;

  // En eski çıkış
  const dates = scans.map((s) => s.app.releaseDate).filter(Boolean).sort();
  const since = dates[0] ? new Date(dates[0]) : null;

  // Yoğunlaşma: en büyük uygulamanın payı
  const sorted = [...scans].sort((a, b) => b.est.dl.mid - a.est.dl.mid);
  const topShare = dlMid > 0 ? (sorted[0].est.dl.mid / dlMid) * 100 : 0;

  // Bakım canlılığı
  const now = Date.now(), M = 1000 * 60 * 60 * 24 * 30.44;
  const fresh = scans.filter((s) => s.app.currentVersionReleaseDate &&
    (now - new Date(s.app.currentVersionReleaseDate)) / M < 6).length;
  const stale = scans.filter((s) => s.app.currentVersionReleaseDate &&
    (now - new Date(s.app.currentVersionReleaseDate)) / M > 12).length;

  const paid = scans.filter((s) => (s.app.price || 0) > 0).length;

  // Kategori dağılımı
  const cats = {};
  scans.forEach((s) => {
    const c = s.app.primaryGenreName || '—';
    cats[c] = (cats[c] || 0) + 1;
  });
  const catList = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const catMax = catList[0]?.[1] || 1;

  const rows = sorted.map((s) => {
    const a = s.app, e = s.est;
    const upd = a.currentVersionReleaseDate
      ? Math.round((now - new Date(a.currentVersionReleaseDate)) / M) : null;
    return `<tr>
      <td>${esc(a.trackName)}</td>
      <td>${esc(a.primaryGenreName || '—')}</td>
      <td>${esc(a.formattedPrice || '—')}</td>
      <td class="n">${s.ratings || '—'}</td>
      <td class="n">${s.avg ? '★' + s.avg.toFixed(1) : '—'}</td>
      <td class="n">${s.ratings ? int(e.dl.low) + ' – ' + int(e.dl.high) : '—'}</td>
      <td class="n">${s.ratings && e.monthly
        ? money(e.monthly.low) + ' – ' + money(e.monthly.high)
          + (e.months < 3 ? ' <span class="young" title="3 aydan yeni — aylık ortalama oynak">yeni</span>' : '')
        : '—'}</td>
      <td class="n">${upd === null ? '—' : upd + ' ay'}</td>
    </tr>`;
  }).join('');

  return `<section class="devsum">
    <div class="devhead">
      <div>
        <span class="lab">Geliştirici özeti</span>
        <h2>${esc(name)}</h2>
        <p>${scans.length} uygulama${since ? ' · ' + since.getFullYear() + '\'ten beri' : ''} · ${live.length} tanesi yorum almış</p>
      </div>
    </div>

    <div class="est">
      <div><span class="lab">Uygulama</span><span class="big">${scans.length}</span>
        <span class="sub">${paid} ücretli · ${scans.length - paid} ücretsiz</span></div>
      <div><span class="lab">Toplam yorum</span><span class="big">${int(totalR)}</span>
        <span class="sub">${avg ? '★ ' + avg.toFixed(2) + ' ortalama' : 'puan yok'}</span></div>
      <div><span class="lab">Toplam indirme tahmini</span><span class="big">${int(dlLow)} – ${int(dlHigh)}</span>
        <span class="sub">orta değer ${int(dlMid)}</span></div>
      <div><span class="lab">Aylık gelir tahmini</span><span class="big gold">${money(mLow)} – ${money(mHigh)}</span>
        <span class="sub">portföyün tamamı</span></div>
    </div>

    <div class="devgrid">
      <div class="devbox">
        <span class="lab">Yoğunlaşma</span>
        <p class="bignum">%${topShare.toFixed(0)}</p>
        <p class="note-s">Tahmini indirmenin bu kadarı tek uygulamadan:
          <strong>${esc(sorted[0]?.app.trackName || '—')}</strong>.
          ${topShare > 60 ? 'Portföy değil, tek uygulama taşıyor.'
            : topShare > 35 ? 'Belirgin bir lokomotif var.'
            : 'Yük dengeli dağılmış.'}</p>
      </div>
      <div class="devbox">
        <span class="lab">Bakım</span>
        <p class="bignum">${fresh}/${scans.length}</p>
        <p class="note-s">Son 6 ayda güncellenmiş.
          ${stale ? `<strong>${stale}</strong> uygulama 12 aydır güncellenmemiş — o kalemlerde tahmin şişer.`
                  : 'Bir yıldan eski bırakılmış uygulama yok.'}</p>
      </div>
      <div class="devbox">
        <span class="lab">Kategoriler</span>
        <div class="catbars">
          ${catList.slice(0, 6).map(([c, n]) => `<div class="catrow">
            <span class="cl">${esc(c)}</span>
            <span class="ct"><span class="cf" style="width:${(n / catMax) * 100}%"></span></span>
            <span class="cn">${n}</span></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="scroll" style="margin-top:16px">
      <table>
        <thead><tr>
          <th>Uygulama</th><th>Kategori</th><th>Fiyat</th><th class="n">Yorum</th>
          <th class="n">Puan</th><th class="n">İndirme tahmini</th>
          <th class="n">Aylık gelir</th><th class="n">Son gün.</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="colnote">Bütün rakamlar tahmin — yöntem aşağıdaki model bölümünde.
      Portföy toplamı, tek tek tahminlerin toplamı olduğu için hata payı da toplanır.</p>
  </section>`;
}

// ─── Kayıt ──────────────────────────────────────────────────────────
function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
  catch { return []; }
}
function persist(rows) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(rows)); } catch { /* kotayı aştıysa sessiz geç */ }
  // Yayın sürümünde köprü durumunu üstte açıkça söyle.
(function banner() {
  const el = document.getElementById('liteban');
  if (!el) return;
  el.innerHTML = HAS_BRIDGE
    ? '<strong>Tam sürüm.</strong> App Store, Google Play ve uygulama içi satın alma bilgisi çalışıyor.'
    : '<strong>App Store tarafı çalışıyor.</strong> Google Play verisi ve iOS '
      + 'uygulama içi satın alma bilgisi köprü gerektiriyor — bu iki kaynak '
      + 'tarayıcıdan doğrudan çekilemiyor. Kurulumu <code>worker.js</code> içinde yazılı.';
})();

renderSaved();
}
function save(rec) {
  const rows = load().filter((r) => r.id !== rec.id);
  rows.unshift(rec);
  persist(rows);
}

function renderSaved() {
  const rows = load();
  const wrap = $('#savedWrap');
  wrap.hidden = rows.length === 0;
  $('#savedCount').textContent = rows.length;
  $('#savedTable tbody').innerHTML = rows.map((r) => `<tr>
    <td>${esc(r.name)}</td>
    <td>${esc(r.genre)}</td>
    <td>${esc(r.price)}</td>
    <td class="n">${int(r.ratings)}</td>
    <td class="n">${r.ratings ? int(r.dlLow) + ' – ' + int(r.dlHigh) : '—'}</td>
    <td class="n">${r.ratings ? money(r.mLow) + ' – ' + money(r.mHigh) : '—'}</td>
    <td class="n">${r.age}</td>
    <td><span class="conf ${r.conf}">${r.conf === 'high' ? 'İyi' : r.conf === 'mid' ? 'Orta' : 'Düşük'}</span></td>
    <td><button class="rowdel" type="button" data-del="${esc(r.id)}" title="Sil">×</button></td>
  </tr>`).join('');
}

// ─── Akış ───────────────────────────────────────────────────────────
const statusEl = $('#status');
function say(msg, err) {
  statusEl.hidden = false;
  statusEl.className = 'status' + (err ? ' err' : '');
  statusEl.textContent = msg;
}

async function run() {
  const parsed = parseInput($('#q').value);
  if (!parsed) {
    say('Bağlantıyı anlayamadım. App Store uygulama ya da geliştirici bağlantısı yapıştır, veya sadece kimlik numarasını yaz.', true);
    return;
  }
  const scope = $('#scope').value;
  const btn = $('#go');
  btn.disabled = true;
  $('#results').innerHTML = '';
  $('#search').hidden = true;

  try {
    if (parsed.kind === 'search') {
      say('İki mağazada birden aranıyor…');
      await searchBoth(parsed.term);
      statusEl.hidden = true;
      return;
    }

    if (parsed.kind === 'play') {
      say('Google Play\'den alınıyor…');
      const a = await playFetch('/api/play?id=' + encodeURIComponent(parsed.id));
      $('#search').hidden = false;
      $('#iosN').textContent = '0';
      $('#iosList').innerHTML = '<div class="empty">Bu bir Play bağlantısı. App Store karşılığı için uygulamanın adını arat.</div>';
      $('#andN').textContent = '1';
      $('#andList').innerHTML = playRow(a);
      statusEl.hidden = true;
      return;
    }

    // Geliştirici mi uygulama mı
    let apps = [];
    if (parsed.kind === 'dev') {
      say('Geliştiricinin uygulamaları alınıyor…');
      const d = await lookup({ id: parsed.id, entity: 'software', limit: 200 });
      apps = d.results.filter((r) => r.wrapperType === 'software');
      if (!apps.length) throw new Error('Bu geliştiricide uygulama bulunamadı.');
    } else {
      const d = await lookup({ id: parsed.id, entity: 'software', limit: 200 });
      const soft = d.results.filter((r) => r.wrapperType === 'software');
      if (parsed.kind === 'auto' && soft.length > 1) {
        apps = soft; // geliştirici kimliği verilmiş
      } else if (soft.length) {
        apps = [soft[0]];
      } else {
        throw new Error('Bu kimlikle uygulama bulunamadı. Uygulama kaldırılmış olabilir.');
      }
    }

    apps.sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0));

    // Geliştirici taraması: tek tek kart yerine portföy özeti
    const isDev = apps.length > 1;
    if (isDev) say(`${apps.length} uygulama bulundu, ülke taraması yapılıyor…`);

    const scans = [];
    const frag = [];
    for (let i = 0; i < apps.length; i++) {
      const a = apps[i];
      say(`${i + 1}/${apps.length} — ${a.trackName} taranıyor…`);
      const g = await gather(a.trackId, scope);
      const app = g.base || a;
      const est = estimate(app, g.total);
      SCANNED.set(String(app.trackId), { app, ratings: g.total, est });
      scans.push({ app, ratings: g.total, per: g.per, est, avg: g.avg });

      if (isDev) {
        $('#results').innerHTML = devSummary(
          apps[0].artistName || app.sellerName || 'Geliştirici', scans);
      } else {
        frag.push(card(app, g.total, g.per, est, scope, g.avg));
        $('#results').innerHTML = frag.join('');
        wireCards();
        attachIOSExtras(app);
        attachPlay(app);
      }
    }
    statusEl.hidden = true;
  } catch (e) {
    say('Alınamadı: ' + e.message, true);
  } finally {
    btn.disabled = false;
  }
}

// Kart HTML'i string olarak üretiliyor; kaydetmek için gereken veriyi
// trackId'ye göre burada tutuyoruz.
const SCANNED = new Map();

function wireCards() {
  document.querySelectorAll('.card .save').forEach((b) => {
    if (b.dataset.wired) return;
    b.dataset.wired = '1';
    b.addEventListener('click', () => {
      const id = b.closest('.card').dataset.id;
      const rec = SCANNED.get(id);
      if (!rec) return;
      const { app, ratings, est } = rec;
      save({
        id: String(app.trackId), name: app.trackName,
        genre: app.primaryGenreName || '—', price: app.formattedPrice || '—',
        ratings,
        dlLow: est.dl.low, dlHigh: est.dl.high,
        mLow: est.monthly ? est.monthly.low : 0,
        mHigh: est.monthly ? est.monthly.high : 0,
        age: est.months ? (est.months >= 12 ? (est.months / 12).toFixed(1) + 'y' : Math.round(est.months) + 'a') : '—',
        conf: est.conf, at: new Date().toISOString(),
      });
      b.textContent = 'Kaydedildi ✓';
      setTimeout(() => { b.textContent = 'Kaydet'; }, 1600);
    });
  });
}

// ─── Olaylar ────────────────────────────────────────────────────────
$('#go').addEventListener('click', run);
$('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });

$('#savedTable').addEventListener('click', (e) => {
  const id = e.target.dataset?.del;
  if (!id) return;
  persist(load().filter((r) => r.id !== id));
});

$('#clearBtn').addEventListener('click', () => {
  if (confirm('Kaydedilen bütün uygulamalar silinsin mi?')) persist([]);
});

$('#exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mihenk-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#importInput').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const rows = JSON.parse(await f.text());
    if (!Array.isArray(rows)) throw new Error('beklenen biçim bir dizi');
    const cur = load();
    const seen = new Set(rows.map((r) => r.id));
    persist([...rows, ...cur.filter((r) => !seen.has(r.id))]);
    say(rows.length + ' kayıt içe aktarıldı.');
  } catch (err) {
    say('Dosya okunamadı: ' + err.message, true);
  }
  e.target.value = '';
});

$('#themeBtn').addEventListener('click', () => {
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

// Yayın sürümünde köprü durumunu üstte açıkça söyle.
(function banner() {
  const el = document.getElementById('liteban');
  if (!el) return;
  el.innerHTML = HAS_BRIDGE
    ? '<strong>Tam sürüm.</strong> App Store, Google Play ve uygulama içi satın alma bilgisi çalışıyor.'
    : '<strong>App Store tarafı çalışıyor.</strong> Google Play verisi ve iOS '
      + 'uygulama içi satın alma bilgisi köprü gerektiriyor — bu iki kaynak '
      + 'tarayıcıdan doğrudan çekilemiyor. Kurulumu <code>worker.js</code> içinde yazılı.';
})();

renderSaved();
