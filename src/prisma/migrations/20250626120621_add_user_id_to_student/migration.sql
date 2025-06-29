-- This is an empty migration.

-- Add userId column to Students table
ALTER TABLE `Student` ADD COLUMN `userId` INTEGER;

-- Create unique index
CREATE UNIQUE INDEX `Student_userId_key` ON `Student`(`userId`);

-- Add foreign key constraint (nullable để tránh xung đột với dữ liệu hiện có)
ALTER TABLE `Student` ADD CONSTRAINT `Student_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;