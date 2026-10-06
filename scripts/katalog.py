#!/usr/bin/env python3
"""Ana sayfanın uygulama listesini üretir.

Uygulama eklemek ya da durumunu değiştirmek için APPS listesini düzenle ve
`python3 scripts/katalog.py` çalıştır. Satırlar index.html içindeki
`katalog:başla` / `katalog:bitti` işaretlerinin arasına yazılır.
Raftaki telefonlar sayfa açılınca bu satırlardan ve
assets/home/screens/manifest.json'daki ekranlardan çizilir.
"""
import html, json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

AS = "https://apps.apple.com/app/id"
GP = "https://play.google.com/store/apps/details?id="

# status: live | new | soon | web
# plat: ios android watchos wearos web
# color: Slush çıkartma paletinden; telefonun arkasındaki kartın rengi
APPS = [
  dict(slug="walletcoach", name="Wallet Coach", sub="Monthly Budget", icon="/walletcoach/assets/icon-512.png", status="live",
       tags="tools finance", plat="ios android", color="#dceeff",
       tr="Ev ekonomisini Excel'deki ay sekmeleri gibi tutar: ayı bir kez yaz, ödedikçe işaretle, yeni ay öncekini kopyalasın. Fişi okutur, senin enflasyonunu hesaplar.",
       en="Household books kept like a spreadsheet with a tab per month: write the month once, tick things off as they are paid, let the next month copy itself. Scans receipts, works out your own inflation.",
       tour="/walletcoach/", ios="6798041415", play="com.aberk.walletcoach", search="wallet coach bütçe ev ekonomisi budget para"),
  dict(slug="tennis-padel", name="Tennis & Padel", sub="Score Keeper", icon="/tennis-padel/assets/icon.webp", status="live",
       tags="sport", plat="ios android watchos wearos", color="#c8f560",
       tr="Sayıya dokun, kurallar kendi işlesin: tiebreak, altın sayı, set. Saatte tek başına çalışır.",
       en="Tap to score and the rules take care of themselves: tiebreaks, golden points, sets. Runs standalone on the watch.",
       tour="/tennis-padel/", ios="6756925523", play="com.aberk.wear", search="tennis padel tenis skor score"),
  dict(slug="nubi", name="Nubi", sub="Virtual Pet", icon="/assets/home/nubi-icon.webp", status="new", released="2026-10-01",
       tags="fun", plat="ios", color="#ffd731",
       tr="Gerçek zamanlı yaşayan bir sanal evcil hayvan. Sen işteyken acıkır, gece uykusu gelir, unutursan biraz sıkılır; her gün gözünün önünde büyür.",
       en="A virtual pet that lives in real time. Hungry while you work, sleepy at night, a little bored when you forget it, and growing up right in front of you.",
       tour="/nubi/", ios="6816090205", search="nubi sanal evcil hayvan tamagotchi pet virtual"),
  dict(slug="daily-whisper", name="Daily Whisper", sub="Affirmations", icon="/assets/home/daily-whisper-icon.webp", status="new", released="2026-10-02",
       tags="health", plat="ios watchos", color="#e9ccff",
       tr="Her sabah sana özel yazılmış kısa bir hikaye: hayalini kurduğun hayattan bir sahne, senin adınla, sıcak bir sesle okunur.",
       en="Every morning a short story written just for you: a scene from the life you are working towards, with your name in it, read aloud in a warm voice.",
       tour="/daily-whisper/", ios="6757824195", search="daily whisper affirmations olumlama manifest hikaye"),
  dict(slug="o-mu-bu-mu", name="O mu Bu mu?", sub="This or That", icon="/assets/home/omubumu-icon.webp", status="live",
       tags="fun", plat="ios android watchos wearos", color="#5c4ade",
       tr="İmkansız tercihler ve turnuvalar. Arkadaşlarınla sesli oynanır, tartışma garantili.",
       en="Impossible choices and tournaments, Turkish edition. Played out loud with friends, arguments guaranteed.",
       tour="/o-mu-bu-mu/", ios="6740251305", play="com.berkalparslan.thisOne", search="o mu bu mu would you rather tercih oyunu turnuva"),
  dict(slug="tasbih-tally", name="Tasbih Tally", sub="Digital Counter", icon="/tasbih-tally/assets/icon.webp", status="live",
       tags="tools", plat="ios watchos", color="#55db9c",
       tr="Zikir, namaz vakitleri ve kıble. Saatte titreşimle sayar, sayıyı kaybetmezsin.",
       en="Dhikr counter, prayer times and qibla. Counts with haptics on the Watch so you never lose count.",
       tour="/tasbih-tally/", ios="6756802776", search="tasbih tally zikir tesbih namaz kıble counter"),
  dict(slug="bodybook", name="BodyBook", sub="Health Tracker", icon="/assets/home/bodybook-icon.webp", status="live",
       tags="health", plat="android", color="#fb4903",
       tr="Tansiyon, kilo, cilt bakım rutini, ben fotoğrafları, ilaç, su ve uyku tek panelde. Hepsi telefonunda kalır.",
       en="Blood pressure, weight, skincare routine, mole photos, medication, water and sleep in one panel. Everything stays on your phone.",
       tour="/bodybook/", play="com.aberk.bodybook", search="bodybook sağlık tansiyon cilt ben health"),
  dict(slug="leafbook", name="Leafbook", sub="Plant Tracker", icon="/assets/home/leafbook-icon.webp", status="new", released="2026-09-29",
       tags="lifestyle", plat="ios android", color="#55db9c",
       tr="Ev bitkileri için fotoğraf günlüğü. Fotoğraftan tanı, sulama takvimi al; hayalet kamerayla aynı açıdan çek, ne kadar büyüdüğünü ölç.",
       en="A photo diary for houseplants. Identify from a photo, get a watering schedule, shoot from the same angle with the ghost camera and measure the growth.",
       tour="/leafbook/", ios="6811846217", play="com.aberk.leafbook", search="leafbook bitki takip sulama hayalet kamera plant"),
  dict(slug="bosyeryok", name="Boş Yer Yok", sub="Parking Tycoon", icon="/bosyeryok/assets/icon-512.png", status="live",
       tags="fun", plat="android", color="#ffd731",
       tr="Otopark işletme oyunu. Direksiyon çevirmiyorsun, işletiyorsun: tarifeyi sen koyuyorsun, ekibi sen kuruyorsun, maaşlar her saniye kasadan düşüyor.",
       en="A parking lot tycoon. You don't steer, you run the place: you set the tariff, hire the crew, and wages come out of the till every second.",
       tour="/bosyeryok/", play="com.aberk.bosyeryok", search="boş yer yok no spaces otopark parking tycoon oyun game"),
  dict(slug="kit", name="Kit", sub="QR Scanner & Wallet", icon="/assets/home/kit-icon.webp", status="new", released="2026-10-01",
       tags="tools", plat="ios watchos", color="#4da2ff",
       tr="Her kodu okur, sadakat kartlarını ve biletleri tek cüzdanda tutar, güzel görünen QR kodlar üretir. Linki açmadan önce de kontrol eder. Reklam yok, hesap yok.",
       en="Reads every code, keeps loyalty cards and tickets in one wallet and makes QR codes that look good. Checks a link before you open it. No ads, no account.",
       tour="/kit-qr/", ios="6446224550", search="kit qr scanner wallet barcode kod cüzdan kart bilet"),
  dict(slug="yonca", name="Yonca", sub="Çekiliş", icon="/assets/home/yonca-icon.webp", status="live",
       tags="tools", plat="ios", color="#55db9c",
       tr="Kendi çekilişini yap ya da katıldıklarını takip et. İsimleri yapıştır, kazananı çek, kartı paylaş; sonuç günü de hatırlatır.",
       en="Run your own giveaway or track the ones you entered. Paste the names, draw the winners, share the card; it reminds you on result day too.",
       tour="/yonca/", ios="6802312123", search="yonca çekiliş takip giveaway kampanya draw"),
  dict(slug="matchday", name="Matchday", sub="Five a side", icon="/matchday/assets/icon-512.png", status="soon",
       tags="sport soon", plat="ios android", color="#c8f560",
       tr="Haftalık halısaha düzeni: maçı kur, davet et, kadroyu yaz, skoru gir. Maçtan sonra herkes birbirini anonim puanlar.",
       en="The weekly five-a-side, organised: set up the match, invite, pick the lineup, log the score. Afterwards everyone rates each other anonymously.",
       tour="/matchday/", tour_tr="Beta'ya katıl", tour_en="Join the beta", search="matchday halısaha futbol five a side maç kadro"),
  dict(slug="pickleball", name="Pickleball", sub="Score Keeper", icon="/pickleball/assets/icon.webp", status="live",
       tags="sport", plat="ios watchos", color="#4da2ff",
       tr="Servis, side-out ve ralli puanlaması sende değil. Sayı tartışmak yerine bileğine bak.",
       en="Server, side-out and rally scoring handled for you. Glance at your wrist instead of arguing about the score.",
       tour="/pickleball/", ios="6760598754", search="pickleball score skor"),
  dict(slug="orbix-roulette", name="Orbix", sub="Roulette", icon="/orbix-roulette/assets/icon.webp", status="live",
       tags="fun", plat="watchos wearos", color="#5c4ade",
       tr="Bileğinde güzel bir karar çarkı. Kim ödeyecek, kim başlayacak, nereye gidilecek: çevir, tartışma bitsin.",
       en="A beautiful decision wheel. Who pays, who goes first, where to eat: spin it and stop arguing.",
       tour="/orbix-roulette/", ios="6756230899", play="com.aberk.orbixroulette", search="orbix roulette çark wheel spin karar"),
  dict(slug="volleyball", name="Volleyball", sub="Score Keeper", icon="/volleyball/assets/icon.webp", status="live",
       tags="sport", plat="ios watchos", color="#ffd731",
       tr="Canlı set skoru, maç defteri ve antrenmandan gelen nabız istatistikleri.",
       en="Live set scoring with a match logbook and heart rate stats pulled from your workout.",
       tour="/volleyball/", ios="6760615315", search="volleyball voleybol score skor"),
  dict(slug="rally-badminton", name="Rally: Badminton", sub="Score Keeper", icon="/rally-badminton/assets/icon.webp", status="live",
       tags="sport", plat="ios watchos", color="#e9ccff",
       tr="Ralli puanlaması, servis alanı ve taraf değişimi otomatik; 21 sayı ve iki fark kuralı dahil.",
       en="Rally scoring, service court and side changes handled for you, with 21-point games and the two-point rule built in.",
       tour="/rally-badminton/", ios="6802337158", search="rally badminton skor score"),
  dict(slug="rally-table-tennis", name="Rally: Table Tennis", sub="Score Keeper", icon="/rally-table-tennis/assets/icon.webp", status="live",
       tags="sport", plat="ios watchos", color="#fb4903",
       tr="On bire kadar, iki sayıda bir servis değişimi, uzayan deuce. Yüksek sesle saymayı bırak.",
       en="Eleven up, serve swaps every two points, deuce that keeps going. Stop counting out loud.",
       tour="/rally-table-tennis/", ios="6802339775", search="rally table tennis masa tenisi ping pong skor"),
  dict(slug="bumpline", name="Bumpline", sub="Pregnancy Tracker", icon="/bumpline/assets/icon.webp", status="soon",
       tags="health soon", plat="ios", color="#ffb3d9",
       tr="Kırk hafta, tek bir tarihten. Hangi haftadasın, bebek ne kadar büyüdü, doğuma kaç gün kaldı; widget, günlük ve paylaşılabilir kartla.",
       en="Forty weeks from a single date. Which week you are in, how big the baby is, how many days are left; with a widget, a journal and a shareable card.",
       tour="/bumpline/", search="bumpline kırk hafta hamilelik gebelik pregnancy"),
  dict(slug="store-mockup", name="Framegrove", sub="Creative Assets", icon="/assets/home/icons/store-mockup.svg", status="web",
       tags="tools web", plat="web", color="#e9ccff",
       tr="Uygulamanın yeni vitrini: App Store Creative Assets, iPhone Duo ve mağaza ekran görüntüleri. 56 özenli şablon, katmanlı editör ve MCP/skill otomasyonu. Ücretsiz ve açık kaynak.",
       en="Your app’s new showcase: App Store Creative Assets, iPhone Duo and store screenshots. 56 curated templates, a layer editor and MCP/skill automation. Free and open source.",
       tour="/web/store-mockup/", tour_tr="Aracı aç", tour_en="Open the tool", web="https://framegrove.bamstudio.dev/", search="framegrove iphone duo creative assets screenshot ekran görüntüsü web"),
  dict(slug="mihenk", name="Mihenk", sub="App Estimator", icon="/assets/home/icons/mihenk.svg", status="web",
       tags="tools web", plat="web", color="#ffd731",
       tr="Herhangi bir uygulamanın kaç kez indirildiğini ve ne kazandığını App Store ve Google Play verisinden tahmin eder. Rakibine bak, pazarı ölç.",
       en="Estimates how many times any app was downloaded and what it earns, from App Store and Google Play data. Size up a rival, measure a market.",
       tour="/lab/mihenk/", tour_tr="Aracı aç", tour_en="Open the tool", search="mihenk indirme gelir tahmin downloads revenue estimate web"),
]

