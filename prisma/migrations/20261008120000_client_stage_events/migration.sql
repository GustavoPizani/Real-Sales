-- Histórico de etapa e status dos clientes, para o dashboard medir conversão
-- pela data em que cada etapa aconteceu.
--
-- Pode rodar mais de uma vez sem erro. Não altera nem apaga nada que já existe:
-- cria uma tabela nova, um trigger na tabela clients e preenche o ponto de
-- partida com o estado atual de cada cliente.

CREATE TABLE IF NOT EXISTS "client_stage_events" (
  "id"            TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "clientId"      TEXT NOT NULL,
  "funnelId"      TEXT NOT NULL,
  "funnelStageId" TEXT NOT NULL,
  "overallStatus" "ClientOverallStatus" NOT NULL,
  "occurredAt"    TIMESTAMP(3) NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  "effectiveAt"   TIMESTAMP(3),
  "isBackfill"    BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "client_stage_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_stage_events_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "client_stage_events_clientId_idx" ON "client_stage_events" ("clientId");
CREATE INDEX IF NOT EXISTS "client_stage_events_occurredAt_idx" ON "client_stage_events" ("occurredAt");

-- Sem policies: a tabela fica fechada para as chaves públicas do Supabase.
-- A aplicação lê pelo Prisma, que conecta como dono do banco.
ALTER TABLE "client_stage_events" ENABLE ROW LEVEL SECURITY;

-- Grava uma linha sempre que o cliente é criado ou muda de etapa, funil ou status.
-- SECURITY DEFINER: o registro funciona mesmo quando a alteração vem de um
-- papel que não tem acesso direto à tabela de histórico.
CREATE OR REPLACE FUNCTION log_client_stage_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW."funnelStageId" IS DISTINCT FROM OLD."funnelStageId"
     OR NEW."funnelId" IS DISTINCT FROM OLD."funnelId"
     OR NEW."overallStatus" IS DISTINCT FROM OLD."overallStatus" THEN
    INSERT INTO "client_stage_events" ("clientId", "funnelId", "funnelStageId", "overallStatus")
    VALUES (NEW."id", NEW."funnelId", NEW."funnelStageId", NEW."overallStatus");
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "client_stage_event_trigger" ON "clients";
CREATE TRIGGER "client_stage_event_trigger"
  AFTER INSERT OR UPDATE ON "clients"
  FOR EACH ROW EXECUTE FUNCTION log_client_stage_event();

-- Ponto de partida: uma linha por cliente com a etapa e o status de hoje,
-- datada da última atualização do cliente (a data real da mudança não existe).
INSERT INTO "client_stage_events" ("clientId", "funnelId", "funnelStageId", "overallStatus", "occurredAt", "isBackfill")
SELECT c."id", c."funnelId", c."funnelStageId", c."overallStatus", c."updatedAt", true
FROM "clients" c
WHERE NOT EXISTS (SELECT 1 FROM "client_stage_events" e WHERE e."clientId" = c."id");
