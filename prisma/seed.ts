// prisma/seed.ts
import { PrismaClient, StatusImovel } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const brandColors = ['#010f27', '#aa8d44', '#023863']; // Primary, Secondary, Tertiary

const funnelStagesData = [
  { name: 'Contato', order: 0 },
  { name: 'Diagnóstico', order: 1 },
  { name: 'Agendado', order: 2 },
  { name: 'Visitado', order: 3 },
  { name: 'Proposta', order: 4 },
  { name: 'Contrato', order: 5 },
].map((stage, index) => ({
  ...stage,
  color: brandColors[index % brandColors.length],
}));

async function main() {
  console.log('Iniciando o seeding...');
  
  const defaultPassword = await bcrypt.hash('591190', 12);

  // 1. Cria o Admin
  const admin = await prisma.usuario.upsert({
    where: { email: 'pizaniadm@realsales.com.br' },
    update: {},
    create: {
      nome: 'Pizani Admin',
      email: 'pizaniadm@realsales.com.br',
      passwordHash: await bcrypt.hash('198431', 12),
      role: 'marketing_adm',
    },
  });

  // 2. Cria a Diretora
  const thaina = await prisma.usuario.upsert({
    where: { email: 'thaina@realsales.com.br' },
    update: {},
    create: {
      nome: 'Thaina',
      email: 'thaina@realsales.com.br',
      passwordHash: defaultPassword,
      role: 'diretor',
    },
  });

  // 3. Cria o Gerente, subordinado à Diretora
  const herculano = await prisma.usuario.upsert({
    where: { email: 'herculano@realsales.com.br' },
    update: {},
    create: {
      nome: 'Herculano',
      email: 'herculano@realsales.com.br',
      passwordHash: defaultPassword,
      role: 'gerente',
      superiorId: thaina.id,
    },
  });

  // 4. Cria o Corretor, subordinado ao Gerente
  const gustavo = await prisma.usuario.upsert({
    where: { email: 'gustavo@realsales.com.br' },
    update: {},
    create: {
      nome: 'Gustavo',
      email: 'gustavo@realsales.com.br',
      passwordHash: defaultPassword,
      role: 'corretor',
      superiorId: herculano.id,
    },
  });
  
  console.log('Usuários criados/atualizados:', { admin, thaina, herculano, gustavo });

  // 5. Cria o novo Imóvel "Escape Eden" (LÓGICA CORRIGIDA)
  let escapeEdenProperty = await prisma.imovel.findFirst({
    where: { titulo: "Escape Eden - Cyrela" },
  });

  if (!escapeEdenProperty) {
    escapeEdenProperty = await prisma.imovel.create({
      data: {
        titulo: "Escape Eden - Cyrela",
        descricao: "Entre a natureza e o extraordinário, nasce um refúgio na cidade do futuro. Um paraíso particular da Cyrela no Brooklin, com design que encanta os sentidos e um parque de 12 mil m².",
        endereco: "Avenida Roque Petroni Júnior, 576 - Brooklin, São Paulo - SP",
        status: StatusImovel.Disponivel,
        tipo: "Empreendimento",
        preco: 1358004, // Valor "A partir de" como referência
      }
    });
    console.log(`Imóvel criado: ${escapeEdenProperty.titulo}`);
  } else {
    console.log(`Imóvel "${escapeEdenProperty.titulo}" já existe.`);
  }

  // 6. Adiciona as tipologias ao imóvel "Escape Eden"
  await prisma.tipologiaImovel.createMany({
    data: [
      { nome: 'Apartamento 50m²', valor: 1045729, area: 50, dormitorios: 1, suites: 0, vagas: 1, imovelId: escapeEdenProperty.id },
      { nome: 'Apartamento 74m²', valor: 1215589, area: 74, dormitorios: 2, suites: 1, vagas: 1, imovelId: escapeEdenProperty.id },
      { nome: 'Apartamento 94m²', valor: 1630264, area: 94, dormitorios: 3, suites: 1, vagas: 1, imovelId: escapeEdenProperty.id },
      { nome: 'Apartamento 94m² (2 Suítes)', valor: 2047223, area: 94, dormitorios: 2, suites: 2, vagas: 2, imovelId: escapeEdenProperty.id },
    ],
    skipDuplicates: true,
  });
  console.log('Tipologias do imóvel Escape Eden criadas/verificadas.');

  // 7. Adiciona a cliente Nelma, atribuída ao corretor Gustavo e interessada no Escape Eden
  if (gustavo) {
    await prisma.cliente.upsert({
      where: { email: 'nelmaaguiadourada@gmail.com' },
      update: {
        imovelDeInteresseId: escapeEdenProperty.id,
      },
      create: {
        nomeCompleto: 'Nelma',
        email: 'nelmaaguiadourada@gmail.com',
        telefone: '+5514991210778',
        currentFunnelStage: 'Contato',
        overallStatus: 'Ativo',
        corretorId: gustavo.id,
        imovelDeInteresseId: escapeEdenProperty.id,
      }
    });
    console.log('Cliente Nelma criada e atribuída a Gustavo com interesse no imóvel Escape Eden.');
  }

  // 8. Cria os estágios do funil
  console.log('Criando/atualizando estágios do funil...');
  for (const stage of funnelStagesData) {
    const funnelStage = await prisma.funnelStage.upsert({
      where: { name: stage.name },
      update: {},
      create: {
        name: stage.name,
        order: stage.order,
        color: stage.color,
      },
    });
    console.log(`Estágio do funil criado/atualizado: ${funnelStage.name}`);
  }

  // 9. Inicializa as configurações dos cargos
  await prisma.roleSetting.upsert({
    where: { roleName: 'diretor' },
    update: {},
    create: { roleName: 'diretor', isActive: true },
  });

  await prisma.roleSetting.upsert({
    where: { roleName: 'gerente' },
    update: {},
    create: { roleName: 'gerente', isActive: true },
  });

  console.log('Configurações de cargos inicializadas.');
  console.log('Seeding finalizado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });