-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('Admin', 'Judge', 'Student') NOT NULL;
