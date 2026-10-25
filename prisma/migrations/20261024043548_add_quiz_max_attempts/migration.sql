-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "max_attempts" INTEGER;

-- D24 default for existing Chapter End Tests; unit quizzes stay unlimited (NULL).
UPDATE "quizzes" SET "max_attempts" = 3 WHERE "type" = 'CHAPTER_END_TEST';
