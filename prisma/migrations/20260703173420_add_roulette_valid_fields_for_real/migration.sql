-- AlterTable
-- Estas colunas já constavam na migration 20260112205212_add_field_mapping_model,
-- mas nunca existiram de fato no banco (baseline aplicado sem execução real).
ALTER TABLE "lead_roulettes" ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP(3);
ALTER TABLE "lead_roulettes" ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3);
ALTER TABLE "lead_roulettes" ADD COLUMN IF NOT EXISTS "lastAssignedIndex" INTEGER NOT NULL DEFAULT 0;
