export interface User {
  id: string
  name: string
  email: string
  role: "marketing_adm" | "diretor" | "gerente" | "corretor"
  manager_id?: string
  manager?: User
  created_at: string
}

export interface Client {
  id: string
  full_name: string
  phone?: string
  email?: string
  funnel_status: "Contato" | "Diagnóstico" | "Agendado" | "Visitado" | "Proposta" | "Contrato" | "Ganho" | "Perdido"
  notes?: string
  created_at: string
  updated_at: string
  user_id: string
  property_of_interest_id?: string
  property_of_interest?: Property
  property_title?: string
  property_address?: string
  property_price?: number
  assigned_user?: User
  status?: "active" | "won" | "lost"
  lost_reason?: string
  won_details?: ClientWonDetails[]
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

export interface ClientNote {
  id: string
  client_id: string
  user_id: string
  note: string
  created_at: string
  user_name: string
}

export interface PropertyTypology {
  id: string
  name: string // Ex: "Apartamento 2 quartos", "Apartamento 3 quartos"
  price: number
  area?: number
  bedrooms?: number
  bathrooms?: number
  parking_spaces?: number
  description?: string
  available_units?: number
}

export interface Property {
  id: string
  title: string
  description?: string
  address?: string
  type: string
  status: "Disponível" | "Reservado" | "Vendido"
  features?: string[]
  images?: string[]
  typologies?: PropertyTypology[] // Múltiplas tipologias
  developer?: PropertyDeveloper // Mudança de owner para developer
  created_at: string
  user_id: string
}

export interface PropertyDeveloper {
  name: string // Nome da construtora
  partnership_manager: string // Gerente de parcerias responsável
  phone?: string
  email?: string
}

export interface Task {
  id: string
  title: string
  description?: string
  due_date: string
  due_time: string
  status: "pending" | "completed" | "cancelled"
  priority: "low" | "medium" | "high"
  type: "call" | "visit" | "follow_up" | "meeting" | "other"
  client_id?: string
  client_name?: string
  property_id?: string
  property_title?: string
  user_id: string
  assigned_user?: User
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface LostReason {
  id: string
  reason: string
  active: boolean
  created_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface CreateClientData {
  full_name: string
  phone?: string
  email?: string
  funnel_status?: string
  notes?: string
  property_of_interest_id?: string
  user_id?: string
}

export interface CreateUserData {
  name: string
  email: string
  password: string
  role: "marketing_adm" | "diretor" | "gerente" | "corretor"
  manager_id?: string
}

export interface CreatePropertyData {
  title: string
  description?: string
  address?: string
  price?: number
  area?: number
  bedrooms?: number
  bathrooms?: number
  parking_spaces?: number
  type: string
  status?: string
  features?: string[]
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
  user_id?: string
}

export const FUNNEL_STAGES = ["Contato", "Diagnóstico", "Agendado", "Visitado", "Proposta", "Contrato"] as const

export const PROPERTY_TYPES = ["Apartamento", "Casa", "Cobertura", "Terreno", "Comercial"] as const

export const PROPERTY_STATUS = ["Disponível", "Reservado", "Vendido"] as const

export const USER_ROLES = ["marketing_adm", "diretor", "gerente", "corretor"] as const

export const USER_ROLE_LABELS = {
  marketing_adm: "Administrador de Marketing",
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

// Hierarquia de permissões
export const ROLE_HIERARCHY = {
  marketing_adm: 4,
  diretor: 3,
  gerente: 2,
  corretor: 1,
} as const

export const ROLE_PERMISSIONS = {
  marketing_adm: {
    canViewAllClients: true,
    canManageUsers: true,
    canViewReports: true,
    canManageSettings: true,
    canViewOwnerData: true,
  },
  diretor: {
    canViewAllClients: true,
    canManageUsers: false,
    canViewReports: true,
    canManageSettings: false,
    canViewOwnerData: true,
  },
  gerente: {
    canViewAllClients: false, // Apenas seus corretores
    canManageUsers: false,
    canViewReports: true,
    canManageSettings: false,
    canViewOwnerData: true,
  },
  corretor: {
    canViewAllClients: false, // Apenas seus próprios
    canManageUsers: false,
    canViewReports: false,
    canManageSettings: false,
    canViewOwnerData: false,
  },
} as const
