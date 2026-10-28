// lib/ext/json-tolerante.ts
// O modelo às vezes devolve o JSON cortado (acabou o espaço da resposta) ou com
// defeito no fim. Em vez de perder tudo, fecha o JSON no último valor completo:
// perde-se só o pedaço final.

export function lerJsonTolerante(texto: string): any | null {
  const ini = texto.indexOf('{');
  if (ini < 0) return null;
  const s = texto.slice(ini);
  try {
    return JSON.parse(s.slice(0, s.lastIndexOf('}') + 1));
  } catch {
    /* tenta consertar abaixo */
  }

  // percorre o texto guardando, a cada valor fechado fora de string, a pilha de
  // { e [ ainda abertos; do último ponto para trás, tenta fechar e ler
  const cortes: { fim: number; pilha: string }[] = [];
  const pilha: string[] = [];
  let emString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (emString) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') {
        emString = false;
        cortes.push({ fim: i + 1, pilha: pilha.join('') });
      }
      continue;
    }
    if (c === '"') emString = true;
    else if (c === '{' || c === '[') pilha.push(c);
    else if (c === '}' || c === ']') {
      pilha.pop();
      cortes.push({ fim: i + 1, pilha: pilha.join('') });
      if (!pilha.length) break;
    }
  }
  // cortado no meio de um texto: fecha a string e o que estiver aberto
  if (emString) {
    const fechar = pilha.slice().reverse().map((x) => (x === '{' ? '}' : ']')).join('');
    try {
      return JSON.parse(`${s.replace(/\\$/, '')}"${fechar}`);
    } catch {
      /* segue para os cortes */
    }
  }
  for (let k = cortes.length - 1; k >= 0 && k >= cortes.length - 400; k--) {
    const { fim, pilha: aberta } = cortes[k];
    const fechar = aberta.split('').reverse().map((x) => (x === '{' ? '}' : ']')).join('');
    try {
      return JSON.parse(s.slice(0, fim) + fechar);
    } catch {
      /* corte anterior */
    }
  }
  return null;
}
