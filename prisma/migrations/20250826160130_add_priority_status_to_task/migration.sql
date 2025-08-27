/*
  Warnings:

  - Added the required column `prioridade` to the `Tarefa` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tarefa" ADD COLUMN     "prioridade" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pendente';
