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
# plat: ios android watchos wearos web (yayında olanlar)
# soon_plat: tvos androidtv tizen webos ios android ... (incelemede ya da yolda; "yakında" çipiyle çizilir, link yok)
# web: tarayıcıda açılan adres (plat="web" olmasa da olur, ör. Konfeti)
# site: uygulamanın kendi sitesi; satırda "Site ↗" düğmesi olur, "Tanıtım →" (tour) ayrı kalır. Tanıtım sayfası yoksa tour="" bırak.
# color: Slush çıkartma paletinden; telefonun arkasındaki kartın rengi
APPS = [
  dict(slug="walletcoach", name="Wallet Coach", sub="Monthly Budget", icon="/walletcoach/assets/icon-512.png", status="live",
       tags="tools finance", plat="ios android", color="#dceeff",
       tr="Ev ekonomisini Excel'deki ay sekmeleri gibi tutar: ayı bir kez yaz, ödedikçe işaretle, yeni ay öncekini kopyalasın. Fişi okutur, senin enflasyonunu hesaplar.",
       en="Household books kept like a spreadsheet with a tab per month: write the month once, tick things off as they are paid, let the next month copy itself. Scans receipts, works out your own inflation.",
       tour="/walletcoach/", ios="6798041415", play="com.aberk.walletcoach", search="wallet coach bütçe ev ekonomisi budget para"),
  dict(slug="nika", name="Nika", sub="Wedding Planner", icon="/assets/home/nika-icon.webp", status="soon",
       tags="lifestyle soon", plat="", soon_plat="ios android", color="#e9ccff",
       tr="Düğünü ikiniz birlikte planlayın: işler, bütçe, davetliler, masa planı, takı defteri. Misafir uygulama indirmeden davetiyeye cevap verir, düğün günü QR'ı okutup fotoğraflarını albüme yükler. Android'de kapalı testte, iPhone sürümü yolda.",
       en="Plan the wedding together: tasks, budget, guests, seating and a gift log. Guests reply to the invitation without installing anything and drop their photos into the album with a QR on the day. In closed testing on Android, the iPhone version is on the way.",
       tour="/nika/", search="nika düğün planlayıcı düğün planlama uygulaması wedding planner davetiye masa planı takı defteri düğün albümü"),
  dict(slug="tennis-padel", name="Tennis & Padel", sub="Score Keeper", icon="/tennis-padel/assets/icon.webp", status="live",
       tags="sport", plat="ios android watchos wearos", color="#c8f560",
       tr="Sayıya dokun, kurallar kendi işlesin: tiebreak, altın sayı, set. Apple Watch ve Wear OS'ta tek başına çalışır, telefon soyunma odasında kalabilir. 2.0 ile sosyal taraf geldi: takip, akış, ligler, iki telefonla aynı maç.",
       en="Tap to score and the rules take care of themselves: tiebreaks, golden points, sets. Runs standalone on Apple Watch and Wear OS, so the phone can stay in the locker room. 2.0 adds a social side: follows, a feed, leagues, two phones on one match.",
       tour="/tennis-padel/", ios="6756925523", play="com.aberk.wear", search="lig league sosyal social tennis padel tenis skor saati skor tutma score keeper apple watch wear os"),
  dict(slug="era", name="Era", sub="Life & Trip Journal", icon="/assets/home/era-icon.webp", status="soon",
       tags="lifestyle soon", plat="", soon_plat="ios", color="#55db9c",
       tr="Kendi hayat defterin. Anıyı tarihi, yeri ve kişileriyle yaz; yolculukları rota olarak çiz, sonra hepsini kitap gibi sayfa sayfa oku. Bir de seçtiğin güne kadar mühürlü kalan zarflar var. Hesap gerekmiyor.",
       en="Your own life journal. Write a memory with its date, place and people; draw trips as routes, then read it all page by page like a book. There are envelopes too, sealed until a day you pick. No account needed.",
       tour="/era/", search="era anı defteri günlük yolculuk defteri seyahat günlüğü life journal trip journal diary"),
  dict(slug="bodybook", name="BodyBook", sub="Mole Tracker", icon="/assets/home/bodybook-icon.webp", status="new", released="2026-10-15",
       tags="health", plat="ios android", color="#fb4903",
       tr="Benlerini aynı açıdan fotoğrafla, ABCDE listesiyle 3 ila 6 ayda bir karşılaştır. Cilt rutini ve ilaç hatırlatıcısı da içinde. Hepsi telefonunda kalır. Artık iPhone'da da var.",
       en="Photograph your moles from the same angle and compare them every 3 to 6 months with the ABCDE checklist. Skincare routine and pill reminders are in there too. Everything stays on your phone. Now on iPhone as well.",
       tour="/bodybook/", ios="6799754171", play="com.aberk.bodybook", search="bodybook ben takibi mole tracker cilt abcde ilaç hatırlatıcı health"),
  dict(slug="daily-whisper", name="Daily Whisper", sub="Affirmations", icon="/assets/home/daily-whisper-icon.webp", status="new", released="2026-10-02",
       tags="health", plat="ios watchos", color="#e9ccff",
       tr="Her sabah sana yazılmış kısa bir hikaye. Hayalini kurduğun hayattan bir sahne, içinde senin adın; sakin bir ses okuyor, sen gözünü kapatıp dinliyorsun. 2.0 ile baştan tasarlandı.",
       en="Every morning a short story written for you. A scene from the life you want, with your name in it, read by a calm voice while you close your eyes and listen. Redesigned from scratch in 2.0.",
       tour="/daily-whisper/", site="https://dailywhisper.bamstudio.dev/", ios="6757824195", search="daily whisper affirmations olumlama manifest hikaye"),
  dict(slug="nubi", name="Nubi", sub="Virtual Pet", icon="/assets/home/nubi-icon.webp", status="new", released="2026-10-01",
       tags="fun", plat="ios android", color="#ffd731",
       tr="Gerçek zamanlı yaşayan bir sanal evcil hayvan. Sen işteyken acıkır, gece uykusu gelir, unutursan biraz sıkılır; her gün gözünün önünde büyür.",
       en="A virtual pet that lives in real time. Hungry while you work, sleepy at night, a little bored when you forget it, and growing up right in front of you.",
       tour="/nubi/", ios="6816090205", play="com.aberk.nubi", search="nubi sanal evcil hayvan tamagotchi pet virtual"),
  dict(slug="konfeti", name="Konfeti", sub="Party TV", icon="/konfeti/assets/icon-512.png", status="new", released="2026-10-14",
       tags="fun tv", plat="web", soon_plat="tvos androidtv tizen webos", color="#ffd731",
       tr="Ev partileri için TV oyunu. Oyunu kumandayla seçiyorsun, misafirler TV'deki QR'ı okutup telefonla oy veriyor; fotoğraflar, puanlar ve gecenin özeti büyük ekranda. Bugün tarayıcıda açılıyor. Samsung ve LG mağazalarında inceleme sürüyor, Google TV ve Apple TV sürümleri yolda.",
       en="A party game for your TV. You pick a game with the remote, guests scan the QR on screen and vote from their phones; photos, scores and the night's recap show up on the big screen. It runs in the browser today. Samsung and LG are in review, Google TV and Apple TV are on the way.",
       # TV mağazalarında henüz yayında değil: play_pending yalnız kayıt, link çizilmez. Yayına girince play=/ios= yap, soon_plat'tan çıkar.
       tour="/konfeti/", site="https://konfeti.bamstudio.dev/", web="https://konfeti.bamstudio.dev/", play_pending="dev.bamstudio.konfeti", search="konfeti parti party tv apple tv android tv google tv samsung lg tizen webos oyun game bu mu o mu yasak kelime doğruluk cesaret"),
  dict(slug="o-mu-bu-mu", name="O mu Bu mu?", sub="This or That", icon="/assets/home/omubumu-icon.webp", status="live",
       tags="fun", plat="ios android watchos wearos", color="#5c4ade",
       tr="İmkansız tercihler ve turnuvalar. Arkadaşlarınla sesli oynanır, tartışma garantili.",
       en="Impossible choices and tournaments, Turkish edition. Played out loud with friends, arguments guaranteed.",
       tour="/o-mu-bu-mu/", ios="6740251305", ios_cc="tr", play="com.berkalparslan.thisOne", search="o mu bu mu would you rather tercih oyunu turnuva"),
  dict(slug="tasbih-tally", name="Tasbih Tally", sub="Digital Counter", icon="/tasbih-tally/assets/icon.webp", status="live",
       tags="tools", plat="ios android watchos wearos", color="#55db9c",
       tr="Zikir, namaz vakitleri ve kıble. Apple Watch ve Wear OS'ta titreşimle sayar, sayıyı kaybetmezsin.",
       en="Dhikr counter, prayer times and qibla. On Apple Watch and Wear OS it counts with haptics, so you never lose count.",
       tour="/tasbih-tally/", ios="6756802776", play="com.aberk.tasbihTally", search="tasbih tally zikir tesbih zikirmatik namaz vakti kıble dhikr counter"),
  dict(slug="leafbook", name="Leafbook", sub="Plant Tracker", icon="/assets/home/leafbook-icon.webp", status="new", released="2026-09-29",
       tags="lifestyle", plat="ios android", color="#55db9c",
       tr="Ev bitkileri için fotoğraf günlüğü. Fotoğraftan tanı, mevsime göre sulama takvimi al, hayalet kamerayla aynı açıdan çek. 1.2 ile topluluk geldi: başkalarının bitkilerine bak, kahverengi uçlar ne demek diye sor.",
       en="A photo diary for houseplants. Identify from a photo, get a watering schedule that knows the season, shoot from the same angle with the ghost camera. 1.2 adds a community: look at other people's plants and ask what those brown tips mean.",
       tour="/leafbook/", ios="6811846217", play="com.aberk.leafbook", search="leafbook bitki tanıma bitki bakımı sulama hatırlatıcı hayalet kamera topluluk plant id care"),
  dict(slug="bosyeryok", name="No Spaces", sub="Parking Tycoon", icon="/bosyeryok/assets/icon-512.png", status="new", released="2026-10-15",
       tags="fun", plat="ios android", color="#ffd731",
       tr="Otopark işletme oyunu (Türkçe adı Boş Yer Yok). Direksiyon çevirmiyorsun, işletiyorsun: tarifeyi sen koyuyorsun, ekibi sen kuruyorsun, maaşlar her saniye kasadan düşüyor. Artık iPhone'da da var.",
       en="A parking lot tycoon. You don't steer, you run the place: you set the tariff, hire the crew, and wages come out of the till every second. Now on iPhone too.",
       tour="/bosyeryok/", ios="6806977094", play="com.aberk.bosyeryok", search="boş yer yok no spaces otopark parking tycoon oyun game"),
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
       tags="sport soon", plat="", soon_plat="ios android", color="#c8f560",
       tr="Haftalık halısaha düzeni: maçı kur, davet et, kadroyu yaz, skoru gir. Maçtan sonra herkes birbirini anonim puanlar.",
       en="The weekly five-a-side, organised: set up the match, invite, pick the lineup, log the score. Afterwards everyone rates each other anonymously.",
       tour="/matchday/", tour_tr="Beta'ya katıl", tour_en="Join the beta", search="matchday halısaha futbol five a side maç kadro"),
  dict(slug="pickleball", name="Pickleball", sub="Score Keeper", icon="/pickleball/assets/icon.webp", status="live",
       tags="sport", plat="ios watchos", color="#4da2ff",
       tr="Servis, side-out ve ralli puanlaması sende değil. Sayı tartışmak yerine bileğine bak. 2.0'da arkadaşlarını takip edip lig kurabilirsin.",
       en="Server, side-out and rally scoring handled for you. Glance at your wrist instead of arguing about the score. In 2.0 you can follow friends and run a league.",
       tour="/pickleball/", ios="6760598754", search="lig league sosyal social pickleball score keeper apple watch skor saati"),
  dict(slug="orbix-roulette", name="Orbix", sub="Roulette", icon="/orbix-roulette/assets/icon.webp", status="live",
       tags="fun", plat="watchos wearos", color="#5c4ade",
       tr="Bileğinde güzel bir karar çarkı. Kim ödeyecek, kim başlayacak, nereye gidilecek: çevir, tartışma bitsin.",
       en="A beautiful decision wheel. Who pays, who goes first, where to eat: spin it and stop arguing.",
       tour="/orbix-roulette/", ios="6756230899", play="com.aberk.orbixroulette", search="orbix roulette çark wheel spin karar"),
  dict(slug="volleyball", name="Volleyball", sub="Score Keeper", icon="/volleyball/assets/icon.webp", status="live",
       tags="sport", plat="ios watchos", color="#ffd731",
       tr="Canlı set skoru, maç defteri ve antrenmandan gelen nabız istatistikleri. 2.0 ile ligler, akış ve takımla paylaşılan maç sonuçları geldi.",
       en="Live set scoring with a match logbook and heart rate stats pulled from your workout. 2.0 brings leagues, a feed and results you share with the other side.",
       tour="/volleyball/", ios="6760615315", search="lig league sosyal social volleyball voleybol score skor"),
  dict(slug="rally-badminton", name="Rally: Badminton", sub="Score Keeper", icon="/rally-badminton/assets/icon.webp", status="live",
       tags="sport", plat="ios watchos", color="#e9ccff",
       tr="Ralli puanlaması, servis alanı ve taraf değişimi otomatik; 21 sayı ve iki fark kuralı dahil. 2.0'da takip, lig ve iki telefonla aynı maç var.",
       en="Rally scoring, service court and side changes handled for you, with 21-point games and the two-point rule built in. 2.0 adds follows, leagues and two phones on one match.",
       tour="/rally-badminton/", ios="6802337158", search="lig league sosyal social rally badminton skor score"),
  dict(slug="rally-table-tennis", name="Rally: Table Tennis", sub="Score Keeper", icon="/rally-table-tennis/assets/icon.webp", status="live",
       tags="sport", plat="ios watchos", color="#fb4903",
       tr="On bire kadar, iki sayıda bir servis değişimi, uzayan deuce. Yüksek sesle saymayı bırak. 2.0'da maç sonucunu rakibine gönderiyorsun, o onaylayınca onun defterine de düşüyor.",
       en="Eleven up, serve swaps every two points, deuce that keeps going. Stop counting out loud. In 2.0 you send the result to your opponent and it lands in their logbook once they confirm.",
       tour="/rally-table-tennis/", ios="6802339775", search="lig league sosyal social rally table tennis masa tenisi ping pong skor"),
  dict(slug="bumpline", name="Bumpline", sub="Pregnancy Tracker", icon="/bumpline/assets/icon.webp", status="soon",
       tags="health soon", plat="", soon_plat="ios", color="#ffb3d9",
       tr="Kırk hafta, tek bir tarihten. Hangi haftadasın, bebek ne kadar büyüdü, doğuma kaç gün kaldı; widget, günlük ve paylaşılabilir kartla.",
       en="Forty weeks from a single date. Which week you are in, how big the baby is, how many days are left; with a widget, a journal and a shareable card.",
       tour="/bumpline/", search="bumpline kırk hafta hamilelik gebelik pregnancy"),
  dict(slug="store-mockup", name="Framegrove", sub="Creative Assets", icon="/assets/home/icons/store-mockup.svg", status="web",
       tags="tools web", plat="web", color="#e9ccff",
       tr="Uygulamanın yeni vitrini: App Store Creative Assets, iPhone Duo ve mağaza ekran görüntüleri. 56 özenli şablon, katmanlı editör ve MCP/skill otomasyonu. Ücretsiz ve açık kaynak.",
       en="Your app's new showcase: App Store Creative Assets, iPhone Duo and store screenshots. 56 curated templates, a layer editor and MCP/skill automation. Free and open source.",
       tour="", site="https://framegrove.bamstudio.dev/", web="https://framegrove.bamstudio.dev/", search="framegrove iphone duo creative assets screenshot ekran görüntüsü web"),
  dict(slug="mihenk", name="Mihenk", sub="App Estimator", icon="/assets/home/icons/mihenk.svg", status="web",
       tags="tools web", plat="web", color="#ffd731",
       tr="Herhangi bir uygulamanın kaç kez indirildiğini ve ne kazandığını App Store ve Google Play verisinden tahmin eder. Rakibine bak, pazarı ölç.",
       en="Estimates how many times any app was downloaded and what it earns, from App Store and Google Play data. Size up a rival, measure a market.",
       tour="", site="https://mihenk.bamstudio.dev/", web="https://mihenk.bamstudio.dev/", search="mihenk indirme gelir tahmin downloads revenue estimate web"),
]

