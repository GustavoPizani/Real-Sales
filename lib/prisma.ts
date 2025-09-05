import { PrismaClient } from '@prisma/client';

// Declara uma variável global para o Prisma Client
declare global {
  var prisma: PrismaClient | undefined;
}

// LÓGICA DE CORREÇÃO:
// 1. Procura pela variável de ambiente específica da Vercel (`database_POSTGRES_PRISMA_URL`).
// 2. Se não encontrar, procura pela variável padrão (`DATABASE_URL`) usada localmente.
const connectionUrl = process.env.database_POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

// Lança um erro se nenhuma das variáveis de conexão for encontrada.
if (!connectionUrl) {
  throw new Error("A variável de ambiente do banco de dados (DATABASE_URL ou database_POSTGRES_PRISMA_URL) não foi encontrada.");
}

// Exporta a instância do Prisma como uma constante nomeada
export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

// Em desenvolvimento, atribui a instância ao objeto global para evitar
// criar múltiplas instâncias durante o hot-reloading.
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}