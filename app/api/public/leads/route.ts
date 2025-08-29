import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ClientOverallStatus } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, message, propertyId, brokerId } = body;

    if (!name || !email || !phone || !propertyId || !brokerId) {
      return NextResponse.json({ error: 'Dados incompletos para criar o lead.' }, { status: 400 });
    }

    const broker = await prisma.user.findUnique({ where: { id: brokerId } });
    const property = await prisma.imovel.findUnique({ where: { id: propertyId } });

    if (!broker || !property) {
      return NextResponse.json({ error: 'Corretor ou imóvel inválido.' }, { status: 404 });
    }

    // Limpa o número de telefone e adiciona o prefixo +55
    const cleanedPhone = phone.replace(/\D/g, '');
    const formattedPhone = `+55${cleanedPhone}`;

    const newClient = await prisma.cliente.create({
      data: {
        nomeCompleto: name,
        email,
        telefone: formattedPhone,
        overallStatus: ClientOverallStatus.Ativo,
        corretorId: brokerId,
        imovelDeInteresseId: propertyId,
        notas: {
          create: [
            {
              content: `Lead recebido através da página pública do imóvel: ${property.titulo}. Mensagem: ${message || 'Nenhuma'}`,
              createdBy: 'Sistema',
            },
          ],
        },
      },
    });

    return NextResponse.json({ success: true, client: newClient }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar novo lead:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return NextResponse.json({ error: 'Um cliente com este e-mail já existe.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor ao criar lead.' }, { status: 500 });
  }
}
