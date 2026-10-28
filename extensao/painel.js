// Painel da faixa lateral no WhatsApp Web (página da extensão, dentro de um iframe).
// Fala com o WhatsApp pela ponte (via content script) e com o Nordic CRM pela
// API /api/ext, com o login do Supabase do próprio usuário.
(() => {
  const CFG = window.NORDIC_CONFIG;
  const VERSAO = chrome.runtime.getManifest().version;
  const WA_ORIGEM = "https://web.whatsapp.com";
  const $app = document.getElementById("app");
  const $topo = document.getElementById("topo-acoes");

  const est = {
    sessao: null, // { servidor, token, refresh, expira }
    usuario: null,
    imoveis: [],
    stats: {},
    versaoPublicada: null,
    sistema: null, // o que a faixa sabe do login do CRM neste navegador
    waPronto: false,
    erroWa: null,
    conversa: null, // { id, nome, telefone, grupo }
    carregando: false,
    vinculo: null,
    cliente: null,
    candidatos: null,
    imovelRef: null,
    ref: null,
    trocando: false,
    novoAberto: false,
    msgsWa: [], // últimas mensagens lidas do WhatsApp (formato compacto)
    guardadas: [], // mensagens guardadas no CRM (com transcrições)
    sugestao: null, // { id, analise, sugestoes }
    resumo: null,
    ocupado: {},
    aviso: null, // { tipo, texto }
    vinculados: {}, // chatId → true: conversas vinculadas (abre numa chamada só)
    // "Aprender com conversas": exportar em JSON e a RIA propor regras e exemplos
    aprender: {
      escopo: "esta", // esta | ultimas
      quantas: 30,
      antigo: true, // pedir ao celular o histórico antigo
      progresso: null, // { feito, total, texto }
      parar: false,
      propostas: null, // { regras, exemplos }
      marcadas: { r: new Set(), e: new Set() },
      historico: null, // histórico da conversa aberta (vinculada), para a anotação
      relatorio: null, // { conversas, puladas, incompletas }
    },
  };

  // ── utilidades ────────────────────────────────────────────────────────────
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const ha = (iso) => {
    if (!iso) return "";
    const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    if (min < 60) return `${min} min`;
    const h = Math.round(min / 60);
    return h < 48 ? `${h} h` : `${Math.round(h / 24)} dias`;
  };
  const guardar = (o) => chrome.storage.local.set(o);
  const ler = (k) => new Promise((r) => chrome.storage.local.get(k, (v) => r(v[k])));
  const iniciais = (n) =>
    String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const hojeISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  // ── ponte com o WhatsApp ──────────────────────────────────────────────────
  let seqPedido = 0;
  const pendentes = new Map();
  function wa(acao, dados, ms = 60000) {
    const id = ++seqPedido;
    return new Promise((resolve, reject) => {
      pendentes.set(id, { resolve, reject });
      parent.postMessage({ nordic: "pedido", id, acao, dados }, WA_ORIGEM);
      setTimeout(() => {
        if (pendentes.delete(id)) reject(new Error("O WhatsApp Web não respondeu."));
      }, ms);
    });
  }
  window.addEventListener("message", (e) => {
    if (e.origin !== WA_ORIGEM || e.data?.nordic == null) return;
    const m = e.data;
    if (m.nordic === "resposta") {
      const p = pendentes.get(m.id);
      if (!p) return;
      pendentes.delete(m.id);
      m.ok ? p.resolve(m.dados ?? null) : p.reject(new Error(m.dados || "Erro no WhatsApp Web"));
    } else if (m.nordic === "evento") aoEvento(m.tipo, m.dados);
  });

  // ── login (Supabase) e API ────────────────────────────────────────────────
  async function auth(grant, corpo) {
    const r = await fetch(`${CFG.supabaseUrl}/auth/v1/token?grant_type=${grant}`, {
      method: "POST",
      headers: { apikey: CFG.supabaseKey, "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.msg || "E-mail ou senha incorretos.");
    return { token: j.access_token, refresh: j.refresh_token, expira: Date.now() + (j.expires_in - 60) * 1000 };
  }

  async function tokenValido() {
    const s = est.sessao;
    if (!s) throw new Error("Entre com a sua conta.");
    if (Date.now() < s.expira) return s.token;
    try {
      Object.assign(s, await auth("refresh_token", { refresh_token: s.refresh }));
      await guardar({ sessao: s });
      return s.token;
    } catch {
      await sair();
      throw new Error("Sua sessão expirou. Entre de novo.");
    }
  }

  async function api(rota, corpo) {
    const token = await tokenValido();
    const ehForm = corpo instanceof FormData;
    const r = await fetch(`${est.sessao.servidor}/api/ext/${rota}`, {
      method: corpo ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, ...(corpo && !ehForm ? { "Content-Type": "application/json" } : {}) },
      body: ehForm ? corpo : corpo ? JSON.stringify(corpo) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(r.status === 404 && !j.erro ? "Este servidor ainda não tem a extensão publicada." : j.erro || `Erro ${r.status}`);
      e.status = r.status;
      e.esperarSeg = j.esperarSeg || 0;
      if (r.status === 401 || r.status === 403) await sair(false, e.message);
      throw e;
    }
    return j;
  }

  // fila da IA: um pedido ao Groq por vez
  let filaIA = Promise.resolve();
  const naFila = (fn) => {
    const p = filaIA.then(fn, fn);
    filaIA = p.catch(() => {});
    return p;
  };

  async function acao(nome, fn) {
    if (est.ocupado[nome]) return;
    est.ocupado[nome] = true;
    est.aviso = null;
    render();
    try {
      await fn();
    } catch (e) {
      est.aviso = { tipo: e.status === 429 ? "alerta" : "erro", texto: e.message };
    } finally {
      est.ocupado[nome] = false;
      render();
    }
  }

  // ── fluxo ────────────────────────────────────────────────────────────────
  async function iniciar() {
    est.sessao = (await ler("sessao")) || null;
    est.vinculados = (await ler("vinculados")) || {};
    render();
    if (est.sessao) await abrirSessao();
    else await entrarPeloSistema();
  }

  /**
   * Entra sozinho com a conta logada no Nordic CRM neste navegador
   * (sessao-sistema.js avisa qual é). A extensão ganha uma sessão própria, por um
   * link de uso único: não reaproveita a do site, para uma não derrubar a outra.
   */
  async function entrarPeloSistema(forcar) {
    if (est.sessao || est.ocupado.auto) return;
    const t = await ler("tokenSistema");
    est.sistema = !t?.access_token
      ? { situacao: "nenhum" }
      : t.expira < Date.now() + 60000
        ? { situacao: "expirado", servidor: t.servidor, email: t.email }
        : { situacao: "ok", servidor: t.servidor, email: t.email };
    render();
    if (est.sistema.situacao !== "ok") return;
    if (!CFG.servidores.some((s) => s.url === t.servidor)) return;
    if (!forcar && (await ler("ignorarToken")) === t.access_token) return; // saiu da faixa com este login
    est.ocupado.auto = true;
    est.aviso = null;
    render();
    try {
      const r = await fetch(`${t.servidor}/api/ext/conectar`, { method: "POST", headers: { Authorization: `Bearer ${t.access_token}` } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro || "Não foi possível entrar automaticamente.");
      const v = await fetch(`${CFG.supabaseUrl}/auth/v1/verify`, {
        method: "POST",
        headers: { apikey: CFG.supabaseKey, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "magiclink", token_hash: j.token_hash }),
      });
      const s = await v.json().catch(() => ({}));
      if (!v.ok || !s.access_token) throw new Error(s.msg || s.error_description || "Não foi possível entrar automaticamente.");
      est.sessao = { servidor: t.servidor, token: s.access_token, refresh: s.refresh_token, expira: Date.now() + ((s.expires_in || 3600) - 60) * 1000 };
      await guardar({ sessao: est.sessao });
      await chrome.storage.local.remove("ignorarToken");
      await abrirSessao();
    } catch (e) {
      est.aviso = { tipo: "alerta", texto: `${e.message} Entre com e-mail e senha.` };
    } finally {
      est.ocupado.auto = false;
      render();
    }
  }

  // o login do sistema chegou (ou mudou) com a faixa aberta: entra sozinho
  chrome.storage.onChanged.addListener((mudou) => {
    if (mudou.tokenSistema && !est.sessao) entrarPeloSistema();
  });

  async function abrirSessao() {
    try {
      const s = await api("sessao", { versao: VERSAO });
      est.usuario = s.usuario;
      est.imoveis = s.imoveis || [];
      est.stats = s.sugestoes30d || {};
      est.versaoPublicada = s.versaoPublicada;
      render();
      if (est.conversa) await abrirConversa();
    } catch (e) {
      est.aviso = { tipo: "erro", texto: e.message };
      render();
    }
  }

  async function entrar(form) {
    const servidor = form.servidor.value.replace(/\/$/, "");
    const s = await auth("password", { email: form.email.value.trim(), password: form.senha.value });
    est.sessao = { servidor, ...s };
    await guardar({ sessao: est.sessao });
    await abrirSessao();
  }

  /** manual = clicou em Sair: não entra sozinho de novo com o mesmo login do sistema */
  async function sair(manual, motivo) {
    if (manual) {
      const t = await ler("tokenSistema");
      if (t?.access_token) await guardar({ ignorarToken: t.access_token });
    }
    Object.assign(est, {
      sessao: null, usuario: null, vinculo: null, cliente: null, candidatos: null, sugestao: null, resumo: null, vinculados: {},
      aviso: manual
        ? { tipo: "ok", texto: "Você saiu da faixa. Para entrar de novo, use e-mail e senha abaixo." }
        : motivo
          ? { tipo: "erro", texto: motivo }
          : est.aviso,
    });
    await chrome.storage.local.remove(["sessao", "vinculados"]);
    render();
  }

  function limparConversa() {
    Object.assign(est, {
      vinculo: null, cliente: null, candidatos: null, imovelRef: null, ref: null, msgsWa: [], guardadas: [],
      sugestao: null, resumo: null, aviso: null, trocando: false, novoAberto: false,
    });
  }

  function aoEvento(tipo, dados) {
    if (tipo === "pronto") {
      est.waPronto = true;
      render();
    } else if (tipo === "erro") {
      est.erroWa = dados;
      render();
    } else if (tipo === "conversa") {
      const mudou = dados?.id !== est.conversa?.id;
      est.conversa = dados;
      if (mudou) {
        limparConversa();
        render();
        if (est.usuario && dados && !dados.grupo) abrirConversa().catch(() => {});
      }
    } else if (tipo === "mensagem") {
      if (dados?.chatId && dados.chatId === est.conversa?.id && vinculada()) agendarSincronia();
    }
  }

  const vinculada = () => Boolean(est.vinculo && !est.vinculo.nao_cliente);

  /** Conversas que esta faixa sabe que estão vinculadas (manda as mensagens já na abertura). */
  function lembrarVinculo(chatId, sim) {
    if (Boolean(est.vinculados[chatId]) === sim) return;
    if (sim) est.vinculados[chatId] = true;
    else delete est.vinculados[chatId];
    guardar({ vinculados: est.vinculados });
  }

  /** "ref. AB12CD" na mensagem pré-preenchida do site/anúncio (lido só aqui, não sai do computador). */
  const achaRef = (msgs) => {
    for (const m of msgs) {
      const r = m.lado === "<" && /\bref\.?\s*:?\s*([0-9a-f]{6})\b/i.exec(m.texto || "");
      if (r) return r[1].toLowerCase();
    }
    return null;
  };

  /** Carrega o vínculo da conversa; com termo (ou trocando), procura clientes para escolher. */
  async function abrirConversa(termo) {
    const c = est.conversa;
    if (!c || c.grupo || !est.usuario) return;
    est.carregando = true;
    render();
    try {
      const buscando = est.trocando || Boolean(termo);
      const jaVinculada = !buscando && est.vinculados[c.id] === true;
      // conversa que não está vinculada não manda mensagem nenhuma ao CRM
      const msgs = await wa("mensagens", { chatId: c.id, quantas: 80 }).catch(() => []);
      if (!buscando && !jaVinculada) est.ref = achaRef(msgs.slice(0, 30));
      const r = await api("conversa/abrir", {
        wa_chat_id: c.id,
        telefone: c.telefone || "",
        nome: c.nome || undefined,
        buscar: buscando,
        termo: termo || undefined,
        ref: est.ref || undefined,
        ...(jaVinculada ? { mensagens: msgs } : {}),
      });
      if (est.conversa?.id !== c.id) return;
      est.vinculo = r.vinculo;
      est.cliente = r.cliente;
      est.candidatos = r.candidatos || null;
      est.imovelRef = r.imovelRef || est.imovelRef;
      if (!buscando) lembrarVinculo(c.id, vinculada());
      if (vinculada() && !buscando) {
        est.msgsWa = msgs;
        est.guardadas = r.mensagens || [];
        // vinculada em outro computador: grava as mensagens agora
        if (!jaVinculada) await sincronizar();
      }
    } catch (e) {
      est.aviso = { tipo: "erro", texto: e.message };
    } finally {
      est.carregando = false;
      render();
    }
  }

  async function aposVincular(r) {
    est.vinculo = r.vinculo;
    est.cliente = r.cliente;
    est.candidatos = null;
    est.trocando = false;
    est.novoAberto = false;
    lembrarVinculo(est.conversa.id, vinculada());
    if (vinculada()) await sincronizar();
  }

  const dadosConversa = () => ({ wa_chat_id: est.conversa.id, telefone: est.conversa.telefone || "", nome: est.conversa.nome || undefined, ref: est.ref || undefined });

  async function vincular(clientId) {
    await aposVincular(await api("vinculo", { ...dadosConversa(), client_id: clientId }));
    est.aviso = { tipo: "ok", texto: "Conversa vinculada ao cliente." };
  }

  async function naoCliente() {
    await aposVincular(await api("vinculo", { ...dadosConversa(), nao_cliente: true }));
  }

  async function clienteNovo(form) {
    const r = await api("cliente/novo", {
      ...dadosConversa(),
      nome: form.nome.value,
      telefone: form.telefone.value,
      imovel_id: form.imovel.value || undefined,
      origem: form.origem.value || undefined,
    });
    await aposVincular(r);
    est.aviso = { tipo: "ok", texto: "Cliente cadastrado no CRM e vinculado." };
  }

  let timerSinc = null;
  function agendarSincronia() {
    clearTimeout(timerSinc);
    timerSinc = setTimeout(() => sincronizar().then(render).catch(() => {}), 2500);
  }

  async function sincronizar() {
    if (!vinculada()) return;
    const chatId = est.conversa.id;
    est.msgsWa = await wa("mensagens", { chatId, quantas: 80 });
    if (est.conversa?.id !== chatId || !est.msgsWa.length) return;
    const r = await api("conversa", { vinculo_id: est.vinculo.id, mensagens: est.msgsWa });
    est.guardadas = r.mensagens || [];
  }

  /** Mensagens frescas do WhatsApp, para ir junto do pedido à IA. */
  async function mensagensAgora() {
    est.msgsWa = await wa("mensagens", { chatId: est.conversa.id, quantas: 80 }).catch(() => est.msgsWa);
    return est.msgsWa;
  }

  async function sugerir(pedido) {
    const mensagens = await mensagensAgora();
    est.sugestao = await naFila(() => api("ia/sugestao", { vinculo_id: est.vinculo.id, pedido: pedido || undefined, mensagens }));
    est.stats.pending = (est.stats.pending || 0) + 1;
  }

  async function usarSugestao(i) {
    const s = est.sugestao?.sugestoes?.[i];
    if (!s) return;
    await wa("porNaCaixa", { chatId: est.conversa.id, texto: s.texto });
    api("ia/sugestao/usar", { sugestao_id: est.sugestao.id, indice: i }).catch(() => {});
    est.aviso = { tipo: "ok", texto: "Texto colocado na caixa. Revise, ajuste se quiser e envie." };
  }

  async function resumir() {
    const mensagens = await mensagensAgora();
    est.resumo = (await naFila(() => api("ia/resumo", { vinculo_id: est.vinculo.id, mensagens }))).texto;
  }

  async function salvarNota(texto) {
    await api("nota", { vinculo_id: est.vinculo.id, texto });
    est.resumo = null;
    est.aviso = { tipo: "ok", texto: "Salvo nas anotações do cliente." };
  }

  async function transcrever(m) {
    const audio = await wa("baixarAudio", { msgId: m.id });
    const bin = atob(audio.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (bytes.length > 4_000_000) throw new Error("Áudio grande demais para transcrever (máximo 4 MB).");
    const fd = new FormData();
    fd.append("audio", new Blob([bytes], { type: audio.tipo }), "audio.ogg");
    fd.append("vinculo_id", est.vinculo.id);
    fd.append("msg_id", m.id);
    fd.append("ts", String(m.ts));
    fd.append("lado", m.lado);
    fd.append("segundos", String(m.seg || 0));
    const r = await naFila(() => api("ia/transcrever", fd));
    const g = est.guardadas.find((x) => x.id === m.id);
    if (g) g.texto = r.texto;
    else est.guardadas.push({ ...m, texto: r.texto });
  }

  async function boaResposta() {
    const mensagens = await mensagensAgora();
    const r = await api("conhecimento/ultima", { vinculo_id: est.vinculo.id, mensagens });
    est.aviso = { tipo: "ok", texto: `A RIA aprendeu com a sua resposta: "${r.resposta.slice(0, 80)}${r.resposta.length > 80 ? "…" : ""}"` };
  }

  // ── aprender com conversas ──────────────────────────────────────────────
  const TIPO_EXPORT = { a: "audio", i: "imagem", v: "video", d: "documento" };

  function progresso(feito, total, texto) {
    est.aprender.progresso = { feito, total, texto };
    render();
  }

  /** Lê as conversas escolhidas do WhatsApp Web, no formato do arquivo exportado. */
  async function coletar() {
    const ap = est.aprender;
    const alvos =
      ap.escopo === "esta"
        ? [{ id: est.conversa.id, nome: est.conversa.nome, telefone: est.conversa.telefone }]
        : await wa("listarConversas", { quantas: ap.quantas });
    const conversas = [];
    for (let i = 0; i < alvos.length && !ap.parar; i++) {
      const c = alvos[i];
      progresso(i, alvos.length, `Lendo ${c.nome || c.telefone || "conversa"}${ap.antigo ? " (pedindo o histórico ao celular)" : ""}…`);
      const h = await wa("historico", { chatId: c.id, max: 2000, antigo: ap.antigo }, 10 * 60000).catch(() => null);
      if (!h?.mensagens?.length) continue;
      conversas.push({
        chat_id: c.id,
        nome: c.nome || "",
        telefone: c.telefone || "",
        historico_completo: h.completo,
        total_mensagens: h.mensagens.length,
        mensagens: h.mensagens.map((m) => ({
          id: m.id,
          data: new Date(m.ts * 1000).toISOString(),
          de: m.lado === ">" ? "corretor" : "cliente",
          tipo: m.tipo ? TIPO_EXPORT[m.tipo] : "texto",
          ...(m.seg ? { duracao_seg: m.seg } : {}),
          texto: m.texto,
        })),
      });
    }
    return conversas;
  }

  async function exportarConversas() {
    const ap = est.aprender;
    ap.parar = false;
    try {
      const conversas = await coletar();
      if (!conversas.length) throw new Error("Nenhuma mensagem encontrada para exportar.");
      const arquivo = { formato: "nordic-conversas-v1", exportado_em: new Date().toISOString(), conta: est.usuario?.nome || "", conversas };
      const blob = new Blob([JSON.stringify(arquivo, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `nordic-conversas-${hojeISO()}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 1000);
      const incompletas = conversas.filter((c) => !c.historico_completo).length;
      est.aviso = {
        tipo: "ok",
        texto:
          `Exportadas ${conversas.length} conversa${conversas.length === 1 ? "" : "s"} (${conversas.reduce((n, c) => n + c.total_mensagens, 0)} mensagens).` +
          (incompletas ? ` Em ${incompletas}, o celular não entregou o histórico inteiro.` : ""),
      };
    } finally {
      ap.progresso = null;
    }
  }

  /** Chama a API e, no limite da IA, espera o tempo pedido e tenta de novo. */
  async function comEspera(fn, rotulo) {
    for (let tentativa = 0; ; tentativa++) {
      try {
        return await fn();
      } catch (e) {
        if (e.status !== 429 || tentativa >= 6 || est.aprender.parar) throw e;
        const seg = (e.esperarSeg || 30) + 1;
        const p = est.aprender.progresso;
        progresso(p?.feito || 0, p?.total || 1, `Limite da IA: aguardando ${seg} s para continuar ${rotulo}…`);
        await dormir(seg * 1000);
      }
    }
  }

  async function aprenderComConversas() {
    const ap = est.aprender;
    ap.parar = false;
    ap.propostas = null;
    ap.historico = null;
    try {
      const conversas = await coletar();
      if (!conversas.length) throw new Error("Nenhuma mensagem encontrada para analisar.");
      const regras = [];
      const exemplos = [];
      let puladas = 0;
      for (let i = 0; i < conversas.length && !ap.parar; i++) {
        const c = conversas[i];
        progresso(i, conversas.length, `A RIA está lendo ${c.nome || c.telefone || "a conversa"}…`);
        const r = await comEspera(() => api("ia/aprender", { conversa: c }), "a leitura");
        if (r.pulada) puladas++;
        regras.push(...r.regras);
        exemplos.push(...r.exemplos);
        if (ap.escopo === "esta" && vinculada() && r.historico) ap.historico = r.historico;
      }
      progresso(conversas.length, conversas.length, "Juntando o que se repete e tirando o que a base já tem…");
      const final = await comEspera(() => api("ia/aprender/consolidar", { regras, exemplos }), "a consolidação");
      ap.propostas = final;
      ap.marcadas = { r: new Set(final.regras.map((_, i) => i)), e: new Set(final.exemplos.map((_, i) => i)) };
      ap.relatorio = { conversas: conversas.length, puladas, incompletas: conversas.filter((c) => !c.historico_completo).length };
      if (!final.regras.length && !final.exemplos.length && !ap.historico) {
        est.aviso = { tipo: "alerta", texto: "A RIA não achou nada novo para aprender nessas conversas." };
      }
    } finally {
      ap.progresso = null;
    }
  }

  async function salvarAprendizado() {
    const ap = est.aprender;
    const regras = ap.propostas.regras.filter((_, i) => ap.marcadas.r.has(i));
    const exemplos = ap.propostas.exemplos.filter((_, i) => ap.marcadas.e.has(i));
    const r = await api("conhecimento/lote", { regras, exemplos });
    ap.propostas = null;
    est.aviso = { tipo: "ok", texto: `${r.salvos} ${r.salvos === 1 ? "item entrou" : "itens entraram"} na base de conhecimento da RIA.` };
  }

  async function salvarHistorico() {
    await api("nota", { vinculo_id: est.vinculo.id, texto: `Histórico da conversa (RIA)\n${est.aprender.historico}` });
    est.aprender.historico = null;
    est.aviso = { tipo: "ok", texto: "Histórico salvo nas anotações do cliente." };
  }

  async function registrarVisita(form) {
    if (!form.data.value || !form.hora.value) throw new Error("Informe data e hora da visita.");
    const quando = new Date(`${form.data.value}T${form.hora.value}:00`).toISOString();
    const r = await api("visita", {
      vinculo_id: est.vinculo.id,
      origem: form.origem.value,
      quando,
      imovel_id: form.imovel.value || undefined,
      obs: form.obs.value || undefined,
    });
    form.reset();
    est.aviso = { tipo: "ok", texto: `${r.titulo} registrada para ${r.quando} (tarefa e anotação no CRM).` };
  }

  // ── telas ────────────────────────────────────────────────────────────────
  function render() {
    $topo.innerHTML =
      `<button type="button" data-acao="recolher" title="Recolher a faixa" aria-label="Recolher a faixa">${ic("recolher")}</button>` +
      (est.usuario ? `<button type="button" data-acao="sair" title="Sair da conta" aria-label="Sair da conta">${ic("sair")}</button>` : "");
    // o painel é redesenhado inteiro: guarda o que estava digitado, o foco e as seções abertas
    const valores = {};
    let foco = null;
    $app.querySelectorAll("form[id] [name]").forEach((el) => {
      const k = `${el.form.id}.${el.name}`;
      valores[k] = el.value;
      if (el === document.activeElement) foco = { k, ini: el.selectionStart, fim: el.selectionEnd };
    });
    const abertas = new Set([...$app.querySelectorAll("details[id][open]")].map((d) => d.id));
    const fechadas = new Set([...$app.querySelectorAll("details[id]:not([open])")].map((d) => d.id));
    $app.innerHTML = !est.sessao || !est.usuario ? telaLogin() : telaPrincipal();
    $app.querySelectorAll("details[id]").forEach((d) => {
      if (abertas.has(d.id)) d.open = true;
      if (fechadas.has(d.id)) d.open = false;
    });
    $app.querySelectorAll("form[id] [name]").forEach((el) => {
      const k = `${el.form.id}.${el.name}`;
      if (k in valores && valores[k]) el.value = valores[k];
      if (foco?.k === k) {
        el.focus();
        try {
          el.setSelectionRange(foco.ini, foco.fim);
        } catch {}
      }
    });
  }

  // ícones (traços do Lucide, MIT)
  const ICONES = {
    recolher: '<path d="M3 3h18v18H3z"/><path d="M15 3v18"/><path d="m8 9 3 3-3 3"/>',
    sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    ria: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
    abrir: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    busca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    nota: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
    audio: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    agenda: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    livro: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    joinha: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  };
  const ic = (n, p) => `<svg class="ic${p ? " p" : ""}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[n] || ""}</svg>`;
  const girando = (nome, texto) => (est.ocupado[nome] ? `<span class="carregando" aria-hidden="true"></span> ${texto}` : null);
  const aviso = () => (est.aviso ? `<p class="aviso ${esc(est.aviso.tipo)}" role="status">${esc(est.aviso.texto)}</p>` : "");

  function telaLogin() {
    const s = est.sistema;
    const auto =
      est.ocupado.auto
        ? `<p class="aviso"><span class="carregando" aria-hidden="true"></span> Entrando com a conta do CRM…</p>`
        : s?.situacao === "ok"
          ? `<button type="button" class="dourado largo" data-acao="entrar-sistema">Entrar como ${esc(s.email)}</button>`
          : `<p class="mudo">Dica: com o Nordic CRM aberto e logado neste navegador, a faixa entra sozinha.</p>`;
    const opcoes = CFG.servidores.map((x) => `<option value="${esc(x.url)}">${esc(x.nome)}</option>`).join("");
    return `
      ${aviso()}
      <section class="cartao">
        <h2>Entrar</h2>
        ${auto}
        <hr class="separador" />
        <form id="f-login" data-form="login">
          <label>E-mail<input name="email" type="email" autocomplete="username" required /></label>
          <label>Senha<input name="senha" type="password" autocomplete="current-password" required /></label>
          ${CFG.servidores.length > 1 ? `<label>Servidor<select name="servidor">${opcoes}</select></label>` : `<input type="hidden" name="servidor" value="${esc(CFG.servidores[0].url)}" />`}
          <button class="primario largo" ${est.ocupado.login ? "disabled" : ""}>${girando("login", "Entrando…") || "Entrar"}</button>
        </form>
      </section>
      <p class="rodape">Exclusivo do administrador do Nordic CRM · v${esc(VERSAO)}</p>`;
  }

  function telaPrincipal() {
    const versao =
      est.versaoPublicada && est.versaoPublicada !== VERSAO
        ? `<p class="aviso alerta">Há uma versão nova da extensão (${esc(est.versaoPublicada)}). Baixe na página Extensão do CRM.</p>`
        : "";
    let corpo;
    if (est.erroWa) corpo = `<p class="aviso erro">${esc(est.erroWa)}</p>`;
    else if (!est.waPronto) corpo = `<p class="aviso"><span class="carregando" aria-hidden="true"></span> Carregando o WhatsApp Web…</p>`;
    else if (!est.conversa) corpo = `<section class="cartao"><p class="mudo">Abra uma conversa para ver o cliente e usar a RIA.</p></section>`;
    else if (est.conversa.grupo) corpo = `<section class="cartao"><p class="mudo">Grupos e canais não são acompanhados.</p></section>`;
    else if (est.carregando && !est.vinculo && !est.candidatos)
      corpo = `<p class="aviso"><span class="carregando" aria-hidden="true"></span> Procurando o cliente…</p>`;
    else if (!est.vinculo || est.trocando) corpo = telaVincular();
    else if (est.vinculo.nao_cliente) corpo = telaNaoCliente();
    else corpo = telaCliente();
    const aprender = est.waPronto && !est.erroWa ? secaoAprender() : "";
    return `${versao}${aviso()}${corpo}${aprender}${rodapeStats()}`;
  }

  function rodapeStats() {
    const s = est.stats || {};
    const total = (s.used || 0) + (s.edited || 0) + (s.ignored || 0);
    if (!total) return `<p class="rodape">${esc(est.usuario?.nome || "")} · v${esc(VERSAO)}</p>`;
    const pct = Math.round(((s.used || 0) / total) * 100);
    return `<p class="rodape" title="Últimos 30 dias">RIA: ${pct}% enviadas sem editar · ${s.edited || 0} editadas · ${s.ignored || 0} ignoradas</p>`;
  }

  function cabecalhoContato() {
    const c = est.conversa;
    return `<div class="cliente"><span class="avatar" aria-hidden="true">${esc(iniciais(c.nome))}</span>
      <div class="info"><h3>${esc(c.nome || c.telefone || "Contato")}</h3><span class="mudo">${esc(c.telefone ? `+${c.telefone}` : "número oculto")}</span></div></div>`;
  }

  function telaVincular() {
    const lista = est.candidatos || [];
    const itens = lista.length
      ? `<ul class="lista">${lista
          .map(
            (c) => `<li class="item"><div class="info"><div class="nome">${esc(c.nome)}</div>
              <div class="mudo">${esc([c.etapa, c.imovel, c.telefone].filter(Boolean).join(" · "))}</div></div>
              <button type="button" class="pequeno dourado" data-acao="vincular" data-id="${esc(c.id)}">Vincular</button></li>`,
          )
          .join("")}</ul>`
      : `<p class="mudo">Nenhum cliente com este telefone. Procure pelo nome ou cadastre.</p>`;
    const ref = est.imovelRef ? `<p class="aviso ok ref">Veio pelo link do imóvel <b>${esc(est.imovelRef.title)}</b> (ref. ${esc(est.ref)}).</p>` : "";
    const opcoesImovel = `<option value="">—</option>${est.imoveis
      .map((i) => `<option value="${esc(i.id)}" ${est.imovelRef?.id === i.id ? "selected" : ""}>${esc(i.title)}</option>`)
      .join("")}`;
    return `
      <section class="cartao">
        ${cabecalhoContato()}
        ${ref}
        <hr class="separador" />
        <h2>${est.trocando ? "Trocar cliente" : "Vincular ao cliente"}</h2>
        ${est.carregando ? `<p class="mudo"><span class="carregando" aria-hidden="true"></span> Procurando…</p>` : itens}
        <form id="f-busca" data-form="busca" class="campo-linha">
          <input name="termo" placeholder="Nome, e-mail ou telefone" aria-label="Buscar cliente" />
          <button class="pequeno" aria-label="Buscar">${ic("busca", true)}</button>
        </form>
        <div class="acoes">
          <button type="button" class="pequeno" data-acao="novo">${est.novoAberto ? "Fechar cadastro" : "Cadastrar como cliente novo"}</button>
          <button type="button" class="pequeno" data-acao="nao-cliente">Não é cliente</button>
          ${est.trocando ? `<button type="button" class="pequeno" data-acao="cancelar-troca">Cancelar</button>` : ""}
        </div>
      </section>
      ${
        est.novoAberto
          ? `<section class="cartao"><h2>Cliente novo</h2>
        <form id="f-novo" data-form="novo">
          <label>Nome<input name="nome" required value="${esc(est.conversa.nome)}" /></label>
          <label>Telefone<input name="telefone" required value="${esc(est.conversa.telefone)}" /></label>
          <label>Imóvel de interesse<select name="imovel">${opcoesImovel}</select></label>
          <label>Origem<input name="origem" placeholder="Site, Anúncio, Indicação…" value="${est.imovelRef ? "Link do imóvel" : ""}" /></label>
          <button class="primario largo" ${est.ocupado.novo ? "disabled" : ""}>${girando("novo", "Cadastrando…") || "Cadastrar e vincular"}</button>
        </form></section>`
          : ""
      }`;
  }

  function telaNaoCliente() {
    return `<section class="cartao">${cabecalhoContato()}
      <p class="mudo" style="margin-top:10px">Marcada como "não é cliente": esta conversa não é guardada no CRM.</p>
      <div class="acoes"><button type="button" class="pequeno" data-acao="trocar">Vincular a um cliente</button></div></section>`;
  }

  function telaCliente() {
    const c = est.cliente || {};
    const v = est.vinculo;
    const espera =
      v.ultima_lado === "<" && v.ultima_cliente_em
        ? `<span class="selo alerta">Esperando sua resposta há ${esc(ha(v.ultima_cliente_em))}</span>`
        : v.ultima_lado === ">" && v.ultima_corretor_em
          ? `<span class="selo">Aguardando o cliente há ${esc(ha(v.ultima_corretor_em))}</span>`
          : "";
    const dados = [
      ["Etapa", c.etapa],
      ["Imóvel", c.imovel],
      ["Origem", c.origem],
    ]
      .filter(([, x]) => x)
      .map(([k, x]) => `<dt>${k}</dt><dd>${esc(x)}</dd>`)
      .join("");
    return `
      <section class="cartao">
        <div class="cliente"><span class="avatar" aria-hidden="true">${esc(iniciais(c.nome))}</span>
          <div class="info"><h3>${esc(c.nome)}</h3>${espera}</div></div>
        ${dados ? `<dl class="dados">${dados}</dl>` : ""}
        <div class="acoes">
          <a class="botao pequeno" href="${esc(est.sessao.servidor)}/client/${esc(c.id)}" target="_blank" rel="noopener">${ic("abrir", true)} Abrir no CRM</a>
          <button type="button" class="pequeno" data-acao="trocar">Trocar cliente</button>
        </div>
      </section>
      ${secaoRia()}
      ${secaoAudios()}
      ${secaoNota()}
      ${secaoVisita()}`;
  }

  function secaoRia() {
    const s = est.sugestao;
    const lista = s
      ? `${s.analise ? `<p class="analise">${esc(s.analise)}</p>` : ""}
         <div class="lista">${s.sugestoes
           .map(
             (x, i) => `<button type="button" class="sugestao" data-acao="usar" data-i="${i}" title="Colocar na caixa de mensagem">${esc(x.texto)}${x.porque ? `<small>${esc(x.porque)}</small>` : ""}</button>`,
           )
           .join("")}</div>`
      : "";
    return `<details class="cartao" id="d-ria" open><summary><span>${ic("ria", true)} RIA</span></summary>
      <form id="f-ria" data-form="ria">
        <label>Pedido para a RIA (opcional)<input name="pedido" placeholder="Ex.: convidar para visitar sábado" /></label>
        <button class="dourado largo" ${est.ocupado.ria ? "disabled" : ""}>${girando("ria", "Pensando…") || "Sugerir resposta"}</button>
      </form>
      ${lista}
      <div class="acoes"><button type="button" class="pequeno" data-acao="boa-resposta" ${est.ocupado.boa ? "disabled" : ""} title="Sua última mensagem vira exemplo para a RIA">${girando("boa", "Guardando…") || `${ic("joinha", true)} Minha última resposta foi boa`}</button></div>
    </details>`;
  }

  function secaoAudios() {
    const audios = est.msgsWa.filter((m) => m.tipo === "a").slice(-4).reverse();
    if (!audios.length) return "";
    const itens = audios
      .map((m) => {
        const t = est.guardadas.find((g) => g.id === m.id)?.texto;
        const quem = m.lado === "<" ? "Cliente" : "Você";
        const nome = `tr-${m.id}`;
        return `<li class="audio"><div class="linha"><span class="mudo">${quem} · ${new Date(m.ts * 1000).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}${m.seg ? ` · ${m.seg}s` : ""}</span>
          ${t ? "" : `<button type="button" class="pequeno" data-acao="transcrever" data-id="${esc(m.id)}" ${est.ocupado[nome] ? "disabled" : ""}>${girando(nome, "…") || "Transcrever"}</button>`}</div>
          ${t ? `<p>${esc(t)}</p>` : ""}</li>`;
      })
      .join("");
    return `<details class="cartao" id="d-audios"><summary><span>${ic("audio", true)} Áudios</span></summary><ul class="lista">${itens}</ul></details>`;
  }

  function secaoNota() {
    const corpo = est.resumo
      ? `<form id="f-nota" data-form="nota"><label>Revise antes de salvar<textarea name="texto" rows="8">${esc(est.resumo)}</textarea></label>
          <div class="acoes"><button class="primario" ${est.ocupado.nota ? "disabled" : ""}>${girando("nota", "Salvando…") || "Salvar na anotação"}</button>
          <button type="button" class="pequeno" data-acao="descartar-resumo">Descartar</button></div></form>`
      : `<button type="button" class="largo" data-acao="resumir" ${est.ocupado.resumo ? "disabled" : ""}>${girando("resumo", "Resumindo…") || "Resumir a conversa com a RIA"}</button>`;
    return `<details class="cartao" id="d-nota"><summary><span>${ic("nota", true)} Salvar nas anotações</span></summary>${corpo}</details>`;
  }

  function secaoVisita() {
    const opcoes = `<option value="">—</option>${est.imoveis
      .map((i) => `<option value="${esc(i.id)}">${esc(i.title)}</option>`)
      .join("")}`;
    return `<details class="cartao" id="d-visita"><summary><span>${ic("agenda", true)} Registrar visita</span></summary>
      <form id="f-visita" data-form="visita">
        <label>Onde<select name="origem"><option value="quintoandar">QuintoAndar (agendada pela vitrine)</option><option value="lancamento">Lançamento (estande/decorado)</option><option value="outro">Outro</option></select></label>
        <div class="grade2"><label>Data<input name="data" type="date" min="${hojeISO()}" required /></label><label>Hora<input name="hora" type="time" step="900" required /></label></div>
        <label>Imóvel<select name="imovel">${opcoes}</select></label>
        <label>Observação<input name="obs" placeholder="Ex.: vai com a esposa" /></label>
        <button class="primario largo" ${est.ocupado.visita ? "disabled" : ""}>${girando("visita", "Registrando…") || "Registrar visita"}</button>
      </form></details>`;
  }

  function secaoAprender() {
    const ap = est.aprender;
    const temConversa = est.conversa && !est.conversa.grupo;
    let corpo;
    if (ap.progresso) {
      const p = ap.progresso;
      const pct = p.total ? Math.round((p.feito / p.total) * 100) : 0;
      corpo = `<p class="mudo"><span class="carregando" aria-hidden="true"></span> ${esc(p.texto)}</p>
        <div class="progresso" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
        <p class="mudo">${p.feito} de ${p.total}</p>
        <button type="button" class="pequeno" data-acao="parar-aprender" ${ap.parar ? "disabled" : ""}>${ap.parar ? "Parando…" : "Parar"}</button>`;
    } else if (ap.propostas || ap.historico) {
      const item = (k, x, i) =>
        `<label class="check"><input type="checkbox" data-acao="marcar" data-k="${k}" data-i="${i}" ${ap.marcadas[k].has(i) ? "checked" : ""} />
          <span>${x.situacao ? `<b>${esc(x.situacao)}</b><br />` : ""}${esc(x.resposta)}</span></label>`;
      const pr = ap.propostas || { regras: [], exemplos: [] };
      const n = ap.marcadas.r.size + ap.marcadas.e.size;
      const rel = ap.relatorio;
      const plural = (q, s, p) => `${q} ${q === 1 ? s : p}`;
      corpo = `
        ${rel ? `<p class="mudo">${plural(rel.conversas, "conversa lida", "conversas lidas")}${rel.puladas ? ` · ${plural(rel.puladas, "curta demais", "curtas demais")}` : ""}${rel.incompletas ? ` · ${rel.incompletas} sem o histórico inteiro` : ""}</p>` : ""}
        ${ap.historico ? `<h2>Histórico desta conversa</h2><p class="historico">${esc(ap.historico)}</p>
          <button type="button" class="pequeno largo" data-acao="salvar-historico" ${est.ocupado.historico ? "disabled" : ""}>${girando("historico", "Salvando…") || "Salvar histórico na anotação"}</button><hr class="separador" />` : ""}
        ${pr.regras.length ? `<h2>Regras propostas (${pr.regras.length})</h2><div class="lista">${pr.regras.map((x, i) => item("r", x, i)).join("")}</div>` : ""}
        ${pr.exemplos.length ? `<h2 style="margin-top:10px">Exemplos de resposta (${pr.exemplos.length})</h2><div class="lista">${pr.exemplos.map((x, i) => item("e", x, i)).join("")}</div>` : ""}
        <div class="acoes">
          ${pr.regras.length || pr.exemplos.length ? `<button type="button" class="primario" data-acao="salvar-aprendizado" ${!n || est.ocupado.salvarAp ? "disabled" : ""}>${girando("salvarAp", "Salvando…") || `Salvar ${n} na base`}</button>` : ""}
          <button type="button" class="pequeno" data-acao="descartar-aprendizado">Descartar</button>
        </div>`;
    } else {
      corpo = `
        <form data-form="aprender">
          <fieldset class="opcoes">
            <label class="check"><input type="radio" name="escopo" value="esta" ${ap.escopo === "esta" ? "checked" : ""} ${temConversa ? "" : "disabled"} /> <span>Esta conversa${temConversa ? "" : " (abra uma conversa)"}</span></label>
            <label class="check"><input type="radio" name="escopo" value="ultimas" ${ap.escopo === "ultimas" ? "checked" : ""} /> <span>Minhas últimas
              <select name="quantas" aria-label="Quantas conversas">${[10, 30, 50, 100].map((q) => `<option ${ap.quantas === q ? "selected" : ""}>${q}</option>`).join("")}</select> conversas</span></label>
          </fieldset>
          <label class="check"><input type="checkbox" name="antigo" ${ap.antigo ? "checked" : ""} /> <span>Buscar o histórico antigo no celular (mais lento)</span></label>
          <div class="acoes">
            <button class="dourado" data-tipo="analisar">Analisar com a RIA</button>
            <button class="pequeno" data-tipo="exportar">${ic("download", true)} Exportar JSON</button>
          </div>
          <p class="mudo">A RIA lê as conversas inteiras e propõe regras e exemplos do seu jeito de atender; você escolhe o que entra. Nomes, telefones e e-mails viram marcadores antes de ir para a IA, e as conversas não ficam guardadas.</p>
        </form>`;
    }
    const aberta = ap.progresso || ap.propostas || ap.historico;
    return `<details class="cartao" id="d-aprender"${aberta ? " open" : ""}><summary><span>${ic("livro", true)} Aprender com conversas</span></summary>${corpo}</details>`;
  }

  // ── eventos ──────────────────────────────────────────────────────────────
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    const a = b.dataset.acao;
    if (a === "recolher") parent.postMessage({ nordic: "recolher" }, WA_ORIGEM);
    else if (a === "sair") sair(true);
    else if (a === "entrar-sistema") entrarPeloSistema(true);
    else if (a === "vincular") acao("vincular", () => vincular(b.dataset.id));
    else if (a === "nao-cliente") acao("vincular", naoCliente);
    else if (a === "novo") {
      est.novoAberto = !est.novoAberto;
      render();
    } else if (a === "trocar") {
      est.trocando = true;
      est.candidatos = null;
      acao("buscar", () => abrirConversa());
    } else if (a === "cancelar-troca") {
      est.trocando = false;
      est.novoAberto = false;
      acao("buscar", () => abrirConversa());
    } else if (a === "usar") acao("usar", () => usarSugestao(Number(b.dataset.i)));
    else if (a === "resumir") acao("resumo", resumir);
    else if (a === "descartar-resumo") {
      est.resumo = null;
      render();
    } else if (a === "transcrever") {
      const m = est.msgsWa.find((x) => x.id === b.dataset.id);
      if (m) acao(`tr-${m.id}`, () => transcrever(m));
    } else if (a === "boa-resposta") acao("boa", boaResposta);
    else if (a === "parar-aprender") {
      est.aprender.parar = true;
      render();
    } else if (a === "marcar") {
      const marcadas = est.aprender.marcadas[b.dataset.k];
      const i = Number(b.dataset.i);
      if (b.checked) marcadas.add(i);
      else marcadas.delete(i);
      render();
    } else if (a === "salvar-aprendizado") acao("salvarAp", salvarAprendizado);
    else if (a === "descartar-aprendizado") {
      Object.assign(est.aprender, { propostas: null, historico: null, relatorio: null });
      render();
    } else if (a === "salvar-historico") acao("historico", salvarHistorico);
  });

  // opções do "Aprender com conversas" ficam no estado (o painel é redesenhado inteiro)
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (!el.closest?.('form[data-form="aprender"]')) return;
    const ap = est.aprender;
    if (el.name === "escopo") ap.escopo = el.value;
    else if (el.name === "quantas") {
      ap.quantas = Number(el.value);
      ap.escopo = "ultimas";
    } else if (el.name === "antigo") ap.antigo = el.checked;
    render();
  });

  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (!f.dataset?.form) return;
    e.preventDefault();
    const tipo = f.dataset.form;
    if (tipo === "login") acao("login", () => entrar(f));
    else if (tipo === "busca") acao("buscar", () => abrirConversa(f.termo.value.trim() || undefined));
    else if (tipo === "novo") acao("novo", () => clienteNovo(f));
    else if (tipo === "ria") acao("ria", () => sugerir(f.pedido.value.trim()));
    else if (tipo === "nota") acao("nota", () => salvarNota(f.texto.value));
    else if (tipo === "visita") acao("visita", () => registrarVisita(f));
    else if (tipo === "aprender") {
      const quer = e.submitter?.dataset.tipo === "exportar" ? "exportar" : "analisar";
      if (est.aprender.escopo === "esta" && (!est.conversa || est.conversa.grupo)) est.aprender.escopo = "ultimas";
      acao("aprender", quer === "exportar" ? exportarConversas : aprenderComConversas);
    }
  });

  iniciar();
})();
