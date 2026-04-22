import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogIn, Target, BarChart2, Briefcase } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-white relative overflow-hidden">

      {/* Background glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-slate-800/20 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 lg:px-6 h-16 flex items-center justify-center border-b border-white/5">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Real Sales" className="w-8 h-8 brightness-0 invert" />
          <span className="text-xl font-bold text-white">Real Sales CRM</span>
        </Link>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 justify-center items-center">
        <section className="py-16 md:py-24 w-full">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-8 text-center">
              <div className="space-y-4">
                <h1 className="text-4xl font-black tracking-tighter sm:text-5xl md:text-6xl uppercase italic">
                  O CRM definitivo para o{' '}
                  <span className="text-[#D6B585]">mercado imobiliário</span>
                </h1>
                <div className="h-1 w-24 bg-[#D6B585] rounded-full mx-auto" />
              </div>
              <p className="mx-auto max-w-[700px] text-slate-400 md:text-xl font-light leading-relaxed">
                Organize seus leads, gerencie seu pipeline de vendas e feche mais negócios com uma ferramenta pensada para{' '}
                <span className="text-white font-medium">corretores de elite</span>.
              </p>
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-10 py-6 text-lg shadow-[0_0_30px_rgba(37,99,235,0.25)] transition-all active:scale-[0.98]"
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  Acessar o CRM
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Features */}
      <section className="relative z-10 w-full py-16 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {[
              {
                icon: Target,
                title: 'Pipeline Inteligente',
                desc: 'Visualize seu processo de vendas com um funil kanban intuitivo.',
              },
              {
                icon: BarChart2,
                title: 'Dashboards Completos',
                desc: 'Acompanhe suas métricas de vendas e performance em tempo real.',
              },
              {
                icon: Briefcase,
                title: 'Integração de Leads',
                desc: 'Receba leads do seu site e do Facebook Ads diretamente no seu funil.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-card flex flex-col items-center text-center p-8 gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D6B585]/10 border border-[#D6B585]/20">
                  <Icon className="h-7 w-7 text-[#D6B585]" />
                </div>
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 flex py-6 items-center justify-center border-t border-white/5">
        <p className="text-xs text-slate-600">© {new Date().getFullYear()} Real Sales CRM. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
