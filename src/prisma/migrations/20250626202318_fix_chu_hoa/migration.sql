-- DropForeignKey
ALTER TABLE `awards` DROP FOREIGN KEY `Awards_contest_id_fkey`;

-- DropForeignKey
ALTER TABLE `awards` DROP FOREIGN KEY `Awards_contestant_id_fkey`;

-- DropForeignKey
ALTER TABLE `class_videos` DROP FOREIGN KEY `Class_Videos_classId_fkey`;

-- DropForeignKey
ALTER TABLE `class_videos` DROP FOREIGN KEY `Class_Videos_contestId_fkey`;

-- DropForeignKey
ALTER TABLE `classes` DROP FOREIGN KEY `Classes_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `contestant_matches` DROP FOREIGN KEY `Contestant_Matches_contestantId_fkey`;

-- DropForeignKey
ALTER TABLE `contestant_matches` DROP FOREIGN KEY `Contestant_Matches_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `contestant_matches` DROP FOREIGN KEY `Contestant_Matches_matchId_fkey`;

-- DropForeignKey
ALTER TABLE `contestants` DROP FOREIGN KEY `Contestants_contestId_fkey`;

-- DropForeignKey
ALTER TABLE `contestants` DROP FOREIGN KEY `Contestants_roundId_fkey`;

-- DropForeignKey
ALTER TABLE `contestants` DROP FOREIGN KEY `Contestants_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `groups` DROP FOREIGN KEY `Groups_matchId_fkey`;

-- DropForeignKey
ALTER TABLE `groups` DROP FOREIGN KEY `Groups_userId_fkey`;

-- DropForeignKey
ALTER TABLE `matches` DROP FOREIGN KEY `Matches_contestId_fkey`;

-- DropForeignKey
ALTER TABLE `matches` DROP FOREIGN KEY `Matches_questionPackageId_fkey`;

-- DropForeignKey
ALTER TABLE `matches` DROP FOREIGN KEY `Matches_roundId_fkey`;

-- DropForeignKey
ALTER TABLE `matches` DROP FOREIGN KEY `Matches_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `media` DROP FOREIGN KEY `Media_contestId_fkey`;

-- DropForeignKey
ALTER TABLE `question_details` DROP FOREIGN KEY `Question_Details_questionId_fkey`;

-- DropForeignKey
ALTER TABLE `question_details` DROP FOREIGN KEY `Question_Details_questionPackageId_fkey`;

-- DropForeignKey
ALTER TABLE `questions` DROP FOREIGN KEY `Questions_questionTopicId_fkey`;

-- DropForeignKey
ALTER TABLE `refreshtokens` DROP FOREIGN KEY `RefreshTokens_userId_fkey`;

-- DropForeignKey
ALTER TABLE `rescues` DROP FOREIGN KEY `Rescues_match_id_fkey`;

-- DropForeignKey
ALTER TABLE `results` DROP FOREIGN KEY `Results_contestant_id_fkey`;

-- DropForeignKey
ALTER TABLE `results` DROP FOREIGN KEY `Results_match_id_fkey`;

-- DropForeignKey
ALTER TABLE `rounds` DROP FOREIGN KEY `Rounds_contestId_fkey`;

-- DropForeignKey
ALTER TABLE `screen_controls` DROP FOREIGN KEY `Screen_Controls_matchId_fkey`;

-- DropForeignKey
ALTER TABLE `sponsors` DROP FOREIGN KEY `Sponsors_contestId_fkey`;

-- DropForeignKey
ALTER TABLE `students` DROP FOREIGN KEY `Students_classId_fkey`;

-- AddForeignKey
ALTER TABLE `refreshTokens` ADD CONSTRAINT `refreshTokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `classes_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_questionTopicId_fkey` FOREIGN KEY (`questionTopicId`) REFERENCES `question_Topics`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `question_Details` ADD CONSTRAINT `question_Details_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `question_Details` ADD CONSTRAINT `question_Details_questionPackageId_fkey` FOREIGN KEY (`questionPackageId`) REFERENCES `question_Packages`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `media` ADD CONSTRAINT `media_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rounds` ADD CONSTRAINT `rounds_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_questionPackageId_fkey` FOREIGN KEY (`questionPackageId`) REFERENCES `question_Packages`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `rounds`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `contestants` ADD CONSTRAINT `contestants_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `contestants` ADD CONSTRAINT `contestants_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `contestants` ADD CONSTRAINT `contestants_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `rounds`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `contestant_Matches` ADD CONSTRAINT `contestant_Matches_contestantId_fkey` FOREIGN KEY (`contestantId`) REFERENCES `contestants`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `contestant_Matches` ADD CONSTRAINT `contestant_Matches_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `contestant_Matches` ADD CONSTRAINT `contestant_Matches_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `results` ADD CONSTRAINT `results_contestant_id_fkey` FOREIGN KEY (`contestant_id`) REFERENCES `contestants`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `results` ADD CONSTRAINT `results_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `rescues` ADD CONSTRAINT `rescues_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `awards` ADD CONSTRAINT `awards_contest_id_fkey` FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `awards` ADD CONSTRAINT `awards_contestant_id_fkey` FOREIGN KEY (`contestant_id`) REFERENCES `contestants`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `sponsors` ADD CONSTRAINT `sponsors_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `class_Videos` ADD CONSTRAINT `class_Videos_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `class_Videos` ADD CONSTRAINT `class_Videos_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `screen_Controls` ADD CONSTRAINT `screen_Controls_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- RenameIndex
ALTER TABLE `contests` RENAME INDEX `Contests_slug_key` TO `contests_slug_key`;

-- RenameIndex
ALTER TABLE `matches` RENAME INDEX `Matches_slug_key` TO `matches_slug_key`;

-- RenameIndex
ALTER TABLE `schools` RENAME INDEX `Schools_email_key` TO `schools_email_key`;

-- RenameIndex
ALTER TABLE `schools` RENAME INDEX `Schools_phone_key` TO `schools_phone_key`;

-- RenameIndex
ALTER TABLE `screen_controls` RENAME INDEX `Screen_Controls_matchId_key` TO `screen_Controls_matchId_key`;

-- RenameIndex
ALTER TABLE `users` RENAME INDEX `Users_email_key` TO `users_email_key`;

-- RenameIndex
ALTER TABLE `users` RENAME INDEX `Users_username_key` TO `users_username_key`;
