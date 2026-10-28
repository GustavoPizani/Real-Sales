// lib/ext/auth.ts
// Login da extensão do WhatsApp. A faixa não tem cookie do site: manda o access
// token do Supabase em "Authorization: Bearer". /api/ext fica fora do matcher do
// middleware (não paga a validação de sessão por cookie à toa), então NUNCA usar
// getUserFromToken aqui — ele confiaria num header que ninguém apagou.
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';

/** Versão da extensão publicada (tem de bater com extensao/manifest.base.json). */
export const VERSAO_EXTENSAO = '0.2.0';

/**
 * ID fixo da extensão (vem da chave pública em extensao/chave-publica.txt; o
 * script scripts/empacotar-extensao.mjs imprime o valor). Só a faixa pode
 * chamar a API pelo navegador.
 */
export const EXT_CHROME_ID = process.env.EXT_CHROME_ID?.trim() || 'belihpaleeoglafljomhkgjncndigbec';
export const ORIGEM_EXTENSAO = `chrome-extension://${EXT_CHROME_ID}`;

export interface UsuarioExt {
  id: string;
  name: string;
  email: string;
  accountId: string;
}

export class ErroExt extends Error {
  /** esperarSeg: no limite da IA (429), quanto esperar antes de tentar de novo */
  constructor(public status: number, message: string, public esperarSeg?: number) {
    super(message);
  }
}

// Validar o token custa uma ida ao Supabase Auth + leitura do perfil (~1 s).
// Guarda o resultado por 60 s por token.
const cache = new Map<string, { usuario: UsuarioExt; ate: number }>();

/** Usuário do token Bearer. Só o MARKETING_ADMIN usa a extensão. */
export async function usuarioDoPedido(req: Request): Promise<UsuarioExt> {
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') ?? '')?.[1];
  if (!token) throw new ErroExt(401, 'Entre com a sua conta.');

  const guardado = cache.get(token);
  if (guardado && guardado.ate > Date.now()) return guardado.usuario;

  const { data, error } = await createAdminClient().auth.getUser(token);
  if (error || !data.user) throw new ErroExt(401, 'Sua sessão expirou. Entre de novo.');

  const perfil = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { id: true, name: true, email: true, role: true, accountId: true },
  });
  if (!perfil) throw new ErroExt(401, 'Conta sem perfil no sistema.');
  if (perfil.role !== Role.MARKETING_ADMIN) {
    throw new ErroExt(403, 'A extensão do WhatsApp é exclusiva do administrador.');
  }

  // Admin raiz não tem accountId (o próprio id é a conta) — mesmo critério de /api/clients.
  const usuario = { id: perfil.id, name: perfil.name, email: perfil.email, accountId: perfil.accountId ?? perfil.id };
  if (cache.size > 200) cache.clear();
  cache.set(token, { usuario, ate: Date.now() + 60_000 });
  return usuario;
}

/** CORS: só a extensão (e o próprio site, para testar pelo navegador). */
export function cabecalhosCors(req: Request): Record<string, string> {
  const origem = req.headers.get('origin') ?? '';
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  const permitida = origem === ORIGEM_EXTENSAO || (site && origem === site) || /^http:\/\/localhost:\d+$/.test(origem);
  return permitida
    ? {
        'Access-Control-Allow-Origin': origem,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : { Vary: 'Origin' };
}
