import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from "@/lib/prisma";
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
    try {
        // 1. Buscar dados do banco
        const [users, funnels] = await Promise.all([
            prisma.usuario.findMany({
                select: { nome: true, email: true, role: true },
                orderBy: { nome: 'asc' }
            }),
            prisma.funil.findMany({
                include: { etapas: { orderBy: { ordem: 'asc' } } },
                orderBy: { nome: 'asc' }
            })
        ]);

        // 2. Criar o Workbook e as Planilhas
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Real Sales';
        workbook.created = new Date();

        // --- Aba 1: Importação de Clientes ---
        const importSheet = workbook.addWorksheet('Importação de Clientes');
        importSheet.columns = [
            { header: 'nomeCompleto', key: 'nomeCompleto', width: 30 },
            { header: 'email', key: 'email', width: 30 },
            { header: 'telefone', key: 'telefone', width: 20 },
            { header: 'proprietarioEmail', key: 'proprietarioEmail', width: 30 },
            { header: 'funilNome', key: 'funilNome', width: 25 },
            { header: 'etapaNome', key: 'etapaNome', width: 25 },
            { header: 'cpf', key: 'cpf', width: 20 },
            { header: 'cnpj', key: 'cnpj', width: 20 },
            { header: 'dataNascimento', key: 'dataNascimento', width: 20 },
            { header: 'cidade', key: 'cidade', width: 25 },
            { header: 'estado', key: 'estado', width: 10 },
            { header: 'cep', key: 'cep', width: 15 },
            { header: 'origem', key: 'origem', width: 20 },
        ];
        importSheet.getRow(1).font = { bold: true };

        // --- Aba 2: Dados de Apoio ---
        const dataSheet = workbook.addWorksheet('Dados de Apoio');
        dataSheet.addTable({
            name: 'Usuarios',
            ref: 'A1',
            headerRow: true,
            columns: [{ name: 'Nome do Usuário' }, { name: 'Email do Usuário (para preencher em proprietarioEmail)' }, { name: 'Cargo' }],
            rows: users.map(u => [u.nome, u.email, u.role]),
        });
        dataSheet.addTable({
            name: 'FunisEtapas',
            ref: 'E1',
            headerRow: true,
            columns: [{ name: 'Nome do Funil (para preencher em funilNome)' }, { name: 'Nome da Etapa (para preencher em etapaNome)' }],
            rows: funnels.flatMap(f => f.etapas.map(e => [f.nome, e.nome])),
        });
        dataSheet.columns.forEach(column => { column.width = 40; });

        // 3. Gerar o buffer do arquivo
        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="modelo_clientes.xlsx"',
            },
        });

    } catch (error) {
        console.error("Erro ao gerar planilha modelo:", error);
        return NextResponse.json({ error: "Erro interno ao gerar a planilha." }, { status: 500 });
    }
}
