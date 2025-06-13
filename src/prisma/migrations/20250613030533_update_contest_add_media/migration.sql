/*
  Warnings:

  - You are about to drop the column `background` on the `contests` table. All the data in the column will be lost.
  - You are about to drop the column `logo` on the `contests` table. All the data in the column will be lost.
  - You are about to drop the column `media` on the `contests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `contests` DROP COLUMN `background`,
    DROP COLUMN `logo`,
    DROP COLUMN `media`;

-- CreateTable
CREATE TABLE `Media` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(255) NOT NULL,
    `type` ENUM('logo', 'background', 'images') NOT NULL,
    `contestId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `Contests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
