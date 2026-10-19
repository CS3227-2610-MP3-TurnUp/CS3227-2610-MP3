CREATE TABLE "soc_probe_gate" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "attempt_count" BIGINT NOT NULL DEFAULT 0,
    "in_flight_count" BIGINT NOT NULL DEFAULT 0,
    "reserved_output_tokens" BIGINT NOT NULL DEFAULT 0,
    "last_admission_at" TIMESTAMPTZ(6),
    "max_attempts_limit" BIGINT,
    "max_in_flight_limit" BIGINT,
    "min_interval_ms" BIGINT,
    "output_token_budget" BIGINT,

    CONSTRAINT "soc_probe_gate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "soc_probe_gate_singleton_check" CHECK ("id" = 1),
    CONSTRAINT "soc_probe_gate_attempt_count_check" CHECK ("attempt_count" >= 0),
    CONSTRAINT "soc_probe_gate_in_flight_count_check" CHECK ("in_flight_count" >= 0),
    CONSTRAINT "soc_probe_gate_reserved_output_tokens_check" CHECK ("reserved_output_tokens" >= 0)
);

INSERT INTO "soc_probe_gate" ("id") VALUES (1);

CREATE TABLE "soc_probe_reservation" (
    "id" UUID NOT NULL,
    "gate_id" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "soc_probe_reservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "soc_probe_reservation_gate_id_fkey"
        FOREIGN KEY ("gate_id") REFERENCES "soc_probe_gate"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "soc_probe_reservation_created_at_idx"
    ON "soc_probe_reservation"("created_at");
