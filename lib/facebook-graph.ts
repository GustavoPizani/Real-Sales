const GRAPH_API = 'https://graph.facebook.com/v21.0'

export async function graphGet<T = any>(
  path: string,
  token: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${GRAPH_API}${path}`)
  url.searchParams.set('access_token', token)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Graph API error on ${path}`)
  }
  return res.json()
}

export async function getLongLivedToken(shortToken: string): Promise<string> {
  const url = new URL(`${GRAPH_API}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', process.env.FACEBOOK_APP_ID!)
  url.searchParams.set('client_secret', process.env.FACEBOOK_APP_SECRET!)
  url.searchParams.set('fb_exchange_token', shortToken)
  const res = await fetch(url.toString())
  const json = await res.json()
  if (!json.access_token) throw new Error('Failed to get long-lived token')
  return json.access_token
}

export interface FbPage {
  id: string
  name: string
  access_token: string
}

export interface FbForm {
  id: string
  name: string
  status: string
}

export interface FbLeadField {
  name: string
  values: string[]
}

export interface FbLead {
  id: string
  created_time: string
  field_data: FbLeadField[]
}

export function extractLeadFields(lead: FbLead) {
  const get = (key: string) =>
    lead.field_data.find(f => f.name === key)?.values[0] ?? null
  return {
    fullName:
      get('full_name') ?? get('name') ?? get('first_name') ?? 'Lead Facebook',
    email: get('email'),
    phone: get('phone_number') ?? get('phone') ?? get('whatsapp_number'),
  }
}
