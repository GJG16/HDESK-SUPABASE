// ============================================================
// helpdesk.models.ts — Interfaces + Enums del Sistema Helpdesk BPO v2.0
// 5 Mejoras Estructurales
// ============================================================

// ─── Enums de dominio ────────────────────────────────────────
export enum RolUsuario {
  OPERADOR      = 'Operador',
  ESPECIALISTA  = 'Tecnico',       // Renombrado: Especialista → Tecnico
  ADMINISTRADOR = 'Administrador',
}

export enum PrioridadTicket {
  ALTA  = 'Alta',
  MEDIA = 'Media',
  BAJA  = 'Baja',
  CRITICA = 'Critica',
}

export enum EstadoTicket {
  PENDIENTE  = 'Pendiente',
  EN_PROCESO = 'En Proceso',
  RESUELTO   = 'Resuelto',
  CANCELADO  = 'Cancelado',
}

// ─── Entidades principales ───────────────────────────────────

export interface DepartamentoNegocio {
  id:           number;
  nombre:       string;
  descripcion?: string;
  activo:       boolean;
}

export interface AreaTecnica {
  id:           number;
  nombre_area:  string;
  descripcion?: string;
  activa:       boolean;
}

export interface Usuario {
  id:                   number;
  nombre:               string;
  email:                string;
  rol:                  string;
  especialidad?:        string;
  extension?:           string;
  id_departamento?:     number;
  id_area_tecnica?:     number;
  nombre_departamento?: string;
  nombre_area_tecnica?: string;
  activo:               boolean;
  ultimo_acceso?:       string;
  avatar_initials?:     string;   // Calculado en frontend
}

export interface UsuarioCreate {
  nombre:          string;
  email:           string;
  password:        string;
  rol:             string;
  especialidad?:   string;
  extension?:      string;
  id_departamento?: number;
  id_area_tecnica?: number;
}

export interface SesionUsuario {
  usuario:      Usuario;
  access_token: string;
  token_type:   string;
}

export interface Ticket {
  id:                         number;
  titulo:                     string;
  descripcion:                string;
  estado:                     string;
  criticidad:                 string;
  id_area?:                   number;
  nombre_area?:               string;
  id_operador_creador?:       number;
  nombre_operador?:           string;
  id_especialista?:           number;
  nombre_especialista?:       string;
  id_departamento_origen?:    number;
  nombre_departamento_origen?: string;  // Mejora 1: Trazabilidad de origen
  comentario_resolucion?:     string;
  fecha_creacion:             string;
  fecha_actualizacion?:       string;
  fecha_resolucion?:          string;
  tiempo_resolucion_horas?:   number;
  version:                    number;
}

export interface CrearTicketDto {
  titulo:               string;
  descripcion:          string;
  criticidad:           string;
  id_operador_creador?: number;
}

export interface PatchTicketDto {
  estado?:                  string;
  comentario_resolucion?:   string;
  id_especialista?:         number;
  tiempo_resolucion_horas?: number;
  version?:                 number;
}

// ─── Historial de Tickets (Mejora 5) ─────────────────────────

export interface HistorialTicket {
  id:               number;
  id_ticket:        number;
  id_usuario?:      number;
  nombre_usuario?:  string;
  estado_anterior?: string;
  estado_nuevo?:    string;
  comentario?:      string;
  fecha:            string;
}

// ─── Comentarios de Tickets (Sistema de conversación) ────────

export interface ComentarioTicket {
  id:               number;
  id_ticket:        number;
  id_usuario?:      number;
  nombre_usuario?:  string;
  contenido:        string;
  es_nota_interna:  boolean;
  fecha:            string;
}

export interface ComentarioCreate {
  contenido:        string;
  es_nota_interna?: boolean;
  id_usuario?:      number;
}

// ─── DTOs de Métricas (Pandas/Numpy backend) ─────────────────

export interface DashboardMetrics {
  total_tickets:    number;
  por_estado:       Record<string, number>;
  por_criticidad:   Record<string, number>;
  por_area:         Record<string, number>;
}

export interface MapaCalorItem {
  departamento: string;
  cantidad:     number;
  criticos:     number;
  porcentaje:   number;
}

export interface MapaCalorResponse {
  datos: MapaCalorItem[];
  total: number;
}

export interface RendimientoResponse {
  metricas_por_area:  { id_area: number; tiempo_resolucion_horas: number | null }[];
  metricas_globales:  {
    promedio_global_horas: number;
    mediana_horas:         number;
    desviacion_estandar:   number;
    total_resueltos:       number;
  };
}

// ─── Auditoría ───────────────────────────────────────────────

export interface AuditoriaItem {
  id:              number;
  id_usuario?:     number;
  accion:          string;
  entidad:         string;
  detalle?:        string;
  fecha:           string;
  nombre_usuario?: string;
}

// ─── Fase 3: Helpdesk Enterprise ──────────────────────────────

export interface Macro {
  id: number;
  titulo: string;
  contenido: string;
  id_area_tecnica?: number;
  activo: boolean;
}

export interface MacroCreate {
  titulo: string;
  contenido: string;
  id_area_tecnica?: number;
}

export interface ArticuloKB {
  id: number;
  titulo: string;
  contenido: string;
  id_area_tecnica?: number;
  vistas: number;
  util: number;
  no_util: number;
  fecha_creacion: string;
  fecha_actualizacion?: string;
}

export interface ArticuloKBCreate {
  titulo: string;
  contenido: string;
  id_area_tecnica?: number;
}

export interface CSAT {
  id: number;
  id_ticket: number;
  id_usuario?: number;
  calificacion: number;
  comentario?: string;
  fecha: string;
}

export interface CSATCreate {
  calificacion: number;
  comentario?: string;
  id_usuario?: number;
}

export interface Adjunto {
  id: number;
  id_ticket: number;
  id_comentario?: number;
  id_usuario?: number;
  nombre_archivo: string;
  ruta_archivo: string;
  tipo_mime: string;
  tamano_bytes: number;
  fecha_subida: string;
}