PLAT = {"ios": "iOS", "android": "Android", "watchos": "watchOS", "wearos": "Wear OS", "web": "Web",
        "tvos": "Apple TV", "androidtv": "Android TV", "tizen": "Samsung TV", "webos": "LG TV"}
TV = {"tvos", "androidtv", "tizen", "webos"}


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
        if kind == "tv":
            return f'<span class="m-tv {cls}"><span class="scr">{img}</span><span class="stand"></span></span>'
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
    # ios_cc: yalnız bir ülkede satışta olan uygulama (ör. O mu Bu mu yalnız TR); ülkesiz bağlantı ABD'de 404 veriyor.
    ios = (AS.replace("/app/", f"/{a['ios_cc']}/app/") if a.get("ios_cc") else AS) + a["ios"] if a.get("ios") else ""
    play = (GP + a["play"]) if a.get("play") else ""
    web = a.get("web") or ("https://bamstudio.dev" + a["tour"] if a["plat"] == "web" else "")
    soon = a.get("soon_plat", "").split()
    tv = " tv" if TV & set(a["plat"].split() + soon) and " tv" not in " " + a["tags"] else ""
    attrs = (f'id="app-{a["slug"]}" data-slug="{a["slug"]}" data-tags="{a["tags"]}{tv} {" ".join(a["plat"].split() + soon)}" data-color="{a["color"]}" '
             f'data-icon="{a["icon"] or ""}" data-ios="{e(ios)}" data-play="{e(play)}" data-web="{e(web)}" data-tour="{e(a.get("tour", ""))}" '
             f'data-title="{e(a["name"])}" data-name="{e(a["name"] + " " + a["sub"] + " " + a["search"])}"')
    if a.get("released"): attrs += f' data-released="{a["released"]}"'
    mark = ""
    if st == "new": mark = f'<span class="badge b-new">{bi("yeni", "new")}</span>'
    elif st == "soon": mark = f'<span class="badge b-soon">{bi("yolda", "soon")}</span>'
    elif st == "web": mark = f'<span class="badge b-web">{bi("web uygulaması", "web app")}</span>'
    chips = "".join(f'<span class="chip">{PLAT[p]}</span>' for p in a["plat"].split())
    chips += "".join(f'<span class="chip soon">{PLAT[p]} · {bi("yakında", "soon")}</span>' for p in soon)
    links = []
    if ios: links.append(f'<a class="pill dark" href="{ios}" target="_blank" rel="noopener" data-umami-event="app-store" data-umami-event-app="{a["slug"]}">App Store ↗</a>')
    if play: links.append(f'<a class="pill dark" href="{play}" target="_blank" rel="noopener" data-umami-event="google-play" data-umami-event-app="{a["slug"]}">Google Play ↗</a>')
    if a.get("site"): links.append(f'<a class="pill dark" href="{e(a["site"])}" target="_blank" rel="noopener" data-umami-event="site" data-umami-event-app="{a["slug"]}">Site ↗</a>')
    if web and a.get("tour_web_tr"): links.append(f'<a class="pill dark" href="{e(web)}" target="_blank" rel="noopener" data-umami-event="web-ac" data-umami-event-app="{a["slug"]}">{bi(a.get("tour_web_tr", "Tarayıcıda aç"), a.get("tour_web_en", "Open in browser"))} ↗</a>')
    if a.get("tour"):
        links.append(f'<a class="pill" href="{a["tour"]}" target="_blank" rel="noopener" data-umami-event="tanitim" data-umami-event-app="{a["slug"]}">{bi(a.get("tour_tr", "Tanıtım"), a.get("tour_en", "Tour"))} →</a>')
    links.append(f'<button class="pill ghost show" type="button" data-umami-event="vitrinde-gor" data-umami-event-app="{a["slug"]}">{bi("Vitrinde gör ↑", "On the shelf ↑")}</button>')
    side = "l" if i % 2 else "r"
    return f'''        <article class="zrow z-{side}" {attrs} style="--c:{a["color"]}">
          <div class="zpanel">
            <a class="zhit" href="{a.get("tour") or a.get("site") or "#vitrin"}" target="_blank" rel="noopener" data-umami-event="panel-tanitim" data-umami-event-app="{a["slug"]}" aria-label="{e(a["name"])}">{device_html(a)}</a>
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
# Geri bildirim sayfasındaki uygulama seçimi de bu listeden. data-alias: tanıtım
# klasör adı (ör. kit → kit-qr), ?app= ile ikisi de çalışsın.
def fb_option(a):
    alias = (a.get("tour") or "").strip("/")
    alias = alias if alias and "/" not in alias else a["slug"]
    return (f'            <option value="{a["slug"]}" data-alias="{e(alias)}" data-icon="{e(a["icon"] or "")}" '
            f'data-color="{a["color"]}">{e(a["name"])}</option>')
fb = ROOT / "geri-bildirim/index.html"
fsrc = fb.read_text()
fnew, n = re.subn(r"(<!-- uygulamalar:başla -->\n).*?(\s*<!-- uygulamalar:bitti -->)",
                  lambda m: m.group(1) + "\n".join(fb_option(a) for a in APPS) + m.group(2), fsrc, flags=re.S)
assert n == 1, "geri bildirim işaretleri bulunamadı"
fb.write_text(fnew)
# Arka uç (api/worker.js) mailde uygulama kartlarını bu listeden çizer.
(ROOT / "api/apps.json").write_text(json.dumps([
    {k: a.get(k) for k in ("slug", "name", "sub", "icon", "color", "ios", "play", "tour", "status")} | {"tr": a["tr"], "en": a["en"]}
    for a in APPS], ensure_ascii=False, indent=1))
print("satır:", len(APPS))

# llms.txt da bu listeden (yapay zeka arama motorları için düz özet).
def llm_row(a):
    url = a["site"] if not a["tour"] else a["tour"] if a["tour"].startswith("http") else "https://bamstudio.dev" + a["tour"]
    plats = [PLAT[p] for p in a["plat"].split()] + [PLAT[p] + " (soon)" for p in a.get("soon_plat", "").split()]
    stores = []
    if a.get("ios"): stores.append((AS.replace("/app/", f"/{a['ios_cc']}/app/") if a.get("ios_cc") else AS) + a["ios"])
    if a.get("play"): stores.append(GP + a["play"])
    if a.get("web") and a["plat"] != "web": stores.append(a["web"])
    tail = (" Stores: " + ", ".join(stores) + ".") if stores else ""
    if a.get("site") and a["tour"] and a["site"] not in stores: tail += f" Website: {a['site']}."
    return f'- [{a["name"]}: {a["sub"]}]({url}): {a["en"]} Platforms: {", ".join(plats)}.{tail}'
live_n = sum(1 for a in APPS if a.get("ios") or a.get("play"))
(ROOT / "llms.txt").write_text(f"""# Bam Studio

> Bam Studio is a small independent app studio making apps for iPhone, iPad, Apple Watch, Android, Wear OS, TV (Apple TV, Google TV, Samsung, LG) and the web. {live_n} apps are live on the App Store and Google Play. Website: https://bamstudio.dev · Contact: merhaba@bamstudio.dev

Each app has a tour page, a privacy policy and store links. Apps never sell user data. Bam Studio also builds apps for clients (design, development, store listing and release): https://bamstudio.dev/#birlikte

## Apps
{chr(10).join(llm_row(a) for a in APPS)}

## Pages
- [Home](https://bamstudio.dev/): showcase of all apps
- [Work with us](https://bamstudio.dev/#birlikte): app development for iPhone, Android, Apple Watch, Wear OS, TV and web
- [Support](https://bamstudio.dev/support/): help and contact
- [Feedback](https://bamstudio.dev/geri-bildirim/): send a bug report, an idea or thanks for any app (preselect with ?app=<slug>)
- [Privacy policies](https://bamstudio.dev/privacy/): per-app privacy policies
- [Website privacy](https://bamstudio.dev/privacy/site/)
- [Terms of use](https://bamstudio.dev/terms/)
- [Blog](https://bamstudio.dev/blog/): notes on building and shipping apps
""")
