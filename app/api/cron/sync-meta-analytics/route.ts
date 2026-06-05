import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import CryptoJS from 'crypto-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ENCRYPTION_KEY = 'ads-intel-hub-2024'
const GRAPH_API = 'https://graph.facebook.com/v18.0'

function decrypt(ciphertext: string): string {
  try {
    return CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8)
  } catch {
    return ''
  }
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

interface MetaInsight {
  campaign_id?: string
  campaign_name?: string
  adset_name?: string
  ad_name?: string
  account_name?: string
  date_start?: string
  spend?: string
  impressions?: string
  clicks?: string
  reach?: string
  cpc?: string
  ctr?: string
  frequency?: string
  actions?: { action_type: string; value: string }[]
  conversions?: { action_type: string; value: string }[]
  ad_id?: string
}

async function fetchAccountInsights(
  accountId: string,
  accessToken: string,
  since: string,
  until: string
): Promise<{ insights: (MetaInsight & { account_name: string })[]; error?: string }> {
  try {
    const accountRes = await fetch(
      `${GRAPH_API}/act_${accountId}?fields=name&access_token=${accessToken}`
    )
    const accountInfo = await accountRes.json()
    if (accountInfo.error) return { insights: [], error: accountInfo.error.message }
    const accountName: string = accountInfo.name ?? `Conta ${accountId}`

    const fields = 'campaign_id,campaign_name,adset_name,ad_id,ad_name,spend,impressions,clicks,reach,actions,conversions,cpc,ctr,frequency'
    const timeRange = JSON.stringify({ since, until })
    let url: string | null =
      `${GRAPH_API}/act_${accountId}/insights?level=ad&fields=${fields}&time_range=${encodeURIComponent(timeRange)}&time_increment=1&access_token=${accessToken}&limit=500`

    const insights: (MetaInsight & { account_name: string })[] = []

    while (url) {
      const res: Response = await fetch(url)
      const data: any = await res.json()
      if (!res.ok || data.error) return { insights, error: data.error?.message ?? 'Meta API error' }
      for (const item of data.data ?? []) insights.push({ ...item, account_name: accountName })
      url = (data.paging?.next as string | undefined) ?? null
    }

    return { insights }
  } catch (err: any) {
    return { insights: [], error: err.message }
  }
}

async function fetchThumbnails(adIds: string[], accessToken: string): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (adIds.length === 0) return map

  const CHUNK = 50
  for (let i = 0; i < adIds.length; i += CHUNK) {
    const chunk = adIds.slice(i, i + CHUNK)
    const batch = chunk.map(id => ({ method: 'GET', relative_url: `${id}?fields=creative{image_url,thumbnail_url}` }))
    try {
      const res = await fetch(
        `${GRAPH_API}?batch=${encodeURIComponent(JSON.stringify(batch))}&access_token=${accessToken}`,
        { method: 'POST' }
      )
      const results = await res.json()
      if (Array.isArray(results)) {
        results.forEach((item, idx) => {
          if (item?.code === 200) {
            const b = JSON.parse(item.body)
            const c = b?.creative
            const url = c?.image_url ?? c?.thumbnail_url
            if (url) map.set(chunk[idx], url)
          }
        })
      }
    } catch {
      // thumbnails are optional — keep going
    }
  }
  return map
}

