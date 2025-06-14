-- AlterTable
ALTER TABLE `screen_controls` MODIFY `controlKey` ENUM('background', 'question', 'questionInfo', 'answer', 'matchDiagram', 'explanation', 'firstPrize', 'secondPrize', 'thirdPrize', 'fourthPrize', 'impressiveVideo', 'excellentVideo', 'allPrize', 'topWin', 'listEliminated', 'listRescued', 'video', 'audio', 'image') NOT NULL DEFAULT 'background',
    MODIFY `controlValue` ENUM('start', 'pause', 'reset', 'zoomIn', 'zoomOut') NOT NULL DEFAULT 'start',
    MODIFY `media` VARCHAR(255) NULL;
