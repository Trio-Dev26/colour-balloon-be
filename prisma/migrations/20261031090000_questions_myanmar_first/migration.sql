-- Q24: questions are Myanmar-first. The Myanmar prompt becomes required and English becomes the optional
-- translation (never for FILL_BLANK). Existing text is moved, not lost:
-- * a row that already has a Myanmar prompt keeps it, and its old main prompt becomes the English one;
-- * otherwise the old main prompt becomes the Myanmar one (existing rows are test data for admins to check).
-- Explanations move the same way.

ALTER TABLE "questions"
  ADD COLUMN "prompt_en" JSONB,
  ADD COLUMN "prompt_text_en" VARCHAR,
  ADD COLUMN "explanation_en" JSONB;

UPDATE "questions"
  SET "prompt_en" = "prompt", "prompt_text_en" = "prompt_text"
  WHERE "prompt_my" IS NOT NULL;

UPDATE "questions"
  SET "prompt_my" = "prompt", "prompt_text_my" = "prompt_text"
  WHERE "prompt_my" IS NULL;

UPDATE "questions"
  SET "explanation_en" = "explanation"
  WHERE "explanation_my" IS NOT NULL;

UPDATE "questions"
  SET "explanation_my" = "explanation"
  WHERE "explanation_my" IS NULL;

-- FILL_BLANK has no English version (its blanks are Myanmar words).
UPDATE "questions"
  SET "prompt_en" = NULL, "prompt_text_en" = NULL, "explanation_en" = NULL
  WHERE "type" = 'FILL_BLANK';

ALTER TABLE "questions"
  DROP COLUMN "prompt",
  DROP COLUMN "prompt_text",
  DROP COLUMN "explanation";

ALTER TABLE "questions"
  ALTER COLUMN "prompt_my" SET NOT NULL,
  ALTER COLUMN "prompt_text_my" SET NOT NULL;
