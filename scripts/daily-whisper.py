#!/usr/bin/env python3
"""Daily Whisper tanıtım sayfası (Still tasarımı, 6 dil).

Yalnız tasarım paketinin renkleri ve Poppins kullanılır:
krem #F3EDE5, mürekkep #352B2D, soluk #78696C, bordo #80505C, gül #C89DA5,
çizgi #DED0C9, yumuşak #EBE0D9. Kaynak: designs/daily-whisper-still-handoff-v2.

    python3 scripts/daily-whisper.py

Çıktı: daily-whisper/index.html (en) + daily-whisper/<dil>/index.html.
Her dilin kendi adresi var; sosyal medyada paylaşılan link o dilin önizlemesini gösterir.
Metinlerde uzun tire yok (tire yasağı).
"""
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://bamstudio.dev"
BASE = "/daily-whisper/"
A = BASE + "assets/v2/"
IOS = "https://apps.apple.com/app/id6757824195"
LANGS = ["en", "tr", "es", "de", "fr", "it"]
NAMES = {"en": "English", "tr": "Türkçe", "es": "Español", "de": "Deutsch", "fr": "Français", "it": "Italiano"}
SHOTS = {"en": "en", "tr": "tr"}  # diğer dillerde İngilizce ekranlar
OG = {"tr": "tr"}
LOCALE = {"en": "en_US", "tr": "tr_TR", "es": "es_ES", "de": "de_DE", "fr": "fr_FR", "it": "it_IT"}

T = {}

T["en"] = dict(
    title="Daily Whisper: Hear your dream",
    desc="Every morning, a short story written for you: a scene from the life you want, with your name in it, read aloud in a warm voice.",
    nav_how="How it works", nav_features="Features", nav_faq="FAQ", get="Get the app",
    kicker="Manifest stories, made for you",
    h1="Hear your dream.",
    lede="Every morning, a short story written just for you: a scene from the life you want, with your name, your people and your city in it, read aloud in a warm voice.",
    store_small="Download on the", android="Android coming soon",
    hero_note="iPhone · iPad · Apple Watch · Widgets",
    how_kicker="How it works", how_h="Three quiet minutes a day",
    steps=[
        ("Tell it your dream", "A short, gentle chat: your name, the people you love, what you want to change and the life you imagine."),
        ("A new story every morning", "Each day a new scene from that life is written for you, told as if it has already happened. Never the same story twice."),
        ("Close your eyes and listen", "A warm voice reads it to you over rain, ocean or 432 Hz. Or read it at your own pace."),
    ],
    rows=[
        ("Today", "Your future self has a story for you", "Open the app and today's story is waiting. Your name is in it, and so are your people and your city.",
         ["A gentle notification when it is ready", "Listen or read, with a countdown to the next one", "Today's affirmation and horoscope on the same page"]),
        ("Listen", "Close your eyes. Hear your dream.", "The story is read aloud line by line, like a quiet film. Choose your narrator and set your atmosphere.",
         ["Rain, ocean, night, 432 Hz or 528 Hz under the voice", "Several narrator voices and speeds", "The full text whenever you want to read"]),
        ("New manifest", "Your dream. Your story.", "A job interview, a new home, a first date? Describe one moment and hear yourself living it.",
         ["Any goal, any moment", "Place, people and feeling to guide you", "Every story kept in your library, with favourites"]),
        ("Stars", "What do the stars say today?", "A daily reading from your Sun, Moon and Rising: love, money and career, plus what the sky is doing today.",
         ["Your chart from your birth details", "Moon phases and retrogrades, explained simply", "Small, practical advice for the day"]),
    ],
    quote="I am building a life that feels like mine.",
    more_kicker="And more", more_h="Everything that keeps your dream close",
    cards=[
        ("Words that feel like you", "Swipe through affirmations and keep the ones that speak to you."),
        ("Make room for your dream", "Your photos and words on a Vision Board. Save it as a wallpaper."),
        ("Notice the good", "A small gratitude journal for the little things, every day."),
        ("Always with you", "Affirmations and astrology on your widgets and Apple Watch."),
        ("Share what lifts you", "Turn an affirmation into a story or a post in one tap."),
        ("In your language", "Stories are written natively in 24 languages."),
    ],
    pro_kicker="Premium", pro_h="Start with two free stories",
    pro_p="Try Daily Whisper with two stories on us. Premium opens everything, and it starts with a 7 day free trial. Cancel anytime.",
    pro_list=["A new story every morning", "Unlimited manifests", "Every narrator voice", "432 Hz, 528 Hz and every soundscape", "Vision Board wallpaper", "Ready while you sleep"],
    faq_h="Questions",
    faq=[
        ("Is Daily Whisper free?", "You can try two stories for free. A story every morning and the full experience come with Premium, which starts with a 7 day free trial."),
        ("Which languages does it speak?", "The app is in English, Turkish, Spanish, German, French and Italian, and stories are written natively in 24 languages."),
        ("Do I need an account?", "No. You can start right away. An optional account keeps your stories safe across devices."),
        ("Is it on Android?", "Daily Whisper is on iPhone, iPad and Apple Watch today. The Android version is coming soon."),
        ("What happens to my answers?", "They are used only to write your stories. The privacy policy has all the details."),
    ],
    end_h="Return to your dream every day.", end_p="Download Daily Whisper and hear your first story today.",
    privacy="Privacy", terms="Terms", support="Support", made="Daily Whisper is made by Bam Studio.",
    lang_label="Language",
)

