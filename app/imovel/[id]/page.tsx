// app/imovel/[id]/page.tsx
import { Suspense } from "react"
import type { Metadata } from "next"
import { Loader2 } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { PropertyLanding } from "./property-landing"

export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<string, string> = {
  LANCAMENTO: "Lançamento",
  EM_OBRAS: "Em obras",
  PRONTO: "Pronto para morar",
}

/**
 * Título, descrição e foto de capa no HTML da página. É o que o WhatsApp e as
 * redes sociais leem para montar a prévia do link: antes a página só carregava
 * no navegador e o link chegava sem título nem imagem.
 * Não inclui preço: ele só é liberado depois do cadastro.
 */
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const fallback: Metadata = { title: "Imóvel", robots: { index: false } }
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      select: {
        title: true,
        address: true,
        type: true,
        status: true,
        images: { select: { url: true }, orderBy: [{ isCover: "desc" }, { id: "asc" }], take: 1 },
      },
    })
    if (!property) return fallback

    const description = [STATUS_LABEL[property.status], property.type, property.address].filter(Boolean).join(" · ")
    const cover = property.images[0]?.url
    return {
      title: property.title,
      description,
      // Página de captação com link pessoal do corretor: não deve aparecer em buscadores.
      robots: { index: false },
      openGraph: {
        title: property.title,
        description,
        type: "website",
        ...(cover && { images: [{ url: cover }] }),
      },
      twitter: {
        card: cover ? "summary_large_image" : "summary",
        title: property.title,
        description,
        ...(cover && { images: [cover] }),
      },
    }
  } catch {
    return fallback
  }
}

export default function PublicPropertyPage() {
  return (
    // useSearchParams (corretor, roleta e funil vêm na URL) exige um limite de Suspense.
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PropertyLanding />
    </Suspense>
  )
}
