/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Matches` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Matches_slug_key` ON `Matches`(`slug`);
