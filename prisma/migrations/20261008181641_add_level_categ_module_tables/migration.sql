-- CreateTable
CREATE TABLE "levels" (
    "id" UUID NOT NULL,
    "code" VARCHAR NOT NULL,
    "title_en" VARCHAR NOT NULL,
    "title_my" VARCHAR NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "code" VARCHAR NOT NULL,
    "title_en" VARCHAR NOT NULL,
    "title_my" VARCHAR NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" UUID NOT NULL,
    "title_en" VARCHAR NOT NULL,
    "title_my" VARCHAR NOT NULL,
    "description_en" JSONB NOT NULL,
    "description_my" JSONB NOT NULL,
    "learning_goal_en" VARCHAR NOT NULL,
    "learning_goal_my" VARCHAR NOT NULL,
    "learning_outcome_en" JSONB NOT NULL,
    "learning_outcome_my" JSONB NOT NULL,
    "level_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "levels_code_key" ON "levels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "modules_title_en_key" ON "modules"("title_en");

-- CreateIndex
CREATE UNIQUE INDEX "modules_title_my_key" ON "modules"("title_my");

-- CreateIndex
CREATE INDEX "modules_level_id_category_id_idx" ON "modules"("level_id", "category_id");

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
