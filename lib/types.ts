// lib/types.ts

import { Role, PropertyStatus, ClientOverallStatus } from '@prisma/client';

// --- INTERFACES DE DADOS (ALINHADAS COM O NOVO SCHEMA) ---

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  superiorId?: string | null;
  manager?: User | null;
  createdAt: string;
}

export interface Client {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  currentFunnelStage: string;
  overallStatus: ClientOverallStatus;
  notes?: Note[];
  createdAt: string;
  updatedAt: string;
  brokerId: string;
  propertyOfInterestId?: string | null;
  propertyOfInterest?: Property | null;
  broker?: User | null;
  saleDetails?: ClientWonDetails[];
}

export interface ClientWonDetails {
  id: string;
  clientId: string;
  saleValue: number;
  saleDate: string;
  createdAt: string;
}

export interface Note {
  id: string;
  clientId: string;
  createdBy: string;
  content: string;
  createdAt: string;
}

export interface PropertyTypology {
  id: string;
  name: string;
  price: number;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking_spaces?: number | null;
  description?: string | null;
  available_units?: number | null;
}

export interface Property {
  id: string;
  title: string;
  description?: string | null;
  address?: string | null;
  type?: string | null;
  status: PropertyStatus;
  bedrooms?: number | null;
  bathrooms?: number | null;
  price?: number | null;
  area?: number | null;
  features?: string[];
  images?: string[];
  typologies?: PropertyTypology[];
  developer?: {
    name: string;
    partnership_manager: string;
    phone?: string;
    email?: string;
  };
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  isCompleted: boolean;
  clientId: string;
  client?: Client;
  userId: string;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface LostReason {
  id: string;
  reason: string;
  active: boolean;
  createdAt: string;
}

// --- INTERFACES DE FORMULÁRIO/API ---

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateClientData {
  fullName: string;
  phone?: string;
  email?: string;
  currentFunnelStage?: string;
  notes?: string;
  propertyOfInterestId?: string;
  brokerId?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: Role;
  superiorId?: string;
}

export interface CreatePropertyData {
  title: string;
  description?: string;
  address?: string;
  price?: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  type: string;
  status?: PropertyStatus;
  features?: string[];
}

export interface CreateTaskData {
  title: string;
  description?: string;
  dueDate: string;
  isCompleted: boolean;
  clientId?: string;
  userId?: string;
}


// --- CONSTANTES E ENUMS ---

export { Role, PropertyStatus, ClientOverallStatus };

export const USER_ROLE_LABELS: Record<Role, string> = {
  [Role.marketing_adm]: "Administrador de Marketing",
  [Role.diretor]: "Diretor",
  [Role.gerente]: "Gerente",
  [Role.corretor]: "Corretor",
};

export const TASK_TYPES = ["call", "visit", "follow_up", "meeting", "other"] as const;

export const TASK_TYPE_LABELS = {
  call: "Ligação",
  visit: "Visita",
  follow_up: "Follow-up",
  meeting: "Reunião",
  other: "Outro",
} as const;

// --- PERMISSÕES E HIERARQUIA ---

export const ROLE_HIERARCHY = {
  [Role.marketing_adm]: 4,
  [Role.diretor]: 3,
  [Role.gerente]: 2,
  [Role.corretor]: 1,
} as const;

export const ROLE_PERMISSIONS = {
  [Role.marketing_adm]: {
    canViewAllClients: true,
    canManageUsers: true,
    canViewReports: true,
    canManageSettings: true,
  },
  [Role.diretor]: {
    canViewAllClients: true,
    canManageUsers: false,
    canViewReports: true,
    canManageSettings: false,
  },
  [Role.gerente]: {
    canViewAllClients: false, // Apenas seus corretores
    canManageUsers: false,
    canViewReports: true,
    canManageSettings: false,
  },
  [Role.corretor]: {
    canViewAllClients: false, // Apenas seus próprios
    canManageUsers: false,
    canViewReports: false,
    canManageSettings: false,
  },
} as const;
