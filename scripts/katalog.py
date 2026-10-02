#!/usr/bin/env python3
"""Ana sayfanın katalog kartlarını üretir. Uygulama ekle/durum değiştir: APPS listesini düzenle,
`python3 scripts/katalog.py` çalıştır; kartlar index.html içindeki katalog işaretlerinin arasına yazılır."""
import html, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

AS = "https://apps.apple.com/app/id"
GP = "https://play.google.com/store/apps/details?id="

# status: live | new | soon | web
APPS = [
  dict(code="BT-19", name="Nubi: Virtual Pet", icon="/assets/home/nubi-icon.webp", status="new", released="2026-10-01",
       tags="fun ios", plat="ios",
       tr="Gerçek zamanlı yaşayan bir sanal evcil hayvan. Sen işteyken acıkır, gece uykusu gelir, unutursan biraz sıkılır; her gün gözünün önünde büyür.",
       en="A virtual pet that lives in real time. Hungry while you work, sleepy at night, a little bored when you forget it, and growing up right in front of you.",
       ios="6816090205", privacy="/privacy/nubi/", search="nubi sanal evcil hayvan tamagotchi pet virtual"),
  dict(code="BT-18", name="Leafbook: Plant Tracker", icon="/assets/home/leafbook-icon.webp", status="new", released="2026-09-29",
       tags="lifestyle ios", plat="ios",
       tr="Ev bitkileri için fotoğraf günlüğü. Fotoğraftan tanı, sulama takvimi al; hayalet kamerayla aynı açıdan çek, ne kadar büyüdüğünü ölç.",
       en="A photo diary for houseplants. Identify from a photo, get a watering schedule, shoot from the same angle with the ghost camera and measure the growth.",
       why_tr="Bitkilerimin ne zaman sulanacağını bilmiyordum.", why_en="I never knew when my plants needed water.",
       tour="/leafbook/", ios="6811846217", search="leafbook bitki takip sulama hayalet kamera plant"),
  dict(code="BT-17", name="Daily Whisper", icon="/assets/home/daily-whisper-icon.webp", status="new", released="2026-10-02",
       tags="health watch ios", plat="ios watch",
       tr="Her sabah sana özel yazılmış kısa bir hikaye: hayalini kurduğun hayattan bir sahne, senin adınla, sıcak bir sesle okunur.",
       en="Every morning a short story written just for you: a scene from the life you are working towards, with your name in it, read aloud in a warm voice.",
       tour="/daily-whisper/", ios="6757824195", search="daily whisper affirmations olumlama manifest hikaye"),
  dict(code="BT-16", name="Kit: QR Scanner & Wallet", icon="/assets/home/kit-icon.webp", status="new", released="2026-10-01",
       tags="tools watch ios", plat="ios watch",
       tr="Her kodu okur, sadakat kartlarını ve biletleri tek cüzdanda tutar, güzel görünen QR kodlar üretir. Linki açmadan önce de kontrol eder. Reklam yok, hesap yok.",
       en="Reads every code, keeps loyalty cards and tickets in one wallet and makes QR codes that look good. Checks a link before you open it. No ads, no account.",
       tour="/kit-qr/", ios="6446224550", search="kit qr scanner wallet barcode kod cüzdan kart bilet"),
  dict(code="BT-15", name="Matchday: Five a side", icon="/matchday/assets/icon-512.png", status="soon",
       tags="sport ios android soon", plat="ios android",
       tr="Haftalık halısaha düzeni: maçı kur, davet et, kadroyu yaz, skoru gir. Maçtan sonra herkes birbirini anonim puanlar.",
       en="The weekly five-a-side, organised: set up the match, invite, pick the lineup, log the score. Afterwards everyone rates each other anonymously.",
       tour="/matchday/", tour_tr="Beta'ya katıl", tour_en="Join the beta", search="matchday halısaha futbol five a side maç kadro"),
  dict(code="BT-14", name="Yonca: Çekiliş", icon="/assets/home/yonca-icon.webp", status="live",
       tags="tools ios", plat="ios",
       tr="Kendi çekilişini yap ya da katıldıklarını takip et. İsimleri yapıştır, kazananı çek, kartı paylaş; sonuç günü de hatırlatır.",
       en="Run your own giveaway or track the ones you entered. Paste the names, draw the winners, share the card; it reminds you on result day too.",
       why_tr="Kazandığım çekilişi kuzenim görmese yalan olacaktı.", why_en="My cousin spotted my name on a winners list by chance.",
       tour="/yonca/", ios="6802312123", search="yonca çekiliş takip giveaway kampanya draw"),
  dict(code="BT-13", name="Wallet Coach", icon="/walletcoach/assets/icon-512.png", status="live",
       tags="tools ios android finance", plat="ios android",
       tr="Ev ekonomisini Excel'deki ay sekmeleri gibi tutar: ayı bir kez yaz, ödedikçe işaretle, yeni ay öncekini kopyalasın.",
       en="Household books kept like a spreadsheet with a tab per month: write the month once, tick things off as they are paid, let the next month copy itself.",
       why_tr="Beş yıl Excel'de tuttum, bulamayınca yaptım.", why_en="Five years in a spreadsheet; built it when nothing fit.",
       tour="/walletcoach/", ios="6798041415", play="com.aberk.walletcoach", search="wallet coach bütçe ev ekonomisi budget para"),
  dict(code="BT-12", name="BodyBook", icon="/assets/home/bodybook-icon.webp", status="live",
       tags="health android", plat="android",
       tr="Tansiyon, kilo, cilt bakım rutini, ben fotoğrafları, ilaç, su ve uyku tek panelde. Hepsi telefonunda kalır.",
       en="Blood pressure, weight, skincare routine, mole photos, medication, water and sleep in one panel. Everything stays on your phone.",
       why_tr="Altı ayda bir ben merkezine gitmek saçma geldi.", why_en="Visiting a mole clinic every six months felt absurd.",
       tour="/bodybook/", play="com.aberk.bodybook", search="bodybook sağlık tansiyon cilt ben health"),
  dict(code="BT-11", name="Boş Yer Yok", icon="/bosyeryok/assets/icon-512.png", status="live",
       tags="fun android", plat="android",
       tr="Otopark işletme oyunu. Direksiyon çevirmiyorsun, işletiyorsun: tarifeyi sen koyuyorsun, ekibi sen kuruyorsun, maaşlar her saniye kasadan düşüyor.",
       en="A parking lot tycoon. You don't steer, you run the place: you set the tariff, hire the crew, and wages come out of the till every second.",
       why_tr="Tycoon oyunlarını sevdim, eksiklerini de gördüm.", why_en="Loved tycoon games, saw what they get wrong.",
       tour="/bosyeryok/", play="com.aberk.bosyeryok", search="boş yer yok no spaces otopark parking tycoon oyun game"),
  dict(code="BT-10", name="O mu Bu mu?", icon="/assets/home/omubumu-icon.webp", status="live",
       tags="fun watch ios android", plat="ios android watch",
       tr="İmkansız tercihler oyunu. Arkadaşlarınla sesli oynanır, tartışma garantili.",
       en="Would-you-rather, Turkish edition. Impossible choices, played out loud with friends.",
       why_tr="Arkadaşlarla kendi aramızda oynadığımız oyun.", why_en="A game we played among friends.",
       tour="/o-mu-bu-mu/", ios="6740251305", play="com.berkalparslan.thisOne", search="o mu bu mu would you rather tercih oyunu"),
  dict(code="BT-09", name="Tasbih Tally", icon="/tasbih-tally/assets/icon.webp", status="live",
       tags="tools watch ios", plat="ios watch",
       tr="Zikir, namaz vakitleri ve kıble. Saatte titreşimle sayar, sayıyı kaybetmezsin.",
       en="Dhikr counter, prayer times and qibla. Counts with haptics on the Watch so you never lose count.",
       tour="/tasbih-tally/", ios="6756802776", search="tasbih tally zikir tesbih namaz kıble counter"),
  dict(code="BT-08", name="Tennis & Padel Score Keeper", icon="/tennis-padel/assets/icon.webp", status="live",
       tags="sport watch ios android", plat="ios android watch",
       tr="Sayıya dokun, kurallar kendi işlesin: tiebreak, altın sayı, set. Saatte tek başına çalışır.",
       en="Tap to score and the rules take care of themselves: tiebreaks, golden points, sets. Runs standalone on the Watch.",
       why_tr="Kortta skoru tutamıyordum.", why_en="I kept losing the score on court.",
       tour="/tennis-padel/", ios="6756925523", play="com.aberk.wear", search="tennis padel tenis skor score"),
  dict(code="BT-07", name="Score Keeper for Pickleball", icon="/pickleball/assets/icon.webp", status="live",
       tags="sport watch ios", plat="ios watch",
       tr="Servis, side-out ve ralli puanlaması sende değil. Sayı tartışmak yerine bileğine bak.",
       en="Server, side-out and rally scoring handled for you. Glance at your wrist instead of arguing about the score.",
       tour="/pickleball/", ios="6760598754", search="pickleball score skor"),
  dict(code="BT-06", name="Score Keeper for Volleyball", icon="/volleyball/assets/icon.webp", status="live",
       tags="sport watch ios", plat="ios watch",
       tr="Canlı set skoru, maç defteri ve antrenmandan gelen nabız istatistikleri.",
       en="Live set scoring with a match logbook and heart rate stats pulled from your workout.",
       tour="/volleyball/", ios="6760615315", search="volleyball voleybol score skor"),
  dict(code="BT-05", name="Rally: Badminton", icon="/rally-badminton/assets/icon.webp", status="live",
       tags="sport watch ios", plat="ios watch",
       tr="Ralli puanlaması, servis alanı ve taraf değişimi otomatik; 21 sayı ve iki fark kuralı dahil.",
       en="Rally scoring, service court and side changes handled for you, with 21-point games and the two-point rule built in.",
       tour="/rally-badminton/", ios="6802337158", search="rally badminton skor score"),
  dict(code="BT-04", name="Rally: Table Tennis", icon="/rally-table-tennis/assets/icon.webp", status="live",
       tags="sport watch ios", plat="ios watch",
       tr="On bire kadar, iki sayıda bir servis değişimi, uzayan deuce. Yüksek sesle saymayı bırak.",
       en="Eleven up, serve swaps every two points, deuce that keeps going. Stop counting out loud.",
       tour="/rally-table-tennis/", ios="6802339775", search="rally table tennis masa tenisi ping pong skor"),
  dict(code="BT-03", name="Orbix Roulette", icon="/orbix-roulette/assets/icon.webp", status="live",
       tags="fun watch ios android", plat="ios android watch",
       tr="Güzel bir karar çarkı. Kim ödeyecek, kim başlayacak, nereye gidilecek: çevir, tartışma bitsin.",
       en="A beautiful decision wheel. Who pays, who goes first, where to eat: spin it and stop arguing.",
       tour="/orbix-roulette/", ios="6756230899", play="com.aberk.orbixroulette", search="orbix roulette çark wheel spin karar"),
  dict(code="BT-02", name="Bumpline: Pregnancy Tracker", icon="/bumpline/assets/icon.webp", status="soon",
       tags="health ios soon", plat="ios",
       tr="Kırk hafta, tek bir tarihten. Hangi haftadasın, bebek ne kadar büyüdü, doğuma kaç gün kaldı; widget, günlük ve paylaşılabilir kartla.",
       en="Forty weeks from a single date. Which week you are in, how big the baby is, how many days are left; with a widget, a journal and a shareable card.",
       why_tr="Hamile bir arkadaşım için.", why_en="For a friend who was expecting.",
       tour="/bumpline/", search="bumpline kırk hafta hamilelik gebelik pregnancy"),
  dict(code="BT-01", name="Store Mockup Studio", icon=None, status="web",
       tags="tools web", plat="web",
       tr="Ham ekran görüntülerini at, App Store ve Play görselini al: cihaz çerçevesi, arka plan, başlık, tam mağaza ölçülerinde. Tarayıcıda çalışır.",
       en="Drop in raw screenshots, get App Store and Play artwork: device frames, backgrounds, headlines, at the exact store sizes. Runs in the browser.",
       tour="/web/store-mockup/", tour_tr="Aracı aç", tour_en="Open the tool", search="store mockup studio screenshot ekran görüntüsü web"),
]

