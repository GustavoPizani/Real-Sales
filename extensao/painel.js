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
    aba: "clientes", // clientes | conversa | aprender
    conversaInicial: true, // a primeira conversa ativa vem do carregamento, não de um clique
    conversa: null, // { id, nome, telefone, grupo }
    carregando: false,
    vinculo: null, // { id, nao_cliente, ultima_*, etiquetas: [tagId], prazo: { em, nota } | null }
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
    vinculados: {}, // chatId → id do vínculo: conversas vinculadas (abre numa chamada só)
    // etiquetas: as do CRM, cada uma ligada (ou não) a uma do WhatsApp Business
    etiquetas: [], // { id, nome, cor, wa_label_id }
    waBusiness: false,
    editandoEtiquetas: false,
    prazoAberto: false,
    // lista de clientes
    filtros: { etiqueta_id: "", situacao: "todas", sem_contato_dias: "", ordem: "sem_contato" },
    // clientes e funis do CRM (aba Funil)
    crm: {
      funis: null,
      imoveis: [],
      filtros: { funil_id: "", etapa_id: "", produto_id: "", etiqueta_id: "", status: "ACTIVE", sem_atualizar_dias: "", busca: "" },
      clientes: null,
      total: null,
      cliente: null, // cartão aberto
    },
    vincularAoAbrir: null, // { clientId, telefone }: conversa aberta pelo cartão do CRM
    visitaAgenda: null, // { url, titulo }: última visita registrada, para salvar no Google Agenda
    itensLista: null,
    // "Aprender com conversas": exportar em JSON e a RIA propor regras e exemplos
    aprender: {
      escopo: "esta", // esta | ultimas | etiqueta | escolher
      quantas: 30,
      etiquetaWa: "", // id da etiqueta do WhatsApp (escopo "etiqueta")
      opcoes: null, // conversas para escolher (escopo "escolher")
      escolhidas: new Set(), // ids das conversas marcadas
      busca: "",
      registro: null, // Map chave → conversa já usada (analisada_em, ultima_msg_em, novidades…)
      pularUsadas: true, // pula as já usadas que não têm mensagens novas
      antigo: true, // pedir ao celular o histórico antigo
      progresso: null, // { feito, total, texto }
      parar: false,
      propostas: null, // { regras, exemplos }
      marcadas: { r: new Set(), e: new Set() },
      historico: null, // histórico da conversa (aberta e vinculada, ou importada), para a anotação
      historicoImportado: false, // o histórico veio de um .zip: escolhe o cliente para salvar
      clientesHistorico: null, // busca de cliente para salvar o histórico importado
      importado: null, // conversa exportada pelo WhatsApp (.zip/.txt) pronta para analisar
      transcreverAudios: true,
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
  const dataCurta = (iso) =>
    new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const vencido = (iso) => iso && Date.parse(iso) <= Date.now();
  const guardar = (o) => chrome.storage.local.set(o);
  const ler = (k) => new Promise((r) => chrome.storage.local.get(k, (v) => r(v[k])));
  const iniciais = (n) =>
    String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const hojeISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const etiqueta = (id) => est.etiquetas.find((e) => e.id === id);
  const avisarBackground = () => chrome.runtime.sendMessage({ nordic: "conferir-prazos" }).catch(() => {});

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
    // o service worker (prazos) pode ter renovado antes: usa a sessão guardada
    const guardada = await ler("sessao");
    if (guardada && guardada.expira > Date.now()) {
      Object.assign(s, guardada);
      return s.token;
    }
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
    // o service worker usa para renovar a sessão ao conferir os prazos
    guardar({ configAuth: { supabaseUrl: CFG.supabaseUrl, supabaseKey: CFG.supabaseKey } });
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
      est.etiquetas = s.etiquetas || [];
      est.stats = s.sugestoes30d || {};
      est.versaoPublicada = s.versaoPublicada;
      render();
      avisarBackground();
      if (est.waPronto) carregarEtiquetas();
      if (est.aba === "clientes") acao("lista", carregarLista);
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
      sessao: null, usuario: null, vinculo: null, cliente: null, candidatos: null, sugestao: null, resumo: null,
      vinculados: {}, itensLista: null, aba: "clientes",
      aviso: manual
        ? { tipo: "ok", texto: "Você saiu da faixa. Para entrar de novo, use e-mail e senha abaixo." }
        : motivo
          ? { tipo: "erro", texto: motivo }
          : est.aviso,
    });
    await chrome.storage.local.remove(["sessao", "vinculados", "prazosAvisados"]);
    avisarBackground(); // limpa o número no ícone
    render();
  }

  function limparConversa() {
    Object.assign(est, {
      vinculo: null, cliente: null, candidatos: null, imovelRef: null, ref: null, msgsWa: [], guardadas: [],
      sugestao: null, resumo: null, aviso: null, trocando: false, novoAberto: false, editandoEtiquetas: false, prazoAberto: false,
    });
  }

  function aoEvento(tipo, dados) {
    if (tipo === "pronto") {
      est.waPronto = true;
      if (est.usuario) carregarEtiquetas();
      render();
    } else if (tipo === "erro") {
      est.erroWa = dados;
      render();
    } else if (tipo === "conversa") {
      const mudou = dados?.id !== est.conversa?.id;
      est.conversa = dados;
      // conversa aberta pelo usuário (não a do carregamento): mostra a aba Conversa
      if (mudou && dados && !est.conversaInicial && est.aba !== "aprender" && est.aba !== "crm") est.aba = "conversa";
      if (mudou && dados && est.vincularAoAbrir) est.aba = "conversa";
      est.conversaInicial = false;
      if (mudou) {
        limparConversa();
        render();
        if (est.usuario && dados && !dados.grupo) abrirConversa().catch(() => {});
      }
    } else if (tipo === "mensagem" && dados?.chatId) {
      if (dados.chatId === est.conversa?.id && vinculada()) agendarSincronia();
      // conversa vinculada que não está aberta: atualiza o "esperando você" da lista
      else if (typeof est.vinculados[dados.chatId] === "string") sincronizarOutra(dados.chatId);
    }
  }

  const vinculada = () => Boolean(est.vinculo && !est.vinculo.nao_cliente);

  /** Conversas que esta faixa sabe que estão vinculadas (chatId → id do vínculo). */
  function lembrarVinculo(chatId, vinculoId) {
    if ((est.vinculados[chatId] || null) === (vinculoId || null)) return;
    if (vinculoId) est.vinculados[chatId] = vinculoId;
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

  /** Etiquetas da conversa no WhatsApp Business (null no WhatsApp comum). */
  const etiquetasDaConversaWa = (chatId) =>
    est.waBusiness ? wa("etiquetasDaConversa", { chatId }).catch(() => null) : Promise.resolve(null);

  /** O servidor mesclou as etiquetas: aplica no WhatsApp o que mudou no CRM. */
  async function aplicarAcoesWa(chatId, acoesWa) {
    if (!acoesWa || !est.waBusiness) return;
    for (const labelId of acoesWa.adicionar || []) await wa("marcarEtiquetaWa", { chatId, labelId, marcar: true }).catch(() => {});
    for (const labelId of acoesWa.remover || []) await wa("marcarEtiquetaWa", { chatId, labelId, marcar: false }).catch(() => {});
  }

  /** Carrega o vínculo da conversa; com termo (ou trocando), procura clientes para escolher. */
  async function abrirConversa(termo) {
    const c = est.conversa;
    if (!c || c.grupo || !est.usuario) return;
    est.carregando = true;
    render();
    try {
      const buscando = est.trocando || Boolean(termo);
      const jaVinculada = !buscando && Boolean(est.vinculados[c.id]);
      // conversa que não está vinculada não manda mensagem nenhuma ao CRM
      const [msgs, etiquetasWa] = await Promise.all([
        wa("mensagens", { chatId: c.id, quantas: 80 }).catch(() => []),
        jaVinculada ? etiquetasDaConversaWa(c.id) : Promise.resolve(null),
      ]);
      if (!buscando && !jaVinculada) est.ref = achaRef(msgs.slice(0, 30));
      const r = await api("conversa/abrir", {
        wa_chat_id: c.id,
        telefone: c.telefone || "",
        nome: c.nome || undefined,
        buscar: buscando,
        termo: termo || undefined,
        ref: est.ref || undefined,
        ...(jaVinculada ? { mensagens: msgs } : {}),
        ...(etiquetasWa ? { etiquetas_wa: etiquetasWa } : {}),
      });
      if (est.conversa?.id !== c.id) return;
      // aberta pelo cartão do CRM: vincula sozinha ao cliente (se ainda não está vinculada)
      const alvo = est.vincularAoAbrir;
      const sufixo = (t) => String(t || "").replace(/\D/g, "").slice(-8);
      if (alvo && !buscando && !r.vinculo && sufixo(c.telefone) && sufixo(c.telefone) === sufixo(alvo.telefone)) {
        est.vincularAoAbrir = null;
        await vincular(alvo.clientId);
        return;
      }
      if (alvo && r.vinculo) est.vincularAoAbrir = null;
      est.vinculo = r.vinculo;
      est.cliente = r.cliente;
      est.candidatos = r.candidatos || null;
      est.imovelRef = r.imovelRef || est.imovelRef;
      if (!buscando) lembrarVinculo(c.id, vinculada() ? est.vinculo.id : null);
      if (vinculada() && !buscando) {
        est.msgsWa = msgs;
        est.guardadas = r.mensagens || [];
        await aplicarAcoesWa(c.id, r.acoesWa);
        // vinculada em outro computador: grava as mensagens e mescla as etiquetas agora
        if (!jaVinculada) await sincronizarTudo();
      }
    } catch (e) {
      est.aviso = { tipo: "erro", texto: e.message };
    } finally {
      est.carregando = false;
      render();
    }
  }

  /** Mensagens + etiquetas do WhatsApp da conversa aberta, numa chamada. */
  async function sincronizarTudo() {
    const c = est.conversa;
    const [msgs, etiquetasWa] = await Promise.all([
      wa("mensagens", { chatId: c.id, quantas: 80 }).catch(() => []),
      etiquetasDaConversaWa(c.id),
    ]);
    const r = await api("conversa/abrir", {
      wa_chat_id: c.id,
      telefone: c.telefone || "",
      mensagens: msgs,
      ...(etiquetasWa ? { etiquetas_wa: etiquetasWa } : {}),
    });
    if (est.conversa?.id !== c.id) return;
    est.vinculo = r.vinculo;
    est.msgsWa = msgs;
    est.guardadas = r.mensagens || [];
    await aplicarAcoesWa(c.id, r.acoesWa);
  }

  async function aposVincular(r) {
    est.vinculo = r.vinculo;
    est.cliente = r.cliente;
    est.candidatos = null;
    est.trocando = false;
    est.novoAberto = false;
    lembrarVinculo(est.conversa.id, vinculada() ? est.vinculo.id : null);
    if (vinculada()) await sincronizarTudo();
    est.itensLista = null; // a lista muda
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

  // conversa vinculada recebeu mensagem com outra aberta: grava em segundo plano
  const timersOutras = new Map();
  function sincronizarOutra(chatId) {
    clearTimeout(timersOutras.get(chatId));
    timersOutras.set(
      chatId,
      setTimeout(async () => {
        timersOutras.delete(chatId);
        try {
          const mensagens = await wa("mensagens", { chatId, quantas: 80 });
          if (mensagens.length) await api("conversa", { vinculo_id: est.vinculados[chatId], mensagens });
          if (est.aba === "clientes" && est.itensLista) acao("lista", carregarLista);
        } catch (e) {
          if (e.status === 404) lembrarVinculo(chatId, null); // vínculo apagado no CRM
        }
      }, 4000),
    );
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
    est.visitaAgenda = linkGoogleAgenda({
      origem: form.origem.value,
      inicio: new Date(quando),
      imovel: est.imoveis.find((i) => i.id === form.imovel.value)?.title || est.cliente?.imovel || "",
      cliente: est.cliente?.nome || est.conversa?.nome,
      telefone: est.conversa?.telefone,
      obs: form.obs.value,
    });
    form.reset();
    est.aviso = { tipo: "ok", texto: `${r.titulo} registrada para ${r.quando} (tarefa e anotação no CRM). Salve também no Google Agenda.` };
  }

  // ── etiquetas (espelhadas: WhatsApp Business ↔ faixa ↔ CRM) ──────────────
  /**
   * No WhatsApp Business, as etiquetas dele entram no CRM e as do CRM que o
   * WhatsApp ainda não tem são criadas lá. No WhatsApp comum, ficam só as do CRM.
   */
  async function carregarEtiquetas() {
    try {
      const doWa = await wa("etiquetasWa", {});
      est.waBusiness = Boolean(doWa?.business);
      if (!est.waBusiness) {
        est.etiquetas = (await api("etiquetas")).etiquetas;
        return render();
      }
      const cor = (c) => (/^#[0-9a-f]{6}$/i.test(c || "") ? c : undefined);
      const r = await api("etiquetas/sincronizar", {
        etiquetas: doWa.etiquetas.map((e) => ({ wa_label_id: e.id, nome: String(e.nome).slice(0, 40), cor: cor(e.cor) })),
      });
      est.etiquetas = r.etiquetas;
      // as do CRM que o WhatsApp ainda não tem (o WhatsApp Business limita a quantidade)
      for (const e of r.criarNoWa || []) {
        try {
          const nova = await wa("criarEtiquetaWa", { nome: e.nome });
          est.etiquetas = (await api("etiquetas/ligar", { tag_id: e.id, wa_label_id: nova.id })).etiquetas;
        } catch {
          break; // limite do WhatsApp: as que sobrarem ficam só no CRM
        }
      }
      render();
    } catch {
      /* sem etiquetas por enquanto */
    }
  }

  async function alternarEtiqueta(id) {
    const atuais = est.vinculo.etiquetas || [];
    const marcar = !atuais.includes(id);
    const waId = est.waBusiness ? etiqueta(id)?.wa_label_id : null;
    // primeiro no WhatsApp (se falhar, o CRM não muda)
    if (waId) await wa("marcarEtiquetaWa", { chatId: est.conversa.id, labelId: waId, marcar });
    const novas = marcar ? [...atuais, id] : atuais.filter((x) => x !== id);
    est.vinculo.etiquetas = (await api("vinculo/etiquetas", { vinculo_id: est.vinculo.id, etiquetas: novas })).etiquetas;
  }

  async function criarEtiqueta(nome) {
    let r;
    if (est.waBusiness) {
      // cria no WhatsApp (a cor vem da paleta dele) e espelha no CRM
      const w = await wa("criarEtiquetaWa", { nome });
      r = await api("etiquetas/criar", { nome: w.nome, wa_label_id: w.id, ...(/^#[0-9a-f]{6}$/i.test(w.cor || "") ? { cor: w.cor } : {}) });
    } else r = await api("etiquetas/criar", { nome });
    est.etiquetas = r.etiquetas;
    if (vinculada() && !(est.vinculo.etiquetas || []).includes(r.id)) await alternarEtiqueta(r.id);
  }

  // ── prazo do próximo contato ────────────────────────────────────────────
  /** prazo: dias a partir de hoje (às 9h), "aaaa-mm-ddThh:mm" ou null para concluir */
  async function definirPrazo(prazo, nota) {
    let iso = null;
    if (typeof prazo === "number") {
      const d = new Date();
      d.setDate(d.getDate() + prazo);
      d.setHours(9, 0, 0, 0);
      iso = d.toISOString();
    } else if (prazo) iso = new Date(prazo).toISOString();
    const r = await api("vinculo/prazo", { vinculo_id: est.vinculo.id, retornar_em: iso, nota: nota || undefined });
    est.vinculo.prazo = r.prazo;
    est.prazoAberto = false;
    est.itensLista = null;
    avisarBackground(); // atualiza o número no ícone
    est.aviso = { tipo: "ok", texto: r.prazo ? `Próximo contato: ${dataCurta(r.prazo.em)} (também em Tarefas do CRM).` : "Prazo concluído." };
  }

  // ── lista de clientes ───────────────────────────────────────────────────
  async function carregarLista() {
    const f = est.filtros;
    const chave = JSON.stringify(f);
    const r = await api("lista", {
      ...(f.etiqueta_id ? { etiqueta_id: f.etiqueta_id } : {}),
      situacao: f.situacao,
      ...(f.sem_contato_dias ? { sem_contato_dias: Number(f.sem_contato_dias) } : {}),
      ordem: f.ordem,
    });
    if (JSON.stringify(est.filtros) !== chave) return; // o filtro mudou no meio do caminho
    est.itensLista = r.itens;
    for (const i of r.itens) est.vinculados[i.wa_chat_id] = i.id;
    guardar({ vinculados: est.vinculados });
  }

  async function abrirDaLista(chatId) {
    await wa("abrirConversa", { chatId });
    est.aba = "conversa";
  }

  // ── aprender com conversas ──────────────────────────────────────────────
  const TIPO_EXPORT = { a: "audio", i: "imagem", v: "video", d: "documento" };

  function progresso(feito, total, texto) {
    est.aprender.progresso = { feito, total, texto };
    render();
  }

  async function carregarOpcoesConversas() {
    est.aprender.opcoes = await wa("listarConversas", { quantas: 300 });
    await carregarRegistro(est.aprender.opcoes);
  }

  /** Registro das conversas já usadas; manda a última atividade das conversas que a faixa vê. */
  async function carregarRegistro(conversas) {
    const atividade = (conversas || []).filter((c) => c.t > 0).map((c) => ({ chat_id: c.id, t: c.t }));
    const r = await api("aprender/registro", atividade.length ? { atividade } : {});
    est.aprender.registro = new Map(r.registro.map((x) => [x.chave, x]));
  }

  const usada = (chatId) => est.aprender.registro?.get(chatId) || null;
  /** Já usada e sem mensagem depois da analisada. */
  const usadaSemNovidade = (c) => {
    const r = usada(c.id);
    if (!r) return false;
    const ultimaAnalisada = r.ultima_msg_em ? Date.parse(r.ultima_msg_em) : 0;
    return !(c.t && c.t * 1000 > ultimaAnalisada + 60000) && !r.novidades;
  };

  async function marcarComNovidades() {
    const ap = est.aprender;
    ap.escopo = "escolher";
    if (ap.opcoes == null) await carregarOpcoesConversas();
    ap.escolhidas = new Set(ap.opcoes.filter((c) => usada(c.id) && !usadaSemNovidade(c)).map((c) => c.id));
    if (!ap.escolhidas.size) est.aviso = { tipo: "ok", texto: "Nenhuma conversa já usada tem mensagens novas." };
  }

  /** Conversas escolhidas no modo atual: { id, nome, telefone }. */
  async function alvosDoAprender() {
    const ap = est.aprender;
    if (ap.escopo === "esta") return [{ id: est.conversa.id, nome: est.conversa.nome, telefone: est.conversa.telefone }];
    let alvos = await alvosBrutos();
    await carregarRegistro(alvos);
    if (ap.pularUsadas && ap.escopo !== "escolher") {
      const antes = alvos.length;
      alvos = alvos.filter((c) => !usadaSemNovidade(c));
      if (antes && !alvos.length) throw new Error("Todas essas conversas já foram usadas e não têm mensagens novas.");
    }
    return alvos;
  }

  async function alvosBrutos() {
    const ap = est.aprender;
    if (ap.escopo === "esta") return [{ id: est.conversa.id, nome: est.conversa.nome, telefone: est.conversa.telefone }];
    if (ap.escopo === "etiqueta") {
      if (!ap.etiquetaWa) throw new Error("Escolha a etiqueta do WhatsApp.");
      return wa("listarConversas", { quantas: 1000, etiqueta: ap.etiquetaWa });
    }
    if (ap.escopo === "escolher") {
      const alvos = (ap.opcoes || []).filter((c) => ap.escolhidas.has(c.id));
      if (!alvos.length) throw new Error("Marque ao menos uma conversa.");
      return alvos;
    }
    return wa("listarConversas", { quantas: ap.quantas });
  }

  /** Lê as conversas escolhidas do WhatsApp Web, no formato do arquivo exportado. */
  async function coletar() {
    const ap = est.aprender;
    const alvos = await alvosDoAprender();
    if (!alvos.length) throw new Error("Nenhuma conversa encontrada com essa escolha.");
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

  function baixarJson(conversas) {
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
  }

  async function exportarConversas() {
    const ap = est.aprender;
    ap.parar = false;
    try {
      const conversas = await coletar();
      if (!conversas.length) throw new Error("Nenhuma mensagem encontrada para exportar.");
      baixarJson(conversas);
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
  async function comEspera(fn, rotulo, esperaMaxSeg = Infinity) {
    for (let tentativa = 0; ; tentativa++) {
      try {
        return await fn();
      } catch (e) {
        if (e.status !== 429 || tentativa >= 6 || est.aprender.parar) throw e;
        const seg = (e.esperarSeg || 30) + 1;
        if (seg > esperaMaxSeg) throw Object.assign(new Error("espera longa"), { esperaLonga: true });
        const p = est.aprender.progresso;
        progresso(p?.feito || 0, p?.total || 1, `Limite da IA: aguardando ${seg} s para continuar ${rotulo}…`);
        await dormir(seg * 1000);
      }
    }
  }

  async function aprenderComConversas() {
    est.aprender.parar = false;
    let conversas;
    try {
      conversas = await coletar();
    } finally {
      est.aprender.progresso = null;
    }
    if (!conversas.length) throw new Error("Nenhuma mensagem encontrada para analisar.");
    await analisarConversas(conversas, "faixa");
  }

  // Limite grátis do Groq: 8 mil tokens por minuto, e um pedido sozinho não pode
  // passar disso. A conversa vai em partes de ~11 mil caracteres (~6 mil tokens com
  // a resposta) e a consolidação, em lotes do mesmo tamanho.
  const PARTE_CHARS = 11000;
  const LOTE_CHARS = 9000;
  const tamanhoMsg = (m) => (m.texto || "").length + 40;

  /** Divide as mensagens em partes que cabem num pedido à IA. */
  function partesDe(mensagens) {
    const partes = [];
    let atual = [];
    let soma = 0;
    for (const m of mensagens) {
      const t = Math.min(tamanhoMsg(m), PARTE_CHARS);
      if (atual.length && soma + t > PARTE_CHARS) {
        partes.push(atual);
        atual = [];
        soma = 0;
      }
      atual.push(m);
      soma += t;
    }
    if (atual.length) partes.push(atual);
    return partes.length ? partes : [[]];
  }

  /**
   * Junta as propostas sem a IA: tira as repetidas (mesmo texto, ignorando
   * maiúsculas e acentos). Usado quando a IA está no limite ou você para a análise.
   */
  function juntarLocal(regras, exemplos) {
    const chave = (x) => (x.resposta || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 90);
    const unicos = (lista, max) => {
      const vistos = new Set();
      return lista.filter((x) => x?.resposta && !vistos.has(chave(x)) && vistos.add(chave(x))).slice(0, max);
    };
    return { regras: unicos(regras, 40), exemplos: unicos(exemplos, 20), local: true };
  }

  /** Junta as propostas em lotes que cabem num pedido; repete até sobrar um só. */
  async function consolidarEmLotes(regras, exemplos, total) {
    // sem esperar o limite da IA: se ela mandar esperar mais de 90 s, ou se você
    // clicar em Parar, as propostas são juntadas aqui mesmo
    try {
      return await consolidarComIA(regras, exemplos, total);
    } catch (e) {
      if (!e.esperaLonga && !est.aprender.parar) throw e;
      est.aprender.parar = false;
      return juntarLocal(regras, exemplos);
    }
  }

  async function consolidarComIA(regras, exemplos, total) {
    const itens = [...regras.map((x) => ["r", x]), ...exemplos.map((x) => ["e", x])];
    const tam = ([, x]) => (x.situacao || "").length + (x.resposta || "").length + 10;
    let rodada = 1;
    for (;;) {
      const lotes = [];
      let atual = [];
      let soma = 0;
      for (const it of itens.splice(0)) {
        if (atual.length && soma + tam(it) > LOTE_CHARS) {
          lotes.push(atual);
          atual = [];
          soma = 0;
        }
        atual.push(it);
        soma += tam(it);
      }
      if (atual.length) lotes.push(atual);
      const resultados = [];
      for (let i = 0; i < lotes.length; i++) {
        if (est.aprender.parar) throw Object.assign(new Error("parado"), { esperaLonga: true });
        progresso(total, total, lotes.length > 1 ? `Juntando as propostas (lote ${i + 1} de ${lotes.length}${rodada > 1 ? `, rodada ${rodada}` : ""})…` : "Juntando o que se repete e tirando o que a base já tem…");
        const lote = lotes[i];
        resultados.push(
          await comEspera(
            () => api("ia/aprender/consolidar", { regras: lote.filter(([k]) => k === "r").map(([, x]) => x), exemplos: lote.filter(([k]) => k === "e").map(([, x]) => x) }),
            "a consolidação",
            90,
          ),
        );
      }
      if (lotes.length <= 1) return resultados[0] || { regras: [], exemplos: [] };
      resultados.forEach((r) => itens.push(...r.regras.map((x) => ["r", x]), ...r.exemplos.map((x) => ["e", x])));
      rodada++;
    }
  }

  /** A RIA lê cada conversa (em partes, se longa), junta as propostas e monta o histórico. */
  async function analisarConversas(conversas, origem) {
    const ap = est.aprender;
    ap.parar = false;
    ap.propostas = null;
    ap.historico = null;
    ap.clientesHistorico = null;
    ap.historicoImportado = origem === "zip";
    try {
      const regras = [];
      const exemplos = [];
      const historicos = [];
      let puladas = 0;
      let falhas = 0;
      const partesPor = conversas.map((c) => partesDe(c.mensagens));
      const pedidos = partesPor.map((p) => p.length);
      const total = pedidos.reduce((a, b) => a + b, 0);
      let feito = 0;
      for (let i = 0; i < conversas.length && !ap.parar; i++) {
        const c = conversas[i];
        let propostas = 0;
        for (let p = 0; p < pedidos[i] && !ap.parar; p++) {
          const parte = partesPor[i][p];
          const ultima = p === pedidos[i] - 1;
          progresso(feito, total, `A RIA está lendo ${c.nome || c.telefone || "a conversa"}${pedidos[i] > 1 ? ` (parte ${p + 1} de ${pedidos[i]})` : ""}…`);
          let r;
          try {
            r = await comEspera(
              () =>
                api("ia/aprender", {
                  conversa: { ...c, mensagens: parte, total_mensagens: c.mensagens.length },
                  registrar: ultima,
                  propostas_antes: propostas,
                  origem,
                }),
              "a leitura",
            );
          } catch (e) {
            // uma parte que falhou não derruba a análise toda: segue e avisa no fim
            if (e.status === 401 || e.status === 403) throw e;
            if (ap.parar) break;
            falhas++;
            feito++;
            continue;
          }
          feito++;
          if (r.pulada) {
            if (pedidos[i] === 1) puladas++;
            continue;
          }
          propostas += r.regras.length + r.exemplos.length;
          regras.push(...r.regras);
          exemplos.push(...r.exemplos);
          if (r.historico && conversas.length === 1) {
            const de = new Date(parte[0].data).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
            const ate = new Date(parte[parte.length - 1].data).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
            historicos.push(pedidos[i] > 1 ? `[${de === ate ? de : `${de} a ${ate}`}]\n${r.historico}` : r.historico);
          }
        }
      }
      // histórico: conversa aberta e vinculada, ou uma conversa importada
      if (historicos.length && (origem === "zip" || (ap.escopo === "esta" && vinculada()))) ap.historico = historicos.join("\n\n");
      carregarRegistro([]).catch(() => {});
      const final = await consolidarEmLotes(regras, exemplos, total);
      if (final.local) est.aviso = { tipo: "alerta", texto: "A IA estava no limite: as propostas foram juntadas sem ela (só tirei as repetidas). Revise antes de salvar." };
      ap.propostas = final;
      ap.marcadas = { r: new Set(final.regras.map((_, i) => i)), e: new Set(final.exemplos.map((_, i) => i)) };
      ap.relatorio = { conversas: conversas.length, puladas, falhas, incompletas: conversas.filter((c) => c.historico_completo === false).length };
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

  async function salvarHistorico(clientId) {
    const texto = `Histórico da conversa (RIA)\n${est.aprender.historico}`;
    if (clientId) await api("nota/cliente", { client_id: clientId, texto });
    else await api("nota", { vinculo_id: est.vinculo.id, texto });
    est.aprender.clientesHistorico = null;
    est.aprender.historico = null;
    est.aviso = { tipo: "ok", texto: "Histórico salvo nas anotações do cliente." };
  }

  // ── conversa exportada pelo WhatsApp (.zip ou .txt) ─────────────────────
  /**
   * Lê um .zip sem biblioteca: diretório central → entradas; "stored" (0) é
   * copiado e "deflate" (8) passa pelo DecompressionStream do Chrome.
   */
  async function lerZip(arquivo) {
    const buf = new Uint8Array(await arquivo.arrayBuffer());
    const dv = new DataView(buf.buffer);
    let fim = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) {
        fim = i;
        break;
      }
    }
    if (fim < 0) throw new Error("Arquivo .zip inválido.");
    const total = dv.getUint16(fim + 10, true);
    let p = dv.getUint32(fim + 16, true);
    const entradas = new Map();
    const utf8 = new TextDecoder();
    for (let n = 0; n < total; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const metodo = dv.getUint16(p + 10, true);
      const tamComp = dv.getUint32(p + 20, true);
      const tamNome = dv.getUint16(p + 28, true);
      const tamExtra = dv.getUint16(p + 30, true);
      const tamComent = dv.getUint16(p + 32, true);
      const local = dv.getUint32(p + 42, true);
      const nome = utf8.decode(buf.subarray(p + 46, p + 46 + tamNome));
      entradas.set(nome, { metodo, tamComp, local });
      p += 46 + tamNome + tamExtra + tamComent;
    }
    const bytes = async (nome) => {
      const e = entradas.get(nome);
      if (!e) return null;
      const ini = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true);
      const dados = buf.subarray(ini, ini + e.tamComp);
      if (e.metodo === 0) return dados;
      if (e.metodo !== 8) throw new Error(`Compressão não suportada em ${nome}.`);
      const fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(fluxo).arrayBuffer());
    };
    return { nomes: Array.from(entradas.keys()), bytes };
  }

  const LIMPA = /[‎‏‪-‮⁦-⁩]/g;
  // iPhone: [14/08/2024, 16:44:32] Nome: texto   ·   Android: 14/08/2024 16:44 - Nome: texto
  const LINHA_IOS = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?\] ([^:]+?): ([\s\S]*)$/;
  const LINHA_AND = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),? (\d{1,2}):(\d{2})(?::(\d{2}))? - ([^:]+?): ([\s\S]*)$/;
  const ANEXO = /<(?:anexado|attached):\s*([^>]+)>|^(\S.*\.(?:opus|ogg|m4a|mp3|jpe?g|png|webp|mp4|pdf|docx?|xlsx?|vcf))\s*\((?:arquivo anexado|file attached)\)/i;
  const AVISOS = /criptografia de ponta a ponta|end-to-end encrypted|está na sua lista de contatos|is a contact|mensagem foi apagada|message was deleted|mensagem apagada|ligação de voz perdida|missed voice call/i;

  function tipoDoAnexo(nome) {
    const ext = nome.split(".").pop().toLowerCase();
    if (["opus", "ogg", "m4a", "mp3", "aac"].includes(ext)) return "audio";
    if (["jpg", "jpeg", "png", "webp", "gif", "heic"].includes(ext)) return "imagem";
    if (["mp4", "mov", "3gp"].includes(ext)) return "video";
    return "documento";
  }

  /** _chat.txt → [{ data, autor, texto, anexo? }] (linhas sem cabeçalho continuam a mensagem anterior). */
  function lerChatTxt(txt) {
    const msgs = [];
    for (const bruta of txt.replace(/^﻿/, "").split(/\r?\n/)) {
      const linha = bruta.replace(LIMPA, "");
      const m = LINHA_IOS.exec(linha) || LINHA_AND.exec(linha);
      if (!m) {
        if (msgs.length && linha.trim()) msgs[msgs.length - 1].texto += `\n${linha}`;
        continue;
      }
      const [, d, mes, a, h, mi, se, autor, texto] = m;
      const ano = a.length === 2 ? 2000 + Number(a) : Number(a);
      const data = new Date(ano, Number(mes) - 1, Number(d), Number(h), Number(mi), Number(se || 0));
      msgs.push({ data, autor: autor.trim(), texto, aviso: bruta.slice(bruta.indexOf(": ") + 2).startsWith("‎") });
    }
    return msgs
      .map((m) => {
        const anexo = ANEXO.exec(m.texto);
        const nomeAnexo = anexo ? (anexo[1] || anexo[2]).trim() : null;
        const texto = m.texto
          .replace(ANEXO, "")
          .replace(/<Mensagem editada>|<This message was edited>/gi, "")
          .trim();
        return { ...m, anexo: nomeAnexo, texto };
      })
      .filter((m) => m.anexo || (m.texto && !(m.aviso && AVISOS.test(m.texto)) && !AVISOS.test(m.texto)));
  }

  async function importarArquivoWhatsapp(arquivo) {
    const ehZip = /\.zip$/i.test(arquivo.name) || arquivo.type.includes("zip");
    let txt;
    let zip = null;
    if (ehZip) {
      zip = await lerZip(arquivo);
      const nomeTxt = zip.nomes.find((n) => /(^|\/)_chat\.txt$/i.test(n)) || zip.nomes.find((n) => /\.txt$/i.test(n));
      if (!nomeTxt) throw new Error("Não achei o texto da conversa (_chat.txt) dentro do .zip.");
      txt = new TextDecoder().decode(await zip.bytes(nomeTxt));
    } else txt = await arquivo.text();

    const msgs = lerChatTxt(txt);
    if (msgs.length < 2) throw new Error("Não reconheci mensagens nesse arquivo. Use a exportação do próprio WhatsApp.");
    // nome do contato pelo nome do arquivo ("WhatsApp Chat - Fulano.zip", "Conversa do WhatsApp com Fulano.txt")
    const contato = arquivo.name
      .replace(/\.(zip|txt)$/i, "")
      .replace(/^(WhatsApp Chat( with)? - |Conversa do WhatsApp com |WhatsApp Chat with )/i, "")
      .trim();
    const contagem = new Map();
    msgs.forEach((m) => contagem.set(m.autor, (contagem.get(m.autor) || 0) + 1));
    const autores = Array.from(contagem.entries()).sort((a, b) => b[1] - a[1]).map(([nome, n]) => ({ nome, n }));
    // você = quem escreve e não é o contato do arquivo (o mais frequente)
    const voce = (autores.find((a) => a.nome.toLowerCase() !== contato.toLowerCase()) || autores[0]).nome;
    const audios = msgs.filter((m) => m.anexo && tipoDoAnexo(m.anexo) === "audio" && zip?.nomes.includes(m.anexo)).length;
    est.aprender.importado = { arquivo: arquivo.name, contato, autores, voce, msgs, zip, audios };
    est.aprender.registro || carregarRegistro([]).catch(() => {});
  }

  /** Conversa importada no formato do arquivo exportado (sem as transcrições). */
  function conversaDoImportado() {
    const imp = est.aprender.importado;
    return {
      nome: imp.contato,
      telefone: "",
      historico_completo: true,
      total_mensagens: imp.msgs.length,
      mensagens: imp.msgs.map((m, i) => ({
        id: String(i),
        data: m.data.toISOString(),
        de: m.autor === imp.voce ? "corretor" : "cliente",
        tipo: m.anexo ? tipoDoAnexo(m.anexo) : "texto",
        // documento: o nome do arquivo diz muito (ex.: "tabela de preços.pdf")
        texto: m.texto || (m.anexo && tipoDoAnexo(m.anexo) === "documento" ? m.anexo.replace(/^\d+-/, "") : ""),
      })),
    };
  }

  async function analisarImportado() {
    const ap = est.aprender;
    const imp = ap.importado;
    const conversa = conversaDoImportado();
    ap.parar = false;
    if (ap.transcreverAudios && imp.zip && imp.audios) {
      const comAudio = imp.msgs.map((m, i) => [m, i]).filter(([m]) => m.anexo && tipoDoAnexo(m.anexo) === "audio" && imp.zip.nomes.includes(m.anexo));
      try {
        for (let k = 0; k < comAudio.length && !ap.parar; k++) {
          const [m, i] = comAudio[k];
          progresso(k, comAudio.length, `Transcrevendo os áudios (${k + 1} de ${comAudio.length})…`);
          const dados = await imp.zip.bytes(m.anexo);
          if (!dados || dados.length > 4_000_000) continue;
          const fd = new FormData();
          fd.append("audio", new Blob([dados], { type: "audio/ogg" }), "audio.ogg");
          const r = await comEspera(() => api("ia/transcrever-arquivo", fd), "as transcrições").catch(() => null);
          if (r?.texto) conversa.mensagens[i].texto = r.texto;
        }
      } finally {
        ap.progresso = null;
      }
    }
    if (ap.parar) return;
    ap.importado = null;
    await analisarConversas([conversa], "zip");
  }

  // ── CRM na faixa: funis, clientes, cartão e disparo ─────────────────────
  async function carregarFunis() {
    const r = await api("crm/funis", {});
    est.crm.funis = r.funis;
    est.crm.imoveis = r.imoveis;
    // começa pelo funil com mais clientes em andamento
    if (!est.crm.filtros.funil_id && r.funis.length) {
      est.crm.filtros.funil_id = [...r.funis].sort((a, b) => b.total - a.total)[0].id;
    }
  }

  const filtrosCrm = () => {
    const f = est.crm.filtros;
    return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v != null));
  };

  async function carregarClientesCrm(mais) {
    if (!est.crm.funis) await carregarFunis();
    const limite = mais ? (est.crm.clientes?.length || 0) + 60 : 60;
    const chave = JSON.stringify(est.crm.filtros);
    const r = await api("crm/clientes", { ...filtrosCrm(), limite });
    if (JSON.stringify(est.crm.filtros) !== chave) return; // o filtro mudou no meio do caminho
    est.crm.clientes = r.clientes;
    est.crm.total = r.total;
  }

  async function abrirCartaoCrm(id) {
    est.crm.cliente = (await api("crm/cliente", { id })).cliente;
  }

  async function mudarEtapaCrm(etapaId) {
    const c = est.crm.cliente;
    const r = await api("crm/etapa", { client_id: c.id, etapa_id: etapaId });
    c.etapa_id = etapaId;
    c.etapa = r.etapa;
    est.crm.clientes = null;
    est.crm.funis = null; // contagens mudaram
    est.aviso = { tipo: "ok", texto: `Movido para "${r.etapa}".` };
  }

  /** Abre a conversa do cliente no WhatsApp Web e já vincula ao cliente do CRM. */
  async function whatsappDoCliente() {
    const c = est.crm.cliente;
    est.vincularAoAbrir = { clientId: c.id, telefone: c.telefone || "" };
    if (c.wa_chat_id) await wa("abrirConversa", { chatId: c.wa_chat_id });
    else await wa("abrirPorTelefone", { telefone: c.telefone });
    est.aba = "conversa";
  }

  // Público para a Transmissão comercial do WhatsApp Business: CSV no modelo que o
  // próprio app exporta, até 256 destinatários por arquivo.
  function baixarPublicoCsv(publico, nomeBase) {
    const celula = (s) => {
      const t = String(s ?? "").replace(/[\r\n]+/g, " ").trim();
      return /[",;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const partes = [];
    for (let i = 0; i < publico.length; i += 256) partes.push(publico.slice(i, i + 256));
    partes.forEach((parte, n) => {
      const linhas = [
        "Insira o nome completo e o telefone de cada destinatário em uma linha separada. Você pode adicionar até 256 destinatários a um público.",
        "",
        "Nome completo,Telefone",
        ...parte.map((p) => `${celula(p.nome)},${p.telefone}`),
      ];
      const blob = new Blob(["﻿" + linhas.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = partes.length > 1 ? `${nomeBase}-parte-${n + 1}.csv` : `${nomeBase}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 1000);
    });
    return partes.length;
  }

  async function gerarPublico(form) {
    const marcar = form.marcar.checked ? form.etiqueta.value.trim() : "";
    const r = await api("crm/publico", { ...filtrosCrm(), marcar_etiqueta: marcar || undefined });
    if (!r.publico.length) throw new Error("Nenhum cliente desse filtro tem telefone válido.");
    if (r.etiquetas) est.etiquetas = r.etiquetas;
    const f = est.crm.filtros;
    const produto = est.crm.imoveis.find((i) => i.id === f.produto_id)?.title;
    const base = `publico-${(produto || marcar || "clientes").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}`;
    const arquivos = baixarPublicoCsv(r.publico, base);
    est.crm.disparoFeito = true;
    est.aviso = {
      tipo: "ok",
      texto:
        `Público baixado: ${r.publico.length} destinatário${r.publico.length === 1 ? "" : "s"}` +
        (arquivos > 1 ? ` em ${arquivos} arquivos (até 256 cada)` : "") +
        (r.semTelefone ? `; ${r.semTelefone} sem telefone válido ficaram de fora` : "") +
        (r.etiqueta ? `; marcados com a etiqueta "${marcar}"` : "") +
        ". Siga o passo 3 do guia.",
    };
  }

  // ── visita no Google Agenda ──
  /** Link do Google Agenda já preenchido (um clique em Salvar). Visitas do QuintoAndar com [QA] no título. */
  function linkGoogleAgenda({ origem, inicio, imovel, cliente, telefone, obs }) {
    const fim = new Date(inicio.getTime() + 60 * 60000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const prefixo = origem === "quintoandar" ? "[QA] " : origem === "lancamento" ? "[Lançamento] " : "";
    const titulo = `${prefixo}Visita${imovel ? ` ${imovel}` : ""} — ${cliente || "cliente"}`;
    const detalhes = [
      `Cliente: ${cliente || "-"}`,
      telefone ? `WhatsApp: +${String(telefone).replace(/\D/g, "")}` : "",
      imovel ? `Imóvel: ${imovel}` : "",
      origem === "quintoandar" ? "Agendada pela vitrine do QuintoAndar." : "",
      obs ? `Obs.: ${obs}` : "",
      "Registrada pela extensão do Nordic CRM.",
    ]
      .filter(Boolean)
      .join("\n");
    const p = new URLSearchParams({ action: "TEMPLATE", text: titulo, dates: `${fmt(inicio)}/${fmt(fim)}`, details: detalhes, ctz: "America/Sao_Paulo" });
    return { url: `https://calendar.google.com/calendar/render?${p.toString()}`, titulo };
  }

  // ── telas ────────────────────────────────────────────────────────────────
  function render() {
    $topo.innerHTML =
      `<button type="button" data-acao="recolher" title="Recolher a faixa" aria-label="Recolher a faixa">${ic("recolher")}</button>` +
      (est.usuario ? `<button type="button" data-acao="sair" title="Sair da conta" aria-label="Sair da conta">${ic("sair")}</button>` : "");
    // o painel é redesenhado inteiro: guarda o que estava digitado, o foco, a rolagem e as seções abertas
    const valores = {};
    let foco = null;
    $app.querySelectorAll("form[id] [name]").forEach((el) => {
      if (el.type === "radio" || el.type === "checkbox") return;
      const k = `${el.form.id}.${el.name}`;
      valores[k] = el.value;
      if (el === document.activeElement) foco = { k, ini: el.selectionStart, fim: el.selectionEnd };
    });
    const abertas = new Set([...$app.querySelectorAll("details[id][open]")].map((d) => d.id));
    const fechadas = new Set([...$app.querySelectorAll("details[id]:not([open])")].map((d) => d.id));
    const rolagem = $app.scrollTop;
    $app.innerHTML = !est.sessao || !est.usuario ? telaLogin() : telaPrincipal();
    $app.querySelectorAll("details[id]").forEach((d) => {
      if (abertas.has(d.id)) d.open = true;
      if (fechadas.has(d.id)) d.open = false;
    });
    $app.querySelectorAll("form[id] [name]").forEach((el) => {
      if (el.type === "radio" || el.type === "checkbox" || el.tagName === "SELECT") return;
      const k = `${el.form.id}.${el.name}`;
      if (k in valores && valores[k]) el.value = valores[k];
      if (foco?.k === k) {
        el.focus();
        try {
          el.setSelectionRange(foco.ini, foco.fim);
        } catch {}
      }
    });
    $app.scrollTop = rolagem;
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
    etiqueta: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    atualizar: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  };
  const ic = (n, p) => `<svg class="ic${p ? " p" : ""}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[n] || ""}</svg>`;
  const girando = (nome, texto) => (est.ocupado[nome] ? `<span class="carregando" aria-hidden="true"></span> ${texto}` : null);
  const aviso = () => (est.aviso ? `<p class="aviso ${esc(est.aviso.tipo)}" role="status">${esc(est.aviso.texto)}</p>` : "");
  const chip = (e) => (e ? `<span class="chip" style="--cor:${esc(e.cor)}">${esc(e.nome)}</span>` : "");

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
    if (est.erroWa) return `${versao}<p class="aviso erro">${esc(est.erroWa)}</p>`;
    if (!est.waPronto) return `${versao}<p class="aviso"><span class="carregando" aria-hidden="true"></span> Carregando o WhatsApp Web…</p>`;
    const aba = (id, rotulo) =>
      `<button type="button" role="tab" aria-selected="${est.aba === id}" class="${est.aba === id ? "ativa" : ""}" data-acao="aba" data-aba="${id}">${rotulo}</button>`;
    const abas = `<div class="abas" role="tablist">${aba("clientes", "Clientes")}${aba("crm", "Funil")}${aba("conversa", "Conversa")}${aba("aprender", "Aprender")}</div>`;
    const corpo =
      est.aba === "clientes" ? telaLista() : est.aba === "crm" ? telaCrm() : est.aba === "aprender" ? secaoAprender() : telaConversa();
    return `${versao}${abas}${aviso()}${corpo}${rodapeStats()}`;
  }

  function telaConversa() {
    if (!est.conversa) return `<section class="cartao"><p class="mudo">Abra uma conversa para ver o cliente e usar a RIA.</p></section>`;
    if (est.conversa.grupo) return `<section class="cartao"><p class="mudo">Grupos e canais não são acompanhados.</p></section>`;
    if (est.carregando && !est.vinculo && !est.candidatos)
      return `<p class="aviso"><span class="carregando" aria-hidden="true"></span> Procurando o cliente…</p>`;
    if (!est.vinculo || est.trocando) return telaVincular();
    if (est.vinculo.nao_cliente) return telaNaoCliente();
    return telaCliente();
  }

  function rodapeStats() {
    const s = est.stats || {};
    const total = (s.used || 0) + (s.edited || 0) + (s.ignored || 0);
    if (!total) return `<p class="rodape">${esc(est.usuario?.nome || "")} · v${esc(VERSAO)}</p>`;
    const pct = Math.round(((s.used || 0) / total) * 100);
    return `<p class="rodape" title="Últimos 30 dias">RIA: ${pct}% enviadas sem editar · ${s.edited || 0} editadas · ${s.ignored || 0} ignoradas</p>`;
  }

  // ── aba Clientes ──
  function telaLista() {
    const f = est.filtros;
    const sel = (nome, valor, opcoes) =>
      `<select name="${nome}">${opcoes.map(([v, t]) => `<option value="${esc(v)}" ${String(valor) === String(v) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
    const filtros = `
      <form class="filtros" data-form="filtros">
        <label>Situação${sel("situacao", f.situacao, [["todas", "Todas"], ["esperando", "Esperando você"], ["aguardando", "Aguardando o cliente"], ["vencido", "Prazo vencido"], ["com_prazo", "Com prazo"]])}</label>
        <label>Sem contato há${sel("sem_contato_dias", f.sem_contato_dias, [["", "Qualquer"], ["3", "3+ dias"], ["7", "7+ dias"], ["15", "15+ dias"], ["30", "30+ dias"]])}</label>
        <label>Etiqueta${sel("etiqueta_id", f.etiqueta_id, [["", "Todas"], ...est.etiquetas.map((e) => [e.id, e.nome])])}</label>
        <label>Ordem${sel("ordem", f.ordem, [["sem_contato", "Mais tempo sem contato"], ["prazo", "Prazo mais próximo"], ["recente", "Contato mais recente"]])}</label>
      </form>`;
    const itens = est.itensLista;
    let lista;
    if (!itens) lista = `<p class="mudo"><span class="carregando" aria-hidden="true"></span> Carregando…</p>`;
    else if (!itens.length)
      lista = `<p class="mudo">Nenhum cliente com esses filtros. A lista mostra as conversas já vinculadas a clientes do CRM.</p>`;
    else
      lista = `<div class="lista">${itens
        .map((i) => {
          const venc = vencido(i.prazo_em);
          const esperando = i.ultima_lado === "<";
          const classe = venc ? "vencido" : esperando ? "esperando" : "";
          const situacao = venc
            ? `<span class="selo erro">${ic("relogio", true)} Prazo vencido</span>`
            : esperando && i.ultima_cliente_em
              ? `<span class="selo alerta">Esperando você há ${esc(ha(i.ultima_cliente_em))}</span>`
              : i.ultimo_contato_em
                ? `<span>Último contato há ${esc(ha(i.ultimo_contato_em))}</span>`
                : "";
          return `<button type="button" class="botao item-lista ${classe}" data-acao="abrir-lista" data-chat="${esc(i.wa_chat_id)}">
              <b>${esc(i.nome)}</b>
              <span class="mudo">${situacao}${i.etapa ? ` · ${esc(i.etapa)}` : ""}</span>
              ${i.prazo_em && !venc ? `<span class="mudo">${ic("relogio", true)} ${esc(dataCurta(i.prazo_em))}${i.prazo_nota ? ` · ${esc(i.prazo_nota)}` : ""}</span>` : ""}
              ${i.etiquetas.length ? `<span class="chips">${i.etiquetas.map((id) => chip(etiqueta(id))).join("")}</span>` : ""}
            </button>`;
        })
        .join("")}</div>`;
    return `<section class="cartao">
        <div class="linha"><h2 style="margin:0">Clientes ${itens ? `(${itens.length})` : ""}</h2>
          <button type="button" class="pequeno" data-acao="atualizar-lista" aria-label="Atualizar a lista" ${est.ocupado.lista ? "disabled" : ""}>${est.ocupado.lista ? `<span class="carregando" aria-hidden="true"></span>` : ic("atualizar", true)}</button></div>
        ${filtros}
        ${lista}
      </section>`;
  }

  // ── aba Conversa ──
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
        <hr class="separador" />
        ${blocoEtiquetas()}
        <hr class="separador" />
        ${blocoPrazo()}
      </section>
      ${secaoRia()}
      ${secaoAudios()}
      ${secaoNota()}
      ${secaoVisita()}`;
  }

  function blocoEtiquetas() {
    const marcadas = est.vinculo.etiquetas || [];
    const origem = est.waBusiness ? "do WhatsApp Business e do CRM" : "do CRM";
    if (!est.editandoEtiquetas) {
      return `<div class="linha"><h2 style="margin:0">${ic("etiqueta", true)} Etiquetas</h2>
          <button type="button" class="pequeno" data-acao="editar-etiquetas">Editar</button></div>
        <div class="chips" style="margin-top:6px">${marcadas.length ? marcadas.map((id) => chip(etiqueta(id))).join("") : `<span class="mudo">Nenhuma etiqueta.</span>`}</div>`;
    }
    return `<div class="linha"><h2 style="margin:0">${ic("etiqueta", true)} Etiquetas</h2>
        <button type="button" class="pequeno" data-acao="editar-etiquetas">Pronto</button></div>
      <p class="mudo">Toque para marcar ou desmarcar. São as etiquetas ${origem}, sempre iguais nos dois.</p>
      <div class="chips">${est.etiquetas
        .map(
          (e) =>
            `<button type="button" class="chip-botao ${marcadas.includes(e.id) ? "marcada" : ""}" style="--cor:${esc(e.cor)}" aria-pressed="${marcadas.includes(e.id)}" data-acao="etiqueta" data-id="${esc(e.id)}" ${est.ocupado.etiqueta ? "disabled" : ""}>${esc(e.nome)}</button>`,
        )
        .join("")}</div>
      <form id="f-etiqueta" data-form="etiqueta" class="campo-linha">
        <input name="nome" maxlength="40" placeholder="Nova etiqueta" aria-label="Nome da nova etiqueta" required />
        <button class="pequeno" ${est.ocupado.criarEtiqueta ? "disabled" : ""}>Criar</button>
      </form>`;
  }

  function blocoPrazo() {
    const p = est.vinculo.prazo;
    const atual = p
      ? `<p class="${vencido(p.em) ? "aviso erro" : "aviso"}" style="margin:6px 0 0">${ic("relogio", true)} ${vencido(p.em) ? "Venceu" : "Próximo contato"}: ${esc(dataCurta(p.em))}${p.nota ? ` · ${esc(p.nota)}` : ""}</p>`
      : `<p class="mudo" style="margin:6px 0 0">Sem prazo marcado.</p>`;
    const rapido = (dias, rotulo) => `<button type="button" class="pequeno" data-acao="prazo" data-dias="${dias}" ${est.ocupado.prazo ? "disabled" : ""}>${rotulo}</button>`;
    return `<div class="linha"><h2 style="margin:0">${ic("relogio", true)} Próximo contato</h2>
        ${p ? `<button type="button" class="pequeno" data-acao="concluir-prazo" ${est.ocupado.prazo ? "disabled" : ""}>Concluir</button>` : ""}</div>
      ${atual}
      <div class="acoes">${rapido(1, "Amanhã")}${rapido(3, "3 dias")}${rapido(7, "1 semana")}
        <button type="button" class="pequeno" data-acao="prazo-data">${est.prazoAberto ? "Fechar" : "Outra data"}</button></div>
      ${
        est.prazoAberto
          ? `<form id="f-prazo" data-form="prazo" style="margin-top:8px">
          <div class="grade2"><label>Data<input name="data" type="date" min="${hojeISO()}" required /></label><label>Hora<input name="hora" type="time" step="900" value="09:00" required /></label></div>
          <label>Lembrete (opcional)<input name="nota" maxlength="300" placeholder="Ex.: mandar a tabela nova" /></label>
          <button class="primario largo" ${est.ocupado.prazo ? "disabled" : ""}>${girando("prazo", "Salvando…") || "Marcar prazo"}</button>
        </form>`
          : ""
      }`;
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
    const agenda = est.visitaAgenda
      ? `<p class="aviso ok" style="margin-bottom:8px">${esc(est.visitaAgenda.titulo)}</p>
        <a class="botao dourado largo" href="${esc(est.visitaAgenda.url)}" target="_blank" rel="noopener" data-acao="agenda-aberta">${ic("agenda", true)} Salvar no Google Agenda</a>
        <hr class="separador" />`
      : "";
    return `<details class="cartao" id="d-visita"${est.visitaAgenda ? " open" : ""}><summary><span>${ic("agenda", true)} Registrar visita</span></summary>
      ${agenda}
      <form id="f-visita" data-form="visita">
        <label>Onde<select name="origem"><option value="quintoandar">QuintoAndar (agendada pela vitrine)</option><option value="lancamento">Lançamento (estande/decorado)</option><option value="outro">Outro</option></select></label>
        <div class="grade2"><label>Data<input name="data" type="date" min="${hojeISO()}" required /></label><label>Hora<input name="hora" type="time" step="900" required /></label></div>
        <label>Imóvel<select name="imovel">${opcoes}</select></label>
        <label>Observação<input name="obs" placeholder="Ex.: vai com a esposa" /></label>
        <button class="primario largo" ${est.ocupado.visita ? "disabled" : ""}>${girando("visita", "Registrando…") || "Registrar visita"}</button>
      </form></details>`;
  }

  // ── aba Funil (clientes do CRM) ──
  const reais = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const dataBR = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  function telaCrm() {
    const crm = est.crm;
    if (crm.cliente) return cartaoCrm();
    if (!crm.funis) return `<p class="aviso"><span class="carregando" aria-hidden="true"></span> Carregando os funis…</p>`;
    const f = crm.filtros;
    const funil = crm.funis.find((x) => x.id === f.funil_id);
    const sel = (nome, valor, opcoes, rotulo) =>
      `<label>${rotulo}<select name="${nome}">${opcoes.map(([v, t]) => `<option value="${esc(v)}" ${String(valor) === String(v) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
    const filtros = `
      <form id="f-crm" data-form="crm-filtros" class="filtros">
        ${sel("funil_id", f.funil_id, crm.funis.map((x) => [x.id, `${x.nome} (${x.total})`]), "Funil")}
        ${sel("etapa_id", f.etapa_id, [["", "Todas as etapas"], ...(funil?.etapas || []).map((e) => [e.id, `${e.nome} (${e.total})`])], "Etapa")}
        ${sel("produto_id", f.produto_id, [["", "Todos"], ["none", "Sem produto"], ...crm.imoveis.map((i) => [i.id, i.title])], "Produto")}
        ${sel("etiqueta_id", f.etiqueta_id, [["", "Todas"], ...est.etiquetas.map((e) => [e.id, e.nome])], "Etiqueta")}
        ${sel("status", f.status, [["ACTIVE", "Em andamento"], ["WON", "Ganhos"], ["LOST", "Perdidos"], ["todos", "Todos"]], "Situação")}
        ${sel("sem_atualizar_dias", f.sem_atualizar_dias, [["", "Qualquer"], ["7", "7+ dias"], ["15", "15+ dias"], ["30", "30+ dias"], ["60", "60+ dias"], ["90", "90+ dias"]], "Sem atualizar há")}
        <label style="grid-column:1/-1">Buscar<input name="busca" placeholder="Nome, e-mail ou telefone" value="${esc(f.busca)}" /></label>
      </form>`;
    const itens = crm.clientes;
    const lista = !itens
      ? `<p class="mudo"><span class="carregando" aria-hidden="true"></span> Carregando…</p>`
      : !itens.length
        ? `<p class="mudo">Nenhum cliente com esses filtros.</p>`
        : `<div class="lista">${itens
            .map(
              (c) => `<button type="button" class="botao item-lista" data-acao="crm-abrir" data-id="${esc(c.id)}">
                <b>${esc(c.nome)}</b>
                <span class="mudo"><span class="chip" style="--cor:${esc(c.cor || "#888")}">${esc(c.etapa)}</span>${c.imovel ? ` · ${esc(c.imovel)}` : ""}</span>
                <span class="mudo">Atualizado há ${esc(ha(c.atualizado_em))}${c.wa_chat_id ? " · conversa vinculada" : ""}</span>
              </button>`,
            )
            .join("")}</div>
          ${itens.length < crm.total ? `<button type="button" class="pequeno largo" style="margin-top:8px" data-acao="crm-mais" ${est.ocupado.crm ? "disabled" : ""}>${girando("crm", "Carregando…") || `Mostrar mais (${itens.length} de ${crm.total})`}</button>` : ""}`;
    return `<section class="cartao">
        <div class="linha"><h2 style="margin:0">Clientes do CRM ${itens ? `(${crm.total})` : ""}</h2>
          <button type="button" class="pequeno" data-acao="crm-atualizar" aria-label="Atualizar" ${est.ocupado.crm ? "disabled" : ""}>${est.ocupado.crm ? `<span class="carregando" aria-hidden="true"></span>` : ic("atualizar", true)}</button></div>
        ${filtros}
        ${lista}
      </section>
      ${secaoDisparo()}`;
  }

  function cartaoCrm() {
    const c = est.crm.cliente;
    const etapas = c.etapas.map((e) => `<option value="${esc(e.id)}" ${e.id === c.etapa_id ? "selected" : ""}>${esc(e.nome)}</option>`).join("");
    const status = { WON: `<span class="selo ok">Ganho</span>`, LOST: `<span class="selo erro">Perdido</span>` }[c.status] || "";
    return `<section class="cartao">
        <button type="button" class="pequeno" data-acao="crm-voltar">← Voltar à lista</button>
        <div class="cliente" style="margin-top:10px"><span class="avatar" aria-hidden="true">${esc(iniciais(c.nome))}</span>
          <div class="info"><h3>${esc(c.nome)}</h3><span class="mudo">${esc(c.telefone || "sem telefone")}</span> ${status}</div></div>
        <dl class="dados">
          <dt>Funil</dt><dd>${esc(c.funil)}</dd>
          ${c.imovel ? `<dt>Produto</dt><dd>${esc(c.imovel)}</dd>` : ""}
          ${c.origem ? `<dt>Origem</dt><dd>${esc(c.origem)}</dd>` : ""}
          <dt>Corretor</dt><dd>${esc(c.corretor)}</dd>
          ${c.vendas ? `<dt>Vendido</dt><dd>${esc(reais(c.vendido))} (${c.vendas})</dd>` : ""}
          <dt>Atualizado</dt><dd>há ${esc(ha(c.atualizado_em))}</dd>
        </dl>
        ${c.etiquetas.length ? `<div class="chips" style="margin-top:8px">${c.etiquetas.map((id) => chip(etiqueta(id))).join("")}</div>` : ""}
        <form id="f-crm-etapa" data-form="crm-etapa" style="margin-top:10px"><label>Etapa<select name="etapa">${etapas}</select></label></form>
        <div class="acoes">
          <button type="button" class="dourado" data-acao="crm-whatsapp" ${!c.telefone || est.ocupado.crmWa ? "disabled" : ""}>${girando("crmWa", "Abrindo…") || "Abrir conversa"}</button>
          <a class="botao pequeno" href="${esc(est.sessao.servidor)}/client/${esc(c.id)}" target="_blank" rel="noopener">${ic("abrir", true)} Abrir no CRM</a>
        </div>
      </section>
      ${c.tarefas.length ? `<section class="cartao"><h2>Tarefas abertas</h2><ul class="lista">${c.tarefas.map((t) => `<li class="item"><div class="info"><div class="nome">${esc(t.titulo)}</div><div class="mudo">${esc(dataCurta(t.em))}${vencido(t.em) ? " · atrasada" : ""}</div></div></li>`).join("")}</ul></section>` : ""}
      ${c.anotacoes.length ? `<section class="cartao"><h2>Últimas anotações</h2>${c.anotacoes.map((n) => `<p class="historico"><span class="mudo">${esc(dataBR(n.em))}</span><br />${esc(n.texto)}</p>`).join("")}</section>` : ""}`;
  }

  /** Guia de disparo: Transmissão comercial do WhatsApp Business com o público do filtro. */
  function secaoDisparo() {
    const total = est.crm.total;
    return `<details class="cartao" id="d-disparo"><summary><span>${ic("download", true)} Disparo</span></summary>
      <p class="mudo">Usa os clientes do filtro acima${total != null ? ` (${total})` : ""}. Quem envia é o WhatsApp Business, pela Transmissão comercial (paga por créditos); a extensão não envia nada.</p>
      <ol class="passos">
        <li><b>Filtre os clientes</b> acima: produto, etapa, etiqueta, tempo sem atualizar.</li>
        <li><b>Baixe o público</b> (CSV no modelo do WhatsApp, até 256 por arquivo):
          <form id="f-disparo" data-form="disparo" style="margin-top:6px">
            <label class="check"><input type="checkbox" name="marcar" checked /> <span>Marcar esses clientes com a etiqueta</span></label>
            <input name="etiqueta" maxlength="40" value="Disparo ${esc(new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }))}" aria-label="Nome da etiqueta do disparo" />
            <button class="primario largo" style="margin-top:6px" ${est.ocupado.disparo ? "disabled" : ""}>${girando("disparo", "Gerando…") || "Baixar público (CSV)"}</button>
          </form></li>
        <li><b>Importe no WhatsApp Web</b>: Ferramentas comerciais › Transmissão comercial › Públicos › Novo público › Importar.</li>
        <li><b>Créditos</b>: confira o saldo; a compra é pelo app do celular.</li>
        <li><b>Crie a transmissão</b>: escolha o público, escreva a mensagem (com o link do imóvel), veja o custo e envie.</li>
        <li><b>Acompanhe</b>: quem responder aparece na aba Clientes depois de vinculado; marque prazo de retorno para quem não responder.</li>
      </ol>
    </details>`;
  }

  // ── aba Aprender ──
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
        ${rel ? `<p class="mudo">${plural(rel.conversas, "conversa lida", "conversas lidas")}${rel.puladas ? ` · ${plural(rel.puladas, "curta demais", "curtas demais")}` : ""}${rel.incompletas ? ` · ${rel.incompletas} sem o histórico inteiro` : ""}${rel.falhas ? ` · ${plural(rel.falhas, "parte não foi lida (erro da IA)", "partes não foram lidas (erro da IA)")}` : ""}</p>` : ""}
        ${ap.historico ? `<h2>Histórico desta conversa</h2><p class="historico">${esc(ap.historico)}</p>${blocoSalvarHistorico()}<hr class="separador" />` : ""}
        ${pr.regras.length ? `<h2>Regras propostas (${pr.regras.length})</h2><div class="lista">${pr.regras.map((x, i) => item("r", x, i)).join("")}</div>` : ""}
        ${pr.exemplos.length ? `<h2 style="margin-top:10px">Exemplos de resposta (${pr.exemplos.length})</h2><div class="lista">${pr.exemplos.map((x, i) => item("e", x, i)).join("")}</div>` : ""}
        <div class="acoes">
          ${pr.regras.length || pr.exemplos.length ? `<button type="button" class="primario" data-acao="salvar-aprendizado" ${!n || est.ocupado.salvarAp ? "disabled" : ""}>${girando("salvarAp", "Salvando…") || `Salvar ${n} na base`}</button>` : ""}
          <button type="button" class="pequeno" data-acao="descartar-aprendizado">Descartar</button>
        </div>`;
    } else if (ap.importado) {
      corpo = telaImportado();
    } else {
      const etiquetasWa = est.etiquetas.filter((e) => e.wa_label_id);
      const escolher =
        ap.escopo === "escolher"
          ? ap.opcoes == null
            ? `<p class="mudo"><span class="carregando" aria-hidden="true"></span> Carregando as conversas…</p>`
            : (() => {
                const termo = ap.busca.trim().toLowerCase();
                const visiveis = ap.opcoes.filter(
                  (c) => !termo || `${c.nome} ${c.telefone}`.toLowerCase().includes(termo),
                );
                return `<div class="campo-linha"><input name="busca" placeholder="Buscar por nome ou telefone" aria-label="Buscar conversa" value="${esc(ap.busca)}" /></div>
                  <div class="linha" style="margin:6px 0"><span class="mudo">${ap.escolhidas.size} marcada${ap.escolhidas.size === 1 ? "" : "s"}</span>
                    <span><button type="button" class="pequeno" data-acao="marcar-visiveis">Marcar visíveis</button>
                    <button type="button" class="pequeno" data-acao="limpar-escolhidas">Limpar</button></span></div>
                  <div class="lista escolha">${visiveis
                    .slice(0, 200)
                    .map(
                      (c) => `<label class="check"><input type="checkbox" data-acao="escolher-conversa" data-id="${esc(c.id)}" ${ap.escolhidas.has(c.id) ? "checked" : ""} />
                        <span>${esc(c.nome || "Sem nome")}${c.telefone ? ` <span class="mudo">+${esc(c.telefone)}</span>` : ""}${seloUsada(c)}</span></label>`,
                    )
                    .join("") || `<p class="mudo">Nenhuma conversa encontrada.</p>`}</div>`;
              })()
          : "";
      corpo = `
        <form id="f-aprender" data-form="aprender">
          <fieldset class="opcoes">
            <label class="check"><input type="radio" name="escopo" value="esta" ${ap.escopo === "esta" ? "checked" : ""} ${temConversa ? "" : "disabled"} /> <span>Esta conversa${temConversa ? "" : " (abra uma conversa)"}</span></label>
            <label class="check"><input type="radio" name="escopo" value="ultimas" ${ap.escopo === "ultimas" ? "checked" : ""} /> <span>Minhas últimas
              <select name="quantas" aria-label="Quantas conversas">${[10, 30, 50, 100].map((q) => `<option ${ap.quantas === q ? "selected" : ""}>${q}</option>`).join("")}</select> conversas</span></label>
            <label class="check"><input type="radio" name="escopo" value="etiqueta" ${ap.escopo === "etiqueta" ? "checked" : ""} ${est.waBusiness ? "" : "disabled"} /> <span>Com a etiqueta do WhatsApp
              ${
                est.waBusiness
                  ? `<select name="etiquetaWa" aria-label="Etiqueta do WhatsApp"><option value="">escolha…</option>${etiquetasWa
                      .map((e) => `<option value="${esc(e.wa_label_id)}" ${ap.etiquetaWa === e.wa_label_id ? "selected" : ""}>${esc(e.nome)}</option>`)
                      .join("")}</select>`
                  : `<span class="mudo">(só no WhatsApp Business)</span>`
              }</span></label>
            <label class="check"><input type="radio" name="escopo" value="escolher" ${ap.escopo === "escolher" ? "checked" : ""} /> <span>Escolher as conversas</span></label>
          </fieldset>
          ${escolher}
          <label class="check"><input type="checkbox" name="pularUsadas" ${ap.pularUsadas ? "checked" : ""} /> <span>Pular as já usadas que não têm mensagens novas</span></label>
          <label class="check"><input type="checkbox" name="antigo" ${ap.antigo ? "checked" : ""} /> <span>Buscar o histórico antigo no celular (mais lento)</span></label>
          <div class="acoes">
            <button class="dourado" data-tipo="analisar">Analisar com a RIA</button>
            <button class="pequeno" data-tipo="exportar">${ic("download", true)} Exportar JSON</button>
          </div>
          <p class="mudo">A RIA lê as conversas inteiras e propõe regras e exemplos do seu jeito de atender; você escolhe o que entra. Nomes, telefones e e-mails viram marcadores antes de ir para a IA, e as conversas não ficam guardadas.</p>
        </form>
        <hr class="separador" />
        <h2>Conversa exportada do WhatsApp</h2>
        <p class="mudo">No celular: conversa › ⋮ › Mais › Exportar conversa (com mídia, para transcrever os áudios). Envie o .zip (ou o .txt) aqui.</p>
        <label class="botao pequeno largo" style="margin-top:6px">${girando("lerZip", "Lendo o arquivo…") || `${ic("download", true)} Escolher o arquivo .zip ou .txt`}
          <input type="file" accept=".zip,.txt,application/zip,text/plain" data-arquivo="whatsapp" hidden /></label>`;
    }
    return `<section class="cartao"><h2>${ic("livro", true)} Aprender com conversas</h2>${corpo}</section>${ap.progresso ? "" : blocoRegistro()}`;
  }

  function telaImportado() {
    const imp = est.aprender.importado;
    const ap = est.aprender;
    const reg = ap.registro?.get(`nome:${imp.contato.toLowerCase()}`);
    const de = imp.msgs[0].data.toLocaleDateString("pt-BR");
    const ate = imp.msgs[imp.msgs.length - 1].data.toLocaleDateString("pt-BR");
    return `
      <p><b>${esc(imp.contato || imp.arquivo)}</b></p>
      <p class="mudo">${imp.msgs.length} mensagens · ${esc(de)} a ${esc(ate)}${imp.audios ? ` · ${imp.audios} áudios` : ""}</p>
      ${reg ? `<p class="aviso alerta">Esta conversa já foi usada em ${esc(new Date(reg.analisada_em).toLocaleDateString("pt-BR"))}. Analisar de novo atualiza o contexto.</p>` : ""}
      <form id="f-importado" data-form="aprender">
        <label>Quem é você nesta conversa?<select name="voce">${imp.autores
          .map((a) => `<option value="${esc(a.nome)}" ${a.nome === imp.voce ? "selected" : ""}>${esc(a.nome)} (${a.n} mensagens)</option>`)
          .join("")}</select></label>
        ${imp.audios ? `<label class="check"><input type="checkbox" name="transcreverAudios" ${ap.transcreverAudios ? "checked" : ""} /> <span>Transcrever os ${imp.audios} áudios antes (mais lento, mais contexto)</span></label>` : ""}
      </form>
      <div class="acoes">
        <button type="button" class="dourado" data-acao="analisar-importado" ${est.ocupado.aprender ? "disabled" : ""}>Analisar com a RIA</button>
        <button type="button" class="pequeno" data-acao="exportar-importado">${ic("download", true)} JSON</button>
        <button type="button" class="pequeno" data-acao="cancelar-importado">Cancelar</button>
      </div>
      <p class="mudo">Conversas longas são lidas inteiras, em partes, e o histórico sai por período. No plano grátis da IA cada parte leva cerca de 1 minuto.</p>`;
  }

  /** Onde salvar o histórico: na conversa vinculada, ou num cliente escolhido (importação). */
  function blocoSalvarHistorico() {
    const ap = est.aprender;
    if (!ap.historicoImportado) {
      return `<button type="button" class="pequeno largo" data-acao="salvar-historico" ${est.ocupado.historico ? "disabled" : ""}>${girando("historico", "Salvando…") || "Salvar histórico na anotação"}</button>`;
    }
    const lista = ap.clientesHistorico;
    return `<p class="mudo">Salvar o histórico nas anotações de qual cliente?</p>
      <form id="f-cliente-historico" data-form="cliente-historico" class="campo-linha">
        <input name="termo" placeholder="Nome, e-mail ou telefone" aria-label="Buscar cliente" />
        <button class="pequeno" aria-label="Buscar" ${est.ocupado.buscarHist ? "disabled" : ""}>${ic("busca", true)}</button>
      </form>
      ${
        lista
          ? lista.length
            ? `<ul class="lista" style="margin-top:6px">${lista
                .map(
                  (c) => `<li class="item"><div class="info"><div class="nome">${esc(c.nome)}</div><div class="mudo">${esc([c.etapa, c.telefone].filter(Boolean).join(" · "))}</div></div>
                    <button type="button" class="pequeno dourado" data-acao="salvar-historico" data-cliente="${esc(c.id)}" ${est.ocupado.historico ? "disabled" : ""}>Salvar</button></li>`,
                )
                .join("")}</ul>`
            : `<p class="mudo">Nenhum cliente encontrado.</p>`
          : ""
      }`;
  }

  function seloUsada(c) {
    const r = usada(c.id);
    if (!r) return "";
    const data = new Date(r.analisada_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return usadaSemNovidade(c)
      ? ` <span class="selo">usada em ${esc(data)}</span>`
      : ` <span class="selo alerta">usada em ${esc(data)} · mensagens novas</span>`;
  }

  /** Conversas já lidas pela RIA: quando e se chegaram mensagens depois. */
  function blocoRegistro() {
    const reg = est.aprender.registro;
    if (!reg) return "";
    const lista = Array.from(reg.values());
    if (!lista.length) return `<section class="cartao"><h2>Conversas já usadas</h2><p class="mudo">Nenhuma ainda.</p></section>`;
    const novas = lista.filter((r) => r.novidades).length;
    const data = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    return `<details class="cartao" id="d-registro"><summary><span>Conversas já usadas (${lista.length})${novas ? ` · ${novas} com mensagens novas` : ""}</span></summary>
      ${novas ? `<button type="button" class="pequeno largo" data-acao="marcar-novidades" ${est.ocupado.novidades ? "disabled" : ""}>${girando("novidades", "Carregando…") || "Analisar de novo as que têm mensagens novas"}</button>` : ""}
      <ul class="lista" style="margin-top:8px">${lista
        .slice(0, 100)
        .map(
          (r) => `<li class="item"><div class="info"><div class="nome">${esc(r.nome || r.telefone || "Conversa")}</div>
            <div class="mudo">Usada em ${esc(data(r.analisada_em))}${r.vezes > 1 ? ` (${r.vezes}×)` : ""} · ${r.mensagens} mensagens · ${r.propostas} propostas</div></div>
            ${r.novidades ? `<span class="selo alerta">mensagens novas</span>` : `<span class="selo ok">em dia</span>`}</li>`,
        )
        .join("")}</ul>
      <p class="mudo">"Mensagens novas" aparece quando a conversa recebeu mensagens depois da análise: vale analisar de novo para atualizar o contexto.</p>
    </details>`;
  }

  // ── eventos ──────────────────────────────────────────────────────────────
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    const a = b.dataset.acao;
    if (a === "recolher") parent.postMessage({ nordic: "recolher" }, WA_ORIGEM);
    else if (a === "sair") sair(true);
    else if (a === "entrar-sistema") entrarPeloSistema(true);
    else if (a === "aba") {
      est.aba = b.dataset.aba;
      est.aviso = null;
      if (est.aba === "crm" && !est.crm.clientes) acao("crm", () => carregarClientesCrm());
      if (est.aba === "clientes" && !est.itensLista) acao("lista", carregarLista);
      if (est.aba === "aprender" && !est.aprender.registro) acao("registro", () => carregarRegistro([]));
      render();
    } else if (a === "atualizar-lista") acao("lista", carregarLista);
    else if (a === "crm-atualizar") {
      est.crm.funis = null;
      acao("crm", () => carregarClientesCrm());
    } else if (a === "crm-mais") acao("crm", () => carregarClientesCrm(true));
    else if (a === "crm-abrir") acao("crmCartao", () => abrirCartaoCrm(b.dataset.id));
    else if (a === "crm-voltar") {
      est.crm.cliente = null;
      if (!est.crm.clientes) acao("crm", () => carregarClientesCrm());
      render();
    } else if (a === "crm-whatsapp") acao("crmWa", whatsappDoCliente);
    else if (a === "agenda-aberta") {
      est.visitaAgenda = null;
      setTimeout(render, 300);
    }
    else if (a === "abrir-lista") acao("abrirLista", () => abrirDaLista(b.dataset.chat));
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
    } else if (a === "editar-etiquetas") {
      est.editandoEtiquetas = !est.editandoEtiquetas;
      render();
    } else if (a === "etiqueta") acao("etiqueta", () => alternarEtiqueta(b.dataset.id));
    else if (a === "prazo") acao("prazo", () => definirPrazo(Number(b.dataset.dias)));
    else if (a === "prazo-data") {
      est.prazoAberto = !est.prazoAberto;
      render();
    } else if (a === "concluir-prazo") acao("prazo", () => definirPrazo(null));
    else if (a === "usar") acao("usar", () => usarSugestao(Number(b.dataset.i)));
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
    } else if (a === "escolher-conversa") {
      const s = est.aprender.escolhidas;
      if (b.checked) s.add(b.dataset.id);
      else s.delete(b.dataset.id);
      render();
    } else if (a === "marcar-visiveis") {
      const ap = est.aprender;
      const termo = ap.busca.trim().toLowerCase();
      (ap.opcoes || [])
        .filter((c) => !termo || `${c.nome} ${c.telefone}`.toLowerCase().includes(termo))
        .slice(0, 200)
        .forEach((c) => ap.escolhidas.add(c.id));
      render();
    } else if (a === "marcar-novidades") acao("novidades", marcarComNovidades);
    else if (a === "limpar-escolhidas") {
      est.aprender.escolhidas.clear();
      render();
    } else if (a === "salvar-aprendizado") acao("salvarAp", salvarAprendizado);
    else if (a === "descartar-aprendizado") {
      Object.assign(est.aprender, { propostas: null, historico: null, relatorio: null });
      render();
    } else if (a === "salvar-historico") acao("historico", () => salvarHistorico(b.dataset.cliente));
    else if (a === "analisar-importado") acao("aprender", analisarImportado);
    else if (a === "exportar-importado") baixarJson([conversaDoImportado()]);
    else if (a === "cancelar-importado") {
      est.aprender.importado = null;
      render();
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    // filtros dos clientes do CRM
    if (el.closest?.('form[data-form="crm-filtros"]')) {
      const f = est.crm.filtros;
      f[el.name] = el.value;
      if (el.name === "funil_id") f.etapa_id = ""; // etapas são do funil
      est.crm.clientes = null;
      acao("crm", () => carregarClientesCrm());
      return;
    }
    if (el.closest?.('form[data-form="crm-etapa"]')) {
      acao("crmEtapa", () => mudarEtapaCrm(el.value));
      return;
    }
    // filtros da lista
    if (el.closest?.('form[data-form="filtros"]')) {
      est.filtros = { ...est.filtros, [el.name]: el.value };
      est.itensLista = null;
      acao("lista", carregarLista);
      return;
    }
    // opções do "Aprender com conversas" ficam no estado (o painel é redesenhado inteiro)
    if (!el.closest?.('form[data-form="aprender"]') || el.name === "busca") return;
    const ap = est.aprender;
    if (el.name === "escopo") ap.escopo = el.value;
    else if (el.name === "quantas") {
      ap.quantas = Number(el.value);
      ap.escopo = "ultimas";
    } else if (el.name === "etiquetaWa") {
      ap.etiquetaWa = el.value;
      ap.escopo = "etiqueta";
    } else if (el.name === "antigo") ap.antigo = el.checked;
    else if (el.name === "transcreverAudios") ap.transcreverAudios = el.checked;
    else if (el.name === "voce" && ap.importado) ap.importado.voce = el.value;
    else if (el.name === "pularUsadas") ap.pularUsadas = el.checked;
    if (ap.escopo === "escolher" && ap.opcoes == null) acao("opcoes", carregarOpcoesConversas);
    render();
  });

  // arquivo exportado do WhatsApp (.zip ou .txt)
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset?.arquivo !== "whatsapp" || !el.files?.[0]) return;
    const arquivo = el.files[0];
    el.value = "";
    acao("lerZip", () => importarArquivoWhatsapp(arquivo));
  });

  // busca da escolha manual de conversas: filtra enquanto digita
  document.addEventListener("input", (e) => {
    if (e.target.name !== "busca" || !e.target.closest?.('form[data-form="aprender"]')) return;
    est.aprender.busca = e.target.value;
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
    else if (tipo === "etiqueta") {
      const nome = f.nome.value.trim();
      if (nome) acao("criarEtiqueta", async () => {
        await criarEtiqueta(nome);
        f.reset();
      });
    } else if (tipo === "prazo") {
      if (f.data.value) acao("prazo", () => definirPrazo(`${f.data.value}T${f.hora.value || "09:00"}:00`, f.nota.value.trim()));
    } else if (tipo === "crm-filtros") {
      est.crm.filtros.busca = f.busca.value.trim();
      est.crm.clientes = null;
      acao("crm", () => carregarClientesCrm());
    } else if (tipo === "disparo") {
      acao("disparo", () => gerarPublico(f));
    } else if (tipo === "cliente-historico") {
      const termo = f.termo.value.trim();
      if (termo) acao("buscarHist", async () => {
        est.aprender.clientesHistorico = (await api("clientes/buscar", { termo })).clientes;
      });
    } else if (tipo === "aprender") {
      const quer = e.submitter?.dataset.tipo === "exportar" ? "exportar" : "analisar";
      if (est.aprender.escopo === "esta" && (!est.conversa || est.conversa.grupo)) est.aprender.escopo = "ultimas";
      acao("aprender", quer === "exportar" ? exportarConversas : aprenderComConversas);
    }
  });

  iniciar();
})();
