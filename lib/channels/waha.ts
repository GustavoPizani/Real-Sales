export interface ChannelAdapter {
  ensureSession(sessionName: string): Promise<{ ok: boolean; status?: string; qrCode?: string; error?: string }>;
  getSessionStatus(sessionName: string): Promise<{ ok: boolean; status: string; qrCode?: string }>;
}

export class WahaAdapter implements ChannelAdapter {
  private get baseUrl() {
    return process.env.WAHA_BASE_URL || "http://localhost:3000";
  }

  private get headers() {
    return {
      "X-Api-Key": process.env.WAHA_API_KEY!,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
  }

  async ensureSession(sessionName: string = "default") {
    try {
      // 1. Tentar iniciar a sessão
      const startRes = await fetch(`${this.baseUrl}/api/sessions/start`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ name: sessionName }),
      });

      // Erro 422 é benigno no Waha se a sessão já estiver sendo iniciada/existente
      if (!startRes.ok && startRes.status !== 422) {
        const errorText = await startRes.text();
        return { ok: false, error: `Failed to start session: ${errorText}` };
      }

      // 2. Aguarda um pouco para o Waha instanciar o engine
      await new Promise(res => setTimeout(res, 2000));

      return await this.getSessionStatus(sessionName);
    } catch (error) {
      console.error("[WahaAdapter] ensureSession fatal:", error);
      return { ok: false, error: String(error) };
    }
  }

  async getSessionStatus(sessionName: string = "default") {
    try {
      // 1. Pega status via Waha Auth endpoint (retorna se tá working, e qr/code se pendente)
      const statusRes = await fetch(`${this.baseUrl}/api/sessions/${sessionName}/auth/qr`, {
        headers: this.headers,
      });

      if (!statusRes.ok) {
        return { ok: false, status: "STOPPED" };
      }

      const data = await statusRes.json();
      
      // O endpoint de auth pode não retornar a estrutura que a gente quer, depende da versão
      // Vamos tentar buscar os detalhes da sessão para confirmar
      const detailRes = await fetch(`${this.baseUrl}/api/sessions`, {
        headers: this.headers,
      });
      
      if (detailRes.ok) {
        const sessions = await detailRes.json();
        const mySession = sessions.find((s: any) => s.name === sessionName);
        if (mySession && mySession.status === "WORKING") {
          return { ok: true, status: "WORKING" };
        }
      }

      // Se retornou o QR Code
      if (data && data.qr) {
        return { ok: true, status: "SCAN_QR_CODE", qrCode: data.qr };
      }

      return { ok: true, status: "STARTING" };
    } catch (error) {
      console.error("[WahaAdapter] getSessionStatus fatal:", error);
      return { ok: false, status: "ERROR" };
    }
  }
}
