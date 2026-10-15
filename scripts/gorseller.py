#!/usr/bin/env python3
"""Mağaza görsellerini siteye webp olarak alır.

Her satır: (ad, kaynak klasör, hedef klasör, genişlik, en fazla kaç dosya[, yalnız bu adlar sırayla]).
Kaynak klasörde {L} varsa TR ve EN için ayrı ayrı çalışır ({L} yerine TR/EN ya da tr/en).
Hedef her zaman küçük harfli dil klasörüdür: <hedef>/tr/01-ad.webp.

    python3 scripts/gorseller.py          # hepsi
    python3 scripts/gorseller.py leafbook # yalnız adında "leafbook" geçenler

Mağazaya yeni görsel yüklenince kaynak yolunu değiştir, betiği çalıştır, sonra
data/tanitim/<slug>.json'daki "promo" listesini ve assets/home/screens/manifest.json'u
güncelle (betik sonunda iki listeyi de yazdırır). PIL gerekiyor (pip install pillow).
"""
import pathlib, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = pathlib.Path.home() / "dev"

SP = D / "sports-preview-campaign/delivery"
SPORT_SHOTS = ["01-home", "02-live-scoring", "05-your-stats", "07-league-standings", "08-community"]
JOBS = [
    # Tanıtım sayfalarındaki kayan mağaza şeridi (pazarlama kompozitleri, 250 px gösterim, 2x)
    ("leafbook-promo", D / "leafbook/store/preview/2026-10-12-v1.2-realistic/iPhone/{L}", "leafbook/assets/promo/v12", 500, 8),
    ("walletcoach-promo", D / "wallet-coach-store-assets/v4-creative-duo/iPhone/{L}", "walletcoach/assets/promo/v4", 500, 10),
    ("tennis-padel-promo", SP / "1 Tennis Padel/preview/2026-10-08/iPhone/{L}", "tennis-padel/assets/promo/v2", 500, 6),
    ("pickleball-promo", SP / "2 Pickleball/preview/2026-10-08/iPhone/{L}", "pickleball/assets/promo/v2", 500, 6),
    ("volleyball-promo", SP / "3 Volleyball/preview/2026-10-08/iPhone/{L}", "volleyball/assets/promo/v2", 500, 6),
    ("rally-badminton-promo", SP / "4 Badminton/preview/2026-10-08/iPhone/{L}", "rally-badminton/assets/promo/v2", 500, 6),
    ("rally-table-tennis-promo", SP / "5 Table Tennis/preview/2026-10-08/iPhone/{L}", "rally-table-tennis/assets/promo/v2", 500, 6),
    ("o-mu-bu-mu-promo", D / "thisOneApp/store/preview/iPhone/{L}", "o-mu-bu-mu/assets/promo/v2", 500, 8),
    ("tasbih-tally-promo", D / "tasbih-preview-work/preview-1.3-2026-10-06/iPhone/{L}", "tasbih-tally/assets/promo/v13", 500, 10),
    ("nika-promo", D / "nika-store-campaign/preview/iPhone/{L}", "nika/assets/promo", 500, 10),
    ("era-promo", D / "output/era-store-2026-10-15/preview/iPhone/{L}", "era/assets/promo", 500, 10),
    ("daily-whisper-promo", D / "designs/daily-whisper-store-2026-10-06/iPhone/{L}", "daily-whisper/assets/promo", 500, 8),
    ("konfeti-promo", D / "konfeti/store/appletv/{l}", "konfeti/assets/promo", 1040, 8),
    # Ana sayfa vitrini ve tanıtım bölümleri (ham ekranlar, telefon çerçevesine girer)
    ("leafbook-screen", D / "leafbook/store/screenshots/raw-1.2 2/{L}", "assets/home/screens/leafbook/v12", 390, 6),
    ("nika-screen", D / "nika-store-campaign/raw/iPhone/{L}", "nika/assets/screens", 390, 13),
    ("era-screen", D / "iz/docs/screenshots/{l}", "era/assets/screens", 390, 9),
    ("walletcoach-screen", D / "wallet-coach/store/screenshots-store/{l}", "assets/home/screens/walletcoach/v24", 390, 7),
    # Daily Whisper 2.x Still: ham iPhone ekranları tanıtım sayfasında (daily-whisper/assets/v2/screens), vitrine beşi
    ("daily-whisper-screen", ROOT / "daily-whisper/assets/v2/screens/{l}", "assets/home/screens/daily-whisper/v2", 390, 5,
     ["01-today", "02-player", "06-affirmations", "07-vision-board", "04-zodiac"]),
    ("tennis-padel-screen", D / "All Sport Apps/Tennis Padel Score Keeper/screenshots/2.0/{l}", "assets/home/screens/tennis-padel/v2", 390, 9),
    # Diğer dört spor 2.0: vitrin için beş ham ekran (sosyal bölümü 07 ve 08'i de buradan kullanır)
    ("pickleball-screen", D / "All Sport Apps/Pickleball Score Keeper/screenshots/2.0/{l}", "assets/home/screens/pickleball/v2", 390, 5, SPORT_SHOTS),
    ("volleyball-screen", D / "All Sport Apps/Volleyball Score Keeper/screenshots/2.0/{l}", "assets/home/screens/volleyball/v2", 390, 5, SPORT_SHOTS),
    ("rally-badminton-screen", D / "All Sport Apps/Badminton Score Keeper/screenshots/2.0/{l}", "assets/home/screens/rally-badminton/v2", 390, 5, SPORT_SHOTS),
    ("rally-table-tennis-screen", D / "All Sport Apps/Table Tennis Score Keeper/screenshots/2.0/{l}", "assets/home/screens/rally-table-tennis/v2", 390, 5, SPORT_SHOTS),
]


def run(name, src, dst, width, limit, only=None):
    out = {}
    for lang in ("tr", "en"):
        s = pathlib.Path(str(src).replace("{L}", lang.upper()).replace("{l}", lang))
        if not s.is_dir():
            print("YOK:", s); continue
        files = sorted(p for p in s.iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"))
        if only:  # isteğe bağlı 6. alan: yalnız bu adlar, bu sırayla
            files = [p for o in only for p in files if p.stem == o]
        files = files[:limit]
        d = ROOT / dst / lang
        d.mkdir(parents=True, exist_ok=True)
        lst = []
        for p in files:
            im = Image.open(p).convert("RGB")
            if im.width > width:
                im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
            o = d / (p.stem.lower().replace(" ", "-") + ".webp")
            im.save(o, quality=80, method=6)
            lst.append("/" + str(o.relative_to(ROOT)))
        out[lang] = lst
        kb = sum((ROOT / x[1:]).stat().st_size for x in lst) // 1024
        print(f"{name} {lang}: {len(lst)} dosya, {kb} KB")
    return out


if __name__ == "__main__":
    want = sys.argv[1:]
    import json
    res = {}
    for name, src, dst, w, n, *only in JOBS:
        if want and not any(x in name for x in want): continue
        res[name] = run(name, src, dst, w, n, *only)
    (ROOT / "scripts/.gorseller-son.json").write_text(json.dumps(res, indent=1, ensure_ascii=False))
