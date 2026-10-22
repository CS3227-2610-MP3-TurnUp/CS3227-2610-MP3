-- Additive D007 migration; existing accounts/publications are preserved.
ALTER TABLE event ADD COLUMN draft_form JSONB NOT NULL DEFAULT '{"questions":[]}';
CREATE TYPE "RegistrationState" AS ENUM ('ACTIVE', 'CANCELLED');
CREATE TYPE "RegistrationOperationKind" AS ENUM ('JOIN', 'CANCEL', 'CORRECT');
CREATE TABLE registration (
 id UUID PRIMARY KEY,
 event_id UUID NOT NULL REFERENCES event(id) ON DELETE RESTRICT,
 student_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
 state "RegistrationState" NOT NULL,
 generation INTEGER NOT NULL CHECK (generation > 0),
 version INTEGER NOT NULL CHECK (version > 0),
 joined_publication_id UUID NOT NULL REFERENCES event_publication(id) ON DELETE RESTRICT,
 joined_at TIMESTAMPTZ(6) NOT NULL,
 cancelled_at TIMESTAMPTZ(6),
 current_submission_id UUID UNIQUE,
 CONSTRAINT registration_student_id_event_id_key UNIQUE(student_id,event_id),
 CONSTRAINT registration_publication_ownership FOREIGN KEY(joined_publication_id,event_id) REFERENCES event_publication(id,event_id) ON DELETE RESTRICT,
 CONSTRAINT registration_active_submission CHECK (state <> 'ACTIVE' OR (current_submission_id IS NOT NULL AND cancelled_at IS NULL))
);
CREATE INDEX registration_event_id_state_idx ON registration(event_id,state);
CREATE INDEX registration_student_id_joined_at_idx ON registration(student_id,joined_at);
CREATE TABLE registration_submission (
 id UUID PRIMARY KEY,
 registration_id UUID NOT NULL REFERENCES registration(id) ON DELETE RESTRICT,
 generation INTEGER NOT NULL CHECK(generation > 0),
 version INTEGER NOT NULL CHECK(version > 0),
 publication_id UUID NOT NULL REFERENCES event_publication(id) ON DELETE RESTRICT,
 form_revision_id UUID NOT NULL,
 captured_form JSONB NOT NULL,
 profile_name TEXT,
 profile_phone TEXT,
 answers JSONB NOT NULL,
 created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT registration_submission_registration_id_generation_version_key UNIQUE(registration_id,generation,version),
 CONSTRAINT registration_submission_id_registration_id_generation_key UNIQUE(id,registration_id,generation)
);
ALTER TABLE registration ADD CONSTRAINT registration_current_submission_id_fkey FOREIGN KEY(current_submission_id) REFERENCES registration_submission(id) ON DELETE RESTRICT;
ALTER TABLE registration ADD CONSTRAINT registration_current_submission_ownership FOREIGN KEY(current_submission_id,id,generation) REFERENCES registration_submission(id,registration_id,generation) ON DELETE RESTRICT;
CREATE FUNCTION reject_submission_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Submitted versions are immutable';
END;
$$;
CREATE TRIGGER registration_submission_immutable BEFORE UPDATE ON registration_submission FOR EACH ROW EXECUTE FUNCTION reject_submission_mutation();
CREATE TABLE registration_operation (
 actor_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
 event_id UUID NOT NULL REFERENCES event(id) ON DELETE RESTRICT,
 operation "RegistrationOperationKind" NOT NULL,
 key UUID NOT NULL,
 payload_digest CHAR(64) NOT NULL,
 result JSONB NOT NULL,
 created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(actor_id,event_id,operation,key)
);
CREATE INDEX registration_operation_created_at_idx ON registration_operation(created_at);

-- Immutable answers must capture the exact source form from this event and generation.
CREATE FUNCTION validate_submission_source() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM registration r JOIN event_publication p ON p.event_id=r.event_id
  WHERE r.id=NEW.registration_id AND r.generation=NEW.generation AND p.id=NEW.publication_id
   AND p.snapshot->'form'=NEW.captured_form
   AND p.snapshot->'form'->>'formRevisionId'=NEW.form_revision_id::text
 ) THEN RAISE EXCEPTION 'Submission source does not match registration and publication'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER registration_submission_source BEFORE INSERT ON registration_submission FOR EACH ROW EXECUTE FUNCTION validate_submission_source();
