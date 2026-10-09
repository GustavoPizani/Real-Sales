import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role } from '@prisma/client';
import { createAdminClient } from '@/lib/supabase/admin';

// Mesmo bucket de /api/upload, que recebe fotos e plantas.
const STORAGE_BUCKET = 'property-images';

/** Caminho do arquivo dentro do bucket, a partir da URL pública. null se a URL for de outro lugar. */
function storagePathOf(url: string): string | null {
  const marker = `/${STORAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const path = url.slice(index + marker.length).split('?')[0];
  return path ? decodeURIComponent(path) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        images: { select: { id: true, url: true }, orderBy: [{ isCover: 'desc' }, { id: 'asc' }] },
        propertyTypes: true,
        creator: { select: { name: true } },
        updater: { select: { name: true } },
        _count: { select: { interestedClients: true } },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      id: property.id,
      title: property.title,
      features: property.features,
      address: property.address,
      type: property.type,
      status: property.status,
      images: property.images,
      typologies: property.propertyTypes.map((t) => ({
        id: t.id,
        name: t.name,
        value: t.value,
        area: t.area,
        dormitorios: t.dormitorios,
        suites: t.suites,
        vagas: t.vagas,
        floorPlanUrl: t.floorPlanUrl,
      })),
      // Usado na confirmação de exclusão: quantos clientes perderiam o vínculo.
      interestedClientsCount: property._count.interestedClients,
      creatorName: property.creator?.name || 'N/A',
      updaterName: property.updater?.name || 'N/A',
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Erro ao buscar imóvel:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

/**
 * Exclui tudo o que é do imóvel: o cadastro, as tipologias, as fotos e plantas
 * (registros e arquivos no armazenamento) e os links curtos de compartilhamento.
 * Clientes, ofertas ativas e formulários que apontavam para ele continuam
 * existindo, só perdem o vínculo. Só o administrador exclui: não há como desfazer.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: 'Apenas o administrador pode excluir imóveis.' }, { status: 403 });
    }

    const existing = await prisma.property.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        images: { select: { url: true } },
        propertyTypes: { select: { floorPlanUrl: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    // Arquivos do imóvel no armazenamento: fotos e plantas das tipologias.
    const fileUrls = Array.from(new Set([
      ...existing.images.map(i => i.url),
      ...existing.propertyTypes.map(t => t.floorPlanUrl),
    ].filter((url): url is string => !!url)));

    // Um mesmo arquivo pode estar em outro imóvel (cadastro duplicado, por
    // exemplo): só sai do armazenamento o que nenhum outro imóvel usa.
    const [sharedImages, sharedPlans] = fileUrls.length > 0
      ? await Promise.all([
          prisma.propertyImage.findMany({ where: { url: { in: fileUrls }, propertyId: { not: params.id } }, select: { url: true } }),
          prisma.propertyType.findMany({ where: { floorPlanUrl: { in: fileUrls }, propertyId: { not: params.id } }, select: { floorPlanUrl: true } }),
        ])
      : [[], []];
    const stillUsed = new Set([...sharedImages.map(i => i.url), ...sharedPlans.map(p => p.floorPlanUrl)]);
    const storagePaths = fileUrls
      .filter(url => !stillUsed.has(url))
      .map(storagePathOf)
      .filter((path): path is string => !!path);

    // Banco primeiro: imóvel (tipologias e fotos em cascata) e os links curtos
    // de compartilhamento que apontavam para a página pública dele.
    const [, deletedLinks] = await prisma.$transaction([
      prisma.property.delete({ where: { id: params.id } }),
      prisma.shortLink.deleteMany({ where: { targetUrl: { contains: `/imovel/${params.id}` } } }),
    ]);

    // Depois os arquivos. Se o armazenamento falhar, o imóvel já saiu do
    // sistema; a resposta avisa quantos arquivos ficaram para trás.
    let filesRemoved = 0;
    let filesFailed = 0;
    if (storagePaths.length > 0) {
      try {
        const { data, error } = await createAdminClient().storage.from(STORAGE_BUCKET).remove(storagePaths);
        if (error) throw error;
        filesRemoved = data?.length ?? 0;
        filesFailed = storagePaths.length - filesRemoved;
      } catch (storageError) {
        console.error('Imóvel excluído, mas os arquivos não saíram do armazenamento:', storageError);
        filesFailed = storagePaths.length;
      }
    }

    return NextResponse.json({ success: true, filesRemoved, filesFailed, linksRemoved: deletedLinks.count });
  } catch (error) {
    console.error('Erro ao EXCLUIR imóvel:', error);
    return NextResponse.json({ error: 'Erro interno do servidor ao excluir o imóvel.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const propertyId = params.id;
    const { title, features, address, type, status, typologies, imageUrls } = await request.json();

    const existingProperty = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!existingProperty) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    const updatedProperty = await prisma.$transaction(async (tx) => {
      const property = await tx.property.update({
        where: { id: propertyId },
        data: {
          ...(title && { title }),
          ...(Array.isArray(features) && { features }),
          ...(address !== undefined && { address }),
          ...(type !== undefined && { type }),
          ...(status && { status }),
          updaterId: user.id,
        },
      });

      if (Array.isArray(typologies)) {
        await tx.propertyType.deleteMany({ where: { propertyId } });
        if (typologies.length > 0) {
          await tx.propertyType.createMany({
            data: typologies.map((t: any) => ({
              name: t.name || '',
              value: parseFloat(t.value ?? t.valor) || 0,
              area: parseFloat(t.area) || null,
              dormitorios: parseInt(t.dormitorios) || null,
              suites: parseInt(t.suites) || null,
              vagas: parseInt(t.vagas) || null,
              floorPlanUrl: t.floorPlanUrl || null,
              propertyId,
            })),
          });
        }
      }

      if (Array.isArray(imageUrls)) {
        await tx.propertyImage.deleteMany({ where: { propertyId } });
        if (imageUrls.length > 0) {
          await tx.propertyImage.createMany({
            data: imageUrls.map((url: string, index: number) => ({ url, propertyId, isCover: index === 0 })),
          });
        }
      }

      return property;
    });

    return NextResponse.json({ success: true, property: updatedProperty });
  } catch (error) {
    console.error('Erro ao ATUALIZAR imóvel:', error);
    return NextResponse.json({ error: 'Erro interno do servidor ao atualizar o imóvel.' }, { status: 500 });
  }
}
