import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Header interno usado para repassar o resultado da validação de sessão às
// rotas, evitando que cada API route precise revalidar o JWT contra o
// Supabase Auth de novo (ver lib/auth.ts). NUNCA deve ser lido fora de rotas
// cobertas pelo matcher deste middleware (config.matcher abaixo) — só é
// confiável porque é sempre apagado do request original e só reescrito aqui,
// depois de validado.
const TRUSTED_USER_HEADER = 'x-mw-user-id'

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete(TRUSTED_USER_HEADER)

  let cookiesToForward: { name: string; value: string; options: any }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToForward = cookiesToSet
        },
      },
    }
  )

  // Caminho rápido: verifica a assinatura do JWT localmente contra o JWKS do
  // projeto (cacheado), sem round-trip de rede — só funciona porque o projeto
  // usa uma chave de assinatura assimétrica (ECC), confirmado em
  // Project Settings > API > JWT Keys. Se o token estiver expirado (ou em
  // qualquer outro caso em que a verificação local não resolva), cai pro
  // getUser(), que bate no Supabase Auth e sabe renovar a sessão via
  // refresh token (atualizando os cookies pelo bridge acima).
  const { data: claimsData } = await supabase.auth.getClaims()
  let userId = claimsData?.claims.sub ?? null

  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  }

  if (userId) {
    requestHeaders.set(TRUSTED_USER_HEADER, userId)
  }

  const supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
  cookiesToForward.forEach(({ name, value, options }) => {
    supabaseResponse.cookies.set(name, value, options)
  })

  return supabaseResponse
}