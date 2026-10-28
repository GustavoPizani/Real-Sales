// Content script nas páginas do Nordic CRM: avisa a extensão de qual conta está
// logada no sistema neste navegador, para a faixa do WhatsApp entrar sozinha.
// O CRM guarda a sessão do Supabase em cookie (@supabase/ssr), às vezes em partes
// (.0, .1…) e em base64. Lê só o token de acesso atual (vale 1 hora); a
// extensão troca por uma sessão própria.
(() => {
  function sessaoDoCookie() {
    const partes = {};
    for (const par of document.cookie.split(/;\s*/)) {
      const i = par.indexOf("=");
      const m = /^(sb-.+-auth-token)(?:\.(\d+))?$/.exec(par.slice(0, i));
      if (!m) continue;
      (partes[m[1]] ||= [])[Number(m[2] || 0)] = decodeURIComponent(par.slice(i + 1));
    }
    for (const pedacos of Object.values(partes)) {
      let valor = pedacos.join("");
      if (valor.startsWith("base64-")) {
        const b64 = valor.slice(7).replace(/-/g, "+").replace(/_/g, "/");
        const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
        valor = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
      }
      try {
        const s = JSON.parse(valor);
        if (s?.access_token && s.expires_at) return s;
      } catch {}
    }
    return null;
  }

  function avisar() {
    try {
      const s = sessaoDoCookie();
      if (s) {
        chrome.storage.local.set({
          tokenSistema: { servidor: location.origin, access_token: s.access_token, expira: s.expires_at * 1000, email: s.user?.email || "" },
        });
        return;
      }
      // saiu do sistema: esquece o login deste servidor
      chrome.storage.local.get("tokenSistema", (v) => {
        if (v.tokenSistema?.servidor === location.origin) chrome.storage.local.remove("tokenSistema");
      });
    } catch {
      /* sem acesso ao cookie ou ao armazenamento */
    }
  }
  avisar();
  setInterval(avisar, 30000);
})();
