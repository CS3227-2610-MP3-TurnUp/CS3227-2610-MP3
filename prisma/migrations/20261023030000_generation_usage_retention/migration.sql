CREATE INDEX "generation_daily_usage_retention_idx"
  ON "generation_daily_usage" ("environment", "sgt_day");

CREATE INDEX "generation_reservation_retention_idx"
  ON "generation_reservation" ("environment", "status", "sgt_day");
