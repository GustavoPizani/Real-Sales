// app/api/leads/[id]/convert/route.ts - trecho modificado
// ... (código existente para converter o lead)

// Após a transação bem-sucedida:
if (result) {
    // Dispara a notificação do Slack, sem bloquear a resposta da API
    sendSlackNotification(result.corretorId, result);
}

return NextResponse.json({
  message: 'Lead convertido com sucesso!',
  client: result,
});

// --- Função de Notificação ---
async function sendSlackNotification(brokerId: string, client: Cliente) {
    const integration = await prisma.userIntegration.findFirst({
        where: {
            userId: brokerId,
            integration: { name: 'slack' }
        }
    });

    if (integration?.accessToken) {
        console.log(`ENVIANDO NOTIFICAÇÃO SLACK para corretor ${brokerId} sobre cliente ${client.nomeCompleto}`);
        // Lógica para enviar a mensagem para o Slack usando o integration.accessToken
        // Ex: await fetch('https://slack.com/api/chat.postMessage', { ... });
    }
}