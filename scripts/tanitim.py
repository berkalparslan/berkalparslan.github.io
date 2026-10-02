#!/usr/bin/env python3
"""Tanıtım sayfası üreteci.

Her uygulamanın içeriği `data/tanitim/<slug>.json` dosyasında durur; bu betik
hepsinden `<slug>/index.html` üretir. Ortak görünüm `assets/tanitim.css`,
davranış `assets/tanitim.js` içindedir.

    python3 scripts/tanitim.py            # hepsini üret
    python3 scripts/tanitim.py nubi kit-qr # yalnız bunları

Şema (her metin alanı {"tr": "...", "en": "..."} biçiminde; tek dil yeterliyse
düz string de olur):

{
  "slug": "nubi",                     # klasör adı = URL
  "name": "Nubi",                     # dev başlık
  "title": {...},                     # <title> ve og:title (ör. "Nubi: Sanal Bebek")
  "description": {...},               # meta description
  "icon": "/nubi/assets/icon.webp",
  "color": "#ffd731",                 # hero zemini ve kart vurgusu (Slush paleti)
  "accent": "#fb4903",                # ikinci renk (rozet, vurgu)
  "status": "live" | "new" | "soon",
  "kicker": {...},                    # hero üstündeki küçük satır
  "lede": {...},
  "pills": [{...}, ...],              # hero altındaki küçük etiketler
  "platforms": ["ios", "android", "watchos", "wearos", "web"],
  "ios": "6816090205",                # App Store id (yoksa yok)
  "play": "com.aberk.nubi",           # Play paket adı (yoksa yok)
  "buttons": [{"label": {...}, "href": "...", "dark": true}],   # ek düğmeler (ör. beta)
  "emoji": ["🥚", "🧸", "🍼"],          # hero'da uçuşan, sürüklenen temalı çıkartmalar
  "promo": {"tr": [...], "en": [...]},  # mağaza görselleri: sonsuz kayan şerit
  "sections": [                       # sağlı sollu bölümler, sırayla
    {
      "id": "album",
      "kicker": {...}, "title": {...}, "text": {...},
      "bullets": [{...}],
      "device": "phone" | "watch" | "laptop" | "image",   # görselin çerçevesi
      "images": {"tr": [...], "en": [...]},  # ya da "any": [...]; birden fazlaysa döner
      "color": "#55db9c"              # panel rengi (yoksa palet sırası)
    }
  ],
  "pricing": {"title": {...}, "lede": {...}, "plans": [{"name": {...}, "price": {...}, "items": [{...}]}]},
  "privacy": {"title": {...}, "text": {...}, "href": "/privacy/nubi/"},
  "support": "/support/",
  "extra_head": "...",                # ham HTML, <head> sonuna
  "extra_html": "...",                # ham HTML, gizlilik bandından önce
  "extra_script": "..."               # ham JS, sayfa sonunda
}
"""
import hashlib, html, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "tanitim"

AS = "https://apps.apple.com/app/id"
GP = "https://play.google.com/store/apps/details?id="
PALETTE = ["#dceeff", "#e9ccff", "#55db9c", "#ffd731", "#ffb3d9", "#c8f560", "#4da2ff"]
PLAT = {"ios": "iOS", "android": "Android", "watchos": "watchOS", "wearos": "Wear OS", "web": "Web"}

APPLE_SVG = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 '
             '.77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 '
             '2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 '
             '3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>')
PLAY_SVG = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.18 23.76c.3.17.64.22.99.14l11.24-6.51-2.5-2.5-9.73 8.87zM.5 1.1C.18 1.47 0 '
            '2.01 0 2.7v18.6c0 .69.18 1.23.5 1.6l.08.08 10.43-10.43v-.24L.58 1.02.5 1.1zm18.1 11.27-2.6-1.5-2.77 2.77 2.77 2.77 2.61-1.51c.75-.43.75-1.1-.01-1.53zM4.17.24L15.4 '
            '6.75l-2.5 2.5L3.18.38A1.2 1.2 0 014.17.24z"/></svg>')


def e(s): return html.escape(str(s), quote=True)


