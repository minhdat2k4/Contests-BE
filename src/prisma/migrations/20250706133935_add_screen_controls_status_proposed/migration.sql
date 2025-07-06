-- AlterTable
ALTER TABLE `rescues` MODIFY `status` ENUM('notUsed', 'used', 'passed', 'notEligible', 'proposed') NOT NULL;
