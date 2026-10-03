-- bamstudio.dev arka ucu: bülten, anket, indirim kodları
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
