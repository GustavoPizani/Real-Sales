-- Reatribui qualquer usuário remanescente com cargo removido para BROKER
UPDATE "users" SET "role" = 'BROKER' WHERE "role" IN ('DIRECTOR', 'MANAGER');

-- Remove o default antes de trocar o tipo da coluna
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

-- Recria o enum sem DIRECTOR/MANAGER
CREATE TYPE "Role_new" AS ENUM ('MARKETING_ADMIN', 'BROKER');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- Restaura o default
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'BROKER';
