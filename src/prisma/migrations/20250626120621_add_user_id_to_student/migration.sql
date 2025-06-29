-- This is an empty migration.

-- Step 1: Add nullable userId column first
ALTER TABLE `Students` ADD COLUMN `userId` INTEGER;

-- Step 2: Update existing students with userId based on creation order
-- This assumes Users with role Student were created in the same order as Students
SET @row_number = 0;
UPDATE `Students` s
JOIN (
    SELECT 
        id,
        (@row_number := @row_number + 1) as row_num
    FROM `Users` 
    WHERE role = 'Student' 
    ORDER BY createdAt
) u ON (
    SELECT COUNT(*) + 1 
    FROM `Students` s2 
    WHERE s2.createdAt < s.createdAt
) = u.row_num
SET s.userId = u.id;

-- Step 3: Set NOT NULL constraint
ALTER TABLE `Students` MODIFY COLUMN `userId` INTEGER NOT NULL;

-- Step 4: Create unique index
CREATE UNIQUE INDEX `Students_userId_key` ON `Students`(`userId`);

-- Step 5: Add foreign key constraint
ALTER TABLE `Students` ADD CONSTRAINT `Students_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;