T["tr"] = dict(
    title="Daily Whisper: Hayalini dinle",
    desc="Her sabah sana özel kısa bir hikaye: istediğin hayattan bir sahne, içinde adın var, sıcak bir ses sana okur.",
    nav_how="Nasıl çalışır", nav_features="Özellikler", nav_faq="SSS", get="Uygulamayı indir",
    kicker="Sana özel manifest hikayeleri",
    h1="Hayalini dinle.",
    lede="Her sabah yalnızca senin için yazılmış kısa bir hikaye: istediğin hayattan bir sahne. İçinde adın, sevdiklerin ve şehrin var; sıcak bir ses onu sana okur.",
    store_small="Şimdi indir", android="Android yakında",
    hero_note="iPhone · iPad · Apple Watch · Widget",
    how_kicker="Nasıl çalışır", how_h="Günde üç sakin dakika",
    steps=[
        ("Hayalini anlat", "Kısa ve sıcak bir sohbet: adın, sevdiklerin, değiştirmek istediğin şey ve hayal ettiğin hayat."),
        ("Her sabah yeni bir hikaye", "Her gün o hayattan yeni bir sahne yazılır, sanki olmuş gibi anlatılır. Aynı hikaye iki kez gelmez."),
        ("Gözlerini kapat, dinle", "Sıcak bir ses onu yağmur, okyanus ya da 432 Hz eşliğinde okur. İstersen kendi hızında oku."),
    ],
    rows=[
        ("Bugün", "Gelecekteki senin sana bir hikayesi var", "Uygulamayı açtığında bugünün hikayesi seni bekliyor. İçinde adın, sevdiklerin ve şehrin var.",
         ["Hazır olunca nazik bir bildirim", "Dinle ya da oku, sıradaki hikayeye geri sayım", "Günün olumlaması ve burç yorumu aynı sayfada"]),
        ("Dinle", "Gözlerini kapat. Hayalini dinle.", "Hikaye satır satır, sakin bir film gibi okunur. Anlatıcını seç, ortamını kur.",
         ["Sesin altında yağmur, okyanus, gece, 432 Hz ya da 528 Hz", "Farklı anlatıcı sesleri ve hızlar", "Okumak istediğinde metnin tamamı"]),
        ("Yeni manifest", "Senin hayalin. Senin hikayen.", "Bir iş görüşmesi, yeni bir ev, ilk buluşma? Tek bir anı anlat, kendini o anı yaşarken dinle.",
         ["Her hedef, her an", "Yer, kişiler ve his ile yol gösterir", "Tüm hikayeler kütüphanende, favorilerinle"]),
        ("Yıldızlar", "Yıldızlar bugün ne diyor?", "Güneş, Ay ve Yükselen burcuna göre günlük yorum: aşk, para ve kariyer, bir de bugün gökyüzünde neler oluyor.",
         ["Doğum bilgilerinden doğum haritan", "Ay evreleri ve retrolar, sade bir dille", "Gün için küçük, uygulanabilir öneriler"]),
    ],
    quote="Bana ait hissettiren bir hayat kuruyorum.",
    more_kicker="Dahası", more_h="Hayalini yakında tutan her şey",
    cards=[
        ("Sana benzeyen sözler", "Olumlamaları kaydır, sana dokunanları sakla."),
        ("Hayaline yer aç", "Fotoğrafların ve sözlerin bir Vision Board'da. Duvar kağıdı olarak kaydet."),
        ("İyiyi fark et", "Küçük şeyler için her gün minik bir şükran günlüğü."),
        ("Hep yanında", "Olumlamalar ve burç yorumu widget'larında ve Apple Watch'ta."),
        ("Seni yükselteni paylaş", "Bir olumlamayı tek dokunuşla hikayeye ya da gönderiye çevir."),
        ("Kendi dilinde", "Hikayeler 24 dilde doğrudan o dilde yazılır."),
    ],
    pro_kicker="Premium", pro_h="İki ücretsiz hikayeyle başla",
    pro_p="Daily Whisper'ı iki hikaye bizden olacak şekilde dene. Premium her şeyi açar ve 7 günlük ücretsiz denemeyle başlar. İstediğin zaman iptal edebilirsin.",
    pro_list=["Her sabah yeni bir hikaye", "Sınırsız manifest", "Tüm anlatıcı sesleri", "432 Hz, 528 Hz ve tüm ortam sesleri", "Vision Board duvar kağıdı", "Sen uyurken hazırlanır"],
    faq_h="Sorular",
    faq=[
        ("Daily Whisper ücretsiz mi?", "İki hikayeyi ücretsiz deneyebilirsin. Her sabah hikaye ve tam deneyim Premium ile gelir; Premium 7 günlük ücretsiz denemeyle başlar."),
        ("Hangi dilleri konuşuyor?", "Uygulama Türkçe, İngilizce, İspanyolca, Almanca, Fransızca ve İtalyanca; hikayeler 24 dilde doğrudan o dilde yazılır."),
        ("Hesap açmam gerekiyor mu?", "Hayır, hemen başlayabilirsin. İstersen açacağın hesap hikayelerini cihazlar arasında korur."),
        ("Android'de var mı?", "Daily Whisper bugün iPhone, iPad ve Apple Watch'ta. Android sürümü yakında geliyor."),
        ("Cevaplarıma ne oluyor?", "Yalnızca hikayelerini yazmak için kullanılır. Ayrıntılar gizlilik politikasında."),
    ],
    end_h="Her gün hayaline dön.", end_p="Daily Whisper'ı indir, ilk hikayeni bugün dinle.",
    privacy="Gizlilik", terms="Kullanım şartları", support="Destek", made="Daily Whisper bir Bam Studio uygulamasıdır.",
    lang_label="Dil",
)

T["es"] = dict(
    title="Daily Whisper: Escucha tu sueño",
    desc="Cada mañana, una historia breve escrita para ti: una escena de la vida que quieres, con tu nombre, leída en voz alta por una voz cálida.",
    nav_how="Cómo funciona", nav_features="Funciones", nav_faq="Preguntas", get="Descargar",
    kicker="Historias de manifestación, hechas para ti",
    h1="Escucha tu sueño.",
    lede="Cada mañana, una historia breve escrita solo para ti: una escena de la vida que quieres, con tu nombre, tu gente y tu ciudad, leída por una voz cálida.",
    store_small="Disponible en", android="Android muy pronto",
    hero_note="iPhone · iPad · Apple Watch · Widgets",
    how_kicker="Cómo funciona", how_h="Tres minutos tranquilos al día",
    steps=[
        ("Cuéntale tu sueño", "Una charla breve y amable: tu nombre, las personas que quieres, lo que deseas cambiar y la vida que imaginas."),
        ("Una historia nueva cada mañana", "Cada día se escribe una nueva escena de esa vida, contada como si ya hubiera pasado. Nunca la misma historia dos veces."),
        ("Cierra los ojos y escucha", "Una voz cálida te la lee con lluvia, océano o 432 Hz. O léela a tu ritmo."),
    ],
    rows=[
        ("Hoy", "Tu yo del futuro tiene una historia para ti", "Abre la app y la historia de hoy te está esperando. Ahí está tu nombre, tu gente y tu ciudad.",
         ["Un aviso suave cuando está lista", "Escucha o lee, con cuenta atrás para la siguiente", "La afirmación y el horóscopo del día en la misma página"]),
        ("Escucha", "Cierra los ojos. Escucha tu sueño.", "La historia se lee línea a línea, como una película tranquila. Elige tu narrador y crea tu ambiente.",
         ["Lluvia, océano, noche, 432 Hz o 528 Hz bajo la voz", "Varias voces de narrador y velocidades", "El texto completo cuando quieras leer"]),
        ("Nuevo manifiesto", "Tu sueño. Tu historia.", "¿Una entrevista de trabajo, una casa nueva, una primera cita? Describe un momento y escúchate viviéndolo.",
         ["Cualquier meta, cualquier momento", "Lugar, personas y sensación para guiarte", "Todas tus historias en tu biblioteca, con favoritas"]),
        ("Estrellas", "¿Qué dicen hoy las estrellas?", "Una lectura diaria según tu Sol, Luna y Ascendente: amor, dinero y trabajo, y lo que hace hoy el cielo.",
         ["Tu carta natal a partir de tus datos de nacimiento", "Fases lunares y retrógrados, explicados con sencillez", "Consejos pequeños y prácticos para el día"]),
    ],
    quote="Estoy construyendo una vida que se siente mía.",
    more_kicker="Y más", more_h="Todo lo que mantiene cerca tu sueño",
    cards=[
        ("Palabras que se parecen a ti", "Desliza afirmaciones y guarda las que te hablan."),
        ("Haz sitio a tu sueño", "Tus fotos y palabras en un Vision Board. Guárdalo como fondo de pantalla."),
        ("Fíjate en lo bueno", "Un pequeño diario de gratitud para las cosas pequeñas, cada día."),
        ("Siempre contigo", "Afirmaciones y astrología en tus widgets y en el Apple Watch."),
        ("Comparte lo que te eleva", "Convierte una afirmación en una historia o publicación con un toque."),
        ("En tu idioma", "Las historias se escriben de forma nativa en 24 idiomas."),
    ],
    pro_kicker="Premium", pro_h="Empieza con dos historias gratis",
    pro_p="Prueba Daily Whisper con dos historias de regalo. Premium lo abre todo y empieza con 7 días de prueba gratis. Cancela cuando quieras.",
    pro_list=["Una historia nueva cada mañana", "Manifiestos ilimitados", "Todas las voces de narrador", "432 Hz, 528 Hz y todos los ambientes", "Vision Board como fondo", "Lista mientras duermes"],
    faq_h="Preguntas",
    faq=[
        ("¿Daily Whisper es gratis?", "Puedes probar dos historias gratis. La historia de cada mañana y la experiencia completa llegan con Premium, que empieza con 7 días de prueba gratis."),
        ("¿Qué idiomas habla?", "La app está en español, inglés, turco, alemán, francés e italiano, y las historias se escriben de forma nativa en 24 idiomas."),
        ("¿Necesito una cuenta?", "No. Puedes empezar ya mismo. Una cuenta opcional guarda tus historias entre dispositivos."),
        ("¿Está en Android?", "Daily Whisper ya está en iPhone, iPad y Apple Watch. La versión para Android llega muy pronto."),
        ("¿Qué pasa con mis respuestas?", "Solo se usan para escribir tus historias. La política de privacidad tiene todos los detalles."),
    ],
    end_h="Vuelve a tu sueño cada día.", end_p="Descarga Daily Whisper y escucha tu primera historia hoy.",
    privacy="Privacidad", terms="Términos", support="Soporte", made="Daily Whisper es una app de Bam Studio.",
    lang_label="Idioma",
)

