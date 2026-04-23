"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

function OAuthHandler() {
  const searchParams = useSearchParams()
  const [done, setDone] = useState(false)
  const success = searchParams.get("status") === "success"

  useEffect(() => {
    // Envia a mensagem para a janela pai
    if (window.opener) {
      try {
        window.opener.postMessage(
          { type: "fb_oauth_done", success },
          window.location.origin
        )
      } catch {}
    }

    // Tenta fechar o popup
    const tryClose = () => {
      try { window.close() } catch {}
    }

    tryClose()

    // Se não fechou após 800ms, mostra o botão manual
    const timer = setTimeout(() => {
      setDone(true)
      tryClose() // tenta de novo
    }, 800)

    return () => clearTimeout(timer)
  }, [success])

  if (!done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-secondary-custom" />
        <p className="text-muted-foreground text-sm">Finalizando conexão...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-5 px-6 text-center">
      {success ? (
        <>
          <CheckCircle2 className="h-14 w-14 text-green-500" />
          <h2 className="text-xl font-bold text-foreground">Facebook conectado!</h2>
          <p className="text-muted-foreground text-sm">
            Pode fechar esta janela e voltar para o CRM.
          </p>
        </>
      ) : (
        <>
          <X className="h-14 w-14 text-destructive" />
          <h2 className="text-xl font-bold text-foreground">Erro na conexão</h2>
          <p className="text-muted-foreground text-sm">
            Não foi possível conectar ao Facebook. Feche esta janela e tente novamente.
          </p>
        </>
      )}
      <Button onClick={() => window.close()} className="mt-2">
        Fechar esta janela
      </Button>
    </div>
  )
}

export default function FacebookOAuthPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary-custom" />
      </div>
    }>
      <OAuthHandler />
    </Suspense>
  )
}
