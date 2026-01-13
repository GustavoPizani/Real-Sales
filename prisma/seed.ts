// prisma/seed.ts
import { PrismaClient, Role, PropertyStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // 1. Create Super Admin (Gustavo)
  const gustavo = await prisma.user.upsert({
    where: { email: 'pizanicorretor@gmail.com' },
    update: {},
    create: {
      id: '7604095e-fd39-466b-96fc-e2e24602375a', // O UID que geramos no Supabase
      name: 'Gustavo Pizani',
      email: 'pizanicorretor@gmail.com',
      role: Role.MARKETING_ADMIN,
      accountId: 'main_account',
    },
  })

  // 2. Create a Sample Funnel
  const salesFunnel = await prisma.funnel.upsert({
    where: { name: 'Vendas Imóveis' },
    update: {
    },
    create: {
      name: 'Vendas Imóveis',
      stages: {
        create: [
          { name: 'Novo Lead', order: 1, color: '#3b82f6' },
          { name: 'Contato Feito', order: 2, color: '#f59e0b' },
          { name: 'Visita Agendada', order: 3, color: '#10b981' },
          { name: 'Proposta', order: 4, color: '#8b5cf6' },
        ],
      },
    },
    include: { stages: true }
  })

  // 3. Create a Sample Property
  const sampleProperty = await prisma.property.upsert({
    where: { id: 'sample-property-1' },
    update: {
    },
    create: {
      id: 'sample-property-1',
      title: 'Residencial Eden',
      address: 'Rua das Flores, 123',
      price: 450000,
      status: PropertyStatus.AVAILABLE,
      areaSqMeters: 75,
      bedrooms: 3,
      bathrooms: 2,
    }
  })

  console.log('✅ Seed finished successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })