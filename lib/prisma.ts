import { PrismaClient } from '@prisma/client'
import { Pool } from '@neondatabase/serverless'
import { PrismaNeon } from '@neondatabase/serverless-adapter'

// Declara uma variável global para o Prisma Client
declare global {
  var prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  // Em produção, usa o adapter do Neon/Vercel.
  // A URL de conexão é lida diretamente pelo adapter a partir das variáveis de ambiente da Vercel.
  const pool = new Pool({ connectionString: process.env.database_POSTGRES_PRISMA_URL })
  const adapter = new PrismaNeon(pool)
  prisma = new PrismaClient({ adapter })
} else {
  // Em desenvolvimento, reutiliza a instância do Prisma para evitar múltiplas conexões.
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query'],
    })
  }
  prisma = global.prisma
}

export { prisma }