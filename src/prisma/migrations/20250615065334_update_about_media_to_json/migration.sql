/*
  Warnings:

  - You are about to alter the column `banner` on the `about` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `Json`.
  - You are about to alter the column `logo` on the `about` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `Json`.

*/
-- AlterTable
ALTER TABLE `about` MODIFY `banner` JSON NULL,
    MODIFY `logo` JSON NULL;
