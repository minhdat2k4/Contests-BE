/*
  Warnings:

  - The values [zoomIn,zoomOut] on the enum `screen_Controls_controlValue` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `screen_controls` MODIFY `controlKey` ENUM('wingold', 'qrcode', 'background', 'question', 'questionIntro', 'questionInfo', 'answer', 'matchDiagram', 'explanation', 'firstPrize', 'secondPrize', 'thirdPrize', 'fourthPrize', 'impressiveVideo', 'excellentVideo', 'allPrize', 'topWin', 'listEliminated', 'listRescued', 'video', 'audio', 'image', 'chart') NOT NULL DEFAULT 'background',
    MODIFY `controlValue` ENUM('start', 'pause', 'reset', 'Eliminated', 'Rescued') NULL;
