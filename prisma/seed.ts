// prisma/seed.ts
import { PrismaClient, StatusImovel, Role, FunnelAccessLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando o seeding...');
  
  const adminPasswordHash = await bcrypt.hash('198431', 12);
  const defaultPasswordHash = await bcrypt.hash('591190', 12);

  // 1. Cria o Admin
  const admin = await prisma.usuario.upsert({
    where: { email: 'pizaniadm@realsales.com.br' },
    update: {
      nome: 'Pizani Luis',
      passwordHash: adminPasswordHash,
    },
    create: {
      nome: 'Pizani Luis',
      email: 'pizaniadm@realsales.com.br',
      passwordHash: adminPasswordHash,
      role: 'marketing_adm',
    },
  });

  // 2. Cria a Diretora
  const thaina = await prisma.usuario.upsert({
    where: { email: 'thaina@realsales.com.br' },
    update: {
      passwordHash: defaultPasswordHash,
    },
    create: {
      nome: 'Thaina',
      email: 'thaina@realsales.com.br',
      passwordHash: defaultPasswordHash,
      role: 'diretor',
    },
  });

  // 3. Cria o Gerente, subordinado à Diretora
  const herculano = await prisma.usuario.upsert({
    where: { email: 'herculano@realsales.com.br' },
    update: {
      passwordHash: defaultPasswordHash,
    },
    create: {
      nome: 'Herculano',
      email: 'herculano@realsales.com.br',
      passwordHash: defaultPasswordHash,
      role: 'gerente',
      superiorId: thaina.id,
    },
  });

  // 4. Cria o Corretor, subordinado ao Gerente
  const gustavo = await prisma.usuario.upsert({
    where: { email: 'gustavo@realsales.com.br' },
    update: {
      passwordHash: defaultPasswordHash,
    },
    create: {
      nome: 'Gustavo',
      email: 'gustavo@realsales.com.br',
      passwordHash: defaultPasswordHash,
      role: 'corretor',
      superiorId: herculano.id,
    },
  });
  
  // 5. Cria o SDR (Pré-Vendas), subordinado ao Admin
  const mia = await prisma.usuario.upsert({
    where: { email: 'mia@realsales.com.br' },
    update: {
      passwordHash: defaultPasswordHash,
    },
    create: {
      nome: 'Mia',
      email: 'mia@realsales.com.br',
      passwordHash: defaultPasswordHash,
      role: 'pre_vendas',
      superiorId: admin.id,
    },
  });
  console.log('Usuários criados/atualizados:', { admin, thaina, herculano, gustavo, mia });

  // Define a estrutura do seu funil principal
  const brandColors = ['#010f27', '#aa8d44', '#023863'];
  const mainFunnelStagesData = [
    { name: 'Contato', order: 1, color: brandColors[0] },
    { name: 'Diagnóstico', order: 2, color: brandColors[1] },
    { name: 'Agendado', order: 3, color: brandColors[2] },
    { name: 'Visitado', order: 4, color: brandColors[0] },
    { name: 'Proposta', order: 5, color: brandColors[1] },
    { name: 'Contrato', order: 6, color: brandColors[2] },
  ];

  // 6. Cria os Funis e suas Etapas
  console.log('Criando Funis e Etapas...');

  // Funil de Pré-Vendas (será o padrão de entrada)
  const preVendasFunnel = await prisma.funnel.upsert({
    where: { name: 'Pré-Vendas' },
    update: {},
    create: {
      name: 'Pré-Vendas',
      isDefaultEntry: true, // Define como funil de entrada padrão
      stages: {
        create: [
          { name: 'Novo Lead', order: 1, color: brandColors[0] },
          { name: 'Em Qualificação', order: 2, color: brandColors[1] },
          { name: 'Qualificado', order: 3, color: brandColors[2] },
        ]
      }
    },
    include: { stages: true }
  });
  console.log(`Funil "${preVendasFunnel.name}" criado com ${preVendasFunnel.stages.length} etapas.`);

  // Funil de Vendas Principal
  const vendasFunnel = await prisma.funnel.upsert({
    where: { name: 'Vendas Principal' },
    update: {},
    create: {
      name: 'Vendas Principal',
      isDefaultEntry: false,
      stages: { create: mainFunnelStagesData }
    },
    include: { stages: true }
  });
  console.log(`Funil "${vendasFunnel.name}" criado com ${vendasFunnel.stages.length} etapas.`);

  // Obter a primeira etapa do funil de entrada padrão
  const firstStageOfDefaultFunnel = preVendasFunnel.stages.find(s => s.order === 1);
  if (!firstStageOfDefaultFunnel) {
    throw new Error("Não foi possível encontrar a primeira etapa do funil de Pré-Vendas.");
  }

  // 7. Cria o novo Imóvel "Escape Eden"
  let escapeEdenProperty = await prisma.imovel.findFirst({
    where: { titulo: "Escape Eden - Cyrela" },
  });

  const escapeEdenFeatures = [
    "Brinquedoteca", "Elevador social", "Academia", "Lounge", "Piscina adulto",
    "Piscina infantil", "Piscina com raia", "Portaria", "Bar", "Sauna", "Segurança", "Spa", "Terraço"
  ];

  if (!escapeEdenProperty) {
    escapeEdenProperty = await prisma.imovel.create({
      data: {
        titulo: "Escape Eden - Cyrela",
        features: escapeEdenFeatures,
        endereco: "Avenida Roque Petroni Júnior, 576 - Brooklin, São Paulo - SP",
        status: StatusImovel.Disponivel,
        tipo: "Empreendimento",
        preco: 1358004,
      }
    });
    console.log(`Imóvel criado: ${escapeEdenProperty.titulo}`);
  } else {
    escapeEdenProperty = await prisma.imovel.update({
        where: { id: escapeEdenProperty.id },
        data: { features: escapeEdenFeatures }
    });
    console.log(`Imóvel "${escapeEdenProperty.titulo}" já existe. Features atualizadas.`);
  }

  // 8. Adiciona as tipologias ao imóvel "Escape Eden"
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

  // 9. Adiciona a cliente Nelma
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
        corretorId: gustavo.id,
        imovelDeInteresseId: escapeEdenProperty.id,
        // Associa o cliente ao funil e à etapa corretos
        funnelId: firstStageOfDefaultFunnel.funnelId,
        funnelStageId: firstStageOfDefaultFunnel.id,
      }
    });
    console.log('Cliente Nelma criada e atribuída a Gustavo com interesse no imóvel Escape Eden.');
  }

  // 10. Atribui permissões de acesso aos funis
  console.log('Atribuindo permissões de acesso aos funis...');
  // Dar acesso total ao funil de vendas para o corretor Gustavo
  await prisma.userFunnelAccess.upsert({
    where: { userId_funnelId: { userId: gustavo.id, funnelId: vendasFunnel.id } },
    update: {},
    create: { userId: gustavo.id, funnelId: vendasFunnel.id, accessLevel: FunnelAccessLevel.full }
  });
  console.log(`Permissão de acesso total ao funil "${vendasFunnel.name}" para o usuário ${gustavo.nome}.`);
  
  // Dar acesso total ao funil de Pré-Vendas para a SDR Mia
  await prisma.userFunnelAccess.upsert({
    where: { userId_funnelId: { userId: mia.id, funnelId: preVendasFunnel.id } },
    update: {},
    create: { userId: mia.id, funnelId: preVendasFunnel.id, accessLevel: FunnelAccessLevel.full }
  });
  console.log(`Permissão de acesso total ao funil "${preVendasFunnel.name}" para a usuária ${mia.nome}.`);

  // Dar acesso de APENAS LEITURA do funil de Vendas para a SDR Mia
  await prisma.userFunnelAccess.upsert({
    where: { userId_funnelId: { userId: mia.id, funnelId: vendasFunnel.id } },
    update: {},
    create: { userId: mia.id, funnelId: vendasFunnel.id, accessLevel: FunnelAccessLevel.readonly }
  });
  console.log(`Permissão de leitura ao funil "${vendasFunnel.name}" para a usuária ${mia.nome}.`);

  // 11. Inicializa as configurações dos cargos (mantido como estava)
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