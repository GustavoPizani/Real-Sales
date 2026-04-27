import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Público — a VAPID public key não é segredo e precisa ficar acessível ao service worker
export async function GET() {
  return NextResponse.json({
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
  })
}
