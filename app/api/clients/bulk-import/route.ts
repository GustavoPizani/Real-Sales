// c:\Users\gusta\Real-sales\app\api\clients\bulk-import\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { format, parse } from 'date-fns';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

// Função para converter string de data (dd/MM/yyyy) para objeto Date
const parseDate = (dateString: string | undefined | null): Date | null => {
  if (!dateString) return null;
  try {
    return parse(dateString, 'dd/MM/yyyy', new Date());
  } catch (e) {
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    } 

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Ler o arquivo Excel
    const fileBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    // Processar apenas a primeira aba
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: 'A planilha está vazia ou corrompida.' }, { status: 400 });
    }

    const rows: any[] = [];
    const headerRow = worksheet.getRow(1).values as string[];
    // Remove o primeiro elemento vazio que o ExcelJS pode adicionar
    if (headerRow[0] === null || headerRow[0] === undefined) headerRow.shift(); 

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Pula o cabeçalho
        const rowData: { [key: string]: any } = {};
        const rowValues = row.values as any[];
        if (rowValues[0] === null || rowValues[0] === undefined) rowValues.shift();

        headerRow.forEach((header, index) => {
          // Trata células de data que o ExcelJS já converte para Date
          if (rowValues[index] instanceof Date) {
            rowData[header] = format(rowValues[index], 'dd/MM/yyyy');
          } else {
            rowData[header] = rowValues[index];
          }
        });
        rows.push(rowData);
      }
    });

    let successCount = 0;
    const errorDetails: string[] = [];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'O arquivo CSV está vazio ou mal formatado.' }, { status: 400 });
    }

    // Buscar dados de validação em massa para otimizar
    const emailsToFind = rows.map(row => row.proprietarioEmail).filter(Boolean);
    const funnelsToFind = rows.map(row => row.funilNome).filter(Boolean);
    const etapasToFind = rows.map(row => row.etapaNome).filter(Boolean);

    const [users, funnels, etapas] = await Promise.all([
      prisma.usuario.findMany({ where: { email: { in: emailsToFind } }, select: { id: true, email: true } }),
      prisma.funil.findMany({ where: { nome: { in: funnelsToFind } }, select: { id: true, nome: true } }),
      prisma.etapaFunil.findMany({ where: { nome: { in: etapasToFind } }, select: { id: true, nome: true, funilId: true } })
    ]);

    // Mapear para busca rápida
    const userMap = new Map(users.map(u => [u.email, u.id]));
    const funnelMap = new Map(funnels.map(f => [f.nome, f.id]));
    const etapaMap = new Map(etapas.map(e => [e.nome, { id: e.id, funilId: e.funilId }]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNumber = i + 2; // +1 para index e +1 para cabeçalho

      if (!row.nomeCompleto) {
        errorDetails.push(`Linha ${lineNumber}: A coluna 'nomeCompleto' é obrigatória.`);
        continue;
      }

      try {
        const clientData: Prisma.ClienteCreateInput = {
          nomeCompleto: row.nomeCompleto,
          email: row.email || null,
          telefone: row.telefone ? String(row.telefone) : null,
          criadoPor: { connect: { id: currentUser.id } },
          // Adicione outros campos conforme o modelo
          cpf: row.cpf || null,
          cnpj: row.cnpj || null,
          dataNascimento: parseDate(row.dataNascimento),
          cidade: row.cidade || null,
          estado: row.estado || null,
          cep: row.cep || null,
          origem: row.origem || null,
        };

        // Validações de funil e etapa (agora obrigatórias)
        if (!row.funilNome || !row.etapaNome) {
            throw new Error("As colunas 'funilNome' e 'etapaNome' são obrigatórias.");
        }
        const funnelId = funnelMap.get(row.funilNome);
        const etapaInfo = etapaMap.get(row.etapaNome);

        if (!funnelId) { throw new Error(`Funil com nome '${row.funilNome}' não encontrado.`); }
        if (!etapaInfo) { throw new Error(`Etapa com nome '${row.etapaNome}' não encontrada.`); }
        if (etapaInfo.funilId !== funnelId) { throw new Error(`A etapa '${row.etapaNome}' não pertence ao funil '${row.funilNome}'.`); }

        // Proprietário é opcional
        if (row.proprietarioEmail) {
            const ownerId = userMap.get(row.proprietarioEmail);
            if (!ownerId) { throw new Error(`Proprietário com email '${row.proprietarioEmail}' não encontrado.`); }
            clientData.proprietario = { connect: { id: ownerId } };
        }

        await prisma.cliente.create({ data: clientData });
        successCount++;
      } catch (error: any) {
        errorDetails.push(`Linha ${lineNumber}: ${error.message}`);
      }
    }

    return NextResponse.json({
      successCount: successCount,
      errorCount: errorDetails.length,
      errors: errorDetails,
    });

  } catch (error: any) {
    console.error("Erro na importação em massa:", error);
    return NextResponse.json({ error: 'Erro interno do servidor ao processar o arquivo.', details: error.message }, { status: 500 });
  }
}
