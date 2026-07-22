-- Rastreia qual roleta efetivamente atribuiu cada lead, pra contagem
-- "leads recebidos" na tela de Roleta parar de usar o funil como proxy.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "roletaId" TEXT;
CREATE INDEX IF NOT EXISTS "clients_roletaId_idx" ON "clients"("roletaId");