function extractLeads(insight: MetaInsight): number {
  const all = [...(insight.actions ?? []), ...(insight.conversions ?? [])]
  const validTypes = new Set(['lead', 'on_facebook_lead', 'contact', 'submit_application'])
  const generic = all.find(a => a.action_type === 'lead')
  if (generic) return parseInt(generic.value ?? '0')
  return all
    .filter(a => validTypes.has(a.action_type))
    .reduce((acc, a) => acc + parseInt(a.value ?? '0'), 0)
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    const qs = request.nextUrl.searchParams.get('secret')
    if (auth !== `Bearer ${cronSecret}` && qs !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const startedAt = Date.now()
  console.log('[META_SYNC] Iniciando sincronização de métricas Meta Ads')

  // Fetch yesterday (+ the day before to catch late Meta reporting)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const since = dateStr(twoDaysAgo)
  const until = dateStr(yesterday)

  // Find all users with META_ACCESS_TOKEN configured
  const tokenSettings = await prisma.apiSetting.findMany({
    where: { setting_key: 'META_ACCESS_TOKEN' },
    select: { user_id: true, encrypted_value: true },
  })

  if (tokenSettings.length === 0) {
    return NextResponse.json({ message: 'Nenhum usuário com META_ACCESS_TOKEN configurado', users: 0 })
  }

  const results: Array<{
    userId: string
    accounts: number
    imported: number
    errors: string[]
  }> = []

  for (const tokenRow of tokenSettings) {
    const userId = tokenRow.user_id
    const accessToken = decrypt(tokenRow.encrypted_value)
    if (!accessToken) {
      results.push({ userId, accounts: 0, imported: 0, errors: ['Token inválido ou não descriptografado'] })
      continue
    }

    // Get ad account IDs for this user
    const accountsSetting = await prisma.apiSetting.findFirst({
      where: { setting_key: 'META_AD_ACCOUNT_IDS', user_id: userId },
      select: { encrypted_value: true },
    })

    const rawAccounts = accountsSetting ? decrypt(accountsSetting.encrypted_value) : ''
    const adAccountIds = rawAccounts.split(',').map(s => s.trim()).filter(Boolean)

    if (adAccountIds.length === 0) {
      results.push({ userId, accounts: 0, imported: 0, errors: ['META_AD_ACCOUNT_IDS não configurado'] })
      continue
    }

    let imported = 0
    const errors: string[] = []

    // Process accounts in batches of 3
    for (let i = 0; i < adAccountIds.length; i += 3) {
      const chunk = adAccountIds.slice(i, i + 3)
      const fetched = await Promise.all(chunk.map(id => fetchAccountInsights(id, accessToken, since, until)))

      const allInsights = fetched.flatMap(r => {
        if (r.error) { errors.push(r.error); return [] }
        return r.insights
      })

      if (allInsights.length === 0) continue

      // Fetch thumbnails
      const adIds = [...new Set(allInsights.map(i => i.ad_id).filter(Boolean))] as string[]
      const thumbs = await fetchThumbnails(adIds, accessToken)

      // Deduplicate before upsert
      const seen = new Map<string, typeof allInsights[0]>()
      for (const insight of allInsights) {
        const key = `${insight.campaign_name ?? ''}|${insight.ad_name ?? '-'}|${insight.date_start ?? ''}`
        seen.set(key, insight)
      }

      for (const insight of seen.values()) {
        const leads = extractLeads(insight)
        const spend = parseFloat(insight.spend ?? '0')
        const impressions = parseInt(insight.impressions ?? '0')
        const clicks = parseInt(insight.clicks ?? '0')
        const reach = parseInt(insight.reach ?? '0')
        const ctr = parseFloat(insight.ctr ?? '0')
        const cpc = parseFloat(insight.cpc ?? '0')
        const cpl = leads > 0 ? spend / leads : 0
        const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0
        const frequency = parseFloat(insight.frequency ?? '0')
        const thumbUrl = insight.ad_id ? (thumbs.get(insight.ad_id) ?? null) : null
        const date = insight.date_start ? new Date(insight.date_start) : new Date(since)
        const adName = insight.ad_name ?? '-'
        const campaignName = insight.campaign_name ?? ''

        try {
          await prisma.campaignMetric.upsert({
            where: {
              user_id_campaign_name_ad_name_date: {
                user_id: userId,
                campaign_name: campaignName,
                ad_name: adName,
                date,
              },
            },
            update: {
              spend, impressions, clicks, leads, reach, ctr, cpc, cpl, cpm, frequency,
              account_name: insight.account_name,
              ad_set_name: insight.adset_name ?? null,
              campaign_id: insight.campaign_id ?? null,
              thumbnail_url: thumbUrl,
              channel: 'meta',
            },
            create: {
              user_id: userId,
              campaign_name: campaignName,
              campaign_id: insight.campaign_id ?? null,
              ad_set_name: insight.adset_name ?? null,
              ad_name: adName,
              account_name: insight.account_name,
              date,
              spend, impressions, clicks, leads, reach, ctr, cpc, cpl, cpm, frequency,
              thumbnail_url: thumbUrl,
              channel: 'meta',
            },
          })
          imported++
        } catch (err: any) {
          errors.push(`${campaignName}/${adName}: ${err.message}`)
        }
      }
    }

    // Cleanup: remove records older than 90 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    await prisma.campaignMetric.deleteMany({
      where: { user_id: userId, date: { lt: cutoff } },
    }).catch(() => null)

    results.push({ userId, accounts: adAccountIds.length, imported, errors })
    console.log(`[META_SYNC] user=${userId}: ${imported} métricas salvas, ${errors.length} erros`)
  }

  const totalImported = results.reduce((s, r) => s + r.imported, 0)
  const durationMs = Date.now() - startedAt

  console.log(`[META_SYNC] Concluído em ${durationMs}ms — ${totalImported} métricas no total`)

  return NextResponse.json({ ok: true, durationMs, since, until, totalImported, results })
}
