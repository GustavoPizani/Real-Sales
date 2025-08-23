/*
  Warnings:

  - You are about to drop the column `status` on the `Cliente` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `FunnelStage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ClientOverallStatus" AS ENUM ('Ativo', 'Ganho', 'Perdido');

-- AlterTable
ALTER TABLE "Cliente" DROP COLUMN "status",
ADD COLUMN     "currentFunnelStage" TEXT NOT NULL DEFAULT 'Contato',
ADD COLUMN     "overallStatus" "ClientOverallStatus" NOT NULL DEFAULT 'Ativo';

-- CreateIndex
CREATE UNIQUE INDEX "FunnelStage_name_key" ON "FunnelStage"("name");
