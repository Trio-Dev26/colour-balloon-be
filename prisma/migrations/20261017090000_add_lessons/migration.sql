-- Lessons: the level below units (Decision Log D1); codes L001.. (D13), soft delete (FR-CUR-012).

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "code" VARCHAR NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title_en" VARCHAR NOT NULL,
    "title_my" VARCHAR NOT NULL,
    "description_en" JSONB NOT NULL,
    "description_my" JSONB NOT NULL,
    "unit_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "lessons_code_key" ON "lessons"("code");
-- CreateIndex
CREATE INDEX "lessons_unit_id_sequence_idx" ON "lessons"("unit_id", "sequence");
-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
