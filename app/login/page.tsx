"use client";

import React, { useState } from 'react';
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
  
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!email.trim() || !password.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const success = await login(email.trim(), password);
      
      if (success) {
        toast({
          title: 'Bem-vindo!',
          description: 'Login realizado com sucesso.',
        });
        router.push('/dashboard');
      } else {
        toast({
          title: 'Erro no login',
          description: 'E-mail ou senha incorretos.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col lg:flex-row relative overflow-hidden text-white">
      
      {/* Background Gradients (Tons de Azul e Slate) */}
      <div className="absolute inset-0 z-0">
        {/* Glow principal azul no topo esquerdo */}
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-blue-600/15 blur-[140px] rounded-full" />
        {/* Glow secundário no fundo direito */}
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-slate-800/20 blur-[100px] rounded-full" />
        {/* Textura sutil de malha/carbono */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row w-full">
        
        {/* LADO ESQUERDO - BRANDING */}
        <div className="flex lg:w-1/2 flex-col justify-center px-8 lg:px-24 py-16 lg:py-0">
          <div className="mb-10">
            <div className="flex flex-col gap-2">
              <img 
                src="/logo.png" 
                alt="Real Sales" 
                className="h-20 w-auto object-contain self-start brightness-0 invert" 
              />
              <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-white uppercase italic italic">
                Real Sales
              </h1>
              <div className="h-1.5 w-20 bg-blue-600 rounded-full" />
            </div>
          </div>
          
          <p className="text-2xl text-slate-400 max-w-md leading-relaxed font-light">
            O ecossistema definitivo para <span className="text-white font-medium">corretores de elite</span>. 
            Transforme leads em contratos com inteligência.
          </p>
        </div>

        {/* LADO DIREITO - FORMULÁRIO GLASSMORPHISM */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-20 py-12">
          <div className="glass-card w-full max-w-md space-y-8 p-8 lg:p-10">
            
            <div className="text-left space-y-2">
              <h2 className="text-4xl font-bold text-white tracking-tight">Acessar conta</h2>
              <p className="text-slate-500">
                Insira suas credenciais para entrar no CRM
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pizanicorretor@gmail.com"
                  className="h-12 bg-white/[0.03] border-white/10 text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password text-slate-300">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 bg-white/[0.03] border-white/10 text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-blue-500/20 transition-all pr-12 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-13 text-lg transition-all shadow-[0_0_25px_rgba(37,99,235,0.2)] active:scale-[0.98]"
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
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input type="checkbox" className="rounded border-white/10 bg-white/5 text-blue-600 focus:ring-0" />
                  Lembrar acesso
                </label>
                <a href="#" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
                  Esqueceu a senha?
                </a>
              </div>

              <div className="pt-8">
                <div className="p-5 bg-blue-600/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-blue-400 font-bold uppercase tracking-wider">Suporte:</span><br /> 
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