def t(v):
    """İki dilli metin → span çifti. Düz string iki dilde de aynıdır."""
    if v is None: return ""
    if isinstance(v, str): return e(v)
    tr, en = v.get("tr", v.get("en", "")), v.get("en", v.get("tr", ""))
    if tr == en: return e(tr)
    return f'<span class="tr">{e(tr)}</span><span class="en">{e(en)}</span>'


def plain(v, lang="en"):
    if v is None: return ""
    if isinstance(v, str): return v
    return v.get(lang) or v.get("en") or v.get("tr") or ""


def imgs(spec):
    """{"tr":[...],"en":[...]} ya da {"any":[...]} ya da liste → (tr, en)."""
    if not spec: return [], []
    if isinstance(spec, list): return spec, spec
    anyl = spec.get("any", [])
    return spec.get("tr") or anyl or spec.get("en", []), spec.get("en") or anyl or spec.get("tr", [])


def device(sec, alt):
    tr, en = imgs(sec.get("images"))
    kind = sec.get("device", "phone")
    def frame(lst, cls):
        if not lst: return ""
        data = e(json.dumps(lst))
        first = f'<img src="{e(lst[0])}" alt="{e(alt)}" loading="lazy" />'
        dots = "".join(f'<i class="{"on" if i == 0 else ""}"></i>' for i in range(len(lst))) if len(lst) > 1 else ""
        dots = f'<span class="dots">{dots}</span>' if dots else ""
        if kind == "phone":
            inner = f'<span class="m-phone"><span class="isl"></span><span class="scr" data-cycle="{data}">{first}</span></span>'
        elif kind == "watch":
            inner = f'<span class="m-watch"><span class="strap b1"></span><span class="case"><span class="scr" data-cycle="{data}">{first}</span></span><span class="strap b2"></span><span class="crown"></span></span>'
        elif kind == "laptop":
            inner = f'<span class="m-laptop"><span class="lid"><span class="scr" data-cycle="{data}">{first}</span></span><span class="base"></span></span>'
        else:
            inner = f'<span class="m-image" data-cycle="{data}">{first}</span>'
        return f'<span class="dev {cls}">{inner}{dots}</span>'
    if tr == en:
        return frame(tr, "")
    return frame(tr, "tr") + frame(en, "en")


def store_buttons(d, big=False):
    out = []
    cls = "pill dark big" if big else "pill dark"
    if d.get("ios"):
        out.append(f'<a class="{cls}" href="{AS}{d["ios"]}" target="_blank" rel="noopener">{APPLE_SVG}App Store</a>')
    if d.get("play"):
        out.append(f'<a class="{cls}" href="{GP}{d["play"]}" target="_blank" rel="noopener">{PLAY_SVG}Google Play</a>')
    for b in d.get("buttons", []):
        c = ("pill dark" if b.get("dark") else "pill") + (" big" if big else "")
        ext = "" if b["href"].startswith(("/", "#")) else ' target="_blank" rel="noopener"'
        out.append(f'<a class="{c}" href="{e(b["href"])}"{ext}>{t(b["label"])}</a>')
    return "".join(out)


def ver(rel):
    """Önbellek kırıcı: dosya değişince adres değişir."""
    return hashlib.md5((ROOT / rel).read_bytes()).hexdigest()[:8]


