export interface User {
  id?: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'agent' | 'user';
  fecha_creacion?: Date;
  activo?: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Ticket {
  id?: string;
  titulo: string;
  descripcion: string;
  estado: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  usuario_id: string;
  asignado_a?: string;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
  fecha_resolucion?: Date;
}

export interface TicketFilter {
  estado?: string;
  usuario_id?: string;
  asignado_a?: string;
  prioridad?: string;
  fecha_desde?: Date;
  fecha_hasta?: Date;
}

export type TicketStatus = 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado';
export type Priority = 'baja' | 'media' | 'alta' | 'critica';

export interface AuditLog {
  id?: string;
  action: 'delete_user' | 'delete_ticket';
  resource_type: 'user' | 'ticket';
  resource_id: string;
  actor_admin_id: string;
  created_at?: Date;
}

export interface TicketReportByState {
  estado: TicketStatus;
  total: number;
}

export interface TicketReportByAgent {
  asignado_a: string;
  total: number;
}

export interface TicketReport {
  total_tickets: number;
  by_state: TicketReportByState[];
  by_agent: TicketReportByAgent[];
}

