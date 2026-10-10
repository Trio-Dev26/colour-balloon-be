/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `modules` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `modules` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "module_status" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "code" VARCHAR NOT NULL,
ADD COLUMN     "status" "module_status" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE UNIQUE INDEX "modules_code_key" ON "modules"("code");
