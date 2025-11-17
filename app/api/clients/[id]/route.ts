// app/api/clients/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Prisma, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Função auxiliar para buscar cliente com detalhes
async function getClientWithDetails(id: string) {
  return await prisma.cliente.findUnique({
    where: { id },
    include: {
      proprietario: {
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          superior: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
      // ✅ Corrigido para incluir as tipologias do imóvel de interesse
      imovelDeInteresse: {
        include: {
          tipologias: true,
        },
      },
      funnel: {
        select: {
          name: true,
        },
      },
      funnelStage: {
        select: { name: true },
      },
      notas: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      tarefas: { // A busca de tarefas foi mantida simples, sem ordenar por campos inexistentes
        orderBy: {
          dataHora: 'desc',
        },
      },
      // ✅ Adicionado para buscar as tags junto com o cliente
      tags: {
        select: { id: true, name: true, color: true }
      },
    },
  });
}

// GET: Retorna um único cliente com seus dados relacionados
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;
    const client = await getClientWithDetails(id);

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ client });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT: Atualiza um cliente
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('authToken')?.value; // Já estava correto aqui
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Busca o cliente atual para obter o corretor antigo antes da atualização
    const currentClient = await prisma.cliente.findUnique({
      where: { id },
      include: { proprietario: { select: { nome: true } } },
    });
    if (!currentClient) return NextResponse.json({ error: 'Cliente não encontrado para transferência' }, { status: 404 });

    const dataToUpdate: Prisma.ClienteUpdateInput = {};

    // Corrigido para corresponder aos nomes enviados pelo frontend
    if (body.nomeCompleto !== undefined) dataToUpdate.nomeCompleto = body.nomeCompleto;
    if (body.email !== undefined) dataToUpdate.email = body.email;
    if (body.telefone !== undefined) dataToUpdate.telefone = body.telefone;
    
    // Lógica unificada para atualização de funil e etapa
    if (body.funnelId) {
        dataToUpdate.funnel = { connect: { id: body.funnelId } };
    }
    if (body.funnelStageId) {
        // A validação de que a etapa pertence ao funil correto é implícita
        // pela constraint do banco de dados. Se a combinação for inválida,
        // o Prisma retornará um erro P2003, que será capturado abaixo.
        dataToUpdate.funnelStage = { connect: { id: body.funnelStageId } };
    }
    
    if (body.imovelDeInteresseId !== undefined) dataToUpdate.imovelDeInteresseId = body.imovelDeInteresseId;
    if (body.overallStatus !== undefined) dataToUpdate.overallStatus = body.overallStatus;
    if (body.detalhesDeVenda !== undefined) {
        dataToUpdate.detalhesDeVenda = {
            upsert: {
                create: body.detalhesDeVenda,
                update: body.detalhesDeVenda,
            }
        };
    }
    if (body.preferences !== undefined) dataToUpdate.preferences = body.preferences;
    if (body.corretorId !== undefined) {
      // Lógica de permissão para transferência
      if (user.role !== Role.gerente && user.role !== Role.diretor && user.role !== Role.marketing_adm) {
        return NextResponse.json({ error: 'Você não tem permissão para transferir leads.' }, { status: 403 });
      }
      dataToUpdate.corretorId = body.corretorId;

      // Adiciona uma nota automática para registrar a transferência
      const newCorretor = await prisma.usuario.findUnique({ where: { id: body.corretorId } });
      if (newCorretor) {
        await prisma.nota.create({
          data: {
            clienteId: id,
            content: `Lead transferido de ${currentClient.proprietario?.nome || 'desconhecido'} para ${newCorretor.nome}.`,
            createdBy: user.name, // Nome do usuário que realizou a ação
          },
        });
      }
    }

    // ✅ --- LÓGICA PARA ATUALIZAR AS ETIQUETAS --- ✅
    if (body.tagIds !== undefined && Array.isArray(body.tagIds)) {
      dataToUpdate.tags = {
        set: body.tagIds.map((tagId: string) => ({ id: tagId })),
      };
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado para atualizar' }, { status: 400 });
    }

    const updatedClient = await prisma.cliente.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
      }
      // Captura especificamente o erro de chave estrangeira
      if (error.code === 'P2003') {
        return NextResponse.json({ error: "A combinação de funil e etapa é inválida." }, { status: 400 });
      }
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}