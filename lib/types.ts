// lib/types.ts
import { Role, PropertyStatus, ClientOverallStatus, TaskType, Priority } from '@prisma/client';

// --- DATA INTERFACES (Updated and aligned with the new schema) ---

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  supervisorId?: string | null;
  supervisor?: User | null;
  createdAt: string;
}

export interface Tag {
    id: string;
    name: string;
    color: string;
}

export interface ClientDocument {
    id: string;
    url: string;
    name: string;
    type?: string | null;
    createdAt: string;
}

export interface Note {
  id: string;
  clientId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface ClientWonDetails {
  id: string;
  clientId: string;
  saleValue: number;
  saleDate: string;
  createdAt: string;
}

export interface PropertyType {
  id: string;
  name: string;
  value: number;
  areaSqMeters?: number | null;
  bedrooms?: number | null;
  suites?: number | null;
  parkingSpaces?: number | null;
}

export interface PropertyImage {
    id: string;
    url: string;
}

export interface Property {
  id: string;
  title: string;
  features?: string[];
  address?: string | null;
  type?: string | null;
  status: PropertyStatus;
  bedrooms?: number | null;
  bathrooms?: number | null;
  price?: number | null;
  areaSqMeters?: number | null;
  images?: PropertyImage[];
  propertyTypes?: PropertyType[];
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  dateTime: string;
  isCompleted: boolean;
  tipo: TaskType;
  priority: Priority;
  clientId: string;
  client?: Client;
  userId: string;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;

  // --- Schema scalar fields ---
  accountId: string;
  createdById: string;
  brokerId: string;
  propertyOfInterestId?: string | null;
  funnelId: string;
  funnelStageId: string;
  overallStatus: ClientOverallStatus;

  // --- Relations included from API ---
  broker?: {
    id: string;
    name: string;
    email: string;
    role: Role; supervisor?: {
      id: string;
      name: string;
    } | null;
  } | null;

  propertyOfInterest?: (Property & { propertyTypes?: PropertyType[] }) | null;

  funnel: {
    name: string;
  };

  funnelStage: {
    name: string;
  };

  notes?: Note[];
  tasks?: Task[];
  tags?: Tag[];
  documents?: ClientDocument[];
  saleDetails?: ClientWonDetails | null;
}

export interface LostReason {
  id: string;
  reason: string;
  active: boolean;
  createdAt: string;
}

// --- CONSTANTES E ENUMS ---
export { Role, PropertyStatus, ClientOverallStatus, TaskType, Priority };

// Corrigindo o mapeamento de labels para os novos Enums
export const USER_ROLE_LABELS: Partial<Record<Role, string>> = {
  [Role.MARKETING_ADMIN]: "Marketing / Admin",
  [Role.DIRECTOR]: "Diretor",
  [Role.MANAGER]: "Gerente",
  [Role.BROKER]: "Corretor",
};