// Ponte com o WhatsApp Web (roda no "mundo" da página, junto com a WA-JS).
// Recebe pedidos do content script por eventos do documento e responde com JSON.
// Lista fechada de ações: lê a conversa aberta, as mensagens e o histórico, lista
// as conversas, lê e marca etiquetas do WhatsApp Business, baixa um áudio, abre
// uma conversa e coloca texto na caixa de mensagem. NÃO envia mensagem nenhuma.
(() => {
  if (window.__nordicPonte) return;
  window.__nordicPonte = true;

  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const emitir = (tipo, dados) =>
    document.dispatchEvent(new CustomEvent("nordic-wa-evento", { detail: JSON.stringify({ tipo, dados }) }));
  const responder = (id, ok, dados) =>
    document.dispatchEvent(new CustomEvent("nordic-wa-resposta", { detail: JSON.stringify({ id, ok, dados }) }));

  async function pronto() {
    for (let i = 0; i < 1200; i++) {
      if (window.WPP && (window.WPP.isFullReady || window.WPP.isReady)) return true;
      await dormir(500);
    }
    return false;
  }

  const idDe = (x) => (typeof x === "string" ? x : x?._serialized || "");

  // id "@lid" (privacidade do WhatsApp) não é o número: pergunta o número real
  async function telefoneDe(chatId) {
    if (chatId.endsWith("@c.us")) return chatId.split("@")[0];
    try {
      const e = await WPP.contact.getPnLidEntry(chatId);
      return (e?.phoneNumber?.id || idDe(e?.phoneNumber).split("@")[0] || "").replace(/\D/g, "");
    } catch {
      return "";
    }
  }

  async function conversaAtiva() {
    const chat = WPP.chat.getActiveChat();
    if (!chat) return null;
    const id = idDe(chat.id);
    const grupo = Boolean(chat.isGroup) || id.endsWith("@g.us") || id.endsWith("@newsletter") || id === "status@broadcast";
    const c = chat.contact || {};
    return {
      id,
      grupo,
      nome: chat.formattedTitle || chat.name || c.name || c.pushname || c.verifiedName || "",
      telefone: grupo ? "" : await telefoneDe(id),
    };
  }

  // tipos do WhatsApp → formato compacto (a/i/v/d); o resto (avisos, apagadas, enquetes…) fica de fora
  const TIPO = { chat: "", ptt: "a", audio: "a", image: "i", sticker: "i", video: "v", gif: "v", document: "d" };

  function compacta(m) {
    if (!(m.type in TIPO) || m.isNotification) return null;
    const tipo = TIPO[m.type];
    const id = idDe(m.id);
    const deMim = m.id?.fromMe ?? m.fromMe ?? id.startsWith("true_");
    let texto = "";
    if (tipo === "") texto = m.body || "";
    else if (tipo === "d") texto = m.caption || m.filename || "";
    else if (tipo !== "a") texto = m.caption || "";
    if (tipo === "" && !texto.trim()) return null;
    return {
      id,
      ts: Number(m.t) || 0,
      lado: deMim ? ">" : "<",
      ...(tipo ? { tipo } : {}),
      ...(tipo === "a" && m.duration ? { seg: Math.round(Number(m.duration)) } : {}),
      texto,
    };
  }

  async function mensagens(chatId, quantas) {
    const raw = await WPP.chat.getMessages(chatId, { count: quantas });
    return raw.map(compacta).filter((m) => m && m.ts > 0);
  }

  /**
   * Conversa inteira, para exportar e para a RIA aprender. Com "antigo", pede ao
   * celular as mensagens anteriores (50 por vez) até o celular não mandar mais
   * ou chegar ao máximo. O WhatsApp não garante entregar tudo: "completo" diz se
   * o celular parou de mandar antes do máximo.
   */
  async function historico(chatId, max, antigo) {
    const porId = new Map();
    const juntar = (lista) => lista.forEach((m) => porId.set(idDe(m.id), m));
    juntar(await WPP.chat.getMessages(chatId, { count: -1 }));
    let completo = !antigo;
    if (antigo) {
      let vazias = 0;
      while (porId.size < max) {
        const maisAntiga = [...porId.values()].sort((a, b) => (Number(a.t) || 0) - (Number(b.t) || 0))[0];
        if (!maisAntiga) {
          completo = true;
          break;
        }
        const antes = await WPP.chat.getMessages(chatId, { count: 50, direction: "before", id: idDe(maisAntiga.id) }).catch(() => []);
        const novas = antes.filter((m) => !porId.has(idDe(m.id)));
        if (!novas.length) {
          // o celular às vezes demora: dá mais uma chance antes de considerar que acabou
          if (++vazias >= 2) {
            completo = true;
            break;
          }
          await dormir(1500);
          continue;
        }
        vazias = 0;
        juntar(novas);
        await dormir(400);
      }
    }
    const mensagens = [...porId.values()]
      .map(compacta)
      .filter((m) => m && m.ts > 0)
      .sort((a, b) => a.ts - b.ts)
      .slice(-max);
    return { mensagens, completo };
  }

  async function listarConversas(quantas, etiqueta) {
    const chats = await WPP.chat.list({ onlyUsers: true, count: quantas, ...(etiqueta ? { withLabels: [String(etiqueta)] } : {}) });
    return Promise.all(
      chats
        .filter((c) => !idDe(c.id).endsWith("@broadcast"))
        .map(async (c) => {
          const id = idDe(c.id);
          const ct = c.contact || {};
          return { id, nome: c.formattedTitle || c.name || ct.name || ct.pushname || "", telefone: await telefoneDe(id), t: Number(c.t) || 0 };
        }),
    );
  }

  async function baixarAudio(msgId) {
    const blob = await WPP.chat.downloadMedia(msgId);
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return { base64: btoa(bin), tipo: blob.type || "audio/ogg" };
  }

  const ACOES = {
    conversaAtiva: () => conversaAtiva(),
    mensagens: ({ chatId, quantas }) => mensagens(chatId, Math.min(Math.max(Number(quantas) || 80, 1), 500)),
    baixarAudio: ({ msgId }) => baixarAudio(msgId),
    historico: ({ chatId, max, antigo }) => historico(chatId, Math.min(Math.max(Number(max) || 2000, 1), 10000), Boolean(antigo)),
    listarConversas: ({ quantas, etiqueta }) => listarConversas(Math.min(Math.max(Number(quantas) || 30, 1), 1000), etiqueta),
    // etiquetas do WhatsApp Business (o WhatsApp comum não tem: business = false)
    etiquetasWa: async () => {
      try {
        const lista = await WPP.labels.getAllLabels();
        return { business: true, etiquetas: lista.map((l) => ({ id: String(l.id), nome: l.name, cor: l.hexColor || null })) };
      } catch (err) {
        return { business: false, motivo: String(err?.code || err?.message || err) };
      }
    },
    etiquetasDaConversa: async ({ chatId }) => (WPP.chat.get(chatId)?.labels || []).map(String),
    marcarEtiquetaWa: async ({ chatId, labelId, marcar }) => {
      await WPP.labels.addOrRemoveLabels(chatId, [{ labelId: String(labelId), type: marcar ? "add" : "remove" }]);
      return true;
    },
    criarEtiquetaWa: async ({ nome }) => {
      const l = await WPP.labels.addNewLabel(String(nome));
      return { id: String(l.id), nome: l.name, cor: l.hexColor || null };
    },
    abrirConversa: async ({ chatId }) => {
      await WPP.chat.openChatBottom(chatId);
      return true;
    },
    // cliente do CRM: abre pelo telefone (cria a conversa se ainda não existe; não envia nada)
    abrirPorTelefone: async ({ telefone }) => {
      let num = String(telefone || "").replace(/\D/g, "");
      if (num.length === 10 || num.length === 11) num = `55${num}`;
      if (num.length < 12) throw new Error("Telefone inválido para o WhatsApp.");
      const existe = await WPP.contact.queryWidExists(`${num}@c.us`).catch(() => null);
      if (!existe) throw new Error("Este número não tem WhatsApp.");
      const id = idDe(existe.wid) || `${num}@c.us`;
      await WPP.chat.find(id);
      await WPP.chat.openChatBottom(id);
      return { id };
    },
    porNaCaixa: async ({ chatId, texto }) => {
      await WPP.chat.setInputText(String(texto), chatId);
      return true;
    },
  };

  document.addEventListener("nordic-wa-pedido", async (e) => {
    let pedido;
    try {
      pedido = JSON.parse(e.detail);
    } catch {
      return;
    }
    const acao = ACOES[pedido?.acao];
    if (!acao) return responder(pedido?.id, false, "Ação não permitida");
    try {
      responder(pedido.id, true, await acao(pedido.dados || {}));
    } catch (err) {
      responder(pedido.id, false, String(err?.message || err));
    }
  });

  pronto().then((ok) => {
    if (!ok) return emitir("erro", "O WhatsApp Web não carregou a tempo. Recarregue a página.");
    emitir("pronto", true);
    WPP.on("chat.active_chat", async () => emitir("conversa", await conversaAtiva().catch(() => null)));
    WPP.on("chat.new_message", (m) => {
      const fromMe = Boolean(m?.id?.fromMe);
      const chatId = idDe(m?.id?.remote) || idDe(fromMe ? m?.to : m?.from);
      emitir("mensagem", { chatId });
    });
    conversaAtiva()
      .then((c) => emitir("conversa", c))
      .catch(() => {});
  });
})();
