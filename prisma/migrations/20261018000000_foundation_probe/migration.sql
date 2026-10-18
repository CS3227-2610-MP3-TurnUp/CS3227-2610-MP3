CREATE TABLE "foundation_probe" (
    "id" UUID NOT NULL,
    "marker" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foundation_probe_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "foundation_probe_marker_key" ON "foundation_probe"("marker");
