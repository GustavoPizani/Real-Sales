// Conta de teste invisível — criar e trocar de perfil.
//
//   node --env-file=.env.local scripts/test-user.mjs status
//   node --env-file=.env.local scripts/test-user.mjs create      cria a conta e mostra a senha
//   node --env-file=.env.local scripts/test-user.mjs senha       gera uma senha nova
//   node --env-file=.env.local scripts/test-user.mjs cliente     cria o cliente de teste
//   node --env-file=.env.local scripts/test-user.mjs admin
//   node --env-file=.env.local scripts/test-user.mjs corretor [nome ou e-mail do supervisor]
//
// A conta é reconhecida pelo e-mail (lib/test-account.ts), sem coluna nova no
// banco. Usa DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
// ATENÇÃO: o .env.local aponta para o banco de produção — a conta é real.
import { randomInt } from "node:crypto";
import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;

const EMAIL = (process.env.TEST_ACCOUNT_EMAIL ?? "pizanicorretor+teste@gmail.com").toLowerCase();
const NAME = "Conta de Teste";
const CLIENT_NAME = "Cliente Teste";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!process.env.DATABASE_URL || !SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Faltam DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY. Rode com --env-file=.env.local.");
}

const prisma = new PrismaClient();
const newPassword = () => "Teste@" + randomInt(100000, 999999);

async function authAdmin(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`Supabase Auth ${res.status}: ${body?.msg ?? body?.message ?? text}`);
  return body;
}

const getTest = () =>
  prisma.user.findUnique({ where: { email: EMAIL }, include: { supervisor: { select: { name: true } } } });

async function requireTest() {
  const test = await getTest();
  if (!test) throw new Error("Conta de teste não existe. Rode o comando create.");
  return test;
}

const [cmd = "status", arg] = process.argv.slice(2);

try {
  if (cmd === "status") {
    const test = await getTest();
    if (!test) {
      console.log("Conta de teste ainda não criada.");
    } else {
      const clients = await prisma.client.count({ where: { brokerId: test.id } });
      const perfil = test.role === "MARKETING_ADMIN" ? "Admin" : "Corretor";
      console.log(`${test.email} | perfil: ${perfil} | supervisor: ${test.supervisor?.name ?? "—"} | clientes: ${clients}`);
    }
  } else if (cmd === "create") {
    if (await getTest()) throw new Error("A conta de teste já existe (use status).");
    // Fica na mesma conta do admin mais antigo, para enxergar funis e imóveis.
    const admin = await prisma.user.findFirst({
      where: { role: "MARKETING_ADMIN", email: { not: EMAIL } },
      orderBy: { createdAt: "asc" },
      select: { id: true, accountId: true },
    });
    if (!admin) throw new Error("Nenhum administrador encontrado para definir a conta.");

    const password = newPassword();
    const authUser = await authAdmin("/users", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, password, email_confirm: true }),
    });
    await prisma.user.create({
      data: { id: authUser.id, name: NAME, email: EMAIL, role: "BROKER", accountId: admin.accountId ?? admin.id },
    });
    console.log(`Conta criada.\n  e-mail: ${EMAIL}\n  senha:  ${password}\n  perfil: Corretor (sem supervisor)`);
  } else if (cmd === "senha") {
    const test = await requireTest();
    const password = newPassword();
    await authAdmin(`/users/${test.id}`, { method: "PUT", body: JSON.stringify({ password }) });
    console.log(`Nova senha de ${EMAIL}: ${password}`);
  } else if (cmd === "admin") {
    const test = await requireTest();
    await prisma.user.update({ where: { id: test.id }, data: { role: "MARKETING_ADMIN", supervisorId: null } });
    console.log("Conta de teste agora é Admin.");
  } else if (cmd === "corretor") {
    const test = await requireTest();
    let supervisor = null;
    if (arg) {
      const candidates = await prisma.user.findMany({
        where: { id: { not: test.id }, accountId: test.accountId },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      });
      const q = arg.toLowerCase();
      supervisor = candidates.find(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) ?? null;
      if (!supervisor) throw new Error(`Supervisor não encontrado. Opções: ${candidates.map(u => u.name).join(", ")}`);
    }
    await prisma.user.update({ where: { id: test.id }, data: { role: "BROKER", supervisorId: supervisor?.id ?? null } });
    console.log(`Conta de teste agora é Corretor${supervisor ? ` na equipe de ${supervisor.name}` : " (sem supervisor)"}.`);
  } else if (cmd === "cliente") {
    const test = await requireTest();
    const existing = await prisma.client.findFirst({ where: { brokerId: test.id, fullName: CLIENT_NAME }, select: { id: true } });
    if (existing) {
      console.log(`Cliente de teste já existe: ${CLIENT_NAME} (${existing.id}).`);
    } else {
      const funnel =
        (await prisma.funnel.findFirst({ where: { isDefaultEntry: true }, include: { stages: { orderBy: { order: "asc" }, take: 1 } } })) ??
        (await prisma.funnel.findFirst({ orderBy: { name: "asc" }, include: { stages: { orderBy: { order: "asc" }, take: 1 } } }));
      if (!funnel?.stages[0]) throw new Error("Nenhum funil com etapas encontrado.");
      const client = await prisma.client.create({
        data: {
          fullName: CLIENT_NAME,
          phone: "11999990000",
          brokerId: test.id,
          createdById: test.id,
          accountId: test.accountId,
          funnelId: funnel.id,
          funnelStageId: funnel.stages[0].id,
        },
        select: { id: true },
      });
      console.log(`Cliente de teste criado: ${CLIENT_NAME} (${client.id}), no funil "${funnel.name}", etapa "${funnel.stages[0].name}".`);
    }
  } else {
    console.log("Comandos: status | create | senha | cliente | admin | corretor [supervisor]");
  }
} catch (error) {
  console.error("Erro:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
