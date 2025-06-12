/*
  Warnings:

  - Made the column `remainingContestants` on table `rescues` required. This step will fail if there are existing NULL values in that column.
  - Made the column `maxStudent` on table `rescues` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `rescues` MODIFY `remainingContestants` INTEGER NOT NULL,
    MODIFY `maxStudent` INTEGER NOT NULL;
