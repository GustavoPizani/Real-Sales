-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "clients_accountId_idx" ON "clients"("accountId");

-- CreateIndex
CREATE INDEX "clients_brokerId_idx" ON "clients"("brokerId");

-- CreateIndex
CREATE INDEX "clients_funnelId_idx" ON "clients"("funnelId");

-- CreateIndex
CREATE INDEX "clients_funnelStageId_idx" ON "clients"("funnelStageId");

-- CreateIndex
CREATE INDEX "clients_createdById_idx" ON "clients"("createdById");

-- CreateIndex
CREATE INDEX "lead_roulettes_funnelId_idx" ON "lead_roulettes"("funnelId");

-- CreateIndex
CREATE INDEX "notes_clientId_idx" ON "notes"("clientId");

-- CreateIndex
CREATE INDEX "property_types_propertyId_idx" ON "property_types"("propertyId");

-- CreateIndex
CREATE INDEX "users_accountId_idx" ON "users"("accountId");

-- CreateIndex
CREATE INDEX "users_supervisorId_idx" ON "users"("supervisorId");

