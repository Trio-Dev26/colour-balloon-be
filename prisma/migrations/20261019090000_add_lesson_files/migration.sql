-- CreateEnum
CREATE TYPE "lesson_file_group" AS ENUM ('STUDENT_VIEW', 'STUDENT_DOWNLOAD', 'TEACHER_VIEW', 'TEACHER_DOWNLOAD');

-- CreateTable
CREATE TABLE "lesson_files" (
    "id" UUID NOT NULL,
    "group" "lesson_file_group" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "storage_key" VARCHAR NOT NULL,
    "file_name" VARCHAR NOT NULL,
    "content_type" VARCHAR NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "caption_en" VARCHAR,
    "caption_my" VARCHAR,
    "lesson_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_files_storage_key_key" ON "lesson_files"("storage_key");

-- CreateIndex
CREATE INDEX "lesson_files_lesson_id_group_sequence_idx" ON "lesson_files"("lesson_id", "group", "sequence");

-- AddForeignKey
ALTER TABLE "lesson_files" ADD CONSTRAINT "lesson_files_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

