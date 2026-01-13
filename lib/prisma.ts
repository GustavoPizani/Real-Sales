import { PrismaClient } from '@prisma/client';

// Declara uma variável global para o Prisma Client para evitar múltiplas
// instâncias em ambiente de desenvolvimento com hot-reloading.
declare global {
  var prisma: PrismaClient | undefined;
}

// A Vercel e ambientes locais modernos configuram a DATABASE_URL automaticamente.
// Simplificar para usar apenas a variável de ambiente padrão melhora a portabilidade.
const connectionUrl = process.env.DATABASE_URL;

// Lança um erro claro se a URL de conexão não for encontrada.
if (!connectionUrl) {
  throw new Error("A variável de ambiente DATABASE_URL não foi encontrada. Verifique seu arquivo .env ou as configurações do seu provedor de hospedagem.");
}

// Exporta uma única instância do Prisma Client.
// Usa a instância global em desenvolvimento, ou cria uma nova em produção.
export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl,
      },
    },
    // Opcional: Log de queries em ambiente de desenvolvimento.
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

// Em desenvolvimento, atribui a instância ao objeto global para evitar
// criar múltiplas instâncias durante o hot-reloading.
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}