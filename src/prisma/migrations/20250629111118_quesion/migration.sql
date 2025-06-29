/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `refreshtokens` DROP FOREIGN KEY `refreshTokens_userId_fkey`;

-- AlterTable
ALTER TABLE `students` ADD COLUMN `userId` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `students_userId_key` ON `students`(`userId`);

-- AddForeignKey
ALTER TABLE `refreshtokens` ADD CONSTRAINT `refreshtokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
