CREATE TYPE "EventState" AS ENUM ('DRAFT', 'PUBLISHED', 'WITHDRAWN', 'CANCELLED');
CREATE TABLE event (
 id UUID PRIMARY KEY,
 owner_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
 state "EventState" NOT NULL DEFAULT 'DRAFT',
 version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
 draft JSONB NOT NULL,
 draft_version INTEGER NOT NULL DEFAULT 0 CHECK (draft_version >= 0),
 first_published_at TIMESTAMPTZ(6),
 current_publication_id UUID UNIQUE,
 created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 edited_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT event_publication_state CHECK (
  (state = 'DRAFT' AND first_published_at IS NULL AND current_publication_id IS NULL)
  OR (state <> 'DRAFT' AND first_published_at IS NOT NULL AND current_publication_id IS NOT NULL)
 )
);
CREATE INDEX event_owner_id_edited_at_idx ON event(owner_id, edited_at);
CREATE TABLE event_publication (
 id UUID PRIMARY KEY,
 event_id UUID NOT NULL REFERENCES event(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL CHECK (revision > 0),
 snapshot JSONB NOT NULL,
 digest CHAR(64) NOT NULL,
 approved_by UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT event_publication_event_id_revision_key UNIQUE(event_id, revision),
 CONSTRAINT event_publication_id_event_key UNIQUE(id, event_id)
);
ALTER TABLE event ADD CONSTRAINT event_current_publication_id_fkey
 FOREIGN KEY (current_publication_id) REFERENCES event_publication(id) ON DELETE RESTRICT;
ALTER TABLE event ADD CONSTRAINT event_current_publication_ownership
 FOREIGN KEY (current_publication_id, id) REFERENCES event_publication(id, event_id) ON DELETE RESTRICT;
CREATE TABLE event_approval (
 id UUID PRIMARY KEY,
 event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
 actor_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
 event_version INTEGER NOT NULL,
 draft_version INTEGER NOT NULL,
 snapshot JSONB NOT NULL,
 digest CHAR(64) NOT NULL,
 created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX event_approval_event_id_idx ON event_approval(event_id);
CREATE FUNCTION reject_publication_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Published revisions are immutable';
END;
$$;
CREATE TRIGGER event_publication_immutable BEFORE UPDATE ON event_publication
 FOR EACH ROW EXECUTE FUNCTION reject_publication_mutation();
