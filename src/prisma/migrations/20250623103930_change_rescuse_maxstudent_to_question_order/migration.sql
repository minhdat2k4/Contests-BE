/*
  Warnings:

  - You are about to drop the column `maxStudent` on the `rescues` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `rescues` DROP COLUMN `maxStudent`,
    ADD COLUMN `questionOrder` INTEGER NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('Admin', 'Judge', 'Student') NOT NULL;
