import { PrismaClient } from '@prisma/client';

// Declara uma variável global para o Prisma Client
declare global {
  var prisma: PrismaClient | undefined;
}

// Exporta a instância do Prisma como uma constante nomeada
export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ['query'],
  });

// Em desenvolvimento, atribui a instância ao objeto global para evitar
// criar múltiplas instâncias durante o hot-reloading.
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
