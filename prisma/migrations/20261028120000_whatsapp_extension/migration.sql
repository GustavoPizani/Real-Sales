-- Extensão do WhatsApp: vínculo conversa ↔ cliente, sugestões da RIA (com o
-- que foi feito de cada uma) e base de conhecimento.
--
-- Pode rodar mais de uma vez sem erro. Só cria tabelas novas.

CREATE TABLE IF NOT EXISTS "wa_links" (
  "id"           TEXT NOT NULL,
  "accountId"    TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "waChatId"     TEXT NOT NULL,
  "phone"        TEXT,
  "contactName"  TEXT,
  "clientId"     TEXT,
  "notClient"    BOOLEAN NOT NULL DEFAULT false,
  "messages"     JSONB NOT NULL DEFAULT '[]',
  "lastClientAt" TIMESTAMP(3),
  "lastBrokerAt" TIMESTAMP(3),
  "lastSide"     TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wa_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wa_links_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "wa_links_userId_waChatId_key" ON "wa_links" ("userId", "waChatId");
CREATE INDEX IF NOT EXISTS "wa_links_clientId_idx" ON "wa_links" ("clientId");

CREATE TABLE IF NOT EXISTS "ai_suggestions" (
  "id"          TEXT NOT NULL,
  "accountId"   TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "linkId"      TEXT NOT NULL,
  "request"     TEXT,
  "context"     TEXT,
  "options"     JSONB NOT NULL,
  "chosenIndex" INTEGER,
  "outcome"     TEXT NOT NULL DEFAULT 'pending',
  "sentText"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"  TIMESTAMP(3),
  CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_suggestions_linkId_fkey"
    FOREIGN KEY ("linkId") REFERENCES "wa_links"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ai_suggestions_accountId_createdAt_idx" ON "ai_suggestions" ("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS "ai_suggestions_linkId_outcome_idx" ON "ai_suggestions" ("linkId", "outcome");

CREATE TABLE IF NOT EXISTS "knowledge_items" (
  "id"        TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "kind"      TEXT NOT NULL,
  "situation" TEXT,
  "answer"    TEXT NOT NULL,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "source"    TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "knowledge_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "knowledge_items_accountId_kind_idx" ON "knowledge_items" ("accountId", "kind");

-- Sem policies: fechadas para as chaves públicas do Supabase.
-- A aplicação lê e grava pelo Prisma, que conecta como dono do banco.
ALTER TABLE "wa_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_suggestions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "knowledge_items" ENABLE ROW LEVEL SECURITY;
