"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

// A interface do usuário
interface User {
  id: string
  name: string
  email: string
  role: "marketing_adm" | "diretor" | "gerente" | "corretor"
}

// A interface do que o nosso contexto de autenticação provê
interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// REMOVEMOS a lista de mockUsers daqui

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Esta parte verifica se o usuário já estava logado antes
    const token = localStorage.getItem("authToken")
    if (token) {
      // No futuro, você pode adicionar uma lógica para verificar se o token ainda é válido
      // Por enquanto, vamos buscar os dados do usuário do localStorage
      const savedUser = localStorage.getItem("user")
      if (savedUser) {
        setUser(JSON.parse(savedUser))
      }
    }
    setIsLoading(false)
  }, [])

  // --- FUNÇÃO DE LOGIN CORRIGIDA ---
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // 1. Faz a chamada para a nossa API de login real
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      // 2. Verifica se a API respondeu com sucesso
      if (!response.ok) {
        // Se a resposta não for OK (ex: status 401 ou 500), o login falhou
        return false
      }

      // 3. Se o login foi bem-sucedido, a API nos devolve os dados do usuário e um token
      const data = await response.json()

      if (data.success && data.user && data.token) {
        // 4. Salva os dados do usuário e o token para mantê-lo logado
        setUser(data.user)
        localStorage.setItem("user", JSON.stringify(data.user))
        localStorage.setItem("authToken", data.token) // Salva o token de autenticação
        return true
      }

      return false

    } catch (error) {
      console.error("Erro na função de login:", error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
    localStorage.removeItem("authToken") // Remove o token ao fazer logout
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
