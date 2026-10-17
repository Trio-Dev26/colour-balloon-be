-- PRD FR-CUR-012: deleted records are hidden, not erased. deleted_at marks them;
-- module titles stay unique among live modules only, so a deleted module frees its title.

-- DropIndex
DROP INDEX "modules_title_en_key";

-- DropIndex
DROP INDEX "modules_title_my_key";

-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "units" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "modules_title_en_key" ON "modules"("title_en") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "modules_title_my_key" ON "modules"("title_my") WHERE (deleted_at IS NULL);

