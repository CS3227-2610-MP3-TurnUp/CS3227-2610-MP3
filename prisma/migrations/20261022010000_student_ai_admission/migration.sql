-- Product admission is separate from the synthetic foundation probe. No active budget is seeded.
CREATE TABLE student_ai_budget (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  approval_id TEXT NOT NULL UNIQUE,
  environment TEXT NOT NULL CHECK (environment = 'preview'),
  model TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 200),
  reserved_output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (reserved_output_tokens BETWEEN 0 AND 200000),
  last_admission_at TIMESTAMPTZ
);
CREATE TABLE student_ai_reservation (
  id UUID PRIMARY KEY,
  budget_id INTEGER NOT NULL REFERENCES student_ai_budget(id) ON DELETE RESTRICT,
  request_key CHAR(64) NOT NULL UNIQUE,
  actor_key CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  lease_until TIMESTAMPTZ NOT NULL,
  released BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX student_ai_reservation_actor_created_idx ON student_ai_reservation(actor_key, created_at);
