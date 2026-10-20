CREATE TYPE "AccountRole" AS ENUM ('STUDENT', 'ORGANISER');

CREATE TABLE "app_user" (
  "id" UUID NOT NULL,
  "username" VARCHAR(32) NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "AccountRole" NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_user_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "app_user_username_canonical" CHECK ("username" ~ '^[a-z0-9_]{3,32}$')
);
CREATE UNIQUE INDEX "app_user_username_key" ON "app_user"("username");

-- Fixed role is also defended at the persistence boundary for later consumers.
CREATE FUNCTION "reject_account_role_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Account role is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "app_user_fixed_role" BEFORE UPDATE OF "role" ON "app_user"
FOR EACH ROW EXECUTE FUNCTION "reject_account_role_change"();

CREATE TABLE "auth_session" (
  "token_digest" CHAR(64) NOT NULL,
  "user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "auth_session_pkey" PRIMARY KEY ("token_digest"),
  CONSTRAINT "auth_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "auth_session_digest_format" CHECK ("token_digest" ~ '^[a-f0-9]{64}$')
);
CREATE INDEX "auth_session_user_id_idx" ON "auth_session"("user_id");
CREATE INDEX "auth_session_expires_at_idx" ON "auth_session"("expires_at");

CREATE TABLE "auth_throttle" (
  "key" VARCHAR(160) NOT NULL,
  "count" INTEGER NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "auth_throttle_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "auth_throttle_positive_count" CHECK ("count" > 0)
);
CREATE INDEX "auth_throttle_expires_at_idx" ON "auth_throttle"("expires_at");
