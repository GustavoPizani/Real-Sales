// c:\Users\gusta\Real-sales\app\api\clients\template\route.ts
import { NextResponse } from 'next/server';
import { ClientOverallStatus } from '@prisma/client';

export async function GET() {
  // Obtém os valores válidos dos Enums para incluir nas instruções
  const validOverallStatuses = Object.values(ClientOverallStatus).join(', ');
  // Nota: Os estágios do funil (currentFunnelStage) são dinâmicos. 
  // Para uma solução ideal, eles seriam buscados do banco de dados.
  // Por simplicidade, vamos usar um valor padrão e explicar no comentário.
  const funnelStagesExample = "Contato, Prospecção, Negociação";

  const instructions = [
    "# INSTRUÇÕES PARA PREENCHIMENTO:",
    "# 1. A coluna 'nomeCompleto' é OBRIGATÓRIA.",
    "# 2. A coluna 'corretor_email' é opcional. Se deixada em branco, o cliente será atribuído a você.",
    "# 3. As demais colunas são opcionais.",
    `# 4. Para a coluna 'overallStatus', utilize um dos seguintes valores: ${validOverallStatuses}`,
    `# 5. Para a coluna 'currentFunnelStage', utilize um dos estágios de funil configurados no seu sistema (ex: ${funnelStagesExample}).`,
    "# 6. Se 'overallStatus' for deixado em branco, o cliente será cadastrado como 'Ativo'.",
    "# 7. Se 'currentFunnelStage' for deixado em branco, será 'Contato'.",
    "# 8. Apague estas linhas de instrução antes de fazer o upload.",
    "# ----------------------------------------------------------------------------------",
  ].join('\n');

  const headers = "nomeCompleto,email,telefone,budget,preferences,currentFunnelStage,overallStatus,corretor_email";
  
  const exampleRow1 = "Maria Souza,maria.souza@email.com,(21) 99999-8888,500000,Apartamento 3 quartos,Negociação,Ativo,corretor.chefe@email.com";
  const exampleRow2 = "Carlos Pereira,carlos.p@email.com,(11) 88888-7777,,,,,";

  const csvContent = `${instructions}\n${headers}\n${exampleRow1}\n${exampleRow2}`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modelo_clientes.csv"',
    },
  });
}
