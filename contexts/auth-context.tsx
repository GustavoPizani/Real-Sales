// contexts/auth-context.tsx

"use client";

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback, Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { type User } from "@/lib/types"; // Importa o tipo User do nosso ficheiro central

// A interface do que o nosso contexto de autenticação provê
interface AuthContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>; // Necessário para atualizar o perfil
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Função para verificar o token e buscar os dados do utilizador
  const verifyUser = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        // Usa a nossa rota de API refatorada
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
          }
        } else {
          // Se o token for inválido, limpa o localStorage
          localStorage.removeItem("authToken");
          setUser(null);
        }
      } catch (error) {
        console.error("Falha ao verificar o token:", error);
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    verifyUser();
  }, [verifyUser]);

  // Função de login (já estava correta)
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) return false;

      const data = await response.json();

      if (data.success && data.user && data.token) {
        setUser(data.user);
        localStorage.setItem("authToken", data.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro na função de login:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("authToken");
    router.push('/login'); // Redireciona para o login após o logout
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
