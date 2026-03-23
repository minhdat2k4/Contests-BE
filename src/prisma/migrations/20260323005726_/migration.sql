/*
  Warnings:

  - A unique constraint covering the columns `[contestant_id,match_id,questionOrder]` on the table `results` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `results_contestant_id_match_id_questionOrder_key` ON `results`(`contestant_id`, `match_id`, `questionOrder`);
