"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/use-toast';

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    } else if (!isAuthLoading && user && !user.mustChangePassword) {
      router.replace('/dashboard');
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || !user || !user.mustChangePassword) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07090D' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#D9B779' }} />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao alterar a senha.');
        return;
      }

      toast({ title: 'Senha atualizada com sucesso!' });
      window.location.href = '/dashboard';
    } catch {
      setError('Erro inesperado. Tente novamente em instantes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#07090D', color: '#EDE9E0' }}>
      <div className="glass-card w-full max-w-md space-y-8 p-8 lg:p-10">
        <div className="text-left space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight" style={{ color: '#EDE9E0', letterSpacing: '-0.025em' }}>
            Defina sua nova senha
          </h2>
          <p style={{ color: '#3A3F4D' }}>
            Como este é o seu primeiro acesso com a senha temporária, por segurança você precisa criar uma nova senha antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium" style={{ color: '#70778C' }}>Nova senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 transition-all pr-12 outline-none"
                style={{
                  background: '#171C26',
                  border: '1px solid rgba(112, 119, 140, 0.15)',
                  borderRadius: '5px',
                  color: '#EDE9E0',
                }}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#3A3F4D' }}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium" style={{ color: '#70778C' }}>Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 transition-all outline-none"
              style={{
                background: '#171C26',
                border: '1px solid rgba(112, 119, 140, 0.15)',
                borderRadius: '5px',
                color: '#EDE9E0',
              }}
              required
              minLength={6}
            />
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
              background: '#D9B779',
              color: '#07090D',
              borderRadius: '5px',
              boxShadow: '0 0 20px rgba(217, 183, 121, 0.12)',
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Salvando...</span>
              </div>
            ) : (
              'Salvar nova senha e entrar'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