T["de"] = dict(
    title="Daily Whisper: Hör deinen Traum",
    desc="Jeden Morgen eine kurze Geschichte nur für dich: eine Szene aus dem Leben, das du dir wünschst, mit deinem Namen, vorgelesen von einer warmen Stimme.",
    nav_how="So funktioniert's", nav_features="Funktionen", nav_faq="Fragen", get="App laden",
    kicker="Manifestations-Geschichten, nur für dich",
    h1="Hör deinen Traum.",
    lede="Jeden Morgen eine kurze Geschichte nur für dich: eine Szene aus dem Leben, das du dir wünschst, mit deinem Namen, deinen Menschen und deiner Stadt, vorgelesen von einer warmen Stimme.",
    store_small="Laden im", android="Android folgt bald",
    hero_note="iPhone · iPad · Apple Watch · Widgets",
    how_kicker="So funktioniert's", how_h="Drei ruhige Minuten am Tag",
    steps=[
        ("Erzähl von deinem Traum", "Ein kurzes, sanftes Gespräch: dein Name, die Menschen, die du liebst, was du ändern willst und das Leben, das du dir vorstellst."),
        ("Jeden Morgen eine neue Geschichte", "Jeden Tag entsteht eine neue Szene aus diesem Leben, erzählt, als wäre sie schon passiert. Nie zweimal dieselbe."),
        ("Augen zu und zuhören", "Eine warme Stimme liest sie dir vor, mit Regen, Meer oder 432 Hz. Oder lies sie in deinem Tempo."),
    ],
    rows=[
        ("Heute", "Dein zukünftiges Ich hat eine Geschichte für dich", "Öffne die App und die Geschichte des Tages wartet schon. Mit deinem Namen, deinen Menschen und deiner Stadt.",
         ["Eine sanfte Mitteilung, sobald sie fertig ist", "Hören oder lesen, mit Countdown zur nächsten", "Affirmation und Horoskop des Tages auf derselben Seite"]),
        ("Hören", "Augen zu. Hör deinen Traum.", "Die Geschichte wird Zeile für Zeile vorgelesen, wie ein stiller Film. Wähle deine Stimme und deine Atmosphäre.",
         ["Regen, Meer, Nacht, 432 Hz oder 528 Hz unter der Stimme", "Mehrere Erzählstimmen und Tempi", "Der ganze Text, wann immer du lesen willst"]),
        ("Neues Manifest", "Dein Traum. Deine Geschichte.", "Ein Vorstellungsgespräch, ein neues Zuhause, ein erstes Date? Beschreib einen Moment und hör dich selbst, wie du ihn erlebst.",
         ["Jedes Ziel, jeder Moment", "Ort, Menschen und Gefühl als Wegweiser", "Alle Geschichten in deiner Bibliothek, mit Favoriten"]),
        ("Sterne", "Was sagen die Sterne heute?", "Eine tägliche Deutung nach Sonne, Mond und Aszendent: Liebe, Geld und Beruf, dazu das, was der Himmel heute macht.",
         ["Dein Geburtshoroskop aus deinen Geburtsdaten", "Mondphasen und Rückläufigkeiten, einfach erklärt", "Kleine, praktische Tipps für den Tag"]),
    ],
    quote="Ich baue mir ein Leben, das sich nach mir anfühlt.",
    more_kicker="Und mehr", more_h="Alles, was deinen Traum nah hält",
    cards=[
        ("Worte, die zu dir passen", "Wisch durch Affirmationen und behalte die, die dich berühren."),
        ("Mach Platz für deinen Traum", "Deine Fotos und Worte auf einem Vision Board. Als Hintergrundbild speichern."),
        ("Das Gute bemerken", "Ein kleines Dankbarkeitstagebuch für die kleinen Dinge, jeden Tag."),
        ("Immer bei dir", "Affirmationen und Astrologie in deinen Widgets und auf der Apple Watch."),
        ("Teile, was dich trägt", "Mach aus einer Affirmation mit einem Tipp eine Story oder einen Post."),
        ("In deiner Sprache", "Geschichten werden nativ in 24 Sprachen geschrieben."),
    ],
    pro_kicker="Premium", pro_h="Starte mit zwei Geschichten gratis",
    pro_p="Probier Daily Whisper mit zwei Geschichten von uns. Premium öffnet alles und beginnt mit einer 7 tägigen Gratis-Testphase. Jederzeit kündbar.",
    pro_list=["Jeden Morgen eine neue Geschichte", "Unbegrenzte Manifeste", "Alle Erzählstimmen", "432 Hz, 528 Hz und alle Klangwelten", "Vision Board als Hintergrundbild", "Fertig, während du schläfst"],
    faq_h="Fragen",
    faq=[
        ("Ist Daily Whisper kostenlos?", "Du kannst zwei Geschichten gratis ausprobieren. Die Geschichte jeden Morgen und alles Weitere gibt es mit Premium, das mit einer 7 tägigen Gratis-Testphase beginnt."),
        ("Welche Sprachen spricht die App?", "Die App gibt es auf Deutsch, Englisch, Türkisch, Spanisch, Französisch und Italienisch; Geschichten werden nativ in 24 Sprachen geschrieben."),
        ("Brauche ich ein Konto?", "Nein. Du kannst sofort loslegen. Ein optionales Konto sichert deine Geschichten über Geräte hinweg."),
        ("Gibt es die App für Android?", "Daily Whisper gibt es schon für iPhone, iPad und Apple Watch. Die Android-Version folgt bald."),
        ("Was passiert mit meinen Antworten?", "Sie werden nur genutzt, um deine Geschichten zu schreiben. Alle Details stehen in der Datenschutzerklärung."),
    ],
    end_h="Kehr jeden Tag zu deinem Traum zurück.", end_p="Lade Daily Whisper und hör deine erste Geschichte noch heute.",
    privacy="Datenschutz", terms="Nutzungsbedingungen", support="Support", made="Daily Whisper ist eine App von Bam Studio.",
    lang_label="Sprache",
)

