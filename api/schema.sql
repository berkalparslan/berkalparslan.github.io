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
  type TEXT NOT NULL,       -- hata | oneri | tesekkur | diger
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
