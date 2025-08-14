export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'diretor' | 'gerente' | 'corretor';
  manager_id?: string;
  created_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  funnel_status: 'Contato' | 'Diagnóstico' | 'Agendado' | 'Visitado' | 'Proposta' | 'Contrato' | 'Ganho' | 'Perdido';
  notes?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  property_of_interest_id?: string;
  property_of_interest?: Property;
  property_title?: string;
  property_address?: string;
  property_price?: number;
  assigned_user?: User;
  status?: 'active' | 'won' | 'lost';
  lost_reason?: string;
  won_details?: ClientWonDetails[];
}

export interface ClientWonDetails {
  id: string;
  client_id: string;
  property_id: string;
  property_title: string;
  sale_value: number;
  sale_date: string;
  created_at: string;
}

export interface ClientNote {
  id: string;
  client_id: string;
  user_id: string;
  note: string;
  created_at: string;
  user_name: string;
}

export interface Property {
  id: string;
  title: string;
  description?: string;
  address?: string;
  price?: number;
  type: string;
  status: 'Disponível' | 'Reservado' | 'Vendido';
  created_at: string;
  user_id: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  due_time: string;
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  type: 'call' | 'visit' | 'follow_up' | 'meeting' | 'other';
  client_id?: string;
  client_name?: string;
  property_id?: string;
  property_title?: string;
  user_id: string;
  assigned_user?: User;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface LostReason {
  id: string;
  reason: string;
  active: boolean;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateClientData {
  full_name: string;
  phone?: string;
  email?: string;
  funnel_status?: string;
  notes?: string;
  property_of_interest_id?: string;
  user_id?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'diretor' | 'gerente' | 'corretor';
  manager_id?: string;
}

export interface CreatePropertyData {
  title: string;
  description?: string;
  address?: string;
  price?: number;
  type: string;
  status?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  due_date: string;
  due_time: string;
  priority: 'low' | 'medium' | 'high';
  type: 'call' | 'visit' | 'follow_up' | 'meeting' | 'other';
  client_id?: string;
  property_id?: string;
  user_id?: string;
}

export const FUNNEL_STAGES = [
  'Contato',
  'Diagnóstico', 
  'Agendado',
  'Visitado',
  'Proposta',
  'Contrato'
] as const;

export const PROPERTY_TYPES = [
  'Apartamento',
  'Casa',
  'Cobertura',
  'Terreno',
  'Comercial'
] as const;

export const PROPERTY_STATUS = [
  'Disponível',
  'Reservado', 
  'Vendido'
] as const;

export const USER_ROLES = [
  'admin',
  'diretor',
  'gerente',
  'corretor'
] as const;

export const USER_ROLE_LABELS = {
  admin: 'Administrador',
  diretor: 'Diretor',
  gerente: 'Gerente',
  corretor: 'Corretor'
} as const;

export const TASK_TYPES = [
  'call',
  'visit',
  'follow_up',
  'meeting',
  'other'
] as const;

export const TASK_TYPE_LABELS = {
  call: 'Ligação',
  visit: 'Visita',
  follow_up: 'Follow-up',
  meeting: 'Reunião',
  other: 'Outro'
} as const;

export const TASK_PRIORITIES = [
  'low',
  'medium',
  'high'
] as const;

export const TASK_PRIORITY_LABELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta'
} as const;

export const DEFAULT_LOST_REASONS = [
  'Preço muito alto',
  'Não gostou do imóvel',
  'Mudou de ideia',
  'Comprou com outro corretor',
  'Não conseguiu financiamento',
  'Problemas pessoais',
  'Localização não atende',
  'Outro'
] as const;
