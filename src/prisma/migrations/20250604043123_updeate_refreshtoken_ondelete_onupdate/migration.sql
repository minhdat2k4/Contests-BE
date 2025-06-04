-- DropForeignKey
ALTER TABLE `refreshtokens` DROP FOREIGN KEY `RefreshTokens_userId_fkey`;

-- DropIndex
DROP INDEX `RefreshTokens_userId_fkey` ON `refreshtokens`;

-- AddForeignKey
ALTER TABLE `RefreshTokens` ADD CONSTRAINT `RefreshTokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
