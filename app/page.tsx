// app/page.tsx - VERSÃO CORRIGIDA E COMPLETA

import React from 'react' // <--- LINHA ADICIONADA PARA CORRIGIR O ERRO
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogIn, Target, BarChart2, Briefcase } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header Simplificado */}
      <header className="px-4 lg:px-6 h-16 flex items-center shadow-sm">
        <Link href="/" className="flex items-center justify-center">
          <div className="w-8 h-8 bg-primary-custom rounded-lg flex items-center justify-center mr-2">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <span className="text-xl font-bold text-primary-custom">Real Sales CRM</span>
        </Link>
        {/* Links removidos da navegação */}
      </header>

      {/* Seção Principal (Hero) - CENTRALIZAÇÃO OTIMIZADA */}
      <main className="flex-1 flex justify-center items-center">
        <section className="w-full py-20 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-8 text-center"> {/* Espaçamento maior */}
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-gray-900">
                O CRM definitivo para o mercado imobiliário
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-600 md:text-xl">
                Organize seus leads, gerencie seu pipeline de vendas e feche mais negócios com uma ferramenta pensada para corretores de alta performance.
              </p>
              <div>
                <Link href="/login">
                  <Button
                    size="lg"
                    className="bg-primary-custom text-white hover:bg-primary-custom/90 shadow-lg px-10 py-7 text-lg" 
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    Acessar o CRM
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Seção de Funcionalidades (Movida para fora da <main> para melhor estrutura) */}
      <section className="w-full pb-12 md:pb-24 lg:pb-32 bg-gray-50 border-t">
        <div className="container px-4 md:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12 pt-12">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-custom/10">
                <Target className="h-8 w-8 text-primary-custom" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Pipeline Inteligente</h3>
              <p className="mt-2 text-gray-600">
                Visualize seu processo de vendas com um funil kanban intuitivo.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-custom/10">
                <BarChart2 className="h-8 w-8 text-primary-custom" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Dashboards Completos</h3>
              <p className="mt-2 text-gray-600">
                Acompanhe suas métricas de vendas e performance em tempo real.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-custom/10">
                <Briefcase className="h-8 w-8 text-primary-custom" />
              </div>
               <h3 className="text-xl font-bold text-gray-900">Integração de Leads</h3>
              <p className="mt-2 text-gray-600">
                Receba leads do seu site e do Facebook Ads diretamente no seu funil.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Simplificado */}
      <footer className="flex py-6 w-full shrink-0 items-center justify-center px-4 md:px-6 border-t bg-white">
        <p className="text-xs text-gray-600">© {new Date().getFullYear()} Real Sales CRM. Todos os direitos reservados.</p>
        {/* Links de privacidade e termos removidos */}
      </footer>
    </div>
  )
}
