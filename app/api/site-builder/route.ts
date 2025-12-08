import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Carrega o site (ou cria um rascunho se não existir)
export async function GET() {
  const token = cookies().get('authToken')?.value;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Busca site da conta
  let site = await prisma.site.findFirst({
    where: { accountId: user.accountId },
    include: { 
        pages: { 
            include: { sections: { orderBy: { order: 'asc' } } } 
        } 
    }
  });

  // AUTO-SETUP: Se não existir, cria o esqueleto padrão
  if (!site) {
    site = await prisma.site.create({
      data: {
        name: "Meu Site Imobiliário",
        accountId: user.accountId,
        userId: user.id, // Adicionado para satisfazer a relação
        pages: {
          create: {
            title: "Home",
            slug: "home",
            isPublished: false,
            sections: {
              createMany: {
                data: [
                  { type: "HERO_SEARCH", order: 0, content: { title: "Encontre seu Imóvel", backgroundImageUrl: "" } },
                  { type: "LISTING_GRID", order: 1, content: { title: "Destaques" } }
                ]
              }
            }
          }
        }
      },
      include: { pages: { include: { sections: true } } }
    });
  }

  return NextResponse.json(site);
}

// POST: Salva alterações (Publicar)
export async function POST(req: Request) {
  const token = cookies().get('authToken')?.value;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json(); // Recebe { siteId, sections }

  // Para o MVP, apenas retornamos sucesso simulado
  return NextResponse.json({ success: true, message: "Site salvo com sucesso!" });
}
