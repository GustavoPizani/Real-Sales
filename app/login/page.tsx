"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, isLoading: isAuthLoading, login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Sessão já ativa — pula a tela de login e vai direto pro dashboard
  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha o e-mail e a senha.');
      setIsLoading(false);
      return;
    }

    try {
      const success = await login(email.trim(), password);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('E-mail ou senha incorretos. Verifique suas credenciais.');
      }
    } catch {
      setError('Erro inesperado. Tente novamente em instantes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-[#D9B779]/6 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#171C26]/40 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row w-full">

        {/* BRANDING */}
        <div className="flex lg:w-1/2 flex-col justify-center px-8 lg:px-24 py-16 lg:py-0">
          <div className="mb-10">
            <div className="flex flex-col gap-2">
              <img
                src="/nordic-logo.svg"
                alt="Nordic CRM"
                className="h-20 w-auto object-contain self-start"
              />
              <h1 className="text-5xl lg:text-6xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
                Nordic
              </h1>
              <div className="h-1.5 w-20 rounded-full" style={{ background: 'var(--accent-primary)' }} />
            </div>
          </div>

          <p className="text-2xl max-w-md leading-relaxed font-light" style={{ color: 'var(--text-secondary)' }}>
            O ecossistema definitivo para <span className="font-medium" style={{ color: 'var(--text-primary)' }}>corretores de elite</span>.
            Transforme leads em contratos com inteligência.
          </p>
        </div>

        {/* FORM */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-20 py-12">
          <div className="glass-card w-full max-w-md space-y-8 p-8 lg:p-10">

            <div className="text-left space-y-2">
              <h2 className="text-4xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>Acessar conta</h2>
              <p style={{ color: 'var(--text-muted)' }}>
                Insira suas credenciais para entrar no CRM
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-12 transition-all outline-none"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 transition-all pr-12 outline-none"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.35)', color: '#E05252' }}>
                  <span className="shrink-0">!</span>
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full font-semibold h-13 text-lg transition-all active:scale-[0.98]"
                style={{
                  background: 'var(--accent-primary)',
                  color: '#07090D',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-glow)',
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Validando...</span>
                  </div>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                  <input type="checkbox" className="rounded" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }} />
                  Lembrar acesso
                </label>
                <a href="#" className="font-medium transition-colors" style={{ color: 'var(--accent-primary)' }}>
                  Esqueceu a senha?
                </a>
              </div>

              <div className="pt-8">
                <div className="p-5 rounded-2xl flex items-start gap-3" style={{ background: 'var(--accent-glow)', border: '1px solid var(--border-accent)' }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--accent-primary)' }} />
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-bold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>Suporte:</span><br />
                    Caso não tenha suas credenciais, solicite ao seu gestor imediato.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
