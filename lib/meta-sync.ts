// lib/meta-sync.ts
// Sincronização das métricas do Meta Ads, sempre no servidor. Usada pela rotina
// agendada (app/api/cron/sync-meta-analytics) e pelo botão "Sincronizar" do
// dashboard de marketing (app/api/marketing/sync).
import CryptoJS from 'crypto-js'
import { prisma } from '@/lib/prisma'

// Mesma chave usada pela tela de configurações ao salvar o token.
const ENCRYPTION_KEY = 'ads-intel-hub-2024'
// Mesma versão que a função meta-insights do Supabase usava.
const GRAPH_API = 'https://graph.facebook.com/v21.0'

/**
 * Por quanto tempo as métricas ficam guardadas. Eram 90 dias; com 13 meses dá
 * para comparar um período de até 90 dias com o anterior e ver o mesmo mês do
 * ano passado.
 */
export const META_RETENTION_DAYS = 400

export const dateStr = (d: Date) => d.toISOString().split('T')[0]

function decrypt(ciphertext: string): string {
  try {
    return CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8)
  } catch {
    return ''
  }
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

type AccountInsight = MetaInsight & { account_name: string }

async function fetchAccountInsights(
  accountId: string,
  accessToken: string,
  since: string,
  until: string
): Promise<{ insights: AccountInsight[]; error?: string }> {
  try {
    const accountRes = await fetch(`${GRAPH_API}/act_${accountId}?fields=name&access_token=${accessToken}`)
    const accountInfo = await accountRes.json()
    if (accountInfo.error) return { insights: [], error: accountInfo.error.message }
    const accountName: string = accountInfo.name ?? `Conta ${accountId}`

    const fields = 'campaign_id,campaign_name,adset_name,ad_id,ad_name,spend,impressions,clicks,reach,actions,conversions,cpc,ctr,frequency'
    const timeRange = JSON.stringify({ since, until })
    let url: string | null =
      `${GRAPH_API}/act_${accountId}/insights?level=ad&fields=${fields}&time_range=${encodeURIComponent(timeRange)}&time_increment=1&access_token=${accessToken}&limit=500`

    const insights: AccountInsight[] = []

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
      // miniaturas são opcionais — segue sem elas
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

export interface MetaSyncResult {
  userId: string
  accounts: number
  imported: number
  errors: string[]
}

/** Usuários que têm token do Meta salvo. */
export async function usersWithMetaToken(): Promise<string[]> {
  const rows = await prisma.apiSetting.findMany({
    where: { setting_key: 'META_ACCESS_TOKEN' },
    select: { user_id: true },
  })
  return Array.from(new Set(rows.map(r => r.user_id)))
}

/**
 * Busca no Meta as métricas do usuário entre `since` e `until` (AAAA-MM-DD),
 * grava em campaign_metrics e apaga o que passou do prazo de retenção.
 * O token é lido e decifrado aqui, no servidor: nunca vai para o navegador.
 */
export async function syncMetaForUser(userId: string, since: string, until: string): Promise<MetaSyncResult> {
  const [tokenRow, accountsRow] = await Promise.all([
    prisma.apiSetting.findFirst({ where: { setting_key: 'META_ACCESS_TOKEN', user_id: userId }, select: { encrypted_value: true } }),
    prisma.apiSetting.findFirst({ where: { setting_key: 'META_AD_ACCOUNT_IDS', user_id: userId }, select: { encrypted_value: true } }),
  ])

  const accessToken = tokenRow ? decrypt(tokenRow.encrypted_value) : ''
  if (!accessToken) return { userId, accounts: 0, imported: 0, errors: ['Token do Meta não configurado ou inválido.'] }

  const adAccountIds = (accountsRow ? decrypt(accountsRow.encrypted_value) : '').split(',').map(s => s.trim()).filter(Boolean)
  if (adAccountIds.length === 0) return { userId, accounts: 0, imported: 0, errors: ['Nenhuma conta de anúncio configurada.'] }

  let imported = 0
  const errors: string[] = []

  // Contas em lotes de 3
  for (let i = 0; i < adAccountIds.length; i += 3) {
    const chunk = adAccountIds.slice(i, i + 3)
    const fetched = await Promise.all(chunk.map(id => fetchAccountInsights(id, accessToken, since, until)))

    const allInsights = fetched.flatMap(r => {
      if (r.error) { errors.push(r.error); return [] }
      return r.insights
    })
    if (allInsights.length === 0) continue

    const adIds = Array.from(new Set(allInsights.map(insight => insight.ad_id).filter(Boolean))) as string[]
    const thumbs = await fetchThumbnails(adIds, accessToken)

    // Uma linha por campanha + anúncio + dia (a última vence)
    const seen = new Map<string, AccountInsight>()
    for (const insight of allInsights) {
      seen.set(`${insight.campaign_name ?? ''}|${insight.ad_name ?? '-'}|${insight.date_start ?? ''}`, insight)
    }
    const rows = Array.from(seen.values())

    // Gravação em grupos de 10 em paralelo: um a um, um mês de anúncios levava minutos.
    for (let j = 0; j < rows.length; j += 10) {
      await Promise.all(rows.slice(j, j + 10).map(async insight => {
        const leads = extractLeads(insight)
        const spend = parseFloat(insight.spend ?? '0')
        const impressions = parseInt(insight.impressions ?? '0')
        const clicks = parseInt(insight.clicks ?? '0')
        const reach = parseInt(insight.reach ?? '0')
        const metrics = {
          spend, impressions, clicks, leads, reach,
          ctr: parseFloat(insight.ctr ?? '0'),
          cpc: parseFloat(insight.cpc ?? '0'),
          cpl: leads > 0 ? spend / leads : 0,
          cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
          frequency: parseFloat(insight.frequency ?? '0'),
          account_name: insight.account_name,
          ad_set_name: insight.adset_name ?? null,
          campaign_id: insight.campaign_id ?? null,
          thumbnail_url: insight.ad_id ? (thumbs.get(insight.ad_id) ?? null) : null,
          channel: 'meta',
        }
        const date = insight.date_start ? new Date(insight.date_start) : new Date(since)
        const adName = insight.ad_name ?? '-'
        const campaignName = insight.campaign_name ?? ''

        try {
          await prisma.campaignMetric.upsert({
            where: { user_id_campaign_name_ad_name_date: { user_id: userId, campaign_name: campaignName, ad_name: adName, date } },
            update: metrics,
            create: { user_id: userId, campaign_name: campaignName, ad_name: adName, date, ...metrics },
          })
          imported++
        } catch (err: any) {
          errors.push(`${campaignName}/${adName}: ${err.message}`)
        }
      }))
    }
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - META_RETENTION_DAYS)
  await prisma.campaignMetric.deleteMany({ where: { user_id: userId, date: { lt: cutoff } } }).catch(() => null)

  return { userId, accounts: adAccountIds.length, imported, errors }
}
