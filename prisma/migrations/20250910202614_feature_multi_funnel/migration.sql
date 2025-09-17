/*
  Warnings:

  - You are about to drop the column `currentFunnelStage` on the `Cliente` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[funnelId,name]` on the table `FunnelStage` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `funnelId` to the `Cliente` table without a default value. This is not possible if the table is not empty.
  - Added the required column `funnelStageId` to the `Cliente` table without a default value. This is not possible if the table is not empty.
  - Added the required column `funnelId` to the `FunnelStage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `FunnelStage` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FunnelAccessLevel" AS ENUM ('full', 'readonly');

-- CreateEnum
CREATE TYPE "ActiveOfferStatus" AS ENUM ('Pendente', 'EmAndamento', 'Concluida');

-- CreateEnum
CREATE TYPE "ActiveOfferClientStatus" AS ENUM ('Pendente', 'Contactado', 'NaoAtendeu', 'Descartado');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'pre_vendas';

-- DropForeignKey
ALTER TABLE "Cliente" DROP CONSTRAINT "Cliente_corretorId_fkey";

-- DropIndex
DROP INDEX "FunnelStage_name_key";

-- AlterTable
ALTER TABLE "Cliente" DROP COLUMN "currentFunnelStage",
ADD COLUMN     "funnelId" TEXT NOT NULL,
ADD COLUMN     "funnelStageId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FunnelStage" ADD COLUMN     "funnelId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "ActiveOffer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ActiveOfferStatus" NOT NULL DEFAULT 'Pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ActiveOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveOfferClient" (
    "id" TEXT NOT NULL,
    "status" "ActiveOfferClientStatus" NOT NULL DEFAULT 'Pendente',
    "notes" TEXT,
    "contactedAt" TIMESTAMP(3),
    "activeOfferId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,

    CONSTRAINT "ActiveOfferClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funnel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefaultEntry" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFunnelAccess" (
    "userId" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "accessLevel" "FunnelAccessLevel" NOT NULL,

    CONSTRAINT "UserFunnelAccess_pkey" PRIMARY KEY ("userId","funnelId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Funnel_name_key" ON "Funnel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelStage_funnelId_name_key" ON "FunnelStage"("funnelId", "name");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_funnelStageId_fkey" FOREIGN KEY ("funnelStageId") REFERENCES "FunnelStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveOffer" ADD CONSTRAINT "ActiveOffer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveOfferClient" ADD CONSTRAINT "ActiveOfferClient_activeOfferId_fkey" FOREIGN KEY ("activeOfferId") REFERENCES "ActiveOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveOfferClient" ADD CONSTRAINT "ActiveOfferClient_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveOfferClient" ADD CONSTRAINT "ActiveOfferClient_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelStage" ADD CONSTRAINT "FunnelStage_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFunnelAccess" ADD CONSTRAINT "UserFunnelAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFunnelAccess" ADD CONSTRAINT "UserFunnelAccess_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
