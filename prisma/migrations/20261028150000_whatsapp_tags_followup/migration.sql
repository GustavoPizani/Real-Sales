-- Extensão do WhatsApp: etiquetas espelhadas com o WhatsApp Business e prazo do
-- próximo contato. Pode rodar mais de uma vez sem erro. Só acrescenta colunas.

ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "waLabelId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "tags_waLabelId_key" ON "tags" ("waLabelId");

ALTER TABLE "wa_links" ADD COLUMN IF NOT EXISTS "waLabels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "wa_links" ADD COLUMN IF NOT EXISTS "waLabelsSynced" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "wa_links" ADD COLUMN IF NOT EXISTS "followUpTaskId" TEXT;

-- Registro das conversas já lidas pela RIA no "Aprender com conversas".
CREATE TABLE IF NOT EXISTS "learned_conversations" (
  "id"             TEXT NOT NULL,
  "accountId"      TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "chave"          TEXT NOT NULL,
  "nome"           TEXT,
  "telefone"       TEXT,
  "analyzedAt"     TIMESTAMP(3) NOT NULL,
  "lastMessageAt"  TIMESTAMP(3),
  "lastActivityAt" TIMESTAMP(3),
  "messages"       INTEGER NOT NULL DEFAULT 0,
  "proposals"      INTEGER NOT NULL DEFAULT 0,
  "timesUsed"      INTEGER NOT NULL DEFAULT 1,
  "source"         TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "learned_conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "learned_conversations_accountId_chave_key" ON "learned_conversations" ("accountId", "chave");
ALTER TABLE "learned_conversations" ENABLE ROW LEVEL SECURITY;
