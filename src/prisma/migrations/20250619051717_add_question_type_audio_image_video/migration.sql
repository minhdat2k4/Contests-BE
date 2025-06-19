-- AlterTable
ALTER TABLE `questions` MODIFY `questionType` ENUM('multiple_choice', 'essay', 'image', 'audio', 'video') NOT NULL;

-- AlterTable
ALTER TABLE `screen_controls` MODIFY `controlValue` ENUM('start', 'pause', 'reset', 'zoomIn', 'zoomOut') NULL;
