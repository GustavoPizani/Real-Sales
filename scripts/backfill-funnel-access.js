// Backfill único: libera acesso a cada funil para os corretores que já têm
// clientes nele, evitando que o pipeline apareça vazio quando o controle de
// acesso por funil (UserFunnelAccess) entrar em vigor.
// Uso: node scripts/backfill-funnel-access.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pairs = await prisma.client.findMany({
    distinct: ['brokerId', 'funnelId'],
    select: { brokerId: true, funnelId: true },
  });

  console.log(`[backfill] ${pairs.length} combinações corretor/funil encontradas.`);

  let created = 0;
  for (const { brokerId, funnelId } of pairs) {
    if (!brokerId || !funnelId) continue;
    const result = await prisma.userFunnelAccess.upsert({
      where: { userId_funnelId: { userId: brokerId, funnelId } },
      update: {},
      create: { userId: brokerId, funnelId, accessLevel: 'FULL' },
    });
    created++;
  }

  console.log(`[backfill] ${created} concessões de acesso garantidas.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
