/*
  Warnings:

  - You are about to drop the column `status` on the `ActiveOffer` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ActiveOffer` table. All the data in the column will be lost.
  - You are about to drop the column `activeOfferId` on the `ActiveOfferClient` table. All the data in the column will be lost.
  - You are about to drop the column `clienteId` on the `ActiveOfferClient` table. All the data in the column will be lost.
  - You are about to drop the column `contactedAt` on the `ActiveOfferClient` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `ActiveOfferClient` table. All the data in the column will be lost.
  - The `status` column on the `ActiveOfferClient` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `corretorId` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `funnelId` on the `Cliente` table. All the data in the column will be lost.
  - Added the required column `contactName` to the `ActiveOfferClient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `offerId` to the `ActiveOfferClient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ActiveOfferClient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `Cliente` table without a default value. This is not possible if the table is not empty.
  - Added the required column `criadoPorId` to the `Cliente` table without a default value. This is not possible if the table is not empty.
  - Added the required column `funilId` to the `Cliente` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `Funnel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `Imovel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `Tag` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `Usuario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "ActiveOfferClient" DROP CONSTRAINT "ActiveOfferClient_activeOfferId_fkey";

-- DropForeignKey
ALTER TABLE "ActiveOfferClient" DROP CONSTRAINT "ActiveOfferClient_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "ActiveOfferClient" DROP CONSTRAINT "ActiveOfferClient_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "Cliente" DROP CONSTRAINT "Cliente_corretorId_fkey";

-- DropForeignKey
ALTER TABLE "Cliente" DROP CONSTRAINT "Cliente_funnelId_fkey";

-- AlterTable
ALTER TABLE "ActiveOffer" DROP COLUMN "status",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "ActiveOfferClient" DROP COLUMN "activeOfferId",
DROP COLUMN "clienteId",
DROP COLUMN "contactedAt",
DROP COLUMN "notes",
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT NOT NULL,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "offerId" TEXT NOT NULL,
ADD COLUMN     "originalClienteId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Pendente';

-- AlterTable
ALTER TABLE "Cliente" DROP COLUMN "corretorId",
DROP COLUMN "funnelId",
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "criadoPorId" TEXT NOT NULL,
ADD COLUMN     "dataNascimento" TIMESTAMP(3),
ADD COLUMN     "estado" TEXT,
ADD COLUMN     "funilId" TEXT NOT NULL,
ADD COLUMN     "origem" TEXT,
ADD COLUMN     "originUrl" TEXT,
ADD COLUMN     "proprietarioId" TEXT,
ADD COLUMN     "siteOriginId" TEXT;

-- AlterTable
ALTER TABLE "Funnel" ADD COLUMN     "accountId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Imovel" ADD COLUMN     "accountId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "accountId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subdomain" TEXT,
    "customDomain" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#000000',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "siteId" TEXT NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "pageId" TEXT NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_subdomain_key" ON "Site"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Site_customDomain_key" ON "Site"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_name_key" ON "Domain"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Page_siteId_slug_key" ON "Page"("siteId", "slug");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_proprietarioId_fkey" FOREIGN KEY ("proprietarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_funilId_fkey" FOREIGN KEY ("funilId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_siteOriginId_fkey" FOREIGN KEY ("siteOriginId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Imovel" ADD CONSTRAINT "Imovel_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveOfferClient" ADD CONSTRAINT "ActiveOfferClient_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ActiveOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveOfferClient" ADD CONSTRAINT "ActiveOfferClient_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
