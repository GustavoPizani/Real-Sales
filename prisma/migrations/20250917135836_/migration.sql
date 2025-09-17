-- AlterTable
ALTER TABLE "Imovel" ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "updaterId" TEXT;

-- AddForeignKey
ALTER TABLE "Imovel" ADD CONSTRAINT "Imovel_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Imovel" ADD CONSTRAINT "Imovel_updaterId_fkey" FOREIGN KEY ("updaterId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
