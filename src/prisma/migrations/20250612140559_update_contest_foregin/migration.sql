-- AlterTable
ALTER TABLE `class_videos` ADD COLUMN `contestId` INTEGER NULL;

-- AlterTable
ALTER TABLE `sponsors` ADD COLUMN `contestId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Sponsors` ADD CONSTRAINT `Sponsors_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `Contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Class_Videos` ADD CONSTRAINT `Class_Videos_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `Contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
