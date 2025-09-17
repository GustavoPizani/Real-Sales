-- CreateEnum
CREATE TYPE "StatusQualificacao" AS ENUM ('Aguardando', 'NoBolsaoPrioritario', 'NoBolsaoGeral', 'Atribuido');

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "entrouNoBolsaoEm" TIMESTAMP(3),
ADD COLUMN     "qualificadoParaId" TEXT,
ADD COLUMN     "statusDeQualificacao" "StatusQualificacao" NOT NULL DEFAULT 'Aguardando';

-- CreateTable
CREATE TABLE "ConfiguracaoBolsao" (
    "id" TEXT NOT NULL,
    "raioAtribuicaoMetros" INTEGER NOT NULL DEFAULT 5000,
    "tempoAteBolsaoPrioritarioMinutos" INTEGER NOT NULL DEFAULT 60,
    "tempoAteBolsaoGeralMinutos" INTEGER NOT NULL DEFAULT 120,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoBolsao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bolsao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Bolsao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BolsaoUsuario" (
    "bolsaoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "BolsaoUsuario_pkey" PRIMARY KEY ("bolsaoId","usuarioId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bolsao_nome_key" ON "Bolsao"("nome");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_qualificadoParaId_fkey" FOREIGN KEY ("qualificadoParaId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BolsaoUsuario" ADD CONSTRAINT "BolsaoUsuario_bolsaoId_fkey" FOREIGN KEY ("bolsaoId") REFERENCES "Bolsao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BolsaoUsuario" ADD CONSTRAINT "BolsaoUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
