CREATE TABLE student_ai_history (
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE ON UPDATE CASCADE,
  event_id uuid NOT NULL REFERENCES event(id) ON DELETE CASCADE ON UPDATE CASCADE,
  request_id varchar(128) NOT NULL,
  revision varchar(128) NOT NULL,
  payload jsonb NOT NULL CHECK (octet_length(payload::text) <= 40000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (user_id,event_id,request_id)
);
CREATE INDEX student_ai_history_lookup ON student_ai_history(user_id,event_id,revision,created_at);
CREATE INDEX student_ai_history_expiry ON student_ai_history(expires_at);
