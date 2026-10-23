CREATE TYPE "generation_environment" AS ENUM ('PREVIEW', 'PRODUCTION');
CREATE TYPE "generation_reservation_status" AS ENUM (
  'RESERVED', 'DISPATCHED', 'COMPLETED', 'REFUNDED', 'UNCERTAIN', 'RECOVERED'
);

CREATE TABLE "generation_daily_usage" (
  "environment" "generation_environment" NOT NULL,
  "owner_id" UUID NOT NULL,
  "sgt_day" DATE NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "reserved_output_tokens" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT "generation_daily_usage_pkey" PRIMARY KEY ("environment", "owner_id", "sgt_day"),
  CONSTRAINT "generation_daily_usage_owner_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "generation_daily_usage_attempt_count_check"
    CHECK ("attempt_count" BETWEEN 0 AND 10),
  CONSTRAINT "generation_daily_usage_reserved_tokens_check"
    CHECK ("reserved_output_tokens" BETWEEN 0 AND 40960),
  CONSTRAINT "generation_daily_usage_attempt_token_match_check"
    CHECK ("reserved_output_tokens" = "attempt_count" * 4096)
);

CREATE TABLE "generation_environment_gate" (
  "environment" "generation_environment" NOT NULL,
  "active_reservation_id" UUID,
  "last_dispatch_at" TIMESTAMPTZ(6),
  CONSTRAINT "generation_environment_gate_pkey" PRIMARY KEY ("environment"),
  CONSTRAINT "generation_environment_gate_active_reservation_key" UNIQUE ("active_reservation_id")
);

INSERT INTO "generation_environment_gate" ("environment") VALUES ('PREVIEW'), ('PRODUCTION');

CREATE TABLE "generation_reservation" (
  "id" UUID NOT NULL,
  "environment" "generation_environment" NOT NULL,
  "owner_id" UUID NOT NULL,
  "sgt_day" DATE NOT NULL,
  "reserved_output_tokens" INTEGER NOT NULL DEFAULT 4096,
  "status" "generation_reservation_status" NOT NULL DEFAULT 'RESERVED',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp(),
  "dispatched_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  CONSTRAINT "generation_reservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "generation_reservation_daily_usage_fkey"
    FOREIGN KEY ("environment", "owner_id", "sgt_day")
    REFERENCES "generation_daily_usage"("environment", "owner_id", "sgt_day")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "generation_reservation_tokens_check"
    CHECK ("reserved_output_tokens" = 4096),
  CONSTRAINT "generation_reservation_state_timestamps_check"
    CHECK (
      ("status" = 'RESERVED' AND "dispatched_at" IS NULL AND "finished_at" IS NULL)
      OR ("status" = 'REFUNDED' AND "dispatched_at" IS NULL AND "finished_at" IS NOT NULL)
      OR ("status" IN ('DISPATCHED', 'UNCERTAIN') AND "dispatched_at" IS NOT NULL AND "finished_at" IS NULL)
      OR ("status" IN ('COMPLETED', 'RECOVERED') AND "dispatched_at" IS NOT NULL AND "finished_at" IS NOT NULL)
    )
);

ALTER TABLE "generation_environment_gate"
  ADD CONSTRAINT "generation_environment_gate_active_reservation_fkey"
  FOREIGN KEY ("active_reservation_id") REFERENCES "generation_reservation"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "generation_reservation_environment_status_created_at_idx"
  ON "generation_reservation"("environment", "status", "created_at");
CREATE INDEX "generation_reservation_owner_environment_sgt_day_idx"
  ON "generation_reservation"("owner_id", "environment", "sgt_day");
