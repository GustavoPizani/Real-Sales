// c:\Users\gusta\Real-sales\app\api\clients\bulk-import\route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import Papa from 'papaparse';
import { ClientOverallStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const fileContent = await file.text();

    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim() // Garante que espaços em branco nos cabeçalhos sejam removidos
    });

    const clientsToCreate: any[] = [];
    const errors: string[] = [];

    // Busca dados para validação em uma única consulta
    const emailsFromCsv = parseResult.data.map((c: any) => c.email).filter(Boolean);
    const corretorEmailsFromCsv = parseResult.data.map((c: any) => c.corretor_email).filter(Boolean);

    const [existingEmails, funnelStages, corretores] = await Promise.all([
      prisma.cliente.findMany({
        where: { email: { in: emailsFromCsv } },
        select: { email: true },
      }),
      prisma.funnelStage.findMany({ select: { name: true } }),
      prisma.usuario.findMany({
        where: { email: { in: corretorEmailsFromCsv } },
        select: { id: true, email: true },
      })
    ]);
    const emailSet = new Set(existingEmails.map(e => e.email));
    const funnelStageSet = new Set(funnelStages.map(f => f.name));
    const corretorEmailToIdMap = new Map(corretores.map(c => [c.email, c.id]));

    for (let i = 0; i < parseResult.data.length; i++) {
      const row: any = parseResult.data[i];
      const lineNumber = i + 2; // +2 porque o header é a linha 1 e a contagem é base 0

      // Validação de campos obrigatórios
      if (!row.nomeCompleto) {
        errors.push(`Linha ${lineNumber}: A coluna 'nomeCompleto' é obrigatória.`);
        continue;
      }

      // Validação de e-mail (se existir)
      if (row.email) {
        if (emailSet.has(row.email)) {
          errors.push(`Linha ${lineNumber}: O email '${row.email}' já existe.`);
          continue;
        }
        emailSet.add(row.email); // Adiciona ao set para checar duplicatas no próprio arquivo
      }

      // Validação do overallStatus
      const validOverallStatuses = Object.values(ClientOverallStatus);
      if (row.overallStatus && !validOverallStatuses.includes(row.overallStatus as ClientOverallStatus)) {
        errors.push(`Linha ${lineNumber}: O status '${row.overallStatus}' é inválido. Use um dos seguintes: ${validOverallStatuses.join(', ')}`);
        continue;
      }
      
      // Validação do currentFunnelStage
      if (row.currentFunnelStage && !funnelStageSet.has(row.currentFunnelStage)) {
          errors.push(`Linha ${lineNumber}: O estágio de funil '${row.currentFunnelStage}' é inválido.`);
          continue;
      }

      // Validação e atribuição do corretor
      let corretorId = user.id; // Padrão: usuário logado
      if (row.corretor_email) {
        if (corretorEmailToIdMap.has(row.corretor_email)) {
          corretorId = corretorEmailToIdMap.get(row.corretor_email)!;
        } else {
          errors.push(`Linha ${lineNumber}: O email do corretor '${row.corretor_email}' não foi encontrado no sistema.`);
          continue;
        }
      }

      clientsToCreate.push({
        nomeCompleto: row.nomeCompleto,
        email: row.email || null,
        telefone: row.telefone || null,
        budget: row.budget ? parseFloat(row.budget) : null,
        preferences: row.preferences || null,
        currentFunnelStage: row.currentFunnelStage || 'Contato',
        overallStatus: (row.overallStatus as ClientOverallStatus) || ClientOverallStatus.Ativo,
        corretorId: corretorId,
      });
    }

    if (errors.length > 0 && clientsToCreate.length === 0) {
        // Se houver erros e nenhum cliente válido, retorna apenas os erros.
        return NextResponse.json({
            successCount: 0,
            errorCount: errors.length,
            errors: errors,
        }, { status: 400 });
    }

    if (clientsToCreate.length > 0) {
      await prisma.cliente.createMany({
        data: clientsToCreate,
        skipDuplicates: true, // Segurança extra para o caso de e-mails nulos
      });
    }

    return NextResponse.json({
      successCount: clientsToCreate.length,
      errorCount: errors.length,
      errors: errors,
    });

  } catch (error: any) {
    console.error("Erro na importação em massa:", error);
    return NextResponse.json({ error: 'Erro interno do servidor ao processar o arquivo.' }, { status: 500 });
  }
}