T["fr"] = dict(
    title="Daily Whisper : Écoute ton rêve",
    desc="Chaque matin, une courte histoire écrite pour toi : une scène de la vie que tu veux, avec ton prénom, lue par une voix chaleureuse.",
    nav_how="Comment ça marche", nav_features="Fonctions", nav_faq="Questions", get="Télécharger",
    kicker="Des histoires de manifestation, faites pour toi",
    h1="Écoute ton rêve.",
    lede="Chaque matin, une courte histoire écrite rien que pour toi : une scène de la vie que tu veux, avec ton prénom, tes proches et ta ville, lue par une voix chaleureuse.",
    store_small="Disponible sur", android="Bientôt sur Android",
    hero_note="iPhone · iPad · Apple Watch · Widgets",
    how_kicker="Comment ça marche", how_h="Trois minutes calmes par jour",
    steps=[
        ("Raconte ton rêve", "Une conversation courte et douce : ton prénom, les personnes que tu aimes, ce que tu veux changer et la vie que tu imagines."),
        ("Une nouvelle histoire chaque matin", "Chaque jour, une nouvelle scène de cette vie est écrite pour toi, racontée comme si elle avait déjà eu lieu. Jamais deux fois la même."),
        ("Ferme les yeux et écoute", "Une voix chaleureuse te la lit sur fond de pluie, d'océan ou de 432 Hz. Ou lis-la à ton rythme."),
    ],
    rows=[
        ("Aujourd'hui", "Ton futur toi a une histoire pour toi", "Ouvre l'app : l'histoire du jour t'attend. Ton prénom y est, tes proches et ta ville aussi.",
         ["Une notification douce quand elle est prête", "Écoute ou lis, avec un compte à rebours vers la suivante", "L'affirmation et l'horoscope du jour sur la même page"]),
        ("Écouter", "Ferme les yeux. Écoute ton rêve.", "L'histoire est lue ligne par ligne, comme un film paisible. Choisis ta voix et ton ambiance.",
         ["Pluie, océan, nuit, 432 Hz ou 528 Hz sous la voix", "Plusieurs voix et vitesses", "Le texte complet quand tu veux le lire"]),
        ("Nouveau manifeste", "Ton rêve. Ton histoire.", "Un entretien, un nouveau chez-toi, un premier rendez-vous ? Décris un moment et écoute-toi le vivre.",
         ["N'importe quel objectif, n'importe quel moment", "Lieu, personnes et sensation pour te guider", "Toutes tes histoires dans ta bibliothèque, avec tes favoris"]),
        ("Étoiles", "Que disent les étoiles aujourd'hui ?", "Une lecture quotidienne selon ton Soleil, ta Lune et ton Ascendant : amour, argent et travail, et ce que fait le ciel aujourd'hui.",
         ["Ton thème natal à partir de tes données de naissance", "Phases de la Lune et rétrogrades, expliquées simplement", "De petits conseils pratiques pour la journée"]),
    ],
    quote="Je construis une vie qui me ressemble.",
    more_kicker="Et plus encore", more_h="Tout ce qui garde ton rêve tout près",
    cards=[
        ("Des mots qui te ressemblent", "Fais défiler les affirmations et garde celles qui te parlent."),
        ("Fais de la place à ton rêve", "Tes photos et tes mots sur un Vision Board. Enregistre-le en fond d'écran."),
        ("Remarque le bon", "Un petit journal de gratitude pour les petites choses, chaque jour."),
        ("Toujours avec toi", "Affirmations et astrologie sur tes widgets et ton Apple Watch."),
        ("Partage ce qui t'élève", "Transforme une affirmation en story ou en post d'un seul geste."),
        ("Dans ta langue", "Les histoires sont écrites nativement dans 24 langues."),
    ],
    pro_kicker="Premium", pro_h="Commence avec deux histoires offertes",
    pro_p="Essaie Daily Whisper avec deux histoires offertes. Premium ouvre tout et commence par 7 jours d'essai gratuit. Résiliable à tout moment.",
    pro_list=["Une nouvelle histoire chaque matin", "Manifestes illimités", "Toutes les voix", "432 Hz, 528 Hz et toutes les ambiances", "Vision Board en fond d'écran", "Prête pendant ton sommeil"],
    faq_h="Questions",
    faq=[
        ("Daily Whisper est-il gratuit ?", "Tu peux essayer deux histoires gratuitement. L'histoire de chaque matin et l'expérience complète viennent avec Premium, qui commence par 7 jours d'essai gratuit."),
        ("Quelles langues parle-t-il ?", "L'app est en français, anglais, turc, espagnol, allemand et italien, et les histoires sont écrites nativement dans 24 langues."),
        ("Faut-il un compte ?", "Non. Tu peux commencer tout de suite. Un compte facultatif garde tes histoires sur tous tes appareils."),
        ("Est-il disponible sur Android ?", "Daily Whisper est déjà sur iPhone, iPad et Apple Watch. La version Android arrive bientôt."),
        ("Que deviennent mes réponses ?", "Elles servent uniquement à écrire tes histoires. Tous les détails sont dans la politique de confidentialité."),
    ],
    end_h="Reviens à ton rêve chaque jour.", end_p="Télécharge Daily Whisper et écoute ta première histoire dès aujourd'hui.",
    privacy="Confidentialité", terms="Conditions", support="Assistance", made="Daily Whisper est une app de Bam Studio.",
    lang_label="Langue",
)

