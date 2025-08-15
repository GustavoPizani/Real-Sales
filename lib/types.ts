export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "diretor" | "gerente" | "corretor"
  avatar?: string
  manager_id?: string
  created_at: string
  updated_at?: string
}

export interface Client {
  id: string
  full_name: string
  phone?: string
  email?: string
  funnel_status: "Contato" | "Diagnóstico" | "Agendado" | "Visitado" | "Proposta" | "Contrato"
  notes?: string
  created_at: string
  updated_at: string
  user_id: string
  property_title?: string
  property_address?: string
  property_price?: number
  assigned_user?: User
  status?: "active" | "won" | "lost"
  won_details?: ClientWonDetails[]
  lost_reason?: string
  property_of_interest_id?: string
}

export interface Property {
  id: string
  title: string
  description?: string
  address?: string
  price?: number
  type: string
  status: "Disponível" | "Reservado" | "Vendido"
  created_at: string
  updated_at?: string
  user_id: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: "pending" | "completed"
  priority: "low" | "medium" | "high"
  due_date: string
  due_time: string
  type: "call" | "visit" | "follow_up" | "meeting" | "other"
  client_id?: string
  property_id?: string
  user_id: string
  client_name?: string
  property_title?: string
  created_at: string
  updated_at?: string
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

export interface ClientNote {
  id: string
  client_id: string
  user_id: string
  note: string
  created_at: string
  user_name: string
}

export interface ClientWonDetails {
  id: string
  client_id: string
  property_id: string
  property_title: string
  sale_value: number
  sale_date: string
  created_at: string
}

export interface CreateTaskData {
  title: string
  description?: string
  due_date: string
  due_time: string
  priority: "low" | "medium" | "high"
  type: "call" | "visit" | "follow_up" | "meeting" | "other"
  client_id?: string
  property_id?: string
  user_id: string
  client_name?: string
}

// Constants - todas exportadas
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
