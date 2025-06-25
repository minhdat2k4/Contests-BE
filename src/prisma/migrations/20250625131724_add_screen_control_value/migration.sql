-- AlterTable
ALTER TABLE `screen_controls` ADD COLUMN `value` VARCHAR(191) NULL,
    MODIFY `controlKey` ENUM('qrcode', 'background', 'question', 'questionIntro', 'questionInfo', 'answer', 'matchDiagram', 'explanation', 'firstPrize', 'secondPrize', 'thirdPrize', 'fourthPrize', 'impressiveVideo', 'excellentVideo', 'allPrize', 'topWin', 'listEliminated', 'listRescued', 'video', 'audio', 'image') NOT NULL DEFAULT 'background';
