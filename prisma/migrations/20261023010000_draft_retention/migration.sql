ALTER TABLE event
  ADD COLUMN private_activity_at TIMESTAMPTZ(6),
  ADD COLUMN retention_checked_at TIMESTAMPTZ(6);

-- Existing private drafts/preparation start a fresh notice window at migration time.
UPDATE event SET private_activity_at = clock_timestamp();

CREATE INDEX event_retention_scan_idx
  ON event (private_activity_at, retention_checked_at);
