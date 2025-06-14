/*
  Warnings:

  - You are about to drop the column `correct_answer` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `remainingTime` on the `questions` table. All the data in the column will be lost.
  - Added the required column `correctAnswer` to the `Questions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `matches` ADD COLUMN `remainingTime` INTEGER NULL,
    ADD COLUMN `studentId` INTEGER NULL;

-- AlterTable
ALTER TABLE `questions` DROP COLUMN `correct_answer`,
    DROP COLUMN `remainingTime`,
    ADD COLUMN `correctAnswer` TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE `Matches` ADD CONSTRAINT `Matches_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Students`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
