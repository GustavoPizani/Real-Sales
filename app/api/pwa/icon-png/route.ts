import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const dynamic = 'force-static'
export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const size = Math.min(Math.max(parseInt(new URL(request.url).searchParams.get('size') ?? '192'), 16), 512)
  const radius = Math.round(size * 0.167)
  const fontSize = Math.round(size * 0.375)

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: '#023863',
          borderRadius: radius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial Black, sans-serif',
          fontSize,
          fontWeight: 900,
          color: '#aa8d44',
          letterSpacing: 2,
        }}
      >
        RS
      </div>
    ),
    { width: size, height: size }
  )
}
