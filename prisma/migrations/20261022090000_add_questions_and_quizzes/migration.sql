-- CreateEnum
CREATE TYPE "question_type" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'MATCHING', 'SEQUENCE');

-- CreateEnum
CREATE TYPE "quiz_type" AS ENUM ('UNIT_QUIZ', 'CHAPTER_END_TEST');

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "code" VARCHAR NOT NULL,
    "type" "question_type" NOT NULL,
    "prompt" JSONB NOT NULL,
    "prompt_text" VARCHAR NOT NULL,
    "prompt_media_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "answers" JSONB NOT NULL,
    "explanation" JSONB,
    "points" INTEGER NOT NULL,
    "unit_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_media" (
    "id" UUID NOT NULL,
    "question_id" UUID,
    "storage_key" VARCHAR NOT NULL,
    "content_type" VARCHAR NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" UUID NOT NULL,
    "code" VARCHAR NOT NULL,
    "type" "quiz_type" NOT NULL,
    "module_id" UUID NOT NULL,
    "unit_id" UUID,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "pass_percent" INTEGER NOT NULL,
    "title_en" VARCHAR NOT NULL,
    "title_my" VARCHAR NOT NULL,
    "description_en" JSONB,
    "description_my" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "quiz_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("quiz_id","question_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questions_code_key" ON "questions"("code");

-- CreateIndex
CREATE INDEX "questions_unit_id_idx" ON "questions"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_media_storage_key_key" ON "question_media"("storage_key");

-- CreateIndex
CREATE INDEX "question_media_question_id_idx" ON "question_media"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "quizzes_code_key" ON "quizzes"("code");

-- CreateIndex
CREATE INDEX "quizzes_module_id_idx" ON "quizzes"("module_id");

-- CreateIndex
CREATE INDEX "quizzes_unit_id_idx" ON "quizzes"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "quizzes_one_cet_per_module" ON "quizzes"("module_id") WHERE (type = 'CHAPTER_END_TEST' AND deleted_at IS NULL);

-- CreateIndex
CREATE INDEX "quiz_questions_question_id_idx" ON "quiz_questions"("question_id");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_media" ADD CONSTRAINT "question_media_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A unit quiz has a unit; the Chapter End Test has none (D16). Not expressible in the Prisma schema.
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_unit_matches_type" CHECK ((type = 'UNIT_QUIZ') = (unit_id IS NOT NULL));
