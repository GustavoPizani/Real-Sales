-- AlterTable
ALTER TABLE "Roleta" ADD COLUMN     "funnelId" TEXT;

-- AddForeignKey
ALTER TABLE "Roleta" ADD CONSTRAINT "Roleta_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
