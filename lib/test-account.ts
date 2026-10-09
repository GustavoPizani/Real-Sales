// lib/test-account.ts
import type { Prisma } from '@prisma/client';

/**
 * Conta de teste invisível: um usuário real, em produção, que serve para
 * testar o sistema sem aparecer para ninguém. Ela é reconhecida pelo e-mail,
 * então não exige coluna nova no banco. Quem cria e troca o perfil dela é
 * scripts/test-user.mjs.
 *
 * Para os outros usuários, a conta e os clientes dela ficam de fora das
 * listas (ver hideTestUsers / hideTestClients). Logada, ela enxerga a si mesma.
 */
export const TEST_ACCOUNT_EMAIL = (process.env.TEST_ACCOUNT_EMAIL ?? 'pizanicorretor+teste@gmail.com').toLowerCase();

export const isTestAccountEmail = (email: string | null | undefined) =>
  !!email && email.toLowerCase() === TEST_ACCOUNT_EMAIL;

type Viewer = { isTest: boolean };

/** Filtro para listas de usuários: esconde a conta de teste de todo mundo, menos dela mesma. */
export const hideTestUsers = (viewer: Viewer): Prisma.UserWhereInput =>
  viewer.isTest ? {} : { email: { not: TEST_ACCOUNT_EMAIL } };

/** Filtro para listas e contagens de clientes: esconde o que pertence à conta de teste. */
export const hideTestClients = (viewer: Viewer): Prisma.ClientWhereInput =>
  viewer.isTest ? {} : { broker: { email: { not: TEST_ACCOUNT_EMAIL } } };
