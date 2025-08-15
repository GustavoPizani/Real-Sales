export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "agent" | "manager"
  avatar?: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  status: "lead" | "prospect" | "client" | "inactive"
  source: string
  assigned_to: string
  created_at: string
  updated_at: string
  notes?: string
  tags?: string[]
}

export interface Property {
  id: string
  name: string
  type: "apartment" | "house" | "commercial" | "land"
  status: "available" | "sold" | "reserved" | "construction"
  price: number
  location: string
  description: string
  features: string[]
  images: string[]
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  assigned_to: string
  client_id?: string
  property_id?: string
  due_date: string
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  source: string
  status: "new" | "contacted" | "qualified" | "converted" | "lost"
  interest: string
  budget?: number
  notes?: string
  assigned_to?: string
  created_at: string
  updated_at: string
}

export interface LostReason {
  id: string
  reason: string
  active: boolean
  created_at: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Constants
export const FUNNEL_STAGES = ["Contato", "Diagnóstico", "Agendado", "Visitado", "Proposta", "Contrato"] as const

export const PROPERTY_TYPES = ["Apartamento", "Casa", "Cobertura", "Terreno", "Comercial"] as const

export const PROPERTY_STATUS = ["Disponível", "Reservado", "Vendido"] as const

export const USER_ROLES = ["admin", "diretor", "gerente", "corretor"] as const

export const USER_ROLE_LABELS = {
  admin: "Administrador",
  diretor: "Diretor",
  gerente: "Gerente",
  corretor: "Corretor",
} as const

export const TASK_TYPES = ["call", "visit", "follow_up", "meeting", "other"] as const

export const TASK_TYPE_LABELS = {
  call: "Ligação",
  visit: "Visita",
  follow_up: "Follow-up",
  meeting: "Reunião",
  other: "Outro",
} as const

export const TASK_PRIORITIES = ["low", "medium", "high"] as const

export const TASK_PRIORITY_LABELS = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
} as const

export const DEFAULT_LOST_REASONS = [
  "Preço muito alto",
  "Não gostou do imóvel",
  "Mudou de ideia",
  "Comprou com outro corretor",
  "Não conseguiu financiamento",
  "Problemas pessoais",
  "Localização não atende",
  "Outro",
] as const