T["it"] = dict(
    title="Daily Whisper: Ascolta il tuo sogno",
    desc="Ogni mattina una breve storia scritta per te: una scena della vita che desideri, con il tuo nome, letta da una voce calda.",
    nav_how="Come funziona", nav_features="Funzioni", nav_faq="Domande", get="Scarica l'app",
    kicker="Storie di manifestazione, fatte per te",
    h1="Ascolta il tuo sogno.",
    lede="Ogni mattina una breve storia scritta solo per te: una scena della vita che desideri, con il tuo nome, le tue persone e la tua città, letta da una voce calda.",
    store_small="Scarica su", android="Presto su Android",
    hero_note="iPhone · iPad · Apple Watch · Widget",
    how_kicker="Come funziona", how_h="Tre minuti tranquilli al giorno",
    steps=[
        ("Racconta il tuo sogno", "Una chiacchierata breve e gentile: il tuo nome, le persone che ami, cosa vuoi cambiare e la vita che immagini."),
        ("Una nuova storia ogni mattina", "Ogni giorno viene scritta una nuova scena di quella vita, raccontata come se fosse già successa. Mai la stessa storia due volte."),
        ("Chiudi gli occhi e ascolta", "Una voce calda te la legge con pioggia, oceano o 432 Hz. Oppure leggila con calma."),
    ],
    rows=[
        ("Oggi", "Il tuo io futuro ha una storia per te", "Apri l'app e la storia di oggi ti aspetta. C'è il tuo nome, ci sono le tue persone e la tua città.",
         ["Una notifica gentile quando è pronta", "Ascolta o leggi, con il conto alla rovescia per la prossima", "Affermazione e oroscopo del giorno nella stessa pagina"]),
        ("Ascolta", "Chiudi gli occhi. Ascolta il tuo sogno.", "La storia viene letta riga dopo riga, come un film tranquillo. Scegli la voce e crea la tua atmosfera.",
         ["Pioggia, oceano, notte, 432 Hz o 528 Hz sotto la voce", "Diverse voci narranti e velocità", "Il testo completo quando vuoi leggere"]),
        ("Nuovo manifesto", "Il tuo sogno. La tua storia.", "Un colloquio, una casa nuova, un primo appuntamento? Descrivi un momento e ascoltati mentre lo vivi.",
         ["Ogni obiettivo, ogni momento", "Luogo, persone e sensazione per guidarti", "Tutte le storie nella tua libreria, con i preferiti"]),
        ("Stelle", "Cosa dicono le stelle oggi?", "Una lettura quotidiana secondo Sole, Luna e Ascendente: amore, denaro e lavoro, più quello che fa il cielo oggi.",
         ["Il tuo tema natale dai dati di nascita", "Fasi lunari e retrogradi, spiegati semplicemente", "Piccoli consigli pratici per la giornata"]),
    ],
    quote="Sto costruendo una vita che sento mia.",
    more_kicker="E non solo", more_h="Tutto ciò che tiene vicino il tuo sogno",
    cards=[
        ("Parole che ti somigliano", "Scorri le affermazioni e tieni quelle che ti parlano."),
        ("Fai spazio al tuo sogno", "Le tue foto e le tue parole in una Vision Board. Salvala come sfondo."),
        ("Nota il bello", "Un piccolo diario della gratitudine per le piccole cose, ogni giorno."),
        ("Sempre con te", "Affermazioni e astrologia nei widget e su Apple Watch."),
        ("Condividi ciò che ti solleva", "Trasforma un'affermazione in una storia o un post con un tocco."),
        ("Nella tua lingua", "Le storie sono scritte in modo nativo in 24 lingue."),
    ],
    pro_kicker="Premium", pro_h="Inizia con due storie gratis",
    pro_p="Prova Daily Whisper con due storie in regalo. Premium sblocca tutto e inizia con 7 giorni di prova gratuita. Disdici quando vuoi.",
    pro_list=["Una nuova storia ogni mattina", "Manifesti illimitati", "Tutte le voci narranti", "432 Hz, 528 Hz e tutti i suoni d'ambiente", "Vision Board come sfondo", "Pronta mentre dormi"],
    faq_h="Domande",
    faq=[
        ("Daily Whisper è gratis?", "Puoi provare due storie gratis. La storia di ogni mattina e l'esperienza completa arrivano con Premium, che inizia con 7 giorni di prova gratuita."),
        ("Quali lingue parla?", "L'app è in italiano, inglese, turco, spagnolo, tedesco e francese, e le storie sono scritte in modo nativo in 24 lingue."),
        ("Serve un account?", "No. Puoi iniziare subito. Un account facoltativo conserva le tue storie su tutti i dispositivi."),
        ("È disponibile su Android?", "Daily Whisper è già su iPhone, iPad e Apple Watch. La versione Android arriva presto."),
        ("Cosa succede alle mie risposte?", "Servono solo a scrivere le tue storie. Tutti i dettagli sono nell'informativa sulla privacy."),
    ],
    end_h="Torna al tuo sogno ogni giorno.", end_p="Scarica Daily Whisper e ascolta la tua prima storia oggi.",
    privacy="Privacy", terms="Termini", support="Assistenza", made="Daily Whisper è un'app di Bam Studio.",
    lang_label="Lingua",
)

# Bölüm görselleri: (fotoğraf, ekranlar)
ROWS = [
    ("garden", ["01-today"]),
    ("sea", ["02-player", "03-soundscapes"]),
    ("rainbow", ["09-new-story", "08-stories"]),
    ("moon", ["04-zodiac", "05-zodiac-advice"]),
]
CARDS = ["06-affirmations", "07-vision-board", "10-gratitude", "watch", "13-share", "lang"]
ROW_IDS = ["today", "listen", "manifest", "stars"]

APPLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>'
MOON = '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M20.5 4.5a11.5 11.5 0 1 0 7 19.6A10 10 0 0 1 20.5 4.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M24 7.5v3M22.5 9h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'

FAVICON = "data:image/svg+xml," + (
    "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%2380505C'/%3E"
    "%3Cpath d='M19.5 7a9.5 9.5 0 1 0 5.8 16.2A8.2 8.2 0 0 1 19.5 7z' fill='none' stroke='%23F3EDE5' stroke-width='1.8' stroke-linejoin='round'/%3E%3C/svg%3E")


def url(lang):
    return BASE if lang == "en" else f"{BASE}{lang}/"


def shot(lang, name):
    return f"{A}screens/{SHOTS.get(lang, 'en')}/{name}.webp"


def phone(src, cls=""):
    return f'<span class="phone {cls}"><img src="{src}" alt="" loading="lazy" decoding="async" /></span>'


def store_btn(t, ev, cls=""):
    return (f'<a class="btn {cls}" href="{IOS}" target="_blank" rel="noopener" data-umami-event="app-store" '
            f'data-umami-event-app="daily-whisper" data-umami-event-where="{ev}">{APPLE}'
            f'<span><small>{escape(t["store_small"])}</small>App Store</span></a>')


