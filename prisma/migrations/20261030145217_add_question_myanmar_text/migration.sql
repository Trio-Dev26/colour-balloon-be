-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "explanation_my" JSONB,
ADD COLUMN     "prompt_my" JSONB,
ADD COLUMN     "prompt_text_my" VARCHAR;
