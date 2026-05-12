import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { syncMapping } from '@/lib/lead-ingestion'

export async function POST(
  request: NextRequest,
  { params }: { params: { mappingId: string } }
) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const mapping = await prisma.facebookFormMapping.findUnique({
    where: { id: params.mappingId },
    include: { connection: true },
  })

  if (!mapping) return NextResponse.json({ error: 'Mapeamento não encontrado' }, { status: 404 })

  let fullSync = false
  try {
    const body = await request.json()
    fullSync = body?.fullSync === true
  } catch {}

  try {
    const { imported, skipped, errors } = await syncMapping(mapping, fullSync)
    return NextResponse.json({ imported, skipped, errors })
  } catch (err: any) {
    console.error('[SYNC_MANUAL] Erro:', err.message)
    return NextResponse.json(
      { error: err.message || 'Erro ao sincronizar leads com o Facebook.' },
      { status: 500 }
    )
  }
}
