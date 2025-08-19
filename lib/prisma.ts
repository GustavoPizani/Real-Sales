// lib/prisma.ts

import { PrismaClient } from '@prisma/client'

// Esta declaração evita que múltiplas instâncias do Prisma Client sejam
// criadas em ambiente de desenvolvimento devido ao hot-reloading.
declare global {
  var prisma: PrismaClient | undefined
}

const prisma = global.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma
