-- AlterTable
-- active_offers foi criada sem createdAt/updatedAt (divergente da migração original).
ALTER TABLE "active_offers" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
-- active_offer_clients foi criada sem status/notes/contactedAt (divergente da migração original).
ALTER TABLE "active_offer_clients" ADD COLUMN     "status" "ActiveOfferClientStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "contactedAt" TIMESTAMP(3);
