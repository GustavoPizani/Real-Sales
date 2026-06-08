export interface ChannelAdapter {
  ensureSession(sessionName: string): Promise<{ ok: boolean; status?: string; qrCode?: string; error?: string }>;
  getSessionStatus(sessionName: string): Promise<{ ok: boolean; status: string; qrCode?: string }>;
  logoutSession(sessionName: string): Promise<{ ok: boolean; error?: string }>;
}

export class WahaAdapter implements ChannelAdapter {
  private get baseUrl() {
    const url = process.env.WAHA_BASE_URL;
    if (!url) throw new Error("WAHA_BASE_URL não configurado. Adicione ao .env e ao Vercel.");
    return url.replace(/\/$/, "");
  }

  private get headers() {
    return {
      "X-Api-Key": process.env.WAHA_API_KEY ?? "",
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
  }

  async ensureSession(sessionName = "default") {
    const base = this.baseUrl;
    if (!base) return { ok: false, error: "WAHA_BASE_URL não configurado." };

    try {
      // 1. Verifica se a sessão já existe
      const checkRes = await fetch(`${base}/api/sessions/${sessionName}`, { headers: this.headers });

      if (checkRes.status === 404) {
        // 2a. Não existe — cria
        const createRes = await fetch(`${base}/api/sessions`, {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify({ name: sessionName }),
        });
        // 422 = criada em race condition, ignora
        if (!createRes.ok && createRes.status !== 422 && createRes.status !== 409) {
          const err = await createRes.text().catch(() => String(createRes.status));
          return { ok: false, error: `Falha ao criar sessão: ${err}` };
        }
      }

      // 3. Consulta estado atual antes de chamar /start
      const statusNow = await this.getSessionStatus(sessionName);
      const needsStop = ["FAILED", "STARTING"].includes(statusNow.status ?? "");
      const startable = ["STOPPED", "FAILED", "NOT_CREATED", "NOT_CONFIGURED", "STARTING"];

      if (statusNow.status && startable.includes(statusNow.status)) {
        // 4a. Para a sessão primeiro se estiver em FAILED/STARTING (para limpar estado)
        if (needsStop) {
          await fetch(`${base}/api/sessions/${sessionName}/stop`, {
            method: "POST",
            headers: this.headers,
          }).catch(() => {});
          // Aguarda a sessão parar
          await new Promise(r => setTimeout(r, 1000));
        }

        // 4b. Inicia a sessão (move para STARTING → SCAN_QR_CODE)
        const startRes = await fetch(`${base}/api/sessions/${sessionName}/start`, {
          method: "POST",
          headers: this.headers,
        });
        if (!startRes.ok && startRes.status !== 422) {
          const err = await startRes.text().catch(() => String(startRes.status));
          console.error(`[WahaAdapter] start failed: ${err}`);
        }
      }

      // 5. Retorna estado reconciliado via GET
      return this.getSessionStatus(sessionName);
    } catch (error: any) {
      console.error("[WahaAdapter] ensureSession fatal:", error);
      return { ok: false, error: error.message ?? String(error) };
    }
  }

  async logoutSession(sessionName = "default") {
    const base = this.baseUrl;
    try {
      // Logout desconecta o número do WhatsApp e limpa a sessão
      await fetch(`${base}/api/sessions/${sessionName}/logout`, {
        method: "POST",
        headers: this.headers,
      }).catch(() => {});
      // Para a sessão após logout
      await fetch(`${base}/api/sessions/${sessionName}/stop`, {
        method: "POST",
        headers: this.headers,
      }).catch(() => {});
      return { ok: true };
    } catch (error: any) {
      console.error("[WahaAdapter] logoutSession fatal:", error);
      return { ok: false, error: error.message ?? String(error) };
    }
  }

  async getSessionStatus(sessionName = "default") {
    const base = this.baseUrl;
    if (!base) return { ok: false, status: "NOT_CONFIGURED" };

    try {
      // Busca direta por nome — mais confiável que a lista (que omite sessões STOPPED)
      const res = await fetch(`${base}/api/sessions/${sessionName}`, { headers: this.headers });

      if (res.status === 404) return { ok: true, status: "NOT_CREATED" };
      if (!res.ok) return { ok: true, status: "STARTING" };

      const session = await res.json();

      if (session.status === "WORKING") return { ok: true, status: "WORKING" };
      if (session.status === "STOPPED") return { ok: true, status: "STOPPED" };
      if (session.status === "FAILED")  return { ok: true, status: "FAILED" };

      if (session.status === "SCAN_QR_CODE") {
        return { ok: true, status: "SCAN_QR_CODE" };
      }

      return { ok: true, status: "STARTING" };
    } catch (error: any) {
      console.error("[WahaAdapter] getSessionStatus fatal:", error);
      return { ok: false, status: "ERROR" };
    }
  }
}
