"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  name: string
  email: string
  role: "marketing_adm" | "diretor" | "gerente" | "corretor"
  created_at: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock users para teste
const mockUsers: User[] = [
  {
    id: "1",
    name: "Admin Sistema",
    email: "admin@realsales.com",
    role: "marketing_adm",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "João Diretor",
    email: "diretor@realsales.com",
    role: "diretor",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    name: "Maria Gerente",
    email: "gerente@realsales.com",
    role: "gerente",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "4",
    name: "Ana Oliveira",
    email: "ana@realsales.com",
    role: "corretor",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "5",
    name: "Carlos Ferreira",
    email: "carlos@realsales.com",
    role: "corretor",
    created_at: "2024-01-01T00:00:00Z",
  },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar se há usuário logado no localStorage
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simular delay de API
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Encontrar usuário pelo email
    const foundUser = mockUsers.find((u) => u.email === email)

    if (foundUser) {
      setUser(foundUser)
      localStorage.setItem("user", JSON.stringify(foundUser))
      return true
    }

    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
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
