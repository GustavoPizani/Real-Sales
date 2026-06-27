import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { createElement } from 'react'

export const dynamic = 'force-static'
export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const size = Math.min(Math.max(parseInt(new URL(request.url).searchParams.get('size') ?? '192'), 16), 512)
  const radius = Math.round(size * 0.1875)
  const fontSize = Math.round(size * 0.4)

  return new ImageResponse(
    createElement('div', {
      style: {
        width: size,
        height: size,
        background: '#07090D',
        borderRadius: radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial Black, sans-serif',
        fontSize,
        fontWeight: 900,
        color: '#E8B66C',
        letterSpacing: 2,
      },
    }, 'N'),
    { width: size, height: size }
  )
}
