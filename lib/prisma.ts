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

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : [],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Keep-alive: previne cold start do Neon mantendo a conexão quente
if (typeof setInterval !== 'undefined') {
  const KEEP_ALIVE_INTERVAL = 4 * 60 * 1000; // 4 minutos
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  if (!keepAliveTimer) {
    keepAliveTimer = setInterval(() => {
      prisma.$queryRaw`SELECT 1`.catch(() => null);
    }, KEEP_ALIVE_INTERVAL);

    if (keepAliveTimer?.unref) keepAliveTimer.unref();
  }
}