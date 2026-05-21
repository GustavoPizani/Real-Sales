/**
 * Waha Sender — Envia mensagens de texto via API do container Waha (Railway)
 */

export async function sendTextViaWaha(
  chatId: string,
  text: string
): Promise<void> {
  const wahaBase =
    process.env.WAHA_BASE_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${wahaBase}/api/sendText`, {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.WAHA_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: "default",
        chatId,
        text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        JSON.stringify({
          event: "waha.send_error",
          status: response.status,
          chatId,
          error: errorText,
        })
      );
    } else {
      console.log(
        JSON.stringify({
          event: "waha.send_success",
          chatId,
          textLength: text.length,
        })
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "waha.send_fatal",
        chatId,
        error: String(error),
      })
    );
  }
}
