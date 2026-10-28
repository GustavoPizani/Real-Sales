-- Várias vendas por cliente, com o imóvel vendido (do CRM ou de fora, com planta).
-- client_won_details continua com a soma das vendas (o dashboard lê de lá).
-- Pode rodar mais de uma vez sem erro.

CREATE TABLE IF NOT EXISTS "client_sales" (
  "id"             TEXT NOT NULL,
  "clientId"       TEXT NOT NULL,
  "propertyId"     TEXT,
  "propertyTypeId" TEXT,
  "propertyName"   TEXT,
  "unit"           TEXT,
  "typology"       TEXT,
  "area"           DOUBLE PRECISION,
  "bedrooms"       INTEGER,
  "floorPlanUrl"   TEXT,
  "saleValue"      DOUBLE PRECISION NOT NULL,
  "saleDate"       TIMESTAMP(3),
  "notes"          TEXT,
  "createdById"    TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_sales_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_sales_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "client_sales_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "client_sales_clientId_idx" ON "client_sales" ("clientId");
CREATE INDEX IF NOT EXISTS "client_sales_propertyId_idx" ON "client_sales" ("propertyId");
ALTER TABLE "client_sales" ENABLE ROW LEVEL SECURITY;

-- Ponto de partida: cada venda já registrada vira uma venda, com o imóvel de
-- interesse do cliente (a data real não existe; usa a do evento de ganho).
INSERT INTO "client_sales" ("id", "clientId", "propertyId", "saleValue", "saleDate", "notes")
SELECT gen_random_uuid()::text, w."clientId", c."propertyOfInterestId", w."saleValue",
       (SELECT COALESCE(e."effectiveAt", e."occurredAt") FROM "client_stage_events" e
         WHERE e."clientId" = w."clientId" AND e."overallStatus" = 'WON' ORDER BY e."occurredAt" DESC LIMIT 1),
       'Venda registrada antes do cadastro de várias vendas'
FROM "client_won_details" w
JOIN "clients" c ON c."id" = w."clientId"
WHERE w."saleValue" > 0
  AND NOT EXISTS (SELECT 1 FROM "client_sales" s WHERE s."clientId" = w."clientId");
