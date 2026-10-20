ALTER TABLE app_user
  ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN student_name TEXT,
  ADD COLUMN student_phone TEXT,
  ADD COLUMN profile_version INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT app_user_nonnegative_versions CHECK (credential_version >= 0 AND profile_version >= 0),
  ADD CONSTRAINT app_user_organiser_profile_null CHECK (role = 'STUDENT' OR (student_name IS NULL AND student_phone IS NULL)),
  ADD CONSTRAINT app_user_name_bounds CHECK (student_name IS NULL OR char_length(student_name) BETWEEN 1 AND 100),
  ADD CONSTRAINT app_user_phone_bounds CHECK (student_phone IS NULL OR student_phone ~ '^\+?[0-9]{7,15}$');
