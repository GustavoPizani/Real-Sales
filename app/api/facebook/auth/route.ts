import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'

const SCOPES =
  'pages_show_list,leads_retrieval,pages_manage_ads,pages_manage_metadata,pages_read_engagement,business_management'

export async function GET(request: NextRequest) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const state = Buffer.from(
    JSON.stringify({ userId: user.id, ts: Date.now() })
  ).toString('base64')
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/facebook/auth/callback`

  const url = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  url.searchParams.set('client_id', process.env.FACEBOOK_APP_ID!)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('auth_type', 'rerequest')

  return NextResponse.redirect(url.toString())
}
