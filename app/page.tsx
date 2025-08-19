// app/page.tsx

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogIn, Target, BarChart2 } from 'lucide-react'

// Esta agora é uma Server Component, o que é ótimo para performance!
export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center shadow-sm bg-white">
        <Link href="/" className="flex items-center justify-center">
          <div className="w-8 h-8 bg-primary-custom rounded-lg flex items-center justify-center mr-2">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <span className="text-xl font-bold text-primary-custom">Real Sales CRM</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            href="/login"
            className="text-sm font-medium hover:underline underline-offset-4 text-gray-600"
          >
            Preços
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium hover:underline underline-offset-4 text-gray-600"
          >
            Contato
          </Link>
        </nav>
      </header>

      {/* Seção Principal (Hero) */}
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-br from-primary-custom to-tertiary-custom text-white">
          <div className="container px-4 md:px-6 text-center">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                O CRM definitivo para o mercado imobiliário
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-200 md:text-xl">
                Organize seus leads, gerencie seu pipeline de vendas e feche mais negócios com uma ferramenta pensada para corretores de alta performance.
              </p>
              <div className="space-x-4">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="bg-white text-primary-custom hover:bg-gray-200 shadow-lg"
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    Acessar o CRM
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Seção de Funcionalidades */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 items-center lg:grid
