import { NextRequest } from 'next/server'

export const dynamic = 'force-static'

export async function GET(request: NextRequest) {
  const size = parseInt(new URL(request.url).searchParams.get('size') ?? '192')
  const clamp = Math.min(Math.max(size, 16), 512)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${clamp} ${clamp}" width="${clamp}" height="${clamp}">
  <rect width="${clamp}" height="${clamp}" rx="${Math.round(clamp * 0.167)}" fill="#023863"/>
  <text x="50%" y="54%" font-family="Arial Black, sans-serif" font-size="${Math.round(clamp * 0.375)}"
    font-weight="900" fill="#aa8d44" text-anchor="middle" dominant-baseline="middle" letter-spacing="2">RS</text>
</svg>`

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
