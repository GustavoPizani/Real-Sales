/*
  Warnings:

  - You are about to drop the column `clienteId` on the `ClientWonDetails` table. All the data in the column will be lost.
  - You are about to drop the column `clienteId` on the `Tarefa` table. All the data in the column will be lost.
  - You are about to drop the column `usuarioId` on the `Tarefa` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[clientId]` on the table `ClientWonDetails` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clientId` to the `ClientWonDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `Tarefa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Tarefa` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ClientWonDetails" DROP CONSTRAINT "ClientWonDetails_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "RoletaCorretor" DROP CONSTRAINT "RoletaCorretor_corretorId_fkey";

-- DropForeignKey
ALTER TABLE "RoletaCorretor" DROP CONSTRAINT "RoletaCorretor_roletaId_fkey";

-- DropForeignKey
ALTER TABLE "Tarefa" DROP CONSTRAINT "Tarefa_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "Tarefa" DROP CONSTRAINT "Tarefa_usuarioId_fkey";

-- DropIndex
DROP INDEX "ClientWonDetails_clienteId_key";

-- AlterTable
ALTER TABLE "ClientWonDetails" DROP COLUMN "clienteId",
ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "budget" DOUBLE PRECISION,
ADD COLUMN     "preferences" TEXT;

-- AlterTable
ALTER TABLE "Tarefa" DROP COLUMN "clienteId",
DROP COLUMN "usuarioId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Nota" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldMapping" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "mappedField" TEXT NOT NULL,

    CONSTRAINT "FieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyChange" (
    "id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" JSONB NOT NULL,
    "newValue" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvedById" TEXT,

    CONSTRAINT "PropertyChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldMapping_source_fieldName_key" ON "FieldMapping"("source", "fieldName");

-- CreateIndex
CREATE UNIQUE INDEX "ClientWonDetails_clientId_key" ON "ClientWonDetails"("clientId");

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoletaCorretor" ADD CONSTRAINT "RoletaCorretor_roletaId_fkey" FOREIGN KEY ("roletaId") REFERENCES "Roleta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoletaCorretor" ADD CONSTRAINT "RoletaCorretor_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyChange" ADD CONSTRAINT "PropertyChange_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Imovel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyChange" ADD CONSTRAINT "PropertyChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyChange" ADD CONSTRAINT "PropertyChange_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientWonDetails" ADD CONSTRAINT "ClientWonDetails_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
