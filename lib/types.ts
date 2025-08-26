// lib/types.ts
import { Role, StatusImovel, ClientOverallStatus, TaskType, Priority } from '@prisma/client';

// --- INTERFACES DE DADOS (ALINHADAS COM O SCHEMA) ---
export interface User {
  id: string;
  nome: string;
  email: string;
  role: Role;
  superiorId?: string | null;
  superior?: User | null;
  createdAt: string;
}

export interface Cliente {
  id: string;
  nomeCompleto: string;
  telefone?: string | null;
  email?: string | null;
  currentFunnelStage: string;
  overallStatus: ClientOverallStatus;
  notas?: Nota[];
  createdAt: string;
  updatedAt: string;
  corretorId: string;
  imovelDeInteresseId?: string | null;
  imovelDeInteresse?: Imovel | null;
  corretor?: User | null;
  detalhesDeVenda?: ClientWonDetails;
}

export interface ClientWonDetails {
  id: string;
  clienteId: string;
  sale_value: number;
  sale_date: string;
  createdAt: string;
}

export interface Nota {
  id: string;
  clienteId: string;
  createdBy: string;
  content: string;
  createdAt: string;
}

export interface TipologiaImovel {
  id: string;
  nome: string;
  valor: number;
  area?: number | null;
  dormitorios?: number | null;
  suites?: number | null;
  vagas?: number | null;
}

export interface ImagemImovel {
    id: string;
    url: string;
}

export interface Imovel {
  id: string;
  titulo: string;
  descricao?: string | null;
  endereco?: string | null;
  tipo?: string | null;
  status: StatusImovel;
  quartos?: number | null;
  banheiros?: number | null;
  preco?: number | null;
  area?: number | null;
  imagens?: ImagemImovel[];
  tipologias?: TipologiaImovel[];
  createdAt: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string | null;
  dataHora: string;
  concluida: boolean;
  tipo: TaskType;
  prioridade: Priority;
  clienteId: string;
  cliente?: Cliente;
  usuarioId: string;
  usuario?: User;
  createdAt: string;
  updatedAt: string;
}

export interface LostReason {
  id: string;
  reason: string;
  active: boolean;
  created_at: string;
}

// --- CONSTANTES E ENUMS ---
export { Role, StatusImovel, ClientOverallStatus, TaskType, Priority };

export const USER_ROLE_LABELS: Record<Role, string> = {
  [Role.marketing_adm]: "Admin Marketing",
  [Role.diretor]: "Diretor",
  [Role.gerente]: "Gerente",
  [Role.corretor]: "Corretor",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  call: "Ligação",
  visit: "Visita",
  follow_up: "Follow-up",
  meeting: "Reunião",
  other: "Outro",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    urgente: "Urgente"
};