def render(d):
    slug = d["slug"]
    name = d["name"]
    color = d.get("color", "#dceeff")
    accent = d.get("accent", "#fb4903")
    title_en, title_tr = plain(d.get("title", name), "en"), plain(d.get("title", name), "tr")
    desc_en = plain(d.get("description", d.get("lede")), "en")
    status = d.get("status", "live")
    badge = ""
    if status == "new": badge = '<span class="badge b-new"><span class="tr">yeni</span><span class="en">new</span></span>'
    elif status == "soon": badge = '<span class="badge b-soon"><span class="tr">yolda</span><span class="en">soon</span></span>'
    chips = "".join(f'<span class="chip">{PLAT[p]}</span>' for p in d.get("platforms", []))
    pills = "".join(f'<span class="pill-s">{t(p)}</span>' for p in d.get("pills", []))
    emoji = e(json.dumps(d.get("emoji", []), ensure_ascii=False))

    ptr, pen = imgs(d.get("promo"))
    def strip(lst, cls):
        if not lst: return ""
        items = "".join(f'<img src="{e(s)}" alt="" loading="lazy" />' for s in lst)
        dup = items.replace("<img ", '<img aria-hidden="true" ')
        return f'<div class="promo {cls}"><div class="promo-track">{items}{dup}</div></div>'
    promo = strip(ptr, "") if ptr == pen else strip(ptr, "tr") + strip(pen, "en")

    secs = []
    for i, s in enumerate(d.get("sections", [])):
        side = "l" if i % 2 == 0 else "r"
        c = s.get("color", PALETTE[i % len(PALETTE)])
        bullets = "".join(f"<li>{t(b)}</li>" for b in s.get("bullets", []))
        bullets = f'<ul class="bul">{bullets}</ul>' if bullets else ""
        kicker = f'<p class="kick">{t(s["kicker"])}</p>' if s.get("kicker") else ""
        secs.append(f'''
  <section class="z z-{side}" id="{e(s.get("id", f"s{i+1}"))}">
    <div class="wrap z-in">
      <div class="panel reveal" style="--c:{c}">{device(s, plain(s.get("title"), "en"))}</div>
      <div class="z-txt reveal">
        {kicker}
        <h2 class="disp">{t(s.get("title"))}</h2>
        <p class="z-p">{t(s.get("text"))}</p>
        {bullets}
      </div>
    </div>
  </section>''')

    pricing = ""
    if d.get("pricing"):
        p = d["pricing"]
        cards = []
        for j, pl in enumerate(p.get("plans", [])):
            items = "".join(f"<li>{t(x)}</li>" for x in pl.get("items", []))
            cards.append(f'<div class="plan" style="--c:{PALETTE[(j*2+1) % len(PALETTE)]};--r:{[-2,2,-1][j%3]}deg"><h3>{t(pl.get("name"))}</h3>'
                         f'<p class="price">{t(pl.get("price"))}</p><ul>{items}</ul></div>')
        pricing = f'''
  <section class="band band-sun" id="fiyat">
    <div class="wrap">
      <h2 class="disp big">{t(p.get("title", {"tr": "Fiyat", "en": "Pricing"}))}</h2>
      {f'<p class="band-p">{t(p["lede"])}</p>' if p.get("lede") else ""}
      <div class="plans">{"".join(cards)}</div>
    </div>
  </section>'''

    privacy = ""
    if d.get("privacy"):
        pv = d["privacy"]
        privacy = f'''
  <section class="band band-mint" id="gizlilik">
    <div class="wrap pv">
      <h2 class="disp big">{t(pv.get("title", {"tr": "Verin sende", "en": "Your data stays yours"}))}</h2>
      <div><p class="band-p">{t(pv.get("text"))}</p>
      <p class="row-btns"><a class="pill" href="{e(pv.get("href", "/privacy/"))}"><span class="tr">Gizlilik politikası</span><span class="en">Privacy policy</span> →</a>
      <a class="pill" href="{e(d.get("support", "/support/"))}"><span class="tr">Destek</span><span class="en">Support</span> →</a></p></div>
    </div>
  </section>'''

    qrs = []
    if d.get("ios"): qrs.append(("ios", AS + d["ios"], "App Store"))
    if d.get("play"): qrs.append(("play", GP + d["play"], "Google Play"))
    get = ""
    if qrs or d.get("buttons"):
        qcards = "".join(f'<a class="qr-card" href="{e(u)}" target="_blank" rel="noopener" data-qr="{e(u)}" style="--r:{[2,-2][k%2]}deg">'
                         f'<span class="q"></span><span class="qt"><b>{lbl}</b><span class="tr">telefonunla okut, indir</span><span class="en">scan to download</span></span></a>'
                         for k, (_, u, lbl) in enumerate(qrs))
        get = f'''
  <section class="band band-violet" id="indir">
    <div class="wrap get">
      <div>
        <h2 class="disp big"><span lang="en">{e(name)}</span><br /><span class="tr">cebinde</span><span class="en">in your pocket</span></h2>
        <p class="row-btns">{store_buttons(d, big=True)}</p>
      </div>
      <div class="qrs">{qcards}</div>
    </div>
  </section>'''

    nav = []
    for s in d.get("sections", [])[:4]:
        nav.append(f'<a href="#{e(s.get("id"))}">{t(s.get("kicker") or s.get("title"))}</a>')

    marquee_items = [plain(d.get("kicker"), "tr"), name, plain(d.get("kicker"), "en")]
    return f'''<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{e(title_en)} · BamTech</title>
<meta name="description" content="{e(desc_en)}" />
<link rel="canonical" href="https://berkalparslan.github.io/{slug}/" />
<meta property="og:type" content="website" />
<meta property="og:title" content="{e(title_en)}" />
<meta property="og:description" content="{e(desc_en)}" />
<meta property="og:image" content="https://berkalparslan.github.io{e(d.get("icon", "/assets/brand/og.png"))}" />
<meta name="theme-color" content="{color}" />
<link rel="icon" href="{e(d.get("icon", "/assets/brand/icon-32.png"))}" />
<link rel="apple-touch-icon" href="{e(d.get("icon", "/assets/brand/icon-180.png"))}" />
<script>
  (function () {{
    var d = document.documentElement, lang;
    try {{ lang = localStorage.getItem("bb-lang"); }} catch (e) {{}}
    var q = location.search.match(/[?&]lang=(tr|en)\\b/);
    if (q) lang = q[1];
    if (!lang) lang = /^tr\\b/i.test(navigator.language || "") ? "tr" : "en";
    d.setAttribute("data-lang", lang); d.setAttribute("lang", lang);
    d.setAttribute("data-title-tr", {json.dumps(title_tr + " · BamTech", ensure_ascii=False)});
    d.setAttribute("data-title-en", {json.dumps(title_en + " · BamTech", ensure_ascii=False)});
  }})();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@500;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/assets/tanitim.css?v={ver("assets/tanitim.css")}" />
{d.get("extra_head", "")}
</head>
<body style="--app:{color};--acc:{accent}">

<div class="marquee" aria-hidden="true"><div class="mq" data-items="{e(json.dumps([m for m in marquee_items if m], ensure_ascii=False))}"></div></div>

<header class="top">
  <div class="wrap bar">
    <a class="logo" href="/" aria-label="BamTech">b</a>
    <a class="pill back" href="/#tum"><span class="tr">← Tüm uygulamalar</span><span class="en">← All apps</span></a>
    <nav class="nav">{"".join(nav)}</nav>
    <button class="pill lang" type="button">EN</button>
  </div>
</header>

<main>
  <section class="hero" data-emoji="{emoji}">
    <img class="ribbon" src="/assets/ribbon.svg" alt="" aria-hidden="true" />
    <div class="wrap hero-in">
      <img class="app-icon" src="{e(d.get("icon", ""))}" alt="" width="180" height="180" />
      <p class="kick">{t(d.get("kicker"))} {badge}</p>
      <h1 class="disp" lang="en">{e(name)}</h1>
      <p class="lede">{t(d.get("lede"))}</p>
      <div class="pills">{pills}</div>
      <p class="row-btns">{store_buttons(d, big=True)}</p>
      <div class="chips">{chips}</div>
    </div>
  </section>

  {promo}
{"".join(secs)}
{pricing}
{d.get("extra_html", "")}
{privacy}
{get}
</main>

<footer class="foot">
  <div class="wrap">
    <nav>
      <a href="/">BamTech</a>
      <a href="/#tum"><span class="tr">Tüm uygulamalar</span><span class="en">All apps</span></a>
      <a href="{e((d.get("privacy") or {}).get("href", "/privacy/"))}"><span class="tr">Gizlilik</span><span class="en">Privacy</span></a>
      <a href="{e(d.get("support", "/support/"))}"><span class="tr">Destek</span><span class="en">Support</span></a>
      <a href="/blog/">Blog</a>
    </nav>
    <span class="copy">© 2026 BamTech</span>
  </div>
  <div class="giant disp" lang="en" aria-hidden="true">{e(name)}</div>
</footer>

<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
<script src="/assets/tanitim.js?v={ver("assets/tanitim.js")}"></script>
{f"<script>{d['extra_script']}</script>" if d.get("extra_script") else ""}
</body>
</html>
'''


def main():
    only = set(sys.argv[1:])
    files = sorted(DATA.glob("*.json"))
    n = 0
    for f in files:
        d = json.loads(f.read_text())
        if only and d["slug"] not in only: continue
        out = ROOT / d["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render(d))
        n += 1
        print("yazıldı:", out.relative_to(ROOT))
    print(n, "sayfa")


if __name__ == "__main__":
    main()
