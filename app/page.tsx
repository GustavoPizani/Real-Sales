import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogIn, Target, BarChart2, Briefcase } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen text-white relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* Background glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-[#D9B779]/5 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#171C26]/40 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 lg:px-6 h-16 flex items-center justify-center border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <Link href="/" className="flex items-center gap-3">
          <img src="/nordic-logo.svg" alt="Nordic CRM" className="w-8 h-8" />
          <span className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Nordic CRM</span>
        </Link>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 justify-center items-center">
        <section className="py-16 md:py-24 w-full">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-8 text-center">
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
                  O CRM definitivo para o{' '}
                  <span style={{ color: 'var(--accent-primary)' }}>mercado imobiliário</span>
                </h1>
                <div className="h-1 w-24 rounded-full mx-auto" style={{ background: 'var(--accent-primary)' }} />
              </div>
              <p className="mx-auto max-w-[700px] md:text-xl font-light leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Organize seus leads, gerencie seu pipeline de vendas e feche mais negócios com uma ferramenta pensada para{' '}
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>corretores de elite</span>.
              </p>
              <Link href="/login">
                <Button
                  size="lg"
                  className="font-semibold px-10 py-6 text-lg transition-all active:scale-[0.98]"
                  style={{
                    background: 'var(--accent-primary)',
                    color: '#07090D',
                    boxShadow: 'var(--shadow-glow)',
                    borderRadius: 'var(--radius-sm)',
                  }}
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
      <section className="relative z-10 w-full py-16 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
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
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: 'var(--accent-glow)', border: '1px solid var(--border-accent)' }}
                >
                  <Icon className="h-7 w-7" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 flex py-6 items-center justify-center border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>&copy; {new Date().getFullYear()} Nordic CRM. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
