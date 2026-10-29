-- Produto que o corretor está oferecendo na conversa (extensão do WhatsApp).
-- Pode rodar mais de uma vez sem erro. Só acrescenta colunas.
ALTER TABLE "wa_links" ADD COLUMN IF NOT EXISTS "offerPropertyId" TEXT;
ALTER TABLE "wa_links" ADD COLUMN IF NOT EXISTS "offerText" TEXT;
