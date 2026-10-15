-- bamstudio.dev arka ucu: bülten, anket, indirim kodları, geri bildirim
CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,
  lang TEXT,
  source TEXT,              -- newsletter | poll
  status TEXT NOT NULL,     -- pending | active | unsubscribed
  token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  confirmed_at TEXT,
  unsubscribed_at TEXT
);
CREATE TABLE IF NOT EXISTS votes (
  email TEXT PRIMARY KEY,
  apps TEXT NOT NULL,       -- JSON dizi, 3 slug
  lang TEXT,
  platform TEXT,            -- ios | android | other
  created_at TEXT NOT NULL,
  sent_codes TEXT           -- JSON {slug: code}
);
CREATE TABLE IF NOT EXISTS codes (
  code TEXT PRIMARY KEY,
  app TEXT NOT NULL,
  product TEXT,
  expires TEXT,
  assigned_to TEXT,
  assigned_at TEXT
);
CREATE INDEX IF NOT EXISTS codes_free ON codes(app, assigned_to);
CREATE TABLE IF NOT EXISTS hits (
  ip TEXT NOT NULL,
  hour TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, hour)
);
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app TEXT NOT NULL,        -- katalog slug'ı ya da "genel"
  type TEXT NOT NULL,       -- hata | oneri | tesekkur | diger | proje
  message TEXT NOT NULL,
  name TEXT,
  email TEXT,               -- cevap için, isteğe bağlı
  lang TEXT,
  src TEXT,                 -- ?src= (ör. tv), yoksa boş
  ua TEXT,
  country TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS feedback_app ON feedback(app, created_at);
-- Panel iOS uygulamasının (dev.bamstudio.panel) APNs jetonları; rapor-gonder.mjs okur
CREATE TABLE IF NOT EXISTS panel_devices (
  token TEXT PRIMARY KEY,   -- APNs cihaz jetonu (hex)
  env TEXT NOT NULL,        -- development | production (imza türü)
  app TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen TEXT NOT NULL
);
-- Panel anlık uyarıları (scripts/lab/uyari.mjs yazar, Panel iOS ve lab paneli okur); son 200 tutulur.
-- Kişisel veri yok: yorumcu adı, e-posta, kullanıcı adı girmez.
CREATE TABLE IF NOT EXISTS panel_alerts (
  id TEXT PRIMARY KEY,      -- tur-<sha1 12>, uyari.mjs üretir
  t TEXT NOT NULL,          -- ISO, algılama zamanı
  tur TEXT NOT NULL,        -- yorum | durum | satis | anomali | saglik | test
  uygulama TEXT,            -- katalog slug'ı ya da boş
  baslik TEXT NOT NULL,
  govde TEXT,
  oncelik TEXT NOT NULL,    -- yuksek | normal | dusuk
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS panel_alerts_t ON panel_alerts(t);
