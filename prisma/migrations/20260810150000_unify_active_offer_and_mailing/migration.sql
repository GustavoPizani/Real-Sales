-- Nova origem da campanha (clientes internos perdidos vs planilha externa)
CREATE TYPE "ActiveOfferSource" AS ENUM ('INTERNAL_CLIENTS', 'MAILING_UPLOAD');

ALTER TABLE "active_offers" ADD COLUMN     "source" "ActiveOfferSource" NOT NULL DEFAULT 'INTERNAL_CLIENTS';
ALTER TABLE "active_offers" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "active_offers" ADD COLUMN     "accountId" TEXT;
UPDATE "active_offers" ao SET "accountId" = u."accountId" FROM "users" u WHERE u.id = ao."createdById";

-- ActiveOfferClient vira o formato genérico: dados denormalizados + clientId
-- opcional, absorvendo o papel do MailingContact que estamos removendo.
ALTER TABLE "active_offer_clients" ADD COLUMN     "fullName" TEXT;
ALTER TABLE "active_offer_clients" ADD COLUMN     "email" TEXT;
ALTER TABLE "active_offer_clients" ADD COLUMN     "phone" TEXT;
UPDATE "active_offer_clients" aoc SET "fullName" = c."fullName", "email" = c.email, "phone" = c.phone
  FROM "clients" c WHERE c.id = aoc."clientId";
ALTER TABLE "active_offer_clients" ALTER COLUMN "fullName" SET NOT NULL;

ALTER TABLE "active_offer_clients" DROP CONSTRAINT "active_offer_clients_clientId_fkey";
ALTER TABLE "active_offer_clients" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "active_offer_clients" ADD CONSTRAINT "active_offer_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "active_offer_clients" DROP CONSTRAINT "active_offer_clients_assignedToId_fkey";
ALTER TABLE "active_offer_clients" RENAME COLUMN "assignedToId" TO "claimedById";
ALTER TABLE "active_offer_clients" ALTER COLUMN "claimedById" DROP NOT NULL;
ALTER TABLE "active_offer_clients" ADD CONSTRAINT "active_offer_clients_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "active_offer_clients" ADD COLUMN     "claimedAt" TIMESTAMP(3);

CREATE INDEX "active_offer_clients_activeOfferId_idx" ON "active_offer_clients"("activeOfferId");
CREATE INDEX "active_offer_clients_status_idx" ON "active_offer_clients"("status");
CREATE INDEX "active_offer_clients_clientId_idx" ON "active_offer_clients"("clientId");

-- Mailing nunca teve dado real enviado — remove.
DROP TABLE "mailing_contacts";
DROP TABLE "mailing_lists";
DROP TYPE "MailingContactStatus";
