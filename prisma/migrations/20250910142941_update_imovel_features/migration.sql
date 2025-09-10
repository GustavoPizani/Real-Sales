/*
  Warnings:

  - You are about to drop the column `descricao` on the `Imovel` table. All the data in the column will be lost.
  - Added the required column `prioridade` to the `Tarefa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipo` to the `Tarefa` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('LIGACAO', 'EMAIL', 'WHATSAPP', 'VISITA', 'OUTRO');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

-- AlterEnum
ALTER TYPE "StatusImovel" ADD VALUE 'LANCAMENTO';

-- AlterTable
ALTER TABLE "Imovel" DROP COLUMN "descricao",
ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Tarefa" ADD COLUMN     "prioridade" "Priority" NOT NULL,
ADD COLUMN     "tipo" "TaskType" NOT NULL;
