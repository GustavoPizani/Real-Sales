-- Imóvel padrão de uma campanha (ex.: mailing de um empreendimento específico) —
-- pré-preenche o imóvel de interesse na hora de classificar como "interessado".
ALTER TABLE "active_offers" ADD COLUMN     "defaultPropertyOfInterestId" TEXT;
ALTER TABLE "active_offers" ADD CONSTRAINT "active_offers_defaultPropertyOfInterestId_fkey" FOREIGN KEY ("defaultPropertyOfInterestId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
