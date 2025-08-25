/*
  Warnings:

  - You are about to drop the column `clientId` on the `ClientWonDetails` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Nota` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Tarefa` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Tarefa` table. All the data in the column will be lost.
  - You are about to drop the `FieldMapping` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Lead` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyChange` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyTypology` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[clienteId]` on the table `ClientWonDetails` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clienteId` to the `ClientWonDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clienteId` to the `Nota` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clienteId` to the `Tarefa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usuarioId` to the `Tarefa` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ClientWonDetails" DROP CONSTRAINT "ClientWonDetails_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Nota" DROP CONSTRAINT "Nota_clientId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyChange" DROP CONSTRAINT "PropertyChange_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "PropertyChange" DROP CONSTRAINT "PropertyChange_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyChange" DROP CONSTRAINT "PropertyChange_userId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyImage" DROP CONSTRAINT "PropertyImage_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyTypology" DROP CONSTRAINT "PropertyTypology_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Tarefa" DROP CONSTRAINT "Tarefa_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Tarefa" DROP CONSTRAINT "Tarefa_userId_fkey";

-- DropIndex
DROP INDEX "ClientWonDetails_clientId_key";

-- AlterTable
ALTER TABLE "ClientWonDetails" DROP COLUMN "clientId",
ADD COLUMN     "clienteId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Nota" DROP COLUMN "clientId",
ADD COLUMN     "clienteId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tarefa" DROP COLUMN "clientId",
DROP COLUMN "userId",
ADD COLUMN     "clienteId" TEXT NOT NULL,
ADD COLUMN     "usuarioId" TEXT NOT NULL;

-- DropTable
DROP TABLE "FieldMapping";

-- DropTable
DROP TABLE "Lead";

-- DropTable
DROP TABLE "PropertyChange";

-- DropTable
DROP TABLE "PropertyImage";

-- DropTable
DROP TABLE "PropertyTypology";

-- CreateTable
CREATE TABLE "TipologiaImovel" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "area" DOUBLE PRECISION,
    "dormitorios" INTEGER,
    "suites" INTEGER,
    "vagas" INTEGER,
    "imovelId" TEXT NOT NULL,

    CONSTRAINT "TipologiaImovel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagemImovel" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imovelId" TEXT NOT NULL,

    CONSTRAINT "ImagemImovel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientWonDetails_clienteId_key" ON "ClientWonDetails"("clienteId");

-- AddForeignKey
ALTER TABLE "TipologiaImovel" ADD CONSTRAINT "TipologiaImovel_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagemImovel" ADD CONSTRAINT "ImagemImovel_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientWonDetails" ADD CONSTRAINT "ClientWonDetails_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
