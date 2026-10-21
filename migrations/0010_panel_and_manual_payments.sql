-- Panel configuration settings (default to existing NotPanel, but editable)
INSERT INTO settings (key, value) VALUES 
('panel_base', 'https://notpanel.com/api/v3'),
('panel_api_key', ''),
('default_currency', 'INR'),
('display_currencies', '[{"code":"INR","symbol":"₹","rate_micro_usd":12000},{"code":"USD","symbol":"$","rate_micro_usd":1000000},{"code":"EUR","symbol":"€","rate_micro_usd":1080000}]')
ON CONFLICT(key) DO NOTHING;

-- Payment methods (UPI, Bank Transfer, etc.)
CREATE TABLE IF NOT EXISTS payment_methods (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'INR',
  min_amount    INTEGER NOT NULL DEFAULT 1,
  max_amount    INTEGER NOT NULL DEFAULT 100000,
  description   TEXT NOT NULL DEFAULT '',
  qr_key        TEXT,
  auto_approve  INTEGER NOT NULL DEFAULT 0,
  enabled       INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Manual payments submissions
CREATE TABLE IF NOT EXISTS manual_payments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  method_id       INTEGER NOT NULL,
  amount          INTEGER NOT NULL,
  currency        TEXT NOT NULL,
  utr             TEXT NOT NULL,
  screenshot_key  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, auto
  credited_micro_usd INTEGER NOT NULL DEFAULT 0,
  admin_id        INTEGER,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  decided_at      INTEGER
);