PLAT = {"ios": "iOS", "android": "Android", "watchos": "watchOS", "wearos": "Wear OS", "web": "Web"}


def e(s): return html.escape(s, quote=True)
def bi(tr, en): return f'<span class="tr">{e(tr)}</span><span class="en">{e(en)}</span>'


MANIFEST = json.loads((ROOT / "assets/home/screens/manifest.json").read_text())


def device_html(a):
    """Satırdaki büyük panelin içindeki cihaz: telefon, saat ya da dizüstü."""
    m = MANIFEST.get(a["slug"], {})
    kind = m.get("kind", "screen")
    tr = m.get("tr") or m.get("any") or m.get("en") or []
    en = m.get("en") or m.get("any") or m.get("tr") or []
    def one(src, cls):
        img = f'<img src="{src}" alt="" loading="lazy" />'
        if kind == "laptop":
            return f'<span class="m-laptop {cls}"><span class="lid"><span class="scr">{img}</span></span><span class="base"></span></span>'
        if kind == "watch":
            return f'<span class="m-watch {cls}"><span class="case"><span class="scr">{img}</span></span></span>'
        return f'<span class="m-phone {cls}"><span class="isl"></span><span class="scr">{img}</span></span>'
    if not tr and kind == "watch":
        return f'<span class="m-watch"><span class="case"><span class="scr fallback"><img src="{a["icon"]}" alt="" loading="lazy" /></span></span></span>'
    if not tr:
        return f'<span class="m-phone"><span class="isl"></span><span class="scr fallback"><img src="{a["icon"]}" alt="" loading="lazy" /></span></span>'
    if tr[0] == en[0]:
        return one(tr[0], "")
    return one(tr[0], "tr") + one(en[0], "en")


