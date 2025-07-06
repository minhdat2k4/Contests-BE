-- DropForeignKey
ALTER TABLE `screen_controls` DROP FOREIGN KEY `screen_Controls_matchId_fkey`;

-- AddForeignKey
ALTER TABLE `screen_controls` ADD CONSTRAINT `screen_controls_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- RenameIndex
ALTER TABLE `screen_controls` RENAME INDEX `screen_Controls_matchId_key` TO `screen_controls_matchId_key`;
