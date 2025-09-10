/*
  Warnings:

  - You are about to drop the column `budget` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `preferences` on the `Cliente` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Cliente" DROP COLUMN "budget",
DROP COLUMN "preferences";

-- CreateTable
CREATE TABLE "DocumentoCliente" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" TEXT NOT NULL,

    CONSTRAINT "DocumentoCliente_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DocumentoCliente" ADD CONSTRAINT "DocumentoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