def render(lang):
    t = T[lang]
    e = escape
    og = f"{SITE}{A}og-{OG.get(lang, 'en')}.jpg"
    alts = "\n".join(f'<link rel="alternate" hreflang="{l}" href="{SITE}{url(l)}" />' for l in LANGS)
    alts += f'\n<link rel="alternate" hreflang="x-default" href="{SITE}{BASE}" />'
    cur = ' aria-current="true"'
    langs_menu = "".join(
        f'<a href="{url(l)}" data-l="{l}"{cur if l == lang else ""} lang="{l}">{NAMES[l]}</a>' for l in LANGS)

    # İngilizce kök sayfa: kayıtlı seçim yoksa tarayıcı diline yönlendir
    redirect = ""
    if lang == "en":
        redirect = """<script>(function(){var s;try{s=localStorage.getItem("dw-lang")}catch(e){}
if(/[?&]lang=en\\b/.test(location.search))return;var n=(s||navigator.language||"").slice(0,2).toLowerCase();
if(["tr","es","de","fr","it"].indexOf(n)>-1)location.replace("/daily-whisper/"+n+"/"+location.hash);})();</script>"""

    steps = "".join(
        f'<li class="step rv"><span class="num">{i + 1:02d}</span><h3>{e(a)}</h3><p>{e(b)}</p></li>'
        for i, (a, b) in enumerate(t["steps"]))

    rows = []
    for i, ((kick, h, p, bul), (photo, shots), rid) in enumerate(zip(t["rows"], ROWS, ROW_IDS)):
        phones = phone(shot(lang, shots[0]), "p1")
        if len(shots) > 1:
            phones += phone(shot(lang, shots[1]), "p2")
        bl = "".join(f"<li>{CHECK}<span>{e(b)}</span></li>" for b in bul)
        rows.append(f'''
  <section class="row{' flip' if i % 2 else ''}" id="{rid}">
    <div class="wrap row-in">
      <div class="stage rv{' duo' if len(shots) > 1 else ''}" style="--ph:url('{A}photos/{photo}.webp')">{phones}</div>
      <div class="copy rv">
        <p class="kick">{e(kick)}</p>
        <h2>{e(h)}</h2>
        <p class="p">{e(p)}</p>
        <ul class="ticks">{bl}</ul>
      </div>
    </div>
  </section>''')

    cards = []
    for (h, p), key in zip(t["cards"], CARDS):
        if key == "watch":
            vis = f'<div class="cv">{phone(shot(lang, "12-widgets"), "mini")}</div>'
        elif key == "lang":
            chips = "".join(f'<span lang="{l}">{NAMES[l]}</span>' for l in LANGS)
            vis = f'<div class="cv langs" style="--ph:url(\'{A}photos/water.webp\')"><div class="chips">{chips}<span>+18</span></div><b>24</b></div>'
        else:
            vis = f'<div class="cv">{phone(shot(lang, key), "mini")}</div>'
        cards.append(f'<article class="card rv"><div class="ct"><h3>{e(h)}</h3><p>{e(p)}</p></div>{vis}</article>')

    pro = "".join(f"<li>{CHECK}<span>{e(x)}</span></li>" for x in t["pro_list"])
    faq = "".join(
        f'<details class="qa rv"><summary><span>{e(q)}</span><i aria-hidden="true"></i></summary><p>{e(a)}</p></details>'
        for q, a in t["faq"])

    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>{e(t["title"])}</title>
{redirect}
<meta name="description" content="{e(t["desc"])}" />
<link rel="canonical" href="{SITE}{url(lang)}" />
{alts}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Daily Whisper" />
<meta property="og:url" content="{SITE}{url(lang)}" />
<meta property="og:title" content="{e(t["title"])}" />
<meta property="og:description" content="{e(t["desc"])}" />
<meta property="og:image" content="{og}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="{LOCALE[lang]}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{e(t["title"])}" />
<meta name="twitter:description" content="{e(t["desc"])}" />
<meta name="twitter:image" content="{og}" />
<meta name="apple-itunes-app" content="app-id=6757824195" />
<meta name="theme-color" content="#F3EDE5" />
<link rel="icon" href="{FAVICON}" />
<link rel="preload" href="{A}fonts/Poppins-Regular.ttf" as="font" type="font/ttf" crossorigin />
<link rel="preload" href="{A}fonts/Poppins-Medium.ttf" as="font" type="font/ttf" crossorigin />
<link rel="stylesheet" href="{A}site.css?v=3" />
<script defer src="https://cloud.umami.is/script.js" data-website-id="238c1f38-f12a-4cab-b510-c2e56a5964cb" data-domains="bamstudio.dev,www.bamstudio.dev,berkalparslan.github.io"></script>
</head>
<body>

<header class="top">
  <div class="wrap bar">
    <a class="brand" href="{url(lang)}">{MOON}<span>Daily Whisper</span></a>
    <nav class="nav"><a href="#how">{e(t["nav_how"])}</a><a href="#today">{e(t["nav_features"])}</a><a href="#faq">{e(t["nav_faq"])}</a></nav>
    <details class="lang">
      <summary aria-label="{e(t["lang_label"])}">{lang.upper()}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
      <div class="menu">{langs_menu}</div>
    </details>
    <a class="btn sm" href="#get">{e(t["get"])}</a>
  </div>
</header>

<main>
  <section class="hero">
    <div class="wrap hero-in">
      <div class="hero-copy">
        <p class="kick">{e(t["kicker"])}</p>
        <h1>{e(t["h1"])}</h1>
        <p class="lede">{e(t["lede"])}</p>
        <div class="ctas" id="hero-cta">{store_btn(t, "hero")}<span class="soon">{e(t["android"])}</span></div>
        <p class="note">{e(t["hero_note"])}</p>
      </div>
      <div class="hero-art" style="--ph:url('{A}photos/sea.webp')">
        {phone(shot(lang, "01-today"), "h1p")}
        {phone(shot(lang, "02-player"), "h2p")}
      </div>
    </div>
  </section>

  <section class="how" id="how">
    <div class="wrap">
      <p class="kick rv">{e(t["how_kicker"])}</p>
      <h2 class="rv">{e(t["how_h"])}</h2>
      <ol class="steps">{steps}</ol>
    </div>
  </section>
{"".join(rows)}

  <section class="quote" style="--ph:url('{A}photos/meadow.webp')">
    <div class="wrap"><blockquote class="rv">{e(t["quote"])}</blockquote></div>
  </section>

  <section class="more">
    <div class="wrap">
      <p class="kick rv">{e(t["more_kicker"])}</p>
      <h2 class="rv">{e(t["more_h"])}</h2>
      <div class="cards">{"".join(cards)}</div>
    </div>
  </section>

  <section class="pro">
    <div class="wrap pro-in rv">
      <div>
        <p class="kick">{e(t["pro_kicker"])}</p>
        <h2>{e(t["pro_h"])}</h2>
        <p class="p">{e(t["pro_p"])}</p>
      </div>
      <ul class="ticks">{pro}</ul>
    </div>
  </section>

  <section class="faq" id="faq">
    <div class="wrap narrow">
      <h2 class="rv">{e(t["faq_h"])}</h2>
      {faq}
    </div>
  </section>

  <section class="end" id="get">
    <div class="wrap end-in rv" style="--ph:url('{A}photos/window.webp')">
      <div class="end-copy">
        {MOON}
        <h2>{e(t["end_h"])}</h2>
        <p class="p">{e(t["end_p"])}</p>
        <div class="ctas">{store_btn(t, "end", "light")}<span class="soon light">{e(t["android"])}</span></div>
      </div>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap foot-in">
    <p>{e(t["made"])}</p>
    <nav><a href="/privacy/daily-whisper/">{e(t["privacy"])}</a><a href="/terms/">{e(t["terms"])}</a><a href="/support/">{e(t["support"])}</a><a href="mailto:merhaba@bamstudio.dev">merhaba@bamstudio.dev</a></nav>
  </div>
</footer>

<div class="dock" aria-hidden="true">{store_btn(t, "dock")}</div>

