// contexts/auth-context.tsx
"use client";

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback, Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { type UserPayload } from "@/lib/auth";

interface AuthContextType {
  user: UserPayload | null;
  setUser: Dispatch<SetStateAction<UserPayload | null>>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const verifyUser = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
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
    router.push('/login');
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