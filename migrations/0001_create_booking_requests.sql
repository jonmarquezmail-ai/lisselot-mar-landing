CREATE TABLE IF NOT EXISTS booking_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'nuevo',
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  event_type TEXT NOT NULL,
  venue TEXT NOT NULL,
  event_date TEXT NOT NULL,
  guests INTEGER NOT NULL,
  city TEXT NOT NULL,
  format TEXT NOT NULL,
  duration TEXT NOT NULL,
  notes TEXT,
  source_url TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_booking_requests_created_at
ON booking_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_requests_status
ON booking_requests (status);
