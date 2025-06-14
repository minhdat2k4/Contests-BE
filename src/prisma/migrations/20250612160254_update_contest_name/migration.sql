/*
  Warnings:

  - You are about to alter the column `media` on the `contests` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `Json`.

*/
-- AlterTable
ALTER TABLE `contests` MODIFY `media` JSON NULL;