def e(s): return html.escape(s, quote=True)
def bi(tr, en): return f'<span class="tr">{e(tr)}</span><span class="en">{e(en)}</span>'

PLAT = {"ios": "iOS", "android": "Android", "watch": "Watch", "web": "Web"}

def card(a):
    st = a["status"]
    attrs = f'data-tags="{a["tags"]}" data-name="{e(a["name"] + " " + a["search"])}"'
    if a.get("released"): attrs += f' data-released="{a["released"]}"'
    if a["icon"]:
        art = f'<img class="icon" loading="lazy" alt="" src="{a["icon"]}" width="512" height="512" />'
    else:
        art = ('<span class="icon icon-glyph" aria-hidden="true"><svg viewBox="0 0 48 48"><rect x="14" y="6" width="20" height="36" rx="4"/>'
               '<rect x="4" y="12" width="14" height="26" rx="3"/><rect x="30" y="12" width="14" height="26" rx="3"/></svg></span>')
    mark = ""
    if st == "new": mark = f'<span class="mark mark-new">{bi("yeni", "new")}</span>'
    elif st == "soon": mark = f'<span class="mark mark-soon">{bi("yolda", "soon")}</span>'
    plats = " · ".join(PLAT[p] for p in a["plat"].split())
    links = []
    if a.get("tour"):
        links.append(f'<a href="{a["tour"]}">{bi(a.get("tour_tr", "Tanıtım"), a.get("tour_en", "Tour"))} →</a>')
    if a.get("ios"):
        links.append(f'<a href="{AS}{a["ios"]}" target="_blank" rel="noopener">App Store ↗</a>')
    if a.get("play"):
        links.append(f'<a href="{GP}{a["play"]}" target="_blank" rel="noopener">Google Play ↗</a>')
    if not a.get("tour") and a.get("privacy"):
        links.append(f'<a href="{a["privacy"]}">{bi("Gizlilik", "Privacy")}</a>')
    why = ""
    if a.get("why_tr"):
        why = f'<a class="why" href="/neden/">“{bi(a["why_tr"], a["why_en"])}”</a>'
    primary = a.get("tour") or (f'{AS}{a["ios"]}' if a.get("ios") else "#")
    ext = "" if primary.startswith("/") else ' target="_blank" rel="noopener"'
    return f'''      <article class="item" {attrs}>
        <a class="tile" href="{primary}"{ext} aria-label="{e(a["name"])}">
          <span class="code">{a["code"]}</span>{mark}
          {art}
          <span class="plat">{plats}</span>
        </a>
        <div class="meta">
          <h3 class="name">{e(a["name"])}</h3>
          <p class="desc">{bi(a["tr"], a["en"])}</p>
          {why}
          <p class="links">{"".join(links)}</p>
        </div>
      </article>'''

cards = "\n".join(card(a) for a in APPS)
idx = ROOT / "index.html"
src = idx.read_text()
src = re.sub(r"(<!-- katalog:başla -->\n).*?(\s*<!-- katalog:bitti -->)", lambda m: m.group(1) + cards + m.group(2), src, flags=re.S)
idx.write_text(src)
print("kart:", len(APPS))
