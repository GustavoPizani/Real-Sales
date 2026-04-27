-- Migrar usuários com role PRE_SALES para BROKER antes de remover o valor do enum
UPDATE "users" SET "role" = 'BROKER' WHERE "role" = 'PRE_SALES';

-- Recriar o enum Role sem PRE_SALES
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('MARKETING_ADMIN', 'DIRECTOR', 'MANAGER', 'BROKER');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING "role"::text::"Role";
DROP TYPE "Role_old";

-- Remover coluna isPreSales do Funnel
ALTER TABLE "funnels" DROP COLUMN IF EXISTS "is_pre_sales";

-- Adicionar slackMemberId ao User
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "slack_member_id" TEXT;
