import { PrismaClient } from '@prisma/client';

// Declara uma variável global para o Prisma Client
declare global {
  var prisma: PrismaClient | undefined;
}

// LÓGICA DE CORREÇÃO: Em produção (Vercel), a variável de ambiente do Neon é prefixada.
// O código agora verifica a variável de produção primeiro, e depois a de desenvolvimento.
const connectionUrl = process.env.NODE_ENV === 'production' 
  ? process.env.database_POSTGRES_PRISMA_URL 
  : process.env.DATABASE_URL;

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