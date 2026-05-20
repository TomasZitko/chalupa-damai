-- ─── Properties ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT    NOT NULL,
  slug                TEXT    NOT NULL UNIQUE,
  owner_email         TEXT    NOT NULL,
  owner_password_hash TEXT    NOT NULL,
  active              INTEGER NOT NULL DEFAULT 1
);

-- ─── iCal Feeds ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ical_feeds (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id   INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  platform_name TEXT    NOT NULL,
  feed_url      TEXT    NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  last_synced_at TEXT
);

-- ─── Blocked Dates (from external platforms) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_dates (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id  INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  external_uid TEXT    NOT NULL UNIQUE,
  source       TEXT    NOT NULL,
  date_from    TEXT    NOT NULL,
  date_to      TEXT    NOT NULL,
  summary      TEXT
);

CREATE INDEX IF NOT EXISTS idx_blocked_property_dates
  ON blocked_dates(property_id, date_from, date_to);

-- ─── Reservations (our own bookings) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id  INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_name   TEXT    NOT NULL,
  guest_email  TEXT    NOT NULL,
  guest_phone  TEXT,
  check_in     TEXT    NOT NULL,
  check_out    TEXT    NOT NULL,
  guests_count INTEGER NOT NULL DEFAULT 1,
  notes        TEXT,
  status       TEXT    NOT NULL DEFAULT 'pending'
                       CHECK(status IN ('pending','confirmed','cancelled')),
  source       TEXT    NOT NULL DEFAULT 'direct',
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reservations_property_dates
  ON reservations(property_id, check_in, check_out);
