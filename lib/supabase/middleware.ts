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

  // Único ponto que valida o JWT contra o Supabase Auth (round-trip de rede).
  // Isso também refresca a sessão automaticamente quando necessário.
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    requestHeaders.set(TRUSTED_USER_HEADER, user.id)
  }

  const supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
  cookiesToForward.forEach(({ name, value, options }) => {
    supabaseResponse.cookies.set(name, value, options)
  })

  return supabaseResponse
}