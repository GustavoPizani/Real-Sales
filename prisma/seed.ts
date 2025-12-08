// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs' // ou sua lib de hash preferida

const prisma = new PrismaClient()

async function main() {
  // 1. Criar a Conta da Headquarters (Sua empresa)
  const adminAccount = await prisma.account.upsert({
    where: { id: 'headquarters-id-fixed' }, // Use um UUID fixo se quiser
    update: {},
    create: {
      id: 'headquarters-id-fixed',
      name: 'Real Sales Administration',
      isActive: true,
    },
  })

  // 2. Criar o Super Usuário
  const passwordHash = await hash('Piz@nig7p', 10) // Hash seguro

  const superAdmin = await prisma.usuario.upsert({
    where: { email: 'adm@realsales.com.br' },
    update: {
      passwordHash,
      isSuperAdmin: true,
      role: 'ADMIN' // Assume o papel mais alto local
    },
    create: {
      email: 'adm@realsales.com.br',
      nome: 'ADM Real Sales',
      passwordHash,
      role: 'ADMIN',
      isSuperAdmin: true, // O Segredo do sucesso
      accountId: adminAccount.id
    },
  })

  // 3. Criar a conta para o primeiro Tenant (VBrokers)
  const vbrokersAccount = await prisma.account.upsert({
    where: { id: 'vbrokers-account-id' }, // ID fixo para a conta VBrokers
    update: {},
    create: {
      id: 'vbrokers-account-id',
      name: 'VBrokers',
      isActive: true,
    },
  })

  // 4. Criar o usuário Administrador para a conta VBrokers
  // A senha é a mesma do superadmin, então reutilizamos o hash.
  const vbrokersAdmin = await prisma.usuario.upsert({
    where: { email: 'pizani@vbrokers.com.br' },
    update: {
      passwordHash,
    },
    create: {
      email: 'pizani@vbrokers.com.br',
      nome: 'Admin VBrokers',
      passwordHash,
      role: 'ADMIN', // Administrador dentro da sua própria conta
      isSuperAdmin: false, // Importante: não é um super admin do sistema todo
      accountId: vbrokersAccount.id, // Associado à conta VBrokers
    },
  })

  console.log({ adminAccount, superAdmin, vbrokersAccount, vbrokersAdmin })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect()
    process.exit(1);
  })