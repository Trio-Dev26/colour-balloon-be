-- Decision Log D13/D14: one-letter level and category codes, system-generated
-- module codes (FM01) that never change, and units (FM01-U01).

-- 1. Level and category codes become letters (renamed in place, so ids and FKs stay valid).
UPDATE "levels" SET "code" = CASE "code"
  WHEN 'FOUNDATION'   THEN 'F'
  WHEN 'BEGINNER'     THEN 'B'
  WHEN 'ELEMENTARY'   THEN 'E'
  WHEN 'INTERMEDIATE' THEN 'I'
  ELSE "code" END;

UPDATE "categories" SET "code" = CASE "code"
  WHEN 'MAIN_LESSON' THEN 'M'
  WHEN 'READING'     THEN 'R'
  WHEN 'WRITING'     THEN 'W'
  WHEN 'SPEAKING'    THEN 'S'
  WHEN 'GRAMMAR'     THEN 'G'
  WHEN 'POETRY'      THEN 'P'
  ELSE "code" END;

-- 2. Professional is no longer a level (D14). Fails on purpose if a module still uses it.
DELETE FROM "levels" WHERE "code" = 'PROFESSIONAL';

-- 3. Counters for system-generated codes.
CREATE TABLE "code_sequences" (
    "scope" VARCHAR NOT NULL,
    "last_value" INTEGER NOT NULL,

    CONSTRAINT "code_sequences_pkey" PRIMARY KEY ("scope")
);

-- 4. Re-code existing modules (per level + category, oldest first) and record the
--    numbers used. Two passes avoid unique-key clashes between old and new codes.
UPDATE "modules" SET "code" = 'TMP-' || "id";

WITH numbered AS (
  SELECT m."id",
         l."code" || c."code" AS prefix,
         row_number() OVER (PARTITION BY m."level_id", m."category_id"
                            ORDER BY m."created_at", m."id") AS n
  FROM "modules" m
  JOIN "levels" l     ON l."id" = m."level_id"
  JOIN "categories" c ON c."id" = m."category_id"
)
UPDATE "modules" m
SET "code" = numbered.prefix || lpad(numbered.n::text, greatest(2, length(numbered.n::text)), '0')
FROM numbered
WHERE m."id" = numbered."id";

INSERT INTO "code_sequences" ("scope", "last_value")
SELECT l."code" || c."code", count(*)
FROM "modules" m
JOIN "levels" l     ON l."id" = m."level_id"
JOIN "categories" c ON c."id" = m."category_id"
GROUP BY l."code", c."code";

-- 5. Units.
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "code" VARCHAR NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title_en" VARCHAR NOT NULL,
    "title_my" VARCHAR NOT NULL,
    "description_en" JSONB NOT NULL,
    "description_my" JSONB NOT NULL,
    "module_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "units_code_key" ON "units"("code");

CREATE INDEX "units_module_id_sequence_idx" ON "units"("module_id", "sequence");

ALTER TABLE "units" ADD CONSTRAINT "units_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
