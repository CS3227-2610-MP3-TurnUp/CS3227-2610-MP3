ALTER TABLE event
  ADD COLUMN preparation JSONB,
  ADD COLUMN preparation_version INTEGER NOT NULL DEFAULT 0 CHECK (preparation_version >= 0);
