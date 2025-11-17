import { PrismaClient } from '@prisma/client';

// Declaração global para evitar múltiplas instâncias em dev
declare global {
  var prisma: PrismaClient | undefined;
}

// LÓGICA DE CONEXÃO ROBUSTA (Baseada na sua versão estável):
// Tenta encontrar a URL do banco na Vercel (database_...) ou no local (.env)
const connectionUrl =
  process.env.database_POSTGRES_PRISMA_URL || // Vercel (Produção)
  process.env.POSTGRES_PRISMA_URL ||          // .env local alternative
  process.env.DATABASE_URL;                   // Standard Default

// Verificação de segurança
if (!connectionUrl) {
  // Em build time, se não houver variável, não deve quebrar, mas logar aviso.
  // Porém, para runtime, precisamos da URL.
  if (process.env.NODE_ENV !== 'production') {
      console.warn("Aviso: Nenhuma variável de conexão de banco de dados encontrada.");
  }
}

// Inicialização PADRÃO (Sem Adapters)
export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl,
      },
    },
    // Log apenas em desenvolvimento
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Exportação padrão para garantir compatibilidade
export default prisma;