<script>
(function(){{
  document.querySelectorAll(".lang a").forEach(function(a){{a.addEventListener("click",function(){{try{{localStorage.setItem("dw-lang",a.dataset.l)}}catch(e){{}}}})}});
  document.addEventListener("click",function(ev){{var d=document.querySelector(".lang");if(d.open&&!d.contains(ev.target))d.open=false}});
  var rv=document.querySelectorAll(".rv");
  if("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches){{
    document.documentElement.classList.add("anim");
    var io=new IntersectionObserver(function(es){{es.forEach(function(x){{if(x.isIntersecting){{x.target.classList.add("in");io.unobserve(x.target)}}}})}},{{rootMargin:"0px 0px -8% 0px"}});
    rv.forEach(function(el){{io.observe(el)}});
  }}
  var dock=document.querySelector(".dock"),hero=document.getElementById("hero-cta"),end=document.getElementById("get");
  if("IntersectionObserver" in window){{
    var vis={{}};var o2=new IntersectionObserver(function(es){{es.forEach(function(x){{vis[x.target.id]=x.isIntersecting}});var show=!vis["hero-cta"]&&!vis["get"];dock.classList.toggle("on",show);dock.setAttribute("aria-hidden",show?"false":"true")}});
    o2.observe(hero);o2.observe(end);
  }}
}})();
</script>
</body>
</html>
'''


CSS = r"""
@font-face{font-family:Poppins;src:url(fonts/Poppins-Light.ttf) format("truetype");font-weight:300;font-display:swap}
@font-face{font-family:Poppins;src:url(fonts/Poppins-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:Poppins;src:url(fonts/Poppins-Medium.ttf) format("truetype");font-weight:500;font-display:swap}
@font-face{font-family:Poppins;src:url(fonts/Poppins-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--paper:#F3EDE5;--ink:#352B2D;--muted:#78696C;--accent:#80505C;--rose:#C89DA5;--line:#DED0C9;--soft:#EBE0D9;
  --r:28px;--gut:20px;color-scheme:light}
*{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:400 17px/1.55 Poppins,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
h1,h2,h3,p,ul,ol,blockquote{margin:0;padding:0}
ul,ol{list-style:none}
img{display:block;max-width:100%}
svg{flex-shrink:0}
.wrap{max-width:1160px;margin:0 auto;padding:0 var(--gut)}
.narrow{max-width:780px}
.kick{font-size:12px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:14px}
h1{font-size:clamp(44px,8vw,84px);line-height:1.02;font-weight:500;letter-spacing:-.045em}
h2{font-size:clamp(30px,4.6vw,48px);line-height:1.1;font-weight:500;letter-spacing:-.035em}
h3{font-size:19px;line-height:1.3;font-weight:500;letter-spacing:-.01em}
.p{color:var(--muted);font-size:18px;line-height:1.6;margin-top:18px;max-width:34em}

/* üst bar */
.top{position:sticky;top:0;z-index:20;background:rgba(243,237,229,.86);-webkit-backdrop-filter:saturate(1.2) blur(14px);backdrop-filter:saturate(1.2) blur(14px);border-bottom:1px solid transparent;transition:border-color .3s}
.bar{display:flex;align-items:center;gap:18px;height:68px}
.brand{display:flex;align-items:center;gap:10px;font-weight:500;font-size:17px;letter-spacing:-.01em;margin-right:auto;color:var(--ink)}
.mark{width:28px;height:28px;color:var(--accent)}
.nav{display:flex;gap:26px;font-size:14px;color:var(--muted)}
.nav a:hover{color:var(--ink)}
.lang{position:relative}
.lang summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:4px;font-size:13px;font-weight:500;letter-spacing:.06em;padding:8px 10px 8px 14px;border:1px solid var(--line);border-radius:999px;user-select:none}
.lang summary::-webkit-details-marker{display:none}
.lang summary svg{width:16px;height:16px;transition:transform .2s}
.lang[open] summary svg{transform:rotate(180deg)}
.lang .menu{position:absolute;right:0;top:calc(100% + 8px);background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:6px;min-width:170px;box-shadow:0 18px 40px rgba(53,43,45,.12)}
.lang .menu a{display:block;padding:10px 14px;border-radius:12px;font-size:15px}
.lang .menu a:hover{background:var(--soft)}
.lang .menu a[aria-current]{color:var(--accent);font-weight:500}

/* düğmeler */
.btn{display:inline-flex;align-items:center;gap:10px;background:var(--ink);color:var(--paper);border-radius:999px;padding:12px 26px 12px 20px;font-weight:500;font-size:19px;line-height:1.05;transition:transform .2s,background .2s}
.btn:hover{background:var(--accent);transform:translateY(-1px)}
.btn svg{width:26px;height:26px}
.btn small{display:block;font-size:11px;font-weight:400;letter-spacing:.02em;opacity:.8}
.btn.sm{padding:10px 18px;font-size:14px}
.btn.light{background:var(--paper);color:var(--ink)}
.btn.light:hover{background:var(--soft)}
.ctas{display:flex;flex-wrap:wrap;align-items:center;gap:14px 18px;margin-top:34px}
.soon{font-size:14px;color:var(--muted);border:1px dashed var(--rose);border-radius:999px;padding:9px 16px}
.soon.light{color:var(--paper);border-color:rgba(243,237,229,.55)}

/* telefon çerçevesi */
.phone{display:block;width:var(--w,250px);aspect-ratio:1320/2868;border-radius:calc(var(--w,250px)*.15);background:var(--ink);padding:calc(var(--w,250px)*.026);box-shadow:0 30px 60px -18px rgba(53,43,45,.45),0 0 0 1px rgba(53,43,45,.25)}
.phone img{width:100%;height:100%;object-fit:cover;border-radius:calc(var(--w,250px)*.125);background:var(--soft)}

/* hero */
.hero{padding:56px 0 40px}
.hero-in{display:grid;grid-template-columns:1.05fr 1fr;gap:48px;align-items:center}
.hero h1{margin-top:4px}
.lede{font-size:clamp(18px,1.8vw,20px);color:var(--muted);line-height:1.6;margin-top:24px;max-width:31em}
.note{margin-top:22px;font-size:13px;color:var(--muted);letter-spacing:.02em}
.hero-art{position:relative;height:640px;border-radius:40px;background:var(--soft) var(--ph) center/cover;overflow:hidden}
.hero-art::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(53,43,45,0) 45%,rgba(53,43,45,.28))}
.hero-art .phone{position:absolute;z-index:1}
.h1p{--w:250px;left:9%;top:70px;transform:rotate(-4deg)}
.h2p{--w:250px;right:8%;top:130px;transform:rotate(4deg)}

.pro-in.wrap,.end-in.wrap{width:calc(100% - 2*var(--gut));max-width:calc(1160px - 2*var(--gut))}

/* nasıl çalışır */
.how{padding:110px 0 40px}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:44px}
.step{background:var(--soft);border-radius:var(--r);padding:30px 28px 32px}
.num{display:block;font-size:44px;font-weight:300;letter-spacing:-.04em;color:var(--accent);line-height:1;margin-bottom:26px}
.step p{color:var(--muted);font-size:16px;margin-top:10px}

/* özellik satırları */
.row{padding:70px 0}
.row-in{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.row.flip .stage{order:2}
.stage{position:relative;height:600px;border-radius:40px;background:var(--soft) var(--ph) center/cover;overflow:hidden;display:flex;justify-content:center;align-items:center}
.stage::after{content:"";position:absolute;inset:0;background:rgba(53,43,45,.12)}
.stage .phone{position:relative;z-index:1;--w:240px}
.stage.duo .p1{transform:translateX(-58px) rotate(-3deg)}
.stage.duo .p2{position:absolute;transform:translateX(78px) translateY(36px) rotate(3deg);--w:220px}
.ticks{margin-top:26px;display:grid;gap:12px}
.ticks li{display:flex;gap:12px;align-items:flex-start;font-size:16px}
.ticks svg{width:22px;height:22px;color:var(--accent);margin-top:1px}

/* söz */
.quote{margin:70px 0;padding:150px 0;background:var(--accent) var(--ph) center/cover;position:relative;color:var(--paper);text-align:center}
.quote::before{content:"";position:absolute;inset:0;background:rgba(53,43,45,.5)}
.quote blockquote{position:relative;font-size:clamp(30px,5vw,58px);line-height:1.15;font-weight:300;letter-spacing:-.035em;max-width:16em;margin:0 auto}
.quote blockquote::before{content:"\201C";display:block;font-size:1.6em;line-height:.6;color:var(--rose);margin-bottom:18px}

/* kartlar */
.more{padding:50px 0 60px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:44px}
.card{background:var(--soft);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;min-height:480px}
.ct{padding:28px 28px 0}
.ct p{color:var(--muted);font-size:15px;margin-top:8px}
.cv{flex:1;position:relative;display:flex;justify-content:center;align-items:flex-start;padding-top:28px;overflow:hidden;min-height:300px}
.cv .phone.mini{--w:210px;position:absolute;top:28px;left:50%;margin-left:-105px}
.cv.langs{margin:24px 20px 20px;border-radius:22px;background:var(--accent) var(--ph) center/cover;flex-direction:column;justify-content:flex-end;align-items:flex-start;padding:22px;color:var(--paper)}
.cv.langs::before{content:"";position:absolute;inset:0;background:rgba(53,43,45,.45)}
.cv.langs b{position:absolute;right:18px;top:6px;font-size:120px;font-weight:300;letter-spacing:-.06em;line-height:1;color:var(--rose);z-index:1}
.chips{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:8px}
.chips span{font-size:13px;border:1px solid rgba(243,237,229,.5);border-radius:999px;padding:6px 12px}

/* premium */
.pro{padding:60px 0}
.pro-in{background:var(--accent);color:var(--paper);border-radius:40px;padding:64px;display:grid;grid-template-columns:1.1fr 1fr;gap:48px;align-items:center}
.pro .kick{color:var(--rose)}
.pro .p{color:var(--paper);opacity:.85}
.pro .ticks{margin:0;gap:14px}
.pro .ticks li{font-size:17px}
.pro .ticks svg{color:var(--rose)}

/* sss */
.faq{padding:80px 0}
.faq h2{margin-bottom:28px}
.qa{border-top:1px solid var(--line)}
.qa:last-child{border-bottom:1px solid var(--line)}
.qa summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:24px 0;font-size:19px;font-weight:500;letter-spacing:-.01em}
.qa summary::-webkit-details-marker{display:none}
.qa summary i{position:relative;width:16px;height:16px;flex-shrink:0}
.qa summary i::before,.qa summary i::after{content:"";position:absolute;left:0;top:7px;width:16px;height:1.8px;border-radius:2px;background:var(--accent);transition:transform .25s}
.qa summary i::after{transform:rotate(90deg)}
.qa[open] summary i::after{transform:rotate(0)}
.qa p{color:var(--muted);padding:0 40px 26px 0;font-size:16px}

/* son çağrı */
.end{padding:20px 0 90px}
.end-in{position:relative;border-radius:40px;overflow:hidden;background:var(--ink) var(--ph) center/cover;color:var(--paper);text-align:center;padding:110px 28px}
.end-in::before{content:"";position:absolute;inset:0;background:rgba(53,43,45,.55)}
.end-copy{position:relative;max-width:640px;margin:0 auto}
.end-copy .mark{width:40px;height:40px;color:var(--rose);margin:0 auto 22px;display:block}
.end-copy .p{color:var(--paper);opacity:.85;margin:18px auto 0}
.end-copy .ctas{justify-content:center}

/* alt bilgi */
.foot{border-top:1px solid var(--line);padding:30px 0 40px;font-size:14px;color:var(--muted)}
.foot-in{display:flex;flex-wrap:wrap;justify-content:space-between;gap:14px 30px}
.foot nav{display:flex;flex-wrap:wrap;gap:8px 22px}
.foot a:hover{color:var(--ink)}

/* mobil sabit indir çubuğu */
.dock{display:none}

/* görünme */
.anim .rv{opacity:0;transform:translateY(22px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.7,.2,1)}
.anim .rv.in{opacity:1;transform:none}

@media (max-width:980px){
  .nav{display:none}
  .hero-in,.row-in,.pro-in{grid-template-columns:1fr}
  .hero{padding-top:28px}
  .hero-art{height:560px}
  .row.flip .stage{order:0}
  .row-in{gap:36px}
  .cards{grid-template-columns:1fr 1fr}
  .steps{grid-template-columns:1fr}
  .pro-in{padding:44px 32px;gap:32px}
}
@media (max-width:640px){
  :root{--gut:16px;--r:24px}
  body{font-size:16px}
  .bar{height:60px;gap:10px}
  .bar .btn.sm{display:none}
  .hero{padding:24px 0 10px}
  .ctas{margin-top:28px}
  .hero-art{height:470px;border-radius:30px;margin:0 calc(var(--gut)*-0.25)}
  .h1p{--w:184px;left:5%;top:44px}
  .h2p{--w:184px;right:5%;top:100px}
  .how{padding:70px 0 20px}
  .steps{margin-top:30px;gap:12px}
  .step{padding:24px 22px 26px}
  .num{font-size:36px;margin-bottom:18px}
  .row{padding:44px 0}
  .stage{height:470px;border-radius:30px}
  .stage .phone{--w:196px}
  .stage.duo .p1{transform:translateX(-46px) rotate(-3deg)}
  .stage.duo .p2{--w:176px;transform:translateX(62px) translateY(30px) rotate(3deg)}
  .p{font-size:16px}
  .quote{padding:100px 0;margin:40px 0}
  .cards{grid-template-columns:1fr;gap:14px;margin-top:30px}
  .card{min-height:440px}
  .pro-in{border-radius:30px;padding:36px 24px}
  .faq{padding:56px 0}
  .qa summary{font-size:17px;padding:20px 0}
  .end-in{border-radius:30px;padding:80px 22px}
  .dock{display:flex;justify-content:center;position:fixed;left:0;right:0;bottom:0;z-index:30;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(243,237,229,0),var(--paper) 40%);transform:translateY(110%);transition:transform .35s cubic-bezier(.2,.7,.2,1);pointer-events:none}
  .dock.on{transform:none;pointer-events:auto}
  .dock .btn{width:100%;justify-content:center;max-width:420px}
  .foot{padding-bottom:110px}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}
"""


def main():
    (ROOT / "daily-whisper/assets/v2/site.css").write_text(CSS.strip() + "\n")
    for lang in LANGS:
        out = ROOT / url(lang).strip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        html = render(lang)
        for bad in ("—", "–", "â"):
            assert bad not in html, (lang, bad)
        out.write_text(html)
        print("yazıldı:", out.relative_to(ROOT))


if __name__ == "__main__":
    main()
