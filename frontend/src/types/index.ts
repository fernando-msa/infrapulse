export type TicketStatus = 'ABERTO' | 'EM_ANDAMENTO' | 'PENDENTE' | 'CONCLUIDO' | 'CANCELADO';
export type TicketPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type SlaStatus = 'OK' | 'EM_RISCO' | 'VIOLADO';
export type UserRole = 'ADMIN' | 'GESTOR' | 'ANALISTA';

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  category?: string;
  sector?: string;
  slaStatus: SlaStatus;
  openedAt: string;
  resolvedAt?: string;
  slaDeadline?: string;
  firstResponseAt?: string;
  assignedTo?: { id: string; name: string; email: string };
  createdBy?: { id: string; name: string };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  companyId?: string;
}

export interface DashboardKpis {
  total: number;
  abertos: number;
  concluidos: number;
  emAndamento: number;
  pendentes: number;
  emRisco: number;
  violados: number;
  percentualSlaOk: number;
  percentualSlaRisco: number;
  tempoMedioAtendimento: number;
}

export interface TechnicianQueue {
  technician: User;
  ticketCount: number;
  tickets: Ticket[];
  hasOverload: boolean;
}

export const STATUS_LABEL: Record<TicketStatus, string> = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em Andamento',
  PENDENTE: 'Pendente',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
};

export const SLA_LABEL: Record<SlaStatus, string> = {
  OK: 'OK',
  EM_RISCO: 'Em Risco',
  VIOLADO: 'Violado',
};