def row(a, i):
    st = a["status"]
    ios = (AS + a["ios"]) if a.get("ios") else ""
    play = (GP + a["play"]) if a.get("play") else ""
    web = a.get("web", "https://bamstudio.dev" + a["tour"]) if a["plat"] == "web" else ""
    attrs = (f'id="app-{a["slug"]}" data-slug="{a["slug"]}" data-tags="{a["tags"]} {a["plat"]}" data-color="{a["color"]}" '
             f'data-icon="{a["icon"] or ""}" data-ios="{e(ios)}" data-play="{e(play)}" data-web="{e(web)}" data-tour="{e(a.get("tour", ""))}" '
             f'data-title="{e(a["name"])}" data-name="{e(a["name"] + " " + a["sub"] + " " + a["search"])}"')
    if a.get("released"): attrs += f' data-released="{a["released"]}"'
    mark = ""
    if st == "new": mark = f'<span class="badge b-new">{bi("yeni", "new")}</span>'
    elif st == "soon": mark = f'<span class="badge b-soon">{bi("yolda", "soon")}</span>'
    elif st == "web": mark = f'<span class="badge b-web">{bi("web uygulaması", "web app")}</span>'
    chips = "".join(f'<span class="chip">{PLAT[p]}</span>' for p in a["plat"].split())
    links = []
    if ios: links.append(f'<a class="pill dark" href="{ios}" target="_blank" rel="noopener" data-umami-event="app-store" data-umami-event-app="{a["slug"]}">App Store ↗</a>')
    if play: links.append(f'<a class="pill dark" href="{play}" target="_blank" rel="noopener" data-umami-event="google-play" data-umami-event-app="{a["slug"]}">Google Play ↗</a>')
    if a.get("tour"):
        links.append(f'<a class="pill" href="{a["tour"]}" target="_blank" rel="noopener" data-umami-event="tanitim" data-umami-event-app="{a["slug"]}">{bi(a.get("tour_tr", "Tanıtım"), a.get("tour_en", "Tour"))} →</a>')
    links.append(f'<button class="pill ghost show" type="button" data-umami-event="vitrinde-gor" data-umami-event-app="{a["slug"]}">{bi("Vitrinde gör ↑", "On the shelf ↑")}</button>')
    side = "l" if i % 2 else "r"
    return f'''        <article class="zrow z-{side}" {attrs} style="--c:{a["color"]}">
          <div class="zpanel">
            <a class="zhit" href="{a.get("tour", "#vitrin")}" target="_blank" rel="noopener" data-umami-event="panel-tanitim" data-umami-event-app="{a["slug"]}" aria-label="{e(a["name"])}">{device_html(a)}</a>
            <img class="zicon" src="{a["icon"]}" alt="" loading="lazy" width="512" height="512" />
            <span class="znum disp">{i:02d}</span>
          </div>
          <div class="ztxt">
            <p class="zkick">{e(a["sub"])} {mark}</p>
            <h3 class="disp" lang="en">{e(a["name"])}</h3>
            <p class="zp">{bi(a["tr"], a["en"])}</p>
            <div class="chips">{chips}</div>
            <div class="rl">{"".join(links)}</div>
          </div>
        </article>'''


rows = "\n".join(row(a, i + 1) for i, a in enumerate(APPS))
idx = ROOT / "index.html"
src = idx.read_text()
new, n = re.subn(r"(<!-- katalog:başla -->\n).*?(\s*<!-- katalog:bitti -->)",
                 lambda m: m.group(1) + rows + m.group(2), src, flags=re.S)
assert n == 1, "katalog işaretleri bulunamadı"
idx.write_text(new)
# Arka uç (api/worker.js) mailde uygulama kartlarını bu listeden çizer.
(ROOT / "api/apps.json").write_text(json.dumps([
    {k: a.get(k) for k in ("slug", "name", "sub", "icon", "color", "ios", "play", "tour", "status")} | {"tr": a["tr"], "en": a["en"]}
    for a in APPS], ensure_ascii=False, indent=1))
print("satır:", len(APPS))
