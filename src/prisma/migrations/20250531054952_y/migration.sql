-- CreateTable
CREATE TABLE `Users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` CHAR(255) NOT NULL,
    `password` CHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `role` ENUM('Admin', 'Judge') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `token` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Users_username_key`(`username`),
    UNIQUE INDEX `Users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Schools` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(10) NULL,
    `address` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Schools_email_key`(`email`),
    UNIQUE INDEX `Schools_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Classes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `schoolId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Students` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(255) NOT NULL,
    `student_code` VARCHAR(12) NULL,
    `classId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `About` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolName` VARCHAR(255) NOT NULL,
    `website` VARCHAR(255) NULL,
    `departmentName` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `fanpage` VARCHAR(255) NULL,
    `mapEmbedCode` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Question_Topics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Question_Packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `intro` VARCHAR(255) NULL,
    `defaultTime` INTEGER NOT NULL,
    `remainingTime` INTEGER NULL,
    `questionType` ENUM('multiple_choice', 'essay') NOT NULL,
    `plainText` TEXT NOT NULL,
    `content` TEXT NOT NULL,
    `questionMedia` JSON NULL,
    `options` JSON NULL,
    `correct_answer` TEXT NOT NULL,
    `mediaAnswer` JSON NULL,
    `score` INTEGER NOT NULL DEFAULT 1,
    `difficulty` ENUM('Alpha', 'Beta', 'Rc', 'Gold') NOT NULL,
    `explanation` TEXT NULL,
    `questionTopicId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Question_Details` (
    `questionId` INTEGER NOT NULL,
    `questionPackageId` INTEGER NOT NULL,
    `questionOrder` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`questionId`, `questionPackageId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `rule` TEXT NOT NULL,
    `plainText` TEXT NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `logo` VARCHAR(255) NULL,
    `background` VARCHAR(255) NULL,
    `media` VARCHAR(255) NULL,
    `slogan` VARCHAR(255) NULL,
    `status` ENUM('upcoming', 'ongoing', 'finished') NOT NULL DEFAULT 'upcoming',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Contests_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rounds` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `index` INTEGER NOT NULL,
    `contestId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Matches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `status` ENUM('upcoming', 'ongoing', 'finished') NOT NULL DEFAULT 'upcoming',
    `currentQuestion` INTEGER NOT NULL,
    `questionPackageId` INTEGER NOT NULL,
    `contestId` INTEGER NOT NULL,
    `roundId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `userId` INTEGER NOT NULL,
    `matchId` INTEGER NOT NULL,
    `confirmCurrentQuestion` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contestants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `contestId` INTEGER NOT NULL,
    `studentId` INTEGER NOT NULL,
    `roundId` INTEGER NOT NULL,
    `status` ENUM('compete', 'eliminate', 'advanced') NOT NULL DEFAULT 'compete',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contestant_Matches` (
    `contestantId` INTEGER NOT NULL,
    `matchId` INTEGER NOT NULL,
    `groupId` INTEGER NOT NULL,
    `registrationNumber` INTEGER NOT NULL,
    `status` ENUM('not_started', 'in_progress', 'confirmed1', 'confirmed2', 'eliminated', 'rescued', 'banned', 'completed') NOT NULL DEFAULT 'not_started',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`contestantId`, `matchId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `contestant_id` INTEGER NOT NULL,
    `match_id` INTEGER NOT NULL,
    `isCorrect` BOOLEAN NOT NULL DEFAULT true,
    `questionOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rescues` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `rescueType` ENUM('resurrected', 'lifelineUsed') NOT NULL,
    `questionFrom` INTEGER NOT NULL,
    `questionTo` INTEGER NOT NULL,
    `studentIds` JSON NOT NULL,
    `supportAnswers` JSON NOT NULL,
    `remainingContestants` INTEGER NULL,
    `maxStudent` INTEGER NULL,
    `index` INTEGER NOT NULL,
    `status` ENUM('notUsed', 'used', 'passed') NOT NULL,
    `match_id` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Awards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `contest_id` INTEGER NOT NULL,
    `contestant_id` INTEGER NULL,
    `type` ENUM('firstPrize', 'secondPrize', 'thirdPrize', 'fourthPrize', 'impressiveVideo', 'excellentVideo') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Awards_type_key`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sponsors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `logo` VARCHAR(255) NULL,
    `images` VARCHAR(255) NULL,
    `videos` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Class_Videos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `slogan` VARCHAR(255) NULL,
    `classId` INTEGER NOT NULL,
    `videos` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Screen_Controls` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `controlKey` ENUM('background', 'question', 'questionInfo', 'answer', 'matchDiagram', 'explanation', 'firstPrize', 'secondPrize', 'thirdPrize', 'fourthPrize', 'impressiveVideo', 'excellentVideo', 'allPrize', 'topWin', 'listEliminated', 'listRescued', 'video', 'audio', 'image') NOT NULL,
    `controlValue` ENUM('start', 'pause', 'reset', 'zoomIn', 'zoomOut') NOT NULL,
    `matchId` INTEGER NOT NULL,
    `media` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Screen_Controls_matchId_key`(`matchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Classes` ADD CONSTRAINT `Classes_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `Schools`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Students` ADD CONSTRAINT `Students_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Classes`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Questions` ADD CONSTRAINT `Questions_questionTopicId_fkey` FOREIGN KEY (`questionTopicId`) REFERENCES `Question_Topics`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Question_Details` ADD CONSTRAINT `Question_Details_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Questions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Question_Details` ADD CONSTRAINT `Question_Details_questionPackageId_fkey` FOREIGN KEY (`questionPackageId`) REFERENCES `Question_Packages`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Rounds` ADD CONSTRAINT `Rounds_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `Contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Matches` ADD CONSTRAINT `Matches_questionPackageId_fkey` FOREIGN KEY (`questionPackageId`) REFERENCES `Question_Packages`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Matches` ADD CONSTRAINT `Matches_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `Contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Matches` ADD CONSTRAINT `Matches_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `Rounds`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Groups` ADD CONSTRAINT `Groups_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Groups` ADD CONSTRAINT `Groups_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Contestants` ADD CONSTRAINT `Contestants_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `Contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Contestants` ADD CONSTRAINT `Contestants_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Students`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Contestants` ADD CONSTRAINT `Contestants_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `Rounds`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Contestant_Matches` ADD CONSTRAINT `Contestant_Matches_contestantId_fkey` FOREIGN KEY (`contestantId`) REFERENCES `Contestants`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Contestant_Matches` ADD CONSTRAINT `Contestant_Matches_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Contestant_Matches` ADD CONSTRAINT `Contestant_Matches_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Groups`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Results` ADD CONSTRAINT `Results_contestant_id_fkey` FOREIGN KEY (`contestant_id`) REFERENCES `Contestants`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Results` ADD CONSTRAINT `Results_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `Matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Rescues` ADD CONSTRAINT `Rescues_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `Matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Awards` ADD CONSTRAINT `Awards_contest_id_fkey` FOREIGN KEY (`contest_id`) REFERENCES `Contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Awards` ADD CONSTRAINT `Awards_contestant_id_fkey` FOREIGN KEY (`contestant_id`) REFERENCES `Contestants`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Class_Videos` ADD CONSTRAINT `Class_Videos_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Classes`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Screen_Controls` ADD CONSTRAINT `Screen_Controls_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
