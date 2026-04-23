import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLongLivedToken, graphGet, type FbPage } from '@/lib/facebook-graph'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const stateRaw = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !stateRaw) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/oauth/facebook?status=error`
    )
  }

  let state: { userId: string }
  try {
    state = JSON.parse(Buffer.from(stateRaw, 'base64').toString())
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/oauth/facebook?status=error`
    )
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/facebook/auth/callback`
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', process.env.FACEBOOK_APP_ID!)
    tokenUrl.searchParams.set('client_secret', process.env.FACEBOOK_APP_SECRET!)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('No access token from Facebook')

    const longLivedToken = await getLongLivedToken(tokenData.access_token)

    const user = await prisma.user.findUnique({
      where: { id: state.userId },
      select: { accountId: true },
    })
    const accountId = user?.accountId ?? state.userId

    // Collect all pages: personal + Business Manager owned/client pages
    const allPages: FbPage[] = []

    const personalPages = await graphGet<{ data: FbPage[] }>(
      '/me/accounts?fields=id,name,access_token',
      longLivedToken
    ).catch(() => ({ data: [] as FbPage[] }))
    allPages.push(...(personalPages.data ?? []))

    try {
      const businesses = await graphGet<{ data: { id: string; name: string }[] }>(
        '/me/businesses',
        longLivedToken
      )
      await Promise.all(
        (businesses.data ?? []).map(async (biz) => {
          const [owned, client] = await Promise.all([
            graphGet<{ data: FbPage[] }>(
              `/${biz.id}/owned_pages?fields=id,name,access_token`,
              longLivedToken
            ).catch(() => ({ data: [] as FbPage[] })),
            graphGet<{ data: FbPage[] }>(
              `/${biz.id}/client_pages?fields=id,name,access_token`,
              longLivedToken
            ).catch(() => ({ data: [] as FbPage[] })),
          ])
          allPages.push(...(owned.data ?? []), ...(client.data ?? []))
        })
      )
    } catch {
      // business_management not granted or no businesses — continue with personal pages
    }

    // Deduplicate by page id
    const seen = new Set<string>()
    const uniquePages = allPages.filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })

    for (const page of uniquePages) {
      if (!page.access_token) continue
      await prisma.facebookConnection.upsert({
        where: { accountId_pageId: { accountId, pageId: page.id } },
        update: {
          pageName: page.name,
          pageAccessToken: page.access_token,
          isActive: true,
        },
        create: {
          accountId,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
        },
      })
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/oauth/facebook?status=success`
    )
  } catch (err: any) {
    console.error('[FB_AUTH_CALLBACK]', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/oauth/facebook?status=error`
    )
  }
}
